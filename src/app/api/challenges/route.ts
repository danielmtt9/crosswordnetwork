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

    // Get challenges where user is participating or can join
    const challenges = await prisma.challenge.findMany({
      where: {
        OR: [
          { participants: { some: { userId: session.userId } } },
          { status: 'upcoming' }
        ]
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              }
            }
          }
        },
        creator: {
          select: {
            id: true,
            name: true,
            image: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Transform challenges to match component interface
    const transformedChallenges = challenges.map(challenge => {
      const now = new Date();
      const startTime = new Date(challenge.startTime);
      const endTime = new Date(challenge.endTime);

      let status: 'upcoming' | 'active' | 'completed';
      if (now < startTime) {
        status = 'upcoming';
      } else if (now >= startTime && now <= endTime) {
        status = 'active';
      } else {
        status = 'completed';
      }

      return {
        id: challenge.id,
        name: challenge.name,
        description: challenge.description,
        type: challenge.type,
        target: challenge.target,
        duration: challenge.duration,
        participants: challenge.participants.map(participant => ({
          userId: participant.userId,
          userName: participant.user.name || 'Anonymous',
          userAvatar: participant.user.image,
          progress: participant.progress,
          rank: participant.rank,
          isCurrentUser: participant.userId === session.userId,
        })),
        status,
        startTime: challenge.startTime,
        endTime: challenge.endTime,
        reward: {
          points: challenge.rewardPoints,
          badge: challenge.rewardBadge,
        }
      };
    });

    return NextResponse.json({ challenges: transformedChallenges });
  } catch (error) {
    console.error("Error fetching challenges:", error);
    return NextResponse.json(
      { error: "Failed to fetch challenges" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      name,
      description,
      type,
      target,
      duration,
      startTime,
      rewardPoints,
      rewardBadge
    } = body;

    // Validate required fields
    if (!name || !description || !type || !target || !duration) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate challenge type
    const validTypes = ['puzzle_count', 'speed', 'accuracy', 'streak'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: "Invalid challenge type" },
        { status: 400 }
      );
    }

    // Create challenge
    const challenge = await prisma.challenge.create({
      data: {
        name,
        description,
        type,
        target,
        duration,
        startTime: startTime || new Date(),
        endTime: new Date(Date.now() + duration * 60 * 60 * 1000), // duration in hours
        creatorId: session.userId,
        rewardPoints: rewardPoints || 0,
        rewardBadge: rewardBadge || null,
        status: 'upcoming'
      }
    });

    // Add creator as participant
    await prisma.challengeParticipant.create({
      data: {
        challengeId: challenge.id,
        userId: session.userId,
        progress: 0,
        rank: 1
      }
    });

    return NextResponse.json({ 
      success: true, 
      challenge: {
        id: challenge.id,
        name: challenge.name,
        description: challenge.description,
        type: challenge.type,
        target: challenge.target,
        duration: challenge.duration,
        status: 'upcoming',
        startTime: challenge.startTime,
        endTime: challenge.endTime,
        reward: {
          points: challenge.rewardPoints,
          badge: challenge.rewardBadge,
        }
      }
    });
  } catch (error) {
    console.error("Error creating challenge:", error);
    return NextResponse.json(
      { error: "Failed to create challenge" },
      { status: 500 }
    );
  }
}
