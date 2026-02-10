import { NextRequest, NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get('teamId');

    if (!teamId) {
      return NextResponse.json(
        { error: "Team ID is required" },
        { status: 400 }
      );
    }

    // Check if user is member of the team
    const membership = await prisma.teamMember.findFirst({
      where: {
        teamId: teamId,
        userId: session.userId
      }
    });

    if (!membership) {
      return NextResponse.json(
        { error: "Not a member of this team" },
        { status: 403 }
      );
    }

    // Get team achievements
    const teamAchievements = await prisma.teamAchievement.findMany({
      where: {
        teamId: teamId
      },
      include: {
        achievement: true,
        unlockedBy: {
          select: {
            id: true,
            name: true,
            image: true,
          }
        }
      },
      orderBy: {
        unlockedAt: 'desc'
      }
    });

    // Get team stats
    const teamStats = await prisma.teamStats.findUnique({
      where: { teamId: teamId }
    });

    // Get team members
    const teamMembers = await prisma.teamMember.findMany({
      where: { teamId: teamId },
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

    // Transform data for component
    const achievements = teamAchievements.map(ta => ({
      id: ta.id,
      name: ta.achievement.name,
      description: ta.achievement.description,
      icon: ta.achievement.icon,
      points: ta.achievement.points,
      tier: ta.achievement.tier,
      category: ta.achievement.category,
      unlockedAt: ta.unlockedAt,
      unlockedBy: {
        userId: ta.unlockedBy.id,
        userName: ta.unlockedBy.name || 'Anonymous',
        userAvatar: ta.unlockedBy.image,
      }
    }));

    const stats = teamStats ? {
      totalPuzzles: teamStats.totalPuzzles,
      totalPoints: teamStats.totalPoints,
      averageAccuracy: teamStats.averageAccuracy,
      averageTime: teamStats.averageTime,
      streak: teamStats.streak,
      rank: teamStats.rank
    } : {
      totalPuzzles: 0,
      totalPoints: 0,
      averageAccuracy: 0,
      averageTime: 0,
      streak: 0,
      rank: 0
    };

    const members = teamMembers.map(member => ({
      userId: member.user.id,
      userName: member.user.name || 'Anonymous',
      userAvatar: member.user.image,
      role: member.role,
      joinedAt: member.joinedAt,
      contribution: member.contribution || 0
    }));

    return NextResponse.json({
      achievements,
      stats,
      members
    });
  } catch (error) {
    console.error("Error fetching team achievements:", error);
    return NextResponse.json(
      { error: "Failed to fetch team achievements" },
      { status: 500 }
    );
  }
}
