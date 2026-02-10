/**
 * useCrosswordInput Hook
 * 
 * Manages crossword puzzle interaction including:
 * - Cell selection and navigation
 * - Answer input handling
 * - Direction toggle (across/down)
 * - Clue highlighting based on selected cell
 */

import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * Direction for crossword navigation
 */
export type Direction = 'across' | 'down';

/**
 * Position of a cell in the crossword grid
 */
export interface CellPosition {
  row: number;
  col: number;
}

/**
 * Clue information
 */
export interface Clue {
  number: number;
  direction: Direction;
  clue: string;
  answer: string;
  startRow: number;
  startCol: number;
  length: number;
}

/**
 * Selected cell information with associated clues
 */
export interface SelectedCell extends CellPosition {
  direction: Direction;
  acrossClue?: Clue;
  downClue?: Clue;
}

/**
 * Cell data in the grid
 */
export interface GridCell {
  row: number;
  col: number;
  number?: number;
  value: string;
  isBlack: boolean;
}

/**
 * Options for the crossword input hook
 */
export interface UseCrosswordInputOptions {
  /** Grid dimensions */
  rows: number;
  cols: number;
  /** All clues (across and down) */
  clues: Clue[];
  /** Grid cells data */
  cells: GridCell[];
  /** Callback when answer is updated */
  onAnswerChange?: (row: number, col: number, value: string) => void;
  /** Callback when selected cell changes */
  onCellSelect?: (cell: SelectedCell | null) => void;
}

/**
 * Return type for useCrosswordInput hook
 */
export interface UseCrosswordInputReturn {
  /** Currently selected cell */
  selectedCell: SelectedCell | null;
  /** Current direction (across/down) */
  direction: Direction;
  /** Select a cell */
  selectCell: (row: number, col: number) => void;
  /** Toggle direction */
  toggleDirection: () => void;
  /** Handle keyboard input */
  handleKeyPress: (key: string) => void;
  /** Get cell value */
  getCellValue: (row: number, col: number) => string;
  /** Check if cell is highlighted */
  isCellHighlighted: (row: number, col: number) => boolean;
  /** Get active clue */
  getActiveClue: () => Clue | undefined;
}

/**
 * Hook for managing crossword input and interaction
 */
