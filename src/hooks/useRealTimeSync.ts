import { useState, useEffect, useCallback, useRef } from 'react';
import { Operation, OperationalTransformer, ConflictResolutionStrategy } from '@/lib/operationalTransformation';
import { ConflictDetector, Conflict } from '@/lib/conflictResolution';
import { PuzzleCompletionStatus, PuzzleCompletionSync, CompletionSyncEvent } from '@/lib/puzzleCompletionSync';

interface RealTimeSyncState {
  isConnected: boolean;
  isSyncing: boolean;
  lastSyncAt: number | null;
  version: number;
  conflicts: Conflict[];
  hasConflicts: boolean;
  error: string | null;
}

interface RealTimeSyncOptions {
  roomId: string;
  puzzleId: string;
  userId: string;
  autoSync: boolean;
  syncInterval: number;
  conflictResolution: ConflictResolutionStrategy;
  onConflictDetected?: (conflicts: Conflict[]) => void;
  onSyncComplete?: (operations: Operation[]) => void;
  onError?: (error: string) => void;
}

export function useRealTimeSync({
  roomId,
  puzzleId,
  userId,
  autoSync = true,
  syncInterval = 1000,
  conflictResolution = ConflictResolutionStrategy.LAST_WRITE_WINS,
  onConflictDetected,
  onSyncComplete,
  onError
}: RealTimeSyncOptions) {
  const [state, setState] = useState<RealTimeSyncState>({
    isConnected: false,
    isSyncing: false,
    lastSyncAt: null,
    version: 0,
    conflicts: [],
    hasConflicts: false,
    error: null
  });

  const transformerRef = useRef<OperationalTransformer>(new OperationalTransformer());
  const detectorRef = useRef<ConflictDetector>(new ConflictDetector());
  const completionSyncRef = useRef<PuzzleCompletionSync>(new PuzzleCompletionSync());
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingOperationsRef = useRef<Operation[]>([]);

  // Initialize sync
  useEffect(() => {
    initializeSync();
    return () => {
      cleanup();
    };
  }, [roomId, puzzleId, userId]);

  // Auto-sync effect
  useEffect(() => {
    if (autoSync && state.isConnected) {
      startAutoSync();
    } else {
      stopAutoSync();
    }

    return () => {
      stopAutoSync();
    };
  }, [autoSync, state.isConnected, syncInterval]);

  const initializeSync = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isConnected: true, error: null }));
      
      // Load initial state
      await loadInitialState();
      
      // Set up event listeners
      setupEventListeners();
      
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to initialize sync',
        isConnected: false 
      }));
      onError?.(error instanceof Error ? error.message : 'Failed to initialize sync');
    }
  }, [roomId, puzzleId, userId]);

  const loadInitialState = useCallback(async () => {
    try {
      const response = await fetch(`/api/multiplayer/rooms/${roomId}/sync?since=0`);
      if (!response.ok) {
        throw new Error('Failed to load initial state');
      }

      const data = await response.json();
      const { operations, version } = data;

      // Initialize transformer with existing operations
      transformerRef.current = new OperationalTransformer({
        operations,
        lastApplied: Date.now(),
        version
      });

      setState(prev => ({ 
        ...prev, 
        version,
        lastSyncAt: Date.now()
      }));

    } catch (error) {
      console.error('Failed to load initial state:', error);
      throw error;
    }
  }, [roomId]);

  const setupEventListeners = useCallback(() => {
    // Set up completion sync listener
    completionSyncRef.current.addListener(`completion_${userId}`, (event: CompletionSyncEvent) => {
      handleCompletionEvent(event);
    });

    // Set up conflict detection
    detectorRef.current = new ConflictDetector();
  }, [userId]);

  const handleCompletionEvent = useCallback((event: CompletionSyncEvent) => {
    // Handle completion sync events
    console.log('Completion event:', event);
  }, []);

  const startAutoSync = useCallback(() => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    const sync = async () => {
      if (pendingOperationsRef.current.length > 0) {
        await syncOperations();
      }
      
      if (autoSync && state.isConnected) {
        syncTimeoutRef.current = setTimeout(sync, syncInterval);
      }
    };

    sync();
  }, [autoSync, syncInterval, state.isConnected]);

  const stopAutoSync = useCallback(() => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = null;
    }
  }, []);

  const syncOperations = useCallback(async () => {
    if (pendingOperationsRef.current.length === 0) return;

    setState(prev => ({ ...prev, isSyncing: true, error: null }));

    try {
      const operations = [...pendingOperationsRef.current];
      pendingOperationsRef.current = [];

      const response = await fetch(`/api/multiplayer/rooms/${roomId}/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operations,
          lastVersion: state.version,
          userId
        })
      });

      if (!response.ok) {
        throw new Error('Failed to sync operations');
      }

      const data = await response.json();
      const { operations: syncedOperations, conflicts, version, requiresResolution } = data;

      // Update transformer state
      transformerRef.current = new OperationalTransformer({
        operations: syncedOperations,
        lastApplied: Date.now(),
        version
      });

      // Handle conflicts
      if (conflicts.length > 0) {
        const detectedConflicts = detectorRef.current.detectConflicts(conflicts);
        setState(prev => ({ 
          ...prev, 
          conflicts: detectedConflicts,
          hasConflicts: true
        }));
        onConflictDetected?.(detectedConflicts);
      }

      setState(prev => ({ 
        ...prev, 
        version,
        lastSyncAt: Date.now(),
        isSyncing: false
      }));

      onSyncComplete?.(syncedOperations);

    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Sync failed',
        isSyncing: false
      }));
      onError?.(error instanceof Error ? error.message : 'Sync failed');
    }
  }, [roomId, userId, state.version, onConflictDetected, onSyncComplete, onError]);

  const addOperation = useCallback((operation: Operation) => {
    // Validate operation
    if (!OperationalTransformer.validateOperation(operation)) {
      console.error('Invalid operation:', operation);
      return;
    }

    // Add to pending operations
    pendingOperationsRef.current.push(operation);

    // Apply locally for immediate feedback
    const result = transformerRef.current.applyOperation(operation);
    
    // Check for local conflicts
    const conflicts = detectorRef.current.detectConflicts([operation]);
    if (conflicts.length > 0) {
      setState(prev => ({ 
        ...prev, 
        conflicts: [...prev.conflicts, ...conflicts],
        hasConflicts: true
      }));
      onConflictDetected?.(conflicts);
    }

    // Trigger sync if auto-sync is enabled
    if (autoSync) {
      syncOperations();
    }
  }, [autoSync, onConflictDetected]);

  const resolveConflicts = useCallback(async (conflictId: string, resolution: {
    strategy: ConflictResolutionStrategy;
    selectedOperations?: string[];
    customResolution?: string;
  }) => {
    try {
      const response = await fetch(`/api/multiplayer/rooms/${roomId}/sync`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          strategy: resolution.strategy,
          selectedOperations: resolution.selectedOperations,
          customResolution: resolution.customResolution
        })
      });

      if (!response.ok) {
        throw new Error('Failed to resolve conflicts');
      }

      const data = await response.json();
      
      // Update local state
      setState(prev => ({
        ...prev,
        conflicts: prev.conflicts.filter(c => c.id !== conflictId),
        hasConflicts: prev.conflicts.length > 1
      }));

      // Reload state
      await loadInitialState();

    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Failed to resolve conflicts'
      }));
      onError?.(error instanceof Error ? error.message : 'Failed to resolve conflicts');
    }
  }, [roomId, loadInitialState, onError]);

  const forceSync = useCallback(async () => {
    await syncOperations();
  }, [syncOperations]);

  const disconnect = useCallback(() => {
    setState(prev => ({ ...prev, isConnected: false }));
    stopAutoSync();
    cleanup();
  }, [stopAutoSync]);

  const cleanup = useCallback(() => {
    stopAutoSync();
    completionSyncRef.current.removeListener(`completion_${userId}`);
  }, [stopAutoSync, userId]);

  // Puzzle completion methods
  const updatePuzzleProgress = useCallback((progress: {
    completedCells: number;
    totalCells: number;
    currentSection?: string;
  }) => {
    completionSyncRef.current.updateStatus(userId, puzzleId, roomId, {
      progress,
      status: 'in_progress'
    });
  }, [userId, puzzleId, roomId]);

  const completeCell = useCallback((cell: { row: number; col: number; value: string }) => {
    completionSyncRef.current.handleCellCompletion(userId, puzzleId, roomId, cell);
  }, [userId, puzzleId, roomId]);

  const unlockAchievement = useCallback((achievement: {
    id: string;
    name: string;
    description: string;
    category: 'speed' | 'accuracy' | 'streak' | 'completion' | 'social';
  }) => {
    completionSyncRef.current.handleAchievementUnlock(userId, puzzleId, roomId, achievement);
  }, [userId, puzzleId, roomId]);

  const getRoomSummary = useCallback(() => {
    return completionSyncRef.current.getRoomSummary(roomId, puzzleId);
  }, [roomId, puzzleId]);

  const getCompletionStats = useCallback(() => {
    return completionSyncRef.current.getCompletionStats(roomId, puzzleId);
  }, [roomId, puzzleId]);

  return {
    // State
    ...state,
    
    // Operations
    addOperation,
    resolveConflicts,
    forceSync,
    disconnect,
    
    // Puzzle completion
    updatePuzzleProgress,
    completeCell,
    unlockAchievement,
    getRoomSummary,
    getCompletionStats,
    
    // Utilities
    getPendingOperations: () => pendingOperationsRef.current,
    getTransformer: () => transformerRef.current,
    getDetector: () => detectorRef.current,
    getCompletionSync: () => completionSyncRef.current
  };
}

// Hook for managing cursor position synchronization
export function useCursorSync(roomId: string, userId: string) {
  const [cursors, setCursors] = useState<Map<string, any>>(new Map());
  const [isTracking, setIsTracking] = useState(false);

  const updateCursorPosition = useCallback((position: { x: number; y: number }, action?: string) => {
    // In real implementation, emit to Socket.IO
    // socket.emit('cursor_move', { roomId, position, userId, action });
    
    // For now, just update local state
    setCursors(prev => {
      const newCursors = new Map(prev);
      newCursors.set(userId, {
        userId,
        position,
        action,
        timestamp: Date.now()
      });
      return newCursors;
    });
  }, [roomId, userId]);

  const clearCursor = useCallback(() => {
    // In real implementation, emit to Socket.IO
    // socket.emit('cursor_leave', { roomId, userId });
    
    setCursors(prev => {
      const newCursors = new Map(prev);
      newCursors.delete(userId);
      return newCursors;
    });
  }, [roomId, userId]);

  const startTracking = useCallback(() => {
    setIsTracking(true);
  }, []);

  const stopTracking = useCallback(() => {
    setIsTracking(false);
    clearCursor();
  }, [clearCursor]);

  return {
    cursors: Array.from(cursors.values()),
    isTracking,
    updateCursorPosition,
    clearCursor,
    startTracking,
    stopTracking
  };
}
