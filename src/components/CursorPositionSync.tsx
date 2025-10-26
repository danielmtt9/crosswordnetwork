import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, MousePointer, Eye, Edit3 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface CursorPosition {
  userId: string;
  userName: string;
  userAvatar?: string;
  x: number;
  y: number;
  timestamp: number;
  isActive: boolean;
  color: string;
  action?: 'typing' | 'selecting' | 'hovering' | 'editing';
}

interface CursorPositionSyncProps {
  roomId: string;
  currentUserId: string;
  isEnabled: boolean;
  onCursorMove?: (position: { x: number; y: number }) => void;
  onCursorLeave?: () => void;
  className?: string;
}

const CURSOR_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
];

export function CursorPositionSync({
  roomId,
  currentUserId,
  isEnabled,
  onCursorMove,
  onCursorLeave,
  className
}: CursorPositionSyncProps) {
  const [cursors, setCursors] = useState<Map<string, CursorPosition>>(new Map());
  const [isTracking, setIsTracking] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastPositionRef = useRef<{ x: number; y: number } | null>(null);
  const throttleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Generate cursor color for user
  const getUserColor = useCallback((userId: string) => {
    const hash = userId.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
  }, []);

  // Handle mouse movement
  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!isEnabled || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Throttle cursor updates
    if (throttleTimeoutRef.current) {
      clearTimeout(throttleTimeoutRef.current);
    }

    throttleTimeoutRef.current = setTimeout(() => {
      const position = { x, y };
      lastPositionRef.current = position;
      onCursorMove?.(position);

      // Emit cursor position to other users (in real implementation, this would use Socket.IO)
      // socket.emit('cursor_move', { roomId, position, userId: currentUserId });
    }, 50);
  }, [isEnabled, onCursorMove, roomId, currentUserId]);

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    if (!isEnabled) return;

    onCursorLeave?.();
    // socket.emit('cursor_leave', { roomId, userId: currentUserId });
  }, [isEnabled, onCursorLeave, roomId, currentUserId]);

  // Handle visibility change
  const handleVisibilityChange = useCallback(() => {
    if (document.hidden) {
      // User switched tabs or minimized window
      // socket.emit('cursor_leave', { roomId, userId: currentUserId });
    } else {
      // User returned to the page
      if (lastPositionRef.current) {
        // socket.emit('cursor_move', { roomId, position: lastPositionRef.current, userId: currentUserId });
      }
    }
  }, [roomId, currentUserId]);

  // Set up event listeners
  useEffect(() => {
    if (!isEnabled || !containerRef.current) return;

    const container = containerRef.current;
    
    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    setIsTracking(true);

    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
      }
    };
  }, [isEnabled, handleMouseMove, handleMouseLeave, handleVisibilityChange]);

  // Simulate receiving cursor positions from other users
  useEffect(() => {
    if (!isEnabled) return;

    // In a real implementation, this would be handled by Socket.IO
    const handleCursorUpdate = (data: {
      userId: string;
      userName: string;
      userAvatar?: string;
      position: { x: number; y: number };
      action?: CursorPosition['action'];
    }) => {
      if (data.userId === currentUserId) return;

      const cursor: CursorPosition = {
        userId: data.userId,
        userName: data.userName,
        userAvatar: data.userAvatar,
        x: data.position.x,
        y: data.position.y,
        timestamp: Date.now(),
        isActive: true,
        color: getUserColor(data.userId),
        action: data.action
      };

      setCursors(prev => {
        const newCursors = new Map(prev);
        newCursors.set(data.userId, cursor);
        return newCursors;
      });

      // Remove cursor after 5 seconds of inactivity
      setTimeout(() => {
        setCursors(prev => {
          const newCursors = new Map(prev);
          newCursors.delete(data.userId);
          return newCursors;
        });
      }, 5000);
    };

    // Simulate some cursor movements for demo
    const simulateCursorMovement = () => {
      const demoUsers = [
        { id: 'user1', name: 'Alice', avatar: undefined },
        { id: 'user2', name: 'Bob', avatar: undefined },
        { id: 'user3', name: 'Charlie', avatar: undefined }
      ];

      demoUsers.forEach((user, index) => {
        setTimeout(() => {
          handleCursorUpdate({
            userId: user.id,
            userName: user.name,
            userAvatar: user.avatar,
            position: {
              x: Math.random() * 400 + 100,
              y: Math.random() * 300 + 100
            },
            action: ['typing', 'selecting', 'hovering', 'editing'][Math.floor(Math.random() * 4)] as any
          });
        }, index * 1000);
      });
    };

    // Only simulate in development
    if (process.env.NODE_ENV === 'development') {
      simulateCursorMovement();
    }

    // Cleanup
    return () => {
      setCursors(new Map());
    };
  }, [isEnabled, currentUserId, getUserColor]);

  return (
    <div 
      ref={containerRef}
      className={cn('relative w-full h-full', className)}
    >
      {/* Render other users' cursors */}
      <AnimatePresence>
        {Array.from(cursors.values()).map((cursor) => (
          <motion.div
            key={cursor.userId}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute pointer-events-none z-50"
            style={{
              left: cursor.x,
              top: cursor.y,
              transform: 'translate(-50%, -50%)'
            }}
          >
            {/* Cursor */}
            <div className="relative">
              <motion.div
                animate={{ 
                  scale: [1, 1.2, 1],
                  opacity: [0.8, 1, 0.8]
                }}
                transition={{ 
                  duration: 1.5, 
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="w-4 h-4"
                style={{ color: cursor.color }}
              >
                <MousePointer className="w-4 h-4" />
              </motion.div>

              {/* User info */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute top-6 left-0 bg-white rounded-lg shadow-lg border p-2 min-w-32"
              >
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={cursor.userAvatar} />
                    <AvatarFallback className="text-xs">
                      {cursor.userName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">
                      {cursor.userName}
                    </div>
                    {cursor.action && (
                      <Badge 
                        variant="secondary" 
                        className="text-xs mt-1"
                        style={{ backgroundColor: cursor.color + '20', color: cursor.color }}
                      >
                        {cursor.action}
                      </Badge>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* Cursor trail */}
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 0.3 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 rounded-full"
                style={{ 
                  backgroundColor: cursor.color,
                  transform: 'translate(-50%, -50%)'
                }}
              />
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Cursor activity indicator */}
      {isTracking && (
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute top-4 right-4 bg-white rounded-lg shadow-lg border p-2"
        >
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span>Tracking cursors</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// Hook for managing cursor position synchronization
export function useCursorPositionSync(roomId: string, userId: string) {
  const [isEnabled, setIsEnabled] = useState(true);
  const [cursors, setCursors] = useState<Map<string, CursorPosition>>(new Map());
  const [isConnected, setIsConnected] = useState(false);

  const enableCursorSync = useCallback(() => {
    setIsEnabled(true);
  }, []);

  const disableCursorSync = useCallback(() => {
    setIsEnabled(false);
    setCursors(new Map());
  }, []);

  const updateCursorPosition = useCallback((position: { x: number; y: number }, action?: CursorPosition['action']) => {
    if (!isEnabled) return;

    // Update local cursor
    const cursor: CursorPosition = {
      userId,
      userName: 'You',
      x: position.x,
      y: position.y,
      timestamp: Date.now(),
      isActive: true,
      color: '#000000',
      action
    };

    setCursors(prev => {
      const newCursors = new Map(prev);
      newCursors.set(userId, cursor);
      return newCursors;
    });

    // In real implementation, emit to Socket.IO
    // socket.emit('cursor_move', { roomId, position, userId, action });
  }, [isEnabled, roomId, userId]);

  const clearCursor = useCallback(() => {
    setCursors(prev => {
      const newCursors = new Map(prev);
      newCursors.delete(userId);
      return newCursors;
    });

    // In real implementation, emit to Socket.IO
    // socket.emit('cursor_leave', { roomId, userId });
  }, [roomId, userId]);

  return {
    isEnabled,
    cursors: Array.from(cursors.values()),
    isConnected,
    enableCursorSync,
    disableCursorSync,
    updateCursorPosition,
    clearCursor
  };
}
