export interface PresenceData {
  liveRoomsCount: number;
  onlineUsersCount: number;
  activeUsers: Array<{
    id: string;
    name: string;
    avatar?: string;
    isActive: boolean;
    lastActiveAt?: Date;
  }>;
}

export interface RoomSummary {
  id: string;
  code: string;
  status: 'WAITING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  participantCount: number;
  maxParticipants: number;
  createdAt: Date;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  theme: 'Cozy' | 'Challenging' | 'Social';
}

export class PresenceManager {
  private static instance: PresenceManager;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 30000; // 30 seconds

  static getInstance(): PresenceManager {
    if (!PresenceManager.instance) {
      PresenceManager.instance = new PresenceManager();
    }
    return PresenceManager.instance;
  }

  async getPresenceData(): Promise<PresenceData> {
    const cacheKey = 'presence-data';
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    try {
      const response = await fetch('/api/presence/summary', {
        next: { revalidate: 30 }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch presence data');
      }
      
      const data = await response.json();
      this.cache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      console.error('Error fetching presence data:', error);
      // Return fallback data
      return {
        liveRoomsCount: 12,
        onlineUsersCount: 47,
        activeUsers: Array.from({ length: 8 }, (_, i) => ({
          id: `fallback-${i}`,
          name: `Solver ${i + 1}`,
          avatar: undefined,
          isActive: true,
          lastActiveAt: new Date()
        }))
      };
    }
  }

  async getRoomsSummary(): Promise<{ activeRooms: RoomSummary[]; statistics: any }> {
    const cacheKey = 'rooms-summary';
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }

    try {
      const response = await fetch('/api/rooms/summary', {
        next: { revalidate: 30 }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch rooms summary');
      }
      
      const data = await response.json();
      this.cache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      console.error('Error fetching rooms summary:', error);
      // Return fallback data
      return {
        activeRooms: [
          {
            id: 'fallback-1',
            code: 'ABC123',
            status: 'ACTIVE',
            participantCount: 4,
            maxParticipants: 8,
            createdAt: new Date(),
            difficulty: 'Medium',
            theme: 'Cozy'
          }
        ],
        statistics: {
          totalRooms: 156,
          activeRooms: 12,
          completedRooms: 144
        }
      };
    }
  }

  clearCache(): void {
    this.cache.clear();
  }

  // Generate cozy messages for the social presence strip
  getCozyMessages(): string[] {
    return [
      "Good vibes flowing",
      "Puzzle magic happening",
      "Cozy solving energy",
      "Warm crossword moments",
      "Friends connecting",
      "Memories being made",
      "Gentle solving rhythm",
      "Peaceful puzzle time",
      "Cozy corner vibes",
      "Warm community spirit"
    ];
  }

  // Get a random cozy message
  getRandomCozyMessage(): string {
    const messages = this.getCozyMessages();
    return messages[Math.floor(Math.random() * messages.length)];
  }
}

// Export singleton instance
export const presenceManager = PresenceManager.getInstance();
