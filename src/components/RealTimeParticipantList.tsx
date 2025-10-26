import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Users, 
  Crown, 
  Star, 
  Eye, 
  MoreVertical, 
  UserPlus, 
  Settings,
  Wifi,
  WifiOff,
  Clock
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { RoleIndicator, RoleBadge, PremiumBadge } from './RoleIndicator';
import { ParticipantRole } from '@prisma/client';

interface Participant {
  id: string;
  userId: string;
  userName: string;
  displayName: string;
  avatarUrl?: string;
  role: ParticipantRole;
  isOnline: boolean;
  isPremium: boolean;
  subscriptionStatus?: string;
  trialEndsAt?: Date | null;
  joinedAt: string;
  lastSeenAt?: string;
  cursorPosition?: string;
  isTyping?: boolean;
}

interface RealTimeParticipantListProps {
  participants: Participant[];
  currentUserId: string;
  isHost: boolean;
  canModerate: boolean;
  maxCollaborators: number;
  allowSpectators: boolean;
  onKickUser?: (userId: string) => void;
  onChangeRole?: (userId: string, newRole: ParticipantRole) => void;
  onInviteUser?: () => void;
  onManageRoom?: () => void;
  className?: string;
}

export function RealTimeParticipantList({
  participants,
  currentUserId,
  isHost,
  canModerate,
  maxCollaborators,
  allowSpectators,
  onKickUser,
  onChangeRole,
  onInviteUser,
  onManageRoom,
  className = ''
}: RealTimeParticipantListProps) {
  const [onlineParticipants, setOnlineParticipants] = useState<Participant[]>([]);
  const [offlineParticipants, setOfflineParticipants] = useState<Participant[]>([]);

  useEffect(() => {
    const online = participants.filter(p => p.isOnline);
    const offline = participants.filter(p => !p.isOnline);
    
    // Sort by role hierarchy, then by join time
    const sortParticipants = (p: Participant[]) => {
      return p.sort((a, b) => {
        const roleOrder = { HOST: 3, PLAYER: 2, SPECTATOR: 1 };
        const roleDiff = roleOrder[b.role] - roleOrder[a.role];
        if (roleDiff !== 0) return roleDiff;
        return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
      });
    };

    setOnlineParticipants(sortParticipants(online));
    setOfflineParticipants(sortParticipants(offline));
  }, [participants]);

  const getCollaboratorCount = () => {
    return participants.filter(p => p.role === 'PLAYER' || p.role === 'HOST').length;
  };

  const getSpectatorCount = () => {
    return participants.filter(p => p.role === 'SPECTATOR').length;
  };

  const canAddCollaborator = () => {
    return getCollaboratorCount() < maxCollaborators;
  };

  const getLastSeenText = (lastSeenAt?: string) => {
    if (!lastSeenAt) return 'Never';
    
    const lastSeen = new Date(lastSeenAt);
    const now = new Date();
    const diffMs = now.getTime() - lastSeen.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const renderParticipant = (participant: Participant) => {
    const isCurrentUser = participant.userId === currentUserId;
    const canModerateThisUser = isHost && !isCurrentUser;

    return (
      <div
        key={participant.id}
        className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
          isCurrentUser 
            ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' 
            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              {participant.avatarUrl ? (
                <img
                  src={participant.avatarUrl}
                  alt={participant.displayName}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  {participant.displayName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800 ${
              participant.isOnline ? 'bg-green-500' : 'bg-gray-400'
            }`} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                {participant.displayName}
                {isCurrentUser && (
                  <span className="text-xs text-blue-600 dark:text-blue-400 ml-1">(You)</span>
                )}
              </span>
              <RoleIndicator
                role={participant.role}
                isPremium={participant.isPremium}
                subscriptionStatus={participant.subscriptionStatus}
                trialEndsAt={participant.trialEndsAt}
                size="sm"
                showText={false}
              />
            </div>
            
            <div className="flex items-center gap-2 mt-1">
              <div className="flex items-center gap-1">
                {participant.isOnline ? (
                  <Wifi className="h-3 w-3 text-green-500" />
                ) : (
                  <WifiOff className="h-3 w-3 text-gray-400" />
                )}
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {participant.isOnline ? 'Online' : `Last seen ${getLastSeenText(participant.lastSeenAt)}`}
                </span>
              </div>
              
              {participant.isTyping && (
                <Badge variant="secondary" className="text-xs">
                  Typing...
                </Badge>
              )}
            </div>
          </div>
        </div>

        {canModerateThisUser && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {participant.role === 'SPECTATOR' && canAddCollaborator() && (
                <DropdownMenuItem onClick={() => onChangeRole?.(participant.userId, 'PLAYER')}>
                  <Star className="h-4 w-4 mr-2" />
                  Promote to Player
                </DropdownMenuItem>
              )}
              {participant.role === 'PLAYER' && (
                <DropdownMenuItem onClick={() => onChangeRole?.(participant.userId, 'SPECTATOR')}>
                  <Eye className="h-4 w-4 mr-2" />
                  Demote to Spectator
                </DropdownMenuItem>
              )}
              <DropdownMenuItem 
                onClick={() => onKickUser?.(participant.userId)}
                className="text-red-600 dark:text-red-400"
              >
                <WifiOff className="h-4 w-4 mr-2" />
                Remove from Room
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    );
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Participants
            <Badge variant="secondary" className="ml-2">
              {participants.length}
            </Badge>
          </CardTitle>
          
          {(isHost || canModerate) && (
            <div className="flex items-center gap-2">
              {onInviteUser && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onInviteUser}
                  disabled={!canAddCollaborator()}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite
                </Button>
              )}
              {onManageRoom && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onManageRoom}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Manage
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <Crown className="h-4 w-4" />
            <span>{getCollaboratorCount()}/{maxCollaborators} Collaborators</span>
          </div>
          {allowSpectators && (
            <div className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              <span>{getSpectatorCount()} Spectators</span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <ScrollArea className="h-64">
          <div className="space-y-2">
            {onlineParticipants.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Wifi className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Online ({onlineParticipants.length})
                  </span>
                </div>
                <div className="space-y-2">
                  {onlineParticipants.map(renderParticipant)}
                </div>
              </div>
            )}

            {offlineParticipants.length > 0 && (
              <div className="mt-4">
                <div className="flex items-center gap-2 mb-2">
                  <WifiOff className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Offline ({offlineParticipants.length})
                  </span>
                </div>
                <div className="space-y-2">
                  {offlineParticipants.map(renderParticipant)}
                </div>
              </div>
            )}

            {participants.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No participants yet</p>
                <p className="text-sm">Invite users to join the room</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
