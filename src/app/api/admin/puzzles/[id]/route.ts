import { NextRequest, NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireAdminAccess } from "@/lib/accessControl";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getAuthSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin access
    await requireAdminAccess(session.userId);

    const puzzle = await prisma.puzzle.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            userProgress: true,
          },
        },
      },
    });

    if (!puzzle) {
      return NextResponse.json({ error: "Puzzle not found" }, { status: 404 });
    }

    return NextResponse.json(puzzle);
  } catch (error) {
    console.error("Error fetching puzzle:", error);
    
    if (error.message.includes('Access denied')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch puzzle" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getAuthSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin access
    await requireAdminAccess(session.userId);

    const body = await request.json();
    const { title, content, difficulty, category } = body;

    const puzzle = await prisma.puzzle.update({
      where: { id: params.id },
      data: {
        title,
        content,
        difficulty,
        category,
      },
    });

    return NextResponse.json(puzzle);
  } catch (error) {
    console.error("Error updating puzzle:", error);
    
    if (error.message.includes('Access denied')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update puzzle" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await getAuthSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin access
    await requireAdminAccess(session.userId);

    await prisma.puzzle.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: "Puzzle deleted successfully" });
  } catch (error) {
    console.error("Error deleting puzzle:", error);
    
    if (error.message.includes('Access denied')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: "Failed to delete puzzle" },
      { status: 500 }
    );
  }
}
