/**
 * CrosswordGrid Component
 * 
 * Interactive crossword grid with cell selection and keyboard input
 */

'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import type { GridCell, Direction } from '@/hooks/useCrosswordInput';

/**
 * Props for CrosswordGrid component
 */
export interface CrosswordGridProps {
  /** Grid cells data */
  cells: GridCell[];
  /** Number of rows */
  rows: number;
  /** Number of columns */
  cols: number;
  /** Currently selected cell position */
  selectedCell: { row: number; col: number } | null;
  /** Current direction */
  direction: Direction;
  /** Function to check if cell is highlighted */
  isCellHighlighted: (row: number, col: number) => boolean;
  /** Function to get cell value */
  getCellValue: (row: number, col: number) => string;
  /** Callback when cell is clicked */
  onCellClick: (row: number, col: number) => void;
  /** Callback for keyboard events */
  onKeyPress: (key: string) => void;
  /** Cell size in pixels */
  cellSize?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * CrosswordGrid - Interactive grid component
 */
export function CrosswordGrid({
  cells,
  rows,
  cols,
  selectedCell,
  direction,
  isCellHighlighted,
  getCellValue,
  onCellClick,
  onKeyPress,
  cellSize = 40,
  className,
}: CrosswordGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);

  // Build grid array
  const grid: (GridCell | null)[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => null)
  );

  cells.forEach(cell => {
    if (cell.row < rows && cell.col < cols) {
      grid[cell.row][cell.col] = cell;
    }
  });

  // Focus grid on mount and handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default for arrow keys and space
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
      onKeyPress(e.key);
    };

    const gridElement = gridRef.current;
    if (gridElement) {
      gridElement.focus();
      gridElement.addEventListener('keydown', handleKeyDown);
      return () => {
        gridElement.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [onKeyPress]);

  // Auto-focus when selected cell changes
  useEffect(() => {
    if (selectedCell && gridRef.current) {
      gridRef.current.focus();
    }
  }, [selectedCell]);

  return (
    <div
      ref={gridRef}
      tabIndex={0}
      className={cn(
        'inline-block border-2 border-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
        className
      )}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
        gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
      }}
    >
      {grid.map((row, rowIndex) =>
        row.map((cell, colIndex) => {
          if (!cell) {
            return (
              <div
                key={`empty-${rowIndex}-${colIndex}`}
                className="bg-background"
              />
            );
          }

          const isBlack = cell.isBlack;
          const isSelected =
            selectedCell?.row === rowIndex && selectedCell?.col === colIndex;
          const isHighlighted = isCellHighlighted(rowIndex, colIndex);
          const value = getCellValue(rowIndex, colIndex);

          return (
            <button
              key={`${rowIndex}-${colIndex}`}
              onClick={() => !isBlack && onCellClick(rowIndex, colIndex)}
              disabled={isBlack}
              className={cn(
                'relative border border-border flex items-center justify-center font-bold',
                'transition-colors duration-150',
                isBlack && 'bg-black cursor-not-allowed',
                !isBlack && 'bg-background hover:bg-accent/50 cursor-pointer',
                isHighlighted && !isSelected && direction === 'across' && 'bg-green-100 dark:bg-green-900/20',
                isHighlighted && !isSelected && direction === 'down' && 'bg-blue-100 dark:bg-blue-900/20',
                isSelected && 'bg-primary/30 ring-2 ring-primary ring-inset'
              )}
              style={{
                width: `${cellSize}px`,
                height: `${cellSize}px`,
                fontSize: `${cellSize * 0.6}px`,
              }}
              aria-label={`Cell ${rowIndex}, ${colIndex}${cell.number ? `, ${cell.number}` : ''}`}
            >
              {!isBlack && cell.number && (
                <span
                  className="absolute top-0.5 left-0.5 text-xs font-normal text-muted-foreground"
                  style={{ fontSize: `${cellSize * 0.25}px` }}
                >
                  {cell.number}
                </span>
              )}
              {!isBlack && value && (
                <span className="text-foreground">{value}</span>
              )}
            </button>
          );
        })
      )}
    </div>
  );
}
