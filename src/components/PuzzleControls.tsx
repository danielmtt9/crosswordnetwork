import React from 'react';
import { motion } from 'framer-motion';
import { 
  Edit3, 
  Lightbulb, 
  Eye, 
  RotateCcw, 
  Share2, 
  Download, 
  Settings, 
  Users, 
  UserMinus, 
  BarChart3, 
  Shield,
  Lock,
  AlertCircle,
  CheckCircle,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePuzzlePermissions, usePermissionBasedUI } from '@/hooks/usePuzzlePermissions';
import { UserContext, RoomContext, PuzzleContext } from '@/lib/puzzlePermissions';
import { cn } from '@/lib/utils';

interface PuzzleControlsProps {
  userContext: UserContext;
  roomContext: RoomContext;
  puzzleContext: PuzzleContext;
  onEdit?: () => void;
  onHint?: () => void;
  onReveal?: () => void;
  onReset?: () => void;
  onShare?: () => void;
  onExport?: () => void;
  onModerate?: () => void;
  onInvite?: () => void;
  onKick?: () => void;
  onSettings?: () => void;
  onAnalytics?: () => void;
  onRoleManagement?: () => void;
  className?: string;
}

export function PuzzleControls({
  userContext,
  roomContext,
  puzzleContext,
  onEdit,
  onHint,
  onReveal,
  onReset,
  onShare,
  onExport,
  onModerate,
  onInvite,
  onKick,
  onSettings,
  onAnalytics,
  onRoleManagement,
  className
}: PuzzleControlsProps) {
  const { permissions, uiState, canPerform, getError } = usePermissionBasedUI(
    userContext,
    roomContext,
    puzzleContext
  );

  const handleAction = (action: () => void | undefined, permission: keyof typeof permissions) => {
    if (!canPerform(permission)) {
      const error = getError(permission);
      console.warn(`Permission denied: ${error}`);
      return;
    }
    action?.();
  };

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Puzzle Controls
        </CardTitle>
        <CardDescription>
          Available actions based on your role and permissions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Permission Status */}
        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <div className={cn(
              'w-2 h-2 rounded-full',
              permissions.canEdit ? 'bg-green-500' : 'bg-red-500'
            )} />
            <span className="text-sm font-medium">
              {permissions.canEdit ? 'Can Edit' : 'Read Only'}
            </span>
          </div>
          {userContext.role === 'SPECTATOR' && (
            <Badge variant="outline" className="ml-auto">
              Spectator Mode
            </Badge>
          )}
        </div>

        {/* Error Messages */}
        {Object.entries(uiState).some(([key, value]) => key.includes('Error') && value) && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {uiState.editError && <div>Edit: {uiState.editError}</div>}
              {uiState.hintError && <div>Hint: {uiState.hintError}</div>}
              {uiState.revealError && <div>Reveal: {uiState.revealError}</div>}
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {/* Edit Button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={permissions.canEdit ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleAction(onEdit, 'canEdit')}
                  disabled={!permissions.canEdit}
                  className="flex items-center gap-2"
                >
                  <Edit3 className="h-4 w-4" />
                  Edit
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {permissions.canEdit ? 'Edit the puzzle' : getError('canEdit')}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Hint Button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={permissions.canHint ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleAction(onHint, 'canHint')}
                  disabled={!permissions.canHint}
                  className="flex items-center gap-2"
                >
                  <Lightbulb className="h-4 w-4" />
                  Hint
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {permissions.canHint ? 'Get a hint' : getError('canHint')}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Reveal Button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={permissions.canReveal ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleAction(onReveal, 'canReveal')}
                  disabled={!permissions.canReveal}
                  className="flex items-center gap-2"
                >
                  <Eye className="h-4 w-4" />
                  Reveal
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {permissions.canReveal ? 'Reveal answers' : getError('canReveal')}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Reset Button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={permissions.canReset ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleAction(onReset, 'canReset')}
                  disabled={!permissions.canReset}
                  className="flex items-center gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {permissions.canReset ? 'Reset the puzzle' : getError('canReset')}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Share Button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={permissions.canShare ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleAction(onShare, 'canShare')}
                  disabled={!permissions.canShare}
                  className="flex items-center gap-2"
                >
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {permissions.canShare ? 'Share the puzzle' : getError('canShare')}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Export Button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={permissions.canExport ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleAction(onExport, 'canExport')}
                  disabled={!permissions.canExport}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {permissions.canExport ? 'Export the puzzle' : getError('canExport')}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Moderation Controls */}
        {(permissions.canModerate || permissions.canInvite || permissions.canKick) && (
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium mb-2">Moderation</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {permissions.canModerate && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAction(onModerate, 'canModerate')}
                  className="flex items-center gap-2"
                >
                  <Shield className="h-4 w-4" />
                  Moderate
                </Button>
              )}
              
              {permissions.canInvite && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAction(onInvite, 'canInvite')}
                  className="flex items-center gap-2"
                >
                  <Users className="h-4 w-4" />
                  Invite
                </Button>
              )}
              
              {permissions.canKick && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAction(onKick, 'canKick')}
                  className="flex items-center gap-2"
                >
                  <UserMinus className="h-4 w-4" />
                  Kick
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Host Controls */}
        {(permissions.canChangeSettings || permissions.canViewAnalytics || permissions.canManageRoles) && (
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium mb-2">Host Controls</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {permissions.canChangeSettings && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAction(onSettings, 'canChangeSettings')}
                  className="flex items-center gap-2"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </Button>
              )}
              
              {permissions.canViewAnalytics && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAction(onAnalytics, 'canViewAnalytics')}
                  className="flex items-center gap-2"
                >
                  <BarChart3 className="h-4 w-4" />
                  Analytics
                </Button>
              )}
              
              {permissions.canManageRoles && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAction(onRoleManagement, 'canManageRoles')}
                  className="flex items-center gap-2"
                >
                  <Shield className="h-4 w-4" />
                  Roles
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Permission Summary */}
        <div className="pt-4 border-t">
          <div className="flex items-center gap-2 mb-2">
            <Info className="h-4 w-4" />
            <span className="text-sm font-medium">Your Permissions</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {Object.entries(permissions).map(([key, value]) => (
              <div key={key} className="flex items-center gap-2">
                {value ? (
                  <CheckCircle className="h-3 w-3 text-green-500" />
                ) : (
                  <Lock className="h-3 w-3 text-gray-400" />
                )}
                <span className={cn(
                  'capitalize',
                  value ? 'text-green-700' : 'text-gray-500'
                )}>
                  {key.replace('can', '').toLowerCase()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Compact version for smaller spaces
export function PuzzleControlsCompact({
  userContext,
  roomContext,
  puzzleContext,
  onEdit,
  onHint,
  onReveal,
  onReset,
  className
}: Pick<PuzzleControlsProps, 'userContext' | 'roomContext' | 'puzzleContext' | 'onEdit' | 'onHint' | 'onReveal' | 'onReset' | 'className'>) {
  const { permissions, canPerform, getError } = usePermissionBasedUI(
    userContext,
    roomContext,
    puzzleContext
  );

  const handleAction = (action: () => void | undefined, permission: keyof typeof permissions) => {
    if (!canPerform(permission)) {
      const error = getError(permission);
      console.warn(`Permission denied: ${error}`);
      return;
    }
    action?.();
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={permissions.canEdit ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleAction(onEdit, 'canEdit')}
              disabled={!permissions.canEdit}
            >
              <Edit3 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {permissions.canEdit ? 'Edit the puzzle' : getError('canEdit')}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={permissions.canHint ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleAction(onHint, 'canHint')}
              disabled={!permissions.canHint}
            >
              <Lightbulb className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {permissions.canHint ? 'Get a hint' : getError('canHint')}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={permissions.canReveal ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleAction(onReveal, 'canReveal')}
              disabled={!permissions.canReveal}
            >
              <Eye className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {permissions.canReveal ? 'Reveal answers' : getError('canReveal')}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={permissions.canReset ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleAction(onReset, 'canReset')}
              disabled={!permissions.canReset}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {permissions.canReset ? 'Reset the puzzle' : getError('canReset')}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
