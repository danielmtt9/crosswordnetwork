/**
 * Hook for managing host ownership transfer
 */

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

interface Participant {
  id: string;
  name: string;
  avatar?: string;
  role: 'HOST' | 'MODERATOR' | 'PLAYER' | 'SPECTATOR';
  isActive: boolean;
  lastSeen?: Date;
}

interface UseHostTransferProps {
  roomId: string;
}

export function useHostTransfer({ roomId }: UseHostTransferProps) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTransferring, setIsTransferring] = useState(false);

  const fetchParticipants = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch(`/api/multiplayer/rooms/${roomId}/participants`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch participants: ${response.statusText}`);
      }

      const data = await response.json();
      setParticipants(data.participants || []);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching participants:', err);
    } finally {
      setIsLoading(false);
    }
  }, [roomId]);

  const transferHost = useCallback(async (newHostId: string) => {
    setIsTransferring(true);
    setError(null);

    try {
      const response = await fetch(`/api/multiplayer/rooms/${roomId}/host/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newHostId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Host transfer failed');
      }

      const data = await response.json();
      
      // Update participants list
      setParticipants(prev => 
        prev.map(p => ({
          ...p,
          role: p.id === newHostId ? 'HOST' : p.role === 'HOST' ? 'PLAYER' : p.role
        }))
      );

      toast.success(`Host ownership transferred to ${data.newHostName}`);
      
      return data;
    } catch (err: any) {
      setError(err.message);
      toast.error(`Host transfer failed: ${err.message}`);
      throw err;
    } finally {
      setIsTransferring(false);
    }
  }, [roomId]);

  useEffect(() => {
    fetchParticipants();
  }, [fetchParticipants]);

  return {
    participants,
    isLoading,
    error,
    isTransferring,
    transferHost,
    refreshParticipants: fetchParticipants
  };
}
