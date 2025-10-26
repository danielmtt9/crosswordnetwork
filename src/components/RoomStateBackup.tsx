/**
 * Room state backup and restoration component
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Download,
  Upload,
  Trash2,
  RefreshCw,
  Clock,
  CheckCircle,
  AlertTriangle,
  Database,
  Archive,
  Restore
} from 'lucide-react';
import { useRoomBackup } from '@/hooks/useRoomBackup';

interface RoomStateBackupProps {
  roomId: string;
  className?: string;
}

export function RoomStateBackup({ roomId, className }: RoomStateBackupProps) {
  const {
    backups,
    isLoading,
    error,
    createBackup,
    restoreBackup,
    deleteBackup,
    downloadBackup,
    isCreating,
    isRestoring,
    isDeleting
  } = useRoomBackup({ roomId });

  const [selectedBackup, setSelectedBackup] = useState<string | null>(null);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleCreateBackup = async () => {
    try {
      await createBackup();
    } catch (err) {
      console.error('Failed to create backup:', err);
    }
  };

  const handleRestoreBackup = async (backupId: string) => {
    try {
      await restoreBackup(backupId);
      setShowRestoreDialog(false);
      setSelectedBackup(null);
    } catch (err) {
      console.error('Failed to restore backup:', err);
    }
  };

  const handleDeleteBackup = async (backupId: string) => {
    try {
      await deleteBackup(backupId);
      setShowDeleteDialog(false);
      setSelectedBackup(null);
    } catch (err) {
      console.error('Failed to delete backup:', err);
    }
  };

  const handleDownloadBackup = async (backupId: string) => {
    try {
      await downloadBackup(backupId);
    } catch (err) {
      console.error('Failed to download backup:', err);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString();
  };

  const getBackupStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'text-green-500';
      case 'IN_PROGRESS':
        return 'text-blue-500';
      case 'FAILED':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getBackupStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return CheckCircle;
      case 'IN_PROGRESS':
        return RefreshCw;
      case 'FAILED':
        return AlertTriangle;
      default:
        return Clock;
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Database className="h-4 w-4 animate-pulse mr-2" />
            <span>Loading backups...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Failed to load backups: {error}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            <CardTitle className="text-lg">Room State Backup</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleCreateBackup}
              disabled={isCreating}
              className="flex items-center gap-2"
            >
              {isCreating ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Archive className="h-4 w-4" />
              )}
              {isCreating ? 'Creating...' : 'Create Backup'}
            </Button>
          </div>
        </div>
        <CardDescription>
          Manage room state backups and restoration
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Backup List */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Available Backups</h4>
          {backups.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No backups available</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {backups.map((backup) => {
                const StatusIcon = getBackupStatusIcon(backup.status);
                return (
                  <div key={backup.id} className="flex items-center gap-3 p-3 border rounded-lg">
                    <StatusIcon className={`h-4 w-4 ${getBackupStatusColor(backup.status)}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{backup.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {backup.status}
                        </Badge>
                        {backup.isAuto && (
                          <Badge variant="secondary" className="text-xs">
                            Auto
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(backup.createdAt)} • {formatFileSize(backup.size)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadBackup(backup.id)}
                        disabled={backup.status !== 'COMPLETED'}
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedBackup(backup.id);
                          setShowRestoreDialog(true);
                        }}
                        disabled={backup.status !== 'COMPLETED' || isRestoring}
                      >
                        <Restore className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedBackup(backup.id);
                          setShowDeleteDialog(true);
                        }}
                        disabled={isDeleting}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Backup Progress */}
        {isCreating && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Creating Backup</span>
              <span className="text-sm text-muted-foreground">Please wait...</span>
            </div>
            <Progress value={undefined} className="h-2" />
          </div>
        )}

        {/* Restore Progress */}
        {isRestoring && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Restoring Backup</span>
              <span className="text-sm text-muted-foreground">Please wait...</span>
            </div>
            <Progress value={undefined} className="h-2" />
          </div>
        )}

        {/* Restore Confirmation Dialog */}
        <AlertDialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Restore Backup</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to restore this backup? This will overwrite the current room state
                and cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => selectedBackup && handleRestoreBackup(selectedBackup)}
                disabled={isRestoring}
              >
                {isRestoring ? 'Restoring...' : 'Restore'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Backup</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this backup? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => selectedBackup && handleDeleteBackup(selectedBackup)}
                disabled={isDeleting}
                className="bg-red-500 hover:bg-red-600"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

export default RoomStateBackup;