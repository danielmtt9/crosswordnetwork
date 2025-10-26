import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const metric = searchParams.get('metric') || 'score';

    // Get user's friends
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { userId: session.userId, status: 'ACCEPTED' },
          { friendId: session.userId, status: 'ACCEPTED' }
        ]
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          }
        },
        friend: {
          select: {
            id: true,
            name: true,
            image: true,
          }
        }
      }
    });

    // Get friend IDs
    const friendIds = friendships.map(friendship => 
      friendship.userId === session.userId ? friendship.friend.id : friendship.user.id
    );

    // Include current user
    const allUserIds = [session.userId, ...friendIds];

    // Get user stats for friends and current user
    const userStats = await prisma.userStats.findMany({
      where: {
        userId: { in: allUserIds }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          }
        }
      }
    });

    // Transform to friend stats format
    const stats = userStats.map(stat => {
      let value: number;
      let rankChange = 0; // This would need to be calculated based on historical data

      switch (metric) {
        case 'score':
          value = stat.totalScore;
          break;
        case 'puzzles':
          value = stat.totalPuzzlesCompleted;
          break;
        case 'streak':
          value = stat.currentStreak;
          break;
        case 'achievements':
          value = stat.achievementPoints;
          break;
        default:
          value = stat.totalScore;
      }

      return {
        userId: stat.userId,
        userName: stat.user.name || 'Anonymous',
        userAvatar: stat.user.image,
        totalScore: stat.totalScore,
        puzzlesCompleted: stat.totalPuzzlesCompleted,
        currentStreak: stat.currentStreak,
        achievementPoints: stat.achievementPoints,
        rank: 0, // Will be calculated below
        rankChange,
      };
    });

    // Sort by selected metric and assign ranks
    stats.sort((a, b) => {
      let aValue: number, bValue: number;
      
      switch (metric) {
        case 'score':
          aValue = a.totalScore;
          bValue = b.totalScore;
          break;
        case 'puzzles':
          aValue = a.puzzlesCompleted;
          bValue = b.puzzlesCompleted;
          break;
        case 'streak':
          aValue = a.currentStreak;
          bValue = b.currentStreak;
          break;
        case 'achievements':
          aValue = a.achievementPoints;
          bValue = b.achievementPoints;
          break;
        default:
          aValue = a.totalScore;
          bValue = b.totalScore;
      }

      return bValue - aValue; // Descending order
    });

    // Assign ranks
    stats.forEach((stat, index) => {
      stat.rank = index + 1;
    });

    return NextResponse.json({ stats });
  } catch (error) {
    console.error("Error fetching friend leaderboard:", error);
    return NextResponse.json(
      { error: "Failed to fetch friend leaderboard" },
      { status: 500 }
    );
  }
}
