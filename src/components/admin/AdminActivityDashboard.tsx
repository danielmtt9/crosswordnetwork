"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Activity, 
  Users, 
  Clock, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle,
  RefreshCw,
  Download,
  Eye,
  BarChart3,
  PieChart,
  Calendar,
  Filter
} from 'lucide-react';

interface AdminActivityMetrics {
  totalActions: number;
  actionsToday: number;
  actionsThisWeek: number;
  actionsThisMonth: number;
  uniqueAdmins: number;
  averageActionsPerDay: number;
  topActions: Array<{
    action: string;
    count: number;
    percentage: number;
  }>;
  topAdmins: Array<{
    userId: string;
    userName: string;
    actionCount: number;
    lastActivity: string;
  }>;
  hourlyDistribution: Array<{
    hour: number;
    count: number;
  }>;
  dailyTrend: Array<{
    date: string;
    count: number;
  }>;
}

interface AdminActivityAlert {
  id: string;
  type: 'HIGH_ACTIVITY' | 'UNUSUAL_PATTERN' | 'SECURITY_EVENT' | 'SYSTEM_ISSUE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  adminId: string;
  adminName: string;
  timestamp: string;
  resolved: boolean;
  metadata: any;
}

interface ActivityFeedItem {
  id: string;
  timestamp: string;
  adminId: string;
  adminName: string;
  action: string;
  resource: string;
  details: any;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

const severityColors = {
  LOW: 'bg-gray-100 text-gray-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  HIGH: 'bg-orange-100 text-orange-800',
  CRITICAL: 'bg-red-100 text-red-800'
};

const alertTypeColors = {
  HIGH_ACTIVITY: 'bg-blue-100 text-blue-800',
  UNUSUAL_PATTERN: 'bg-yellow-100 text-yellow-800',
  SECURITY_EVENT: 'bg-red-100 text-red-800',
  SYSTEM_ISSUE: 'bg-orange-100 text-orange-800'
};

export function AdminActivityDashboard() {
  const [metrics, setMetrics] = useState<AdminActivityMetrics | null>(null);
  const [alerts, setAlerts] = useState<AdminActivityAlert[]>([]);
  const [feed, setFeed] = useState<ActivityFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | '90d'>('30d');
  const [activeTab, setActiveTab] = useState<'overview' | 'alerts' | 'feed' | 'reports'>('overview');

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchMetrics(),
        fetchAlerts(),
        fetchFeed()
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const fetchMetrics = async () => {
    const response = await fetch(`/api/admin/activity/metrics?timeRange=${timeRange}`);
    if (!response.ok) throw new Error('Failed to fetch metrics');
    const data = await response.json();
    setMetrics(data.metrics);
  };

  const fetchAlerts = async () => {
    const response = await fetch('/api/admin/activity/alerts');
    if (!response.ok) throw new Error('Failed to fetch alerts');
    const data = await response.json();
    setAlerts(data.alerts);
  };

  const fetchFeed = async () => {
    const response = await fetch('/api/admin/activity/feed');
    if (!response.ok) throw new Error('Failed to fetch feed');
    const data = await response.json();
    setFeed(data.feed);
  };

  const generateReport = async () => {
    try {
      const endDate = new Date();
      const startDate = new Date();
      
      switch (timeRange) {
        case '24h':
          startDate.setDate(startDate.getDate() - 1);
          break;
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(startDate.getDate() - 90);
          break;
      }

      const response = await fetch(
        `/api/admin/activity/report?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      );
      
      if (!response.ok) throw new Error('Failed to generate report');
      
      const data = await response.json();
      
      // Download report as JSON
      const blob = new Blob([JSON.stringify(data.report, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `admin-activity-report-${timeRange}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report');
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatTime = (timestamp: string): string => {
    return new Date(timestamp).toLocaleString();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Admin Activity Dashboard</h2>
          <RefreshCw className="h-5 w-5 animate-spin" />
        </div>
        <div className="grid gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6" />
            Admin Activity Dashboard
          </h2>
          <p className="text-gray-600">Monitor and analyze admin activities across the platform</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="p-2 border rounded-md"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
          <Button onClick={fetchData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={generateReport} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'alerts', label: 'Alerts', icon: AlertTriangle },
          { id: 'feed', label: 'Activity Feed', icon: Activity },
          { id: 'reports', label: 'Reports', icon: PieChart }
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
              activeTab === id
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && metrics && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Activity className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Actions</p>
                    <p className="text-2xl font-bold">{formatNumber(metrics.totalActions)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Users className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Active Admins</p>
                    <p className="text-2xl font-bold">{metrics.uniqueAdmins}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <TrendingUp className="h-8 w-8 text-orange-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Avg/Day</p>
                    <p className="text-2xl font-bold">{formatNumber(metrics.averageActionsPerDay)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Clock className="h-8 w-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Today</p>
                    <p className="text-2xl font-bold">{formatNumber(metrics.actionsToday)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Actions and Admins */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Actions</CardTitle>
                <CardDescription>Most frequently performed admin actions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {metrics.topActions.slice(0, 8).map((action, index) => (
                    <div key={action.action} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                        <span className="text-sm font-medium">{action.action}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">{action.count}</span>
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${action.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Most Active Admins</CardTitle>
                <CardDescription>Admins with highest activity levels</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {metrics.topAdmins.slice(0, 8).map((admin, index) => (
                    <div key={admin.userId} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                        <div>
                          <p className="text-sm font-medium">{admin.userName}</p>
                          <p className="text-xs text-gray-500">
                            Last: {formatTime(admin.lastActivity)}
                          </p>
                        </div>
                      </div>
                      <span className="text-sm font-medium text-blue-600">{admin.actionCount}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Hourly Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Activity by Hour</CardTitle>
              <CardDescription>Distribution of admin activities throughout the day</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-12 gap-1">
                {metrics.hourlyDistribution.map((hour) => (
                  <div key={hour.hour} className="text-center">
                    <div className="text-xs text-gray-500 mb-1">{hour.hour}</div>
                    <div
                      className="bg-blue-100 rounded-sm"
                      style={{
                        height: `${Math.max(4, (hour.count / Math.max(...metrics.hourlyDistribution.map(h => h.count))) * 40)}px`
                      }}
                    ></div>
                    <div className="text-xs text-gray-600 mt-1">{hour.count}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Alerts Tab */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          {alerts.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <CheckCircle className="h-12 w-12 mx-auto text-green-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Alerts</h3>
                <p className="text-gray-600">No admin activity alerts at this time.</p>
              </CardContent>
            </Card>
          ) : (
            alerts.map((alert) => (
              <Card key={alert.id} className="border-l-4 border-l-orange-500">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{alert.title}</h4>
                        <Badge className={alertTypeColors[alert.type]}>
                          {alert.type.replace('_', ' ')}
                        </Badge>
                        <Badge className={severityColors[alert.severity]}>
                          {alert.severity}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{alert.description}</p>
                      <div className="text-xs text-gray-500">
                        <p>Admin: {alert.adminName}</p>
                        <p>Time: {formatTime(alert.timestamp)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!alert.resolved && (
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4 mr-2" />
                          Investigate
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Activity Feed Tab */}
      {activeTab === 'feed' && (
        <Card>
          <CardHeader>
            <CardTitle>Real-Time Activity Feed</CardTitle>
            <CardDescription>Live feed of admin activities</CardDescription>
          </CardHeader>
          <CardContent>
            {feed.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Recent Activity</h3>
                <p className="text-gray-600">No admin activities in the recent feed.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {feed.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge className={severityColors[item.severity]}>
                        {item.severity}
                      </Badge>
                      <div>
                        <p className="text-sm font-medium">
                          {item.adminName} performed {item.action}
                        </p>
                        <p className="text-xs text-gray-500">
                          Resource: {item.resource} • {formatTime(item.timestamp)}
                        </p>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Activity Reports</CardTitle>
              <CardDescription>Generate and download detailed admin activity reports</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Quick Reports</h4>
                  <p className="text-sm text-gray-600 mb-3">Generate reports for common time periods</p>
                  <div className="space-y-2">
                    {[
                      { label: 'Last 24 Hours', value: '24h' },
                      { label: 'Last 7 Days', value: '7d' },
                      { label: 'Last 30 Days', value: '30d' },
                      { label: 'Last 90 Days', value: '90d' }
                    ].map(({ label, value }) => (
                      <Button
                        key={value}
                        variant="outline"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => {
                          setTimeRange(value as any);
                          generateReport();
                        }}
                      >
                        <Calendar className="h-4 w-4 mr-2" />
                        {label}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Custom Reports</h4>
                  <p className="text-sm text-gray-600 mb-3">Generate reports for custom date ranges</p>
                  <div className="space-y-2">
                    <input
                      type="date"
                      className="w-full p-2 border rounded-md"
                      placeholder="Start Date"
                    />
                    <input
                      type="date"
                      className="w-full p-2 border rounded-md"
                      placeholder="End Date"
                    />
                    <Button className="w-full">
                      <Download className="h-4 w-4 mr-2" />
                      Generate Custom Report
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
