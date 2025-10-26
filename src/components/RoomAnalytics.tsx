/**
 * Room analytics component for hosts
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  Users,
  Clock,
  MessageSquare,
  Puzzle,
  TrendingUp,
  Download,
  RefreshCw,
  Calendar,
  Activity,
  Target
} from 'lucide-react';
import { useRoomAnalytics } from '@/hooks/useRoomAnalytics';

interface RoomAnalyticsProps {
  roomId: string;
  className?: string;
}

export function RoomAnalytics({ roomId, className }: RoomAnalyticsProps) {
  const {
    analytics,
    isLoading,
    error,
    refresh,
    exportData
  } = useRoomAnalytics({ roomId });

  const [selectedTimeRange, setSelectedTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Activity className="h-4 w-4 animate-pulse mr-2" />
            <span>Loading analytics...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center text-red-500">
            <p>Failed to load analytics: {error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analytics) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No analytics data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatDuration = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart className="h-5 w-5" />
            <CardTitle className="text-lg">Room Analytics</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportData}
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <CardDescription>
          Comprehensive analytics for room performance and engagement
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="participants">Participants</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <Users className="h-6 w-6 mx-auto mb-2 text-blue-500" />
                <div className="text-2xl font-bold">{analytics.totalParticipants}</div>
                <div className="text-sm text-muted-foreground">Total Participants</div>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <Clock className="h-6 w-6 mx-auto mb-2 text-green-500" />
                <div className="text-2xl font-bold">{formatDuration(analytics.sessionDuration)}</div>
                <div className="text-sm text-muted-foreground">Session Duration</div>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <MessageSquare className="h-6 w-6 mx-auto mb-2 text-purple-500" />
                <div className="text-2xl font-bold">{formatNumber(analytics.totalMessages)}</div>
                <div className="text-sm text-muted-foreground">Messages</div>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <Puzzle className="h-6 w-6 mx-auto mb-2 text-orange-500" />
                <div className="text-2xl font-bold">{analytics.completionRate}%</div>
                <div className="text-sm text-muted-foreground">Completion Rate</div>
              </div>
            </div>

            {/* Engagement Chart */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Engagement Over Time</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.engagementData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="messages" stroke="#8884d8" />
                    <Line type="monotone" dataKey="puzzleEdits" stroke="#82ca9d" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>

          {/* Participants Tab */}
          <TabsContent value="participants" className="space-y-4">
            {/* Participant Activity */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Participant Activity</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.participantData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="messages" fill="#8884d8" />
                    <Bar dataKey="puzzleEdits" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Role Distribution */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Role Distribution</h4>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.roleDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {analytics.roleDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-4">
            {/* Activity Timeline */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Activity Timeline</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.activityTimeline}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="activity" stroke="#8884d8" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Activity Breakdown */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Message Activity</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Total Messages</span>
                    <span className="text-sm font-medium">{analytics.totalMessages}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Messages per Hour</span>
                    <span className="text-sm font-medium">{analytics.messagesPerHour}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Most Active User</span>
                    <span className="text-sm font-medium">{analytics.mostActiveUser}</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Puzzle Activity</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Total Edits</span>
                    <span className="text-sm font-medium">{analytics.totalPuzzleEdits}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Edits per Hour</span>
                    <span className="text-sm font-medium">{analytics.puzzleEditsPerHour}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Completion Rate</span>
                    <span className="text-sm font-medium">{analytics.completionRate}%</span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-4">
            {/* Performance Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <TrendingUp className="h-6 w-6 mx-auto mb-2 text-green-500" />
                <div className="text-2xl font-bold">{analytics.performanceScore}%</div>
                <div className="text-sm text-muted-foreground">Performance Score</div>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <Clock className="h-6 w-6 mx-auto mb-2 text-blue-500" />
                <div className="text-2xl font-bold">{analytics.avgResponseTime}ms</div>
                <div className="text-sm text-muted-foreground">Avg Response Time</div>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <Target className="h-6 w-6 mx-auto mb-2 text-purple-500" />
                <div className="text-2xl font-bold">{analytics.accuracy}%</div>
                <div className="text-sm text-muted-foreground">Accuracy</div>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <Activity className="h-6 w-6 mx-auto mb-2 text-orange-500" />
                <div className="text-2xl font-bold">{analytics.uptime}%</div>
                <div className="text-sm text-muted-foreground">Uptime</div>
              </div>
            </div>

            {/* Performance Chart */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Performance Over Time</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="responseTime" stroke="#8884d8" />
                    <Line type="monotone" dataKey="accuracy" stroke="#82ca9d" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default RoomAnalytics;