export type UserRole = 'PLAYER' | 'HOST' | 'MODERATOR' | 'SPECTATOR';

export interface PuzzlePermission {
  canEdit: boolean;
  canView: boolean;
  canHint: boolean;
  canReveal: boolean;
  canReset: boolean;
  canShare: boolean;
  canExport: boolean;
  canModerate: boolean;
  canInvite: boolean;
  canKick: boolean;
  canChangeSettings: boolean;
  canViewAnalytics: boolean;
  canManageRoles: boolean;
}

export interface UserContext {
  role: UserRole;
  isHost: boolean;
  isModerator: boolean;
  isOnline: boolean;
  isActive: boolean;
  hasJoined: boolean;
  joinTime?: Date;
  lastActivity?: Date;
}

export interface RoomContext {
  isPrivate: boolean;
  hasPassword: boolean;
  maxPlayers: number;
  currentPlayerCount: number;
  roomStatus: 'WAITING' | 'ACTIVE' | 'PAUSED' | 'COMPLETED';
  allowSpectators: boolean;
  allowGuests: boolean;
  puzzleDifficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT';
  puzzleType: 'CROSSWORD' | 'WORDSEARCH' | 'SUDOKU' | 'CUSTOM';
  timeLimit?: number;
  isTimeLimited: boolean;
}

export interface PuzzleContext {
  isCompleted: boolean;
  isLocked: boolean;
  isShared: boolean;
  isPublic: boolean;
  hasTimeLimit: boolean;
  timeRemaining?: number;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT';
  type: 'CROSSWORD' | 'WORDSEARCH' | 'SUDOKU' | 'CUSTOM';
  maxHints: number;
  hintsUsed: number;
  canCollaborate: boolean;
}

/**
 * Validates puzzle editing permissions based on user role and context
 */
export function validatePuzzlePermissions(
  userContext: UserContext,
  roomContext: RoomContext,
  puzzleContext: PuzzleContext
): PuzzlePermission {
  const permissions: PuzzlePermission = {
    canEdit: false,
    canView: false,
    canHint: false,
    canReveal: false,
    canReset: false,
    canShare: false,
    canExport: false,
    canModerate: false,
    canInvite: false,
    canKick: false,
    canChangeSettings: false,
    canViewAnalytics: false,
    canManageRoles: false
  };

  // Basic view permissions
  permissions.canView = canViewPuzzle(userContext, roomContext, puzzleContext);
  
  // Edit permissions
  permissions.canEdit = canEditPuzzle(userContext, roomContext, puzzleContext);
  
  // Hint permissions
  permissions.canHint = canUseHints(userContext, roomContext, puzzleContext);
  
  // Reveal permissions
  permissions.canReveal = canRevealAnswers(userContext, roomContext, puzzleContext);
  
  // Reset permissions
  permissions.canReset = canResetPuzzle(userContext, roomContext, puzzleContext);
  
  // Share permissions
  permissions.canShare = canSharePuzzle(userContext, roomContext, puzzleContext);
  
  // Export permissions
  permissions.canExport = canExportPuzzle(userContext, roomContext, puzzleContext);
  
  // Moderation permissions
  permissions.canModerate = canModerateRoom(userContext, roomContext);
  
  // Invite permissions
  permissions.canInvite = canInviteUsers(userContext, roomContext);
  
  // Kick permissions
  permissions.canKick = canKickUsers(userContext, roomContext);
  
  // Settings permissions
  permissions.canChangeSettings = canChangeRoomSettings(userContext, roomContext);
  
  // Analytics permissions
  permissions.canViewAnalytics = canViewAnalytics(userContext, roomContext);
  
  // Role management permissions
  permissions.canManageRoles = canManageRoles(userContext, roomContext);

  return permissions;
}

/**
 * Check if user can view the puzzle
 */
function canViewPuzzle(
  userContext: UserContext,
  roomContext: RoomContext,
  puzzleContext: PuzzleContext
): boolean {
  // Everyone can view if they're in the room
  if (!userContext.hasJoined) return false;
  
  return true;
}

