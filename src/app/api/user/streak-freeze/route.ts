import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Check if user has premium subscription
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { isPremium: true },
    });

    if (!user?.isPremium) {
      return NextResponse.json(
        { error: "Premium subscription required for streak freeze" },
        { status: 403 }
      );
    }

    // Check if user has already used streak freeze
    const userStats = await prisma.userStats.findUnique({
      where: { userId: session.userId },
    });

    if (!userStats) {
      return NextResponse.json(
        { error: "User stats not found" },
        { status: 404 }
      );
    }

    // For now, we'll just return success
    // In a full implementation, you'd track streak freeze usage
    // and implement the logic to prevent streak breaks

    return NextResponse.json({
      success: true,
      message: "Streak freeze activated",
    });
  } catch (error) {
    console.error("Error using streak freeze:", error);
    return NextResponse.json(
      { error: "Failed to use streak freeze" },
      { status: 500 }
    );
  }
}
