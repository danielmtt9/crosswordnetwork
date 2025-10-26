'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  Pause, 
  Play, 
  Square, 
  Settings, 
  Users, 
  Clock, 
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface Participant {
  id: string;
  userId: string;
  displayName: string;
  role: 'HOST' | 'PLAYER' | 'SPECTATOR';
  isOnline: boolean;
  joinedAt: string;
}

interface HostControlsProps {
  roomCode: string;
  participants: Participant[];
  currentUserId: string;
  roomStatus: 'WAITING' | 'ACTIVE' | 'COMPLETED' | 'EXPIRED';
  timeLimit?: number;
  onKickPlayer: (userId: string) => void;
  onPauseSession: () => void;
  onResumeSession: () => void;
  onEndSession: () => void;
  onStartSession: () => void;
  onUpdateRoomSettings: (settings: any) => void;
  className?: string;
}

export function HostControls({
  roomCode,
  participants,
  currentUserId,
  roomStatus,
  timeLimit,
  onKickPlayer,
  onPauseSession,
  onResumeSession,
  onEndSession,
  onStartSession,
  onUpdateRoomSettings,
  className = ""
}: HostControlsProps) {
  const [isKicking, setIsKicking] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // Filter out current user (host) from participants
  const otherParticipants = participants.filter(p => p.userId !== currentUserId);
  const onlineParticipants = otherParticipants.filter(p => p.isOnline);
  const offlineParticipants = otherParticipants.filter(p => !p.isOnline);

  const handleKickPlayer = async (userId: string, displayName: string) => {
    if (window.confirm(`Are you sure you want to kick ${displayName} from the room?`)) {
      setIsKicking(userId);
      try {
        await onKickPlayer(userId);
      } finally {
        setIsKicking(null);
      }
    }
  };

  const handleSessionAction = (action: string) => {
    switch (action) {
      case 'start':
        if (participants.length < 2) {
          alert('Need at least 2 players to start the session');
          return;
        }
        onStartSession();
        break;
      case 'pause':
        onPauseSession();
        break;
      case 'resume':
        onResumeSession();
        break;
      case 'end':
        if (window.confirm('Are you sure you want to end the session? This will close the room for all participants.')) {
          onEndSession();
        }
        break;
    }
  };

  const getStatusBadge = () => {
    switch (roomStatus) {
      case 'WAITING':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Waiting</Badge>;
      case 'ACTIVE':
        return <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>;
      case 'COMPLETED':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Completed</Badge>;
      case 'EXPIRED':
        return <Badge variant="destructive">Expired</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getSessionActionButton = () => {
    switch (roomStatus) {
      case 'WAITING':
        return (
          <Button 
            onClick={() => handleSessionAction('start')}
            className="bg-green-600 hover:bg-green-700"
            disabled={participants.length < 2}
          >
            <Play className="h-4 w-4 mr-2" />
            Start Session
          </Button>
        );
      case 'ACTIVE':
        return (
          <div className="flex space-x-2">
            <Button 
              onClick={() => handleSessionAction('pause')}
              variant="outline"
              className="border-orange-500 text-orange-600 hover:bg-orange-50"
            >
              <Pause className="h-4 w-4 mr-2" />
              Pause
            </Button>
            <Button 
              onClick={() => handleSessionAction('end')}
              variant="destructive"
            >
              <Square className="h-4 w-4 mr-2" />
              End Session
            </Button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`host-controls ${className}`}>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Crown className="h-4 w-4 text-yellow-500" />
              <span>Host Controls</span>
            </div>
            {getStatusBadge()}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Session Management */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Session Management</h4>
              <div className="flex items-center space-x-2">
                {timeLimit && (
                  <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{timeLimit}min</span>
                  </div>
                )}
                {getSessionActionButton()}
              </div>
            </div>
          </div>

          {/* Participant Management */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Participants</h4>
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {onlineParticipants.length} online
                </span>
              </div>
            </div>

            {/* Online Participants */}
            {onlineParticipants.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-medium text-green-600 flex items-center space-x-1">
                  <CheckCircle className="h-3 w-3" />
                  <span>Online ({onlineParticipants.length})</span>
                </div>
                {onlineParticipants.map((participant) => (
                  <div 
                    key={participant.id}
                    className="flex items-center justify-between p-2 bg-green-50 rounded-lg border border-green-200"
                  >
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium">{participant.displayName}</span>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          participant.role === 'PLAYER' ? 'border-blue-200 text-blue-600' :
                          participant.role === 'SPECTATOR' ? 'border-gray-200 text-gray-600' :
                          'border-yellow-200 text-yellow-600'
                        }`}
                      >
                        {participant.role}
                      </Badge>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-6 w-6 p-0"
                        >
                          <UserX className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleKickPlayer(participant.userId, participant.displayName)}
                          disabled={isKicking === participant.userId}
                          className="text-red-600 focus:text-red-600"
                        >
                          {isKicking === participant.userId ? (
                            <>
                              <div className="w-3 h-3 border border-red-600 border-t-transparent rounded-full animate-spin mr-2" />
                              Kicking...
                            </>
                          ) : (
                            <>
                              <UserX className="h-3 w-3 mr-2" />
                              Kick Player
                            </>
                          )}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            )}

            {/* Offline Participants */}
            {offlineParticipants.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-medium text-gray-500 flex items-center space-x-1">
                  <XCircle className="h-3 w-3" />
                  <span>Offline ({offlineParticipants.length})</span>
                </div>
                {offlineParticipants.map((participant) => (
                  <div 
                    key={participant.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                      <span className="text-sm text-gray-600">{participant.displayName}</span>
                      <Badge variant="outline" className="text-xs border-gray-200 text-gray-500">
                        {participant.role}
                      </Badge>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-6 w-6 p-0"
                        >
                          <UserX className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleKickPlayer(participant.userId, participant.displayName)}
                          disabled={isKicking === participant.userId}
                          className="text-red-600 focus:text-red-600"
                        >
                          {isKicking === participant.userId ? (
                            <>
                              <div className="w-3 h-3 border border-red-600 border-t-transparent rounded-full animate-spin mr-2" />
                              Kicking...
                            </>
                          ) : (
                            <>
                              <UserX className="h-3 w-3 mr-2" />
                              Remove Player
                            </>
                          )}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            )}

            {otherParticipants.length === 0 && (
              <div className="text-center py-4 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No other participants yet</p>
                <p className="text-xs">Share the room code to invite players</p>
              </div>
            )}
          </div>

          {/* Room Information */}
          <div className="pt-3 border-t">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Room Code</span>
              <code className="bg-muted px-2 py-1 rounded font-mono">{roomCode}</code>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
              <span>Capacity</span>
              <span>{participants.length} / {participants.length + 1} max</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Hook for managing host controls state
export function useHostControls() {
  const [isKicking, setIsKicking] = useState<string | null>(null);
  const [isPausing, setIsPausing] = useState(false);
  const [isEnding, setIsEnding] = useState(false);

  const kickPlayer = async (userId: string, onKick: (userId: string) => Promise<void>) => {
    setIsKicking(userId);
    try {
      await onKick(userId);
    } finally {
      setIsKicking(null);
    }
  };

  const pauseSession = async (onPause: () => Promise<void>) => {
    setIsPausing(true);
    try {
      await onPause();
    } finally {
      setIsPausing(false);
    }
  };

  const endSession = async (onEnd: () => Promise<void>) => {
    setIsEnding(true);
    try {
      await onEnd();
    } finally {
      setIsEnding(false);
    }
  };

  return {
    isKicking,
    isPausing,
    isEnding,
    kickPlayer,
    pauseSession,
    endSession
  };
}
