import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { checkAchievements, AchievementEvent } from "@/lib/achievements/checker";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { type, data } = body;

    // Validate event type
    const validTypes = ['puzzle_completed', 'daily_activity', 'multiplayer_join', 'multiplayer_host'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: "Invalid event type" },
        { status: 400 }
      );
    }

    const event: AchievementEvent = {
      type: type as any,
      data,
    };

    // Check for new achievements
    const unlockedAchievements = await checkAchievements(session.userId, event);

    return NextResponse.json({
      unlockedAchievements,
      count: unlockedAchievements.length,
    });
  } catch (error) {
    console.error("Error checking achievements:", error);
    return NextResponse.json(
      { error: "Failed to check achievements" },
      { status: 500 }
    );
  }
}