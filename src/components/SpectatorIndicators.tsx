import React from 'react';
import { cn } from '../lib/utils';

interface SpectatorIndicatorsProps {
  isSpectator: boolean;
  spectatorCount: number;
  totalParticipants: number;
  canUpgrade: boolean;
  onUpgrade?: () => void;
  className?: string;
}

export function SpectatorIndicators({
  isSpectator,
  spectatorCount,
  totalParticipants,
  canUpgrade,
  onUpgrade,
  className
}: SpectatorIndicatorsProps) {
  if (!isSpectator && spectatorCount === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Spectator Mode Banner */}
      {isSpectator && (
        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="font-semibold text-blue-800">Spectator Mode</span>
              </div>
              <div className="text-sm text-blue-600">
                View-only access • Cannot edit cells or use hints
              </div>
            </div>
            {canUpgrade && onUpgrade && (
              <button
                onClick={onUpgrade}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors shadow-sm"
              >
                Upgrade to Player
              </button>
            )}
          </div>
        </div>
      )}

      {/* Spectator Count Indicator */}
      {spectatorCount > 0 && (
        <div className="flex items-center space-x-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
            <span className="text-sm font-medium text-gray-700">
              {spectatorCount} spectator{spectatorCount !== 1 ? 's' : ''} watching
            </span>
          </div>
          <div className="text-xs text-gray-500">
            ({spectatorCount} of {totalParticipants} total)
          </div>
        </div>
      )}

      {/* Spectator Features Info */}
      {isSpectator && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="text-sm text-amber-800">
            <div className="font-medium mb-2">Spectator Features:</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center space-x-1">
                <span className="text-green-600">✓</span>
                <span>View puzzle progress</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-green-600">✓</span>
                <span>See player cursors</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-green-600">✓</span>
                <span>Chat with players</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-green-600">✓</span>
                <span>View hints used</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-red-600">✗</span>
                <span>Edit cells</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="text-red-600">✗</span>
                <span>Use hints</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface SpectatorBadgeProps {
  isSpectator: boolean;
  className?: string;
}

export function SpectatorBadge({ isSpectator, className }: SpectatorBadgeProps) {
  if (!isSpectator) return null;

  return (
    <div className={cn(
      "inline-flex items-center space-x-1 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full",
      className
    )}>
      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
      <span>Spectator</span>
    </div>
  );
}

interface SpectatorTooltipProps {
  children: React.ReactNode;
  isSpectator: boolean;
  className?: string;
}

export function SpectatorTooltip({ children, isSpectator, className }: SpectatorTooltipProps) {
  if (!isSpectator) return <>{children}</>;

  return (
    <div className={cn("relative group", className)}>
      {children}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
        Spectator Mode: View-only access
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
      </div>
    </div>
  );
}
