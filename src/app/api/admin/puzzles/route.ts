import { NextRequest, NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getAuthSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  if ((session as { role?: string }).role !== 'ADMIN') {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const search = searchParams.get("search");
  const category = searchParams.get("category");
  const difficulty = searchParams.get("difficulty");

  // Build where clause for filtering
  const where: any = {};
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } }
    ];
  }
  if (category) {
    where.category = category;
  }
  if (difficulty) {
    where.difficulty = difficulty;
  }

  const [puzzles, total] = await Promise.all([
    prisma.puzzle.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { upload_date: 'desc' }
    }),
    prisma.puzzle.count({ where })
  ]);

  // Convert Decimal types to numbers
  const normalizedPuzzles = puzzles.map(puzzle => ({
    ...puzzle,
    completion_rate: puzzle.completion_rate ? Number(puzzle.completion_rate) : null,
    avg_solve_time: puzzle.avg_solve_time ? Number(puzzle.avg_solve_time) : null
  }));

  return NextResponse.json({
    puzzles: normalizedPuzzles,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
}

export async function POST(request: NextRequest) {
  const session = await getAuthSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  if ((session as { role?: string }).role !== 'ADMIN') {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { title, description, category, difficulty, grid, clues } = body;

    // Validate required fields
    if (!title || !description || !category || !difficulty || !grid || !clues) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const puzzle = await prisma.puzzle.create({
      data: {
        title,
        description,
        category,
        difficulty,
        grid: JSON.stringify(grid),
        clues: JSON.stringify(clues),
        upload_date: new Date(),
        completion_rate: 0,
        avg_solve_time: 0
      }
    });

    return NextResponse.json(puzzle, { status: 201 });
  } catch (error) {
    console.error("Error creating puzzle:", error);
    return NextResponse.json(
      { error: "Failed to create puzzle" },
      { status: 500 }
    );
  }
}
