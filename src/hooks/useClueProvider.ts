/**
 * Unified Clue Provider Hook
 * 
 * Implements database-first clue loading with iframe fallback.
 * Used by puzzle pages to supply clue data.
 * 
 * Features:
 * - Always tries database first for consistency and performance
 * - Falls back to iframe extraction if database clues missing/malformed
 * - Persists extracted clues to database for future use
 * - Robust logging to track clue sources
 * - Caching to avoid redundant extractions
 * 
 * @example
 * ```tsx
 * const { clues, isLoading, error, source } = useClueProvider({
 *   puzzleId: 123,
 *   iframeRef,
 * });
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { extractCluesWithRetry, formatCluesForDisplay, type CluesByDirection } from '@/lib/clueExtraction';

export interface Clue {
  number: number;
  text: string;
  length?: number;
  cells?: Array<{ row: number; col: number }>;
}

export interface CluesData {
  across: Clue[];
  down: Clue[];
}

export type ClueSource = 'database' | 'iframe' | 'none';

export interface UseClueProviderOptions {
  puzzleId: number | string;
  iframeRef: React.RefObject<HTMLIFrameElement>;
  enableFallback?: boolean;
  enablePersistence?: boolean;
  debug?: boolean;
}

export interface UseClueProviderResult {
  clues: CluesData;
  isLoading: boolean;
  error: string | null;
  source: ClueSource;
  refetch: () => Promise<void>;
}

/**
 * Validate clues data structure
 */
function validateClues(clues: any): clues is CluesByDirection {
  if (!clues || typeof clues !== 'object') return false;
  
  const validateArray = (arr: any) => {
    if (!Array.isArray(arr)) return false;
    return arr.every(clue => 
      typeof clue === 'object' &&
      typeof clue.number === 'number' &&
      typeof clue.text === 'string'
    );
  };

  return validateArray(clues.across) && validateArray(clues.down);
}

/**
 * Fetch clues from database via API
 */
async function fetchCluesFromDatabase(
  puzzleId: number | string,
  debug: boolean
): Promise<CluesData | null> {
  try {
    if (debug) {
      console.log(`[ClueProvider] Fetching clues from database for puzzle ${puzzleId}...`);
    }

    const response = await fetch(`/api/puzzles/${puzzleId}`);
    
    if (!response.ok) {
      if (debug) {
        console.warn(`[ClueProvider] Database fetch failed: ${response.status}`);
      }
      return null;
    }

    const data = await response.json();

    // Check if clues exist and are valid
    if (data.clues) {
      let parsedClues;
      
      // Handle both JSON string and object formats
      if (typeof data.clues === 'string') {
        try {
          parsedClues = JSON.parse(data.clues);
        } catch (e) {
          if (debug) {
            console.warn('[ClueProvider] Failed to parse clues JSON from database');
          }
          return null;
        }
      } else {
        parsedClues = data.clues;
      }

      // Validate structure
      if (!validateClues(parsedClues)) {
        if (debug) {
          console.warn('[ClueProvider] Database clues failed validation');
        }
        return null;
      }

      if (debug) {
        const hasCells = parsedClues.across[0]?.cells || parsedClues.down[0]?.cells;
        console.log(
          `[ClueProvider] ✓ Loaded from database: ${parsedClues.across.length} across, ` +
          `${parsedClues.down.length} down${hasCells ? ' (with cell coordinates)' : ''}`
        );
      }

      return {
        across: parsedClues.across,
        down: parsedClues.down,
      };
    }

    if (debug) {
      console.log('[ClueProvider] No clues found in database');
    }
    return null;

  } catch (error) {
    if (debug) {
      console.error('[ClueProvider] Database fetch error:', error);
    }
    return null;
  }
}

/**
 * Extract clues from iframe
 */
