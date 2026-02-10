/**
 * Animation manager hook for triggering animations in puzzle iframes
 * 
 * Provides convenient helpers to trigger various animation types like
 * correct/incorrect feedback, completion celebrations, hints, etc.
 */

import { useCallback } from 'react';
import type { ChannelId, CellCoordinate } from './types';
import { createBaseMessage } from './types';

export interface AnimationOptions {
  duration?: number;
  remove?: boolean;
}

export interface UseAnimationManagerOptions {
  channelId: ChannelId;
  iframeRef: React.RefObject<HTMLIFrameElement>;
  enabled?: boolean;
}

export interface AnimationManager {
  triggerCorrect: (cells: CellCoordinate[], options?: AnimationOptions) => void;
  triggerIncorrect: (cells: CellCoordinate[], options?: AnimationOptions) => void;
  triggerCelebrate: (selector?: string, options?: AnimationOptions) => void;
  triggerHint: (cells: CellCoordinate[], options?: AnimationOptions) => void;
  triggerGlow: (selector: string, options?: AnimationOptions) => void;
  triggerFadeIn: (selector: string, options?: AnimationOptions) => void;
  triggerCustom: (
    animationType: string,
    targetSelector: string,
    options?: AnimationOptions
  ) => void;
}

export function useAnimationManager({
  channelId,
  iframeRef,
  enabled = true,
}: UseAnimationManagerOptions): AnimationManager {
  /**
   * Send animation trigger message to iframe
   */
  const sendAnimationMessage = useCallback(
    (
      animationType: string,
      targetSelector: string,
      options: AnimationOptions = {}
    ) => {
      if (!enabled) {
        console.log('[useAnimationManager] Animations disabled');
        return;
      }

      const iframe = iframeRef.current;
      if (!iframe?.contentWindow) {
        console.warn('[useAnimationManager] iframe not ready');
        return;
      }

      const message = {
        ...createBaseMessage(channelId),
        type: 'TRIGGER_ANIMATION',
        payload: {
          animationType,
          targetSelector,
          duration: options.duration,
          remove: options.remove !== false, // Default to true
        },
      };

      try {
        iframe.contentWindow.postMessage(message, '*');
        console.log(
          `[useAnimationManager] Triggered ${animationType} animation on ${targetSelector}`
        );
      } catch (error) {
        console.error('[useAnimationManager] Failed to send message:', error);
      }
    },
    [channelId, iframeRef, enabled]
  );

  /**
   * Convert cell coordinates to CSS selector
   */
  const cellsToSelector = useCallback((cells: CellCoordinate[]): string => {
    return cells
      .map((cell) => {
        // Try multiple selector patterns for compatibility
        return [
          `[data-row="${cell.row}"][data-col="${cell.col}"]`,
          `[data-cell="${cell.row}-${cell.col}"]`,
          `#cell-${cell.row}-${cell.col}`,
        ].join(', ');
      })
      .join(', ');
  }, []);

  /**
   * Trigger correct answer animation (green pulse)
   */
  const triggerCorrect = useCallback(
    (cells: CellCoordinate[], options?: AnimationOptions) => {
      const selector = cellsToSelector(cells);
      sendAnimationMessage('correct', selector, options);
    },
    [cellsToSelector, sendAnimationMessage]
  );

  /**
   * Trigger incorrect answer animation (red shake)
   */
  const triggerIncorrect = useCallback(
    (cells: CellCoordinate[], options?: AnimationOptions) => {
      const selector = cellsToSelector(cells);
      sendAnimationMessage('incorrect', selector, options);
    },
    [cellsToSelector, sendAnimationMessage]
  );

  /**
   * Trigger celebration animation (puzzle completion)
   */
  const triggerCelebrate = useCallback(
    (selector: string = '.ecw-box', options?: AnimationOptions) => {
      sendAnimationMessage('celebrate', selector, options);
    },
    [sendAnimationMessage]
  );

  /**
   * Trigger hint reveal animation
   */
  const triggerHint = useCallback(
    (cells: CellCoordinate[], options?: AnimationOptions) => {
      const selector = cellsToSelector(cells);
      sendAnimationMessage('hint', selector, options);
    },
    [cellsToSelector, sendAnimationMessage]
  );

  /**
   * Trigger glow animation (active cell indicator)
   */
  const triggerGlow = useCallback(
    (selector: string, options?: AnimationOptions) => {
      sendAnimationMessage('glow', selector, {
        ...options,
        remove: false, // Glow is typically persistent until removed manually
      });
    },
    [sendAnimationMessage]
  );

  /**
   * Trigger fade in animation
   */
  const triggerFadeIn = useCallback(
    (selector: string, options?: AnimationOptions) => {
      sendAnimationMessage('fadeIn', selector, options);
    },
    [sendAnimationMessage]
  );

  /**
   * Trigger custom animation
   */
  const triggerCustom = useCallback(
    (
      animationType: string,
      targetSelector: string,
      options?: AnimationOptions
    ) => {
      sendAnimationMessage(animationType, targetSelector, options);
    },
    [sendAnimationMessage]
  );

  return {
    triggerCorrect,
    triggerIncorrect,
    triggerCelebrate,
    triggerHint,
    triggerGlow,
    triggerFadeIn,
    triggerCustom,
  };
}

/**
 * Hook to check if user prefers reduced motion
 */
export function usePrefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
