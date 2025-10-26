/**
 * Room persistence utilities for 7-day room persistence system
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface RoomPersistenceSettings {
  isPersistent: boolean;
  persistenceDays: number;
  autoCleanup: boolean;
  expiresAt: Date | null;
  lastActivityAt: Date;
}

export interface RoomActivity {
  roomId: string;
  activityType: 'USER_JOIN' | 'USER_LEAVE' | 'PUZZLE_EDIT' | 'CHAT_MESSAGE' | 'ROOM_UPDATE';
  userId?: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export async function updateRoomActivity(roomId: string): Promise<void> {
  await prisma.multiplayerRoom.update({
    where: { id: roomId },
    data: { 
      lastActivityAt: new Date(),
      // Update expiresAt if room is persistent
      expiresAt: await calculateExpirationDate(roomId)
    },
  });
}

export async function cleanupExpiredRooms(): Promise<number> {
  const now = new Date();
  const expiredRooms = await prisma.multiplayerRoom.findMany({
    where: {
      autoCleanup: true,
      expiresAt: {
        lte: now,
      },
    },
    select: { id: true }
  });

  if (expiredRooms.length > 0) {
    await prisma.multiplayerRoom.deleteMany({
      where: {
        id: { in: expiredRooms.map(room => room.id) }
      },
    });
  }

  return expiredRooms.length;
}

export async function getRoomPersistenceSettings(roomId: string): Promise<RoomPersistenceSettings | null> {
  const room = await prisma.multiplayerRoom.findUnique({
    where: { id: roomId },
    select: {
      isPersistent: true,
      persistenceDays: true,
      autoCleanup: true,
      expiresAt: true,
      lastActivityAt: true,
    },
  });

  if (!room) return null;

  return {
    isPersistent: room.isPersistent,
    persistenceDays: room.persistenceDays,
    autoCleanup: room.autoCleanup,
    expiresAt: room.expiresAt,
    lastActivityAt: room.lastActivityAt,
  };
}

export async function updateRoomPersistenceSettings(
  roomId: string,
  settings: {
    isPersistent?: boolean;
    persistenceDays?: number;
    autoCleanup?: boolean;
  }
): Promise<void> {
  const room = await prisma.multiplayerRoom.findUnique({
    where: { id: roomId },
    select: { createdAt: true },
  });

  if (!room) {
    throw new Error('Room not found');
  }

  const newExpiresAt = settings.persistenceDays
    ? new Date(room.createdAt.getTime() + settings.persistenceDays * 24 * 60 * 60 * 1000)
    : undefined;

  await prisma.multiplayerRoom.update({
    where: { id: roomId },
    data: {
      ...settings,
      expiresAt: newExpiresAt,
    },
  });
}

export async function logRoomActivity(activity: RoomActivity): Promise<void> {
  await prisma.roomActivity.create({
    data: {
      roomId: activity.roomId,
      type: activity.activityType,
      description: getActivityDescription(activity.activityType, activity.userId),
      metadata: activity.metadata,
    },
  });

  // Update room activity timestamp
  await updateRoomActivity(activity.roomId);
}

export async function getRoomActivityHistory(
  roomId: string,
  limit: number = 50
): Promise<RoomActivity[]> {
  const activities = await prisma.roomActivity.findMany({
    where: { roomId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      type: true,
      description: true,
      metadata: true,
      createdAt: true,
    },
  });

  return activities.map(activity => ({
    roomId,
    activityType: activity.type as RoomActivity['activityType'],
    metadata: activity.metadata as Record<string, any>,
    timestamp: activity.createdAt,
  }));
}

export async function getRoomAnalytics(roomId: string): Promise<{
  totalParticipants: number;
  activeParticipants: number;
  sessionDuration: number;
  completionRate: number;
  totalMessages: number;
  totalPuzzleEdits: number;
}> {
  const room = await prisma.multiplayerRoom.findUnique({
    where: { id: roomId },
    select: {
      createdAt: true,
      lastActivityAt: true,
      participants: {
        select: { id: true, isActive: true }
      }
    },
  });

  if (!room) {
    throw new Error('Room not found');
  }

  // Get activity counts
  const [messageCount, puzzleEditCount] = await Promise.all([
    prisma.roomActivity.count({
      where: { roomId, type: 'CHAT_MESSAGE' }
    }),
    prisma.roomActivity.count({
      where: { roomId, type: 'PUZZLE_EDIT' }
    })
  ]);

  const totalParticipants = room.participants.length;
  const activeParticipants = room.participants.filter(p => p.isActive).length;
  const sessionDuration = room.lastActivityAt.getTime() - room.createdAt.getTime();
  const completionRate = 0; // Would need puzzle completion data

  return {
    totalParticipants,
    activeParticipants,
    sessionDuration,
    completionRate,
    totalMessages: messageCount,
    totalPuzzleEdits: puzzleEditCount,
  };
}

export async function extendRoomPersistence(roomId: string, additionalDays: number): Promise<void> {
  const room = await prisma.multiplayerRoom.findUnique({
    where: { id: roomId },
    select: { expiresAt: true },
  });

  if (!room) {
    throw new Error('Room not found');
  }

  const newExpiresAt = room.expiresAt 
    ? new Date(room.expiresAt.getTime() + additionalDays * 24 * 60 * 60 * 1000)
    : new Date(Date.now() + additionalDays * 24 * 60 * 60 * 1000);

  await prisma.multiplayerRoom.update({
    where: { id: roomId },
    data: { expiresAt: newExpiresAt },
  });
}

export async function isRoomExpired(roomId: string): Promise<boolean> {
  const room = await prisma.multiplayerRoom.findUnique({
    where: { id: roomId },
    select: { expiresAt: true },
  });

  if (!room || !room.expiresAt) return false;
  
  return new Date() > room.expiresAt;
}

export async function getExpiringRooms(daysAhead: number = 1): Promise<string[]> {
  const futureDate = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
  
  const rooms = await prisma.multiplayerRoom.findMany({
    where: {
      expiresAt: {
        lte: futureDate,
        gte: new Date(),
      },
    },
    select: { id: true },
  });

  return rooms.map(room => room.id);
}

// Helper functions
async function calculateExpirationDate(roomId: string): Promise<Date | null> {
  const room = await prisma.multiplayerRoom.findUnique({
    where: { id: roomId },
    select: { 
      isPersistent: true, 
      persistenceDays: true, 
      createdAt: true 
    },
  });

  if (!room || !room.isPersistent) return null;

  return new Date(room.createdAt.getTime() + room.persistenceDays * 24 * 60 * 60 * 1000);
}

function getActivityDescription(activityType: RoomActivity['activityType'], userId?: string): string {
  switch (activityType) {
    case 'USER_JOIN':
      return `User ${userId} joined the room`;
    case 'USER_LEAVE':
      return `User ${userId} left the room`;
    case 'PUZZLE_EDIT':
      return `Puzzle was edited by ${userId}`;
    case 'CHAT_MESSAGE':
      return `Message sent by ${userId}`;
    case 'ROOM_UPDATE':
      return `Room settings updated by ${userId}`;
    default:
      return 'Unknown activity';
  }
}