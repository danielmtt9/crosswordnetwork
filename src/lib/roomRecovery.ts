import { PrismaClient } from '@prisma/client';
import { roomPersistenceManager, RoomState } from './roomPersistence';

const prisma = new PrismaClient();

export interface RecoveryResult {
  roomId: string;
  roomCode: string;
  recovered: boolean;
  participants: string[];
  lastActivity?: Date;
  error?: string;
}

export class RoomRecoveryManager {
  private readonly RECOVERY_TIMEOUT_MS = 30000; // 30 seconds
  private readonly MAX_RECOVERY_ATTEMPTS = 3;

  /**
   * Recover all active rooms after server restart
   */
  async recoverAllRooms(): Promise<RecoveryResult[]> {
    console.log('[RoomRecovery] Starting room recovery process...');
    
    try {
      // Find all rooms that were active when server went down
      const activeRooms = await prisma.multiplayerRoom.findMany({
        where: {
          status: {
            in: ['WAITING', 'ACTIVE']
          },
          // Only recover rooms that were active in the last 24 hours
          updatedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        },
        include: {
          participants: {
            select: {
              userId: true,
              displayName: true,
              role: true,
              isOnline: true,
              lastSeen: true,
            }
          }
        }
      });

      console.log(`[RoomRecovery] Found ${activeRooms.length} rooms to recover`);

      const results: RecoveryResult[] = [];

      for (const room of activeRooms) {
        try {
          const result = await this.recoverRoom(room.id, room.roomCode);
          results.push(result);
        } catch (error: any) {
          console.error(`[RoomRecovery] Failed to recover room ${room.roomCode}:`, error);
          results.push({
            roomId: room.id,
            roomCode: room.roomCode,
            recovered: false,
            participants: room.participants.map(p => p.userId),
            error: error.message
          });
        }
      }

      const recoveredCount = results.filter(r => r.recovered).length;
      console.log(`[RoomRecovery] Recovery complete: ${recoveredCount}/${results.length} rooms recovered`);

      return results;
    } catch (error) {
      console.error('[RoomRecovery] Error during room recovery:', error);
      throw error;
    }
  }

  /**
   * Recover a specific room
   */
  async recoverRoom(roomId: string, roomCode: string): Promise<RecoveryResult> {
    console.log(`[RoomRecovery] Recovering room ${roomCode} (${roomId})`);

    try {
      // Load the latest room state
      const roomState = await roomPersistenceManager.loadRoomState(roomId);
      
      if (!roomState) {
        throw new Error('No saved state found for room');
      }

      // Mark all participants as offline initially
      await this.markParticipantsOffline(roomId);

      // Update room status based on recovery
      await this.updateRoomStatus(roomId, roomState);

      // Create recovery audit log
      await this.createRecoveryAuditLog(roomId, roomState);

      // Notify participants about recovery
      await this.notifyParticipantsOfRecovery(roomId, roomState);

      console.log(`[RoomRecovery] Successfully recovered room ${roomCode}`);

      return {
        roomId,
        roomCode,
        recovered: true,
        participants: roomState.participants.map(p => p.userId),
        lastActivity: roomState.metadata.lastSaved
      };

    } catch (error: any) {
      console.error(`[RoomRecovery] Failed to recover room ${roomCode}:`, error);
      
      // Mark room as expired if recovery fails
      await this.markRoomAsExpired(roomId);

      return {
        roomId,
        roomCode,
        recovered: false,
        participants: [],
        error: error.message
      };
    }
  }

  /**
   * Mark all participants as offline
   */
  private async markParticipantsOffline(roomId: string): Promise<void> {
    await prisma.roomParticipant.updateMany({
      where: { roomId },
      data: { 
        isOnline: false,
        lastSeen: new Date()
      }
    });
  }

  /**
   * Update room status based on recovered state
   */
  private async updateRoomStatus(roomId: string, roomState: RoomState): Promise<void> {
    const updateData: any = {
      status: roomState.sessionState.status,
      updatedAt: new Date()
    };

    // If room was active, mark it as waiting for reconnection
    if (roomState.sessionState.status === 'ACTIVE') {
      updateData.status = 'WAITING';
      updateData.startedAt = roomState.sessionState.startedAt;
    }

    await prisma.multiplayerRoom.update({
      where: { id: roomId },
      data: updateData
    });
  }

  /**
   * Create audit log for recovery
   */
  private async createRecoveryAuditLog(roomId: string, roomState: RoomState): Promise<void> {
    await prisma.auditLog.create({
      data: {
        actorUserId: 'system',
        action: 'ROOM_RECOVERY',
        entityType: 'ROOM',
        entityId: roomId,
        before: JSON.stringify({ status: 'RECOVERING' }),
        after: JSON.stringify({ 
          status: roomState.sessionState.status,
          participantCount: roomState.participants.length,
          lastSaved: roomState.metadata.lastSaved
        }),
        ip: 'system'
      }
    });
  }

