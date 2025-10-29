'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export interface PuzzleAreaProps {
  puzzleUrl: string;
  onDimensionsUpdate?: (width: number, height: number) => void;
  className?: string;
  minHeight?: number;
  maxHeight?: number;
}

/**
 * PuzzleArea component wraps the crossword puzzle iframe.
 * Features:
 * - Dynamic height adjustment based on puzzle content
 * - Overflow hidden to prevent scrollbars
 * - Message passing support for iframe communication
 */
export function PuzzleArea({
  puzzleUrl,
  onDimensionsUpdate,
  className,
  minHeight = 400,
  maxHeight = 800,
}: PuzzleAreaProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeHeight, setIframeHeight] = useState(minHeight);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Only accept messages from the iframe origin
      if (iframeRef.current && event.source === iframeRef.current.contentWindow) {
        if (event.data.type === 'dimensions') {
          const { width, height } = event.data;
          const clampedHeight = Math.min(Math.max(height, minHeight), maxHeight);
          setIframeHeight(clampedHeight);
          onDimensionsUpdate?.(width, clampedHeight);
        }
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [minHeight, maxHeight, onDimensionsUpdate]);

  return (
    <div
      className={cn('relative w-full overflow-hidden rounded-lg', className)}
      style={{ height: `${iframeHeight}px` }}
    >
      <iframe
        ref={iframeRef}
        src={puzzleUrl}
        className="w-full h-full border-0"
        title="Crossword Puzzle"
        style={{
          overflow: 'hidden',
          display: 'block',
        }}
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  );
}
