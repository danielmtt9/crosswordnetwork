/**
 * Component for displaying room persistence status
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Clock, 
  Calendar, 
  Activity, 
  Settings, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw
} from 'lucide-react';
import { useRoomPersistence } from '@/hooks/useRoomPersistence';

interface RoomPersistenceStatusProps {
  roomId: string;
  isHost?: boolean;
  onSettingsClick?: () => void;
  className?: string;
}

export function RoomPersistenceStatus({
  roomId,
  isHost = false,
  onSettingsClick,
  className
}: RoomPersistenceStatusProps) {
  const {
    persistence,
    analytics,
    isLoading,
    error,
    isExpiringSoon,
    isExpired,
    isActive,
    extendPersistence,
    updateActivity,
    refresh
  } = useRoomPersistence({ roomId });

  const handleExtendPersistence = async () => {
    await extendPersistence(7);
  };

  const handleRefresh = async () => {
    await refresh();
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            <span>Loading persistence status...</span>
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
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load persistence status: {error}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!persistence) {
    return null;
  }

  const getStatusBadge = () => {
    if (isExpired) {
      return <Badge variant="destructive">Expired</Badge>;
    }
    if (isExpiringSoon) {
      return <Badge variant="secondary">Expiring Soon</Badge>;
    }
    if (isActive) {
      return <Badge variant="default">Active</Badge>;
    }
    return <Badge variant="outline">Unknown</Badge>;
  };

  const getStatusIcon = () => {
    if (isExpired) {
      return <XCircle className="h-4 w-4 text-red-500" />;
    }
    if (isExpiringSoon) {
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
    if (isActive) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    return <Clock className="h-4 w-4 text-gray-500" />;
  };

  const getTimeRemaining = () => {
    if (isExpired) {
      return 'Room has expired';
    }
    if (persistence.daysRemaining > 0) {
      return `${persistence.daysRemaining} days remaining`;
    }
    if (persistence.hoursRemaining > 0) {
      return `${persistence.hoursRemaining} hours remaining`;
    }
    if (persistence.minutesRemaining > 0) {
      return `${persistence.minutesRemaining} minutes remaining`;
    }
    return 'Expiring soon';
  };

  const getProgressPercentage = () => {
    if (!persistence.expiresAt) return 0;
    
    const totalDays = persistence.persistenceDays;
    const remainingDays = persistence.daysRemaining;
    
    return Math.max(0, Math.min(100, ((totalDays - remainingDays) / totalDays) * 100));
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <CardTitle className="text-lg">Room Persistence</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        <CardDescription>
          {persistence.isPersistent 
            ? `Room will persist for ${persistence.persistenceDays} days`
            : 'Room persistence is disabled'
          }
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Expiration Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Time Remaining</span>
            <span className="text-sm text-muted-foreground">
              {getTimeRemaining()}
            </span>
          </div>
          
          {persistence.expiresAt && (
            <Progress 
              value={getProgressPercentage()} 
              className="h-2"
            />
          )}
        </div>

        {/* Last Activity */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Activity className="h-4 w-4" />
          <span>
            Last activity: {persistence.lastActivityAt.toLocaleString()}
          </span>
        </div>

        {/* Analytics (Host only) */}
        {isHost && analytics && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Calendar className="h-4 w-4" />
              <span>Room Analytics</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Participants:</span>
                <span className="ml-2 font-medium">
                  {analytics.activeParticipants}/{analytics.totalParticipants}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Session:</span>
                <span className="ml-2 font-medium">
                  {analytics.sessionDuration}m
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Messages:</span>
                <span className="ml-2 font-medium">
                  {analytics.messageCount}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Completion:</span>
                <span className="ml-2 font-medium">
                  {analytics.completionRate}%
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Expiration Warning */}
        {isExpiringSoon && !isExpired && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This room will expire soon. Consider extending the persistence period.
            </AlertDescription>
          </Alert>
        )}

        {/* Actions (Host only) */}
        {isHost && (
          <div className="flex gap-2 pt-2">
            {!isExpired && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExtendPersistence}
                disabled={isLoading}
              >
                <Clock className="h-4 w-4 mr-1" />
                Extend 7 Days
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={onSettingsClick}
            >
              <Settings className="h-4 w-4 mr-1" />
              Settings
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default RoomPersistenceStatus;
