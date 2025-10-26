/**
 * Room settings management interface
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Settings,
  Users,
  Clock,
  Shield,
  MessageSquare,
  Puzzle,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { useRoomSettings } from '@/hooks/useRoomSettings';

interface RoomSettingsManagementProps {
  roomId: string;
  className?: string;
}

export function RoomSettingsManagement({ roomId, className }: RoomSettingsManagementProps) {
  const {
    settings,
    isLoading,
    error,
    updateSettings,
    resetSettings,
    isSaving
  } = useRoomSettings({ roomId });

  const [hasChanges, setHasChanges] = useState(false);

  const handleSettingChange = (key: string, value: any) => {
    if (settings) {
      updateSettings({ [key]: value });
      setHasChanges(true);
    }
  };

  const handleSave = async () => {
    try {
      await updateSettings(settings);
      setHasChanges(false);
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
  };

  const handleReset = async () => {
    try {
      await resetSettings();
      setHasChanges(false);
    } catch (err) {
      console.error('Failed to reset settings:', err);
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Settings className="h-4 w-4 animate-pulse mr-2" />
            <span>Loading settings...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Failed to load settings: {error}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!settings) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <Settings className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No settings available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            <CardTitle className="text-lg">Room Settings</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {hasChanges && (
              <Badge variant="outline" className="text-xs">
                Unsaved Changes
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={isSaving}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className="flex items-center gap-2"
            >
              {isSaving ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
        <CardDescription>
          Configure room behavior and permissions
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="general" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="participants">Participants</TabsTrigger>
            <TabsTrigger value="moderation">Moderation</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="roomName">Room Name</Label>
                <Input
                  id="roomName"
                  value={settings.roomName}
                  onChange={(e) => handleSettingChange('roomName', e.target.value)}
                  placeholder="Enter room name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="roomDescription">Description</Label>
                <Input
                  id="roomDescription"
                  value={settings.description}
                  onChange={(e) => handleSettingChange('description', e.target.value)}
                  placeholder="Enter room description"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxParticipants">Maximum Participants</Label>
                <Select
                  value={settings.maxParticipants.toString()}
                  onValueChange={(value) => handleSettingChange('maxParticipants', parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2, 4, 6, 8, 10, 12, 16, 20].map((num) => (
                      <SelectItem key={num} value={num.toString()}>
                        {num} participants
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="isPublic">Public Room</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow anyone to join without invitation
                  </p>
                </div>
                <Switch
                  id="isPublic"
                  checked={settings.isPublic}
                  onCheckedChange={(checked) => handleSettingChange('isPublic', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="allowSpectators">Allow Spectators</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow users to watch without participating
                  </p>
                </div>
                <Switch
                  id="allowSpectators"
                  checked={settings.allowSpectators}
                  onCheckedChange={(checked) => handleSettingChange('allowSpectators', checked)}
                />
              </div>
            </div>
          </TabsContent>

          {/* Participant Settings */}
          <TabsContent value="participants" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="defaultRole">Default Role for New Participants</Label>
                <Select
                  value={settings.defaultRole}
                  onValueChange={(value) => handleSettingChange('defaultRole', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PLAYER">Player</SelectItem>
                    <SelectItem value="SPECTATOR">Spectator</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="autoPromote">Auto-promote Active Users</Label>
                <Select
                  value={settings.autoPromote ? 'true' : 'false'}
                  onValueChange={(value) => handleSettingChange('autoPromote', value === 'true')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Enabled</SelectItem>
                    <SelectItem value="false">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="requireApproval">Require Approval to Join</Label>
                  <p className="text-sm text-muted-foreground">
                    Host must approve new participants
                  </p>
                </div>
                <Switch
                  id="requireApproval"
                  checked={settings.requireApproval}
                  onCheckedChange={(checked) => handleSettingChange('requireApproval', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="allowRoleChanges">Allow Role Changes</Label>
                  <p className="text-sm text-muted-foreground">
                    Participants can change their own roles
                  </p>
                </div>
                <Switch
                  id="allowRoleChanges"
                  checked={settings.allowRoleChanges}
                  onCheckedChange={(checked) => handleSettingChange('allowRoleChanges', checked)}
                />
              </div>
            </div>
          </TabsContent>

          {/* Moderation Settings */}
          <TabsContent value="moderation" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="enableModeration">Enable Moderation</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable chat and content moderation
                  </p>
                </div>
                <Switch
                  id="enableModeration"
                  checked={settings.enableModeration}
                  onCheckedChange={(checked) => handleSettingChange('enableModeration', checked)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="moderationLevel">Moderation Level</Label>
                <Select
                  value={settings.moderationLevel}
                  onValueChange={(value) => handleSettingChange('moderationLevel', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LENIENT">Lenient</SelectItem>
                    <SelectItem value="MODERATE">Moderate</SelectItem>
                    <SelectItem value="STRICT">Strict</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxWarnings">Maximum Warnings Before Mute</Label>
                <Slider
                  value={[settings.maxWarnings]}
                  onValueChange={([value]) => handleSettingChange('maxWarnings', value)}
                  max={10}
                  min={1}
                  step={1}
                  className="w-full"
                />
                <div className="text-sm text-muted-foreground">
                  {settings.maxWarnings} warnings
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="autoModeration">Auto-moderation</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically moderate content
                  </p>
                </div>
                <Switch
                  id="autoModeration"
                  checked={settings.autoModeration}
                  onCheckedChange={(checked) => handleSettingChange('autoModeration', checked)}
                />
              </div>
            </div>
          </TabsContent>

          {/* Advanced Settings */}
          <TabsContent value="advanced" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="roomTimeout">Room Timeout (minutes)</Label>
                <Input
                  id="roomTimeout"
                  type="number"
                  value={settings.roomTimeout}
                  onChange={(e) => handleSettingChange('roomTimeout', parseInt(e.target.value))}
                  min={5}
                  max={1440}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="backupInterval">Backup Interval (minutes)</Label>
                <Input
                  id="backupInterval"
                  type="number"
                  value={settings.backupInterval}
                  onChange={(e) => handleSettingChange('backupInterval', parseInt(e.target.value))}
                  min={1}
                  max={60}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="enableAnalytics">Enable Analytics</Label>
                  <p className="text-sm text-muted-foreground">
                    Collect room performance data
                  </p>
                </div>
                <Switch
                  id="enableAnalytics"
                  checked={settings.enableAnalytics}
                  onCheckedChange={(checked) => handleSettingChange('enableAnalytics', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="enableLogging">Enable Logging</Label>
                  <p className="text-sm text-muted-foreground">
                    Log room activities and events
                  </p>
                </div>
                <Switch
                  id="enableLogging"
                  checked={settings.enableLogging}
                  onCheckedChange={(checked) => handleSettingChange('enableLogging', checked)}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="customSettings">Custom Settings (JSON)</Label>
                <textarea
                  id="customSettings"
                  value={JSON.stringify(settings.customSettings, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      handleSettingChange('customSettings', parsed);
                    } catch (err) {
                      // Invalid JSON, don't update
                    }
                  }}
                  className="w-full h-32 p-2 border rounded-md font-mono text-sm"
                  placeholder="Enter custom settings as JSON"
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default RoomSettingsManagement;