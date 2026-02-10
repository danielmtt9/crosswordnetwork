import { NextRequest, NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get user statistics
    const [puzzlesCompleted, totalTimeSpent, hintsUsed] = await Promise.all([
      prisma.userProgress.count({
        where: { userId: user.id, isCompleted: true }
      }),
      prisma.userProgress.aggregate({
        where: { userId: user.id, completionTimeSeconds: { not: null } },
        _sum: { completionTimeSeconds: true }
      }).then(r => r._sum.completionTimeSeconds || 0),
      prisma.userProgress.aggregate({
        where: { userId: user.id },
        _sum: { hintsUsed: true }
      }).then(r => r._sum.hintsUsed || 0)
    ]);

    return NextResponse.json({
      ...user,
      stats: {
        puzzlesCompleted,
        totalTimeSpent: `${Math.floor(totalTimeSpent / 3600)}h ${Math.floor((totalTimeSpent % 3600) / 60)}m`,
        hintsUsed,
        joinDate: user.createdAt
      }
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, image } = body;

    if (!name && !image) {
      return NextResponse.json(
        { error: "At least one field is required" },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.userId },
      data: {
        ...(name && { name }),
        ...(image && { image })
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        updatedAt: true
      }
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Error updating user profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
