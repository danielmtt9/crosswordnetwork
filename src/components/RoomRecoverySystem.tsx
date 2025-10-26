/**
 * Room recovery system for unexpected disconnections
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Wifi,
  WifiOff,
  Clock,
  Users,
  MessageSquare,
  Puzzle,
  Download,
  Upload
} from 'lucide-react';
import { useRoomRecovery } from '@/hooks/useRoomRecovery';

interface RoomRecoverySystemProps {
  roomId: string;
  className?: string;
}

export function RoomRecoverySystem({ roomId, className }: RoomRecoverySystemProps) {
  const {
    recoveryState,
    isRecovering,
    error,
    startRecovery,
    cancelRecovery,
    checkConnection,
    restoreFromBackup
  } = useRoomRecovery({ roomId });

  const [showDetails, setShowDetails] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONNECTED':
        return 'text-green-500';
      case 'DISCONNECTED':
        return 'text-red-500';
      case 'RECONNECTING':
        return 'text-yellow-500';
      case 'RECOVERING':
        return 'text-blue-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'CONNECTED':
        return CheckCircle;
      case 'DISCONNECTED':
        return WifiOff;
      case 'RECONNECTING':
        return RefreshCw;
      case 'RECOVERING':
        return Download;
      default:
        return AlertTriangle;
    }
  };

  const StatusIcon = getStatusIcon(recoveryState.status);

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusIcon className={`h-5 w-5 ${getStatusColor(recoveryState.status)}`} />
            <CardTitle className="text-lg">Room Recovery</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={recoveryState.status === 'CONNECTED' ? 'default' : 'destructive'}>
              {recoveryState.status}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? 'Hide' : 'Show'} Details
            </Button>
          </div>
        </div>
        <CardDescription>
          Automatic recovery system for unexpected disconnections
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wifi className="h-4 w-4" />
            <span className="text-sm font-medium">Connection Status</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-sm ${getStatusColor(recoveryState.status)}`}>
              {recoveryState.status}
            </span>
            {recoveryState.latency && (
              <Badge variant="outline" className="text-xs">
                {recoveryState.latency}ms
              </Badge>
            )}
          </div>
        </div>

        {/* Recovery Progress */}
        {isRecovering && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Recovery Progress</span>
              <span className="text-sm text-muted-foreground">
                {recoveryState.recoveryProgress}%
              </span>
            </div>
            <Progress value={recoveryState.recoveryProgress} className="h-2" />
          </div>
        )}

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Recovery failed: {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Recovery Actions */}
        <div className="flex flex-wrap gap-2">
          {recoveryState.status === 'DISCONNECTED' && (
            <Button
              onClick={startRecovery}
              disabled={isRecovering}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Start Recovery
            </Button>
          )}

          {isRecovering && (
            <Button
              onClick={cancelRecovery}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Clock className="h-4 w-4" />
              Cancel Recovery
            </Button>
          )}

          <Button
            onClick={checkConnection}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Wifi className="h-4 w-4" />
            Check Connection
          </Button>

          {recoveryState.hasBackup && (
            <Button
              onClick={restoreFromBackup}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              Restore from Backup
            </Button>
          )}
        </div>

        {/* Detailed Information */}
        {showDetails && (
          <div className="space-y-4 pt-4 border-t">
            {/* Connection Details */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Connection Details</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Last Connected:</span>
                  <div>{recoveryState.lastConnected ? new Date(recoveryState.lastConnected).toLocaleString() : 'Never'}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Disconnection Count:</span>
                  <div>{recoveryState.disconnectionCount}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Recovery Attempts:</span>
                  <div>{recoveryState.recoveryAttempts}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Success Rate:</span>
                  <div>{recoveryState.successRate}%</div>
                </div>
              </div>
            </div>

            {/* Room State */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Room State</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>Participants: {recoveryState.participantCount}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  <span>Messages: {recoveryState.messageCount}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Puzzle className="h-4 w-4" />
                  <span>Puzzle Progress: {recoveryState.puzzleProgress}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>Session Time: {recoveryState.sessionDuration}</span>
                </div>
              </div>
            </div>

            {/* Backup Information */}
            {recoveryState.hasBackup && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Backup Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Last Backup:</span>
                    <div>{recoveryState.lastBackup ? new Date(recoveryState.lastBackup).toLocaleString() : 'Never'}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Backup Size:</span>
                    <div>{recoveryState.backupSize}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Backup Status:</span>
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      <span>Available</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Auto Backup:</span>
                    <div>{recoveryState.autoBackup ? 'Enabled' : 'Disabled'}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Recovery History */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Recovery History</h4>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {recoveryState.recoveryHistory.map((entry, index) => (
                  <div key={index} className="flex items-center gap-2 text-xs p-2 bg-muted/50 rounded">
                    <div className="flex items-center gap-1">
                      {entry.status === 'SUCCESS' && <CheckCircle className="h-3 w-3 text-green-500" />}
                      {entry.status === 'FAILED' && <AlertTriangle className="h-3 w-3 text-red-500" />}
                      {entry.status === 'PENDING' && <Clock className="h-3 w-3 text-yellow-500" />}
                      <span>{entry.description}</span>
                    </div>
                    <span className="text-muted-foreground ml-auto">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default RoomRecoverySystem;