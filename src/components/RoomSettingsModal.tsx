import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Eye, Shield, Settings, Save, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { RoomRoleSettings } from '@/lib/enhancedRoleSystem';

interface RoomSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  currentSettings: RoomRoleSettings;
  onSettingsUpdate: (settings: RoomRoleSettings) => void;
  currentCollaboratorCount: number;
  isHost: boolean;
}

export function RoomSettingsModal({
  isOpen,
  onClose,
  roomId,
  currentSettings,
  onSettingsUpdate,
  currentCollaboratorCount,
  isHost
}: RoomSettingsModalProps) {
  const [settings, setSettings] = useState<RoomRoleSettings>(currentSettings);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setSettings(currentSettings);
    setHasChanges(false);
    setError(null);
  }, [currentSettings, isOpen]);

  const handleSettingChange = (key: keyof RoomRoleSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
    setHasChanges(true);
    setError(null);
  };

  const handleSave = async () => {
    if (!isHost) {
      setError('Only room host can modify settings');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/multiplayer/rooms/${roomId}/role-settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update room settings');
      }

      const updatedSettings = await response.json();
      onSettingsUpdate(updatedSettings);
      setHasChanges(false);
      onClose();
    } catch (err) {
      console.error('Error updating room settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to update settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setSettings(currentSettings);
    setHasChanges(false);
    setError(null);
    onClose();
  };

  const collaboratorLimitOptions = Array.from({ length: 9 }, (_, i) => i + 2); // 2-10

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        onClick={(e) => e.target === e.currentTarget && handleCancel()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
          role="dialog"
          aria-labelledby="room-settings-title"
          aria-describedby="room-settings-description"
        >
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Settings className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 id="room-settings-title" className="text-xl font-semibold">Room Settings</h2>
                <p id="room-settings-description" className="text-sm text-gray-500 dark:text-gray-400">
                  Configure collaboration and access settings
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Collaborator Limits */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Collaborator Limits
                </CardTitle>
                <CardDescription>
                  Set the maximum number of users who can collaborate on puzzles
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="maxCollaborators" className="text-sm font-medium">
                    Maximum Collaborators
                  </Label>
                  <Badge variant="outline" className="text-xs">
                    Current: {currentCollaboratorCount}
                  </Badge>
                </div>
                <Select
                  value={settings.maxCollaborators.toString()}
                  onValueChange={(value) => handleSettingChange('maxCollaborators', parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {collaboratorLimitOptions.map((limit) => (
                      <SelectItem key={limit} value={limit.toString()}>
                        {limit} {limit === 1 ? 'collaborator' : 'collaborators'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Collaborators can edit puzzles and participate in real-time collaboration
                </p>
              </CardContent>
            </Card>

            {/* Spectator Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Spectator Access
                </CardTitle>
                <CardDescription>
                  Control whether spectators can join the room
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="allowSpectators" className="text-sm font-medium">
                      Allow Spectators
                    </Label>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Spectators can watch but cannot edit puzzles
                    </p>
                  </div>
                  <Switch
                    id="allowSpectators"
                    checked={settings.allowSpectators}
                    onCheckedChange={(checked) => handleSettingChange('allowSpectators', checked)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Premium Requirements */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Premium Requirements
                </CardTitle>
                <CardDescription>
                  Set requirements for hosting and collaboration
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="requirePremiumToHost" className="text-sm font-medium">
                      Premium Required to Host
                    </Label>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Only premium users can create and host rooms
                    </p>
                  </div>
                  <Switch
                    id="requirePremiumToHost"
                    checked={settings.requirePremiumToHost}
                    onCheckedChange={(checked) => handleSettingChange('requirePremiumToHost', checked)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Role Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Role Management
                </CardTitle>
                <CardDescription>
                  Control role changes and default permissions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="allowRoleChanges" className="text-sm font-medium">
                      Allow Role Changes
                    </Label>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Hosts can change user roles during the session
                    </p>
                  </div>
                  <Switch
                    id="allowRoleChanges"
                    checked={settings.allowRoleChanges}
                    onCheckedChange={(checked) => handleSettingChange('allowRoleChanges', checked)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="defaultRole" className="text-sm font-medium">
                    Default Role for New Users
                  </Label>
                  <Select
                    value={settings.defaultRole}
                    onValueChange={(value) => handleSettingChange('defaultRole', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SPECTATOR">Spectator (Read-only)</SelectItem>
                      <SelectItem value="PLAYER">Player (Collaborator)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    New users will be assigned this role when joining
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isLoading || !hasChanges}
              className="min-w-[100px]"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Saving...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  Save Changes
                </div>
              )}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
