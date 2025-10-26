import { prisma } from './prisma';

export async function getRoomAnalytics(roomId: string) {
  try {
    const room = await prisma.multiplayerRoom.findUnique({
      where: { id: roomId },
      include: {
        participants: true,
        puzzle: true
      }
    });

    if (!room) {
      return null;
    }

    const analytics = {
      roomId: room.id,
      roomCode: room.roomCode,
      participantCount: room.participants.length,
      sessionDuration: room.startedAt ? 
        Math.floor((Date.now() - room.startedAt.getTime()) / 1000 / 60) : 0,
      completionRate: 0, // This would need to be calculated based on puzzle progress
      lastActivity: room.lastActivityAt,
      status: room.status
    };

    return analytics;
  } catch (error) {
    console.error('Error getting room analytics:', error);
    return null;
  }
}

export async function getRoomPersistenceSettings(roomId: string) {
  try {
    const room = await prisma.multiplayerRoom.findUnique({
      where: { id: roomId },
      select: {
        id: true,
        roomCode: true,
        persistenceEnabled: true,
        autoSaveInterval: true,
        maxParticipants: true,
        allowSpectators: true
      }
    });

    return room;
  } catch (error) {
    console.error('Error getting room persistence settings:', error);
    return null;
  }
}

export async function updateRoomPersistenceSettings(
  roomId: string, 
  settings: {
    persistenceEnabled?: boolean;
    autoSaveInterval?: number;
    maxParticipants?: number;
    allowSpectators?: boolean;
  }
) {
  try {
    const updatedRoom = await prisma.multiplayerRoom.update({
      where: { id: roomId },
      data: settings
    });

    return updatedRoom;
  } catch (error) {
    console.error('Error updating room persistence settings:', error);
    return null;
  }
}

export async function extendRoomPersistence(roomId: string, hours: number) {
  try {
    const newExpiryDate = new Date();
    newExpiryDate.setHours(newExpiryDate.getHours() + hours);

    const updatedRoom = await prisma.multiplayerRoom.update({
      where: { id: roomId },
      data: {
        expiresAt: newExpiryDate
      }
    });

    return updatedRoom;
  } catch (error) {
    console.error('Error extending room persistence:', error);
    return null;
  }
}

export async function isRoomExpired(roomId: string): Promise<boolean> {
  try {
    const room = await prisma.multiplayerRoom.findUnique({
      where: { id: roomId },
      select: { expiresAt: true }
    });

    if (!room || !room.expiresAt) {
      return false;
    }

    return new Date() > room.expiresAt;
  } catch (error) {
    console.error('Error checking room expiration:', error);
    return true; // Assume expired if we can't check
  }
}

export const roomPersistenceManager = {
  getRoomAnalytics,
  getRoomPersistenceSettings,
  updateRoomPersistenceSettings,
  extendRoomPersistence,
  isRoomExpired
};