/**
 * Check if user can edit the puzzle
 */
function canEditPuzzle(
  userContext: UserContext,
  roomContext: RoomContext,
  puzzleContext: PuzzleContext
): boolean {
  // Must be able to view first
  if (!canViewPuzzle(userContext, roomContext, puzzleContext)) return false;
  
  // Spectators cannot edit
  if (userContext.role === 'SPECTATOR') return false;
  
  // Must be online and active
  if (!userContext.isOnline || !userContext.isActive) return false;
  
  // Check if puzzle is completed
  if (puzzleContext.isCompleted) return false;
  
  // Check if puzzle is locked
  if (puzzleContext.isLocked && !userContext.isHost) return false;
  
  // Check room capacity
  if (roomContext.currentPlayerCount >= roomContext.maxPlayers && !userContext.isHost) {
    return false;
  }
  
  // Check if collaboration is allowed
  if (!puzzleContext.canCollaborate && !userContext.isHost) return false;
  
  return true;
}

/**
 * Check if user can use hints
 */
function canUseHints(
  userContext: UserContext,
  roomContext: RoomContext,
  puzzleContext: PuzzleContext
): boolean {
  // Must be able to edit
  if (!canEditPuzzle(userContext, roomContext, puzzleContext)) return false;
  
  // Check hint limits
  if (puzzleContext.hintsUsed >= puzzleContext.maxHints) return false;
  
  return puzzleContext.hintsUsed < puzzleContext.maxHints;
}

/**
 * Check if user can reveal answers
 */
function canRevealAnswers(
  userContext: UserContext,
  roomContext: RoomContext,
  puzzleContext: PuzzleContext
): boolean {
  // Only hosts and moderators can reveal answers
  if (!userContext.isHost && !userContext.isModerator) return false;
  
  // Must be able to view
  if (!canViewPuzzle(userContext, roomContext, puzzleContext)) return false;
  
  return true;
}

/**
 * Check if user can reset the puzzle
 */
function canResetPuzzle(
  userContext: UserContext,
  roomContext: RoomContext,
  puzzleContext: PuzzleContext
): boolean {
  // Only hosts can reset
  if (!userContext.isHost) return false;
  
  return true;
}

/**
 * Check if user can share the puzzle
 */
function canSharePuzzle(
  userContext: UserContext,
  roomContext: RoomContext,
  puzzleContext: PuzzleContext
): boolean {
  // Must be able to view
  if (!canViewPuzzle(userContext, roomContext, puzzleContext)) return false;
  
  return puzzleContext.isPublic;
}

/**
 * Check if user can export the puzzle
 */
function canExportPuzzle(
  userContext: UserContext,
  roomContext: RoomContext,
  puzzleContext: PuzzleContext
): boolean {
  // Must be able to view
  if (!canViewPuzzle(userContext, roomContext, puzzleContext)) return false;
  
  return puzzleContext.isPublic;
}

/**
 * Check if user can moderate the room
 */
function canModerateRoom(
  userContext: UserContext,
  roomContext: RoomContext
): boolean {
  return userContext.isHost || userContext.isModerator;
}

/**
 * Check if user can invite users
 */
function canInviteUsers(
  userContext: UserContext,
  roomContext: RoomContext
): boolean {
  // Only hosts and moderators can invite
  if (!userContext.isHost && !userContext.isModerator) return false;
  
  // Check room capacity
  if (roomContext.currentPlayerCount >= roomContext.maxPlayers) return false;
  
  return true;
}

/**
 * Check if user can kick users
 */
function canKickUsers(
  userContext: UserContext,
  roomContext: RoomContext
): boolean {
  // Only hosts and moderators can kick
  if (!userContext.isHost && !userContext.isModerator) return false;
  
  return true;
}

/**
 * Check if user can change room settings
 */
