import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const difficulty = searchParams.get("difficulty");
    const tags = searchParams.get("tags")?.split(',') || [];
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "12");
    const search = searchParams.get("search");

    // Build where clause
    const where: any = {
      is_active: true,
    };

    if (category && category !== "all") {
      where.category = category;
    }

    if (difficulty && difficulty !== "all") {
      where.difficulty = difficulty;
    }

    // Filter by tags if provided
    if (tags.length > 0 && tags[0] !== '') {
      where.AND = tags.map(tag => ({
        tags: {
          contains: tag
        }
      }));
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    // Get puzzles with pagination
    const [puzzles, total] = await Promise.all([
      prisma.puzzle.findMany({
        where,
        orderBy: [
          { play_count: "desc" },
          { upload_date: "desc" },
        ],
        skip: (page - 1) * limit,
        take: limit,
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
          upload_date: true,
        },
      }),
      prisma.puzzle.count({ where }),
    ]);

    // Get categories for filter
    const categories = await prisma.puzzle.findMany({
      where: { is_active: true },
      select: { category: true },
      distinct: ["category"],
    });

    // Convert Decimal types to numbers
    const normalizedPuzzles = puzzles.map(puzzle => ({
      ...puzzle,
      completion_rate: puzzle.completion_rate ? Number(puzzle.completion_rate) : null
    }));

    return NextResponse.json({
      puzzles: normalizedPuzzles,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      filters: {
        categories: categories.map((c) => c.category).filter(Boolean),
        difficulties: ["easy", "medium", "hard"],
        tiers: [],
      },
    });
  } catch (error) {
    console.error("Error fetching puzzles:", error);
    return NextResponse.json(
      { error: "Failed to fetch puzzles" },
      { status: 500 }
    );
  }
}
