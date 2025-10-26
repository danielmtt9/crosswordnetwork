"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Trophy, Award, Target, Clock, CheckCircle, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface TeamMember {
  userId: string;
  userName: string;
  userAvatar?: string;
  role: 'host' | 'participant';
  joinedAt: string;
  isOnline: boolean;
}

interface TeamAchievement {
  id: string;
  key: string;
  name: string;
  description: string;
  category: 'collaboration' | 'speed' | 'accuracy' | 'completion';
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  points: number;
  iconName: string;
  requirement: {
    type: string;
    threshold: number;
    description: string;
  };
  progress: number;
  isUnlocked: boolean;
  unlockedAt?: string;
  unlockedBy?: string;
}

interface TeamStats {
  totalPuzzlesCompleted: number;
  averageCompletionTime: number;
  averageAccuracy: number;
  totalPlayTime: number;
  achievementsUnlocked: number;
  currentStreak: number;
}

interface TeamAchievementsProps {
  roomId?: string;
  className?: string;
}

export function TeamAchievements({ roomId, className }: TeamAchievementsProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamAchievements, setTeamAchievements] = useState<TeamAchievement[]>([]);
  const [teamStats, setTeamStats] = useState<TeamStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (roomId) {
      fetchTeamData();
    }
  }, [roomId]);

  const fetchTeamData = async () => {
    try {
      setLoading(true);
      const [membersResponse, achievementsResponse, statsResponse] = await Promise.all([
        fetch(`/api/rooms/${roomId}/members`),
        fetch(`/api/rooms/${roomId}/achievements`),
        fetch(`/api/rooms/${roomId}/stats`)
      ]);

      if (!membersResponse.ok || !achievementsResponse.ok || !statsResponse.ok) {
        throw new Error('Failed to fetch team data');
      }

      const [membersData, achievementsData, statsData] = await Promise.all([
        membersResponse.json(),
        achievementsResponse.json(),
        statsResponse.json()
      ]);

      setTeamMembers(membersData.members || []);
      setTeamAchievements(achievementsData.achievements || []);
      setTeamStats(statsData.stats || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getAchievementIcon = (iconName: string) => {
    const icons: Record<string, any> = {
      Trophy: Trophy,
      Award: Award,
      Target: Target,
      Users: Users,
      Star: Star,
      CheckCircle: CheckCircle,
    };
    return icons[iconName] || Trophy;
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'bronze':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-200';
      case 'silver':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-200';
      case 'gold':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200';
      case 'platinum':
        return 'bg-slate-100 text-slate-800 dark:bg-slate-900/20 dark:text-slate-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-200';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'collaboration':
        return <Users className="h-4 w-4" />;
      case 'speed':
        return <Clock className="h-4 w-4" />;
      case 'accuracy':
        return <Target className="h-4 w-4" />;
      case 'completion':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Trophy className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Achievements
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
            <Users className="h-5 w-5" />
            Team Achievements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  const unlockedAchievements = teamAchievements.filter(a => a.isUnlocked);
  const lockedAchievements = teamAchievements.filter(a => !a.isUnlocked);

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Team Achievements
        </CardTitle>
        <CardDescription>
          Collaborative achievements for your team
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Team Stats */}
        {teamStats && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {teamStats.totalPuzzlesCompleted}
              </div>
              <div className="text-xs text-muted-foreground">Puzzles Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {teamStats.averageAccuracy.toFixed(1)}%
              </div>
              <div className="text-xs text-muted-foreground">Avg. Accuracy</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {unlockedAchievements.length}
              </div>
              <div className="text-xs text-muted-foreground">Achievements</div>
            </div>
          </div>
        )}

        {/* Team Members */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Team Members ({teamMembers.length})</h4>
          <div className="flex flex-wrap gap-2">
            {teamMembers.map((member) => (
              <div
                key={member.userId}
                className="flex items-center gap-2 p-2 bg-muted rounded-lg"
              >
                <Avatar className="w-6 h-6">
                  <AvatarImage src={member.userAvatar} alt={member.userName} />
                  <AvatarFallback className="text-xs">
                    {member.userName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{member.userName}</span>
                {member.role === 'host' && (
                  <Badge variant="secondary" className="text-xs">
                    Host
                  </Badge>
                )}
                {member.isOnline && (
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Unlocked Achievements */}
        {unlockedAchievements.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Unlocked Achievements</h4>
            <div className="space-y-2">
              {unlockedAchievements.map((achievement) => {
                const Icon = getAchievementIcon(achievement.iconName);
                return (
                  <div
                    key={achievement.id}
                    className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-800"
                  >
                    <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                      <Icon className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h5 className="font-semibold text-green-800 dark:text-green-200">
                          {achievement.name}
                        </h5>
                        <Badge className={getTierColor(achievement.tier)}>
                          {achievement.tier}
                        </Badge>
                      </div>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        {achievement.description}
                      </p>
                      {achievement.unlockedAt && (
                        <p className="text-xs text-green-600 dark:text-green-400">
                          Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-green-600 dark:text-green-400">
                        +{achievement.points}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Locked Achievements */}
        {lockedAchievements.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">In Progress</h4>
            <div className="space-y-2">
              {lockedAchievements.map((achievement) => {
                const Icon = getAchievementIcon(achievement.iconName);
                const progressPercentage = (achievement.progress / achievement.requirement.threshold) * 100;
                
                return (
                  <div
                    key={achievement.id}
                    className="p-3 border rounded-lg opacity-75"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-muted rounded-lg">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h5 className="font-semibold">{achievement.name}</h5>
                          <Badge variant="outline" className={getTierColor(achievement.tier)}>
                            {achievement.tier}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {achievement.description}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-muted-foreground">
                          +{achievement.points}
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          {achievement.requirement.description}
                        </span>
                        <span className="text-muted-foreground">
                          {achievement.progress} / {achievement.requirement.threshold}
                        </span>
                      </div>
                      <Progress value={progressPercentage} className="h-2" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {teamAchievements.length === 0 && (
          <div className="text-center py-8">
            <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Team Achievements</h3>
            <p className="text-muted-foreground">
              Start solving puzzles together to unlock team achievements!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
