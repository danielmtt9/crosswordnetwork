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
  RefreshCw,
  Settings,
  Eye,
  AlertTriangle,
  CheckCircle,
  XCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminAnalytics {
  performanceMetrics: {
    totalUsers: number;
    activeUsers: number;
    achievementUnlocks: number;
    averageCompletionTime: number;
    systemUptime: number;
    errorRate: number;
  };
  achievementPerformance: {
    achievementId: string;
    name: string;
    category: string;
    tier: string;
    completionRate: number;
    averageTime: number;
    userCount: number;
    issues: string[];
  }[];
  userEngagement: {
    segment: string;
    userCount: number;
    averageSessionTime: number;
    achievementsPerSession: number;
    retentionRate: number;
  }[];
  systemHealth: {
    metric: string;
    value: number;
    status: 'healthy' | 'warning' | 'critical';
    threshold: number;
  }[];
  recentActivity: {
    id: string;
    type: string;
    description: string;
    timestamp: string;
    severity: 'info' | 'warning' | 'error';
  }[];
}

interface AdminAnalyticsDashboardProps {
  className?: string;
}

export function AdminAnalyticsDashboard({ className }: AdminAnalyticsDashboardProps) {
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'24h' | '7d' | '30d' | '90d'>('7d');

  useEffect(() => {
    fetchAdminAnalytics();
  }, [selectedPeriod]);

  const fetchAdminAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/admin/analytics?period=${selectedPeriod}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch admin analytics');
      }
      
      const data = await response.json();
      setAnalytics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'critical':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Eye className="h-4 w-4 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'info':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className={cn("space-y-6", className)}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Admin Analytics Dashboard</h2>
            <p className="text-muted-foreground">System performance and achievement analytics</p>
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
            <h2 className="text-2xl font-bold">Admin Analytics Dashboard</h2>
            <p className="text-muted-foreground">System performance and achievement analytics</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-destructive">{error}</p>
            <Button onClick={fetchAdminAnalytics} className="mt-4">
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
          <h2 className="text-2xl font-bold">Admin Analytics Dashboard</h2>
          <p className="text-muted-foreground">System performance and achievement analytics</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as any)}
              className="px-3 py-1 border rounded-md text-sm"
            >
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
          </div>
          <Button variant="outline" onClick={fetchAdminAnalytics}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              <span className="text-sm font-medium">Total Users</span>
            </div>
            <div className="text-2xl font-bold mt-2">
              {analytics.performanceMetrics.totalUsers.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {analytics.performanceMetrics.activeUsers.toLocaleString()} active
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium">Achievement Unlocks</span>
            </div>
            <div className="text-2xl font-bold mt-2">
              {analytics.performanceMetrics.achievementUnlocks.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {Math.round(analytics.performanceMetrics.averageCompletionTime)}m avg time
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-orange-500" />
              <span className="text-sm font-medium">System Uptime</span>
            </div>
            <div className="text-2xl font-bold mt-2">
              {analytics.performanceMetrics.systemUptime.toFixed(1)}%
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {analytics.performanceMetrics.errorRate.toFixed(2)}% error rate
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-500" />
              <span className="text-sm font-medium">Performance Score</span>
            </div>
            <div className="text-2xl font-bold mt-2">
              {((analytics.performanceMetrics.systemUptime + (100 - analytics.performanceMetrics.errorRate)) / 2).toFixed(0)}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              Overall health
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Health */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            System Health
          </CardTitle>
          <CardDescription>
            Real-time system performance metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {analytics.systemHealth.map((metric) => (
              <div key={metric.metric} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(metric.status)}
                  <div>
                    <div className="font-medium">{metric.metric}</div>
                    <div className="text-sm text-muted-foreground">
                      Threshold: {metric.threshold}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={cn(
                    "text-lg font-bold",
                    metric.status === 'healthy' && "text-green-600",
                    metric.status === 'warning' && "text-yellow-600",
                    metric.status === 'critical' && "text-red-600"
                  )}>
                    {metric.value}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {metric.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Analytics Tabs */}
      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance">Achievement Performance</TabsTrigger>
          <TabsTrigger value="engagement">User Engagement</TabsTrigger>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Achievement Performance Analysis</CardTitle>
              <CardDescription>
                Detailed performance metrics for each achievement
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.achievementPerformance.map((achievement) => (
                  <div key={achievement.achievementId} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div>
                          <h4 className="font-medium">{achievement.name}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {achievement.category}
                            </Badge>
                            <Badge 
                              variant="outline"
                              className={cn(
                                "text-xs",
                                achievement.tier === 'bronze' && 'bg-amber-100 text-amber-800',
                                achievement.tier === 'silver' && 'bg-gray-100 text-gray-800',
                                achievement.tier === 'gold' && 'bg-yellow-100 text-yellow-800',
                                achievement.tier === 'platinum' && 'bg-blue-100 text-blue-800',
                                achievement.tier === 'legendary' && 'bg-purple-100 text-purple-800'
                              )}
                            >
                              {achievement.tier}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">
                          {achievement.completionRate.toFixed(1)}%
                        </div>
                        <div className="text-sm text-muted-foreground">
                          completion rate
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 mb-3">
                      <div className="text-center">
                        <div className="text-sm font-medium">{achievement.userCount}</div>
                        <div className="text-xs text-muted-foreground">users</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-medium">{Math.round(achievement.averageTime)}m</div>
                        <div className="text-xs text-muted-foreground">avg time</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-medium">{achievement.issues.length}</div>
                        <div className="text-xs text-muted-foreground">issues</div>
                      </div>
                    </div>
                    
                    <Progress value={achievement.completionRate} className="h-2 mb-3" />
                    
                    {achievement.issues.length > 0 && (
                      <div className="mt-3">
                        <div className="text-sm font-medium text-red-600 mb-2">Issues:</div>
                        <div className="space-y-1">
                          {achievement.issues.map((issue, index) => (
                            <div key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                              {issue}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="engagement" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Engagement Analysis</CardTitle>
              <CardDescription>
                User behavior and engagement patterns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.userEngagement.map((segment) => (
                  <div key={segment.segment} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium capitalize">{segment.segment}</h4>
                      <p className="text-sm text-muted-foreground">
                        {segment.userCount.toLocaleString()} users
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-6 text-center">
                      <div>
                        <div className="text-lg font-bold text-blue-600">
                          {Math.round(segment.averageSessionTime)}m
                        </div>
                        <div className="text-sm text-muted-foreground">
                          avg session
                        </div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-green-600">
                          {segment.achievementsPerSession.toFixed(1)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          achievements/session
                        </div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-purple-600">
                          {segment.retentionRate.toFixed(1)}%
                        </div>
                        <div className="text-sm text-muted-foreground">
                          retention rate
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent System Activity</CardTitle>
              <CardDescription>
                Latest system events and activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.recentActivity.map((activity) => (
                  <div 
                    key={activity.id} 
                    className={cn(
                      "flex items-center gap-3 p-3 border rounded-lg",
                      getSeverityColor(activity.severity)
                    )}
                  >
                    <div className="flex-shrink-0">
                      {getStatusIcon(activity.severity)}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{activity.description}</div>
                      <div className="text-sm text-muted-foreground">
                        {activity.type} • {new Date(activity.timestamp).toLocaleString()}
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
