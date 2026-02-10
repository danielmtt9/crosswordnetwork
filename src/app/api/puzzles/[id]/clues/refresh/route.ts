/**
 * API Route: POST /api/puzzles/[puzzleId]/clues/refresh
 * 
 * Force refresh clues from iframe (bypasses cache)
 */

import { NextRequest, NextResponse } from 'next/server';
import { clueRepository } from '@/lib/clueCache/clueRepository';

export async function POST(
  request: NextRequest,
  { params }: { params: { puzzleId: string } }
) {
  try {
    const puzzleId = parseInt(params.puzzleId);

    if (isNaN(puzzleId)) {
      return NextResponse.json(
        { error: 'Invalid puzzle ID' },
        { status: 400 }
      );
    }

    const result = await clueRepository.refreshClues(puzzleId);

    if (result.error) {
      return NextResponse.json(
        { error: result.error, sourceInfo: result.sourceInfo },
        { status: 500 }
      );
    }

    return NextResponse.json({
      clues: result.clues,
      sourceInfo: result.sourceInfo,
      message: 'Clues refreshed successfully',
    });

  } catch (error) {
    console.error('[API /clues/refresh] Error:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
