"use client";

import { useState, useEffect } from "react";
import { LeaderboardTable } from "@/components/leaderboards/LeaderboardTable";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Clock, Target, Users, TrendingUp } from "lucide-react";

interface LeaderboardEntry {
  id: string;
  rank?: number;
  userId: string;
  userName: string;
  userAvatar?: string;
  value: number;
  metric: string;
}

interface LeaderboardData {
  entries: LeaderboardEntry[];
  userEntry: LeaderboardEntry | null;
  total: number;
  period: string;
  scope: string;
  metric: string;
}

const periods = [
  { key: 'ALL_TIME', label: 'All Time', icon: Trophy },
  { key: 'WEEKLY', label: 'This Week', icon: TrendingUp },
  { key: 'MONTHLY', label: 'This Month', icon: Clock },
];

const metrics = [
  { key: 'highest_score', label: 'Highest Score', icon: Target },
  { key: 'fastest_time', label: 'Fastest Time', icon: Clock },
  { key: 'most_completed', label: 'Most Completed', icon: Trophy },
  { key: 'best_accuracy', label: 'Best Accuracy', icon: Target },
  { key: 'longest_streak', label: 'Longest Streak', icon: TrendingUp },
];

export default function LeaderboardsPage() {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('ALL_TIME');
  const [selectedMetric, setSelectedMetric] = useState('highest_score');

  useEffect(() => {
    fetchLeaderboard();
  }, [selectedPeriod, selectedMetric]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        period: selectedPeriod,
        scope: 'GLOBAL',
        metric: selectedMetric,
        limit: '50',
      });

      const response = await fetch(`/api/leaderboards?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard');
      }
      const data = await response.json();
      setLeaderboardData(data);
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
          <p className="mt-2 text-muted-foreground">Loading leaderboard...</p>
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

  const currentMetric = metrics.find(m => m.key === selectedMetric);
  const currentPeriod = periods.find(p => p.key === selectedPeriod);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">Leaderboards</h1>
          <p className="text-muted-foreground text-lg">
            Compete with other players and see how you rank
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Leaderboard Filters</CardTitle>
            <CardDescription>
              Choose the time period and metric to view rankings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Period Selection */}
            <div>
              <h3 className="text-sm font-medium mb-3">Time Period</h3>
              <div className="flex flex-wrap gap-2">
                {periods.map(period => {
                  const Icon = period.icon;
                  return (
                    <Button
                      key={period.key}
                      variant={selectedPeriod === period.key ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedPeriod(period.key)}
                      className="flex items-center gap-2"
                    >
                      <Icon className="w-4 h-4" />
                      {period.label}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Metric Selection */}
            <div>
              <h3 className="text-sm font-medium mb-3">Metric</h3>
              <div className="flex flex-wrap gap-2">
                {metrics.map(metric => {
                  const Icon = metric.icon;
                  return (
                    <Button
                      key={metric.key}
                      variant={selectedMetric === metric.key ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedMetric(metric.key)}
                      className="flex items-center gap-2"
                    >
                      <Icon className="w-4 h-4" />
                      {metric.label}
                    </Button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User Rank Card */}
        {leaderboardData?.userEntry && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                Your Rank
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Badge variant="default" className="w-12 h-12 flex items-center justify-center text-lg font-bold">
                    {leaderboardData.userEntry.rank}
                  </Badge>
                  <div>
                    <p className="font-medium">{leaderboardData.userEntry.userName}</p>
                    <p className="text-sm text-muted-foreground">
                      {currentMetric?.label} • {currentPeriod?.label}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">
                    {selectedMetric === 'fastest_time' && (
                      `${Math.floor(leaderboardData.userEntry.value / 60)}:${(leaderboardData.userEntry.value % 60).toString().padStart(2, '0')}`
                    )}
                    {selectedMetric === 'highest_score' && leaderboardData.userEntry.value.toLocaleString()}
                    {selectedMetric === 'most_completed' && leaderboardData.userEntry.value}
                    {selectedMetric === 'best_accuracy' && `${leaderboardData.userEntry.value.toFixed(1)}%`}
                    {selectedMetric === 'longest_streak' && `${leaderboardData.userEntry.value} days`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Leaderboard Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {currentMetric?.icon && <currentMetric.icon className="w-5 h-5" />}
              {currentMetric?.label} Leaderboard
            </CardTitle>
            <CardDescription>
              {currentPeriod?.label} • {leaderboardData?.total || 0} total players
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LeaderboardTable
              entries={leaderboardData?.entries || []}
              currentUserId={leaderboardData?.userEntry?.userId}
              metric={selectedMetric}
            />
          </CardContent>
        </Card>

        {/* Empty State */}
        {leaderboardData?.entries.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Rankings Yet</h3>
              <p className="text-muted-foreground">
                Be the first to complete puzzles and appear on the leaderboard!
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
