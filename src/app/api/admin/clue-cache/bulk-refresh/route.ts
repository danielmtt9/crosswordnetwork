/**
 * API Route: POST /api/admin/clue-cache/bulk-refresh
 * 
 * Bulk refresh clues for multiple puzzles
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

export async function POST(request: NextRequest) {
  try {
    if (!(await isAdmin(request))) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { puzzleIds } = body;

    if (!Array.isArray(puzzleIds) || puzzleIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid puzzleIds array' },
        { status: 400 }
      );
    }

    // Validate all are numbers
    if (!puzzleIds.every((id) => typeof id === 'number')) {
      return NextResponse.json(
        { error: 'All puzzle IDs must be numbers' },
        { status: 400 }
      );
    }

    const results = await clueRepository.bulkRefresh(puzzleIds);

    // Count successes and failures
    let successes = 0;
    let failures = 0;
    const errors: Array<{ puzzleId: number; error: string }> = [];

    results.forEach((result, puzzleId) => {
      if (result.error) {
        failures++;
        errors.push({ puzzleId, error: result.error });
      } else {
        successes++;
      }
    });

    return NextResponse.json({
      message: `Refreshed ${successes} puzzles, ${failures} failed`,
      successes,
      failures,
      errors,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[API /admin/clue-cache/bulk-refresh] Error:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
