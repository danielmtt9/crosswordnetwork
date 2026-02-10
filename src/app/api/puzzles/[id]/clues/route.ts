import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { parseCluesFromHTML } from '@/lib/clueCache/clueParser';
import fs from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();

function isValidCachedClues(
  clues: any,
  gridWidth: number | null,
  gridHeight: number | null
): boolean {
  if (!clues || typeof clues !== 'object') return false;
  if (!Array.isArray(clues.across) || !Array.isArray(clues.down)) return false;

  // Basic shape checks
  for (const arr of [clues.across, clues.down]) {
    for (const c of arr) {
      if (!c || typeof c !== 'object') return false;
      if (typeof c.number !== 'number') return false;
      if (!Array.isArray(c.cells)) return false;
      // Must have at least 1 cell to highlight/focus.
      if (c.cells.length === 0) return false;

      // Validate bounds if we know them.
      if (typeof gridWidth === 'number' && typeof gridHeight === 'number') {
        for (const cell of c.cells) {
          if (!cell || typeof cell !== 'object') return false;
          if (typeof cell.row !== 'number' || typeof cell.col !== 'number') return false;
          if (cell.row < 0 || cell.col < 0) return false;
          if (cell.row >= gridHeight || cell.col >= gridWidth) {
            return false;
          }
        }
      }
    }
  }

  return true;
}

/**
 * GET /api/puzzles/[id]/clues
 * 
 * Fetch clues for a puzzle. Tries database first, falls back to parsing HTML file.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const puzzleId = parseInt(resolvedParams.id);

    if (isNaN(puzzleId)) {
      return NextResponse.json(
        { error: 'Invalid puzzle ID' },
        { status: 400 }
      );
    }

    // Check if puzzle exists and has cached clues
    const puzzle = await prisma.puzzle.findUnique({
      where: { id: puzzleId },
    });

    if (!puzzle) {
      return NextResponse.json(
        { error: 'Puzzle not found' },
        { status: 404 }
      );
    }

    // Try to get clues from database first (but validate, because older cached
    // clues may have incorrect direction splits / out-of-bounds cells).
    if (puzzle.clues) {
      try {
        const clues = JSON.parse(puzzle.clues as string);
        
        if (!isValidCachedClues(clues, puzzle.grid_width ?? null, puzzle.grid_height ?? null)) {
          console.warn(`[API] Cached clues failed validation for puzzle ${puzzleId}, reparsing from file`);
          throw new Error('Cached clues invalid');
        }

        console.log(`[API] Serving clues from database for puzzle ${puzzleId}`);
        
        return NextResponse.json({
          clues,
          sourceInfo: {
            source: 'cache',
            cacheHit: true,
            cachedAt: puzzle.updatedAt,
          },
        });
      } catch (parseError) {
        console.error('[API] Failed to parse cached clues:', parseError);
        // Fall through to file parsing
      }
    }

    // Fallback: Parse from HTML file
    console.log(`[API] No cached clues found, parsing from file for puzzle ${puzzleId}`);
    
    try {
      // `puzzle.file_path` may be stored as either:
      // - "public/puzzles/..." (current upload implementation)
      // - "puzzles/..." (legacy/alternate)
      // Normalize to an absolute FS path.
      const storedPath = (puzzle.file_path || '').replace(/^\/+/, '');
      const filePath = storedPath.startsWith('public/')
        ? path.join(process.cwd(), storedPath)
        : path.join(process.cwd(), 'public', storedPath);
      const htmlContent = await fs.readFile(filePath, 'utf-8');
      
      const parseResult = await parseCluesFromHTML(htmlContent);
      
      if (!parseResult.success || !parseResult.clues) {
        throw new Error(parseResult.error || 'Failed to parse clues');
      }
      
      const parsedClues = parseResult.clues;
      const parseTime = parseResult.parseTimeMs;
      
      // Cache the parsed clues in database
      await prisma.puzzle.update({
        where: { id: puzzleId },
        data: {
          clues: JSON.stringify(parsedClues),
        },
      });
      
      console.log(`[API] Parsed and cached clues for puzzle ${puzzleId} (${parseTime}ms)`);
      
      return NextResponse.json({
        clues: parsedClues,
        sourceInfo: {
          source: 'file',
          cacheHit: false,
          parseTimeMs: parseTime,
        },
      });
    } catch (fileError) {
      console.error('[API] Failed to parse clues from file:', fileError);
      
      return NextResponse.json(
        { 
          error: 'Failed to load clues',
          clues: { across: [], down: [], metadata: {} },
          sourceInfo: {
            source: 'error',
            cacheHit: false,
          },
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('[API] Error fetching clues:', error);
    return NextResponse.json(
      { error: 'Failed to fetch clues' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/puzzles/[id]/clues
 * 
 * Persist clues to the database for a puzzle.
 * Called automatically when clues are extracted from iframe as fallback.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const puzzleId = parseInt(resolvedParams.id);

    if (isNaN(puzzleId)) {
      return NextResponse.json(
        { error: 'Invalid puzzle ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { clues } = body;

    if (!clues || typeof clues !== 'object') {
      return NextResponse.json(
        { error: 'Invalid clues format' },
        { status: 400 }
      );
    }

    // Validate clues structure
    if (!Array.isArray(clues.across) || !Array.isArray(clues.down)) {
      return NextResponse.json(
        { error: 'Clues must have across and down arrays' },
        { status: 400 }
      );
    }

    // Check if puzzle exists
    const puzzle = await prisma.puzzle.findUnique({
      where: { id: puzzleId },
    });

    if (!puzzle) {
      return NextResponse.json(
        { error: 'Puzzle not found' },
        { status: 404 }
      );
    }

    // Update puzzle with clues
    await prisma.puzzle.update({
      where: { id: puzzleId },
      data: {
        clues: JSON.stringify(clues),
      },
    });

    console.log(`[API] Persisted clues for puzzle ${puzzleId}: ${clues.across.length} across, ${clues.down.length} down`);

    return NextResponse.json({
      success: true,
      message: 'Clues persisted successfully',
      stats: {
        acrossCount: clues.across.length,
        downCount: clues.down.length,
      },
    });

  } catch (error) {
    console.error('[API] Error persisting clues:', error);
    return NextResponse.json(
      { error: 'Failed to persist clues' },
      { status: 500 }
    );
  }
}
