/**
 * ClueList Component
 * 
 * Displays crossword clues with highlighting for active clue
 */

'use client';

import { cn } from '@/lib/utils';
import type { Clue, Direction } from '@/hooks/useCrosswordInput';

/**
 * Props for ClueList component
 */
export interface ClueListProps {
  /** List of clues to display */
  clues: Clue[];
  /** Direction of clues (across or down) */
  direction: Direction;
  /** Currently active clue number */
  activeClueNumber?: number;
  /** Callback when a clue is clicked */
  onClueClick?: (clue: Clue) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * ClueList - Displays list of clues with highlighting
 */
export function ClueList({
  clues,
  direction,
  activeClueNumber,
  onClueClick,
  className,
}: ClueListProps) {
  // Filter clues by direction
  const filteredClues = clues.filter(clue => clue.direction === direction);

  // Sort clues by number
  const sortedClues = [...filteredClues].sort((a, b) => a.number - b.number);

  return (
    <div className={cn('space-y-1', className)}>
      {sortedClues.map((clue) => {
        const isActive = activeClueNumber === clue.number;
        
        return (
          <button
            key={`${clue.direction}-${clue.number}`}
            onClick={() => onClueClick?.(clue)}
            className={cn(
              'w-full text-left px-3 py-2 rounded-md transition-colors',
              'hover:bg-accent hover:text-accent-foreground',
              'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
              isActive && 'bg-primary/10 border-l-4 border-primary font-medium'
            )}
          >
            <span className="font-semibold text-primary mr-2">
              {clue.number}.
            </span>
            <span className={cn(isActive && 'text-foreground')}>
              {clue.clue}
            </span>
          </button>
        );
      })}
    </div>
  );
}
