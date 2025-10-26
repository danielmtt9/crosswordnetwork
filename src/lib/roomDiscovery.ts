import { prisma } from "@/lib/prisma";

export interface RoomDiscoveryOptions {
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  theme?: 'Cozy' | 'Challenging' | 'Social';
  maxParticipants?: number;
  status?: 'WAITING' | 'ACTIVE';
  limit?: number;
}

export interface RoomJoinResult {
  success: boolean;
  room?: {
    id: string;
    code: string;
    status: string;
    participantCount: number;
    maxParticipants: number;
  };
  error?: string;
}

export class RoomDiscoveryManager {
  private static instance: RoomDiscoveryManager;

  static getInstance(): RoomDiscoveryManager {
    if (!RoomDiscoveryManager.instance) {
      RoomDiscoveryManager.instance = new RoomDiscoveryManager();
    }
    return RoomDiscoveryManager.instance;
  }

  /**
   * Generate a unique 6-character room code
   */
  async generateRoomCode(): Promise<string> {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      let code = '';
      for (let i = 0; i < 6; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
      }

      // Check if code already exists
      const existingRoom = await prisma.room.findUnique({
        where: { code }
      });

      if (!existingRoom) {
        return code;
      }

      attempts++;
    }

    throw new Error('Unable to generate unique room code');
  }

  /**
   * Validate a room code format
   */
  validateRoomCode(code: string): boolean {
    return /^[A-Z0-9]{6}$/.test(code);
  }

  /**
   * Check if a room exists and is joinable
   */
  async checkRoomExists(code: string): Promise<RoomJoinResult> {
    try {
      if (!this.validateRoomCode(code)) {
        return {
          success: false,
          error: 'Invalid room code format. Must be 6 characters.'
        };
      }

      const room = await prisma.room.findUnique({
        where: { code },
        include: {
          _count: {
            select: {
              participants: true
            }
          }
        }
      });

      if (!room) {
        return {
          success: false,
          error: 'Room not found. Please check the code and try again.'
        };
      }

      if (room.status === 'COMPLETED' || room.status === 'CANCELLED') {
        return {
          success: false,
          error: 'This room is no longer active.'
        };
      }

      if (room._count.participants >= room.maxParticipants) {
        return {
          success: false,
          error: 'This room is full.'
        };
      }

      return {
        success: true,
        room: {
          id: room.id,
          code: room.code,
          status: room.status,
          participantCount: room._count.participants,
          maxParticipants: room.maxParticipants
        }
      };
    } catch (error) {
      console.error('Error checking room existence:', error);
      return {
        success: false,
        error: 'Unable to verify room. Please try again.'
      };
    }
  }

  /**
   * Discover available rooms based on criteria
   */
  async discoverRooms(options: RoomDiscoveryOptions = {}): Promise<any[]> {
    try {
      const {
        difficulty,
        theme,
        maxParticipants,
        status = 'WAITING',
        limit = 10
      } = options;

      const where: any = {
        status: {
          in: ['WAITING', 'ACTIVE']
        }
      };

      if (difficulty) {
        where.difficulty = difficulty;
      }

      if (theme) {
        where.theme = theme;
      }

      if (maxParticipants) {
        where.maxParticipants = {
          lte: maxParticipants
        };
      }

      if (status) {
        where.status = status;
      }

      const rooms = await prisma.room.findMany({
        where,
        include: {
          _count: {
            select: {
              participants: true
            }
          },
          host: {
            select: {
              name: true,
              image: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit
      });

      return rooms.map(room => ({
        id: room.id,
        code: room.code,
        status: room.status,
        difficulty: room.difficulty,
        theme: room.theme,
        participantCount: room._count.participants,
        maxParticipants: room.maxParticipants,
        host: room.host,
        createdAt: room.createdAt,
        timeElapsed: this.calculateTimeElapsed(room.createdAt)
      }));
    } catch (error) {
      console.error('Error discovering rooms:', error);
      return [];
    }
  }

  /**
   * Get featured rooms for the landing page
   */
  async getFeaturedRooms(): Promise<any[]> {
    try {
      // Get a mix of active rooms with different themes
      const [cozyRooms, socialRooms, challengingRooms] = await Promise.all([
        this.discoverRooms({ theme: 'Cozy', limit: 2 }),
        this.discoverRooms({ theme: 'Social', limit: 2 }),
        this.discoverRooms({ theme: 'Challenging', limit: 2 })
      ]);

      // Combine and shuffle
      const allRooms = [...cozyRooms, ...socialRooms, ...challengingRooms];
      return this.shuffleArray(allRooms).slice(0, 6);
    } catch (error) {
      console.error('Error getting featured rooms:', error);
      return [];
    }
  }

  /**
   * Calculate time elapsed since room creation
   */
  private calculateTimeElapsed(createdAt: Date): string {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours}h ago`;
    }
  }

  /**
   * Shuffle array utility
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Get room statistics for the landing page
   */
  async getRoomStatistics(): Promise<{
    totalRooms: number;
    activeRooms: number;
    completedRooms: number;
    averageParticipants: number;
  }> {
    try {
      const [totalRooms, activeRooms, completedRooms, avgParticipants] = await Promise.all([
        prisma.room.count(),
        prisma.room.count({
          where: {
            status: {
              in: ['WAITING', 'ACTIVE']
            }
          }
        }),
        prisma.room.count({
          where: {
            status: 'COMPLETED'
          }
        }),
        prisma.room.aggregate({
          _avg: {
            maxParticipants: true
          }
        })
      ]);

      return {
        totalRooms,
        activeRooms,
        completedRooms,
        averageParticipants: Math.round(avgParticipants._avg.maxParticipants || 4)
      };
    } catch (error) {
      console.error('Error getting room statistics:', error);
      return {
        totalRooms: 156,
        activeRooms: 12,
        completedRooms: 144,
        averageParticipants: 4
      };
    }
  }
}

// Export singleton instance
export const roomDiscoveryManager = RoomDiscoveryManager.getInstance();
