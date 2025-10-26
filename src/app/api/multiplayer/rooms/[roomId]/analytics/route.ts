/**
 * API endpoints for room analytics
 */

import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { getRoomAnalytics } from '@/lib/roomPersistence';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params; {
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { roomId } = params;
    const { searchParams } = new URL(req.url);
    const timeRange = searchParams.get('timeRange') || '24h';
    const includeDetails = searchParams.get('includeDetails') === 'true';

    // Check if user is host
    const room = await db.multiplayerRoom.findUnique({
      where: { id: roomId },
      select: { hostUserId: true }
    });

    if (!room) {
      return new NextResponse('Room not found', { status: 404 });
    }

    if (room.hostUserId !== session.user.id) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    // Get room analytics
    const analytics = await getRoomAnalytics(roomId);
    
    // Get additional analytics data
    const additionalAnalytics = await getAdditionalAnalytics(roomId, timeRange);
    
    // Get engagement data
    const engagementData = await getEngagementData(roomId, timeRange);
    
    // Get participant data
    const participantData = await getParticipantData(roomId);
    
    // Get role distribution
    const roleDistribution = await getRoleDistribution(roomId);
    
    // Get activity timeline
    const activityTimeline = await getActivityTimeline(roomId, timeRange);
    
    // Get performance data
    const performanceData = await getPerformanceData(roomId, timeRange);

    const result = {
      ...analytics,
      ...additionalAnalytics,
      engagementData,
      participantData,
      roleDistribution,
      activityTimeline,
      performanceData,
      timeRange,
      generatedAt: new Date()
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching room analytics:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

async function getAdditionalAnalytics(roomId: string, timeRange: string) {
  // Calculate time range
  const now = new Date();
  let startTime: Date;
  
  switch (timeRange) {
    case '1h':
      startTime = new Date(now.getTime() - 60 * 60 * 1000);
      break;
    case '24h':
      startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case '7d':
      startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }

  // Get messages per hour
  const messagesPerHour = await db.roomActivity.count({
    where: {
      roomId,
      type: 'CHAT_MESSAGE',
      createdAt: { gte: startTime }
    }
  }) / Math.max(1, (now.getTime() - startTime.getTime()) / (1000 * 60 * 60));

  // Get puzzle edits per hour
  const puzzleEditsPerHour = await db.roomActivity.count({
    where: {
      roomId,
      type: 'PUZZLE_EDIT',
      createdAt: { gte: startTime }
    }
  }) / Math.max(1, (now.getTime() - startTime.getTime()) / (1000 * 60 * 60));

  // Get most active user
  const mostActiveUser = await getMostActiveUser(roomId, startTime);

  // Get performance metrics
  const performanceScore = await calculatePerformanceScore(roomId, startTime);
  const avgResponseTime = await calculateAverageResponseTime(roomId, startTime);
  const accuracy = await calculateAccuracy(roomId, startTime);
  const uptime = await calculateUptime(roomId, startTime);

  return {
    messagesPerHour: Math.round(messagesPerHour * 100) / 100,
    puzzleEditsPerHour: Math.round(puzzleEditsPerHour * 100) / 100,
    mostActiveUser,
    performanceScore,
    avgResponseTime,
    accuracy,
    uptime
  };
}

async function getEngagementData(roomId: string, timeRange: string) {
  // Calculate time range
  const now = new Date();
  let startTime: Date;
  
  switch (timeRange) {
    case '1h':
      startTime = new Date(now.getTime() - 60 * 60 * 1000);
      break;
    case '24h':
      startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case '7d':
      startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }

  // Get engagement data by hour
  const engagementData = await db.roomActivity.groupBy({
    by: ['createdAt'],
    where: {
      roomId,
      type: { in: ['CHAT_MESSAGE', 'PUZZLE_EDIT'] },
      createdAt: { gte: startTime }
    },
    _count: { id: true }
  });

  // Format data for chart
  const chartData = engagementData.map(item => ({
    time: new Date(item.createdAt).toLocaleTimeString(),
    messages: item._count.id,
    puzzleEdits: item._count.id
  }));

  return chartData;
}

async function getParticipantData(roomId: string) {
  // Get participant activity data
  const participants = await db.roomParticipant.findMany({
    where: { roomId },
    select: {
      id: true,
      name: true,
      role: true,
      isActive: true
    }
  });

  // Get activity counts for each participant
  const participantData = await Promise.all(
    participants.map(async (participant) => {
      const [messageCount, puzzleEditCount] = await Promise.all([
        db.roomActivity.count({
          where: {
            roomId,
            type: 'CHAT_MESSAGE',
            metadata: { path: ['userId'], equals: participant.id }
          }
        }),
        db.roomActivity.count({
          where: {
            roomId,
            type: 'PUZZLE_EDIT',
            metadata: { path: ['userId'], equals: participant.id }
          }
        })
      ]);

      return {
        name: participant.name,
        messages: messageCount,
        puzzleEdits: puzzleEditCount
      };
    })
  );

  return participantData;
}

async function getRoleDistribution(roomId: string) {
  // Get role distribution
  const roleCounts = await db.roomParticipant.groupBy({
    by: ['role'],
    where: { roomId },
    _count: { role: true }
  });

  const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00'];
  
  return roleCounts.map((role, index) => ({
    name: role.role,
    value: role._count.role,
    color: colors[index % colors.length]
  }));
}

async function getActivityTimeline(roomId: string, timeRange: string) {
  // Calculate time range
  const now = new Date();
  let startTime: Date;
  
  switch (timeRange) {
    case '1h':
      startTime = new Date(now.getTime() - 60 * 60 * 1000);
      break;
    case '24h':
      startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case '7d':
      startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }

  // Get activity timeline
  const timeline = await db.roomActivity.groupBy({
    by: ['createdAt'],
    where: {
      roomId,
      createdAt: { gte: startTime }
    },
    _count: { id: true }
  });

  return timeline.map(item => ({
    time: new Date(item.createdAt).toLocaleTimeString(),
    activity: item._count.id
  }));
}

async function getPerformanceData(roomId: string, timeRange: string) {
  // Calculate time range
  const now = new Date();
  let startTime: Date;
  
  switch (timeRange) {
    case '1h':
      startTime = new Date(now.getTime() - 60 * 60 * 1000);
      break;
    case '24h':
      startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case '7d':
      startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }

  // Get performance data
  const performanceData = await db.roomActivity.groupBy({
    by: ['createdAt'],
    where: {
      roomId,
      type: { in: ['PUZZLE_EDIT', 'CHAT_MESSAGE'] },
      createdAt: { gte: startTime }
    },
    _count: { id: true }
  });

  return performanceData.map(item => ({
    time: new Date(item.createdAt).toLocaleTimeString(),
    responseTime: Math.random() * 100, // Mock data
    accuracy: Math.random() * 100 // Mock data
  }));
}

// Helper functions
async function getMostActiveUser(roomId: string, startTime: Date): Promise<string> {
  const userActivity = await db.roomActivity.groupBy({
    by: ['metadata'],
    where: {
      roomId,
      type: { in: ['CHAT_MESSAGE', 'PUZZLE_EDIT'] },
      createdAt: { gte: startTime }
    },
    _count: { id: true }
  });

  if (userActivity.length === 0) return 'No activity';

  // Find user with most activity
  const mostActive = userActivity.reduce((prev, current) => 
    current._count.id > prev._count.id ? current : prev
  );

  return mostActive.metadata?.userId || 'Unknown';
}

async function calculatePerformanceScore(roomId: string, startTime: Date): Promise<number> {
  // Mock performance score calculation
  const activities = await db.roomActivity.count({
    where: {
      roomId,
      createdAt: { gte: startTime }
    }
  });

  return Math.min(100, Math.max(0, 50 + (activities * 2)));
}

async function calculateAverageResponseTime(roomId: string, startTime: Date): Promise<number> {
  // Mock response time calculation
  return Math.floor(Math.random() * 100) + 50;
}

async function calculateAccuracy(roomId: string, startTime: Date): Promise<number> {
  // Mock accuracy calculation
  return Math.floor(Math.random() * 20) + 80;
}

async function calculateUptime(roomId: string, startTime: Date): Promise<number> {
  // Mock uptime calculation
  return Math.floor(Math.random() * 10) + 90;
}