  /**
   * Notify participants about room recovery
   */
  private async notifyParticipantsOfRecovery(roomId: string, roomState: RoomState): Promise<void> {
    const room = await prisma.multiplayerRoom.findUnique({
      where: { id: roomId },
      select: { roomCode: true, name: true }
    });

    if (!room) return;

    const notifications = roomState.participants.map(participant => ({
      userId: participant.userId,
      type: 'ROOM_RECOVERED',
      title: 'Room Recovered',
      message: `Room "${room.name || room.roomCode}" has been recovered after a server restart. You can rejoin when ready.`,
      actionUrl: `/room/${room.roomCode}`,
      metadata: JSON.stringify({
        roomId,
        roomCode: room.roomCode,
        roomName: room.name,
        recoveredAt: new Date().toISOString()
      })
    }));

    await prisma.notification.createMany({
      data: notifications
    });
  }

  /**
   * Mark room as expired if recovery fails
   */
  private async markRoomAsExpired(roomId: string): Promise<void> {
    await prisma.multiplayerRoom.update({
      where: { id: roomId },
      data: {
        status: 'EXPIRED',
        completedAt: new Date()
      }
    });
  }

  /**
   * Handle participant reconnection
   */
  async handleParticipantReconnection(roomId: string, userId: string): Promise<boolean> {
    try {
      console.log(`[RoomRecovery] Handling reconnection for user ${userId} in room ${roomId}`);

      // Check if room exists and is in a recoverable state
      const room = await prisma.multiplayerRoom.findUnique({
        where: { id: roomId },
        include: {
          participants: {
            where: { userId },
            select: { id: true, role: true, isOnline: true }
          }
        }
      });

      if (!room) {
        console.log(`[RoomRecovery] Room ${roomId} not found`);
        return false;
      }

      if (room.status === 'EXPIRED') {
        console.log(`[RoomRecovery] Room ${roomId} has expired`);
        return false;
      }

      const participant = room.participants[0];
      if (!participant) {
        console.log(`[RoomRecovery] User ${userId} is not a participant in room ${roomId}`);
        return false;
      }

      // Mark participant as online
      await prisma.roomParticipant.update({
        where: { id: participant.id },
        data: { 
          isOnline: true,
          lastSeen: new Date()
        }
      });

      // Create reconnection audit log
      await prisma.auditLog.create({
        data: {
          actorUserId: userId,
          action: 'PARTICIPANT_RECONNECTED',
          entityType: 'ROOM_PARTICIPANT',
          entityId: participant.id,
          before: JSON.stringify({ isOnline: false }),
          after: JSON.stringify({ isOnline: true }),
          ip: 'system'
        }
      });

      console.log(`[RoomRecovery] User ${userId} successfully reconnected to room ${roomId}`);
      return true;

    } catch (error) {
      console.error(`[RoomRecovery] Error handling reconnection for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Get recovery statistics
   */
  async getRecoveryStats(): Promise<{
    totalRooms: number;
    activeRooms: number;
    waitingRooms: number;
    expiredRooms: number;
    recoveredToday: number;
  }> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      totalRooms,
      activeRooms,
      waitingRooms,
      expiredRooms,
      recoveredToday
    ] = await Promise.all([
      prisma.multiplayerRoom.count(),
      prisma.multiplayerRoom.count({ where: { status: 'ACTIVE' } }),
      prisma.multiplayerRoom.count({ where: { status: 'WAITING' } }),
      prisma.multiplayerRoom.count({ where: { status: 'EXPIRED' } }),
      prisma.auditLog.count({
        where: {
          action: 'ROOM_RECOVERY',
          createdAt: { gte: todayStart }
        }
      })
    ]);

    return {
      totalRooms,
      activeRooms,
      waitingRooms,
      expiredRooms,
      recoveredToday
    };
  }

  /**
   * Clean up old recovery data
   */
  async cleanupOldRecoveryData(): Promise<void> {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      // Clean up old state versions
      const oldStateVersions = await prisma.roomStateVersion.findMany({
        where: { createdAt: { lt: thirtyDaysAgo } },
        select: { id: true }
      });

      if (oldStateVersions.length > 0) {
        await prisma.roomStateVersion.deleteMany({
          where: { id: { in: oldStateVersions.map(v => v.id) } }
        });
        console.log(`[RoomRecovery] Cleaned up ${oldStateVersions.length} old state versions`);
      }

      // Clean up old recovery audit logs
      const oldRecoveryLogs = await prisma.auditLog.findMany({
        where: {
          action: 'ROOM_RECOVERY',
          createdAt: { lt: thirtyDaysAgo }
        },
        select: { id: true }
      });

      if (oldRecoveryLogs.length > 0) {
        await prisma.auditLog.deleteMany({
          where: { id: { in: oldRecoveryLogs.map(l => l.id) } }
        });
        console.log(`[RoomRecovery] Cleaned up ${oldRecoveryLogs.length} old recovery logs`);
      }

    } catch (error) {
      console.error('[RoomRecovery] Error cleaning up old recovery data:', error);
    }
  }
}

// Singleton instance
export const roomRecoveryManager = new RoomRecoveryManager();
