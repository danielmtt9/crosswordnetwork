'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { 
  Crown, 
  UserX, 
  Users, 
  Eye, 
  Play, 
  Clock,
  Wifi,
  WifiOff,
  MoreVertical,
  UserCheck,
  UserMinus
} from 'lucide-react';

interface Participant {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  role: 'HOST' | 'PLAYER' | 'SPECTATOR';
  isOnline: boolean;
  joinedAt: string;
  lastSeen?: string;
  cursorPosition?: {
    cellId: string;
    x: number;
    y: number;
  };
}

interface RoomParticipantListProps {
  participants: Participant[];
  currentUserId: string;
  isHost: boolean;
  roomStatus: 'WAITING' | 'ACTIVE' | 'COMPLETED' | 'EXPIRED';
  maxPlayers: number;
  onKickPlayer?: (userId: string) => void;
  onPromoteToPlayer?: (userId: string) => void;
  onDemoteToSpectator?: (userId: string) => void;
  className?: string;
}

export function RoomParticipantList({
  participants,
  currentUserId,
  isHost,
  roomStatus,
  maxPlayers,
  onKickPlayer,
  onPromoteToPlayer,
  onDemoteToSpectator,
  className = ""
}: RoomParticipantListProps) {
  const [onlineParticipants, setOnlineParticipants] = useState<Participant[]>([]);
  const [offlineParticipants, setOfflineParticipants] = useState<Participant[]>([]);

  useEffect(() => {
    const online = participants.filter(p => p.isOnline);
    const offline = participants.filter(p => !p.isOnline);
    
    // Sort online participants by role (HOST first, then PLAYER, then SPECTATOR)
    online.sort((a, b) => {
      const roleOrder = { 'HOST': 0, 'PLAYER': 1, 'SPECTATOR': 2 };
      return roleOrder[a.role] - roleOrder[b.role];
    });
    
    setOnlineParticipants(online);
    setOfflineParticipants(offline);
  }, [participants]);

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'HOST':
        return <Crown className="h-3 w-3 text-yellow-500" />;
      case 'SPECTATOR':
        return <Eye className="h-3 w-3 text-gray-500" />;
      default:
        return <Play className="h-3 w-3 text-blue-500" />;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'HOST':
        return <Badge variant="outline" className="border-yellow-200 text-yellow-600 text-xs">Host</Badge>;
      case 'PLAYER':
        return <Badge variant="outline" className="border-blue-200 text-blue-600 text-xs">Player</Badge>;
      case 'SPECTATOR':
        return <Badge variant="outline" className="border-gray-200 text-gray-600 text-xs">Spectator</Badge>;
      default:
        return null;
    }
  };

  const getStatusIndicator = (participant: Participant) => {
    if (participant.isOnline) {
      return (
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <Wifi className="h-3 w-3 text-green-500" />
        </div>
      );
    } else {
      return (
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
          <WifiOff className="h-3 w-3 text-gray-400" />
        </div>
      );
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatJoinTime = (joinedAt: string) => {
    const date = new Date(joinedAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const canManageParticipant = (participant: Participant) => {
    return isHost && 
           participant.userId !== currentUserId && 
           roomStatus !== 'COMPLETED' && 
           roomStatus !== 'EXPIRED';
  };

  const renderParticipant = (participant: Participant) => (
    <div 
      key={participant.id}
      className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
        participant.isOnline 
          ? 'bg-green-50 border-green-200' 
          : 'bg-gray-50 border-gray-200'
      }`}
    >
      <div className="flex items-center space-x-3">
        {/* Avatar */}
        <div className="relative">
          <Avatar className="h-8 w-8">
            <AvatarImage src={participant.avatarUrl} alt={participant.displayName} />
            <AvatarFallback className="text-xs">
              {getInitials(participant.displayName)}
            </AvatarFallback>
          </Avatar>
          {participant.isOnline && (
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
          )}
        </div>

        {/* User Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            {getRoleIcon(participant.role)}
            <span className="text-sm font-medium truncate">
              {participant.displayName}
            </span>
            {participant.userId === currentUserId && (
              <Badge variant="secondary" className="text-xs">You</Badge>
            )}
          </div>
          
          <div className="flex items-center space-x-2 mt-1">
            {getRoleBadge(participant.role)}
            <span className="text-xs text-muted-foreground">
              Joined {formatJoinTime(participant.joinedAt)}
            </span>
          </div>
        </div>
      </div>

      {/* Status and Actions */}
      <div className="flex items-center space-x-2">
        {getStatusIndicator(participant)}
        
        {canManageParticipant(participant) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {participant.role === 'SPECTATOR' && onPromoteToPlayer && (
                <DropdownMenuItem
                  onClick={() => onPromoteToPlayer(participant.userId)}
                  className="text-blue-600 focus:text-blue-600"
                >
                  <UserCheck className="h-3 w-3 mr-2" />
                  Promote to Player
                </DropdownMenuItem>
              )}
              
              {participant.role === 'PLAYER' && onDemoteToSpectator && (
                <DropdownMenuItem
                  onClick={() => onDemoteToSpectator(participant.userId)}
                  className="text-orange-600 focus:text-orange-600"
                >
                  <UserMinus className="h-3 w-3 mr-2" />
                  Demote to Spectator
                </DropdownMenuItem>
              )}
              
              <DropdownMenuSeparator />
              
              {onKickPlayer && (
                <DropdownMenuItem
                  onClick={() => onKickPlayer(participant.userId)}
                  className="text-red-600 focus:text-red-600"
                >
                  <UserX className="h-3 w-3 mr-2" />
                  Kick Player
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );

  return (
    <div className={`room-participant-list ${className}`}>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Participants</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-xs">
                {participants.length}/{maxPlayers}
              </Badge>
              {onlineParticipants.length > 0 && (
                <div className="flex items-center space-x-1 text-xs text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>{onlineParticipants.length} online</span>
                </div>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-3">
          {/* Online Participants */}
          {onlineParticipants.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-green-600 flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Online ({onlineParticipants.length})</span>
              </div>
              {onlineParticipants.map(renderParticipant)}
            </div>
          )}

          {/* Offline Participants */}
          {offlineParticipants.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-gray-500 flex items-center space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                <span>Offline ({offlineParticipants.length})</span>
              </div>
              {offlineParticipants.map(renderParticipant)}
            </div>
          )}

          {/* Empty State */}
          {participants.length === 0 && (
            <div className="text-center py-6 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No participants yet</p>
              <p className="text-xs">Share the room code to invite players</p>
            </div>
          )}

          {/* Room Status Info */}
          <div className="pt-3 border-t">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Room Status</span>
              <Badge 
                variant="outline" 
                className={`text-xs ${
                  roomStatus === 'WAITING' ? 'border-yellow-200 text-yellow-600' :
                  roomStatus === 'ACTIVE' ? 'border-green-200 text-green-600' :
                  roomStatus === 'COMPLETED' ? 'border-blue-200 text-blue-600' :
                  'border-red-200 text-red-600'
                }`}
              >
                {roomStatus}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Hook for managing participant list state
export function useRoomParticipantList() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const updateParticipant = (userId: string, updates: Partial<Participant>) => {
    setParticipants(prev => 
      prev.map(p => p.userId === userId ? { ...p, ...updates } : p)
    );
  };

  const addParticipant = (participant: Participant) => {
    setParticipants(prev => {
      const exists = prev.some(p => p.userId === participant.userId);
      if (exists) {
        return prev.map(p => p.userId === participant.userId ? participant : p);
      }
      return [...prev, participant];
    });
  };

  const removeParticipant = (userId: string) => {
    setParticipants(prev => prev.filter(p => p.userId !== userId));
  };

  const setParticipantOnline = (userId: string, isOnline: boolean) => {
    updateParticipant(userId, { 
      isOnline, 
      lastSeen: isOnline ? undefined : new Date().toISOString() 
    });
  };

  return {
    participants,
    setParticipants,
    updateParticipant,
    addParticipant,
    removeParticipant,
    setParticipantOnline,
    isLoading,
    setIsLoading
  };
}
