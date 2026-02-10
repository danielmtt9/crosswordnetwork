/**
 * API Routes: Admin Clue Cache Management
 * 
 * GET /api/admin/clue-cache - Get cache statistics
 * POST /api/admin/clue-cache/bulk-refresh - Bulk refresh multiple puzzles
 * DELETE /api/admin/clue-cache - Clear all cache
 */

import { NextRequest, NextResponse } from 'next/server';
import { clueRepository } from '@/lib/clueCache/clueRepository';
import { getAuthSession } from '@/lib/auth';

/**
 * Check if user is admin
 */
async function isAdmin(request: NextRequest): Promise<boolean> {
  const session = await getAuthSession();
  return session?.user?.role === 'ADMIN';
}

/**
 * GET - Get cache statistics
 */
export async function GET(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const stats = await clueRepository.getCacheStats();

    return NextResponse.json({
      stats,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[API /admin/clue-cache] Error:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Clear all cache
 */
export async function DELETE(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    await clueRepository.clearAllCache();

    return NextResponse.json({
      message: 'All cache cleared successfully',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[API /admin/clue-cache DELETE] Error:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
