/**
 * Hook for managing room recovery functionality
 */

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

interface RecoveryState {
  status: 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING' | 'RECOVERING';
  latency?: number;
  lastConnected?: Date;
  disconnectionCount: number;
  recoveryAttempts: number;
  successRate: number;
  recoveryProgress: number;
  participantCount: number;
  messageCount: number;
  puzzleProgress: number;
  sessionDuration: string;
  hasBackup: boolean;
  lastBackup?: Date;
  backupSize: string;
  autoBackup: boolean;
  recoveryHistory: Array<{
    status: 'SUCCESS' | 'FAILED' | 'PENDING';
    description: string;
    timestamp: Date;
  }>;
}

interface UseRoomRecoveryProps {
  roomId: string;
  autoRecovery?: boolean;
  recoveryTimeout?: number;
}

export function useRoomRecovery({ 
  roomId, 
  autoRecovery = true, 
  recoveryTimeout = 30000 
}: UseRoomRecoveryProps) {
  const [recoveryState, setRecoveryState] = useState<RecoveryState>({
    status: 'CONNECTED',
    disconnectionCount: 0,
    recoveryAttempts: 0,
    successRate: 100,
    recoveryProgress: 0,
    participantCount: 0,
    messageCount: 0,
    puzzleProgress: 0,
    sessionDuration: '0m',
    hasBackup: false,
    autoBackup: true,
    recoveryHistory: []
  });

  const [isRecovering, setIsRecovering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkConnection = useCallback(async () => {
    try {
      const response = await fetch(`/api/multiplayer/rooms/${roomId}/recovery/status`);
      if (!response.ok) {
        throw new Error('Connection check failed');
      }
      
      const data = await response.json();
      setRecoveryState(prev => ({
        ...prev,
        status: data.connected ? 'CONNECTED' : 'DISCONNECTED',
        latency: data.latency,
        lastConnected: data.lastConnected ? new Date(data.lastConnected) : undefined
      }));
      
      return data.connected;
    } catch (err) {
      setRecoveryState(prev => ({
        ...prev,
        status: 'DISCONNECTED'
      }));
      return false;
    }
  }, [roomId]);

  const startRecovery = useCallback(async () => {
    setIsRecovering(true);
    setError(null);
    
    setRecoveryState(prev => ({
      ...prev,
      status: 'RECOVERING',
      recoveryProgress: 0,
      recoveryAttempts: prev.recoveryAttempts + 1
    }));

    try {
      // Simulate recovery steps
      const steps = [
        { progress: 20, description: 'Checking connection...' },
        { progress: 40, description: 'Restoring room state...' },
        { progress: 60, description: 'Synchronizing participants...' },
        { progress: 80, description: 'Restoring messages...' },
        { progress: 100, description: 'Recovery complete!' }
      ];

      for (const step of steps) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setRecoveryState(prev => ({
          ...prev,
          recoveryProgress: step.progress
        }));

        // Add to recovery history
        setRecoveryState(prev => ({
          ...prev,
          recoveryHistory: [
            {
              status: step.progress === 100 ? 'SUCCESS' : 'PENDING',
              description: step.description,
              timestamp: new Date()
            },
            ...prev.recoveryHistory.slice(0, 9) // Keep last 10 entries
          ]
        }));
      }

      // Final recovery
      const response = await fetch(`/api/multiplayer/rooms/${roomId}/recovery/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId })
      });

      if (!response.ok) {
        throw new Error('Recovery failed');
      }

      setRecoveryState(prev => ({
        ...prev,
        status: 'CONNECTED',
        successRate: Math.round(((prev.successRate * (prev.recoveryAttempts - 1)) + 100) / prev.recoveryAttempts)
      }));

      toast.success('Room recovery completed successfully!');
    } catch (err: any) {
      setError(err.message);
      setRecoveryState(prev => ({
        ...prev,
        status: 'DISCONNECTED',
        recoveryHistory: [
          {
            status: 'FAILED',
            description: `Recovery failed: ${err.message}`,
            timestamp: new Date()
          },
          ...prev.recoveryHistory.slice(0, 9)
        ]
      }));
      toast.error('Room recovery failed');
    } finally {
      setIsRecovering(false);
    }
  }, [roomId]);

  const cancelRecovery = useCallback(() => {
    setIsRecovering(false);
    setRecoveryState(prev => ({
      ...prev,
      status: 'DISCONNECTED',
      recoveryProgress: 0
    }));
  }, []);

  const restoreFromBackup = useCallback(async () => {
    try {
      const response = await fetch(`/api/multiplayer/rooms/${roomId}/recovery/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId })
      });

      if (!response.ok) {
        throw new Error('Backup restoration failed');
      }

      toast.success('Room restored from backup successfully!');
      
      // Refresh recovery state
      await checkConnection();
    } catch (err: any) {
      toast.error(`Backup restoration failed: ${err.message}`);
    }
  }, [roomId, checkConnection]);

  // Auto-recovery on disconnection
  useEffect(() => {
    if (!autoRecovery) return;

    const interval = setInterval(async () => {
      const isConnected = await checkConnection();
      
      if (!isConnected && recoveryState.status === 'CONNECTED') {
        setRecoveryState(prev => ({
          ...prev,
          status: 'DISCONNECTED',
          disconnectionCount: prev.disconnectionCount + 1
        }));
        
        // Auto-start recovery after a delay
        setTimeout(() => {
          if (recoveryState.status === 'DISCONNECTED') {
            startRecovery();
          }
        }, 5000);
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [autoRecovery, checkConnection, recoveryState.status, startRecovery]);

  // Initial connection check
  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  return {
    recoveryState,
    isRecovering,
    error,
    startRecovery,
    cancelRecovery,
    checkConnection,
    restoreFromBackup
  };
}
