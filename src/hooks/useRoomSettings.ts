/**
 * Hook for managing room settings
 */

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

interface RoomSettings {
  roomName: string;
  description: string;
  maxParticipants: number;
  isPublic: boolean;
  allowSpectators: boolean;
  defaultRole: 'PLAYER' | 'SPECTATOR';
  autoPromote: boolean;
  requireApproval: boolean;
  allowRoleChanges: boolean;
  enableModeration: boolean;
  moderationLevel: 'LENIENT' | 'MODERATE' | 'STRICT';
  maxWarnings: number;
  autoModeration: boolean;
  roomTimeout: number;
  backupInterval: number;
  enableAnalytics: boolean;
  enableLogging: boolean;
  customSettings: Record<string, any>;
}

interface UseRoomSettingsProps {
  roomId: string;
}

export function useRoomSettings({ roomId }: UseRoomSettingsProps) {
  const [settings, setSettings] = useState<RoomSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch(`/api/multiplayer/rooms/${roomId}/settings`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch settings: ${response.statusText}`);
      }

      const data = await response.json();
      setSettings(data);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching room settings:', err);
    } finally {
      setIsLoading(false);
    }
  }, [roomId]);

  const updateSettings = useCallback(async (newSettings: Partial<RoomSettings>) => {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/multiplayer/rooms/${roomId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update settings');
      }

      const data = await response.json();
      setSettings(prev => prev ? { ...prev, ...data } : data);
      
      toast.success('Settings updated successfully!');
    } catch (err: any) {
      setError(err.message);
      toast.error(`Failed to update settings: ${err.message}`);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [roomId]);

  const resetSettings = useCallback(async () => {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/multiplayer/rooms/${roomId}/settings/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to reset settings');
      }

      const data = await response.json();
      setSettings(data);
      
      toast.success('Settings reset to defaults!');
    } catch (err: any) {
      setError(err.message);
      toast.error(`Failed to reset settings: ${err.message}`);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [roomId]);

  const validateSettings = useCallback((settings: Partial<RoomSettings>) => {
    const errors: string[] = [];

    if (settings.maxParticipants && (settings.maxParticipants < 2 || settings.maxParticipants > 50)) {
      errors.push('Maximum participants must be between 2 and 50');
    }

    if (settings.roomTimeout && (settings.roomTimeout < 5 || settings.roomTimeout > 1440)) {
      errors.push('Room timeout must be between 5 and 1440 minutes');
    }

    if (settings.backupInterval && (settings.backupInterval < 1 || settings.backupInterval > 60)) {
      errors.push('Backup interval must be between 1 and 60 minutes');
    }

    if (settings.maxWarnings && (settings.maxWarnings < 1 || settings.maxWarnings > 10)) {
      errors.push('Maximum warnings must be between 1 and 10');
    }

    return errors;
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return {
    settings,
    isLoading,
    error,
    isSaving,
    updateSettings,
    resetSettings,
    validateSettings,
    refreshSettings: fetchSettings
  };
}