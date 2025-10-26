import { useState, useEffect, useCallback, useRef } from 'react';

interface Participant {
  userId: string;
  userName: string;
  userEmail?: string;
  avatarUrl?: string;
  role: 'HOST' | 'PLAYER' | 'SPECTATOR' | 'MODERATOR';
  subscriptionStatus?: 'TRIAL' | 'ACTIVE' | 'CANCELLED' | 'EXPIRED';
  isOnline: boolean;
  userStatus: 'online' | 'offline' | 'away' | 'busy';
  isPremium: boolean;
  isHost: boolean;
  isModerator: boolean;
  joinedAt: string;
  lastSeenAt?: string;
  isActive: boolean;
  connectionQuality?: 'excellent' | 'good' | 'poor' | 'disconnected';
}

interface UseParticipantListProps {
  roomId: string;
  currentUserId: string;
  currentUserRole: 'HOST' | 'PLAYER' | 'SPECTATOR' | 'MODERATOR';
  isHost: boolean;
  isModerator: boolean;
}

interface UseParticipantListReturn {
  participants: Participant[];
  isLoading: boolean;
  error: string | null;
  participantCounts: {
    online: number;
    total: number;
    hosts: number;
    players: number;
    spectators: number;
    moderators: number;
  };
  refreshParticipants: () => Promise<void>;
  kickUser: (userId: string) => Promise<void>;
  promoteToModerator: (userId: string) => Promise<void>;
  demoteFromModerator: (userId: string) => Promise<void>;
  muteUser: (userId: string) => Promise<void>;
  unmuteUser: (userId: string) => Promise<void>;
  sendPrivateMessage: (userId: string) => void;
  viewProfile: (userId: string) => void;
}

