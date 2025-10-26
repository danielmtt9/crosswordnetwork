"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Target, 
  Clock, 
  Award,
  Calendar,
  Filter,
  Download,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AchievementAnalytics {
  completionRates: {
    category: string;
    completionRate: number;
    totalUsers: number;
    completedUsers: number;
  }[];
  engagementMetrics: {
    totalAchievements: number;
    averageCompletionTime: number;
    mostPopularAchievement: string;
    leastPopularAchievement: string;
    dailyActiveUsers: number;
    weeklyActiveUsers: number;
    monthlyActiveUsers: number;
  };
  difficultyAnalysis: {
    tier: string;
    completionRate: number;
    averageTime: number;
    userCount: number;
  }[];
  userSegmentation: {
    segment: string;
    userCount: number;
    averageAchievements: number;
    engagementScore: number;
  }[];
  trendData: {
    date: string;
    achievementsUnlocked: number;
    newUsers: number;
    activeUsers: number;
  }[];
}

interface AchievementAnalyticsProps {
  className?: string;
}

export function AchievementAnalytics({ className }: AchievementAnalyticsProps) {
  const [analytics, setAnalytics] = useState<AchievementAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    fetchAnalytics();
  }, [selectedPeriod, selectedCategory]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/analytics/achievements?period=${selectedPeriod}&category=${selectedCategory}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }
      
      const data = await response.json();
      setAnalytics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const exportAnalytics = async () => {
    try {
      const response = await fetch(
        `/api/analytics/achievements/export?period=${selectedPeriod}&category=${selectedCategory}`,
        {
          method: 'POST',
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to export analytics');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `achievement-analytics-${selectedPeriod}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export analytics');
    }
  };

  if (loading) {
    return (
      <div className={cn("space-y-6", className)}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Achievement Analytics</h2>
            <p className="text-muted-foreground">Comprehensive analytics and reporting</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-8 bg-muted rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("space-y-6", className)}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Achievement Analytics</h2>
            <p className="text-muted-foreground">Comprehensive analytics and reporting</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-destructive">{error}</p>
            <Button onClick={fetchAnalytics} className="mt-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Achievement Analytics</h2>
          <p className="text-muted-foreground">Comprehensive analytics and reporting</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportAnalytics}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" onClick={fetchAnalytics}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="text-sm font-medium">Period:</span>
              <div className="flex gap-1">
                {(['7d', '30d', '90d', '1y'] as const).map((period) => (
                  <Button
                    key={period}
                    variant={selectedPeriod === period ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedPeriod(period)}
                  >
                    {period}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <span className="text-sm font-medium">Category:</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-1 border rounded-md text-sm"
              >
                <option value="all">All Categories</option>
                <option value="completion">Completion</option>
                <option value="speed">Speed</option>
                <option value="accuracy">Accuracy</option>
                <option value="streak">Streak</option>
                <option value="social">Social</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-500" />
              <span className="text-sm font-medium">Total Achievements</span>
            </div>
            <div className="text-2xl font-bold mt-2">
              {analytics.engagementMetrics.totalAchievements}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium">Daily Active Users</span>
            </div>
            <div className="text-2xl font-bold mt-2">
              {analytics.engagementMetrics.dailyActiveUsers}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              <span className="text-sm font-medium">Avg. Completion Time</span>
            </div>
            <div className="text-2xl font-bold mt-2">
              {Math.round(analytics.engagementMetrics.averageCompletionTime)}m
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-500" />
              <span className="text-sm font-medium">Engagement Score</span>
            </div>
            <div className="text-2xl font-bold mt-2">
              {analytics.userSegmentation.reduce((acc, seg) => acc + seg.engagementScore, 0) / analytics.userSegmentation.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="completion" className="space-y-4">
        <TabsList>
          <TabsTrigger value="completion">Completion Rates</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="difficulty">Difficulty Analysis</TabsTrigger>
          <TabsTrigger value="segmentation">User Segmentation</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="completion" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Completion Rates by Category</CardTitle>
              <CardDescription>
                Achievement completion rates across different categories
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.completionRates.map((category) => (
                  <div key={category.category} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium capitalize">{category.category}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {category.completedUsers}/{category.totalUsers}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {category.completionRate.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <Progress value={category.completionRate} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="engagement" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Most Popular Achievement</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <Award className="h-12 w-12 text-yellow-500 mx-auto mb-2" />
                  <p className="font-medium">{analytics.engagementMetrics.mostPopularAchievement}</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Least Popular Achievement</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <Target className="h-12 w-12 text-gray-500 mx-auto mb-2" />
                  <p className="font-medium">{analytics.engagementMetrics.leastPopularAchievement}</p>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Active Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {analytics.engagementMetrics.dailyActiveUsers}
                  </div>
                  <div className="text-sm text-muted-foreground">Daily</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {analytics.engagementMetrics.weeklyActiveUsers}
                  </div>
                  <div className="text-sm text-muted-foreground">Weekly</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">
                    {analytics.engagementMetrics.monthlyActiveUsers}
                  </div>
                  <div className="text-sm text-muted-foreground">Monthly</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="difficulty" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Difficulty Analysis</CardTitle>
              <CardDescription>
                Achievement completion rates by difficulty tier
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.difficultyAnalysis.map((tier) => (
                  <div key={tier.tier} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={tier.tier === 'legendary' ? 'default' : 'outline'}
                          className={cn(
                            tier.tier === 'bronze' && 'bg-amber-100 text-amber-800',
                            tier.tier === 'silver' && 'bg-gray-100 text-gray-800',
                            tier.tier === 'gold' && 'bg-yellow-100 text-yellow-800',
                            tier.tier === 'platinum' && 'bg-blue-100 text-blue-800',
                            tier.tier === 'legendary' && 'bg-purple-100 text-purple-800'
                          )}
                        >
                          {tier.tier}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {tier.userCount} users
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {tier.completionRate.toFixed(1)}%
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {Math.round(tier.averageTime)}m avg
                        </span>
                      </div>
                    </div>
                    <Progress value={tier.completionRate} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="segmentation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Segmentation</CardTitle>
              <CardDescription>
                User groups based on achievement engagement
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.userSegmentation.map((segment) => (
                  <div key={segment.segment} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium capitalize">{segment.segment}</h4>
                      <p className="text-sm text-muted-foreground">
                        {segment.userCount} users
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">
                        {segment.averageAchievements.toFixed(1)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        avg achievements
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-600">
                        {segment.engagementScore.toFixed(1)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        engagement score
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Achievement Trends</CardTitle>
              <CardDescription>
                Achievement unlock trends over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.trendData.slice(-7).map((trend) => (
                  <div key={trend.date} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <span className="font-medium">{trend.date}</span>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-600">
                          {trend.achievementsUnlocked}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          achievements
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-green-600">
                          {trend.newUsers}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          new users
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-purple-600">
                          {trend.activeUsers}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          active users
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
