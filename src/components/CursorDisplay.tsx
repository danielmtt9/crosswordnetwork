'use client';

import React from 'react';
import { User } from 'lucide-react';

interface CursorPosition {
  cellId: string;
  x: number;
  y: number;
  userId: string;
  userName: string;
  timestamp: number;
}

interface CursorDisplayProps {
  cursorPositions: Map<string, CursorPosition>;
  currentUserId?: string;
  puzzleContainerRef?: React.RefObject<HTMLElement>;
}

// Color palette for different users
const CURSOR_COLORS = [
  '#ef4444', // red-500
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#06b6d4', // cyan-500
  '#84cc16', // lime-500
];

export function CursorDisplay({ cursorPositions, currentUserId, puzzleContainerRef }: CursorDisplayProps) {
  const [cursors, setCursors] = React.useState<Array<CursorPosition & { color: string; opacity: number }>>([]);

  React.useEffect(() => {
    const now = Date.now();
    const activeCursors: Array<CursorPosition & { color: string; opacity: number }> = [];

    cursorPositions.forEach((position, userId) => {
      // Skip current user's cursor
      if (userId === currentUserId) return;

      // Calculate opacity based on how recent the cursor update is
      const age = now - position.timestamp;
      const opacity = Math.max(0.3, 1 - (age / 3000)); // Fade out over 3 seconds

      if (opacity > 0.1) {
        // Assign color based on user ID hash
        const colorIndex = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % CURSOR_COLORS.length;
        const color = CURSOR_COLORS[colorIndex];

        activeCursors.push({
          ...position,
          color,
          opacity
        });
      }
    });

    setCursors(activeCursors);
  }, [cursorPositions, currentUserId]);

  if (cursors.length === 0) {
    return null;
  }

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {cursors.map((cursor) => (
        <div
          key={cursor.userId}
          className="absolute transition-all duration-100 ease-out"
          style={{
            left: `${cursor.x}px`,
            top: `${cursor.y}px`,
            opacity: cursor.opacity,
            transform: 'translate(-50%, -50%)'
          }}
        >
          {/* Cursor pointer */}
          <div
            className="w-4 h-4 relative"
            style={{ color: cursor.color }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-full h-full drop-shadow-sm"
            >
              <path d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z" />
            </svg>
          </div>
          
          {/* User name label */}
          <div
            className="absolute top-5 left-1/2 transform -translate-x-1/2 px-2 py-1 rounded text-xs font-medium text-white whitespace-nowrap"
            style={{ backgroundColor: cursor.color }}
          >
            {cursor.userName}
          </div>
        </div>
      ))}
    </div>
  );
}

// Component for displaying participant avatars with their cursor colors
export function ParticipantCursors({ cursorPositions, currentUserId }: { cursorPositions: Map<string, CursorPosition>; currentUserId?: string }) {
  const participants = React.useMemo(() => {
    const now = Date.now();
    const activeParticipants: Array<{ userId: string; userName: string; color: string; isActive: boolean }> = [];

    cursorPositions.forEach((position, userId) => {
      if (userId === currentUserId) return;

      const age = now - position.timestamp;
      const isActive = age < 5000; // Active if updated within 5 seconds

      const colorIndex = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % CURSOR_COLORS.length;
      const color = CURSOR_COLORS[colorIndex];

      activeParticipants.push({
        userId,
        userName: position.userName,
        color,
        isActive
      });
    });

    return activeParticipants;
  }, [cursorPositions, currentUserId]);

  if (participants.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm text-muted-foreground">Active cursors:</span>
      {participants.map((participant) => (
        <div
          key={participant.userId}
          className="flex items-center space-x-1"
          title={`${participant.userName} ${participant.isActive ? '(active)' : '(inactive)'}`}
        >
          <div
            className="w-3 h-3 rounded-full border-2 border-white"
            style={{ backgroundColor: participant.color }}
          />
          <span className={`text-xs ${participant.isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
            {participant.userName}
          </span>
        </div>
      ))}
    </div>
  );
}
