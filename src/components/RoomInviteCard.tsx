"use client";

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Users, 
  Clock, 
  Lock, 
  Crown, 
  Eye, 
  Play, 
  CheckCircle, 
  XCircle,
  User,
  Calendar,
  MessageCircle,
  AlertCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

interface RoomInviteCardProps {
  invite: {
    id: string;
    room: {
      id: string;
      roomCode: string;
      name?: string;
      description?: string;
      isPrivate: boolean;
      hasPassword: boolean;
      maxPlayers: number;
      participantCount: number;
      hostName: string;
      hostAvatar?: string;
      puzzleTitle: string;
      puzzleDifficulty: 'EASY' | 'MEDIUM' | 'HARD';
      status: 'WAITING' | 'ACTIVE' | 'COMPLETED' | 'EXPIRED';
      timeLimit?: number;
      allowSpectators: boolean;
    };
    invitedBy: string;
    message?: string;
    expiresAt: string;
    createdAt: string;
  };
  onAccept?: (inviteId: string, password?: string) => void;
  onDecline?: (inviteId: string) => void;
  className?: string;
}

export function RoomInviteCard({ invite, onAccept, onDecline, className = "" }: RoomInviteCardProps) {
  const router = useRouter();
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isExpired = new Date(invite.expiresAt) < new Date();
  const isRoomFull = invite.room.participantCount >= invite.room.maxPlayers;
  const canJoin = !isExpired && !isRoomFull && invite.room.status === 'WAITING';

  // Get status icon and color
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'WAITING':
        return { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-100' };
      case 'ACTIVE':
        return { icon: Play, color: 'text-green-600', bg: 'bg-green-100' };
      case 'COMPLETED':
        return { icon: CheckCircle, color: 'text-blue-600', bg: 'bg-blue-100' };
      case 'EXPIRED':
        return { icon: XCircle, color: 'text-red-600', bg: 'bg-red-100' };
      default:
        return { icon: Clock, color: 'text-gray-600', bg: 'bg-gray-100' };
    }
  };

  // Get difficulty color
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'EASY':
        return 'text-green-600 bg-green-100';
      case 'MEDIUM':
        return 'text-yellow-600 bg-yellow-100';
      case 'HARD':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const handleAccept = async () => {
    if (invite.room.hasPassword && !showPasswordInput) {
      setShowPasswordInput(true);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onAccept?.(invite.id, password);
      // If successful, the parent component should handle navigation
    } catch (err: any) {
      setError(err.message || 'Failed to accept invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = async () => {
    setLoading(true);
    try {
      await onDecline?.(invite.id);
    } catch (err: any) {
      setError(err.message || 'Failed to decline invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleViewRoom = () => {
    router.push(`/room/${invite.room.roomCode}`);
  };

  const StatusIcon = getStatusInfo(invite.room.status).icon;
  const statusColor = getStatusInfo(invite.room.status).color;
  const statusBg = getStatusInfo(invite.room.status).bg;
  const difficultyColor = getDifficultyColor(invite.room.puzzleDifficulty);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={className}
    >
      <Card className={`transition-all duration-200 ${isExpired ? 'opacity-60' : 'hover:shadow-md'}`}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <CardTitle className="flex items-center gap-2 mb-2">
                <Users className="h-5 w-5" />
                <span className="truncate">
                  {invite.room.name || `Room ${invite.room.roomCode}`}
                </span>
                <Badge variant="outline" className={statusBg}>
                  <StatusIcon className={`h-3 w-3 mr-1 ${statusColor}`} />
                  {invite.room.status}
                </Badge>
                {invite.room.isPrivate && (
                  <Badge variant="outline" className="bg-gray-100">
                    <Lock className="h-3 w-3 mr-1" />
                    Private
                  </Badge>
                )}
              </CardTitle>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  Invited by {invite.invitedBy}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(invite.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Room Info */}
          <div className="space-y-2">
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1">
                <Crown className="h-3 w-3" />
                Host: {invite.room.hostName}
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {invite.room.participantCount}/{invite.room.maxPlayers} players
              </span>
              {invite.room.allowSpectators && (
                <span className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  Spectators allowed
                </span>
              )}
            </div>

            <div className="space-y-1">
              <p className="font-medium">Puzzle: {invite.room.puzzleTitle}</p>
              {invite.room.description && (
                <p className="text-sm text-muted-foreground">{invite.room.description}</p>
              )}
              {invite.room.timeLimit && (
                <p className="text-sm text-muted-foreground">
                  Time limit: {invite.room.timeLimit} minutes
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Badge className={difficultyColor}>
                {invite.room.puzzleDifficulty}
              </Badge>
            </div>
          </div>

          {/* Custom Message */}
          {invite.message && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="flex items-start gap-2">
                <MessageCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-800">Message from {invite.invitedBy}</p>
                  <p className="text-sm text-blue-700">{invite.message}</p>
                </div>
              </div>
            </div>
          )}

          {/* Expiration Warning */}
          {isExpired && (
            <div className="p-3 bg-red-50 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <p className="text-sm text-red-800">This invitation has expired</p>
              </div>
            </div>
          )}

          {/* Room Full Warning */}
          {isRoomFull && (
            <div className="p-3 bg-yellow-50 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <p className="text-sm text-yellow-800">This room is full</p>
              </div>
            </div>
          )}

          {/* Password Input */}
          {showPasswordInput && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Room Password</label>
              <Input
                type="password"
                placeholder="Enter room password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAccept()}
              />
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {canJoin ? (
              <>
                <Button
                  onClick={handleAccept}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Joining...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Accept & Join
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleDecline}
                  disabled={loading}
                  variant="outline"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Decline
                </Button>
              </>
            ) : (
              <Button
                onClick={handleViewRoom}
                variant="outline"
                className="flex-1"
              >
                View Room
              </Button>
            )}
          </div>

          {/* Expiration Info */}
          <div className="text-xs text-muted-foreground text-center">
            {isExpired ? (
              <span className="text-red-600">Expired {new Date(invite.expiresAt).toLocaleString()}</span>
            ) : (
              <span>Expires {new Date(invite.expiresAt).toLocaleString()}</span>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
