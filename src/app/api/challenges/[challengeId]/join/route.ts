import { NextRequest, NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ challengeId: string }> }
) {
  const { challengeId } = await params;
  try {
    const session = await getAuthSession();
    if (!session?.userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { challengeId } = params;

    // Check if challenge exists
    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
      include: {
        participants: true
      }
    });

    if (!challenge) {
      return NextResponse.json(
        { error: "Challenge not found" },
        { status: 404 }
      );
    }

    // Check if challenge is still open for joining
    const now = new Date();
    const startTime = new Date(challenge.startTime);
    
    if (now >= startTime) {
      return NextResponse.json(
        { error: "Challenge has already started" },
        { status: 400 }
      );
    }

    // Check if user is already participating
    const existingParticipant = challenge.participants.find(
      p => p.userId === session.userId
    );

    if (existingParticipant) {
      return NextResponse.json(
        { error: "Already participating in this challenge" },
        { status: 400 }
      );
    }

    // Add user as participant
    const participant = await prisma.challengeParticipant.create({
      data: {
        challengeId: challengeId,
        userId: session.userId,
        progress: 0,
        rank: challenge.participants.length + 1
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

    return NextResponse.json({ 
      success: true,
      participant: {
        userId: participant.userId,
        userName: participant.user.name || 'Anonymous',
        userAvatar: participant.user.image,
        progress: participant.progress,
        rank: participant.rank,
        isCurrentUser: true,
      }
    });
  } catch (error) {
    console.error("Error joining challenge:", error);
    return NextResponse.json(
      { error: "Failed to join challenge" },
      { status: 500 }
    );
  }
}
