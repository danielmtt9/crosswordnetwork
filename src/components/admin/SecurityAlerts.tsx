"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  AlertTriangle, 
  Shield, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock,
  Filter,
  RefreshCw
} from 'lucide-react';

interface SecurityAlert {
  id: string;
  patternId: string;
  userId: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  details: any;
  triggeredAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'FALSE_POSITIVE';
}

interface SecurityPattern {
  id: string;
  name: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  enabled: boolean;
  cooldownMinutes: number;
  maxOccurrences: number;
  timeWindowMinutes: number;
}

const severityColors = {
  LOW: 'bg-blue-100 text-blue-800 border-blue-200',
  MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  HIGH: 'bg-orange-100 text-orange-800 border-orange-200',
  CRITICAL: 'bg-red-100 text-red-800 border-red-200'
};

const statusColors = {
  ACTIVE: 'bg-red-100 text-red-800',
  ACKNOWLEDGED: 'bg-yellow-100 text-yellow-800',
  RESOLVED: 'bg-green-100 text-green-800',
  FALSE_POSITIVE: 'bg-gray-100 text-gray-800'
};

export function SecurityAlerts() {
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [patterns, setPatterns] = useState<SecurityPattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    status: '',
    severity: '',
    userId: ''
  });

  useEffect(() => {
    fetchAlerts();
    fetchPatterns();
  }, [filters]);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.severity) params.append('severity', filters.severity);
      if (filters.userId) params.append('userId', filters.userId);

      const response = await fetch(`/api/admin/security/alerts?${params}`);
      if (!response.ok) throw new Error('Failed to fetch alerts');
      
      const data = await response.json();
      setAlerts(data.alerts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch alerts');
    } finally {
      setLoading(false);
    }
  };

  const fetchPatterns = async () => {
    try {
      const response = await fetch('/api/admin/security/patterns');
      if (!response.ok) throw new Error('Failed to fetch patterns');
      
      const data = await response.json();
      setPatterns(data.patterns);
    } catch (err) {
      console.error('Failed to fetch patterns:', err);
    }
  };

  const handleAlertAction = async (alertId: string, action: 'acknowledge' | 'resolve', resolution?: string) => {
    try {
      const response = await fetch('/api/admin/security/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, alertId, resolution })
      });

      if (!response.ok) throw new Error('Failed to process alert action');
      
      await fetchAlerts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process alert action');
    }
  };

  const togglePattern = async (patternId: string, enabled: boolean) => {
    try {
      const response = await fetch('/api/admin/security/patterns', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patternId, updates: { enabled } })
      });

      if (!response.ok) throw new Error('Failed to update pattern');
      
      await fetchPatterns();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update pattern');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Security Alerts</h2>
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
            Security Alerts
          </h2>
          <p className="text-gray-600">Monitor and manage suspicious admin activity</p>
        </div>
        <Button onClick={fetchAlerts} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full p-2 border rounded-md"
              >
                <option value="">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="ACKNOWLEDGED">Acknowledged</option>
                <option value="RESOLVED">Resolved</option>
                <option value="FALSE_POSITIVE">False Positive</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Severity</label>
              <select
                value={filters.severity}
                onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
                className="w-full p-2 border rounded-md"
              >
                <option value="">All Severities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">User ID</label>
              <input
                type="text"
                value={filters.userId}
                onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
                placeholder="Filter by user ID"
                className="w-full p-2 border rounded-md"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      <div className="space-y-4">
        {alerts.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <Shield className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Security Alerts</h3>
              <p className="text-gray-600">No suspicious activity detected at this time.</p>
            </CardContent>
          </Card>
        ) : (
          alerts.map((alert) => (
            <Card key={alert.id} className="border-l-4 border-l-orange-500">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-orange-500" />
                      {alert.title}
                    </CardTitle>
                    <CardDescription>{alert.description}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={severityColors[alert.severity]}>
                      {alert.severity}
                    </Badge>
                    <Badge className={statusColors[alert.status]}>
                      {alert.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">User ID:</span> {alert.userId}
                    </div>
                    <div>
                      <span className="font-medium">Triggered:</span> {new Date(alert.triggeredAt).toLocaleString()}
                    </div>
                    {alert.acknowledgedAt && (
                      <div>
                        <span className="font-medium">Acknowledged:</span> {new Date(alert.acknowledgedAt).toLocaleString()}
                      </div>
                    )}
                    {alert.resolvedAt && (
                      <div>
                        <span className="font-medium">Resolved:</span> {new Date(alert.resolvedAt).toLocaleString()}
                      </div>
                    )}
                  </div>

                  {alert.details && (
                    <div className="bg-gray-50 p-3 rounded-md">
                      <h4 className="font-medium mb-2">Alert Details:</h4>
                      <pre className="text-xs text-gray-600 overflow-x-auto">
                        {JSON.stringify(alert.details, null, 2)}
                      </pre>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    {alert.status === 'ACTIVE' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAlertAction(alert.id, 'acknowledge')}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Acknowledge
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAlertAction(alert.id, 'resolve', 'Resolved by admin')}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Resolve
                        </Button>
                      </>
                    )}
                    {alert.status === 'ACKNOWLEDGED' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAlertAction(alert.id, 'resolve', 'Resolved by admin')}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Resolve
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Security Patterns */}
      <Card>
        <CardHeader>
          <CardTitle>Security Patterns</CardTitle>
          <CardDescription>Configure suspicious activity detection patterns</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {patterns.map((pattern) => (
              <div key={pattern.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{pattern.name}</h4>
                    <Badge className={severityColors[pattern.severity]}>
                      {pattern.severity}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">{pattern.description}</p>
                  <div className="text-xs text-gray-500">
                    Cooldown: {pattern.cooldownMinutes}m | Max: {pattern.maxOccurrences} | Window: {pattern.timeWindowMinutes}m
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">
                    {pattern.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                  <Button
                    size="sm"
                    variant={pattern.enabled ? "destructive" : "default"}
                    onClick={() => togglePattern(pattern.id, !pattern.enabled)}
                  >
                    {pattern.enabled ? 'Disable' : 'Enable'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
