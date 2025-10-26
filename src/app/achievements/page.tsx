"use client";

import { useState, useEffect } from "react";
import { AchievementGrid } from "@/components/achievements/AchievementGrid";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Star, Zap, Target, Users, Shield, Sparkles } from "lucide-react";

interface Achievement {
  id: string;
  key: string;
  name: string;
  description: string | null;
  category: string;
  tier: string;
  points: number;
  iconName: string;
  isSecret: boolean;
  userProgress?: {
    progress: number;
    earnedAt: Date | null;
    notified: boolean;
  } | null;
}

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAchievements();
  }, []);

  const fetchAchievements = async () => {
    try {
      const response = await fetch('/api/achievements');
      if (!response.ok) {
        throw new Error('Failed to fetch achievements');
      }
      const data = await response.json();
      setAchievements(data.achievements);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading achievements...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-destructive">Error: {error}</p>
        </div>
      </div>
    );
  }

  const earnedCount = achievements.filter(a => a.userProgress?.earnedAt !== null).length;
  const totalPoints = achievements
    .filter(a => a.userProgress?.earnedAt !== null)
    .reduce((sum, a) => sum + a.points, 0);

  const categoryStats = {
    COMPLETION: achievements.filter(a => a.category === 'COMPLETION' && a.userProgress?.earnedAt !== null).length,
    SPEED: achievements.filter(a => a.category === 'SPEED' && a.userProgress?.earnedAt !== null).length,
    STREAK: achievements.filter(a => a.category === 'STREAK' && a.userProgress?.earnedAt !== null).length,
    ACCURACY: achievements.filter(a => a.category === 'ACCURACY' && a.userProgress?.earnedAt !== null).length,
    SOCIAL: achievements.filter(a => a.category === 'SOCIAL' && a.userProgress?.earnedAt !== null).length,
    MASTERY: achievements.filter(a => a.category === 'MASTERY' && a.userProgress?.earnedAt !== null).length,
    SPECIAL: achievements.filter(a => a.category === 'SPECIAL' && a.userProgress?.earnedAt !== null).length,
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">Achievements</h1>
          <p className="text-muted-foreground text-lg">
            Unlock badges and earn points by completing puzzles and reaching milestones
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Achievements</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{earnedCount} / {achievements.length}</div>
              <p className="text-xs text-muted-foreground">
                {achievements.length > 0 ? Math.round((earnedCount / achievements.length) * 100) : 0}% complete
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Points</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalPoints}</div>
              <p className="text-xs text-muted-foreground">
                Points earned from achievements
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Categories</CardTitle>
              <Sparkles className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Object.values(categoryStats).filter(count => count > 0).length} / 7
              </div>
              <p className="text-xs text-muted-foreground">
                Categories with progress
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Category Progress */}
        <Card>
          <CardHeader>
            <CardTitle>Category Progress</CardTitle>
            <CardDescription>
              Track your progress across different achievement categories
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-3">
                <Target className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm font-medium">Completion</p>
                  <p className="text-xs text-muted-foreground">{categoryStats.COMPLETION} earned</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Zap className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="text-sm font-medium">Speed</p>
                  <p className="text-xs text-muted-foreground">{categoryStats.SPEED} earned</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Star className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-sm font-medium">Streak</p>
                  <p className="text-xs text-muted-foreground">{categoryStats.STREAK} earned</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Target className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm font-medium">Accuracy</p>
                  <p className="text-xs text-muted-foreground">{categoryStats.ACCURACY} earned</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-sm font-medium">Social</p>
                  <p className="text-xs text-muted-foreground">{categoryStats.SOCIAL} earned</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-red-500" />
                <div>
                  <p className="text-sm font-medium">Mastery</p>
                  <p className="text-xs text-muted-foreground">{categoryStats.MASTERY} earned</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Achievement Grid */}
        <AchievementGrid achievements={achievements} />
      </div>
    </div>
  );
}
