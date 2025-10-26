/**
 * Hook for managing room state backup and restoration
 */

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

interface RoomBackup {
  id: string;
  name: string;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'FAILED';
  size: number;
  createdAt: Date;
  isAuto: boolean;
  description?: string;
}

interface UseRoomBackupProps {
  roomId: string;
}

export function useRoomBackup({ roomId }: UseRoomBackupProps) {
  const [backups, setBackups] = useState<RoomBackup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchBackups = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch(`/api/multiplayer/rooms/${roomId}/backup`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch backups: ${response.statusText}`);
      }

      const data = await response.json();
      setBackups(data.backups || []);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching room backups:', err);
    } finally {
      setIsLoading(false);
    }
  }, [roomId]);

  const createBackup = useCallback(async (name?: string) => {
    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch(`/api/multiplayer/rooms/${roomId}/backup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create backup');
      }

      const data = await response.json();
      
      // Add new backup to list
      setBackups(prev => [data.backup, ...prev]);
      
      toast.success('Backup created successfully!');
      return data.backup;
    } catch (err: any) {
      setError(err.message);
      toast.error(`Failed to create backup: ${err.message}`);
      throw err;
    } finally {
      setIsCreating(false);
    }
  }, [roomId]);

  const restoreBackup = useCallback(async (backupId: string) => {
    setIsRestoring(true);
    setError(null);

    try {
      const response = await fetch(`/api/multiplayer/rooms/${roomId}/backup/${backupId}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to restore backup');
      }

      const data = await response.json();
      
      toast.success('Backup restored successfully!');
      return data;
    } catch (err: any) {
      setError(err.message);
      toast.error(`Failed to restore backup: ${err.message}`);
      throw err;
    } finally {
      setIsRestoring(false);
    }
  }, [roomId]);

  const deleteBackup = useCallback(async (backupId: string) => {
    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/multiplayer/rooms/${roomId}/backup/${backupId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete backup');
      }

      // Remove backup from list
      setBackups(prev => prev.filter(backup => backup.id !== backupId));
      
      toast.success('Backup deleted successfully!');
    } catch (err: any) {
      setError(err.message);
      toast.error(`Failed to delete backup: ${err.message}`);
      throw err;
    } finally {
      setIsDeleting(false);
    }
  }, [roomId]);

  const downloadBackup = useCallback(async (backupId: string) => {
    try {
      const response = await fetch(`/api/multiplayer/rooms/${roomId}/backup/${backupId}/download`);
      
      if (!response.ok) {
        throw new Error('Failed to download backup');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `room-backup-${backupId}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Backup downloaded successfully!');
    } catch (err: any) {
      toast.error(`Failed to download backup: ${err.message}`);
      throw err;
    }
  }, [roomId]);

  const getBackupInfo = useCallback(async (backupId: string) => {
    try {
      const response = await fetch(`/api/multiplayer/rooms/${roomId}/backup/${backupId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch backup info');
      }

      const data = await response.json();
      return data;
    } catch (err: any) {
      console.error('Error fetching backup info:', err);
      throw err;
    }
  }, [roomId]);

  const validateBackup = useCallback(async (backupId: string) => {
    try {
      const response = await fetch(`/api/multiplayer/rooms/${roomId}/backup/${backupId}/validate`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('Backup validation failed');
      }

      const data = await response.json();
      return data;
    } catch (err: any) {
      console.error('Error validating backup:', err);
      throw err;
    }
  }, [roomId]);

  useEffect(() => {
    fetchBackups();
  }, [fetchBackups]);

  return {
    backups,
    isLoading,
    error,
    isCreating,
    isRestoring,
    isDeleting,
    createBackup,
    restoreBackup,
    deleteBackup,
    downloadBackup,
    getBackupInfo,
    validateBackup,
    refreshBackups: fetchBackups
  };
}
