import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { clientPrediction, PredictedUpdate } from '@/lib/prediction';

interface UseSocketOptions {
  roomCode?: string;
  userId?: string;
  userName?: string;
  role?: 'HOST' | 'PLAYER' | 'SPECTATOR';
  onPlayerJoined?: (data: any) => void;
  onPlayerLeft?: (data: any) => void;
  onCellUpdated?: (data: any) => void;
  onCursorMoved?: (data: any) => void;
  onChatMessage?: (data: any) => void;
  onPlayerKicked?: (data: any) => void;
  onSessionEnded?: (data: any) => void;
  onAutoSaved?: (data: any) => void;
  onCellConflict?: (data: any) => void;
  onPredictionRollback?: (data: PredictedUpdate) => void;
  onHostChanged?: (data: any) => void;
  onError?: (error: any) => void;
}

interface CellUpdateData {
  roomCode: string;
  cellId: string;
  value: string;
  userId: string;
  userName: string;
  role: string;
  timestamp: number;
  clientId: string;
}

interface CursorPosition {
  cellId: string;
  x: number;
  y: number;
  userId: string;
  userName: string;
  timestamp: number;
}

export function useSocket(options: UseSocketOptions) {
  const {
    roomCode,
    userId,
    userName,
    role,
    onPlayerJoined,
    onPlayerLeft,
    onCellUpdated,
    onCursorMoved,
    onChatMessage,
    onPlayerKicked,
    onSessionEnded,
    onAutoSaved,
    onCellConflict,
    onPredictionRollback,
    onHostChanged,
    onError
  } = options;

  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);
  
  // Low-latency optimization: batch updates and debounce
  const updateBatchRef = useRef<CellUpdateData[]>([]);
  const batchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);
  const clientIdRef = useRef<string>(Math.random().toString(36).substr(2, 9));
  
  // Cursor positions for all participants
  const [cursorPositions, setCursorPositions] = useState<Map<string, CursorPosition>>(new Map());
  const cursorTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  
  // Disconnection handling and state recovery
  const [connectionState, setConnectionState] = useState<'connected' | 'disconnected' | 'reconnecting' | 'failed'>('disconnected');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [lastDisconnectTime, setLastDisconnectTime] = useState<number>(0);
  const pendingUpdatesRef = useRef<CellUpdateData[]>([]);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 1000;

  useEffect(() => {
    if (!roomCode || !userId || !userName) return;

    // Initialize Socket.IO client with low-latency optimizations
    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || '', {
      path: '/socket.io/',
      transports: ['websocket'], // Prioritize websocket for lower latency
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 500, // Faster reconnection
      timeout: 20000,
      forceNew: true,
      // Low-latency optimizations
      upgrade: true,
      rememberUpgrade: true,
      // Reduce ping/pong intervals for faster detection
      pingTimeout: 60000,
      pingInterval: 25000
    });

    socketRef.current = socket;

    // Connection events with enhanced state management
    socket.on('connect', () => {
      console.log('[Socket] Connected, joining room...');
      setIsConnected(true);
      setConnectionState('connected');
      setReconnectAttempts(0);
      
      // Replay any pending updates that were queued during disconnection
      if (pendingUpdatesRef.current.length > 0) {
        console.log(`[Socket] Replaying ${pendingUpdatesRef.current.length} pending updates`);
        pendingUpdatesRef.current.forEach(update => {
          socket.emit('cell_update', update);
        });
        pendingUpdatesRef.current = [];
      }
      
      // Small delay to ensure server is ready
      setTimeout(() => {
        socket.emit('join_room', {
          roomCode,
          userId,
          userName,
          role: role || 'SPECTATOR'
        });
      }, 100);
    });

    // Handle join room response
    socket.on('join_room_response', (data) => {
      if (data.success) {
        console.log('[Socket] Successfully joined room');
      } else {
        console.warn('[Socket] Failed to join room:', data.error);
        // Retry after a delay if it's a temporary error
        if (data.error === 'Room not found') {
          setTimeout(() => {
            console.log('[Socket] Retrying room join...');
            socket.emit('join_room', {
              roomCode,
              userId,
              userName,
              role: role || 'SPECTATOR'
            });
          }, 1000);
        }
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      setIsConnected(false);
      setConnectionState('disconnected');
      setLastDisconnectTime(Date.now());
      
      // Clear cursor positions on disconnect
      setCursorPositions(new Map());
    });

    // Enhanced reconnection handling
    socket.on('reconnect', (attemptNumber) => {
      console.log('[Socket] Reconnected after', attemptNumber, 'attempts');
      setConnectionState('reconnecting');
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('[Socket] Reconnection attempt', attemptNumber);
      setReconnectAttempts(attemptNumber);
      setConnectionState('reconnecting');
    });

    socket.on('reconnect_error', (error) => {
      console.error('[Socket] Reconnection error:', error);
      setConnectionState('failed');
    });

    socket.on('reconnect_failed', () => {
      console.error('[Socket] Reconnection failed after all attempts');
      setConnectionState('failed');
    });

    // Room events
    socket.on('room_state', (data) => {
      console.log('[Socket] Room state received', data);
      setParticipants(data.participants || []);
      
      // Hydrate iframe with current grid state - with retry mechanism
      if (data.gridState) {
        const loadStateWithRetry = (attempt = 1, maxAttempts = 5) => {
          const iframe = document.querySelector('iframe[data-puzzle-content]') as HTMLIFrameElement;
          if (iframe?.contentWindow) {
            console.log(`[Socket] Loading state attempt ${attempt}/${maxAttempts}`);
            iframe.contentWindow.postMessage({
              source: 'parent',
              type: 'LOAD_STATE',
              puzzleId: data.puzzleId || 'unknown',
              data: { gridState: data.gridState }
            }, window.location.origin);
            
            // Listen for confirmation from iframe
            const handleStateLoaded = (event: MessageEvent) => {
              if (event.origin !== window.location.origin) return;
              if (event.data?.source === 'iframe' && event.data?.type === 'STATE_LOADED') {
                console.log('[Socket] State loaded confirmation received');
                window.removeEventListener('message', handleStateLoaded);
              }
            };
            
            window.addEventListener('message', handleStateLoaded);
            
            // Retry if no confirmation within 2 seconds
            setTimeout(() => {
              window.removeEventListener('message', handleStateLoaded);
              if (attempt < maxAttempts) {
                console.log(`[Socket] Retrying state load (attempt ${attempt + 1})`);
                loadStateWithRetry(attempt + 1, maxAttempts);
              } else {
                console.warn('[Socket] Failed to load state after all attempts');
              }
            }, 2000);
          } else if (attempt < maxAttempts) {
            console.log(`[Socket] Iframe not ready, retrying in 500ms (attempt ${attempt + 1})`);
            setTimeout(() => loadStateWithRetry(attempt + 1, maxAttempts), 500);
          } else {
            console.warn('[Socket] Iframe not found after all attempts');
          }
        };
        
        loadStateWithRetry();
      }
    });

    socket.on('player_joined', (data) => {
      console.log('[Socket] Player joined', data);
      if (onPlayerJoined) onPlayerJoined(data);
    });

    socket.on('player_left', (data) => {
      console.log('[Socket] Player left', data);
      if (onPlayerLeft) onPlayerLeft(data);
    });

    // Grid events with low-latency optimizations and prediction handling
    socket.on('cell_updated', (data: CellUpdateData) => {
      const now = Date.now();
      const latency = now - data.timestamp;
      
      // Log latency for monitoring (remove in production)
      if (latency > 100) {
        console.warn(`[Socket] High latency detected: ${latency}ms for cell update`);
      }
      
      // Handle prediction confirmation/rollback for our own updates
      if (data.clientId === clientIdRef.current) {
        const confirmed = clientPrediction.confirmPrediction(data.cellId, data.value, data.timestamp);
        if (!confirmed) {
          // Prediction was rolled back
          const rollback = clientPrediction.getPrediction(data.cellId);
          if (rollback && onPredictionRollback) {
            onPredictionRollback(rollback);
          }
        }
        return;
      }
      
      console.log('[Socket] cell_updated received:', data, `latency: ${latency}ms`);
      if (onCellUpdated) {
        onCellUpdated(data);
      }
    });

    socket.on('cursor_moved', (data: CursorPosition) => {
      const now = Date.now();
      
      // Update cursor position with timestamp
      setCursorPositions(prev => {
        const newMap = new Map(prev);
        newMap.set(data.userId, { ...data, timestamp: now });
        return newMap;
      });
      
      // Clear existing timeout for this user
      const existingTimeout = cursorTimeoutRef.current.get(data.userId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }
      
      // Remove cursor after 3 seconds of inactivity
      const timeout = setTimeout(() => {
        setCursorPositions(prev => {
          const newMap = new Map(prev);
          newMap.delete(data.userId);
          return newMap;
        });
        cursorTimeoutRef.current.delete(data.userId);
      }, 3000);
      
      cursorTimeoutRef.current.set(data.userId, timeout);
      
      if (onCursorMoved) onCursorMoved(data);
    });

    // Chat events
    socket.on('chat_message_received', (data) => {
      if (onChatMessage) onChatMessage(data);
    });

    // Host control events
    socket.on('player_kicked', (data) => {
      if (onPlayerKicked) onPlayerKicked(data);
    });

    socket.on('session_ended', (data) => {
      if (onSessionEnded) onSessionEnded(data);
    });

    socket.on('host_changed', (data) => {
      console.log('[Socket] Host changed:', data);
      // Trigger a room data refresh to get updated participant info
      if (onHostChanged) {
        onHostChanged(data);
      }
    });

    // Auto-save events
    socket.on('room_autosaved', (data) => {
      console.log('[Socket] Room auto-saved:', data);
      if (onAutoSaved) onAutoSaved(data);
    });

    // Cell conflict events
    socket.on('cell_conflict', (data) => {
      console.log('[Socket] Cell conflict detected:', data);
      if (onCellConflict) onCellConflict(data);
    });

    // Error events
    socket.on('error', (error) => {
      console.error('[Socket] Error:', JSON.stringify(error, null, 2));
      
      // Handle specific error types
      if (error.message === 'Room not found') {
        console.warn('[Socket] Room not found - this might be a timing issue');
        // Don't call onError for room not found as it might be temporary
        return;
      }
      
      if (onError) onError(error);
    });

    // Cleanup on unmount
    return () => {
      // Clear all timeouts
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
      }
      
      // Clear cursor timeouts
      cursorTimeoutRef.current.forEach(timeout => clearTimeout(timeout));
      cursorTimeoutRef.current.clear();
      
      socket.emit('leave_room', { roomCode, userId });
      socket.disconnect();
    };
  }, [roomCode, userId, userName, role]);

  // Optimized cell update with batching, low latency, disconnection handling, and client-side prediction
  const updateCell = useCallback((data: { roomCode: string; cellId: string; value: string; userId?: string; userName?: string; role?: string; currentValue?: string }) => {
    const now = Date.now();
    const updateData: CellUpdateData = {
      roomCode: data.roomCode,
      cellId: data.cellId,
      value: data.value,
      userId: data.userId || userId || '',
      userName: data.userName || userName || '',
      role: data.role || role || 'SPECTATOR',
      timestamp: now,
      clientId: clientIdRef.current
    };

    // Create client-side prediction for immediate feedback
    const prediction = clientPrediction.predictUpdate(
      data.cellId,
      data.value,
      clientIdRef.current,
      data.currentValue
    );

    // Apply prediction immediately to UI
    if (onCellUpdated) {
      onCellUpdated({
        ...updateData,
        predicted: true
      });
    }

    // If disconnected, queue the update for later replay
    if (!isConnected || connectionState === 'disconnected' || connectionState === 'failed') {
      console.log('[useSocket] Queueing update during disconnection:', updateData);
      pendingUpdatesRef.current.push(updateData);
      
      // Limit queue size to prevent memory issues
      if (pendingUpdatesRef.current.length > 100) {
        pendingUpdatesRef.current = pendingUpdatesRef.current.slice(-50); // Keep last 50
        console.warn('[useSocket] Pending updates queue full, keeping last 50');
      }
      return;
    }

    // Add to batch for potential optimization
    updateBatchRef.current.push(updateData);
    lastUpdateTimeRef.current = now;

    // Clear existing batch timeout
    if (batchTimeoutRef.current) {
      clearTimeout(batchTimeoutRef.current);
    }

    // Send immediately for low latency, but batch if multiple updates come quickly
    if (updateBatchRef.current.length === 1) {
      // Single update - send immediately
      socketRef.current?.emit('cell_update', updateData);
      updateBatchRef.current = [];
    } else {
      // Multiple updates - batch them with minimal delay
      batchTimeoutRef.current = setTimeout(() => {
        if (updateBatchRef.current.length > 0) {
          // Send all batched updates
          updateBatchRef.current.forEach(update => {
            socketRef.current?.emit('cell_update', update);
          });
          updateBatchRef.current = [];
        }
      }, 16); // ~60fps batching
    }

    console.log('[useSocket] updateCell called with prediction:', data, `latency: ${now - lastUpdateTimeRef.current}ms`);
  }, [roomCode, userId, userName, role, isConnected, connectionState, onCellUpdated]);

  // Optimized cursor movement with throttling
  const moveCursor = useCallback((cellId: string, x: number, y: number) => {
    const now = Date.now();
    const cursorData: CursorPosition = {
      cellId,
      x,
      y,
      userId: userId || '',
      userName: userName || '',
      timestamp: now
    };

    // Throttle cursor updates to reduce network traffic
    if (now - lastUpdateTimeRef.current < 50) { // Max 20fps for cursor
      return;
    }

    socketRef.current?.emit('cursor_move', cursorData);
    lastUpdateTimeRef.current = now;
  }, [roomCode, userId, userName]);

  const sendMessage = (content: string) => {
    socketRef.current?.emit('chat_message', {
      roomCode,
      userId,
      userName,
      content
    });
  };

  const kickPlayer = (targetUserId: string) => {
    socketRef.current?.emit('kick_player', {
      roomCode,
      hostUserId: userId,
      targetUserId
    });
  };

  const endSession = () => {
    socketRef.current?.emit('end_session', {
      roomCode,
      hostUserId: userId
    });
  };

  return {
    socket: socketRef.current,
    isConnected,
    connectionState,
    reconnectAttempts,
    lastDisconnectTime,
    pendingUpdatesCount: pendingUpdatesRef.current.length,
    participants,
    cursorPositions,
    updateCell,
    moveCursor,
    sendMessage,
    kickPlayer,
    endSession,
    // Prediction system access
    prediction: clientPrediction
  };
}
