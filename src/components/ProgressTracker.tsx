"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Target, TrendingUp, Calendar, Award } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProgressData {
  totalPuzzlesCompleted: number;
  totalPuzzlesStarted: number;
  averageAccuracy: number;
  averageCompletionTime: number;
  currentStreak: number;
  longestStreak: number;
  achievementPoints: number;
  globalRank?: number;
  lastPlayedDate?: string;
}

interface ProgressTrackerProps {
  userId?: string;
  className?: string;
}

export function ProgressTracker({ userId, className }: ProgressTrackerProps) {
  const [progressData, setProgressData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      fetchProgressData();
    }
  }, [userId]);

  const fetchProgressData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/user/stats');
      if (!response.ok) {
        throw new Error('Failed to fetch progress data');
      }
      const data = await response.json();
      setProgressData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Progress Overview
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

  if (error || !progressData) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Progress Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            {error || "No progress data available"}
          </p>
        </CardContent>
      </Card>
    );
  }

  const completionRate = progressData.totalPuzzlesStarted > 0 
    ? (progressData.totalPuzzlesCompleted / progressData.totalPuzzlesStarted) * 100 
    : 0;

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Progress Overview
        </CardTitle>
        <CardDescription>
          Track your crossword solving journey
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Completion Rate */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Completion Rate</span>
            <Badge variant="outline">
              {progressData.totalPuzzlesCompleted} / {progressData.totalPuzzlesStarted}
            </Badge>
          </div>
          <Progress value={completionRate} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {completionRate.toFixed(1)}% of started puzzles completed
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Accuracy</span>
            </div>
            <p className="text-2xl font-bold text-green-600">
              {progressData.averageAccuracy.toFixed(1)}%
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Avg. Time</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">
              {formatTime(progressData.averageCompletionTime)}
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium">Points</span>
            </div>
            <p className="text-2xl font-bold text-purple-600">
              {progressData.achievementPoints}
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-orange-500" />
              <span className="text-sm font-medium">Rank</span>
            </div>
            <p className="text-2xl font-bold text-orange-600">
              {progressData.globalRank ? `#${progressData.globalRank}` : 'N/A'}
            </p>
          </div>
        </div>

        {/* Streak Information */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Current Streak</span>
            <Badge variant="secondary">
              {progressData.currentStreak} days
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Longest Streak</span>
            <Badge variant="outline">
              {progressData.longestStreak} days
            </Badge>
          </div>
        </div>

        {/* Last Played */}
        {progressData.lastPlayedDate && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              Last played: {formatDate(progressData.lastPlayedDate)}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
