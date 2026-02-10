import { CellCoordinate } from './types';
import type { AnimationManager } from './useAnimationManager';

/**
 * Validation Manager
 * 
 * Client-side validation orchestration with:
 * - Debounced validation calls
 * - Batch validation
 * - Response caching
 * - Optimistic updates
 * - Animation triggers for feedback
 */

export interface ValidationCell {
  row: number;
  col: number;
  letter: string;
}

export interface ValidationResult {
  row: number;
  col: number;
  isCorrect: boolean;
}

export interface ValidationCache {
  [key: string]: {
    isCorrect: boolean;
    timestamp: number;
  };
}

export interface ValidationManagerOptions {
  puzzleId: number;
  debounceMs?: number;
  cacheTimeMs?: number;
  onValidated?: (results: ValidationResult[]) => void;
  onError?: (error: Error) => void;
  animationManager?: AnimationManager;
  enableAnimations?: boolean;
}

export class ValidationManager {
  private puzzleId: number;
  private debounceMs: number;
  private cacheTimeMs: number;
  private cache: ValidationCache;
  private pendingValidations: Map<string, ValidationCell>;
  private debounceTimer: NodeJS.Timeout | null;
  private onValidated?: (results: ValidationResult[]) => void;
  private onError?: (error: Error) => void;
  private animationManager?: AnimationManager;
  private enableAnimations: boolean;

  constructor(options: ValidationManagerOptions) {
    this.puzzleId = options.puzzleId;
    this.debounceMs = options.debounceMs || 300;
    this.cacheTimeMs = options.cacheTimeMs || 60000; // 1 minute
    this.cache = {};
    this.pendingValidations = new Map();
    this.debounceTimer = null;
    this.onValidated = options.onValidated;
    this.onError = options.onError;
    this.animationManager = options.animationManager;
    this.enableAnimations = options.enableAnimations !== false;
  }

  /**
   * Get cache key for a cell
   */
  private getCacheKey(row: number, col: number, letter: string): string {
    return `${row},${col}:${letter.toUpperCase()}`;
  }

  /**
   * Check if cached result is still valid
   */
  private isCacheValid(key: string): boolean {
    const cached = this.cache[key];
    if (!cached) return false;

    const age = Date.now() - cached.timestamp;
    return age < this.cacheTimeMs;
  }

  /**
   * Get cached result if available and valid
   */
  private getCached(row: number, col: number, letter: string): boolean | null {
    const key = this.getCacheKey(row, col, letter);
    if (this.isCacheValid(key)) {
      return this.cache[key].isCorrect;
    }
    return null;
  }

  /**
   * Store result in cache
   */
  private setCached(row: number, col: number, letter: string, isCorrect: boolean): void {
    const key = this.getCacheKey(row, col, letter);
    this.cache[key] = {
      isCorrect,
      timestamp: Date.now(),
    };
  }

  /**
   * Clear expired cache entries
   */
  private clearExpiredCache(): void {
    const now = Date.now();
    Object.keys(this.cache).forEach((key) => {
      if (now - this.cache[key].timestamp > this.cacheTimeMs) {
        delete this.cache[key];
      }
    });
  }

  /**
   * Add cell to pending validation queue
   */
  public queueValidation(cell: ValidationCell): void {
    // Check cache first
    const cached = this.getCached(cell.row, cell.col, cell.letter);
    if (cached !== null) {
      // Return cached result immediately
      if (this.onValidated) {
        this.onValidated([{
          row: cell.row,
          col: cell.col,
          isCorrect: cached,
        }]);
      }
      return;
    }

    // Add to pending queue
    const key = `${cell.row},${cell.col}`;
    this.pendingValidations.set(key, cell);

    // Debounce validation
    this.scheduleValidation();
  }

  /**
   * Schedule debounced validation
   */
  private scheduleValidation(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.executeValidation();
    }, this.debounceMs);
  }

  /**
   * Execute validation for all pending cells
   */
  private async executeValidation(): Promise<void> {
    if (this.pendingValidations.size === 0) {
      return;
    }

    // Get all pending cells
    const cells = Array.from(this.pendingValidations.values());
    this.pendingValidations.clear();

    try {
      // Call validation API
      const response = await fetch(`/api/puzzles/${this.puzzleId}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cells }),
      });

      if (!response.ok) {
        throw new Error(`Validation failed: ${response.statusText}`);
      }

      const data = await response.json();

      // Cache results
      data.cells.forEach((result: ValidationResult, index: number) => {
        const cell = cells[index];
        this.setCached(cell.row, cell.col, cell.letter, result.isCorrect);
      });

      // Clear expired cache periodically
      this.clearExpiredCache();

      // Trigger animations based on results
      if (this.enableAnimations && this.animationManager) {
        const correctCells: CellCoordinate[] = [];
        const incorrectCells: CellCoordinate[] = [];
        
        data.cells.forEach((result: ValidationResult) => {
          const cell = { row: result.row, col: result.col };
          if (result.isCorrect) {
            correctCells.push(cell);
          } else {
            incorrectCells.push(cell);
          }
        });
        
        if (correctCells.length > 0) {
          this.animationManager.triggerCorrect(correctCells);
        }
        if (incorrectCells.length > 0) {
          this.animationManager.triggerIncorrect(incorrectCells);
        }
      }
      
      // Notify callback
      if (this.onValidated) {
        this.onValidated(data.cells);
      }
    } catch (error) {
      console.error('[ValidationManager] Validation failed:', error);
      if (this.onError && error instanceof Error) {
        this.onError(error);
      }
    }
  }

  /**
   * Validate cells immediately (bypass debounce)
   */
  public async validateImmediate(cells: ValidationCell[]): Promise<ValidationResult[]> {
    try {
      const response = await fetch(`/api/puzzles/${this.puzzleId}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cells }),
      });

      if (!response.ok) {
        throw new Error(`Validation failed: ${response.statusText}`);
      }

      const data = await response.json();

      // Cache results
      data.cells.forEach((result: ValidationResult, index: number) => {
        const cell = cells[index];
        this.setCached(cell.row, cell.col, cell.letter, result.isCorrect);
      });
      
      // Trigger animations for immediate validation
      if (this.enableAnimations && this.animationManager) {
        const correctCells: CellCoordinate[] = [];
        const incorrectCells: CellCoordinate[] = [];
        
        data.cells.forEach((result: ValidationResult) => {
          const cell = { row: result.row, col: result.col };
          if (result.isCorrect) {
            correctCells.push(cell);
          } else {
            incorrectCells.push(cell);
          }
        });
        
        if (correctCells.length > 0) {
          this.animationManager.triggerCorrect(correctCells);
        }
        if (incorrectCells.length > 0) {
          this.animationManager.triggerIncorrect(incorrectCells);
        }
      }

      return data.cells;
    } catch (error) {
      console.error('[ValidationManager] Immediate validation failed:', error);
      throw error;
    }
  }

  /**
   * Clear all caches
   */
  public clearCache(): void {
    this.cache = {};
    this.pendingValidations.clear();
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): {
    size: number;
    hitRate: number;
  } {
    return {
      size: Object.keys(this.cache).length,
      hitRate: 0, // Could track this with additional counters
    };
  }

  /**
   * Destroy the manager and cleanup
   */
  public destroy(): void {
    this.clearCache();
  }
}

/**
 * React hook for validation manager
 */
export function useValidationManager(
  puzzleId: number,
  options?: Partial<ValidationManagerOptions>
): ValidationManager {
  // In a real implementation, this would use useMemo/useEffect
  // For now, return a basic instance
  return new ValidationManager({
    puzzleId,
    ...options,
  });
}
