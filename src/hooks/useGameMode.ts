'use client';

import { useMemo } from 'react';

export type GameMode = 'single' | 'multiplayer';

interface UseGameModeParams {
  participantCount?: number;
  roomCode?: string | null;
}

/**
 * Hook to detect game mode based on room data.
 * - single: No room code or only 1 participant
 * - multiplayer: Has room code and 2+ participants
 * 
 * @param params - Object containing participantCount and optional roomCode
 * @returns Current game mode
 */
export function useGameMode({ participantCount = 0, roomCode }: UseGameModeParams): GameMode {
  return useMemo(() => {
    // If there's no room code, it's single player
    if (!roomCode) return 'single';
    
    // If there's a room code but only 1 or fewer participants, treat as single
    if (participantCount <= 1) return 'single';
    
    // Multiple participants means multiplayer
    return 'multiplayer';
  }, [participantCount, roomCode]);
}
