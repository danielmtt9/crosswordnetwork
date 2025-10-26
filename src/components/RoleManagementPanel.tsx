import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  Crown, 
  Shield, 
  UserCheck, 
  Eye, 
  MoreVertical, 
  UserPlus, 
  UserMinus,
  Settings,
  Bell,
  BellOff,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { RoleChangeNotificationList } from './RoleChangeNotification';
import { useRoleManagement } from '@/hooks/useRoleManagement';
import { useRoleChangeNotifications } from '@/hooks/useRoleChangeNotifications';
import { useNotificationPreferences } from '@/hooks/useRoleChangeNotifications';
import { cn } from '@/lib/utils';

interface Participant {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar?: string;
  role: 'HOST' | 'MODERATOR' | 'PLAYER' | 'SPECTATOR';
  isOnline: boolean;
  joinedAt: Date;
  lastSeenAt?: Date;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    subscriptionStatus: string;
  };
}

interface RoleManagementPanelProps {
  roomId: string;
  currentUserId: string;
  participants: Participant[];
  onParticipantUpdate?: (participants: Participant[]) => void;
  className?: string;
}

const roleIcons = {
  HOST: Crown,
  MODERATOR: Shield,
  PLAYER: UserCheck,
  SPECTATOR: Eye
};

const roleColors = {
  HOST: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  MODERATOR: 'bg-purple-100 text-purple-800 border-purple-200',
  PLAYER: 'bg-green-100 text-green-800 border-green-200',
  SPECTATOR: 'bg-gray-100 text-gray-800 border-gray-200'
};

