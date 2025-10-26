import { useState, useEffect, useCallback } from 'react';

interface SpectatorActivity {
  userId: string;
  userName: string;
  action: string;
  timestamp: Date;
  type: 'puzzle_edit' | 'word_complete' | 'clue_solve' | 'hint_used' | 'progress_made';
}

interface UseSpectatorModeProps {
  roomId: string;
  currentUserId: string;
  currentUserRole: 'HOST' | 'PLAYER' | 'SPECTATOR';
}

interface UseSpectatorModeReturn {
  isWatching: boolean;
  isSpectator: boolean;
  canUpgrade: boolean;
  activeCollaborators: number;
  puzzleProgress: number;
  recentActivity: SpectatorActivity[];
  startWatching: () => void;
  stopWatching: () => void;
  requestUpgrade: () => void;
  isLoading: boolean;
  error: string | null;
}

export function useSpectatorMode({
  roomId,
  currentUserId,
  currentUserRole
}: UseSpectatorModeProps): UseSpectatorModeReturn {
  const [isWatching, setIsWatching] = useState(false);
  const [activeCollaborators, setActiveCollaborators] = useState(0);
  const [puzzleProgress, setPuzzleProgress] = useState(0);
  const [recentActivity, setRecentActivity] = useState<SpectatorActivity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSpectator = currentUserRole === 'SPECTATOR';
  const canUpgrade = currentUserRole === 'SPECTATOR';

  // Start watching
  const startWatching = useCallback(() => {
    setIsWatching(true);
    setError(null);
  }, []);

  // Stop watching
  const stopWatching = useCallback(() => {
    setIsWatching(false);
  }, []);

  // Request upgrade to collaborator
  const requestUpgrade = useCallback(async () => {
    if (!canUpgrade) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/multiplayer/rooms/${roomId}/upgrade-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to request upgrade');
      }

      // In a real implementation, this would trigger a notification to the host
      // and potentially show a confirmation dialog
      console.log('Upgrade request sent to room host');
    } catch (err) {
      console.error('Error requesting upgrade:', err);
      setError(err instanceof Error ? err.message : 'Failed to request upgrade');
    } finally {
      setIsLoading(false);
    }
  }, [roomId, currentUserId, canUpgrade]);

  // Simulate real-time updates (in production, this would use Socket.IO)
  useEffect(() => {
    if (!isWatching) return;

    const activityTypes: SpectatorActivity['type'][] = [
      'puzzle_edit',
      'word_complete', 
      'clue_solve',
      'hint_used',
      'progress_made'
    ];

    const actions = {
      puzzle_edit: ['filled in a word', 'corrected an answer', 'added a letter'],
      word_complete: ['completed a word', 'solved a clue', 'finished a section'],
      clue_solve: ['solved a clue', 'found the answer', 'figured it out'],
      hint_used: ['used a hint', 'asked for help', 'got assistance'],
      progress_made: ['made progress', 'advanced forward', 'moved ahead']
    };

    const interval = setInterval(() => {
      // Simulate puzzle progress updates
      setPuzzleProgress(prev => {
        const increment = Math.random() * 3;
        return Math.min(prev + increment, 100);
      });

      // Simulate activity updates
      const shouldAddActivity = Math.random() < 0.3; // 30% chance every interval
      if (shouldAddActivity) {
        const activityType = activityTypes[Math.floor(Math.random() * activityTypes.length)];
        const possibleActions = actions[activityType];
        const action = possibleActions[Math.floor(Math.random() * possibleActions.length)];
        
        // Simulate a random collaborator
        const collaboratorNames = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve'];
        const userName = collaboratorNames[Math.floor(Math.random() * collaboratorNames.length)];
        
        const newActivity: SpectatorActivity = {
          userId: `user-${Math.random().toString(36).substr(2, 9)}`,
          userName,
          action,
          timestamp: new Date(),
          type: activityType
        };

        setRecentActivity(prev => [
          newActivity,
          ...prev.slice(0, 9) // Keep last 10 activities
        ]);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isWatching]);

  // Simulate active collaborator count updates
  useEffect(() => {
    if (!isWatching) return;

    const interval = setInterval(() => {
      // Simulate collaborator count changes
      const baseCount = 2;
      const variation = Math.floor(Math.random() * 3);
      setActiveCollaborators(baseCount + variation);
    }, 5000);

    return () => clearInterval(interval);
  }, [isWatching]);

  return {
    isWatching,
    isSpectator,
    canUpgrade,
    activeCollaborators,
    puzzleProgress,
    recentActivity,
    startWatching,
    stopWatching,
    requestUpgrade,
    isLoading,
    error
  };
}