export function useCrosswordInput({
  rows,
  cols,
  clues,
  cells,
  onAnswerChange,
  onCellSelect,
}: UseCrosswordInputOptions): UseCrosswordInputReturn {
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);
  const [direction, setDirection] = useState<Direction>('across');
  const gridRef = useRef<Map<string, GridCell>>(new Map());

  /**
   * Build grid lookup map
   */
  useEffect(() => {
    const map = new Map<string, GridCell>();
    cells.forEach(cell => {
      map.set(`${cell.row},${cell.col}`, cell);
    });
    gridRef.current = map;
  }, [cells]);

  /**
   * Get cell from grid
   */
  const getCell = useCallback((row: number, col: number): GridCell | undefined => {
    return gridRef.current.get(`${row},${col}`);
  }, []);

  /**
   * Find clues associated with a cell position
   */
  const findCluesForCell = useCallback((row: number, col: number): { across?: Clue; down?: Clue } => {
    const result: { across?: Clue; down?: Clue } = {};

    clues.forEach(clue => {
      if (clue.direction === 'across') {
        // Check if cell is in this across clue
        if (clue.startRow === row && 
            col >= clue.startCol && 
            col < clue.startCol + clue.length) {
          result.across = clue;
        }
      } else {
        // Check if cell is in this down clue
        if (clue.startCol === col && 
            row >= clue.startRow && 
            row < clue.startRow + clue.length) {
          result.down = clue;
        }
      }
    });

    return result;
  }, [clues]);

  /**
   * Select a cell and find associated clues
   */
  const selectCell = useCallback((row: number, col: number) => {
    const cell = getCell(row, col);
    if (!cell || cell.isBlack) {
      setSelectedCell(null);
      onCellSelect?.(null);
      return;
    }

    const { across, down } = findCluesForCell(row, col);
    
    // Toggle direction if clicking same cell
    let newDirection = direction;
    if (selectedCell && selectedCell.row === row && selectedCell.col === col) {
      newDirection = direction === 'across' ? 'down' : 'across';
      setDirection(newDirection);
    }

    const newSelectedCell: SelectedCell = {
      row,
      col,
      direction: newDirection,
      acrossClue: across,
      downClue: down,
    };

    setSelectedCell(newSelectedCell);
    onCellSelect?.(newSelectedCell);
  }, [getCell, findCluesForCell, direction, selectedCell, onCellSelect]);

  /**
   * Toggle direction between across and down
   */
  const toggleDirection = useCallback(() => {
    setDirection(prev => prev === 'across' ? 'down' : 'across');
  }, []);

  /**
   * Get next cell position based on direction
   */
  const getNextCell = useCallback((row: number, col: number, dir: Direction): CellPosition | null => {
    if (dir === 'across') {
      // Move right
      for (let c = col + 1; c < cols; c++) {
        const cell = getCell(row, c);
        if (cell && !cell.isBlack) {
          return { row, col: c };
        }
      }
    } else {
      // Move down
      for (let r = row + 1; r < rows; r++) {
        const cell = getCell(r, col);
        if (cell && !cell.isBlack) {
          return { row: r, col };
        }
      }
    }
    return null;
  }, [rows, cols, getCell]);

  /**
   * Get previous cell position based on direction
   */
  const getPrevCell = useCallback((row: number, col: number, dir: Direction): CellPosition | null => {
    if (dir === 'across') {
      // Move left
      for (let c = col - 1; c >= 0; c--) {
        const cell = getCell(row, c);
        if (cell && !cell.isBlack) {
          return { row, col: c };
        }
      }
    } else {
      // Move up
      for (let r = row - 1; r >= 0; r--) {
        const cell = getCell(r, col);
        if (cell && !cell.isBlack) {
          return { row: r, col };
        }
      }
    }
    return null;
  }, [getCell]);

  /**
   * Handle keyboard input
   */
  const handleKeyPress = useCallback((key: string) => {
    if (!selectedCell) return;

    const { row, col } = selectedCell;

    // Handle letter input
    if (/^[a-zA-Z]$/.test(key)) {
      const cell = getCell(row, col);
      if (cell) {
        cell.value = key.toUpperCase();
        onAnswerChange?.(row, col, key.toUpperCase());
        
        // Move to next cell
        const next = getNextCell(row, col, direction);
        if (next) {
          selectCell(next.row, next.col);
        }
      }
      return;
    }

    // Handle backspace/delete
    if (key === 'Backspace' || key === 'Delete') {
      const cell = getCell(row, col);
      if (cell) {
        if (cell.value) {
          // Clear current cell
          cell.value = '';
          onAnswerChange?.(row, col, '');
        } else {
          // Move to previous cell and clear it
          const prev = getPrevCell(row, col, direction);
          if (prev) {
            const prevCell = getCell(prev.row, prev.col);
            if (prevCell) {
              prevCell.value = '';
              onAnswerChange?.(prev.row, prev.col, '');
            }
            selectCell(prev.row, prev.col);
          }
        }
      }
      return;
    }

    // Handle arrow keys
    if (key === 'ArrowRight') {
      const next = getNextCell(row, col, 'across');
      if (next) selectCell(next.row, next.col);
      return;
    }

    if (key === 'ArrowLeft') {
      const prev = getPrevCell(row, col, 'across');
      if (prev) selectCell(prev.row, prev.col);
      return;
    }

    if (key === 'ArrowDown') {
      const next = getNextCell(row, col, 'down');
      if (next) selectCell(next.row, next.col);
      return;
    }

    if (key === 'ArrowUp') {
      const prev = getPrevCell(row, col, 'down');
      if (prev) selectCell(prev.row, prev.col);
      return;
    }

    // Handle space to toggle direction
    if (key === ' ') {
      toggleDirection();
    }
  }, [selectedCell, getCell, onAnswerChange, getNextCell, getPrevCell, direction, selectCell, toggleDirection]);

  /**
   * Get cell value
   */
  const getCellValue = useCallback((row: number, col: number): string => {
    const cell = getCell(row, col);
    return cell?.value || '';
  }, [getCell]);

  /**
   * Check if a cell should be highlighted
   */
  const isCellHighlighted = useCallback((row: number, col: number): boolean => {
    if (!selectedCell) return false;

    const activeClue = direction === 'across' ? selectedCell.acrossClue : selectedCell.downClue;
    if (!activeClue) return false;

    if (activeClue.direction === 'across') {
      return activeClue.startRow === row &&
             col >= activeClue.startCol &&
             col < activeClue.startCol + activeClue.length;
    } else {
      return activeClue.startCol === col &&
             row >= activeClue.startRow &&
             row < activeClue.startRow + activeClue.length;
    }
  }, [selectedCell, direction]);

  /**
   * Get the currently active clue
   */
  const getActiveClue = useCallback((): Clue | undefined => {
    if (!selectedCell) return undefined;
    return direction === 'across' ? selectedCell.acrossClue : selectedCell.downClue;
  }, [selectedCell, direction]);

  return {
    selectedCell,
    direction,
    selectCell,
    toggleDirection,
    handleKeyPress,
    getCellValue,
    isCellHighlighted,
    getActiveClue,
  };
}
