import React from 'react';
import { ParticipantRole } from '@prisma/client';
import { SpectatorPermissionManager } from '../lib/spectatorPermissions';
import { cn } from '../lib/utils';

interface Participant {
  userId: string;
  displayName: string;
  role: ParticipantRole;
  isOnline: boolean;
  lastSeen: Date;
}

interface SpectatorCountDisplayProps {
  participants: Participant[];
  showDetails?: boolean;
  className?: string;
}

export function SpectatorCountDisplay({
  participants,
  showDetails = false,
  className
}: SpectatorCountDisplayProps) {
  const countInfo = SpectatorPermissionManager.getSpectatorCountInfo(participants);
  
  if (countInfo.spectatorCount === 0 && !showDetails) {
    return null;
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* Main Count Display */}
      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
          <span className="text-sm font-medium text-gray-700">
            {countInfo.spectatorCount} spectator{countInfo.spectatorCount !== 1 ? 's' : ''}
          </span>
        </div>
        
        {countInfo.onlineSpectators > 0 && (
          <div className="flex items-center space-x-1">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
            <span className="text-xs text-green-600">
              {countInfo.onlineSpectators} online
            </span>
          </div>
        )}
      </div>

      {/* Detailed Breakdown */}
      {showDetails && (
        <div className="text-xs text-gray-500 space-y-1">
          <div className="flex justify-between">
            <span>Players:</span>
            <span>{countInfo.playerCount} ({countInfo.onlinePlayers} online)</span>
          </div>
          <div className="flex justify-between">
            <span>Spectators:</span>
            <span>{countInfo.spectatorCount} ({countInfo.onlineSpectators} online)</span>
          </div>
          <div className="flex justify-between font-medium">
            <span>Total:</span>
            <span>{participants.length}</span>
          </div>
        </div>
      )}
    </div>
  );
}

interface SpectatorListProps {
  participants: Participant[];
  showOffline?: boolean;
  className?: string;
}

export function SpectatorList({
  participants,
  showOffline = false,
  className
}: SpectatorListProps) {
  const spectators = participants.filter(p => p.role === 'SPECTATOR');
  const visibleSpectators = showOffline 
    ? spectators 
    : spectators.filter(p => p.isOnline);

  if (visibleSpectators.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="text-sm font-medium text-gray-700">
        Spectators ({visibleSpectators.length})
      </div>
      
      <div className="space-y-1">
        {visibleSpectators.map((spectator) => (
          <div
            key={spectator.userId}
            className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
          >
            <div className="flex items-center space-x-2">
              <div className={cn(
                "w-2 h-2 rounded-full",
                spectator.isOnline ? "bg-green-500" : "bg-gray-400"
              )}></div>
              <span className="text-sm text-gray-700">
                {spectator.displayName}
              </span>
            </div>
            
            <div className="text-xs text-gray-500">
              {spectator.isOnline ? 'Online' : 'Offline'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface RoomCapacityDisplayProps {
  currentCount: number;
  maxCount: number;
  spectatorCount: number;
  className?: string;
}

export function RoomCapacityDisplay({
  currentCount,
  maxCount,
  spectatorCount,
  className
}: RoomCapacityDisplayProps) {
  const playerCount = currentCount - spectatorCount;
  const isFull = currentCount >= maxCount;
  const isNearFull = currentCount >= maxCount * 0.8;

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">Room Capacity</span>
        <span className={cn(
          "font-medium",
          isFull ? "text-red-600" : isNearFull ? "text-yellow-600" : "text-green-600"
        )}>
          {currentCount}/{maxCount}
        </span>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={cn(
            "h-2 rounded-full transition-all duration-300",
            isFull ? "bg-red-500" : isNearFull ? "bg-yellow-500" : "bg-green-500"
          )}
          style={{ width: `${Math.min((currentCount / maxCount) * 100, 100)}%` }}
        ></div>
      </div>
      
      <div className="text-xs text-gray-500">
        {playerCount} player{playerCount !== 1 ? 's' : ''}, {spectatorCount} spectator{spectatorCount !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
