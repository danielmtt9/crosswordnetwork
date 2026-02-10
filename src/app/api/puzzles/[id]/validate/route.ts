import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

import { getAuthSession } from "@/lib/auth";

/**
 * Real-time Puzzle Validation API
 * 
 * Features:
 * - Per-cell validation
 * - Per-word validation
 * - In-memory caching for sub-100ms responses
 * - Returns correctness flags for immediate visual feedback
 */

// In-memory cache for puzzle solutions (cleared on server restart)
const solutionCache = new Map<number, Map<string, string>>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

interface ValidationRequest {
  cells: Array<{
    row: number;
    col: number;
    letter: string;
  }>;
  wordId?: string;
}

interface ValidationResponse {
  cells: Array<{
    row: number;
    col: number;
    isCorrect: boolean;
  }>;
  word?: {
    isComplete: boolean;
    isCorrect: boolean;
  };
}

/**
 * Get puzzle solution from cache or database
 */
async function getPuzzleSolution(puzzleId: number): Promise<Map<string, string> | null> {
  // Check cache first
  if (solutionCache.has(puzzleId)) {
    return solutionCache.get(puzzleId)!;
  }

  try {
    // Fetch from database
    const puzzle = await prisma.puzzle.findUnique({
      where: { id: puzzleId, is_active: true },
      select: { clues: true },
    });

    if (!puzzle || !puzzle.clues) {
      return null;
    }

    // Parse clues JSON
    const cluesData = typeof puzzle.clues === 'string' 
      ? JSON.parse(puzzle.clues) 
      : puzzle.clues;

    // Build solution map: "row,col" -> "letter"
    const solutionMap = new Map<string, string>();

    // Process across clues
    if (Array.isArray(cluesData.across)) {
      cluesData.across.forEach((clue: any) => {
        if (clue.cells && clue.answer) {
          const answer = String(clue.answer).toUpperCase();
          clue.cells.forEach((cell: any, index: number) => {
            const key = `${cell.row},${cell.col}`;
            solutionMap.set(key, answer[index] || '');
          });
        }
      });
    }

    // Process down clues
    if (Array.isArray(cluesData.down)) {
      cluesData.down.forEach((clue: any) => {
        if (clue.cells && clue.answer) {
          const answer = String(clue.answer).toUpperCase();
          clue.cells.forEach((cell: any, index: number) => {
            const key = `${cell.row},${cell.col}`;
            // Only set if not already set by across clue
            if (!solutionMap.has(key)) {
              solutionMap.set(key, answer[index] || '');
            }
          });
        }
      });
    }

    // Cache the solution
    solutionCache.set(puzzleId, solutionMap);

    // Set cache expiry
    setTimeout(() => {
      solutionCache.delete(puzzleId);
    }, CACHE_TTL);

    return solutionMap;
  } catch (error) {
    console.error('[Validation] Failed to get puzzle solution:', error);
    return null;
  }
}

/**
 * Validate cells against solution
 */
function validateCells(
  cells: Array<{ row: number; col: number; letter: string }>,
  solution: Map<string, string>
): Array<{ row: number; col: number; isCorrect: boolean }> {
  return cells.map((cell) => {
    const key = `${cell.row},${cell.col}`;
    const correctLetter = solution.get(key);
    const userLetter = cell.letter.toUpperCase().trim();

    return {
      row: cell.row,
      col: cell.col,
      isCorrect: correctLetter === userLetter,
    };
  });
}

/**
 * POST /api/puzzles/[id]/validate
 * 
 * Validate puzzle cells
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();

  try {
    const { id } = await params;
    const puzzleId = parseInt(id);

    if (isNaN(puzzleId)) {
      return NextResponse.json(
        { error: "Invalid puzzle ID" },
        { status: 400 }
      );
    }

    // Optional: Require authentication
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse request body
    const body: ValidationRequest = await request.json();

    if (!Array.isArray(body.cells) || body.cells.length === 0) {
      return NextResponse.json(
        { error: "Invalid request: cells array required" },
        { status: 400 }
      );
    }

    // Get puzzle solution (cached or from DB)
    const solution = await getPuzzleSolution(puzzleId);

    if (!solution) {
      return NextResponse.json(
        { error: "Puzzle not found or has no solution" },
        { status: 404 }
      );
    }

    // Validate cells
    const validatedCells = validateCells(body.cells, solution);

    // Optional: Validate complete word
    let wordValidation;
    if (body.wordId && body.cells.length > 1) {
      const allCorrect = validatedCells.every((cell) => cell.isCorrect);
      const allFilled = body.cells.every((cell) => cell.letter.trim().length > 0);

      wordValidation = {
        isComplete: allFilled,
        isCorrect: allCorrect && allFilled,
      };
    }

    const response: ValidationResponse = {
      cells: validatedCells,
      word: wordValidation,
    };

    const duration = Date.now() - startTime;

    // Log performance
    if (duration > 100) {
      console.warn(`[Validation] Slow response: ${duration}ms for ${body.cells.length} cells`);
    }

    return NextResponse.json(response, {
      headers: {
        'X-Response-Time': `${duration}ms`,
        'Cache-Control': 'no-store', // Don't cache validation responses
      },
    });
  } catch (error) {
    console.error("[Validation] Error:", error);
    return NextResponse.json(
      { 
        error: "Validation failed",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/puzzles/[id]/validate
 * 
 * Health check / cache status
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const puzzleId = parseInt(id);

    if (isNaN(puzzleId)) {
      return NextResponse.json(
        { error: "Invalid puzzle ID" },
        { status: 400 }
      );
    }

    const isCached = solutionCache.has(puzzleId);

    return NextResponse.json({
      puzzleId,
      cached: isCached,
      cacheSize: solutionCache.size,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to check cache status" },
      { status: 500 }
    );
  }
}
