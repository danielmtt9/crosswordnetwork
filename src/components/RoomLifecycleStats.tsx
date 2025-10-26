"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Trash2, Play, Pause, Clock, Users, Activity } from 'lucide-react';

interface RoomLifecycleStats {
  totalRooms: number;
  activeRooms: number;
  waitingRooms: number;
  completedRooms: number;
  expiredRooms: number;
  averageRoomAge: number;
  averageSessionDuration: number;
}

export function RoomLifecycleStats() {
  const [stats, setStats] = useState<RoomLifecycleStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/room-lifecycle');
      if (response.ok) {
        const data = await response.json();
        setStats(data.data);
      } else {
        console.error('Failed to fetch room lifecycle stats');
      }
    } catch (error) {
      console.error('Error fetching room lifecycle stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const performAction = async (action: string) => {
    try {
      setActionLoading(action);
      const response = await fetch('/api/admin/room-lifecycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });

      if (response.ok) {
        const data = await response.json();
        console.log(data.message);
        // Refresh stats after action
        await fetchStats();
      } else {
        console.error(`Failed to perform ${action}`);
      }
    } catch (error) {
      console.error(`Error performing ${action}:`, error);
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Room Lifecycle Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading statistics...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Room Lifecycle Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Failed to load statistics
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Room Lifecycle Statistics
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => performAction('cleanup')}
              disabled={actionLoading === 'cleanup'}
            >
              {actionLoading === 'cleanup' ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              <span className="ml-2">Cleanup</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => performAction('restart')}
              disabled={actionLoading === 'restart'}
            >
              {actionLoading === 'restart' ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="ml-2">Restart</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchStats}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Room Status Overview */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Room Status Overview</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{stats.totalRooms}</div>
              <div className="text-sm text-blue-800">Total Rooms</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats.activeRooms}</div>
              <div className="text-sm text-green-800">Active</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{stats.waitingRooms}</div>
              <div className="text-sm text-yellow-800">Waiting</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{stats.completedRooms}</div>
              <div className="text-sm text-purple-800">Completed</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{stats.expiredRooms}</div>
              <div className="text-sm text-red-800">Expired</div>
            </div>
          </div>
        </div>

        {/* Room Metrics */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Room Metrics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium">Average Room Age</span>
              </div>
              <Badge variant="secondary">
                {stats.averageRoomAge.toFixed(1)} days
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium">Avg Session Duration</span>
              </div>
              <Badge variant="secondary">
                {stats.averageSessionDuration.toFixed(1)} min
              </Badge>
            </div>
          </div>
        </div>

        {/* Status Distribution */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Status Distribution</h3>
          <div className="space-y-2">
            {[
              { label: 'Active', value: stats.activeRooms, color: 'bg-green-500', percentage: (stats.activeRooms / stats.totalRooms) * 100 },
              { label: 'Waiting', value: stats.waitingRooms, color: 'bg-yellow-500', percentage: (stats.waitingRooms / stats.totalRooms) * 100 },
              { label: 'Completed', value: stats.completedRooms, color: 'bg-purple-500', percentage: (stats.completedRooms / stats.totalRooms) * 100 },
              { label: 'Expired', value: stats.expiredRooms, color: 'bg-red-500', percentage: (stats.expiredRooms / stats.totalRooms) * 100 }
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <div className="w-20 text-sm font-medium">{item.label}</div>
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${item.color}`}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
                <div className="w-16 text-sm text-right">
                  {item.value} ({item.percentage.toFixed(1)}%)
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