async function extractCluesFromIframe(
  iframeRef: React.RefObject<HTMLIFrameElement>,
  debug: boolean
): Promise<CluesData | null> {
  try {
    if (debug) {
      console.log('[ClueProvider] Extracting clues from iframe...');
    }

    const extracted = await extractCluesWithRetry(iframeRef.current);

    if (!extracted || (extracted.across.length === 0 && extracted.down.length === 0)) {
      if (debug) {
        console.warn('[ClueProvider] Iframe extraction returned no clues');
      }
      return null;
    }

    // Format for display
    const formatted = formatCluesForDisplay(extracted);

    if (debug) {
      const hasCells = formatted.across[0]?.cells || formatted.down[0]?.cells;
      console.log(
        `[ClueProvider] ✓ Extracted from iframe: ${formatted.across.length} across, ` +
        `${formatted.down.length} down${hasCells ? ' (with cell coordinates)' : ''}`
      );
    }

    return formatted;

  } catch (error) {
    if (debug) {
      console.error('[ClueProvider] Iframe extraction error:', error);
    }
    return null;
  }
}

/**
 * Persist clues to database
 */
async function persistClues(
  puzzleId: number | string,
  clues: CluesData,
  debug: boolean
): Promise<boolean> {
  try {
    if (debug) {
      console.log(`[ClueProvider] Persisting clues to database for puzzle ${puzzleId}...`);
    }

    const response = await fetch(`/api/puzzles/${puzzleId}/clues`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clues }),
    });

    if (!response.ok) {
      if (debug) {
        console.warn(`[ClueProvider] Failed to persist clues: ${response.status}`);
      }
      return false;
    }

    if (debug) {
      console.log('[ClueProvider] ✓ Clues persisted to database');
    }

    return true;

  } catch (error) {
    if (debug) {
      console.error('[ClueProvider] Persistence error:', error);
    }
    return false;
  }
}

/**
 * Main hook for unified clue loading
 */
export function useClueProvider({
  puzzleId,
  iframeRef,
  enableFallback = true,
  enablePersistence = true,
  debug = false,
}: UseClueProviderOptions): UseClueProviderResult {
  const [clues, setClues] = useState<CluesData>({ across: [], down: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<ClueSource>('none');
  
  // Track if we've already attempted to load clues for this puzzle
  const attemptedRef = useRef<Set<string>>(new Set());
  const loadingRef = useRef(false);

  /**
   * Load clues with database-first strategy
   */
  const loadClues = useCallback(async () => {
    const cacheKey = `${puzzleId}`;
    
    // Prevent duplicate loads
    if (loadingRef.current || attemptedRef.current.has(cacheKey)) {
      return;
    }

    loadingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      // Step 1: Try database first
      const dbClues = await fetchCluesFromDatabase(puzzleId, debug);

      if (dbClues && (dbClues.across.length > 0 || dbClues.down.length > 0)) {
        setClues(dbClues);
        setSource('database');
        attemptedRef.current.add(cacheKey);
        return;
      }

      // Step 2: Fallback to iframe extraction if enabled
      if (!enableFallback) {
        setError('No clues available in database and fallback disabled');
        setSource('none');
        return;
      }

      if (debug) {
        console.log('[ClueProvider] Database clues unavailable, falling back to iframe extraction');
      }

      // Wait for iframe to be ready
      if (!iframeRef.current) {
        if (debug) {
          console.log('[ClueProvider] Waiting for iframe to be ready...');
        }
        // Give iframe time to load
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      const iframeClues = await extractCluesFromIframe(iframeRef, debug);

      if (!iframeClues || (iframeClues.across.length === 0 && iframeClues.down.length === 0)) {
        setError('Failed to load clues from database or iframe');
        setSource('none');
        return;
      }

      setClues(iframeClues);
      setSource('iframe');
      attemptedRef.current.add(cacheKey);

      // Step 3: Persist extracted clues to database for future use
      if (enablePersistence) {
        // Don't await - persist in background
        persistClues(puzzleId, iframeClues, debug).catch(err => {
          if (debug) {
            console.warn('[ClueProvider] Background persistence failed:', err);
          }
        });
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error loading clues';
      setError(errorMessage);
      setSource('none');
      
      if (debug) {
        console.error('[ClueProvider] Load error:', err);
      }
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
    }
  }, [puzzleId, iframeRef, enableFallback, enablePersistence, debug]);

  /**
   * Refetch clues (clears cache)
   */
  const refetch = useCallback(async () => {
    attemptedRef.current.clear();
    await loadClues();
  }, [loadClues]);

  /**
   * Load clues on mount or when puzzle changes
   */
  useEffect(() => {
    loadClues();
  }, [loadClues]);

  return {
    clues,
    isLoading,
    error,
    source,
    refetch,
  };
}
