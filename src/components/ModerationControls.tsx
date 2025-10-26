/**
 * Moderation controls component for hosts and moderators
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  Users, 
  AlertTriangle, 
  Ban, 
  CheckCircle, 
  Settings,
  History,
  UserX,
  UserCheck,
  Bell
} from 'lucide-react';
import { useChatModeration } from '@/hooks/useChatModeration';
import { ModerationConfig } from '@/lib/chatModeration';

interface ModerationControlsProps {
  roomId: string;
  currentUserId: string;
  isHost: boolean;
  isModerator: boolean;
  participants: Array<{
    userId: string;
    userName: string;
    userRole: string;
    isOnline: boolean;
  }>;
  onUserAction?: (action: string, userId: string, reason?: string) => void;
  className?: string;
}

export function ModerationControls({
  roomId,
  currentUserId,
  isHost,
  isModerator,
  participants,
  onUserAction,
  className
}: ModerationControlsProps) {
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [blockReason, setBlockReason] = useState('');
  const [customFilter, setCustomFilter] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const {
    isEnabled,
    isStrictMode,
    blockedUsers,
    warningCounts,
    checkMessage,
    blockUser,
    unblockUser,
    clearWarnings,
    toggleModeration,
    toggleStrictMode,
    updateConfig,
    getStats,
    getRecentActions,
    isUserBlocked,
    getUserWarningCount
  } = useChatModeration({
    onModerationAction: onUserAction,
    onWarning: (userId, count) => {
      console.log(`User ${userId} received warning ${count}`);
    },
    onBlock: (userId, reason) => {
      console.log(`User ${userId} blocked: ${reason}`);
    }
  });

  const stats = getStats();
  const recentActions = getRecentActions(20);

  const handleBlockUser = () => {
    if (!selectedUser || !blockReason.trim()) return;
    
    blockUser(selectedUser, blockReason);
    setSelectedUser(null);
    setBlockReason('');
  };

  const handleUnblockUser = (userId: string) => {
    unblockUser(userId);
  };

  const handleClearWarnings = (userId: string) => {
    clearWarnings(userId);
  };

  const handleAddCustomFilter = () => {
    if (!customFilter.trim()) return;
    
    updateConfig({
      customFilters: [...(updateConfig as any).customFilters || [], customFilter]
    });
    setCustomFilter('');
  };

  const handleRemoveCustomFilter = (filter: string) => {
    // This would need to be implemented in the moderation hook
    console.log('Remove filter:', filter);
  };

  if (!isHost && !isModerator) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Moderation Controls
        </CardTitle>
        <CardDescription>
          Manage chat moderation and user actions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={toggleModeration}
                  />
                  Enable Moderation
                </Label>
                <Label className="flex items-center gap-2">
                  <Switch
                    checked={isStrictMode}
                    onCheckedChange={toggleStrictMode}
                  />
                  Strict Mode
                </Label>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm">Total Warnings: {stats.totalWarnings}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Ban className="h-4 w-4 text-red-500" />
                  <span className="text-sm">Blocked Users: {stats.blockedCount}</span>
                </div>
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-blue-500" />
                  <span className="text-sm">Recent Actions: {stats.recentActionCount}</span>
                </div>
              </div>
            </div>

            {!isEnabled && (
              <Alert>
                <Bell className="h-4 w-4" />
                <AlertDescription>
                  Moderation is currently disabled. Enable it to start filtering content.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <div className="space-y-2">
              <Label>Participants ({participants.length})</Label>
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {participants.map((participant) => {
                    const isBlocked = isUserBlocked(participant.userId);
                    const warningCount = getUserWarningCount(participant.userId);
                    
                    return (
                      <div
                        key={participant.userId}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${
                            participant.isOnline ? 'bg-green-500' : 'bg-gray-400'
                          }`} />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{participant.userName}</span>
                              <Badge variant="secondary">{participant.userRole}</Badge>
                              {isBlocked && <Badge variant="destructive">Blocked</Badge>}
                              {warningCount > 0 && (
                                <Badge variant="outline" className="text-yellow-600">
                                  {warningCount} warnings
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isBlocked ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUnblockUser(participant.userId)}
                            >
                              <UserCheck className="h-4 w-4 mr-1" />
                              Unblock
                            </Button>
                          ) : (
                            <>
                              {warningCount > 0 && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleClearWarnings(participant.userId)}
                                >
                                  Clear Warnings
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  setSelectedUser(participant.userId);
                                  setBlockReason('');
                                }}
                              >
                                <UserX className="h-4 w-4 mr-1" />
                                Block
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>

            {selectedUser && (
              <div className="space-y-2 p-4 border rounded-lg bg-muted/50">
                <Label>Block User</Label>
                <Input
                  placeholder="Reason for blocking..."
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button onClick={handleBlockUser} disabled={!blockReason.trim()}>
                    Block User
                  </Button>
                  <Button variant="outline" onClick={() => setSelectedUser(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label>Custom Filters</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="Add custom filter..."
                    value={customFilter}
                    onChange={(e) => setCustomFilter(e.target.value)}
                  />
                  <Button onClick={handleAddCustomFilter} disabled={!customFilter.trim()}>
                    Add
                  </Button>
                </div>
              </div>

              <div>
                <Label>Advanced Settings</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="mt-2"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  {showAdvanced ? 'Hide' : 'Show'} Advanced
                </Button>
                
                {showAdvanced && (
                  <div className="mt-4 space-y-4 p-4 border rounded-lg">
                    <div>
                      <Label>Max Warnings per User</Label>
                      <Input type="number" defaultValue="3" min="1" max="10" />
                    </div>
                    <div>
                      <Label>Warning Cooldown (minutes)</Label>
                      <Input type="number" defaultValue="5" min="1" max="60" />
                    </div>
                    <div>
                      <Label>Whitelist Users (comma-separated)</Label>
                      <Input placeholder="user1,user2,user3" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <div className="space-y-2">
              <Label>Recent Moderation Actions</Label>
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {recentActions.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">
                      No recent moderation actions
                    </p>
                  ) : (
                    recentActions.map((action, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          {action.action === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                          {action.action === 'block' && <Ban className="h-4 w-4 text-red-500" />}
                          {action.action === 'unblock' && <UserCheck className="h-4 w-4 text-green-500" />}
                          {action.action === 'clear-warnings' && <CheckCircle className="h-4 w-4 text-blue-500" />}
                          <div>
                            <div className="font-medium capitalize">
                              {action.action.replace('-', ' ')}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              User: {action.userId}
                              {action.reason && ` • ${action.reason}`}
                            </div>
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {action.timestamp.toLocaleTimeString()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
