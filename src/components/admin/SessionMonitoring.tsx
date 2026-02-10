"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Shield, 
  Clock, 
  Users, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  Settings,
  Activity,
  LogOut,
  Timer,
  Eye,
  Trash2
} from 'lucide-react';

interface AdminSession {
  id: string;
  userId: string;
  sessionId: string;
  ipAddress: string;
  userAgent: string;
  lastActivity: string;
  createdAt: string;
  expiresAt: string;
  isActive: boolean;
  warningSent: boolean;
  activityCount: number;
  suspiciousActivityCount: number;
}

interface SessionStatistics {
  activeSessions: number;
  expiredSessions: number;
  averageSessionDuration: number;
  suspiciousSessions: number;
}

interface SessionConfig {
  adminTimeoutMinutes: number;
  superAdminTimeoutMinutes: number;
  warningMinutes: number;
  maxInactiveMinutes: number;
  enableActivityTracking: boolean;
  enableAutoLogout: boolean;
}

export function SessionMonitoring() {
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [statistics, setStatistics] = useState<SessionStatistics | null>(null);
  const [config, setConfig] = useState<SessionConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [selectedSession, setSelectedSession] = useState<AdminSession | null>(null);
  const [forceLogoutReason, setForceLogoutReason] = useState('');
  const [extendMinutes, setExtendMinutes] = useState(30);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchSessions(),
        fetchStatistics(),
        fetchConfig()
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const fetchSessions = async () => {
    const response = await fetch('/api/admin/sessions');
    if (!response.ok) throw new Error('Failed to fetch sessions');
    const data = await response.json();
    setSessions(data.sessions);
  };

  const fetchStatistics = async () => {
    const response = await fetch('/api/admin/sessions/statistics');
    if (!response.ok) throw new Error('Failed to fetch statistics');
    const data = await response.json();
    setStatistics(data.statistics);
  };

  const fetchConfig = async () => {
    const response = await fetch('/api/admin/sessions/config');
    if (!response.ok) throw new Error('Failed to fetch config');
    const data = await response.json();
    setConfig(data.config);
  };

  const handleForceLogout = async (session: AdminSession) => {
    if (!forceLogoutReason.trim()) {
      setError('Please provide a reason for forced logout');
      return;
    }

    try {
      setError(null);
      const response = await fetch('/api/admin/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'force_logout',
          sessionId: session.sessionId,
          userId: session.userId,
          reason: forceLogoutReason
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to force logout');
      }
      
      setSuccess(`Session for user ${session.userId} has been terminated`);
      setForceLogoutReason('');
      setSelectedSession(null);
      await fetchSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to force logout');
    }
  };

  const handleExtendSession = async (session: AdminSession) => {
    try {
      setError(null);
      const response = await fetch('/api/admin/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'extend_session',
          sessionId: session.sessionId,
          userId: session.userId,
          minutes: extendMinutes
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to extend session');
      }
      
      setSuccess(`Session extended by ${extendMinutes} minutes`);
      setSelectedSession(null);
      await fetchSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to extend session');
    }
  };

  const handleCleanupExpired = async () => {
    try {
      setError(null);
      const response = await fetch('/api/admin/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cleanup_expired' })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cleanup expired sessions');
      }
      
      const data = await response.json();
      setSuccess(`Cleaned up ${data.deletedCount} expired sessions`);
      await fetchSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cleanup expired sessions');
    }
  };

  const handleConfigUpdate = async (updatedConfig: SessionConfig) => {
    try {
      setError(null);
      const response = await fetch('/api/admin/sessions/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: updatedConfig })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update config');
      }
      
      setSuccess('Session configuration updated successfully');
      setConfig(updatedConfig);
      setShowConfig(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update config');
    }
  };

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${Math.round(minutes)}m`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const getTimeUntilExpiry = (expiresAt: string): string => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expired';
    
    const minutes = Math.floor(diff / (1000 * 60));
    return formatDuration(minutes);
  };

  const getSessionStatus = (session: AdminSession): { status: string; color: string } => {
    const now = new Date();
    const expiry = new Date(session.expiresAt);
    const timeUntilExpiry = expiry.getTime() - now.getTime();
    
    if (timeUntilExpiry <= 0) {
      return { status: 'Expired', color: 'bg-gray-100 text-gray-800' };
    }
    
    if (session.suspiciousActivityCount > 0) {
      return { status: 'Suspicious', color: 'bg-red-100 text-red-800' };
    }
    
    if (session.warningSent) {
      return { status: 'Warning', color: 'bg-yellow-100 text-yellow-800' };
    }
    
    return { status: 'Active', color: 'bg-green-100 text-green-800' };
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Session Monitoring</h2>
          <RefreshCw className="h-5 w-5 animate-spin" />
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map(i => (
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
            <Shield className="h-6 w-6" />
            Session Monitoring
          </h2>
          <p className="text-gray-600">Monitor and manage admin sessions</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={fetchData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowConfig(!showConfig)} variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Config
          </Button>
          <Button onClick={handleCleanupExpired} variant="outline" size="sm">
            <Trash2 className="h-4 w-4 mr-2" />
            Cleanup
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

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Statistics */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Sessions</p>
                  <p className="text-2xl font-bold">{statistics.activeSessions}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-gray-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Expired Sessions</p>
                  <p className="text-2xl font-bold">{statistics.expiredSessions}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Timer className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Avg Duration</p>
                  <p className="text-2xl font-bold">{formatDuration(statistics.averageSessionDuration)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <AlertTriangle className="h-8 w-8 text-red-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Suspicious</p>
                  <p className="text-2xl font-bold">{statistics.suspiciousSessions}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Configuration */}
      {showConfig && config && (
        <Card>
          <CardHeader>
            <CardTitle>Session Configuration</CardTitle>
            <CardDescription>Configure session timeout and monitoring settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="admin-timeout">Admin Timeout (minutes)</Label>
                <Input
                  id="admin-timeout"
                  type="number"
                  value={config.adminTimeoutMinutes}
                  onChange={(e) => setConfig({ ...config, adminTimeoutMinutes: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label htmlFor="super-admin-timeout">Super Admin Timeout (minutes)</Label>
                <Input
                  id="super-admin-timeout"
                  type="number"
                  value={config.superAdminTimeoutMinutes}
                  onChange={(e) => setConfig({ ...config, superAdminTimeoutMinutes: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label htmlFor="warning-minutes">Warning Time (minutes)</Label>
                <Input
                  id="warning-minutes"
                  type="number"
                  value={config.warningMinutes}
                  onChange={(e) => setConfig({ ...config, warningMinutes: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <Label htmlFor="max-inactive">Max Inactive Time (minutes)</Label>
                <Input
                  id="max-inactive"
                  type="number"
                  value={config.maxInactiveMinutes}
                  onChange={(e) => setConfig({ ...config, maxInactiveMinutes: parseInt(e.target.value) })}
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.enableActivityTracking}
                  onChange={(e) => setConfig({ ...config, enableActivityTracking: e.target.checked })}
                  className="mr-2"
                />
                Enable Activity Tracking
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={config.enableAutoLogout}
                  onChange={(e) => setConfig({ ...config, enableAutoLogout: e.target.checked })}
                  className="mr-2"
                />
                Enable Auto Logout
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => handleConfigUpdate(config)}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Save Configuration
              </Button>
              <Button variant="outline" onClick={() => setShowConfig(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sessions List */}
      <Card>
        <CardHeader>
          <CardTitle>Active Admin Sessions</CardTitle>
          <CardDescription>Monitor and manage active admin sessions</CardDescription>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Active Sessions</h3>
              <p className="text-gray-600">No admin sessions are currently active.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map((session) => {
                const status = getSessionStatus(session);
                return (
                  <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">Session {session.sessionId.slice(0, 8)}...</h4>
                        <Badge className={status.color}>
                          {status.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>User: {session.userId}</p>
                        <p>IP: {session.ipAddress}</p>
                        <p>Last Activity: {new Date(session.lastActivity).toLocaleString()}</p>
                        <p>Expires: {getTimeUntilExpiry(session.expiresAt)}</p>
                        <p>Activities: {session.activityCount}</p>
                        {session.suspiciousActivityCount > 0 && (
                          <p className="text-red-600">Suspicious: {session.suspiciousActivityCount}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedSession(session)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Manage
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Session Management Modal */}
      {selectedSession && (
        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle>Manage Session</CardTitle>
            <CardDescription>Session ID: {selectedSession.sessionId}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="extend-minutes">Extend Session (minutes)</Label>
                <Input
                  id="extend-minutes"
                  type="number"
                  value={extendMinutes}
                  onChange={(e) => setExtendMinutes(parseInt(e.target.value))}
                  min="1"
                  max="480"
                />
              </div>
              <div>
                <Label htmlFor="logout-reason">Force Logout Reason</Label>
                <Input
                  id="logout-reason"
                  value={forceLogoutReason}
                  onChange={(e) => setForceLogoutReason(e.target.value)}
                  placeholder="Enter reason for forced logout"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => handleExtendSession(selectedSession)}
              >
                <Timer className="h-4 w-4 mr-2" />
                Extend Session
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleForceLogout(selectedSession)}
                disabled={!forceLogoutReason.trim()}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Force Logout
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedSession(null);
                  setForceLogoutReason('');
                  setExtendMinutes(30);
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
