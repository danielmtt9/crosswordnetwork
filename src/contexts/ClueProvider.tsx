/**
 * Clue Provider Context
 * 
 * Shared context for providing puzzle clues to both single-player
 * with caching and loading states.
 */

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { ParsedClues } from '@/lib/clueCache/clueParser';

export interface ClueContextValue {
  clues: ParsedClues | null;
  isLoading: boolean;
  error: string | null;
  sourceInfo: {
    source: 'cache' | 'iframe' | 'error';
    cacheHit: boolean;
    parseTimeMs?: number;
    cachedAt?: Date;
  } | null;
  refreshClues: () => Promise<void>;
  clearError: () => void;
}

const ClueContext = createContext<ClueContextValue | undefined>(undefined);

export interface ClueProviderProps {
  puzzleId: number;
  children: ReactNode;
  onCluesLoaded?: (clues: ParsedClues) => void;
  onError?: (error: string) => void;
}

export function ClueProvider({ puzzleId, children, onCluesLoaded, onError }: ClueProviderProps) {
  const [clues, setClues] = useState<ParsedClues | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sourceInfo, setSourceInfo] = useState<ClueContextValue['sourceInfo']>(null);

  const fetchClues = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/puzzles/${puzzleId}/clues`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch clues: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setClues(data.clues);
      setSourceInfo(data.sourceInfo);

      if (onCluesLoaded && data.clues) {
        onCluesLoaded(data.clues);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      
      if (onError) {
        onError(errorMessage);
      }
      
      console.error('[ClueProvider] Failed to fetch clues:', err);
    } finally {
      setIsLoading(false);
    }
  }, [puzzleId, onCluesLoaded, onError]);

  const refreshClues = useCallback(async () => {
    try {
      const response = await fetch(`/api/puzzles/${puzzleId}/clues/refresh`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`Failed to refresh clues: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setClues(data.clues);
      setSourceInfo(data.sourceInfo);
      setError(null);

      if (onCluesLoaded && data.clues) {
        onCluesLoaded(data.clues);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      
      if (onError) {
        onError(errorMessage);
      }
      
      console.error('[ClueProvider] Failed to refresh clues:', err);
    }
  }, [puzzleId, onCluesLoaded, onError]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Fetch clues on mount and when puzzleId changes
  useEffect(() => {
    fetchClues();
  }, [fetchClues]);

  const value: ClueContextValue = {
    clues,
    isLoading,
    error,
    sourceInfo,
    refreshClues,
    clearError,
  };

  return <ClueContext.Provider value={value}>{children}</ClueContext.Provider>;
}

/**
 * Hook to access clue context
 */
export function useClues(): ClueContextValue {
  const context = useContext(ClueContext);
  
  if (context === undefined) {
    throw new Error('useClues must be used within a ClueProvider');
  }
  
  return context;
}

/**
 * Hook to get specific clue by number and direction
 */
export function useClue(number: number, direction: 'across' | 'down') {
  const { clues } = useClues();
  
  if (!clues) return null;
  
  const clueList = direction === 'across' ? clues.across : clues.down;
  return clueList.find(c => c.number === number) || null;
}

/**
 * Hook to get all across clues
 */
export function useAcrossClues() {
  const { clues } = useClues();
  return clues?.across || [];
}

/**
 * Hook to get all down clues
 */
export function useDownClues() {
  const { clues } = useClues();
  return clues?.down || [];
}

/**
 * Hook to get metadata
 */
export function useClueMetadata() {
  const { clues } = useClues();
  return clues?.metadata || null;
}

/**
 * Hook for loading state with timeout
 */
export function useCluesWithTimeout(timeoutMs: number = 5000) {
  const context = useClues();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (context.isLoading) {
      const timer = setTimeout(() => {
        setTimedOut(true);
      }, timeoutMs);

      return () => clearTimeout(timer);
    } else {
      setTimedOut(false);
    }
  }, [context.isLoading, timeoutMs]);

  return {
    ...context,
    timedOut,
  };
}
