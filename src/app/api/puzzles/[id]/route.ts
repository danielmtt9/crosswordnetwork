import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseCluesFromStorage } from "@/lib/serverClueExtraction";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const puzzleId = parseInt(id, 10);
    
    // Validate puzzle ID: must be a positive integer
    if (isNaN(puzzleId) || puzzleId <= 0 || !Number.isInteger(puzzleId)) {
      return NextResponse.json(
        { error: "Invalid puzzle ID: must be a positive integer" },
        { status: 400 }
      );
    }
    
    // Validate reasonable upper bound (prevent DoS)
    if (puzzleId > Number.MAX_SAFE_INTEGER) {
      return NextResponse.json(
        { error: "Invalid puzzle ID: value too large" },
        { status: 400 }
      );
    }

    const puzzle = await prisma.puzzle.findUnique({
      where: {
        id: puzzleId,
        is_active: true,
      },
      select: {
        id: true,
        title: true,
        description: true,
        difficulty: true,
        category: true,
        tags: true,
        play_count: true,
        completion_rate: true,
        estimated_solve_time: true,
        avg_solve_time: true,
        best_score: true,
        grid_width: true,
        grid_height: true,
        upload_date: true,
        file_path: true,
        filename: true,
        clues: true,
      },
    });

    if (!puzzle) {
      return NextResponse.json(
        { error: "Puzzle not found" },
        { status: 404 }
      );
    }

    // Convert Decimal types to numbers and parse clues
    const normalizedPuzzle = {
      ...puzzle,
      completion_rate: puzzle.completion_rate ? Number(puzzle.completion_rate) : null,
      avg_solve_time: puzzle.avg_solve_time ? Number(puzzle.avg_solve_time) : null,
      clues: puzzle.clues ? parseCluesFromStorage(puzzle.clues) : { across: [], down: [] },
    };

    return NextResponse.json(normalizedPuzzle);
  } catch (error) {
    // Type-safe error logging with proper error handling
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    // Get puzzle ID safely for logging
    let puzzleIdForLog = 'unknown';
    try {
      const resolvedParams = await params;
      puzzleIdForLog = resolvedParams.id;
    } catch {
      // params already resolved or failed
    }
    
    console.error("Error fetching puzzle:", {
      error: errorMessage,
      stack: errorStack,
      puzzleId: puzzleIdForLog
    });
    
    // Return generic error to client, but log details server-side
    return NextResponse.json(
      { 
        error: "Failed to fetch puzzle",
        errorId: `puzzle-${Date.now()}` // Error ID for tracking
      },
      { status: 500 }
    );
  }
}
