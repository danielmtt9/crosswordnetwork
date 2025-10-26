"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Medal, Award, Users, TrendingUp, TrendingDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface Friend {
  id: string;
  name: string;
  image?: string;
  isOnline: boolean;
  lastActiveAt: string;
}

interface FriendStats {
  userId: string;
  userName: string;
  userAvatar?: string;
  totalScore: number;
  puzzlesCompleted: number;
  currentStreak: number;
  achievementPoints: number;
  rank: number;
  rankChange: number; // positive = up, negative = down, 0 = no change
}

interface FriendLeaderboardProps {
  userId?: string;
  className?: string;
}

export function FriendLeaderboard({ userId, className }: FriendLeaderboardProps) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendStats, setFriendStats] = useState<FriendStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<'score' | 'puzzles' | 'streak' | 'achievements'>('score');

  useEffect(() => {
    if (userId) {
      fetchFriendData();
    }
  }, [userId, selectedMetric]);

  const fetchFriendData = async () => {
    try {
      setLoading(true);
      const [friendsResponse, statsResponse] = await Promise.all([
        fetch('/api/friends'),
        fetch(`/api/friends/leaderboard?metric=${selectedMetric}`)
      ]);

      if (!friendsResponse.ok || !statsResponse.ok) {
        throw new Error('Failed to fetch friend data');
      }

      const [friendsData, statsData] = await Promise.all([
        friendsResponse.json(),
        statsResponse.json()
      ]);

      setFriends(friendsData.friends || []);
      setFriendStats(statsData.stats || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-4 h-4 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-4 h-4 text-gray-400" />;
    if (rank === 3) return <Award className="w-4 h-4 text-amber-600" />;
    return null;
  };

  const getRankChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="w-3 h-3 text-green-500" />;
    if (change < 0) return <TrendingDown className="w-3 h-3 text-red-500" />;
    return null;
  };

  const formatValue = (value: number, metric: string) => {
    switch (metric) {
      case 'score':
        return value.toLocaleString();
      case 'puzzles':
        return value.toString();
      case 'streak':
        return `${value} days`;
      case 'achievements':
        return value.toString();
      default:
        return value.toString();
    }
  };

  const getMetricLabel = (metric: string) => {
    switch (metric) {
      case 'score':
        return 'Total Score';
      case 'puzzles':
        return 'Puzzles Completed';
      case 'streak':
        return 'Current Streak';
      case 'achievements':
        return 'Achievement Points';
      default:
        return 'Score';
    }
  };

  if (loading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Friend Leaderboard
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
            Friend Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (friends.length === 0) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Friend Leaderboard
          </CardTitle>
          <CardDescription>
            Compare your progress with friends
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Friends Yet</h3>
          <p className="text-muted-foreground mb-4">
            Add friends to see how you compare in solving puzzles!
          </p>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Friends
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Friend Leaderboard
        </CardTitle>
        <CardDescription>
          Compare your progress with friends
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Metric Selector */}
        <div className="flex gap-2">
          {(['score', 'puzzles', 'streak', 'achievements'] as const).map((metric) => (
            <Button
              key={metric}
              variant={selectedMetric === metric ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedMetric(metric)}
              className="text-xs"
            >
              {getMetricLabel(metric)}
            </Button>
          ))}
        </div>

        {/* Leaderboard */}
        <div className="space-y-2">
          {friendStats.map((friend, index) => (
            <div
              key={friend.userId}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg transition-colors",
                friend.userId === userId
                  ? "bg-primary/10 border border-primary/20"
                  : "hover:bg-muted/50"
              )}
            >
              {/* Rank */}
              <div className="flex items-center gap-2 w-8">
                {getRankIcon(friend.rank) || (
                  <span className="text-sm font-bold text-muted-foreground">
                    {friend.rank}
                  </span>
                )}
              </div>

              {/* Avatar */}
              <Avatar className="w-8 h-8">
                <AvatarImage src={friend.userAvatar} alt={friend.userName} />
                <AvatarFallback className="text-xs">
                  {friend.userName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              {/* Name and Status */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">
                    {friend.userName}
                  </span>
                  {friend.userId === userId && (
                    <Badge variant="outline" className="text-xs">
                      You
                    </Badge>
                  )}
                  {friends.find(f => f.id === friend.userId)?.isOnline && (
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                  )}
                </div>
              </div>

              {/* Value */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono font-medium">
                  {formatValue(friend[selectedMetric === 'score' ? 'totalScore' : 
                    selectedMetric === 'puzzles' ? 'puzzlesCompleted' :
                    selectedMetric === 'streak' ? 'currentStreak' : 'achievementPoints'], selectedMetric)}
                </span>
                {friend.rankChange !== 0 && (
                  <div className="flex items-center gap-1">
                    {getRankChangeIcon(friend.rankChange)}
                    <span className="text-xs text-muted-foreground">
                      {Math.abs(friend.rankChange)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Add Friends Button */}
        <div className="pt-4 border-t">
          <Button variant="outline" className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add More Friends
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
