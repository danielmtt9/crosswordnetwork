"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { RoomState } from '@/lib/roomPersistence';

interface UseRoomStateOptions {
  roomId: string;
  roomCode: string;
  userId: string;
  userName: string;
  userRole: 'HOST' | 'PLAYER' | 'SPECTATOR';
  autoSave?: boolean;
  saveInterval?: number; // in milliseconds
}

export function useRoomState({
  roomId,
  roomCode,
  userId,
  userName,
  userRole,
  autoSave = true,
  saveInterval = 30000 // 30 seconds
}: UseRoomStateOptions) {
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const stateVersionRef = useRef<number>(0);

  // Load initial room state
  const loadRoomState = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/multiplayer/rooms/${roomCode}/state`);
      if (!response.ok) {
        throw new Error(`Failed to load room state: ${response.status}`);
      }
      
      const state = await response.json();
      setRoomState(state);
      setLastSaved(new Date(state.metadata.lastSaved));
      stateVersionRef.current = state.metadata.version;
      
    } catch (err: any) {
      setError(err.message || 'Failed to load room state');
      console.error('Error loading room state:', err);
    } finally {
      setLoading(false);
    }
  }, [roomCode]);

  // Save room state
  const saveRoomState = useCallback(async (state: Partial<RoomState>) => {
    if (!roomState) return;

    try {
      setIsSaving(true);
      
      const updatedState: RoomState = {
        ...roomState,
        ...state,
        metadata: {
          ...roomState.metadata,
          lastSaved: new Date(),
          version: stateVersionRef.current + 1
        }
      };

      const response = await fetch(`/api/multiplayer/rooms/${roomCode}/state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: updatedState })
      });

      if (!response.ok) {
        throw new Error(`Failed to save room state: ${response.status}`);
      }

      const result = await response.json();
      setRoomState(updatedState);
      setLastSaved(new Date());
      stateVersionRef.current = result.version;
      
    } catch (err: any) {
      setError(err.message || 'Failed to save room state');
      console.error('Error saving room state:', err);
    } finally {
      setIsSaving(false);
    }
  }, [roomCode, roomState]);

  // Update grid state
  const updateGridState = useCallback((cellId: string, value: string) => {
    if (!roomState) return;

    const newGridState = {
      ...roomState.gridState,
      [cellId]: value
    };

    setRoomState(prev => prev ? {
      ...prev,
      gridState: newGridState
    } : null);

    // Debounced save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveRoomState({ gridState: newGridState });
    }, 2000); // Save after 2 seconds of inactivity
  }, [roomState, saveRoomState]);

  // Update participant status
  const updateParticipantStatus = useCallback((participantId: string, isOnline: boolean) => {
    if (!roomState) return;

    const updatedParticipants = roomState.participants.map(p => 
      p.userId === participantId 
        ? { ...p, isOnline, lastSeen: new Date() }
        : p
    );

    setRoomState(prev => prev ? {
      ...prev,
      participants: updatedParticipants
    } : null);

    saveRoomState({ participants: updatedParticipants });
  }, [roomState, saveRoomState]);

  // Add chat message
  const addChatMessage = useCallback((message: {
    id: string;
    userId: string;
    userName: string;
    content: string;
    type: string;
  }) => {
    if (!roomState) return;

    const newMessage = {
      ...message,
      timestamp: new Date()
    };

    const updatedChatHistory = [...roomState.chatHistory, newMessage].slice(-1000); // Keep last 1000 messages

    setRoomState(prev => prev ? {
      ...prev,
      chatHistory: updatedChatHistory
    } : null);

    saveRoomState({ chatHistory: updatedChatHistory });
  }, [roomState, saveRoomState]);

  // Update session state
  const updateSessionState = useCallback((sessionState: Partial<RoomState['sessionState']>) => {
    if (!roomState) return;

    const updatedSessionState = {
      ...roomState.sessionState,
      ...sessionState
    };

    setRoomState(prev => prev ? {
      ...prev,
      sessionState: updatedSessionState
    } : null);

    saveRoomState({ sessionState: updatedSessionState });
  }, [roomState, saveRoomState]);

  // Restore room state from version
  const restoreRoomState = useCallback(async (version: number) => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/multiplayer/rooms/${roomCode}/state`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version })
      });

      if (!response.ok) {
        throw new Error(`Failed to restore room state: ${response.status}`);
      }

      const result = await response.json();
      setRoomState(result.state);
      setLastSaved(new Date());
      stateVersionRef.current = result.state.metadata.version;
      
    } catch (err: any) {
      setError(err.message || 'Failed to restore room state');
      console.error('Error restoring room state:', err);
    } finally {
      setLoading(false);
    }
  }, [roomCode]);

  // Auto-save effect
  useEffect(() => {
    if (!autoSave || !roomState) return;

    const interval = setInterval(() => {
      if (roomState && !isSaving) {
        saveRoomState({});
      }
    }, saveInterval);

    return () => clearInterval(interval);
  }, [autoSave, saveInterval, roomState, isSaving, saveRoomState]);

  // Load initial state
  useEffect(() => {
    loadRoomState();
  }, [loadRoomState]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    roomState,
    loading,
    error,
    lastSaved,
    isSaving,
    updateGridState,
    updateParticipantStatus,
    addChatMessage,
    updateSessionState,
    restoreRoomState,
    saveRoomState,
    loadRoomState
  };
}
