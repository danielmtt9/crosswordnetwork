/**
 * API endpoints for room activity
 */

import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { roomId } = params;
    const { searchParams } = new URL(req.url);
    const timeRange = searchParams.get('timeRange') || '1h';
    const includeDetails = searchParams.get('includeDetails') === 'true';

    // Check if user has access to room
    const room = await db.multiplayerRoom.findUnique({
      where: { id: roomId },
      select: { 
        hostUserId: true,
        participants: {
          select: { userId: true }
        }
      }
    });

    if (!room) {
      return new NextResponse('Room not found', { status: 404 });
    }

    const isParticipant = room.participants.some(p => p.userId === session.user.id);
    
    if (!isParticipant) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    // Get room activity
    const activity = await getRoomActivity(roomId, timeRange, includeDetails);

    return NextResponse.json(activity);
  } catch (error) {
    console.error('Error fetching room activity:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

async function getRoomActivity(roomId: string, timeRange: string, includeDetails: boolean) {
  // Calculate time range
  const now = new Date();
  let startTime: Date;
  
  switch (timeRange) {
    case '5m':
      startTime = new Date(now.getTime() - 5 * 60 * 1000);
      break;
    case '1h':
      startTime = new Date(now.getTime() - 60 * 60 * 1000);
      break;
    case '24h':
      startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case '7d':
      startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    default:
      startTime = new Date(now.getTime() - 60 * 60 * 1000);
  }

  // Get participants
  const participants = await db.roomParticipant.findMany({
    where: { roomId },
    include: {
      user: {
        select: { id: true, name: true, image: true }
      }
    }
  });

  // Get recent messages
  const recentMessages = await db.roomMessage.count({
    where: {
      roomId,
      createdAt: { gte: startTime }
    }
  });

  // Get recent puzzle actions
  const recentPuzzleActions = await db.roomActivity.count({
    where: {
      roomId,
      type: 'PUZZLE_ACTION',
      createdAt: { gte: startTime }
    }
  });

  // Get total messages
  const totalMessages = await db.roomMessage.count({
    where: { roomId }
  });

  // Get total puzzle actions
  const totalPuzzleActions = await db.roomActivity.count({
    where: {
      roomId,
      type: 'PUZZLE_ACTION'
    }
  });

  // Get average activity per hour
  const hoursInRange = (now.getTime() - startTime.getTime()) / (1000 * 60 * 60);
  const averageActivityPerHour = hoursInRange > 0 
    ? (recentMessages + recentPuzzleActions) / hoursInRange 
    : 0;

  // Get participant activity
  const participantActivity = await Promise.all(
    participants.map(async (participant) => {
      const lastSeen = participant.lastSeen;
      const isActive = participant.isActive;
      const isTyping = participant.isTyping || false;

      return {
        id: participant.userId,
        name: participant.user.name,
        avatar: participant.user.image,
        isActive,
        isTyping,
        lastSeen,
        role: participant.role
      };
    })
  );

  // Get recent activity details if requested
  let recentActivity = [];
  if (includeDetails) {
    recentActivity = await db.roomActivity.findMany({
      where: {
        roomId,
        createdAt: { gte: startTime }
      },
      include: {
        user: {
          select: { name: true, image: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
  }

  return {
    participants: participantActivity,
    activity: {
      totalMessages,
      recentMessages,
      totalPuzzleActions,
      recentPuzzleActions,
      averageActivityPerHour: Math.round(averageActivityPerHour * 100) / 100
    },
    recentActivity: recentActivity.map(activity => ({
      id: activity.id,
      type: activity.type,
      description: activity.description,
      timestamp: activity.createdAt,
      user: {
        name: activity.user.name,
        image: activity.user.image
      }
    })),
    timeRange: {
      start: startTime,
      end: now
    }
  };
}