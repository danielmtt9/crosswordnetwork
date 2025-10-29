'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface DesktopSingleLayoutProps {
  cluesPanel: ReactNode;
  puzzleArea: ReactNode;
  className?: string;
}

/**
 * DesktopSingleLayout displays a 2-column layout for single-player on desktop.
 * Layout: Clues (30%) | Puzzle (70%)
 */
export function DesktopSingleLayout({
  cluesPanel,
  puzzleArea,
  className,
}: DesktopSingleLayoutProps) {
  return (
    <div
      className={cn(
        'grid h-full w-full gap-4 p-4',
        'grid-cols-[3fr_7fr]',
        className
      )}
      style={{ gridTemplateColumns: '3fr 7fr' }}
    >
      {/* Left: Clues Panel */}
      <div className="overflow-hidden">{cluesPanel}</div>

      {/* Right: Puzzle Area */}
      <div className="flex items-center justify-center overflow-hidden">
        {puzzleArea}
      </div>
    </div>
  );
}
