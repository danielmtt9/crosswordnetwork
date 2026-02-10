import { useEffect, useState, useCallback, RefObject } from 'react';
import { GridDimensions } from './types';
import { calculateCellSize, generateResponsiveCSSVariables, updateCSSVariables } from './cssInjectionManager';

/**
 * Hook for responsive puzzle sizing
 * 
 * Automatically calculates optimal cell size based on:
 * - Container dimensions
 * - Grid dimensions (rows/cols)
 * - Device pixel ratio
 * 
 * Updates CSS variables in iframe when container size changes
 */

export interface UseResponsivePuzzleOptions {
  containerRef: RefObject<HTMLElement>;
  iframeRef: RefObject<HTMLIFrameElement>;
  gridDimensions?: GridDimensions;
  enabled?: boolean;
}

export interface ResponsivePuzzleState {
  containerWidth: number;
  containerHeight: number;
  cellSize: number;
  isReady: boolean;
}

export function useResponsivePuzzle({
  containerRef,
  iframeRef,
  gridDimensions,
  enabled = true,
}: UseResponsivePuzzleOptions): ResponsivePuzzleState {
  const [state, setState] = useState<ResponsivePuzzleState>({
    containerWidth: 0,
    containerHeight: 0,
    cellSize: 32,
    isReady: false,
  });

  /**
   * Calculate and apply responsive sizing
   */
  const updateSizing = useCallback(() => {
    if (!enabled || !containerRef.current || !iframeRef.current || !gridDimensions) {
      return;
    }

    const container = containerRef.current;
    const iframe = iframeRef.current;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;

    if (!doc) return;

    // Get container dimensions
    const rect = container.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    // Calculate optimal cell size
    const cellSize = calculateCellSize(
      width,
      height,
      gridDimensions.rows,
      gridDimensions.cols,
      window.devicePixelRatio
    );

    // Generate and apply CSS variables
    const variables = generateResponsiveCSSVariables(cellSize);
    updateCSSVariables(doc, variables);

    setState({
      containerWidth: width,
      containerHeight: height,
      cellSize,
      isReady: true,
    });
  }, [enabled, containerRef, iframeRef, gridDimensions]);

  /**
   * Setup ResizeObserver for container
   */
  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      updateSizing();
    });

    resizeObserver.observe(containerRef.current);

    // Initial sizing
    updateSizing();

    return () => {
      resizeObserver.disconnect();
    };
  }, [enabled, containerRef, updateSizing]);

  /**
   * Re-calculate when grid dimensions change
   */
  useEffect(() => {
    if (gridDimensions) {
      updateSizing();
    }
  }, [gridDimensions, updateSizing]);

  return state;
}
