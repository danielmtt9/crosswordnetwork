/**
 * Component for real-time activity indicators
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Activity, 
  Users, 
  MessageSquare, 
  Puzzle, 
  Clock, 
  TrendingUp,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Wifi,
  WifiOff,
  RefreshCw
} from 'lucide-react';
import { useRealTimeIndicators } from '@/hooks/useRealTimeIndicators';

interface RealTimeIndicatorsProps {
  roomId: string;
  className?: string;
}

export function RealTimeIndicators({ roomId, className }: RealTimeIndicatorsProps) {
  const {
    indicators,
    isLoading,
    error,
    refresh
  } = useRealTimeIndicators({ roomId });

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Activity className="h-4 w-4 animate-pulse mr-2" />
            <span>Loading indicators...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center text-red-500">
            <AlertCircle className="h-4 w-4 mx-auto mb-2" />
            <p>Failed to load indicators: {error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!indicators) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No indicators available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getActivityLevel = (level: number) => {
    if (level >= 0.8) return { status: 'high', color: 'text-green-500', icon: TrendingUp };
    if (level >= 0.5) return { status: 'medium', color: 'text-yellow-500', icon: Activity };
    if (level >= 0.2) return { status: 'low', color: 'text-orange-500', icon: Clock };
    return { status: 'idle', color: 'text-gray-500', icon: EyeOff };
  };

  const getConnectionStatus = (isConnected: boolean) => {
    return isConnected 
      ? { status: 'connected', color: 'text-green-500', icon: CheckCircle }
      : { status: 'disconnected', color: 'text-red-500', icon: AlertCircle };
  };

  const formatLastActivity = (timestamp: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    
    if (diffSeconds < 10) return 'Just now';
    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    return timestamp.toLocaleTimeString();
  };

  const activityLevel = getActivityLevel(indicators.activityLevel);
  const ActivityIcon = activityLevel.icon;
  
  const connectionStatus = getConnectionStatus(indicators.isConnected);
  const ConnectionIcon = connectionStatus.icon;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            <CardTitle className="text-lg">Real-Time Indicators</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={indicators.isConnected ? 'default' : 'destructive'}>
              {connectionStatus.status}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        <CardDescription>
          Live activity and connection status
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ConnectionIcon className={`h-4 w-4 ${connectionStatus.color}`} />
            <span className="text-sm font-medium">Connection</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm capitalize">{connectionStatus.status}</span>
            {indicators.latency && (
              <Badge variant="outline" className="text-xs">
                {indicators.latency}ms
              </Badge>
            )}
          </div>
        </div>

        {/* Activity Level */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ActivityIcon className={`h-4 w-4 ${activityLevel.color}`} />
              <span className="text-sm font-medium">Activity Level</span>
            </div>
            <Badge variant={activityLevel.status === 'high' ? 'default' : 'secondary'}>
              {activityLevel.status}
            </Badge>
          </div>
          
          <Progress value={indicators.activityLevel * 100} className="h-2" />
        </div>

        {/* Live Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Users className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Active Users</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {indicators.activeUsers}
            </div>
            <div className="text-xs text-muted-foreground">
              {indicators.totalUsers} total
            </div>
          </div>
          
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-center gap-1 mb-1">
              <MessageSquare className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Messages/min</span>
            </div>
            <div className="text-2xl font-bold text-green-600">
              {indicators.messagesPerMinute}
            </div>
            <div className="text-xs text-muted-foreground">
              {indicators.totalMessages} total
            </div>
          </div>
        </div>

        {/* Puzzle Activity */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Puzzle className="h-4 w-4" />
            <span>Puzzle Activity</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-2 bg-muted/50 rounded">
              <div className="text-lg font-bold text-purple-600">
                {indicators.puzzleActionsPerMinute}
              </div>
              <div className="text-xs text-muted-foreground">Actions/min</div>
            </div>
            
            <div className="text-center p-2 bg-muted/50 rounded">
              <div className="text-lg font-bold text-orange-600">
                {indicators.completionRate}%
              </div>
              <div className="text-xs text-muted-foreground">Complete</div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Clock className="h-4 w-4" />
            <span>Recent Activity</span>
          </div>
          
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {indicators.recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center gap-2 text-xs p-2 bg-muted/50 rounded">
                <div className="flex items-center gap-1">
                  {activity.type === 'message' && <MessageSquare className="h-3 w-3 text-blue-500" />}
                  {activity.type === 'puzzle' && <Puzzle className="h-3 w-3 text-green-500" />}
                  {activity.type === 'user' && <Users className="h-3 w-3 text-purple-500" />}
                  <span>{activity.description}</span>
                </div>
                <span className="text-muted-foreground ml-auto">
                  {formatLastActivity(activity.timestamp)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <TrendingUp className="h-4 w-4" />
            <span>Performance</span>
          </div>
          
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-2 bg-muted/50 rounded">
              <div className="text-sm font-bold text-blue-600">
                {indicators.syncLatency}ms
              </div>
              <div className="text-xs text-muted-foreground">Sync</div>
            </div>
            
            <div className="p-2 bg-muted/50 rounded">
              <div className="text-sm font-bold text-green-600">
                {indicators.uptime}%
              </div>
              <div className="text-xs text-muted-foreground">Uptime</div>
            </div>
            
            <div className="p-2 bg-muted/50 rounded">
              <div className="text-sm font-bold text-purple-600">
                {indicators.throughput}
              </div>
              <div className="text-xs text-muted-foreground">Ops/s</div>
            </div>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          {indicators.isTyping && (
            <Badge variant="secondary" className="text-xs">
              <MessageSquare className="h-3 w-3 mr-1" />
              Someone is typing...
            </Badge>
          )}
          
          {indicators.hasNewMessages && (
            <Badge variant="default" className="text-xs">
              <MessageSquare className="h-3 w-3 mr-1" />
              New messages
            </Badge>
          )}
          
          {indicators.hasPuzzleUpdates && (
            <Badge variant="default" className="text-xs">
              <Puzzle className="h-3 w-3 mr-1" />
              Puzzle updated
            </Badge>
          )}
          
          {indicators.hasUserChanges && (
            <Badge variant="default" className="text-xs">
              <Users className="h-3 w-3 mr-1" />
              Users changed
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default RealTimeIndicators;
