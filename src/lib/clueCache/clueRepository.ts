/**
 * Clue Repository
 * 
 * Database-first clue caching with hash-based versioning.
 * Implements the hybrid strategy: DB → Iframe → Error
 */

import { prisma } from '@/lib/prisma';
import { 
  parseCluesFromFile, 
  serializeClues, 
  deserializeClues,
  validateClues,
  type ParsedClues,
  type ParsedClue 
} from './clueParser';
import { 
  generatePuzzleWordlistHash,
  getPuzzleFilePath 
} from './fileHash';

export interface ClueSourceInfo {
  source: 'cache' | 'iframe' | 'error';
  cacheHit: boolean;
  parseTimeMs?: number;
  cachedAt?: Date;
}

export interface ClueResult {
  clues: ParsedClues | null;
  sourceInfo: ClueSourceInfo;
  error?: string;
}

export interface CacheStats {
  totalCached: number;
  validCached: number;
  invalidCached: number;
  avgParseTime: number;
}

/**
 * Clue Repository Class
 */
export class ClueRepository {
  /**
   * Get clues with database-first strategy
   * 
   * Flow: Check DB → Parse iframe → Save to DB → Return
   */
  async getClues(puzzleId: number): Promise<ClueResult> {
    const startTime = Date.now();
    
    try {
      // Step 1: Get puzzle from database
      const puzzle = await prisma.puzzle.findUnique({
        where: { id: puzzleId },
        select: { id: true, file_path: true },
      });
      
      if (!puzzle) {
        return {
          clues: null,
          sourceInfo: {
            source: 'error',
            cacheHit: false,
          },
          error: 'Puzzle not found',
        };
      }
      
      // Step 2: Calculate current file hash
      const fileHash = await generatePuzzleWordlistHash(puzzle);
      
      // Step 3: Check database cache
      const cached = await this.getCachedClues(puzzleId, fileHash);
      
      if (cached) {
        // Cache hit!
        await this.logCacheHit(puzzleId);
        
        return {
          clues: {
            across: deserializeClues(cached.acrossClues),
            down: deserializeClues(cached.downClues),
            metadata: cached.metadata ? JSON.parse(cached.metadata) : undefined,
          },
          sourceInfo: {
            source: 'cache',
            cacheHit: true,
            parseTimeMs: cached.parseTimeMs ?? undefined,
            cachedAt: cached.createdAt,
          },
        };
      }
      
      // Cache miss - parse iframe
      await this.logCacheMiss(puzzleId);
      
      // Step 4: Parse clues from file
      const filePath = getPuzzleFilePath(puzzle);
      const parseResult = await parseCluesFromFile(filePath);
      
      if (!parseResult.success || !parseResult.clues) {
        await this.logParseError(puzzleId, parseResult.error || 'Unknown error');
        
        return {
          clues: null,
          sourceInfo: {
            source: 'error',
            cacheHit: false,
            parseTimeMs: parseResult.parseTimeMs,
          },
          error: parseResult.error,
        };
      }
      
      // Step 5: Validate clues
      const validation = validateClues(parseResult.clues);
      
      if (!validation.valid) {
        console.warn('[ClueRepository] Validation warnings:', validation.errors);
      }
      
      // Step 6: Save to database asynchronously
      this.saveCluesAsync(
        puzzleId,
        fileHash,
        parseResult.clues,
        parseResult.parseTimeMs,
        validation.valid
      );
      
      await this.logIframeParse(puzzleId, parseResult.parseTimeMs);
      
      return {
        clues: parseResult.clues,
        sourceInfo: {
          source: 'iframe',
          cacheHit: false,
          parseTimeMs: parseResult.parseTimeMs,
        },
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[ClueRepository] Error getting clues:', error);
      
      await this.logError(puzzleId);
      
      return {
        clues: null,
        sourceInfo: {
          source: 'error',
          cacheHit: false,
        },
        error: errorMessage,
      };
    }
  }
  
  /**
   * Get cached clues if valid
   */
  private async getCachedClues(puzzleId: number, fileHash: string) {
    return prisma.puzzleClueCache.findFirst({
      where: {
        puzzleId,
        fileHash,
        isValid: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
  
  /**
   * Save clues to database (async - no await)
   */
  private saveCluesAsync(
    puzzleId: number,
    fileHash: string,
    clues: ParsedClues,
    parseTimeMs: number,
    isValid: boolean
  ): void {
    // Fire and forget - don't block the response
    prisma.puzzleClueCache.create({
      data: {
        puzzleId,
        fileHash,
        acrossClues: serializeClues(clues.across),
        downClues: serializeClues(clues.down),
        metadata: clues.metadata ? JSON.stringify(clues.metadata) : null,
        sourceType: 'iframe',
        parseTimeMs,
        isValid,
        validatedAt: new Date(),
      },
    })
    .then(() => {
      console.log(`[ClueRepository] Saved clues for puzzle ${puzzleId} to cache`);
    })
    .catch((error) => {
      console.error(`[ClueRepository] Failed to save clues for puzzle ${puzzleId}:`, error);
    });
  }
  
  /**
   * Force refresh clues from iframe
   */
  async refreshClues(puzzleId: number): Promise<ClueResult> {
    try {
      const puzzle = await prisma.puzzle.findUnique({
        where: { id: puzzleId },
        select: { id: true, file_path: true },
      });
      
      if (!puzzle) {
        return {
          clues: null,
          sourceInfo: { source: 'error', cacheHit: false },
          error: 'Puzzle not found',
        };
      }
      
      // Parse from file
      const filePath = getPuzzleFilePath(puzzle);
      const parseResult = await parseCluesFromFile(filePath);
      
      if (!parseResult.success || !parseResult.clues) {
        return {
          clues: null,
          sourceInfo: {
            source: 'error',
            cacheHit: false,
            parseTimeMs: parseResult.parseTimeMs,
          },
          error: parseResult.error,
        };
      }
      
      // Generate hash
      const fileHash = await generatePuzzleWordlistHash(puzzle);
      
      // Save to database (synchronously this time)
      await prisma.puzzleClueCache.upsert({
        where: {
          puzzleId_fileHash: {
            puzzleId,
            fileHash,
          },
        },
        update: {
          acrossClues: serializeClues(parseResult.clues.across),
          downClues: serializeClues(parseResult.clues.down),
          metadata: parseResult.clues.metadata ? JSON.stringify(parseResult.clues.metadata) : null,
          parseTimeMs: parseResult.parseTimeMs,
          isValid: true,
          validatedAt: new Date(),
          updatedAt: new Date(),
        },
        create: {
          puzzleId,
          fileHash,
          acrossClues: serializeClues(parseResult.clues.across),
          downClues: serializeClues(parseResult.clues.down),
          metadata: parseResult.clues.metadata ? JSON.stringify(parseResult.clues.metadata) : null,
          sourceType: 'iframe',
          parseTimeMs: parseResult.parseTimeMs,
          isValid: true,
          validatedAt: new Date(),
        },
      });
      
      await this.logRefresh(puzzleId);
      
      return {
        clues: parseResult.clues,
        sourceInfo: {
          source: 'iframe',
          cacheHit: false,
          parseTimeMs: parseResult.parseTimeMs,
        },
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[ClueRepository] Error refreshing clues:', error);
      
      return {
        clues: null,
        sourceInfo: { source: 'error', cacheHit: false },
        error: errorMessage,
      };
    }
  }
  
  /**
   * Invalidate cache for a puzzle
   */
  async invalidateCache(puzzleId: number): Promise<void> {
    await prisma.puzzleClueCache.updateMany({
      where: { puzzleId },
      data: { isValid: false },
    });
    
    console.log(`[ClueRepository] Invalidated cache for puzzle ${puzzleId}`);
  }
  
  /**
   * Check if puzzle has valid cache
   */
  async hasValidCache(puzzleId: number): Promise<boolean> {
    const count = await prisma.puzzleClueCache.count({
      where: {
        puzzleId,
        isValid: true,
      },
    });
    
    return count > 0;
  }
  
  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<CacheStats> {
    const [total, valid, invalid, avgTime] = await Promise.all([
      prisma.puzzleClueCache.count(),
      prisma.puzzleClueCache.count({ where: { isValid: true } }),
      prisma.puzzleClueCache.count({ where: { isValid: false } }),
      prisma.puzzleClueCache.aggregate({
        _avg: { parseTimeMs: true },
        where: { parseTimeMs: { not: null } },
      }),
    ]);
    
    return {
      totalCached: total,
      validCached: valid,
      invalidCached: invalid,
      avgParseTime: avgTime._avg.parseTimeMs || 0,
    };
  }
  
  /**
   * Bulk refresh clues for multiple puzzles
   */
  async bulkRefresh(puzzleIds: number[]): Promise<Map<number, ClueResult>> {
    const results = new Map<number, ClueResult>();
    
    for (const puzzleId of puzzleIds) {
      const result = await this.refreshClues(puzzleId);
      results.set(puzzleId, result);
    }
    
    return results;
  }
  
  /**
   * Clear all cache
   */
  async clearAllCache(): Promise<void> {
    await prisma.puzzleClueCache.deleteMany({});
    console.log('[ClueRepository] Cleared all cache');
  }
  
  // === Logging Methods ===
  
  private async logCacheHit(puzzleId: number): Promise<void> {
    await this.updateDailyStats({ cacheHits: 1 });
    await this.logAction(puzzleId, 'CACHE_HIT', 'cache', true);
  }
  
  private async logCacheMiss(puzzleId: number): Promise<void> {
    await this.updateDailyStats({ cacheMisses: 1 });
    await this.logAction(puzzleId, 'CACHE_MISS', 'cache', true);
  }
  
  private async logIframeParse(puzzleId: number, durationMs: number): Promise<void> {
    await this.updateDailyStats({ iframeParses: 1 });
    await this.logAction(puzzleId, 'IFRAME_PARSE', 'iframe', true, durationMs);
  }
  
  private async logParseError(puzzleId: number, errorMessage: string): Promise<void> {
    await this.updateDailyStats({ errors: 1 });
    await this.logAction(puzzleId, 'PARSE_ERROR', 'iframe', false, undefined, errorMessage);
  }
  
  private async logRefresh(puzzleId: number): Promise<void> {
    await this.updateDailyStats({ totalRefreshes: 1 });
    await this.logAction(puzzleId, 'REFRESH', 'iframe', true);
  }
  
  private async logError(puzzleId: number): Promise<void> {
    await this.updateDailyStats({ errors: 1 });
    await this.logAction(puzzleId, 'ERROR', 'unknown', false);
  }
  
  private async logAction(
    puzzleId: number,
    action: string,
    source: string,
    success: boolean,
    durationMs?: number,
    errorMessage?: string
  ): Promise<void> {
    try {
      await prisma.clueParseLog.create({
        data: {
          puzzleId,
          action,
          source,
          success,
          durationMs: durationMs ?? null,
          errorMessage: errorMessage ?? null,
        },
      });
    } catch (error) {
      console.error('[ClueRepository] Failed to log action:', error);
    }
  }
  
  private async updateDailyStats(updates: {
    cacheHits?: number;
    cacheMisses?: number;
    iframeParses?: number;
    totalRefreshes?: number;
    errors?: number;
  }): Promise<void> {
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
            cacheHits: { increment: updates.cacheHits || 0 },
            cacheMisses: { increment: updates.cacheMisses || 0 },
            iframeParses: { increment: updates.iframeParses || 0 },
            totalRefreshes: { increment: updates.totalRefreshes || 0 },
            errors: { increment: updates.errors || 0 },
            updatedAt: new Date(),
          },
        });
      } else {
        await prisma.clueCacheStats.create({
          data: {
            date: today,
            cacheHits: updates.cacheHits || 0,
            cacheMisses: updates.cacheMisses || 0,
            iframeParses: updates.iframeParses || 0,
            totalRefreshes: updates.totalRefreshes || 0,
            errors: updates.errors || 0,
          },
        });
      }
    } catch (error) {
      console.error('[ClueRepository] Failed to update daily stats:', error);
    }
  }
}

/**
 * Singleton instance
 */
export const clueRepository = new ClueRepository();
