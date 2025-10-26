'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { PuzzleRenderer } from './PuzzleRenderer';
import { CursorDisplay } from './CursorDisplay';
import { Badge } from '@/components/ui/badge';
import { Users, Wifi, WifiOff, Clock } from 'lucide-react';

interface MultiplayerGridProps {
  puzzleId: number;
  content: string;
  roomCode: string;
  userId?: string;
  userName?: string;
  userRole?: 'HOST' | 'PLAYER' | 'SPECTATOR';
  participants: any[];
  cursorPositions: Map<string, any>;
  isConnected: boolean;
  connectionState?: 'connected' | 'disconnected' | 'reconnecting' | 'failed';
  pendingUpdatesCount?: number;
  onCellUpdate: (data: { cellId: string; value: string }) => void;
  onCursorMove: (cellId: string, x: number, y: number) => void;
  onProgress?: (progress: number) => void;
  onComplete?: () => void;
  className?: string;
}

interface GridState {
  lastSyncTime: number;
  pendingUpdates: Map<string, { value: string; timestamp: number }>;
  syncInProgress: boolean;
}

export function MultiplayerGrid({
  puzzleId,
  content,
  roomCode,
  userId,
  userName,
  userRole,
  participants,
  cursorPositions,
  isConnected,
  connectionState = 'connected',
  pendingUpdatesCount = 0,
  onCellUpdate,
  onCursorMove,
  onProgress,
  onComplete,
  className = ""
}: MultiplayerGridProps) {
  const puzzleContainerRef = useRef<HTMLDivElement>(null);
  const [gridState, setGridState] = useState<GridState>({
    lastSyncTime: Date.now(),
    pendingUpdates: new Map(),
    syncInProgress: false
  });
  
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'poor' | 'offline'>('excellent');
  const [lastActivity, setLastActivity] = useState<Date>(new Date());

  // Monitor connection quality based on connection state and recent activity
  useEffect(() => {
    if (connectionState === 'failed' || connectionState === 'disconnected') {
      setConnectionQuality('offline');
      return;
    }
    
    if (connectionState === 'reconnecting') {
      setConnectionQuality('poor');
      return;
    }

    if (!isConnected) {
      setConnectionQuality('offline');
      return;
    }

    const now = Date.now();
    const timeSinceLastActivity = now - lastActivity.getTime();
    
    if (timeSinceLastActivity < 1000) {
      setConnectionQuality('excellent');
    } else if (timeSinceLastActivity < 3000) {
      setConnectionQuality('good');
    } else {
      setConnectionQuality('poor');
    }
  }, [isConnected, connectionState, lastActivity]);

  // Enhanced cell update handler with optimistic updates
  const handleCellUpdate = useCallback((cellData: { cellId: string; value: string }) => {
    const now = Date.now();
    setLastActivity(new Date());
    
    // Add to pending updates for conflict resolution
    setGridState(prev => ({
      ...prev,
      pendingUpdates: new Map(prev.pendingUpdates).set(cellData.cellId, {
        value: cellData.value,
        timestamp: now
      })
    }));

    // Send to server
    onCellUpdate(cellData);
  }, [onCellUpdate]);

  // Enhanced cursor move handler with throttling
  const handleCursorMove = useCallback((cursorData: { cellId: string; x: number; y: number }) => {
    setLastActivity(new Date());
    onCursorMove(cursorData.cellId, cursorData.x, cursorData.y);
  }, [onCursorMove]);

  // Clear pending updates after successful sync
  const clearPendingUpdates = useCallback((cellIds: string[]) => {
    setGridState(prev => {
      const newPending = new Map(prev.pendingUpdates);
      cellIds.forEach(cellId => newPending.delete(cellId));
      return {
        ...prev,
        pendingUpdates: newPending,
        lastSyncTime: Date.now()
      };
    });
  }, []);

  // Get connection quality indicator
  const getConnectionIndicator = () => {
    switch (connectionQuality) {
      case 'excellent':
        return <Wifi className="h-4 w-4 text-green-500" />;
      case 'good':
        return <Wifi className="h-4 w-4 text-yellow-500" />;
      case 'poor':
        return <Wifi className="h-4 w-4 text-orange-500" />;
      case 'offline':
        return <WifiOff className="h-4 w-4 text-red-500" />;
    }
  };

  // Get active participants count
  const activeParticipants = participants.filter(p => p.isOnline).length;
  const canEdit = userRole === 'HOST' || userRole === 'PLAYER';

  return (
    <div className={`multiplayer-grid ${className}`}>
      {/* Multiplayer Status Bar */}
      <div className="flex items-center justify-between mb-4 p-3 bg-muted/50 rounded-lg">
        <div className="flex items-center space-x-4">
          {/* Connection Status */}
          <div className="flex items-center space-x-2">
            {getConnectionIndicator()}
            <span className="text-sm font-medium">
              {connectionQuality === 'excellent' && 'Excellent'}
              {connectionQuality === 'good' && 'Good'}
              {connectionQuality === 'poor' && 'Poor'}
              {connectionQuality === 'offline' && 'Offline'}
            </span>
          </div>

          {/* Active Participants */}
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              {activeParticipants} active
            </span>
          </div>

          {/* Edit Permission */}
          <Badge variant={canEdit ? "default" : "secondary"}>
            {userRole === 'HOST' && 'Host'}
            {userRole === 'PLAYER' && 'Player'}
            {userRole === 'SPECTATOR' && 'Spectator'}
          </Badge>
        </div>

        {/* Sync Status */}
        <div className="flex items-center space-x-2">
          {(gridState.pendingUpdates.size > 0 || pendingUpdatesCount > 0) && (
            <div className="flex items-center space-x-1">
              <Clock className="h-4 w-4 text-orange-500 animate-spin" />
              <span className="text-xs text-orange-600">
                {Math.max(gridState.pendingUpdates.size, pendingUpdatesCount)} pending
              </span>
            </div>
          )}
          
          {gridState.syncInProgress && (
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              <span className="text-xs text-blue-600">Syncing...</span>
            </div>
          )}
        </div>
      </div>

      {/* Puzzle Container with Cursor Overlay */}
      <div className="relative">
        <div ref={puzzleContainerRef} className="puzzle-container">
          <PuzzleRenderer
            puzzleId={puzzleId}
            content={content}
            isMultiplayer={true}
            onCellUpdate={handleCellUpdate}
            onCursorMove={handleCursorMove}
            onProgress={onProgress}
            onComplete={onComplete}
          />
        </div>

        {/* Cursor Display Overlay */}
        <CursorDisplay
          cursorPositions={cursorPositions}
          currentUserId={userId}
          puzzleContainerRef={puzzleContainerRef}
        />
      </div>

      {/* Pending Updates Indicator */}
      {(gridState.pendingUpdates.size > 0 || pendingUpdatesCount > 0) && (
        <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded text-sm text-orange-800">
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4" />
            <span>
              {Math.max(gridState.pendingUpdates.size, pendingUpdatesCount)} cell update{Math.max(gridState.pendingUpdates.size, pendingUpdatesCount) > 1 ? 's' : ''} pending sync
            </span>
          </div>
        </div>
      )}

      {/* Connection Issues Warning */}
      {connectionQuality === 'poor' && (
        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
          <div className="flex items-center space-x-2">
            <Wifi className="h-4 w-4" />
            <span>Poor connection detected. Updates may be delayed.</span>
          </div>
        </div>
      )}

      {/* Offline Warning */}
      {connectionQuality === 'offline' && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
          <div className="flex items-center space-x-2">
            <WifiOff className="h-4 w-4" />
            <span>Connection lost. Attempting to reconnect...</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Hook for managing multiplayer grid state
export function useMultiplayerGridState() {
  const [gridState, setGridState] = useState<GridState>({
    lastSyncTime: Date.now(),
    pendingUpdates: new Map(),
    syncInProgress: false
  });

  const addPendingUpdate = useCallback((cellId: string, value: string) => {
    setGridState(prev => ({
      ...prev,
      pendingUpdates: new Map(prev.pendingUpdates).set(cellId, {
        value,
        timestamp: Date.now()
      })
    }));
  }, []);

  const clearPendingUpdate = useCallback((cellId: string) => {
    setGridState(prev => {
      const newPending = new Map(prev.pendingUpdates);
      newPending.delete(cellId);
      return {
        ...prev,
        pendingUpdates: newPending
      };
    });
  }, []);

  const clearAllPendingUpdates = useCallback(() => {
    setGridState(prev => ({
      ...prev,
      pendingUpdates: new Map(),
      lastSyncTime: Date.now()
    }));
  }, []);

  const setSyncInProgress = useCallback((inProgress: boolean) => {
    setGridState(prev => ({
      ...prev,
      syncInProgress: inProgress
    }));
  }, []);

  return {
    gridState,
    addPendingUpdate,
    clearPendingUpdate,
    clearAllPendingUpdates,
    setSyncInProgress
  };
}
