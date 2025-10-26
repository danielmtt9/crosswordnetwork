"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Clock, Target, Users, Zap, Award, Calendar, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface Challenge {
  id: string;
  name: string;
  description: string;
  type: 'puzzle_count' | 'speed' | 'accuracy' | 'streak';
  target: number;
  duration: number; // in hours
  participants: ChallengeParticipant[];
  status: 'upcoming' | 'active' | 'completed';
  startTime: string;
  endTime: string;
  reward: {
    points: number;
    badge?: string;
  };
}

interface ChallengeParticipant {
  userId: string;
  userName: string;
  userAvatar?: string;
  progress: number;
  rank?: number;
  isCurrentUser: boolean;
}

interface CompetitiveChallengeProps {
  userId?: string;
  className?: string;
}

export function CompetitiveChallenge({ userId, className }: CompetitiveChallengeProps) {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);

  useEffect(() => {
    if (userId) {
      fetchChallenges();
    }
  }, [userId]);

  const fetchChallenges = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/challenges');
      if (!response.ok) {
        throw new Error('Failed to fetch challenges');
      }
      const data = await response.json();
      setChallenges(data.challenges || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const joinChallenge = async (challengeId: string) => {
    try {
      const response = await fetch(`/api/challenges/${challengeId}/join`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Failed to join challenge');
      }
      await fetchChallenges();
    } catch (err) {
      console.error('Error joining challenge:', err);
    }
  };

  const getChallengeIcon = (type: string) => {
    switch (type) {
      case 'puzzle_count':
        return <Target className="h-4 w-4" />;
      case 'speed':
        return <Zap className="h-4 w-4" />;
      case 'accuracy':
        return <Award className="h-4 w-4" />;
      case 'streak':
        return <Trophy className="h-4 w-4" />;
      default:
        return <Target className="h-4 w-4" />;
    }
  };

  const getChallengeTypeLabel = (type: string) => {
    switch (type) {
      case 'puzzle_count':
        return 'Puzzle Count';
      case 'speed':
        return 'Speed Challenge';
      case 'accuracy':
        return 'Accuracy Challenge';
      case 'streak':
        return 'Streak Challenge';
      default:
        return 'Challenge';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200';
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200';
      case 'completed':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-200';
    }
  };

  const formatDuration = (hours: number) => {
    if (hours < 24) {
      return `${hours}h`;
    }
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  };

  const formatTimeRemaining = (endTime: string) => {
    const now = new Date();
    const end = new Date(endTime);
    const diff = end.getTime() - now.getTime();
    
    if (diff <= 0) return 'Ended';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m left`;
    }
    return `${minutes}m left`;
  };

  if (loading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Competitive Challenges
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Competitive Challenges
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Competitive Challenges
        </CardTitle>
        <CardDescription>
          Compete with friends in timed challenges
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {challenges.length === 0 ? (
          <div className="text-center py-8">
            <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Active Challenges</h3>
            <p className="text-muted-foreground mb-4">
              Create a challenge or wait for friends to invite you!
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Challenge
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {challenges.map((challenge) => (
              <div
                key={challenge.id}
                className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => setSelectedChallenge(challenge)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      {getChallengeIcon(challenge.type)}
                    </div>
                    <div>
                      <h3 className="font-semibold">{challenge.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {getChallengeTypeLabel(challenge.type)}
                      </p>
                    </div>
                  </div>
                  <Badge className={getStatusColor(challenge.status)}>
                    {challenge.status}
                  </Badge>
                </div>

                <p className="text-sm text-muted-foreground mb-3">
                  {challenge.description}
                </p>

                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Target className="h-3 w-3" />
                      <span>Target: {challenge.target}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{formatDuration(challenge.duration)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      <span>{challenge.participants.length} participants</span>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {challenge.status === 'active' && formatTimeRemaining(challenge.endTime)}
                  </div>
                </div>

                {/* Progress for current user */}
                {challenge.participants.some(p => p.isCurrentUser) && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Your Progress</span>
                      <span>
                        {challenge.participants.find(p => p.isCurrentUser)?.progress || 0} / {challenge.target}
                      </span>
                    </div>
                    <Progress
                      value={((challenge.participants.find(p => p.isCurrentUser)?.progress || 0) / challenge.target) * 100}
                      className="h-2"
                    />
                  </div>
                )}

                {/* Top Participants */}
                {challenge.participants.length > 0 && (
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-sm text-muted-foreground">Top:</span>
                    {challenge.participants
                      .sort((a, b) => (b.progress || 0) - (a.progress || 0))
                      .slice(0, 3)
                      .map((participant, index) => (
                        <div key={participant.userId} className="flex items-center gap-1">
                          <Avatar className="w-6 h-6">
                            <AvatarImage src={participant.userAvatar} alt={participant.userName} />
                            <AvatarFallback className="text-xs">
                              {participant.userName.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {index === 0 && <Trophy className="w-3 h-3 text-yellow-500" />}
                        </div>
                      ))}
                  </div>
                )}

                {/* Join Button */}
                {challenge.status === 'upcoming' && !challenge.participants.some(p => p.isCurrentUser) && (
                  <Button
                    size="sm"
                    className="mt-3"
                    onClick={(e) => {
                      e.stopPropagation();
                      joinChallenge(challenge.id);
                    }}
                  >
                    Join Challenge
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Create Challenge Button */}
        <div className="pt-4 border-t">
          <Button variant="outline" className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Create New Challenge
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
