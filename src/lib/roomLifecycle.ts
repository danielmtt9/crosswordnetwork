import { PrismaClient, RoomStatus } from '@prisma/client';

const prisma = new PrismaClient();

export interface RoomLifecycleEvent {
  roomId: string;
  roomCode: string;
  fromStatus: RoomStatus;
  toStatus: RoomStatus;
  reason: string;
  triggeredBy?: string;
  metadata?: Record<string, any>;
}

export interface RoomLifecycleConfig {
  maxInactiveTime: number; // in minutes
  maxRoomAge: number; // in days
  autoExpireEmptyRooms: boolean;
  autoExpireInactiveRooms: boolean;
  cleanupInterval: number; // in minutes
}

export class RoomLifecycleManager {
  private static readonly DEFAULT_CONFIG: RoomLifecycleConfig = {
    maxInactiveTime: 30, // 30 minutes
    maxRoomAge: 7, // 7 days
    autoExpireEmptyRooms: true,
    autoExpireInactiveRooms: true,
    cleanupInterval: 5 // 5 minutes
  };

  private config: RoomLifecycleConfig;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<RoomLifecycleConfig> = {}) {
    this.config = { ...RoomLifecycleManager.DEFAULT_CONFIG, ...config };
  }

  /**
   * Start the room lifecycle management system
   */
  start() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(() => {
      this.performCleanup().catch(console.error);
    }, this.config.cleanupInterval * 60 * 1000);

    console.log('[RoomLifecycle] Started room lifecycle management');
  }

  /**
   * Stop the room lifecycle management system
   */
  stop() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    console.log('[RoomLifecycle] Stopped room lifecycle management');
  }

  /**
   * Perform room cleanup and lifecycle management
   */
  async performCleanup(): Promise<void> {
    try {
      console.log('[RoomLifecycle] Starting room cleanup...');
      
      const now = new Date();
      const maxInactiveTime = new Date(now.getTime() - this.config.maxInactiveTime * 60 * 1000);
      const maxRoomAge = new Date(now.getTime() - this.config.maxRoomAge * 24 * 60 * 60 * 1000);

      // 1. Expire old rooms
      if (this.config.autoExpireInactiveRooms) {
        await this.expireOldRooms(maxRoomAge);
      }

      // 2. Expire inactive rooms
      if (this.config.autoExpireInactiveRooms) {
        await this.expireInactiveRooms(maxInactiveTime);
      }

      // 3. Clean up empty rooms
      if (this.config.autoExpireEmptyRooms) {
        await this.cleanupEmptyRooms();
      }

      // 4. Clean up expired rooms (remove from database)
      await this.cleanupExpiredRooms();

      console.log('[RoomLifecycle] Room cleanup completed');
    } catch (error) {
      console.error('[RoomLifecycle] Error during cleanup:', error);
    }
  }

  /**
   * Expire rooms that are too old
   */
  private async expireOldRooms(maxAge: Date): Promise<void> {
    const oldRooms = await prisma.multiplayerRoom.findMany({
      where: {
        createdAt: {
          lt: maxAge
        },
        status: {
          in: ['WAITING', 'ACTIVE']
        }
      },
      include: {
        participants: true
      }
    });

    for (const room of oldRooms) {
      await this.transitionRoomStatus(room.id, room.roomCode, room.status, 'EXPIRED', 'Room expired due to age', {
        createdAt: room.createdAt,
        maxAge: this.config.maxRoomAge
      });
    }

    if (oldRooms.length > 0) {
      console.log(`[RoomLifecycle] Expired ${oldRooms.length} old rooms`);
    }
  }

  /**
   * Expire rooms that have been inactive for too long
   */
  private async expireInactiveRooms(maxInactiveTime: Date): Promise<void> {
    const inactiveRooms = await prisma.multiplayerRoom.findMany({
      where: {
        OR: [
          {
            status: 'WAITING',
            updatedAt: {
              lt: maxInactiveTime
            }
          },
          {
            status: 'ACTIVE',
            updatedAt: {
              lt: maxInactiveTime
            }
          }
        ]
      },
      include: {
        participants: true
      }
    });

    for (const room of inactiveRooms) {
      await this.transitionRoomStatus(room.id, room.roomCode, room.status, 'EXPIRED', 'Room expired due to inactivity', {
        lastActivity: room.updatedAt,
        maxInactiveTime: this.config.maxInactiveTime
      });
    }

    if (inactiveRooms.length > 0) {
      console.log(`[RoomLifecycle] Expired ${inactiveRooms.length} inactive rooms`);
    }
  }

  /**
   * Clean up empty rooms (no participants)
   */
  private async cleanupEmptyRooms(): Promise<void> {
    const emptyRooms = await prisma.multiplayerRoom.findMany({
      where: {
        status: {
          in: ['WAITING', 'ACTIVE']
        },
        participants: {
          none: {}
        }
      }
    });

    for (const room of emptyRooms) {
      await this.transitionRoomStatus(room.id, room.roomCode, room.status, 'EXPIRED', 'Room expired - no participants', {
        participantCount: 0
      });
    }

    if (emptyRooms.length > 0) {
      console.log(`[RoomLifecycle] Expired ${emptyRooms.length} empty rooms`);
    }
  }

  /**
   * Clean up expired rooms (remove from database after 24 hours)
   */
  private async cleanupExpiredRooms(): Promise<void> {
    const expiredRooms = await prisma.multiplayerRoom.findMany({
      where: {
        status: 'EXPIRED',
        completedAt: {
          lt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago
        }
      }
    });

    for (const room of expiredRooms) {
      // Delete related data first
      await prisma.roomParticipant.deleteMany({
        where: { roomId: room.id }
      });

      await prisma.roomMessage.deleteMany({
        where: { roomId: room.id }
      });

      await prisma.roomInvite.deleteMany({
        where: { roomId: room.id }
      });

      await prisma.joinRequest.deleteMany({
        where: { roomId: room.id }
      });

      await prisma.roomHintUsage.deleteMany({
        where: { roomId: room.id }
      });

      // Delete the room
      await prisma.multiplayerRoom.delete({
        where: { id: room.id }
      });
    }

    if (expiredRooms.length > 0) {
      console.log(`[RoomLifecycle] Cleaned up ${expiredRooms.length} expired rooms`);
    }
  }

  /**
   * Transition room status with proper validation and logging
   */
  async transitionRoomStatus(
    roomId: string,
    roomCode: string,
    fromStatus: RoomStatus,
    toStatus: RoomStatus,
    reason: string,
    triggeredBy?: string,
    metadata?: Record<string, any>
  ): Promise<boolean> {
    try {
      // Validate transition
      if (!this.isValidTransition(fromStatus, toStatus)) {
        console.warn(`[RoomLifecycle] Invalid transition from ${fromStatus} to ${toStatus}`);
        return false;
      }

      // Update room status
      const updateData: any = {
        status: toStatus,
        updatedAt: new Date()
      };

      if (toStatus === 'ACTIVE' && fromStatus === 'WAITING') {
        updateData.startedAt = new Date();
      } else if (toStatus === 'COMPLETED' || toStatus === 'EXPIRED') {
        updateData.completedAt = new Date();
      }

      await prisma.multiplayerRoom.update({
        where: { id: roomId },
        data: updateData
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          actorUserId: triggeredBy || 'system',
          action: `ROOM_${toStatus}`,
          entityType: 'ROOM',
          entityId: roomId,
          before: JSON.stringify({ status: fromStatus }),
          after: JSON.stringify({ status: toStatus, reason }),
          metadata: JSON.stringify(metadata || {}),
          ip: 'system'
        }
      });

      // Create notifications for participants
      await this.notifyParticipants(roomId, fromStatus, toStatus, reason);

      console.log(`[RoomLifecycle] Room ${roomCode} transitioned from ${fromStatus} to ${toStatus}: ${reason}`);
      return true;
    } catch (error) {
      console.error(`[RoomLifecycle] Error transitioning room ${roomCode}:`, error);
      return false;
    }
  }

  /**
   * Validate if a status transition is allowed
   */
  private isValidTransition(fromStatus: RoomStatus, toStatus: RoomStatus): boolean {
    const validTransitions: Record<RoomStatus, RoomStatus[]> = {
      'WAITING': ['ACTIVE', 'EXPIRED'],
      'ACTIVE': ['WAITING', 'COMPLETED', 'EXPIRED'],
      'COMPLETED': ['EXPIRED'],
      'EXPIRED': [] // No transitions from expired
    };

    return validTransitions[fromStatus]?.includes(toStatus) || false;
  }

  /**
   * Notify participants about room status changes
   */
  private async notifyParticipants(
    roomId: string,
    fromStatus: RoomStatus,
    toStatus: RoomStatus,
    reason: string
  ): Promise<void> {
    const participants = await prisma.roomParticipant.findMany({
      where: { roomId },
      select: { userId: true }
    });

    const room = await prisma.multiplayerRoom.findUnique({
      where: { id: roomId },
      select: { roomCode: true, name: true }
    });

    if (!room) return;

    const notificationData = {
      type: `ROOM_${toStatus}`,
      title: this.getNotificationTitle(toStatus),
      message: this.getNotificationMessage(toStatus, reason, room.name || room.roomCode),
      actionUrl: `/room/${room.roomCode}`,
      metadata: JSON.stringify({
        roomId,
        roomCode: room.roomCode,
        roomName: room.name,
        fromStatus,
        toStatus,
        reason
      })
    };

    // Create notifications for all participants
    await prisma.notification.createMany({
      data: participants.map(p => ({
        ...notificationData,
        userId: p.userId
      }))
    });
  }

  /**
   * Get notification title for status change
   */
  private getNotificationTitle(status: RoomStatus): string {
    switch (status) {
      case 'ACTIVE':
        return 'Session Started';
      case 'COMPLETED':
        return 'Session Completed';
      case 'EXPIRED':
        return 'Room Expired';
      default:
        return 'Room Status Changed';
    }
  }

  /**
   * Get notification message for status change
   */
  private getNotificationMessage(status: RoomStatus, reason: string, roomName: string): string {
    switch (status) {
      case 'ACTIVE':
        return `The session in "${roomName}" has started!`;
      case 'COMPLETED':
        return `The session in "${roomName}" has been completed.`;
      case 'EXPIRED':
        return `The room "${roomName}" has expired. Reason: ${reason}`;
      default:
        return `The room "${roomName}" status has changed.`;
    }
  }

  /**
   * Get room lifecycle statistics
   */
  async getStatistics(): Promise<{
    totalRooms: number;
    activeRooms: number;
    waitingRooms: number;
    completedRooms: number;
    expiredRooms: number;
    averageRoomAge: number;
    averageSessionDuration: number;
  }> {
    const [
      totalRooms,
      activeRooms,
      waitingRooms,
      completedRooms,
      expiredRooms,
      roomAges,
      sessionDurations
    ] = await Promise.all([
      prisma.multiplayerRoom.count(),
      prisma.multiplayerRoom.count({ where: { status: 'ACTIVE' } }),
      prisma.multiplayerRoom.count({ where: { status: 'WAITING' } }),
      prisma.multiplayerRoom.count({ where: { status: 'COMPLETED' } }),
      prisma.multiplayerRoom.count({ where: { status: 'EXPIRED' } }),
      prisma.multiplayerRoom.findMany({
        select: { createdAt: true },
        where: { status: { in: ['WAITING', 'ACTIVE'] } }
      }),
      prisma.multiplayerRoom.findMany({
        select: { startedAt: true, completedAt: true },
        where: { 
          status: 'COMPLETED',
          startedAt: { not: null },
          completedAt: { not: null }
        }
      })
    ]);

    const now = new Date();
    const averageRoomAge = roomAges.length > 0 
      ? roomAges.reduce((sum, room) => sum + (now.getTime() - room.createdAt.getTime()), 0) / roomAges.length / (1000 * 60 * 60 * 24) // in days
      : 0;

    const averageSessionDuration = sessionDurations.length > 0
      ? sessionDurations.reduce((sum, room) => sum + (room.completedAt!.getTime() - room.startedAt!.getTime()), 0) / sessionDurations.length / (1000 * 60) // in minutes
      : 0;

    return {
      totalRooms,
      activeRooms,
      waitingRooms,
      completedRooms,
      expiredRooms,
      averageRoomAge,
      averageSessionDuration
    };
  }
}

// Export singleton instance
export const roomLifecycleManager = new RoomLifecycleManager();
