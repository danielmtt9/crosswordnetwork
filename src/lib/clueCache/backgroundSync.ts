/**
 * Background Sync Service
 * 
 * Periodically validates cached clues against source files
 * and refreshes stale entries automatically.
 */

import { prisma } from '@/lib/prisma';
import { clueRepository } from './clueRepository';
import { generatePuzzleWordlistHash } from './fileHash';

export interface SyncResult {
  totalChecked: number;
  staleFound: number;
  refreshed: number;
  failed: number;
  errors: Array<{ puzzleId: number; error: string }>;
  duration: number;
}

export interface SyncOptions {
  batchSize?: number;
  maxAge?: number; // Max age in days before forcing refresh
  onProgress?: (progress: { current: number; total: number }) => void;
}

/**
 * Background Sync Service Class
 */
export class BackgroundSyncService {
  private isRunning = false;
  private lastSyncTime: Date | null = null;

  /**
   * Check if sync is currently running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Get last sync time
   */
  getLastSyncTime(): Date | null {
    return this.lastSyncTime;
  }

  /**
   * Validate all puzzle caches and refresh stale entries
   */
  async syncAll(options: SyncOptions = {}): Promise<SyncResult> {
    if (this.isRunning) {
      throw new Error('Sync already in progress');
    }

    this.isRunning = true;
    const startTime = Date.now();

    const {
      batchSize = 10,
      maxAge = 90, // 90 days default
      onProgress,
    } = options;

    const result: SyncResult = {
      totalChecked: 0,
      staleFound: 0,
      refreshed: 0,
      failed: 0,
      errors: [],
      duration: 0,
    };

    try {
      // Get all active puzzles
      const puzzles = await prisma.puzzle.findMany({
        where: { is_active: true },
        select: { id: true, file_path: true },
      });

      result.totalChecked = puzzles.length;

      // Process in batches
      for (let i = 0; i < puzzles.length; i += batchSize) {
        const batch = puzzles.slice(i, i + batchSize);

        await Promise.all(
          batch.map(async (puzzle) => {
            try {
              const isStale = await this.checkIfStale(puzzle.id, puzzle.file_path, maxAge);

              if (isStale) {
                result.staleFound++;
                
                const refreshResult = await clueRepository.refreshClues(puzzle.id);
                
                if (refreshResult.error) {
                  result.failed++;
                  result.errors.push({
                    puzzleId: puzzle.id,
                    error: refreshResult.error,
                  });
                } else {
                  result.refreshed++;
                }
              }
            } catch (error) {
              result.failed++;
              result.errors.push({
                puzzleId: puzzle.id,
                error: error instanceof Error ? error.message : 'Unknown error',
              });
            }
          })
        );

        if (onProgress) {
          onProgress({
            current: Math.min(i + batchSize, puzzles.length),
            total: puzzles.length,
          });
        }
      }

      result.duration = Date.now() - startTime;
      this.lastSyncTime = new Date();

      // Log sync completion
      await this.logSync(result);

      return result;

    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Check if cache is stale for a puzzle
   */
  private async checkIfStale(
    puzzleId: number,
    filePath: string,
    maxAgeDays: number
  ): Promise<boolean> {
    try {
      // Get current file hash
      const currentHash = await generatePuzzleWordlistHash({ file_path: filePath });

      // Check if cache exists with matching hash
      const cache = await prisma.puzzleClueCache.findFirst({
        where: {
          puzzleId,
          fileHash: currentHash,
          isValid: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!cache) {
        // No cache or hash mismatch - stale
        return true;
      }

      // Check age
      const ageInDays = (Date.now() - cache.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      if (ageInDays > maxAgeDays) {
        return true;
      }

      return false;

    } catch (error) {
      console.error(`[BackgroundSync] Error checking staleness for puzzle ${puzzleId}:`, error);
      return false;
    }
  }

  /**
   * Sync specific puzzles by ID
   */
  async syncPuzzles(puzzleIds: number[]): Promise<SyncResult> {
    if (this.isRunning) {
      throw new Error('Sync already in progress');
    }

    this.isRunning = true;
    const startTime = Date.now();

    const result: SyncResult = {
      totalChecked: puzzleIds.length,
      staleFound: 0,
      refreshed: 0,
      failed: 0,
      errors: [],
      duration: 0,
    };

    try {
      const puzzles = await prisma.puzzle.findMany({
        where: {
          id: { in: puzzleIds },
          is_active: true,
        },
        select: { id: true, file_path: true },
      });

      for (const puzzle of puzzles) {
        try {
          const isStale = await this.checkIfStale(puzzle.id, puzzle.file_path, 90);

          if (isStale) {
            result.staleFound++;
            
            const refreshResult = await clueRepository.refreshClues(puzzle.id);
            
            if (refreshResult.error) {
              result.failed++;
              result.errors.push({
                puzzleId: puzzle.id,
                error: refreshResult.error,
              });
            } else {
              result.refreshed++;
            }
          }
        } catch (error) {
          result.failed++;
          result.errors.push({
            puzzleId: puzzle.id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      result.duration = Date.now() - startTime;
      this.lastSyncTime = new Date();

      await this.logSync(result);

      return result;

    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Clean up invalid cache entries
   */
  async cleanupInvalidCache(): Promise<number> {
    const result = await prisma.puzzleClueCache.deleteMany({
      where: { isValid: false },
    });

    console.log(`[BackgroundSync] Cleaned up ${result.count} invalid cache entries`);

    return result.count;
  }

  /**
   * Clean up old cache entries
   */
  async cleanupOldCache(maxAgeDays: number = 90): Promise<number> {
    const cutoffDate = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000);

    const result = await prisma.puzzleClueCache.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    });

    console.log(`[BackgroundSync] Cleaned up ${result.count} old cache entries`);

    return result.count;
  }

  /**
   * Log sync result
   */
  private async logSync(result: SyncResult): Promise<void> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const existing = await prisma.clueCacheStats.findUnique({
        where: { date: today },
      });

      if (existing) {
        await prisma.clueCacheStats.update({
          where: { date: today },
          data: {
            totalRefreshes: { increment: result.refreshed },
            errors: { increment: result.failed },
            updatedAt: new Date(),
          },
        });
      }

      console.log(`[BackgroundSync] Sync completed:`, {
        checked: result.totalChecked,
        stale: result.staleFound,
        refreshed: result.refreshed,
        failed: result.failed,
        duration: `${result.duration}ms`,
      });

    } catch (error) {
      console.error('[BackgroundSync] Failed to log sync:', error);
    }
  }
}

/**
 * Singleton instance
 */
export const backgroundSync = new BackgroundSyncService();

/**
 * Interval ID for scheduled sync (stored for cleanup)
 */
let syncIntervalId: NodeJS.Timeout | null = null;

/**
 * Schedule periodic sync (call from cron job or scheduler)
 * Returns cleanup function to stop the interval
 */
export async function scheduleSync(intervalHours: number = 24): Promise<() => void> {
  console.log(`[BackgroundSync] Scheduling sync every ${intervalHours} hours`);

  const runSync = async () => {
    try {
      console.log('[BackgroundSync] Starting scheduled sync...');
      
      const result = await backgroundSync.syncAll({
        batchSize: 20,
        maxAge: 90,
        onProgress: (progress) => {
          console.log(`[BackgroundSync] Progress: ${progress.current}/${progress.total}`);
        },
      });

      console.log('[BackgroundSync] Sync completed:', result);

      // Cleanup old cache
      await backgroundSync.cleanupOldCache(90);
      await backgroundSync.cleanupInvalidCache();

    } catch (error) {
      console.error('[BackgroundSync] Sync failed:', error);
    }
  };

  // Run immediately on startup
  await runSync();

  // Schedule recurring sync and store interval ID
  syncIntervalId = setInterval(runSync, intervalHours * 60 * 60 * 1000);

  // Return cleanup function
  return () => {
    if (syncIntervalId !== null) {
      clearInterval(syncIntervalId);
      syncIntervalId = null;
      console.log('[BackgroundSync] Scheduled sync stopped');
    }
  };
}

/**
 * Stop scheduled sync if running
 */
export function stopScheduledSync(): void {
  if (syncIntervalId !== null) {
    clearInterval(syncIntervalId);
    syncIntervalId = null;
    console.log('[BackgroundSync] Scheduled sync stopped');
  }
}