function canChangeRoomSettings(
  userContext: UserContext,
  roomContext: RoomContext
): boolean {
  // Only hosts can change settings
  return userContext.isHost;
}

/**
 * Check if user can view analytics
 */
function canViewAnalytics(
  userContext: UserContext,
  roomContext: RoomContext
): boolean {
  // Only hosts and moderators can view analytics
  if (!userContext.isHost && !userContext.isModerator) return false;
  
  // Premium users get more detailed analytics
  return true;
}

/**
 * Check if user can manage roles
 */
function canManageRoles(
  userContext: UserContext,
  roomContext: RoomContext
): boolean {
  // Only hosts can manage roles
  return userContext.isHost;
}

/**
 * Get permission error message
 */
export function getPermissionError(
  permission: keyof PuzzlePermission,
  userContext: UserContext,
  roomContext: RoomContext,
  puzzleContext: PuzzleContext
): string {
  const permissions = validatePuzzlePermissions(userContext, roomContext, puzzleContext);
  
  if (permissions[permission]) {
    return '';
  }

  switch (permission) {
    case 'canEdit':
      if (userContext.role === 'SPECTATOR') {
        return 'Spectators cannot edit puzzles. Upgrade to a player role to participate.';
      }
      if (!userContext.isOnline) {
        return 'You must be online to edit puzzles.';
      }
      if (puzzleContext.isCompleted) {
        return 'This puzzle has already been completed.';
      }
      if (puzzleContext.isLocked) {
        return 'This puzzle is currently locked.';
      }
      if (roomContext.currentPlayerCount >= roomContext.maxPlayers) {
        return 'Room is at maximum capacity.';
      }
      return 'You do not have permission to edit this puzzle.';
      
    case 'canView':
      if (!userContext.hasJoined) {
        return 'You must join the room to view the puzzle.';
      }
      if (puzzleContext.isLocked && !userContext.isHost) {
        return 'This puzzle is currently locked.';
      }
      return 'You do not have permission to view this puzzle.';
      
    case 'canHint':
      if (puzzleContext.hintsUsed >= puzzleContext.maxHints) {
        return 'No more hints available.';
      }
      return 'You do not have permission to use hints.';
      
    case 'canReveal':
      return 'Only hosts and moderators can reveal answers.';
      
    case 'canReset':
      return 'Only hosts can reset the puzzle.';
      
    case 'canShare':
      return 'You do not have permission to share this puzzle.';
      
    case 'canExport':
      return 'You do not have permission to export this puzzle.';
      
    case 'canModerate':
      return 'Only hosts and moderators can moderate the room.';
      
    case 'canInvite':
      if (roomContext.currentPlayerCount >= roomContext.maxPlayers) {
        return 'Room is at maximum capacity.';
      }
      return 'Only hosts and moderators can invite users.';
      
    case 'canKick':
      return 'Only hosts and moderators can kick users.';
      
    case 'canChangeSettings':
      return 'Only hosts can change room settings.';
      
    case 'canViewAnalytics':
      return 'Only hosts and moderators can view analytics.';
      
    case 'canManageRoles':
      return 'Only hosts can manage user roles.';
      
    default:
      return 'You do not have permission to perform this action.';
  }
}

/**
 * Check if user can perform a specific action
 */
export function canPerformAction(
  action: keyof PuzzlePermission,
  userContext: UserContext,
  roomContext: RoomContext,
  puzzleContext: PuzzleContext
): boolean {
  const permissions = validatePuzzlePermissions(userContext, roomContext, puzzleContext);
  return permissions[action];
}

/**
 * Get all available actions for a user
 */
export function getAvailableActions(
  userContext: UserContext,
  roomContext: RoomContext,
  puzzleContext: PuzzleContext
): (keyof PuzzlePermission)[] {
  const permissions = validatePuzzlePermissions(userContext, roomContext, puzzleContext);
  
  return Object.keys(permissions).filter(
    (key): key is keyof PuzzlePermission => permissions[key as keyof PuzzlePermission]
  );
}
