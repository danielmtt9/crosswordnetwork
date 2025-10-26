import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
        tier: true,
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
      },
    });

    if (!puzzle) {
      return NextResponse.json(
        { error: "Puzzle not found" },
        { status: 404 }
      );
    }

    // Convert Decimal types to numbers
    const normalizedPuzzle = {
      ...puzzle,
      completion_rate: puzzle.completion_rate ? Number(puzzle.completion_rate) : null,
      avg_solve_time: puzzle.avg_solve_time ? Number(puzzle.avg_solve_time) : null,
    };

    return NextResponse.json(normalizedPuzzle);
  } catch (error) {
    console.error("Error fetching puzzle:", error);
    return NextResponse.json(
      { error: "Failed to fetch puzzle" },
      { status: 500 }
    );
  }
}
