import React, { useState } from 'react';
import { ParticipantRole } from '@prisma/client';
import { SpectatorPermissionManager } from '../lib/spectatorPermissions';
import { cn } from '../lib/utils';

interface SpectatorChatAccessProps {
  userRole: ParticipantRole;
  isPremium: boolean;
  roomStatus: 'WAITING' | 'ACTIVE' | 'COMPLETED' | 'EXPIRED';
  onUpgrade?: () => void;
  className?: string;
}

export function SpectatorChatAccess({
  userRole,
  isPremium,
  roomStatus,
  onUpgrade,
  className
}: SpectatorChatAccessProps) {
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const spectatorContext = {
    userRole,
    isPremium,
    roomStatus,
    isHost: false,
    isOnline: true
  };

  const restrictions = SpectatorPermissionManager.getSpectatorRestrictions(spectatorContext);
  const indicators = SpectatorPermissionManager.getSpectatorIndicators(spectatorContext);

  if (userRole !== 'SPECTATOR') {
    return null;
  }

  const handleChatClick = () => {
    if (!restrictions.allowChat && onUpgrade) {
      setShowUpgradeModal(true);
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* Chat Access Status */}
      <div className={cn(
        "p-3 rounded-lg border",
        restrictions.allowChat 
          ? "bg-green-50 border-green-200" 
          : "bg-amber-50 border-amber-200"
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={cn(
              "w-2 h-2 rounded-full",
              restrictions.allowChat ? "bg-green-500" : "bg-amber-500"
            )}></div>
            <span className={cn(
              "text-sm font-medium",
              restrictions.allowChat ? "text-green-800" : "text-amber-800"
            )}>
              Chat Access: {restrictions.allowChat ? 'Enabled' : 'Limited'}
            </span>
          </div>
          
          {!restrictions.allowChat && onUpgrade && (
            <button
              onClick={() => setShowUpgradeModal(true)}
              className="px-3 py-1 text-xs font-medium text-white bg-amber-600 rounded-md hover:bg-amber-700 transition-colors"
            >
              Upgrade
            </button>
          )}
        </div>
        
        <div className={cn(
          "text-xs mt-1",
          restrictions.allowChat ? "text-green-600" : "text-amber-600"
        )}>
          {restrictions.allowChat 
            ? 'You can send and receive chat messages'
            : 'Premium subscription required for chat access'
          }
        </div>
      </div>

      {/* Hint Visibility Status */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          <span className="text-sm font-medium text-blue-800">
            Hint Visibility: Enabled
          </span>
        </div>
        <div className="text-xs text-blue-600 mt-1">
          You can see when hints are used by players
        </div>
      </div>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="text-2xl mb-4">🔓</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Upgrade to Premium
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Get full access to chat, hints, and all multiplayer features with a premium subscription.
              </p>
              
              <div className="space-y-2 text-sm text-left mb-6">
                <div className="flex items-center space-x-2">
                  <span className="text-green-600">✓</span>
                  <span>Send and receive chat messages</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-green-600">✓</span>
                  <span>Use hints in puzzles</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-green-600">✓</span>
                  <span>Edit puzzle cells</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-green-600">✓</span>
                  <span>Create private rooms</span>
                </div>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowUpgradeModal(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowUpgradeModal(false);
                    onUpgrade?.();
                  }}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Upgrade Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface HintVisibilityDisplayProps {
  hintsUsed: Array<{
    id: string;
    userId: string;
    userName: string;
    hintType: string;
    timestamp: Date;
  }>;
  userRole: ParticipantRole;
  className?: string;
}

export function HintVisibilityDisplay({
  hintsUsed,
  userRole,
  className
}: HintVisibilityDisplayProps) {
  const spectatorContext = {
    userRole,
    isPremium: true, // Assume premium for hint visibility
    roomStatus: 'ACTIVE' as const,
    isHost: false,
    isOnline: true
  };

  const canViewHints = SpectatorPermissionManager.canViewHints(spectatorContext);

  if (!canViewHints || hintsUsed.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="text-sm font-medium text-gray-700">
        Hints Used ({hintsUsed.length})
      </div>
      
      <div className="space-y-1 max-h-32 overflow-y-auto">
        {hintsUsed.map((hint) => (
          <div
            key={hint.id}
            className="flex items-center justify-between p-2 bg-blue-50 rounded-md"
          >
            <div className="flex items-center space-x-2">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-blue-800">
                {hint.userName} used {hint.hintType}
              </span>
            </div>
            
            <div className="text-xs text-blue-600">
              {new Date(hint.timestamp).toLocaleTimeString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
