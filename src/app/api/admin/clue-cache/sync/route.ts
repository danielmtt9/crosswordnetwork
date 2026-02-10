/**
 * API Route: POST /api/admin/clue-cache/sync
 * 
 * Trigger background sync for cache validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { backgroundSync } from '@/lib/clueCache/backgroundSync';
import { getAuthSession } from '@/lib/auth';

/**
 * Check if user is admin
 */
async function isAdmin(request: NextRequest): Promise<boolean> {
  const session = await getAuthSession();
  return session?.user?.role === 'ADMIN';
}

export async function POST(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Check if sync is already running
    if (backgroundSync.isActive()) {
      return NextResponse.json(
        { 
          error: 'Sync already in progress',
          lastSyncTime: backgroundSync.getLastSyncTime(),
        },
        { status: 409 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { 
      puzzleIds,
      batchSize = 10,
      maxAge = 90,
    } = body;

    let result;

    if (puzzleIds && Array.isArray(puzzleIds)) {
      // Sync specific puzzles
      result = await backgroundSync.syncPuzzles(puzzleIds);
    } else {
      // Sync all puzzles
      result = await backgroundSync.syncAll({
        batchSize,
        maxAge,
      });
    }

    // Cleanup old cache
    const cleanedInvalid = await backgroundSync.cleanupInvalidCache();
    const cleanedOld = await backgroundSync.cleanupOldCache(maxAge);

    return NextResponse.json({
      message: 'Sync completed successfully',
      result,
      cleanup: {
        invalidEntriesRemoved: cleanedInvalid,
        oldEntriesRemoved: cleanedOld,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[API /admin/clue-cache/sync] Error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * GET - Get sync status
 */
export async function GET(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      isRunning: backgroundSync.isActive(),
      lastSyncTime: backgroundSync.getLastSyncTime(),
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[API /admin/clue-cache/sync GET] Error:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
