import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  validatePuzzlePermissions, 
  getPermissionError, 
  canPerformAction, 
  getAvailableActions,
  PuzzlePermission,
  UserContext,
  RoomContext,
  PuzzleContext
} from '@/lib/puzzlePermissions';

interface UsePuzzlePermissionsProps {
  userContext: UserContext;
  roomContext: RoomContext;
  puzzleContext: PuzzleContext;
}

interface UsePuzzlePermissionsReturn {
  permissions: PuzzlePermission;
  isLoading: boolean;
  error: string | null;
  canPerform: (action: keyof PuzzlePermission) => boolean;
  getError: (action: keyof PuzzlePermission) => string;
  getAvailableActions: () => (keyof PuzzlePermission)[];
  checkPermission: (action: keyof PuzzlePermission) => Promise<boolean>;
  validateAction: (action: keyof PuzzlePermission) => { allowed: boolean; error?: string };
}

export function usePuzzlePermissions({
  userContext,
  roomContext,
  puzzleContext
}: UsePuzzlePermissionsProps): UsePuzzlePermissionsReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate permissions
  const permissions = useMemo(() => {
    try {
      return validatePuzzlePermissions(userContext, roomContext, puzzleContext);
    } catch (err) {
      console.error('Error calculating permissions:', err);
      setError(err instanceof Error ? err.message : 'Failed to calculate permissions');
      return {} as PuzzlePermission;
    }
  }, [userContext, roomContext, puzzleContext]);

  // Check if user can perform a specific action
  const canPerform = useCallback((action: keyof PuzzlePermission): boolean => {
    try {
      return canPerformAction(action, userContext, roomContext, puzzleContext);
    } catch (err) {
      console.error('Error checking permission:', err);
      return false;
    }
  }, [userContext, roomContext, puzzleContext]);

  // Get error message for a specific action
  const getError = useCallback((action: keyof PuzzlePermission): string => {
    try {
      return getPermissionError(action, userContext, roomContext, puzzleContext);
    } catch (err) {
      console.error('Error getting permission error:', err);
      return 'An error occurred while checking permissions.';
    }
  }, [userContext, roomContext, puzzleContext]);

  // Get all available actions
  const getAvailableActionsList = useCallback((): (keyof PuzzlePermission)[] => {
    try {
      return getAvailableActions(userContext, roomContext, puzzleContext);
    } catch (err) {
      console.error('Error getting available actions:', err);
      return [];
    }
  }, [userContext, roomContext, puzzleContext]);

  // Check permission with async validation (for future API integration)
  const checkPermission = useCallback(async (action: keyof PuzzlePermission): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      // Simulate API call for permission validation
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const allowed = canPerformAction(action, userContext, roomContext, puzzleContext);
      
      if (!allowed) {
        const errorMessage = getPermissionError(action, userContext, roomContext, puzzleContext);
        setError(errorMessage);
      }
      
      return allowed;
    } catch (err) {
      console.error('Error checking permission:', err);
      setError(err instanceof Error ? err.message : 'Failed to check permission');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [userContext, roomContext, puzzleContext]);

  // Validate action with detailed response
  const validateAction = useCallback((action: keyof PuzzlePermission): { allowed: boolean; error?: string } => {
    try {
      const allowed = canPerformAction(action, userContext, roomContext, puzzleContext);
      const error = allowed ? undefined : getPermissionError(action, userContext, roomContext, puzzleContext);
      
      return { allowed, error };
    } catch (err) {
      console.error('Error validating action:', err);
      return { 
        allowed: false, 
        error: err instanceof Error ? err.message : 'Failed to validate action' 
      };
    }
  }, [userContext, roomContext, puzzleContext]);

  // Clear error when context changes
  useEffect(() => {
    setError(null);
  }, [userContext, roomContext, puzzleContext]);

  return {
    permissions,
    isLoading,
    error,
    canPerform,
    getError,
    getAvailableActions: getAvailableActionsList,
    checkPermission,
    validateAction
  };
}

// Hook for specific permission checks
export function usePermissionCheck(
  action: keyof PuzzlePermission,
  userContext: UserContext,
  roomContext: RoomContext,
  puzzleContext: PuzzleContext
) {
  const { canPerform, getError, validateAction } = usePuzzlePermissions({
    userContext,
    roomContext,
    puzzleContext
  });

  const allowed = canPerform(action);
  const error = allowed ? null : getError(action);
  const validation = validateAction(action);

  return {
    allowed,
    error,
    validation,
    canPerform: () => canPerform(action),
    getError: () => getError(action)
  };
}

// Hook for multiple permission checks
export function useMultiplePermissions(
  actions: (keyof PuzzlePermission)[],
  userContext: UserContext,
  roomContext: RoomContext,
  puzzleContext: PuzzleContext
) {
  const { permissions, canPerform, getError, validateAction } = usePuzzlePermissions({
    userContext,
    roomContext,
    puzzleContext
  });

  const results = useMemo(() => {
    return actions.map(action => ({
      action,
      allowed: canPerform(action),
      error: canPerform(action) ? null : getError(action),
      validation: validateAction(action)
    }));
  }, [actions, canPerform, getError, validateAction]);

  const allAllowed = results.every(result => result.allowed);
  const anyAllowed = results.some(result => result.allowed);
  const errors = results.filter(result => result.error).map(result => result.error);

  return {
    results,
    allAllowed,
    anyAllowed,
    errors,
    permissions
  };
}

// Hook for permission-based UI rendering
export function usePermissionBasedUI(
  userContext: UserContext,
  roomContext: RoomContext,
  puzzleContext: PuzzleContext
) {
  const { permissions, canPerform, getError } = usePuzzlePermissions({
    userContext,
    roomContext,
    puzzleContext
  });

  // UI state based on permissions
  const uiState = useMemo(() => ({
    showEditControls: canPerform('canEdit'),
    showHintButton: canPerform('canHint'),
    showRevealButton: canPerform('canReveal'),
    showResetButton: canPerform('canReset'),
    showShareButton: canPerform('canShare'),
    showExportButton: canPerform('canExport'),
    showModerationControls: canPerform('canModerate'),
    showInviteButton: canPerform('canInvite'),
    showKickButton: canPerform('canKick'),
    showSettingsButton: canPerform('canChangeSettings'),
    showAnalyticsButton: canPerform('canViewAnalytics'),
    showRoleManagement: canPerform('canManageRoles'),
    
    // Disabled states
    isEditDisabled: !canPerform('canEdit'),
    isHintDisabled: !canPerform('canHint'),
    isRevealDisabled: !canPerform('canReveal'),
    isResetDisabled: !canPerform('canReset'),
    isShareDisabled: !canPerform('canShare'),
    isExportDisabled: !canPerform('canExport'),
    
    // Error messages
    editError: getError('canEdit'),
    hintError: getError('canHint'),
    revealError: getError('canReveal'),
    resetError: getError('canReset'),
    shareError: getError('canShare'),
    exportError: getError('canExport')
  }), [permissions, canPerform, getError]);

  return {
    permissions,
    uiState,
    canPerform,
    getError
  };
}
