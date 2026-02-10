/**
 * Iframe Highlight Handler
 * 
 * Handles highlight messages sent from the parent to the puzzle iframe.
 * Provides smooth visual feedback for clue hover interactions.
 * 
 * This module is designed to be injected into the puzzle iframe context.
 */

import { CellCoordinate } from './types';

export interface HighlightOptions {
  transitionDuration?: number;
  acrossColor?: string;
  downColor?: string;
  zIndex?: number;
}

const DEFAULT_OPTIONS: Required<HighlightOptions> = {
  transitionDuration: 200, // ms
  acrossColor: 'rgba(217, 119, 6, 0.32)', // amber-600 - match home
  downColor: 'rgba(234, 88, 12, 0.32)', // orange-600 - match home
  zIndex: 10,
};

/**
 * Highlight state management
 */
class HighlightManager {
  private highlightedCells: Set<string> = new Set();
  private currentDirection: 'across' | 'down' | null = null;
  private options: Required<HighlightOptions>;
  private animationFrameId: number | null = null;

  constructor(options: HighlightOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Get cell key for tracking
   */
  private getCellKey(row: number, col: number): string {
    return `${row},${col}`;
  }

  /**
   * Find cell element in the DOM
   */
  private findCellElement(row: number, col: number): HTMLElement | null {
    // Try common selectors used by crossword puzzle generators
    const selectors = [
      `[data-row="${row}"][data-col="${col}"]`,
      `[data-cell="${row}-${col}"]`,
      `#cell-${row}-${col}`,
      `.cell[data-position="${row},${col}"]`,
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector) as HTMLElement;
      if (element) return element;
    }

    // Fallback: search through all cells and check data attributes
    const cells = document.querySelectorAll('[data-row], .cell');
    for (const cell of Array.from(cells)) {
      const el = cell as HTMLElement;
      const cellRow = el.dataset.row || el.getAttribute('data-row');
      const cellCol = el.dataset.col || el.getAttribute('data-col');
      
      if (cellRow === String(row) && cellCol === String(col)) {
        return el;
      }
    }

    return null;
  }

  /**
   * Apply highlight to a cell
   */
  private highlightCell(
    element: HTMLElement,
    direction: 'across' | 'down',
    animate: boolean = true
  ): void {
    const color = direction === 'across' 
      ? this.options.acrossColor 
      : this.options.downColor;

    // Store original styles if not already stored
    if (!element.dataset.originalBg) {
      element.dataset.originalBg = element.style.backgroundColor || '';
      element.dataset.originalTransition = element.style.transition || '';
    }

    // Apply styles
    element.style.transition = animate 
      ? `background-color ${this.options.transitionDuration}ms ease-in-out`
      : 'none';
    element.style.backgroundColor = color;
    element.style.zIndex = String(this.options.zIndex);
    element.dataset.highlighted = direction;
  }

  /**
   * Remove highlight from a cell
   */
  private unhighlightCell(element: HTMLElement, animate: boolean = true): void {
    const originalBg = element.dataset.originalBg || '';
    const originalTransition = element.dataset.originalTransition || '';

    element.style.transition = animate
      ? `background-color ${this.options.transitionDuration}ms ease-in-out`
      : 'none';
    element.style.backgroundColor = originalBg;
    element.style.zIndex = '';
    
    delete element.dataset.highlighted;
    
    // Clean up stored originals after transition
    if (animate) {
      setTimeout(() => {
        element.style.transition = originalTransition;
        delete element.dataset.originalBg;
        delete element.dataset.originalTransition;
      }, this.options.transitionDuration);
    } else {
      element.style.transition = originalTransition;
      delete element.dataset.originalBg;
      delete element.dataset.originalTransition;
    }
  }

  /**
   * Highlight cells for a clue
   */
  public highlightCells(
    cells: CellCoordinate[],
    direction: 'across' | 'down'
  ): void {
    // Cancel any pending animation frame
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }

    // Use requestAnimationFrame for smooth updates
    this.animationFrameId = requestAnimationFrame(() => {
      // Clear previous highlights if direction changed
      if (this.currentDirection !== direction) {
        this.clearHighlights();
      }

      this.currentDirection = direction;
      const newHighlightedCells = new Set<string>();

      // Apply highlights
      cells.forEach((cell) => {
        const key = this.getCellKey(cell.row, cell.col);
        newHighlightedCells.add(key);

        const element = this.findCellElement(cell.row, cell.col);
        if (element) {
          // Only animate if not already highlighted
          const alreadyHighlighted = this.highlightedCells.has(key);
          this.highlightCell(element, direction, !alreadyHighlighted);
        }
      });

      // Remove highlights from cells no longer in the set
      this.highlightedCells.forEach((key) => {
        if (!newHighlightedCells.has(key)) {
          const [row, col] = key.split(',').map(Number);
          const element = this.findCellElement(row, col);
          if (element) {
            this.unhighlightCell(element);
          }
        }
      });

      this.highlightedCells = newHighlightedCells;
      this.animationFrameId = null;
    });
  }

  /**
   * Clear all highlights
   */
  public clearHighlights(): void {
    // Cancel any pending animation frame
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }

    this.animationFrameId = requestAnimationFrame(() => {
      this.highlightedCells.forEach((key) => {
        const [row, col] = key.split(',').map(Number);
        const element = this.findCellElement(row, col);
        if (element) {
          this.unhighlightCell(element);
        }
      });

      this.highlightedCells.clear();
      this.currentDirection = null;
      this.animationFrameId = null;
    });
  }

  /**
   * Update highlight options
   */
  public updateOptions(options: Partial<HighlightOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Cleanup
   */
  public destroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.clearHighlights();
  }
}

/**
 * Initialize highlight handler in iframe context
 */
export function initializeHighlightHandler(
  options: HighlightOptions = {}
): HighlightManager {
  const manager = new HighlightManager(options);

  // Log initialization
  console.log('[HighlightHandler] Initialized in iframe');

  return manager;
}

/**
 * Apply highlight styles via CSS injection
 * This ensures consistent styling even if direct DOM manipulation fails
 */
export function injectHighlightStyles(doc: Document): void {
  const styleId = 'crossword-highlight-styles';
  
  // Remove existing styles if present
  const existing = doc.getElementById(styleId);
  if (existing) {
    existing.remove();
  }

  const style = doc.createElement('style');
  style.id = styleId;
  style.textContent = `
    /* Crossword cell highlight styles */
    [data-highlighted] {
      position: relative;
      isolation: isolate;
    }

    [data-highlighted="across"] {
      background-color: var(--cw-highlight-across, rgba(59, 130, 246, 0.15)) !important;
    }

    [data-highlighted="down"] {
      background-color: var(--cw-highlight-down, rgba(168, 85, 247, 0.15)) !important;
    }

    /* Smooth transitions */
    .cell,
    [data-row][data-col],
    [data-cell] {
      transition: background-color 200ms ease-in-out;
    }

    /* Focus ring for accessibility */
    [data-highlighted]:focus-visible {
      outline: 2px solid var(--cw-focus-ring, #2563eb);
      outline-offset: 2px;
    }

    /* Reduce motion for accessibility */
    @media (prefers-reduced-motion: reduce) {
      .cell,
      [data-row][data-col],
      [data-cell],
      [data-highlighted] {
        transition: none !important;
      }
    }
  `;

  doc.head.appendChild(style);
  console.log('[HighlightHandler] Styles injected');
}
