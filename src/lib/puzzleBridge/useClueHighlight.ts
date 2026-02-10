import { useCallback, useRef } from 'react';
import { IframeBridge } from './useIframeBridge';
import { Clue, CellCoordinate } from './types';
import { getCellsForClue, buildClueMaps, ClueMap } from './cellClueMapping';

/**
 * Hook for managing clue highlight interactions
 * 
 * Bridges between CluesPanel hover events and iframe highlight messages.
 * 
 * @example
 * ```tsx
 * const bridge = useIframeBridge({ iframeRef });
 * const { handleClueHover, handleClueClick } = useClueHighlight({
 *   bridge,
 *   acrossClues,
 *   downClues,
 * });
 * 
 * return (
 *   <CluesPanel
 *     acrossClues={acrossClues}
 *     downClues={downClues}
 *     onClueHover={handleClueHover}
 *     onClueClick={handleClueClick}
 *   />
 * );
 * ```
 */

export interface UseClueHighlightOptions {
  bridge: IframeBridge;
  acrossClues: Clue[];
  downClues: Clue[];
  debug?: boolean;
}

export interface UseClueHighlightResult {
  handleClueHover: (clue: (Clue & { direction: 'across' | 'down' }) | null) => void;
  handleClueClick: (clue: Clue & { direction: 'across' | 'down' }) => void;
}

export function useClueHighlight({
  bridge,
  acrossClues,
  downClues,
  debug = false,
}: UseClueHighlightOptions): UseClueHighlightResult {
  // Build clue maps for fast lookups
  const clueMapsRef = useRef<ClueMap | null>(null);

  // Rebuild clue maps when clues change
  if (!clueMapsRef.current || 
      acrossClues !== clueMapsRef.current.across || 
      downClues !== clueMapsRef.current.down) {
    clueMapsRef.current = buildClueMaps(acrossClues, downClues);
  }

  const log = useCallback(
    (message: string, ...args: any[]) => {
      if (debug) {
        console.log('[useClueHighlight]', message, ...args);
      }
    },
    [debug]
  );

  /**
   * Handle clue hover event
   */
  const handleClueHover = useCallback(
    (clue: (Clue & { direction: 'across' | 'down' }) | null) => {
      if (!bridge.isReady) {
        log('Bridge not ready, ignoring hover');
        return;
      }

      // Clear highlight if no clue
      if (!clue) {
        log('Clearing highlights');
        bridge.send({
          type: 'CLEAR_HIGHLIGHT',
          payload: {},
        });
        return;
      }

      // Get cells for the clue
      const cells: CellCoordinate[] = getCellsForClue(
        clueMapsRef.current!,
        clue.number,
        clue.direction
      );

      if (cells.length === 0) {
        log('No cells found for clue', clue.number, clue.direction);
        return;
      }

      log('Highlighting clue', clue.number, clue.direction, 'cells:', cells.length);

      // Send highlight message to iframe
      bridge.send({
        type: 'HIGHLIGHT_CELLS',
        payload: {
          cells,
          direction: clue.direction,
        },
      });
    },
    [bridge, log]
  );

  /**
   * Handle clue click event
   */
  const handleClueClick = useCallback(
    (clue: Clue & { direction: 'across' | 'down' }) => {
      // Don't hard-block clicks when the iframe isn't ready yet.
      // `useIframeBridge` already queues messages until `IFRAME_READY`,
      // and clicks are high-signal user intent (unlike hover spam).
      if (!bridge.isReady) {
        log('Bridge not ready; queueing click actions');
      }

      // Highlight on click as well (users often click without hovering first).
      const cells: CellCoordinate[] = getCellsForClue(
        clueMapsRef.current!,
        clue.number,
        clue.direction
      );

      if (cells.length > 0) {
        bridge.send({
          type: 'HIGHLIGHT_CELLS',
          payload: {
            cells,
            direction: clue.direction,
          },
        });
      }

      log('Focusing clue', clue.number, clue.direction);

      // Send focus message to iframe
      bridge.send({
        type: 'FOCUS_CLUE',
        payload: {
          clueNumber: clue.number,
          direction: clue.direction,
        },
      });
    },
    [bridge, log]
  );

  return {
    handleClueHover,
    handleClueClick,
  };
}
