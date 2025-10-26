import React, { useState, useEffect } from 'react';
import { PuzzleRenderer } from './PuzzleRenderer';
import { CursorDisplay } from './CursorDisplay';
import { ConflictNotification } from './ConflictNotification';
import { PredictionFeedback } from './PredictionFeedback';
import { useSocket } from '../hooks/useSocket';
import { useClientPrediction } from '../hooks/useClientPrediction';
import { cn } from '../lib/utils';

interface SpectatorGridProps {
  roomId: string;
  roomCode: string;
  puzzle: any;
  gridState: Record<string, string>;
  participants: Array<{
    userId: string;
    displayName: string;
    role: 'HOST' | 'PLAYER' | 'SPECTATOR';
    isOnline: boolean;
    lastSeen: Date;
    cursorPosition?: { row: number; col: number };
  }>;
  currentUserId: string;
  onUpgradeToPlayer?: () => void;
  canUpgrade: boolean;
  className?: string;
}

export function SpectatorGrid({
  roomId,
  roomCode,
  puzzle,
  gridState,
  participants,
  currentUserId,
  onUpgradeToPlayer,
  canUpgrade,
  className
}: SpectatorGridProps) {
  const [conflicts, setConflicts] = useState<Array<{
    id: string;
    cell: string;
    message: string;
    timestamp: number;
  }>>([]);
  
  const [predictionStatus, setPredictionStatus] = useState<{
    isPredicting: boolean;
    lastRollback?: number;
  }>({ isPredicting: false });

  const { 
    socket, 
    isConnected, 
    connectionStatus,
    emit,
    on,
    off 
  } = useSocket({
    roomId,
    roomCode,
    userId: currentUserId,
    onCellUpdate: () => {
      // Spectators don't handle cell updates
    },
    onCursorUpdate: () => {
      // Cursor updates are handled by CursorDisplay
    },
    onParticipantUpdate: () => {
      // Participant updates are handled by parent
    },
    onCellConflict: (conflict) => {
      setConflicts(prev => [...prev, {
        id: `conflict-${Date.now()}`,
        cell: conflict.cell,
        message: conflict.message,
        timestamp: Date.now()
      }]);
      
      // Auto-remove conflicts after 5 seconds
      setTimeout(() => {
        setConflicts(prev => prev.filter(c => c.id !== `conflict-${Date.now()}`));
      }, 5000);
    },
    onPredictionRollback: (rollback) => {
      setPredictionStatus({
        isPredicting: false,
        lastRollback: Date.now()
      });
    },
    onHostChanged: () => {
      // Host changes are handled by parent
    }
  });

  const { 
    predictCellUpdate,
    rollbackPrediction,
    isPredicting 
  } = useClientPrediction({
    onRollback: (cell, reason) => {
      setPredictionStatus({
        isPredicting: false,
        lastRollback: Date.now()
      });
    }
  });

  // Clean up conflicts
  useEffect(() => {
    const timer = setInterval(() => {
      setConflicts(prev => prev.filter(c => Date.now() - c.timestamp < 5000));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleCellClick = (cell: string, value: string) => {
    // Spectators cannot edit cells, but we can show upgrade prompt
    if (canUpgrade && onUpgradeToPlayer) {
      onUpgradeToPlayer();
    }
  };

  const spectatorParticipants = participants.filter(p => p.role === 'SPECTATOR');
  const activeParticipants = participants.filter(p => p.role !== 'SPECTATOR' && p.isOnline);

  return (
    <div className={cn("relative", className)}>
      {/* Spectator Mode Banner */}
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-sm font-medium text-blue-800">
              Spectator Mode
            </span>
            <span className="text-xs text-blue-600">
              View-only access
            </span>
          </div>
          {canUpgrade && onUpgradeToPlayer && (
            <button
              onClick={onUpgradeToPlayer}
              className="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
            >
              Upgrade to Player
            </button>
          )}
        </div>
      </div>

      {/* Connection Status */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className={cn(
            "w-2 h-2 rounded-full",
            isConnected ? "bg-green-500" : "bg-red-500"
          )}></div>
          <span className="text-sm text-gray-600">
            {connectionStatus}
          </span>
        </div>
        
        {/* Spectator Count */}
        <div className="text-sm text-gray-600">
          {spectatorParticipants.length} spectator{spectatorParticipants.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Grid Container */}
      <div className="relative">
        <PuzzleRenderer
          puzzle={puzzle}
          gridState={gridState}
          onCellUpdate={handleCellClick}
          isReadOnly={true}
          className="opacity-90"
        />
        
        {/* Cursor Overlay */}
        <CursorDisplay
          participants={activeParticipants}
          currentUserId={currentUserId}
          className="absolute inset-0 pointer-events-none"
        />
      </div>

      {/* Conflict Notifications */}
      <div className="fixed top-4 right-4 space-y-2 z-50">
        {conflicts.map((conflict) => (
          <ConflictNotification
            key={conflict.id}
            cell={conflict.cell}
            message={conflict.message}
            onDismiss={() => setConflicts(prev => prev.filter(c => c.id !== conflict.id))}
          />
        ))}
      </div>

      {/* Prediction Feedback */}
      {predictionStatus.lastRollback && (
        <PredictionFeedback
          isPredicting={predictionStatus.isPredicting}
          lastRollback={predictionStatus.lastRollback}
          className="fixed bottom-4 right-4"
        />
      )}

      {/* Spectator Info Panel */}
      <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="text-sm text-gray-600">
          <p className="mb-2">
            <strong>Spectator Mode:</strong> You can view the puzzle and chat, but cannot edit cells or use hints.
          </p>
          <div className="flex items-center space-x-4 text-xs">
            <span>👀 View-only access</span>
            <span>💬 Chat available</span>
            <span>🚫 No cell editing</span>
            <span>🚫 No hints</span>
          </div>
        </div>
      </div>
    </div>
  );
}
