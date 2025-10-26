import { prisma } from './prisma';

export type RoomAction = 'EDIT' | 'HOST' | 'MODERATE' | 'SPECTATE';

export interface PermissionContext {
  userId: string;
  roomId: string;
  userRole?: string;
  isHost?: boolean;
}

export function createPermissionContext(
  userId: string,
  roomId: string,
  userRole?: string,
  isHost?: boolean
): PermissionContext {
  return {
    userId,
    roomId,
    userRole,
    isHost
  };
}

export class RoomPermissionManager {
  static async canUserEditRoom(userId: string, roomId: string): Promise<boolean> {
    try {
      const participant = await prisma.roomParticipant.findFirst({
        where: {
          userId,
          roomId,
          role: {
            in: ['HOST', 'PLAYER']
          }
        }
      });

      return !!participant;
    } catch (error) {
      console.error('Error checking room permissions:', error);
      return false;
    }
  }

  static async canUserHostRoom(userId: string, roomId: string): Promise<boolean> {
    try {
      const room = await prisma.multiplayerRoom.findFirst({
        where: {
          id: roomId,
          hostUserId: userId
        }
      });

      return !!room;
    } catch (error) {
      console.error('Error checking host permissions:', error);
      return false;
    }
  }

  static async canUserModerateRoom(userId: string, roomId: string): Promise<boolean> {
    try {
      const participant = await prisma.roomParticipant.findFirst({
        where: {
          userId,
          roomId,
          role: 'HOST'
        }
      });

      return !!participant;
    } catch (error) {
      console.error('Error checking moderation permissions:', error);
      return false;
    }
  }

  static async checkPermission(
    action: RoomAction,
    context: PermissionContext
  ): Promise<boolean> {
    const { userId, roomId, userRole, isHost } = context;

    switch (action) {
      case 'EDIT':
        return this.canUserEditRoom(userId, roomId);
      case 'HOST':
        return this.canUserHostRoom(userId, roomId);
      case 'MODERATE':
        return this.canUserModerateRoom(userId, roomId);
      case 'SPECTATE':
        return true; // Anyone can spectate
      default:
        return false;
    }
  }
}