export function RoleManagementPanel({
  roomId,
  currentUserId,
  participants,
  onParticipantUpdate,
  className
}: RoleManagementPanelProps) {
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);

  const {
    isLoading: roleLoading,
    error: roleError,
    changeRole,
    promoteUser,
    demoteUser,
    transferHost,
    removeParticipant
  } = useRoleManagement();

  const {
    notifications,
    unreadCount,
    isLoading: notificationsLoading,
    markAsRead,
    markAllAsRead,
    dismiss,
    clearAll,
    handleAction
  } = useRoleChangeNotifications({
    roomId,
    currentUserId,
    enabled: true
  });

  const { preferences, updatePreference } = useNotificationPreferences();

  const currentUser = participants.find(p => p.userId === currentUserId);
  const isHost = currentUser?.role === 'HOST';
  const isModerator = currentUser?.role === 'MODERATOR';

  const handleRoleChange = useCallback(async (participant: Participant, newRole: string, reason?: string) => {
    if (!isHost) return;

    const success = await changeRole({
      userId: participant.userId,
      newRole: newRole as any,
      reason
    });

    if (success) {
      // Update local state
      const updatedParticipants = participants.map(p =>
        p.userId === participant.userId
          ? { ...p, role: newRole as any }
          : p
      );
      onParticipantUpdate?.(updatedParticipants);
    }
  }, [isHost, changeRole, participants, onParticipantUpdate]);

  const handlePromote = useCallback(async (participant: Participant, reason?: string) => {
    if (!isHost) return;

    const success = await promoteUser(participant.userId, reason);
    if (success) {
      const updatedParticipants = participants.map(p =>
        p.userId === participant.userId
          ? { ...p, role: 'MODERATOR' }
          : p
      );
      onParticipantUpdate?.(updatedParticipants);
    }
  }, [isHost, promoteUser, participants, onParticipantUpdate]);

  const handleDemote = useCallback(async (participant: Participant, newRole: string, reason?: string) => {
    if (!isHost) return;

    const success = await demoteUser(participant.userId, newRole as any, reason);
    if (success) {
      const updatedParticipants = participants.map(p =>
        p.userId === participant.userId
          ? { ...p, role: newRole as any }
          : p
      );
      onParticipantUpdate?.(updatedParticipants);
    }
  }, [isHost, demoteUser, participants, onParticipantUpdate]);

  const handleTransferHost = useCallback(async (participant: Participant, reason?: string) => {
    if (!isHost) return;

    const success = await transferHost(participant.userId, reason);
    if (success) {
      // Update all participants
      const updatedParticipants = participants.map(p => {
        if (p.userId === participant.userId) {
          return { ...p, role: 'HOST' };
        } else if (p.userId === currentUserId) {
          return { ...p, role: 'MODERATOR' };
        }
        return p;
      });
      onParticipantUpdate?.(updatedParticipants);
    }
  }, [isHost, transferHost, participants, currentUserId, onParticipantUpdate]);

  const handleRemoveParticipant = useCallback(async (participant: Participant, reason?: string) => {
    if (!isHost && !isModerator) return;

    const success = await removeParticipant(participant.userId, reason);
    if (success) {
      const updatedParticipants = participants.filter(p => p.userId !== participant.userId);
      onParticipantUpdate?.(updatedParticipants);
    }
  }, [isHost, isModerator, removeParticipant, participants, onParticipantUpdate]);

  const getRoleActions = (participant: Participant) => {
    if (!isHost) return [];

    const actions = [];

    if (participant.role === 'PLAYER') {
      actions.push({
        label: 'Promote to Moderator',
        icon: Shield,
        onClick: () => handlePromote(participant, 'Promoted by host'),
        className: 'text-purple-600'
      });
    }

    if (participant.role === 'MODERATOR') {
      actions.push({
        label: 'Demote to Player',
        icon: UserCheck,
        onClick: () => handleDemote(participant, 'PLAYER', 'Demoted by host'),
        className: 'text-green-600'
      });
      actions.push({
        label: 'Demote to Spectator',
        icon: Eye,
        onClick: () => handleDemote(participant, 'SPECTATOR', 'Demoted by host'),
        className: 'text-gray-600'
      });
    }

    if (participant.role === 'SPECTATOR') {
      actions.push({
        label: 'Promote to Player',
        icon: UserCheck,
        onClick: () => handleRoleChange(participant, 'PLAYER', 'Promoted by host'),
        className: 'text-green-600'
      });
    }

    if (participant.userId !== currentUserId) {
      actions.push({
        label: 'Transfer Host',
        icon: Crown,
        onClick: () => handleTransferHost(participant, 'Host transferred'),
        className: 'text-yellow-600'
      });
    }

    if (participant.userId !== currentUserId && (isHost || isModerator)) {
      actions.push({
        label: 'Remove Participant',
        icon: UserMinus,
        onClick: () => handleRemoveParticipant(participant, 'Removed by moderator'),
        className: 'text-red-600'
      });
    }

    return actions;
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Role Management
              </CardTitle>
              <CardDescription>
                Manage participant roles and permissions
              </CardDescription>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {unreadCount}
                  </Badge>
                )}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreferences(!showPreferences)}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Notifications Panel */}
      {showNotifications && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Role Change Notifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RoleChangeNotificationList
                notifications={notifications}
                onDismiss={dismiss}
                onMarkAsRead={markAsRead}
                onAction={handleAction}
                onMarkAllAsRead={markAllAsRead}
                onClearAll={clearAll}
              />
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Preferences Panel */}
      {showPreferences && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="roleChanges"
                    checked={preferences.roleChanges}
                    onCheckedChange={(checked) => updatePreference('roleChanges', checked)}
                  />
                  <Label htmlFor="roleChanges">Role Changes</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="promotions"
                    checked={preferences.promotions}
                    onCheckedChange={(checked) => updatePreference('promotions', checked)}
                  />
                  <Label htmlFor="promotions">Promotions</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="demotions"
                    checked={preferences.demotions}
                    onCheckedChange={(checked) => updatePreference('demotions', checked)}
                  />
                  <Label htmlFor="demotions">Demotions</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="hostTransfers"
                    checked={preferences.hostTransfers}
                    onCheckedChange={(checked) => updatePreference('hostTransfers', checked)}
                  />
                  <Label htmlFor="hostTransfers">Host Transfers</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="participantRemovals"
                    checked={preferences.participantRemovals}
                    onCheckedChange={(checked) => updatePreference('participantRemovals', checked)}
                  />
                  <Label htmlFor="participantRemovals">Participant Removals</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="soundEnabled"
                    checked={preferences.soundEnabled}
                    onCheckedChange={(checked) => updatePreference('soundEnabled', checked)}
                  />
                  <Label htmlFor="soundEnabled">Sound Notifications</Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Participants List */}
      <Card>
        <CardHeader>
          <CardTitle>Participants</CardTitle>
          <CardDescription>
            {participants.length} participant{participants.length !== 1 ? 's' : ''} in the room
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {participants.map((participant) => {
              const RoleIcon = roleIcons[participant.role];
              const actions = getRoleActions(participant);
              
              return (
                <motion.div
                  key={participant.userId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={participant.userAvatar} />
                      <AvatarFallback>
                        {participant.userName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{participant.userName}</span>
                        {participant.userId === currentUserId && (
                          <Badge variant="outline" className="text-xs">You</Badge>
                        )}
                        <div className={cn(
                          'flex items-center gap-1 px-2 py-1 rounded-full text-xs',
                          roleColors[participant.role]
                        )}>
                          <RoleIcon className="h-3 w-3" />
                          {participant.role}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <div className={cn(
                          'w-2 h-2 rounded-full',
                          participant.isOnline ? 'bg-green-500' : 'bg-gray-400'
                        )} />
                        {participant.isOnline ? 'Online' : 'Offline'}
                        {participant.lastSeenAt && !participant.isOnline && (
                          <span>• Last seen {participant.lastSeenAt.toLocaleTimeString()}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {actions.length > 0 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {actions.map((action, index) => (
                          <React.Fragment key={index}>
                            <DropdownMenuItem
                              onClick={action.onClick}
                              className={action.className}
                            >
                              <action.icon className="h-4 w-4 mr-2" />
                              {action.label}
                            </DropdownMenuItem>
                            {index < actions.length - 1 && <DropdownMenuSeparator />}
                          </React.Fragment>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {roleError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-600">
              <BellOff className="h-4 w-4" />
              <span className="text-sm font-medium">Error</span>
            </div>
            <p className="text-sm text-red-600 mt-1">{roleError}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
