"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ToggleLeft,
  ToggleRight,
  Plus,
  Settings,
  History,
  RotateCcw,
  Loader2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Users,
  Target,
  BarChart3,
} from "lucide-react";
import { useSession } from "next-auth/react";
// Removed direct import of isSuperAdmin - now using API route

interface FeatureFlag {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  rolloutPercentage: number;
  targetUsers?: string[];
  targetRoles?: string[];
  conditions?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  version: number;
}

interface FeatureFlagHistory {
  id: string;
  featureFlagId: string;
  action: string;
  previousState?: any;
  newState?: any;
  actorUserId: string;
  createdAt: string;
}

export default function FeatureFlagsPage() {
  const { data: session } = useSession();
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedFlag, setSelectedFlag] = useState<FeatureFlag | null>(null);
  const [flagHistory, setFlagHistory] = useState<FeatureFlagHistory[]>([]);
  const [toggling, setToggling] = useState<string | null>(null);

  const currentUserEmail = session?.user?.email;
  const [isCurrentUserSuperAdmin, setIsCurrentUserSuperAdmin] = useState(false);

  useEffect(() => {
    const checkSuperAdminStatus = async () => {
      if (currentUserEmail) {
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
    checkSuperAdminStatus();
  }, [currentUserEmail]);

  // Form state for creating new flags
  const [newFlag, setNewFlag] = useState({
    name: '',
    description: '',
    enabled: false,
    rolloutPercentage: 0,
    targetUsers: '',
    targetRoles: '',
    conditions: ''
  });

  useEffect(() => {
    fetchFeatureFlags();
  }, []);

  const fetchFeatureFlags = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/feature-flags');
      if (!response.ok) {
        throw new Error('Failed to fetch feature flags');
      }
      const data = await response.json();
      setFlags(data.flags);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feature flags');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFlag = async () => {
    try {
      const targetUsers = newFlag.targetUsers 
        ? newFlag.targetUsers.split(',').map(u => u.trim()).filter(Boolean)
        : undefined;
      
      const targetRoles = newFlag.targetRoles
        ? newFlag.targetRoles.split(',').map(r => r.trim()).filter(Boolean)
        : undefined;

      const conditions = newFlag.conditions 
        ? JSON.parse(newFlag.conditions)
        : undefined;

      const response = await fetch('/api/admin/feature-flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newFlag.name,
          description: newFlag.description,
          enabled: newFlag.enabled,
          rolloutPercentage: newFlag.rolloutPercentage,
          targetUsers,
          targetRoles,
          conditions
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create feature flag');
      }

      setCreateModalOpen(false);
      setNewFlag({
        name: '',
        description: '',
        enabled: false,
        rolloutPercentage: 0,
        targetUsers: '',
        targetRoles: '',
        conditions: ''
      });
      await fetchFeatureFlags();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create feature flag');
    }
  };

  const handleToggleFlag = async (flagId: string) => {
    try {
      setToggling(flagId);
      const response = await fetch(`/api/admin/feature-flags/${flagId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle' })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to toggle feature flag');
      }

      await fetchFeatureFlags();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle feature flag');
    } finally {
      setToggling(null);
    }
  };

  const handleViewHistory = async (flag: FeatureFlag) => {
    try {
      const response = await fetch(`/api/admin/feature-flags/${flag.id}?includeHistory=true`);
      if (!response.ok) {
        throw new Error('Failed to fetch flag history');
      }
      const data = await response.json();
      setSelectedFlag(flag);
      setFlagHistory(data.history || []);
      setHistoryModalOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load flag history');
    }
  };

  const handleRollback = async (historyId: string) => {
    if (!selectedFlag) return;

    try {
      const response = await fetch(`/api/admin/feature-flags/${selectedFlag.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rollback', historyId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to rollback feature flag');
      }

      setHistoryModalOpen(false);
      await fetchFeatureFlags();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rollback feature flag');
    }
  };

  const getStatusColor = (enabled: boolean, rolloutPercentage: number) => {
    if (!enabled) return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    if (rolloutPercentage === 100) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    if (rolloutPercentage > 0) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
  };

  const getStatusText = (enabled: boolean, rolloutPercentage: number) => {
    if (!enabled) return 'Disabled';
    if (rolloutPercentage === 100) return 'Fully Enabled';
    if (rolloutPercentage > 0) return `${rolloutPercentage}% Rollout`;
    return 'Targeted Only';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading feature flags...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-xl">
        <div className="container mx-auto max-w-7xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Settings className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Feature Flags</h1>
                <p className="text-sm text-muted-foreground">Manage feature toggles and rollouts</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => setCreateModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Flag
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto max-w-7xl px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </div>
          </div>
        )}

        <div className="grid gap-6">
          {flags.map((flag, index) => (
            <motion.div
              key={flag.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{flag.name}</h3>
                        <Badge className={getStatusColor(flag.enabled, flag.rolloutPercentage)}>
                          {getStatusText(flag.enabled, flag.rolloutPercentage)}
                        </Badge>
                        <Badge variant="outline">v{flag.version}</Badge>
                      </div>
                      
                      {flag.description && (
                        <p className="text-muted-foreground mb-3">{flag.description}</p>
                      )}

                      <div className="flex items-center gap-6 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <BarChart3 className="h-4 w-4" />
                          <span>{flag.rolloutPercentage}% rollout</span>
                        </div>
                        
                        {flag.targetUsers && flag.targetUsers.length > 0 && (
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            <span>{flag.targetUsers.length} targeted users</span>
                          </div>
                        )}
                        
                        {flag.targetRoles && flag.targetRoles.length > 0 && (
                          <div className="flex items-center gap-1">
                            <Target className="h-4 w-4" />
                            <span>{flag.targetRoles.join(', ')} roles</span>
                          </div>
                        )}

                        <div className="flex items-center gap-1">
                          <span>Updated {new Date(flag.updatedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewHistory(flag)}
                      >
                        <History className="h-4 w-4 mr-2" />
                        History
                      </Button>
                      
                      <Button
                        variant={flag.enabled ? "destructive" : "default"}
                        size="sm"
                        onClick={() => handleToggleFlag(flag.id)}
                        disabled={toggling === flag.id}
                      >
                        {toggling === flag.id ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : flag.enabled ? (
                          <ToggleRight className="h-4 w-4 mr-2" />
                        ) : (
                          <ToggleLeft className="h-4 w-4 mr-2" />
                        )}
                        {flag.enabled ? 'Disable' : 'Enable'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}

          {flags.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Feature Flags</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first feature flag to start managing feature rollouts
                </p>
                <Button onClick={() => setCreateModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Feature Flag
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Create Feature Flag Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Feature Flag</DialogTitle>
            <DialogDescription>
              Create a new feature flag to control feature rollouts
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Flag Name *</Label>
              <Input
                id="name"
                value={newFlag.name}
                onChange={(e) => setNewFlag({ ...newFlag, name: e.target.value })}
                placeholder="e.g., new_dashboard_ui"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newFlag.description}
                onChange={(e) => setNewFlag({ ...newFlag, description: e.target.value })}
                placeholder="Describe what this feature flag controls..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rolloutPercentage">Rollout Percentage</Label>
              <Input
                id="rolloutPercentage"
                type="number"
                min="0"
                max="100"
                value={newFlag.rolloutPercentage}
                onChange={(e) => setNewFlag({ ...newFlag, rolloutPercentage: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetUsers">Target Users (comma-separated emails)</Label>
              <Input
                id="targetUsers"
                value={newFlag.targetUsers}
                onChange={(e) => setNewFlag({ ...newFlag, targetUsers: e.target.value })}
                placeholder="user1@example.com, user2@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetRoles">Target Roles (comma-separated)</Label>
              <Input
                id="targetRoles"
                value={newFlag.targetRoles}
                onChange={(e) => setNewFlag({ ...newFlag, targetRoles: e.target.value })}
                placeholder="PREMIUM, ADMIN"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="enabled"
                checked={newFlag.enabled}
                onChange={(e) => setNewFlag({ ...newFlag, enabled: e.target.checked })}
                className="rounded border-gray-300"
              />
              <Label htmlFor="enabled">Enable immediately</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateFlag}
              disabled={!newFlag.name.trim()}
            >
              Create Flag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Modal */}
      <Dialog open={historyModalOpen} onOpenChange={setHistoryModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Feature Flag History</DialogTitle>
            <DialogDescription>
              History for {selectedFlag?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {flagHistory.map((entry, index) => (
              <div key={entry.id} className="flex items-start gap-3 p-3 border rounded-lg">
                <div className="p-2 rounded-full bg-muted">
                  {entry.action === 'CREATED' ? (
                    <Plus className="h-4 w-4" />
                  ) : entry.action === 'UPDATED' ? (
                    <Settings className="h-4 w-4" />
                  ) : entry.action === 'ROLLBACK' ? (
                    <RotateCcw className="h-4 w-4" />
                  ) : (
                    <History className="h-4 w-4" />
                  )}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline">{entry.action}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {new Date(entry.createdAt).toLocaleString()}
                    </span>
                  </div>
                  
                  {entry.action === 'UPDATED' && entry.previousState && (
                    <div className="text-sm text-muted-foreground">
                      <p>Previous: {entry.previousState.enabled ? 'Enabled' : 'Disabled'} 
                         ({entry.previousState.rolloutPercentage}% rollout)</p>
                    </div>
                  )}
                  
                  {entry.action === 'ROLLBACK' && (
                    <div className="mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRollback(entry.id)}
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Rollback to this state
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {flagHistory.length === 0 && (
              <div className="text-center py-8">
                <History className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No history available</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setHistoryModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
