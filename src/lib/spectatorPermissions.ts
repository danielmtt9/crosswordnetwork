import { prisma } from './prisma';

export class SpectatorPermissionManager {
  static async canUserSpectate(userId: string, roomId: string): Promise<boolean> {
    try {
      const room = await prisma.multiplayerRoom.findFirst({
        where: {
          id: roomId,
          allowSpectators: true
        }
      });

      if (!room) return false;

      // Check if user is already a participant
      const participant = await prisma.roomParticipant.findFirst({
        where: {
          userId,
          roomId
        }
      });

      // If user is already a participant, they can spectate
      if (participant) return true;

      // If room allows spectators and isn't full, user can spectate
      const participantCount = await prisma.roomParticipant.count({
        where: { roomId }
      });

      return participantCount < room.maxPlayers;
    } catch (error) {
      console.error('Error checking spectator permissions:', error);
      return false;
    }
  }

  static async upgradeSpectatorToPlayer(userId: string, roomId: string): Promise<boolean> {
    try {
      const participant = await prisma.roomParticipant.findFirst({
        where: {
          userId,
          roomId,
          role: 'SPECTATOR'
        }
      });

      if (!participant) return false;

      await prisma.roomParticipant.update({
        where: {
          id: participant.id
        },
        data: {
          role: 'PLAYER'
        }
      });

      return true;
    } catch (error) {
      console.error('Error upgrading spectator to player:', error);
      return false;
    }
  }
}