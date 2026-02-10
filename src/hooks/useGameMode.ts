'use client';

import { useMemo } from 'react';

export type GameMode = 'single';

interface UseGameModeParams {
  participantCount?: number;
  roomCode?: string | null;
}

/**
 * Hook to detect game mode based on room data.
 * - single: Standard single-player experience
 * 
 * @param params - Object containing participantCount and optional roomCode
 * @returns Current game mode
 */
export function useGameMode({ participantCount = 0, roomCode }: UseGameModeParams): GameMode {
  return 'single';
}
