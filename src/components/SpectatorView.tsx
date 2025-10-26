import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Users, Lock, Unlock, AlertCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';

interface SpectatorViewProps {
  roomId: string;
  puzzleId: string;
  puzzleContent: string;
  participants: Array<{
    userId: string;
    userName: string;
    userRole: 'HOST' | 'PLAYER' | 'SPECTATOR';
    isOnline: boolean;
    isActive: boolean;
  }>;
  currentUserId: string;
  currentUserRole: 'HOST' | 'PLAYER' | 'SPECTATOR';
  onRequestUpgrade: () => void;
  className?: string;
}

export function SpectatorView({
  roomId,
  puzzleId,
  puzzleContent,
  participants,
  currentUserId,
  currentUserRole,
  onRequestUpgrade,
  className = ''
}: SpectatorViewProps) {
  const [isWatching, setIsWatching] = useState(false);
  const [activeCollaborators, setActiveCollaborators] = useState(0);
  const [puzzleProgress, setPuzzleProgress] = useState(0);
  const [recentActivity, setRecentActivity] = useState<Array<{
    userId: string;
    userName: string;
    action: string;
    timestamp: Date;
  }>>([]);

  // Calculate active collaborators
  useEffect(() => {
    const collaborators = participants.filter(p => 
      p.userRole === 'PLAYER' && p.isOnline && p.isActive
    );
    setActiveCollaborators(collaborators.length);
  }, [participants]);

  // Simulate puzzle progress updates (in real implementation, this would come from Socket.IO)
  useEffect(() => {
    const interval = setInterval(() => {
      setPuzzleProgress(prev => {
        const newProgress = prev + Math.random() * 5;
        return Math.min(newProgress, 100);
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // Simulate recent activity updates
  useEffect(() => {
    const activities = [
      'filled in a word',
      'completed a clue',
      'found a solution',
      'helped with a hint',
      'made progress'
    ];

    const interval = setInterval(() => {
      const activePlayers = participants.filter(p => 
        p.userRole === 'PLAYER' && p.isOnline && p.isActive
      );
      
      if (activePlayers.length > 0) {
        const randomPlayer = activePlayers[Math.floor(Math.random() * activePlayers.length)];
        const randomAction = activities[Math.floor(Math.random() * activities.length)];
        
        setRecentActivity(prev => [
          {
            userId: randomPlayer.userId,
            userName: randomPlayer.userName,
            action: randomAction,
            timestamp: new Date()
          },
          ...prev.slice(0, 4) // Keep only last 5 activities
        ]);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [participants]);

  const handleToggleWatching = () => {
    setIsWatching(!isWatching);
  };

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const seconds = Math.floor(diff / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  const isSpectator = currentUserRole === 'SPECTATOR';
  const canUpgrade = currentUserRole === 'SPECTATOR';

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Spectator Status Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Spectator Mode
            {isSpectator && (
              <Badge variant="secondary" className="ml-2">
                Read-Only
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            {isSpectator 
              ? "You're watching the puzzle being solved in real-time"
              : "Switch to spectator mode to watch without participating"
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Watch Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant={isWatching ? "default" : "outline"}
                size="sm"
                onClick={handleToggleWatching}
                className="flex items-center gap-2"
              >
                {isWatching ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {isWatching ? 'Stop Watching' : 'Start Watching'}
              </Button>
              {isWatching && (
                <Badge variant="outline" className="text-green-600 border-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse" />
                  Live
                </Badge>
              )}
            </div>
            
            {canUpgrade && (
              <Button
                variant="default"
                size="sm"
                onClick={onRequestUpgrade}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                Upgrade to Collaborate
              </Button>
            )}
          </div>

          {/* Upgrade Prompt for Spectators */}
          {isSpectator && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                As a spectator, you can watch the puzzle being solved but cannot make changes. 
                Upgrade to a premium account to collaborate in real-time.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Live Activity Feed */}
      {isWatching && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Live Activity
            </CardTitle>
            <CardDescription>
              Real-time updates from active collaborators
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Active Collaborators */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Active Collaborators</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {activeCollaborators} online
                  </Badge>
                  <div className="flex -space-x-2">
                    {participants
                      .filter(p => p.userRole === 'PLAYER' && p.isOnline && p.isActive)
                      .slice(0, 3)
                      .map((participant, index) => (
                        <div
                          key={participant.userId}
                          className="w-6 h-6 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center text-xs text-white font-medium"
                          title={participant.userName}
                        >
                          {participant.userName.charAt(0).toUpperCase()}
                        </div>
                      ))}
                    {activeCollaborators > 3 && (
                      <div className="w-6 h-6 rounded-full bg-gray-400 border-2 border-white flex items-center justify-center text-xs text-white font-medium">
                        +{activeCollaborators - 3}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Puzzle Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Puzzle Progress</span>
                  <span className="text-sm text-muted-foreground">{Math.round(puzzleProgress)}%</span>
                </div>
                <Progress value={puzzleProgress} className="h-2" />
              </div>

              <Separator />

              {/* Recent Activity */}
              <div className="space-y-2">
                <span className="text-sm font-medium">Recent Activity</span>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {recentActivity.length > 0 ? (
                    recentActivity.map((activity, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2 text-sm text-muted-foreground"
                      >
                        <div className="w-2 h-2 bg-blue-500 rounded-full" />
                        <span className="font-medium text-foreground">{activity.userName}</span>
                        <span>{activity.action}</span>
                        <span className="text-xs">{formatTimeAgo(activity.timestamp)}</span>
                      </motion.div>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground italic">
                      No recent activity
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Puzzle Content (Read-Only) */}
      {isWatching && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Puzzle View
              <Badge variant="outline" className="text-orange-600 border-orange-600">
                Read-Only
              </Badge>
            </CardTitle>
            <CardDescription>
              You can see the puzzle but cannot make changes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              {/* Read-only overlay */}
              <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px] z-10 flex items-center justify-center">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-lg border">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Lock className="h-4 w-4" />
                    <span>Read-only mode - Upgrade to collaborate</span>
                  </div>
                </div>
              </div>
              
              {/* Puzzle content */}
              <div 
                className="puzzle-content"
                dangerouslySetInnerHTML={{ __html: puzzleContent }}
                style={{ 
                  pointerEvents: 'none',
                  userSelect: 'none',
                  opacity: 0.7
                }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Spectator Guidelines */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Spectator Guidelines
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
              <span>You can watch the puzzle being solved in real-time</span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
              <span>See live activity from active collaborators</span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
              <span>Track puzzle progress and completion</span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-2 flex-shrink-0" />
              <span>You cannot make changes to the puzzle</span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-2 flex-shrink-0" />
              <span>Upgrade to premium to collaborate</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
