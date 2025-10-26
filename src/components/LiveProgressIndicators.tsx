import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Clock, 
  CheckCircle, 
  Play, 
  Pause, 
  RotateCcw,
  TrendingUp,
  Target,
  Zap,
  Award
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface ParticipantProgress {
  userId: string;
  userName: string;
  userAvatar?: string;
  isOnline: boolean;
  progress: {
    completedCells: number;
    totalCells: number;
    completionPercentage: number;
    currentSection?: string;
    lastActivity: number;
    streak: number;
    hintsUsed: number;
    accuracy: number;
  };
  status: 'active' | 'idle' | 'completed' | 'paused';
  achievements: Array<{
    id: string;
    name: string;
    icon: string;
    timestamp: number;
  }>;
}

interface LiveProgressIndicatorsProps {
  participants: ParticipantProgress[];
  currentUserId: string;
  isVisible: boolean;
  onParticipantClick?: (userId: string) => void;
  className?: string;
}

const statusColors = {
  active: 'text-green-600 bg-green-100',
  idle: 'text-yellow-600 bg-yellow-100',
  completed: 'text-blue-600 bg-blue-100',
  paused: 'text-gray-600 bg-gray-100'
};

const statusIcons = {
  active: Play,
  idle: Clock,
  completed: CheckCircle,
  paused: Pause
};

