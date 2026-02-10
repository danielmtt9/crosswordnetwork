import { Clue, CellCoordinate } from './types';

/**
 * Cell-Clue Mapping Utility
 * 
 * Normalizes and maps between:
 * - Clue numbers and cells
 * - Cell coordinates and clues
 * - Direction (across/down) and cells
 */

export interface ClueMap {
  across: Map<number, Clue>;
  down: Map<number, Clue>;
}

export interface CellMap {
  [key: string]: {
    across?: number;
    down?: number;
  };
}

/**
 * Create a cell key from coordinates
 */
export function cellKey(row: number, col: number): string {
  return `${row},${col}`;
}

/**
 * Parse a cell key back to coordinates
 */
export function parseCellKey(key: string): CellCoordinate {
  const [row, col] = key.split(',').map(Number);
  return { row, col };
}

/**
 * Build clue maps from clue arrays
 */
export function buildClueMaps(
  acrossClues: Clue[] = [],
  downClues: Clue[] = []
): ClueMap {
  const across = new Map<number, Clue>();
  const down = new Map<number, Clue>();

  acrossClues.forEach((clue) => {
    across.set(clue.number, clue);
  });

  downClues.forEach((clue) => {
    down.set(clue.number, clue);
  });

  return { across, down };
}

/**
 * Build cell-to-clue mapping
 * Maps each cell to the clue(s) it belongs to
 */
export function buildCellMap(clueMap: ClueMap): CellMap {
  const cellMap: CellMap = {};

  // Process across clues
  clueMap.across.forEach((clue) => {
    clue.cells.forEach((cell) => {
      const key = cellKey(cell.row, cell.col);
      if (!cellMap[key]) {
        cellMap[key] = {};
      }
      cellMap[key].across = clue.number;
    });
  });

  // Process down clues
  clueMap.down.forEach((clue) => {
    clue.cells.forEach((cell) => {
      const key = cellKey(cell.row, cell.col);
      if (!cellMap[key]) {
        cellMap[key] = {};
      }
      cellMap[key].down = clue.number;
    });
  });

  return cellMap;
}

/**
 * Get clue by number and direction
 */
export function getClue(
  clueMap: ClueMap,
  number: number,
  direction: 'across' | 'down'
): Clue | undefined {
  return clueMap[direction].get(number);
}

/**
 * Get cells for a clue
 */
export function getCellsForClue(
  clueMap: ClueMap,
  number: number,
  direction: 'across' | 'down'
): CellCoordinate[] {
  const clue = getClue(clueMap, number, direction);
  return clue ? clue.cells : [];
}

/**
 * Get clues for a cell
 */
export function getCluesForCell(
  cellMap: CellMap,
  row: number,
  col: number
): { across?: number; down?: number } {
  const key = cellKey(row, col);
  return cellMap[key] || {};
}

/**
 * Check if a cell is part of a clue
 */
export function cellBelongsToClue(
  clueMap: ClueMap,
  cell: CellCoordinate,
  number: number,
  direction: 'across' | 'down'
): boolean {
  const cells = getCellsForClue(clueMap, number, direction);
  return cells.some((c) => c.row === cell.row && c.col === cell.col);
}

/**
 * Get all cells in a word intersecting with a given cell
 */
export function getIntersectingCells(
  clueMap: ClueMap,
  cellMap: CellMap,
  row: number,
  col: number,
  direction: 'across' | 'down'
): CellCoordinate[] {
  const clues = getCluesForCell(cellMap, row, col);
  const clueNumber = clues[direction];

  if (!clueNumber) {
    return [];
  }

  return getCellsForClue(clueMap, clueNumber, direction);
}

/**
 * Normalize clue data from various formats
 */
export function normalizeClue(
  rawClue: any,
  direction: 'across' | 'down'
): Clue | null {
  try {
    return {
      number: Number(rawClue.number),
      direction,
      text: String(rawClue.text || rawClue.clue || ''),
      answer: String(rawClue.answer || ''),
      length: Number(rawClue.length || rawClue.answer?.length || 0),
      cells: Array.isArray(rawClue.cells)
        ? rawClue.cells.map((c: any) => ({
            row: Number(c.row),
            col: Number(c.col),
          }))
        : [],
    };
  } catch (error) {
    console.error('[cellClueMapping] Failed to normalize clue:', error);
    return null;
  }
}

/**
 * Normalize clue arrays
 */
export function normalizeClues(
  acrossClues: any[] = [],
  downClues: any[] = []
): { across: Clue[]; down: Clue[] } {
  const across = acrossClues
    .map((clue) => normalizeClue(clue, 'across'))
    .filter((clue): clue is Clue => clue !== null);

  const down = downClues
    .map((clue) => normalizeClue(clue, 'down'))
    .filter((clue): clue is Clue => clue !== null);

  return { across, down };
}

/**
 * Sort clues by number
 */
export function sortClues(clues: Clue[]): Clue[] {
  return [...clues].sort((a, b) => a.number - b.number);
}

/**
 * Find next clue in sequence
 */
export function getNextClue(
  clues: Clue[],
  currentNumber: number,
  wrap: boolean = false
): Clue | null {
  const sorted = sortClues(clues);
  const currentIndex = sorted.findIndex((c) => c.number === currentNumber);

  if (currentIndex === -1) {
    return sorted[0] || null;
  }

  const nextIndex = currentIndex + 1;

  if (nextIndex >= sorted.length) {
    return wrap ? sorted[0] : null;
  }

  return sorted[nextIndex];
}

/**
 * Find previous clue in sequence
 */
export function getPreviousClue(
  clues: Clue[],
  currentNumber: number,
  wrap: boolean = false
): Clue | null {
  const sorted = sortClues(clues);
  const currentIndex = sorted.findIndex((c) => c.number === currentNumber);

  if (currentIndex === -1) {
    return sorted[sorted.length - 1] || null;
  }

  const prevIndex = currentIndex - 1;

  if (prevIndex < 0) {
    return wrap ? sorted[sorted.length - 1] : null;
  }

  return sorted[prevIndex];
}

/**
 * Debounce helper for hover events
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

/**
 * Throttle helper for frequent events
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}
