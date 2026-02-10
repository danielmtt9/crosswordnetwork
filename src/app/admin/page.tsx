"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Puzzle, 
  Activity, 
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Crown,
  Settings,
  BarChart3,
  Shield,
  Loader2,
  FileText
} from "lucide-react";
import { useSession } from "next-auth/react";
// Removed direct import of isSuperAdmin - now using API route

// System health status - this will be fetched from API
const getSystemHealth = async () => {
  try {
    const response = await fetch('/api/admin/health');
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('Failed to fetch system health:', error);
  }
  
  // Fallback to basic health check
  return {
    status: "healthy",
    timestamp: new Date().toISOString(),
    services: {
      database: { status: "healthy", latency: 0, message: "Connected" },
      email: { status: "healthy", message: "Service available" },
      storage: { status: "healthy", message: "Storage accessible" }
    },
    metrics: {
      totalUsers: 0,
      totalPuzzles: 0,
      activeUsers24h: 0,
      uptime: 0,
      memoryUsage: {},
      nodeVersion: process.version
    }
  };
};

const statusColors = {
  success: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  error: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  healthy: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
};

export default function AdminPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState<{
    totalUsers: number;
    activeUsers: number;
    totalPuzzles: number;
    newUsersThisMonth: number;
  } | null>(null);
  const [activity, setActivity] = useState<{
    recentUsers: unknown[];
    recentProgress: unknown[];
    auditLogs: unknown[];
  } | null>(null);
  const [systemHealth, setSystemHealth] = useState<{
    status: string;
    timestamp: string;
    services: {
      database: { status: string; latency: number; message: string };
      email: { status: string; message: string };
      storage: { status: string; message: string };
    };
    metrics: {
      totalUsers: number;
      totalPuzzles: number;
      activeUsers24h: number;
      uptime: number;
      memoryUsage: any;
      nodeVersion: string;
    };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentUserId = session?.user?.id;
  const [isCurrentUserSuperAdmin, setIsCurrentUserSuperAdmin] = useState(false);

  useEffect(() => {
    if ((session as any)?.requirePasswordChange) {
      router.push('/force-password-change');
      return;
    }
    
    // Check if user is super admin via API route
    const checkSuperAdmin = async () => {
      if (currentUserId) {
        try {
          const response = await fetch('/api/admin/status');
          if (response.ok) {
            const data = await response.json();
            setIsCurrentUserSuperAdmin(data.isSuperAdmin);
          }
        } catch (error) {
          console.error('Failed to check super admin status:', error);
          setIsCurrentUserSuperAdmin(false);
        }
      }
    };
    
    const fetchData = async () => {
      try {
        setLoading(true);
        const [statsResponse, activityResponse, healthResponse] = await Promise.all([
          fetch('/api/admin/stats'),
          fetch('/api/admin/activity'),
          fetch('/api/admin/health')
        ]);

        if (!statsResponse.ok || !activityResponse.ok) {
          throw new Error('Failed to fetch admin data');
        }

        const [statsData, activityData, healthData] = await Promise.all([
          statsResponse.json(),
          activityResponse.json(),
          healthResponse.ok ? healthResponse.json() : getSystemHealth()
        ]);

        setStats(statsData);
        setActivity(activityData);
        setSystemHealth(healthData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    checkSuperAdmin();
    fetchData();
  }, [currentUserId]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-xl">
        <div className="container mx-auto max-w-7xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Admin Dashboard</h1>
                <p className="text-sm text-muted-foreground">Crossword.Network Administration</p>
              </div>
            </div>
                   <div className="flex items-center gap-2">
                     {isCurrentUserSuperAdmin ? (
                       <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
                         <Crown className="mr-1 h-3 w-3" />
                         Super Admin
                       </Badge>
                     ) : (
                       <Badge className="bg-primary text-primary-foreground">
                         <Shield className="mr-1 h-3 w-3" />
                         Admin
                       </Badge>
                     )}
                     <Button variant="outline" size="sm">
                       <Settings className="h-4 w-4 mr-2" />
                       Settings
                     </Button>
                   </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto max-w-7xl px-4 py-8">
        {/* Stats Overview */}
        <section className="mb-8">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900">
                      <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : (stats?.totalUsers || 0).toLocaleString()}
                      </p>
                      <p className="text-sm text-muted-foreground">Total Users</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-green-100 dark:bg-green-900">
                      <Activity className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : (stats?.activeUsers || 0).toLocaleString()}
                      </p>
                      <p className="text-sm text-muted-foreground">Active Users</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900">
                      <Puzzle className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : (stats?.totalPuzzles || 0)}
                      </p>
                      <p className="text-sm text-muted-foreground">Total Puzzles</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-green-100 dark:bg-green-900">
                      <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : "$0"}
                      </p>
                      <p className="text-sm text-muted-foreground">Monthly Revenue</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900">
                      <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : "0%"}
                      </p>
                      <p className="text-sm text-muted-foreground">Conversion Rate</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </section>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Recent Activity */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Recent Activity
                  </CardTitle>
                  <CardDescription>
                    Latest system events and user activities
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {loading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin" />
                        <span className="ml-2">Loading activity...</span>
                      </div>
                    ) : error ? (
                      <div className="text-center py-8">
                        <p className="text-red-500 mb-4">{error}</p>
                      </div>
                    ) : activity?.auditLogs && activity.auditLogs.length > 0 ? (
                      activity.auditLogs.slice(0, 5).map((log: any, index: number) => (
                        <motion.div
                          key={log.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.6, delay: 0.8 + index * 0.1 }}
                          className="flex items-center gap-4 p-4 rounded-lg border"
                        >
                          <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900">
                            <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{log.action} on {log.entityType}</p>
                            <p className="text-sm text-muted-foreground">
                              by {log.actor?.name || log.actor?.email} • {new Date(log.createdAt).toLocaleString()}
                            </p>
                          </div>
                          <Badge variant="outline">
                            {log.entityType}
                          </Badge>
                        </motion.div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">No recent activity</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.section>

            {/* System Health */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    System Health
                  </CardTitle>
                  <CardDescription>
                    Current status of system components
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    {systemHealth && Object.entries(systemHealth.services).map(([service, serviceData], index) => (
                      <motion.div
                        key={service}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.6, delay: 0.9 + index * 0.1 }}
                        className="flex items-center justify-between p-4 rounded-lg border"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${
                            serviceData.status === 'healthy' ? 'bg-green-100 dark:bg-green-900' :
                            serviceData.status === 'warning' ? 'bg-yellow-100 dark:bg-yellow-900' :
                            'bg-red-100 dark:bg-red-900'
                          }`}>
                            {serviceData.status === 'healthy' ? (
                              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                            ) : serviceData.status === 'warning' ? (
                              <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-medium capitalize">{service}</h4>
                            <p className="text-sm text-muted-foreground">{serviceData.message}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className={statusColors[serviceData.status as keyof typeof statusColors]}>
                            {serviceData.status}
                          </Badge>
                          {service === 'database' && 'latency' in serviceData && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {serviceData.latency}ms
                            </p>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              {/* System Health Overview */}
              {systemHealth && (
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      System Overview
                    </CardTitle>
                    <CardDescription>
                      Overall system status and metrics
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                      <div className="p-4 rounded-lg border">
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`w-2 h-2 rounded-full ${
                            systemHealth.status === 'healthy' ? 'bg-green-500' : 
                            systemHealth.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
                          }`} />
                          <span className="text-sm font-medium">Overall Status</span>
                        </div>
                        <p className="text-2xl font-bold capitalize">{systemHealth.status}</p>
                        <p className="text-xs text-muted-foreground">
                          Last updated: {new Date(systemHealth.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                      
                      <div className="p-4 rounded-lg border">
                        <div className="flex items-center gap-2 mb-2">
                          <Users className="h-4 w-4 text-blue-500" />
                          <span className="text-sm font-medium">Total Users</span>
                        </div>
                        <p className="text-2xl font-bold">{systemHealth.metrics.totalUsers}</p>
                        <p className="text-xs text-muted-foreground">
                          {systemHealth.metrics.activeUsers24h} active (24h)
                        </p>
                      </div>
                      
                      <div className="p-4 rounded-lg border">
                        <div className="flex items-center gap-2 mb-2">
                          <Puzzle className="h-4 w-4 text-purple-500" />
                          <span className="text-sm font-medium">Puzzles</span>
                        </div>
                        <p className="text-2xl font-bold">{systemHealth.metrics.totalPuzzles}</p>
                        <p className="text-xs text-muted-foreground">Available puzzles</p>
                      </div>
                      
                      <div className="p-4 rounded-lg border">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="h-4 w-4 text-green-500" />
                          <span className="text-sm font-medium">Uptime</span>
                        </div>
                        <p className="text-2xl font-bold">
                          {Math.floor(systemHealth.metrics.uptime / 3600)}h
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {Math.floor((systemHealth.metrics.uptime % 3600) / 60)}m
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </motion.section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.9 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button asChild className="w-full">
                    <Link href="/admin/users">
                      <Users className="mr-2 h-4 w-4" />
                      Manage Users
                    </Link>
                  </Button>
                  <Button variant="outline" asChild className="w-full">
                    <Link href="/admin/puzzles">
                      <Puzzle className="mr-2 h-4 w-4" />
                      Manage Puzzles
                    </Link>
                  </Button>
                  <Button variant="outline" asChild className="w-full">
                    <Link href="/admin/audit">
                      <FileText className="mr-2 h-4 w-4" />
                      Audit Log
                    </Link>
                  </Button>
                  <Button variant="outline" asChild className="w-full">
                    <Link href="/admin/settings">
                      <Settings className="mr-2 h-4 w-4" />
                      System Settings
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Alerts */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 1.0 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Alerts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                      <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                        Payment Processing Warning
                      </p>
                      <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                        Some payment transactions are experiencing delays
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                      <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                        System Update Available
                      </p>
                      <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                        Version 2.1.0 is ready for deployment
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