export function LiveProgressIndicators({
  participants,
  currentUserId,
  isVisible,
  onParticipantClick,
  className
}: LiveProgressIndicatorsProps) {
  const [expandedParticipant, setExpandedParticipant] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'progress' | 'activity' | 'name'>('progress');

  const sortedParticipants = [...participants].sort((a, b) => {
    switch (sortBy) {
      case 'progress':
        return b.progress.completionPercentage - a.progress.completionPercentage;
      case 'activity':
        return b.progress.lastActivity - a.progress.lastActivity;
      case 'name':
        return a.userName.localeCompare(b.userName);
      default:
        return 0;
    }
  });

  const handleParticipantClick = useCallback((userId: string) => {
    if (expandedParticipant === userId) {
      setExpandedParticipant(null);
    } else {
      setExpandedParticipant(userId);
    }
    onParticipantClick?.(userId);
  }, [expandedParticipant, onParticipantClick]);

  const formatLastActivity = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    if (minutes > 0) {
      return `${minutes}m ago`;
    } else {
      return `${seconds}s ago`;
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-blue-500';
    if (percentage >= 75) return 'bg-green-500';
    if (percentage >= 50) return 'bg-yellow-500';
    if (percentage >= 25) return 'bg-orange-500';
    return 'bg-red-500';
  };

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className={cn('space-y-4', className)}
    >
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-lg">Live Progress</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {participants.length} participant{participants.length !== 1 ? 's' : ''}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortBy(sortBy === 'progress' ? 'activity' : 'progress')}
                className="h-6 px-2 text-xs"
              >
                <TrendingUp className="h-3 w-3 mr-1" />
                {sortBy === 'progress' ? 'Progress' : 'Activity'}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Participants List */}
      <div className="space-y-2">
        {sortedParticipants.map((participant) => {
          const StatusIcon = statusIcons[participant.status];
          const isExpanded = expandedParticipant === participant.userId;
          const isCurrentUser = participant.userId === currentUserId;

          return (
            <motion.div
              key={participant.userId}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <Card 
                className={cn(
                  'transition-all duration-200 hover:shadow-md cursor-pointer',
                  isExpanded && 'ring-2 ring-blue-200',
                  isCurrentUser && 'border-blue-200 bg-blue-50/50'
                )}
                onClick={() => handleParticipantClick(participant.userId)}
              >
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {/* Participant Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={participant.userAvatar} />
                          <AvatarFallback className="text-xs">
                            {participant.userName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">
                              {participant.userName}
                            </span>
                            {isCurrentUser && (
                              <Badge variant="outline" className="text-xs">You</Badge>
                            )}
                            <div className={cn(
                              'flex items-center gap-1 px-2 py-1 rounded-full text-xs',
                              statusColors[participant.status]
                            )}>
                              <StatusIcon className="h-3 w-3" />
                              {participant.status}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            <div className={cn(
                              'w-2 h-2 rounded-full',
                              participant.isOnline ? 'bg-green-500' : 'bg-gray-400'
                            )} />
                            {participant.isOnline ? 'Online' : 'Offline'}
                            <span>•</span>
                            <span>Last active {formatLastActivity(participant.progress.lastActivity)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {participant.progress.completionPercentage.toFixed(1)}%
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {participant.progress.completedCells}/{participant.progress.totalCells} cells
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span>Progress</span>
                        <span>{participant.progress.completedCells}/{participant.progress.totalCells}</span>
                      </div>
                      <Progress 
                        value={participant.progress.completionPercentage} 
                        className="h-2"
                      />
                    </div>

                    {/* Expanded Details */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="space-y-3 pt-3 border-t"
                        >
                          {/* Stats Grid */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Zap className="h-3 w-3" />
                                Streak
                              </div>
                              <div className="text-sm font-medium">
                                {participant.progress.streak} cells
                              </div>
                            </div>
                            
                            <div className="space-y-1">
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Target className="h-3 w-3" />
                                Accuracy
                              </div>
                              <div className="text-sm font-medium">
                                {participant.progress.accuracy.toFixed(1)}%
                              </div>
                            </div>
                            
                            <div className="space-y-1">
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                Hints Used
                              </div>
                              <div className="text-sm font-medium">
                                {participant.progress.hintsUsed}
                              </div>
                            </div>
                            
                            <div className="space-y-1">
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Award className="h-3 w-3" />
                                Achievements
                              </div>
                              <div className="text-sm font-medium">
                                {participant.achievements.length}
                              </div>
                            </div>
                          </div>

                          {/* Current Section */}
                          {participant.progress.currentSection && (
                            <div className="space-y-1">
                              <div className="text-xs text-muted-foreground">Current Section</div>
                              <div className="text-sm font-medium">
                                {participant.progress.currentSection}
                              </div>
                            </div>
                          )}

                          {/* Recent Achievements */}
                          {participant.achievements.length > 0 && (
                            <div className="space-y-2">
                              <div className="text-xs text-muted-foreground">Recent Achievements</div>
                              <div className="flex flex-wrap gap-1">
                                {participant.achievements.slice(0, 3).map((achievement) => (
                                  <Badge key={achievement.id} variant="secondary" className="text-xs">
                                    {achievement.name}
                                  </Badge>
                                ))}
                                {participant.achievements.length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{participant.achievements.length - 3} more
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Summary Stats */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600">
                {participants.filter(p => p.status === 'completed').length}
              </div>
              <div className="text-xs text-muted-foreground">Completed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {participants.filter(p => p.status === 'active').length}
              </div>
              <div className="text-xs text-muted-foreground">Active</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-600">
                {Math.round(participants.reduce((acc, p) => acc + p.progress.completionPercentage, 0) / participants.length)}
              </div>
              <div className="text-xs text-muted-foreground">Avg Progress</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Compact version for smaller spaces
export function LiveProgressIndicatorsCompact({
  participants,
  currentUserId,
  isVisible,
  className
}: Omit<LiveProgressIndicatorsProps, 'onParticipantClick'>) {
  if (!isVisible) return null;

  const activeParticipants = participants.filter(p => p.status === 'active');
  const completedParticipants = participants.filter(p => p.status === 'completed');
  const avgProgress = Math.round(
    participants.reduce((acc, p) => acc + p.progress.completionPercentage, 0) / participants.length
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className={cn('space-y-2', className)}
    >
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Live Progress</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{activeParticipants.length} active</span>
              <span>•</span>
              <span>{completedParticipants.length} done</span>
            </div>
          </div>
          
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs mb-1">
              <span>Average Progress</span>
              <span>{avgProgress}%</span>
            </div>
            <Progress value={avgProgress} className="h-1" />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
