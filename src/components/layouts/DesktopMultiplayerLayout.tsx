'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface DesktopMultiplayerLayoutProps {
  cluesPanel: ReactNode;
  puzzleArea: ReactNode;
  multiplayerPanel: ReactNode;
  className?: string;
}

/**
 * DesktopMultiplayerLayout displays a 3-column layout for multiplayer on desktop.
 * Layout: Clues (25%) | Puzzle (50%) | Multiplayer Panel (25%)
 */
export function DesktopMultiplayerLayout({
  cluesPanel,
  puzzleArea,
  multiplayerPanel,
  className,
}: DesktopMultiplayerLayoutProps) {
  return (
    <div
      className={cn(
        'grid h-full w-full gap-4 p-4',
        'grid-cols-[1fr_2fr_1fr]',
        className
      )}
      style={{ gridTemplateColumns: '1fr 2fr 1fr' }}
    >
      {/* Left: Clues Panel */}
      <div className="overflow-hidden">{cluesPanel}</div>

      {/* Center: Puzzle Area */}
      <div className="flex items-center justify-center overflow-hidden">
        {puzzleArea}
      </div>

      {/* Right: Multiplayer Panel */}
      <div className="overflow-hidden">{multiplayerPanel}</div>
    </div>
  );
}