export function useParticipantList({
  roomId,
  currentUserId,
  currentUserRole,
  isHost,
  isModerator
}: UseParticipantListProps): UseParticipantListReturn {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const socketRef = useRef<any>(null);

  // Calculate participant counts
  const participantCounts = {
    online: participants.filter(p => p.isOnline).length,
    total: participants.length,
    hosts: participants.filter(p => p.role === 'HOST').length,
    players: participants.filter(p => p.role === 'PLAYER').length,
    spectators: participants.filter(p => p.role === 'SPECTATOR').length,
    moderators: participants.filter(p => p.role === 'MODERATOR').length
  };

  // Fetch participants from API
  const fetchParticipants = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/multiplayer/rooms/${roomId}/participants`);
      if (!response.ok) {
        throw new Error('Failed to fetch participants');
      }

      const data = await response.json();
      setParticipants(data.participants || []);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Error fetching participants:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch participants');
    } finally {
      setIsLoading(false);
    }
  }, [roomId]);

  // Refresh participants
  const refreshParticipants = useCallback(async () => {
    await fetchParticipants();
  }, [fetchParticipants]);

  // Kick user
  const kickUser = useCallback(async (userId: string) => {
    if (!isHost && !isModerator) {
      throw new Error('Insufficient permissions');
    }

    try {
      const response = await fetch(`/api/multiplayer/rooms/${roomId}/participants/${userId}/kick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to kick user');
      }

      // Remove user from local state
      setParticipants(prev => prev.filter(p => p.userId !== userId));
    } catch (err) {
      console.error('Error kicking user:', err);
      throw err;
    }
  }, [roomId, isHost, isModerator]);

  // Promote to moderator
  const promoteToModerator = useCallback(async (userId: string) => {
    if (!isHost) {
      throw new Error('Only hosts can promote users');
    }

    try {
      const response = await fetch(`/api/multiplayer/rooms/${roomId}/participants/${userId}/promote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to promote user');
      }

      // Update user role in local state
      setParticipants(prev => prev.map(p => 
        p.userId === userId 
          ? { ...p, role: 'MODERATOR', isModerator: true }
          : p
      ));
    } catch (err) {
      console.error('Error promoting user:', err);
      throw err;
    }
  }, [roomId, isHost]);

  // Demote from moderator
  const demoteFromModerator = useCallback(async (userId: string) => {
    if (!isHost) {
      throw new Error('Only hosts can demote moderators');
    }

    try {
      const response = await fetch(`/api/multiplayer/rooms/${roomId}/participants/${userId}/demote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to demote user');
      }

      // Update user role in local state
      setParticipants(prev => prev.map(p => 
        p.userId === userId 
          ? { ...p, role: 'SPECTATOR', isModerator: false }
          : p
      ));
    } catch (err) {
      console.error('Error demoting user:', err);
      throw err;
    }
  }, [roomId, isHost]);

  // Mute user
  const muteUser = useCallback(async (userId: string) => {
    if (!isHost && !isModerator) {
      throw new Error('Insufficient permissions');
    }

    try {
      const response = await fetch(`/api/multiplayer/rooms/${roomId}/participants/${userId}/mute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to mute user');
      }

      // In a real implementation, you might want to update local state
      // to show muted status, but this would require additional fields
    } catch (err) {
      console.error('Error muting user:', err);
      throw err;
    }
  }, [roomId, isHost, isModerator]);

  // Unmute user
  const unmuteUser = useCallback(async (userId: string) => {
    if (!isHost && !isModerator) {
      throw new Error('Insufficient permissions');
    }

    try {
      const response = await fetch(`/api/multiplayer/rooms/${roomId}/participants/${userId}/unmute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to unmute user');
      }
    } catch (err) {
      console.error('Error unmuting user:', err);
      throw err;
    }
  }, [roomId, isHost, isModerator]);

  // Send private message
  const sendPrivateMessage = useCallback((userId: string) => {
    // In a real implementation, this would open a private chat
    console.log(`Opening private chat with user ${userId}`);
  }, []);

  // View profile
  const viewProfile = useCallback((userId: string) => {
    // In a real implementation, this would navigate to user profile
    console.log(`Viewing profile for user ${userId}`);
  }, []);

  // Simulate real-time updates
  useEffect(() => {
    const simulateRealTimeUpdates = () => {
      setParticipants(prev => prev.map(participant => {
        // Simulate random status changes
        const shouldChangeStatus = Math.random() < 0.1; // 10% chance
        if (shouldChangeStatus) {
          const statuses: Participant['userStatus'][] = ['online', 'away', 'busy', 'offline'];
          const newStatus = statuses[Math.floor(Math.random() * statuses.length)];
          return {
            ...participant,
            userStatus: newStatus,
            isOnline: newStatus === 'online'
          };
        }

        // Simulate connection quality changes
        const shouldChangeQuality = Math.random() < 0.05; // 5% chance
        if (shouldChangeQuality) {
          const qualities: Participant['connectionQuality'][] = ['excellent', 'good', 'poor', 'disconnected'];
          const newQuality = qualities[Math.floor(Math.random() * qualities.length)];
          return {
            ...participant,
            connectionQuality: newQuality
          };
        }

        return participant;
      }));
    };

    // Set up interval for simulated updates
    intervalRef.current = setInterval(simulateRealTimeUpdates, 5000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Simulate Socket.IO connection
  useEffect(() => {
    // In a real implementation, this would set up Socket.IO listeners
    const handleParticipantJoined = (data: any) => {
      setParticipants(prev => [...prev, data.participant]);
    };

    const handleParticipantLeft = (data: any) => {
      setParticipants(prev => prev.filter(p => p.userId !== data.userId));
    };

    const handleParticipantStatusChanged = (data: any) => {
      setParticipants(prev => prev.map(p => 
        p.userId === data.userId 
          ? { ...p, userStatus: data.userStatus, isOnline: data.isOnline }
          : p
      ));
    };

    const handleParticipantRoleChanged = (data: any) => {
      setParticipants(prev => prev.map(p => 
        p.userId === data.userId 
          ? { ...p, role: data.role, isModerator: data.role === 'MODERATOR' }
          : p
      ));
    };

    // Simulate Socket.IO events
    const simulateSocketEvents = () => {
      const events = [
        { type: 'participant_joined', data: { participant: generateMockParticipant() } },
        { type: 'participant_left', data: { userId: 'user123' } },
        { type: 'participant_status_changed', data: { userId: 'user456', userStatus: 'away', isOnline: true } },
        { type: 'participant_role_changed', data: { userId: 'user789', role: 'MODERATOR' } }
      ];

      const randomEvent = events[Math.floor(Math.random() * events.length)];
      
      switch (randomEvent.type) {
        case 'participant_joined':
          handleParticipantJoined(randomEvent.data);
          break;
        case 'participant_left':
          handleParticipantLeft(randomEvent.data);
          break;
        case 'participant_status_changed':
          handleParticipantStatusChanged(randomEvent.data);
          break;
        case 'participant_role_changed':
          handleParticipantRoleChanged(randomEvent.data);
          break;
      }
    };

    // Simulate Socket.IO events every 10 seconds
    const socketInterval = setInterval(simulateSocketEvents, 10000);

    return () => {
      clearInterval(socketInterval);
    };
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchParticipants();
  }, [fetchParticipants]);

  return {
    participants,
    isLoading,
    error,
    participantCounts,
    refreshParticipants,
    kickUser,
    promoteToModerator,
    demoteFromModerator,
    muteUser,
    unmuteUser,
    sendPrivateMessage,
    viewProfile
  };
}

// Helper function to generate mock participants
function generateMockParticipant(): Participant {
  const roles: Participant['role'][] = ['HOST', 'PLAYER', 'SPECTATOR', 'MODERATOR'];
  const statuses: Participant['userStatus'][] = ['online', 'away', 'busy', 'offline'];
  const qualities: Participant['connectionQuality'][] = ['excellent', 'good', 'poor', 'disconnected'];
  
  return {
    userId: `user-${Math.random().toString(36).substr(2, 9)}`,
    userName: `User ${Math.floor(Math.random() * 1000)}`,
    userEmail: `user${Math.floor(Math.random() * 1000)}@example.com`,
    avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Math.random()}`,
    role: roles[Math.floor(Math.random() * roles.length)],
    subscriptionStatus: Math.random() > 0.5 ? 'ACTIVE' : 'TRIAL',
    isOnline: Math.random() > 0.3,
    userStatus: statuses[Math.floor(Math.random() * statuses.length)],
    isPremium: Math.random() > 0.6,
    isHost: Math.random() > 0.9,
    isModerator: Math.random() > 0.8,
    joinedAt: new Date(Date.now() - Math.random() * 86400000).toISOString(),
    lastSeenAt: new Date(Date.now() - Math.random() * 3600000).toISOString(),
    isActive: Math.random() > 0.2,
    connectionQuality: qualities[Math.floor(Math.random() * qualities.length)]
  };
}
