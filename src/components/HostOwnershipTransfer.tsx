/**
 * Host ownership transfer component
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Crown,
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  Shield
} from 'lucide-react';
import { useHostTransfer } from '@/hooks/useHostTransfer';

interface HostOwnershipTransferProps {
  roomId: string;
  className?: string;
}

export function HostOwnershipTransfer({ roomId, className }: HostOwnershipTransferProps) {
  const {
    participants,
    isLoading,
    error,
    transferHost,
    isTransferring
  } = useHostTransfer({ roomId });

  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleTransfer = async () => {
    if (!selectedUserId) return;
    
    try {
      await transferHost(selectedUserId);
      setShowConfirmDialog(false);
      setSelectedUserId('');
    } catch (err) {
      console.error('Transfer failed:', err);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'HOST':
        return Crown;
      case 'MODERATOR':
        return Shield;
      case 'PLAYER':
        return Users;
      default:
        return Users;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'HOST':
        return 'text-yellow-500';
      case 'MODERATOR':
        return 'text-blue-500';
      case 'PLAYER':
        return 'text-green-500';
      default:
        return 'text-gray-500';
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Clock className="h-4 w-4 animate-pulse mr-2" />
            <span>Loading participants...</span>
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
              Failed to load participants: {error}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const eligibleParticipants = participants.filter(p => 
    p.role !== 'HOST' && p.isActive
  );

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-yellow-500" />
          <CardTitle className="text-lg">Host Ownership Transfer</CardTitle>
        </div>
        <CardDescription>
          Transfer host ownership to another participant
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Current Host */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Current Host</h4>
          {participants.find(p => p.role === 'HOST') && (
            <div className="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
              <Avatar className="h-8 w-8">
                <AvatarImage src={participants.find(p => p.role === 'HOST')?.avatar} />
                <AvatarFallback>
                  {participants.find(p => p.role === 'HOST')?.name?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {participants.find(p => p.role === 'HOST')?.name}
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    <Crown className="h-3 w-3 mr-1" />
                    Host
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  {participants.find(p => p.role === 'HOST')?.isActive ? 'Online' : 'Offline'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Transfer Selection */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Transfer To</h4>
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a participant" />
            </SelectTrigger>
            <SelectContent>
              {eligibleParticipants.map((participant) => {
                const RoleIcon = getRoleIcon(participant.role);
                return (
                  <SelectItem key={participant.id} value={participant.id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={participant.avatar} />
                        <AvatarFallback>
                          {participant.name?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex items-center gap-2">
                        <span>{participant.name}</span>
                        <RoleIcon className={`h-3 w-3 ${getRoleColor(participant.role)}`} />
                        <Badge variant="outline" className="text-xs">
                          {participant.role}
                        </Badge>
                      </div>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Transfer Button */}
        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogTrigger asChild>
            <Button 
              disabled={!selectedUserId || isTransferring}
              className="w-full"
            >
              {isTransferring ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Transferring...
                </>
              ) : (
                <>
                  <Crown className="h-4 w-4 mr-2" />
                  Transfer Host Ownership
                </>
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Host Transfer</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to transfer host ownership to{' '}
                <strong>
                  {participants.find(p => p.id === selectedUserId)?.name}
                </strong>
                ? This action cannot be undone and you will lose host privileges.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleTransfer}>
                Transfer Ownership
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Participants List */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">All Participants</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {participants.map((participant) => {
              const RoleIcon = getRoleIcon(participant.role);
              return (
                <div key={participant.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={participant.avatar} />
                    <AvatarFallback>
                      {participant.name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{participant.name}</span>
                      <RoleIcon className={`h-3 w-3 ${getRoleColor(participant.role)}`} />
                      <Badge variant="outline" className="text-xs">
                        {participant.role}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className={`w-2 h-2 rounded-full ${participant.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                      <span>{participant.isActive ? 'Online' : 'Offline'}</span>
                      {participant.lastSeen && (
                        <span>• Last seen {new Date(participant.lastSeen).toLocaleTimeString()}</span>
                      )}
                    </div>
                  </div>
                  {participant.role === 'HOST' && (
                    <Badge variant="secondary" className="text-xs">
                      <Crown className="h-3 w-3 mr-1" />
                      Current Host
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Transfer History */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Recent Transfers</h4>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {participants
              .filter(p => p.role === 'HOST')
              .slice(0, 3)
              .map((participant, index) => (
                <div key={index} className="flex items-center gap-2 text-xs p-2 bg-muted/50 rounded">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  <span>
                    Host transferred to {participant.name}
                  </span>
                  <span className="text-muted-foreground ml-auto">
                    {new Date().toLocaleTimeString()}
                  </span>
                </div>
              ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default HostOwnershipTransfer;