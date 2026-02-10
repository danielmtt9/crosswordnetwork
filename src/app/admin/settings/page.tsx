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
  Settings,
  ArrowLeft,
  Loader2,
  Save,
  Plus,
  Edit,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Shield,
  Users,
  Puzzle,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { MaintenanceModeToggle } from "@/components/admin/MaintenanceModeToggle";

interface SystemConfig {
  id: string;
  key: string;
  value: any;
  description?: string;
  category: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

const CONFIG_CATEGORIES = {
  limits: 'System Limits',
  features: 'Feature Settings',
  security: 'Security Settings',
  performance: 'Performance Settings',
  general: 'General Settings'
};

const DEFAULT_CONFIGS = {
  limits: [
    { key: 'max_hints_per_puzzle', value: 3, description: 'Maximum hints allowed per puzzle' },
    { key: 'max_puzzle_size', value: 15, description: 'Maximum puzzle grid size' },
    { key: 'session_timeout_minutes', value: 30, description: 'User session timeout in minutes' }
  ],
  features: [
    { key: 'enable_achievements', value: true, description: 'Enable achievement system' },
    { key: 'enable_leaderboards', value: true, description: 'Enable leaderboards' }
  ],
  security: [
    { key: 'require_email_verification', value: true, description: 'Require email verification for new accounts' },
    { key: 'max_login_attempts', value: 5, description: 'Maximum login attempts before lockout' },
    { key: 'password_min_length', value: 8, description: 'Minimum password length' },
    { key: 'enable_2fa', value: false, description: 'Enable two-factor authentication' }
  ]
};

export default function AdminSettingsPage() {
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('limits');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<SystemConfig | null>(null);
  const [saving, setSaving] = useState(false);

  const [newConfig, setNewConfig] = useState({
    key: '',
    value: '',
    description: '',
    category: 'limits',
    isPublic: false
  });

  useEffect(() => {
    fetchConfigs();
  }, [selectedCategory]);

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/system-config?category=${selectedCategory}`);
      if (!response.ok) {
        throw new Error('Failed to fetch system configs');
      }
      const data = await response.json();
      setConfigs(data.configs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load system configs');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateConfig = async () => {
    try {
      setSaving(true);
      let parsedValue = newConfig.value;
      
      // Try to parse as JSON, fallback to string
      try {
        parsedValue = JSON.parse(newConfig.value);
      } catch {
        // Keep as string if not valid JSON
      }

      const response = await fetch('/api/admin/system-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: newConfig.key,
          value: parsedValue,
          description: newConfig.description,
          category: newConfig.category,
          isPublic: newConfig.isPublic
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create config');
      }

      setCreateModalOpen(false);
      setNewConfig({
        key: '',
        value: '',
        description: '',
        category: 'limits',
        isPublic: false
      });
      await fetchConfigs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create config');
    } finally {
      setSaving(false);
    }
  };

  const handleEditConfig = async (config: SystemConfig) => {
    setEditingConfig(config);
    setEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingConfig) return;

    try {
      setSaving(true);
      let parsedValue = editingConfig.value;
      
      // Try to parse as JSON, fallback to string
      try {
        parsedValue = JSON.parse(editingConfig.value as string);
      } catch {
        // Keep as string if not valid JSON
      }

      const response = await fetch('/api/admin/system-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: editingConfig.key,
          value: parsedValue,
          description: editingConfig.description,
          category: editingConfig.category,
          isPublic: editingConfig.isPublic
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update config');
      }

      setEditModalOpen(false);
      setEditingConfig(null);
      await fetchConfigs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update config');
    } finally {
      setSaving(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'limits':
        return <Shield className="h-4 w-4" />;
      case 'features':
        return <Puzzle className="h-4 w-4" />;
      case 'security':
        return <Shield className="h-4 w-4" />;
      case 'performance':
        return <Clock className="h-4 w-4" />;
      default:
        return <Settings className="h-4 w-4" />;
    }
  };

  const getValueType = (value: any): string => {
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return 'number';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'object';
    return 'string';
  };

  const formatValue = (value: any): string => {
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  if (loading && configs.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading settings...</span>
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
              <Button variant="ghost" size="sm" asChild>
                <Link href="/admin">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Admin
                </Link>
              </Button>
              <div className="p-2 rounded-lg bg-primary/10">
                <Settings className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">System Settings</h1>
                <p className="text-sm text-muted-foreground">Configure system limits and features</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => setCreateModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Config
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

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Sidebar */}
          <div className="space-y-6">
            {/* Maintenance Mode */}
            <MaintenanceModeToggle onUpdate={() => {}} />

            {/* Category Selector */}
            <Card>
              <CardHeader>
                <CardTitle>Configuration Categories</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {Object.entries(CONFIG_CATEGORIES).map(([key, label]) => (
                  <Button
                    key={key}
                    variant={selectedCategory === key ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => setSelectedCategory(key)}
                  >
                    {getCategoryIcon(key)}
                    <span className="ml-2">{label}</span>
                  </Button>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getCategoryIcon(selectedCategory)}
                  {CONFIG_CATEGORIES[selectedCategory as keyof typeof CONFIG_CATEGORIES]}
                </CardTitle>
                <CardDescription>
                  Manage {selectedCategory} configuration settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {configs.map((config, index) => (
                    <motion.div
                      key={config.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: index * 0.1 }}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{config.key}</h4>
                          <Badge variant="outline">{getValueType(config.value)}</Badge>
                          {config.isPublic && (
                            <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                              Public
                            </Badge>
                          )}
                        </div>
                        {config.description && (
                          <p className="text-sm text-muted-foreground mb-2">{config.description}</p>
                        )}
                        <div className="text-sm">
                          <span className="font-medium">Value: </span>
                          <code className="bg-muted px-2 py-1 rounded text-xs">
                            {formatValue(config.value)}
                          </code>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Updated {new Date(config.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditConfig(config)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  ))}

                  {configs.length === 0 && (
                    <div className="text-center py-8">
                      <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No Configurations</h3>
                      <p className="text-muted-foreground mb-4">
                        No configuration settings found for this category
                      </p>
                      <Button onClick={() => setCreateModalOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Configuration
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Create Config Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add System Configuration</DialogTitle>
            <DialogDescription>
              Create a new system configuration setting
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="key">Configuration Key *</Label>
              <Input
                id="key"
                value={newConfig.key}
                onChange={(e) => setNewConfig({ ...newConfig, key: e.target.value })}
                placeholder="e.g., max_hints_per_puzzle"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="value">Value *</Label>
              <Textarea
                id="value"
                value={newConfig.value}
                onChange={(e) => setNewConfig({ ...newConfig, value: e.target.value })}
                placeholder="Enter the configuration value (JSON format for objects/arrays)"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newConfig.description}
                onChange={(e) => setNewConfig({ ...newConfig, description: e.target.value })}
                placeholder="Describe what this configuration controls..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={newConfig.category} onValueChange={(value) => setNewConfig({ ...newConfig, category: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CONFIG_CATEGORIES).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isPublic"
                checked={newConfig.isPublic}
                onChange={(e) => setNewConfig({ ...newConfig, isPublic: e.target.checked })}
                className="rounded border-gray-300"
              />
              <Label htmlFor="isPublic">Public (accessible to frontend)</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateConfig}
              disabled={!newConfig.key.trim() || !newConfig.value.trim() || saving}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Create
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Config Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Configuration</DialogTitle>
            <DialogDescription>
              Update the system configuration setting
            </DialogDescription>
          </DialogHeader>

          {editingConfig && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-key">Configuration Key</Label>
                <Input
                  id="edit-key"
                  value={editingConfig.key}
                  disabled
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-value">Value *</Label>
                <Textarea
                  id="edit-value"
                  value={formatValue(editingConfig.value)}
                  onChange={(e) => setEditingConfig({ ...editingConfig, value: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editingConfig.description || ''}
                  onChange={(e) => setEditingConfig({ ...editingConfig, description: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="edit-isPublic"
                  checked={editingConfig.isPublic}
                  onChange={(e) => setEditingConfig({ ...editingConfig, isPublic: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="edit-isPublic">Public (accessible to frontend)</Label>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveEdit}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
