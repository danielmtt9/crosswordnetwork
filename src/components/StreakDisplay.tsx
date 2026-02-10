"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flame, Calendar, Target } from "lucide-react";
import { cn } from "@/lib/utils";

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastPlayedDate?: string;
  nextMilestone: number;
  daysUntilMilestone: number;
}

interface StreakDisplayProps {
  userId?: string;
  className?: string;
  compact?: boolean;
}

export function StreakDisplay({ userId, className, compact = false }: StreakDisplayProps) {
  const [streakData, setStreakData] = useState<StreakData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      fetchStreakData();
    }
  }, [userId]);

  const fetchStreakData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/user/stats');
      if (!response.ok) {
        throw new Error('Failed to fetch streak data');
      }
      const data = await response.json();
      
      // Calculate next milestone and days until milestone
      const milestones = [7, 14, 30, 60, 100, 200, 365];
      const nextMilestone = milestones.find(m => m > data.currentStreak) || milestones[milestones.length - 1];
      const daysUntilMilestone = nextMilestone - data.currentStreak;
      
      setStreakData({
        ...data,
        nextMilestone,
        daysUntilMilestone,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader className={compact ? "pb-2" : ""}>
          <CardTitle className={cn("flex items-center gap-2", compact && "text-base")}>
            <Flame className={cn("h-5 w-5", compact && "h-4 w-4")} />
            {compact ? "Streak" : "Daily Streak"}
          </CardTitle>
        </CardHeader>
        <CardContent className={compact ? "pt-0" : ""}>
          <div className="animate-pulse space-y-2">
            <div className="h-6 bg-muted rounded w-1/3"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !streakData) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader className={compact ? "pb-2" : ""}>
          <CardTitle className={cn("flex items-center gap-2", compact && "text-base")}>
            <Flame className={cn("h-5 w-5", compact && "h-4 w-4")} />
            {compact ? "Streak" : "Daily Streak"}
          </CardTitle>
        </CardHeader>
        <CardContent className={compact ? "pt-0" : ""}>
          <p className="text-muted-foreground text-sm">
            {error || "No streak data available"}
          </p>
        </CardContent>
      </Card>
    );
  }

  const getStreakColor = (streak: number) => {
    if (streak >= 100) return "text-red-500";
    if (streak >= 30) return "text-orange-500";
    if (streak >= 7) return "text-yellow-500";
    return "text-gray-500";
  };

  const getStreakIntensity = (streak: number) => {
    if (streak >= 100) return "🔥🔥🔥";
    if (streak >= 30) return "🔥🔥";
    if (streak >= 7) return "🔥";
    return "💤";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (compact) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className={cn("h-4 w-4", getStreakColor(streakData.currentStreak))} />
              <span className="text-sm font-medium">Streak</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn("text-lg font-bold", getStreakColor(streakData.currentStreak))}>
                {streakData.currentStreak}
              </span>
              <span className="text-sm">{getStreakIntensity(streakData.currentStreak)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flame className="h-5 w-5" />
          Daily Streak
        </CardTitle>
        <CardDescription>
          Keep your momentum going with daily puzzle solving
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Streak */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <span className={cn("text-4xl font-bold", getStreakColor(streakData.currentStreak))}>
              {streakData.currentStreak}
            </span>
            <span className="text-2xl">{getStreakIntensity(streakData.currentStreak)}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {streakData.currentStreak === 0 ? "Start your streak today!" : "days in a row"}
          </p>
        </div>

        {/* Streak Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Longest</span>
            </div>
            <p className="text-xl font-bold text-blue-600">
              {streakData.longestStreak}
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Next Goal</span>
            </div>
            <p className="text-xl font-bold text-green-600">
              {streakData.nextMilestone}
            </p>
          </div>
        </div>

        {/* Progress to Next Milestone */}
        {streakData.currentStreak > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Progress to {streakData.nextMilestone} days</span>
              <Badge variant="outline">
                {streakData.daysUntilMilestone} days left
              </Badge>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-orange-500 to-red-500 h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${Math.min((streakData.currentStreak / streakData.nextMilestone) * 100, 100)}%` 
                }}
              />
            </div>
          </div>
        )}

        {/* Last Played */}
        {streakData.lastPlayedDate && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              Last played: {formatDate(streakData.lastPlayedDate)}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
