import {
  validatePuzzlePermissions,
  getPermissionError,
  canPerformAction,
  getAvailableActions,
  PuzzlePermission,
  UserContext,
  RoomContext,
  PuzzleContext
} from './puzzlePermissions';

describe('puzzlePermissions', () => {
  const mockUserContext: UserContext = {
    role: 'PLAYER',
    subscriptionStatus: 'ACTIVE',
    isPremium: true,
    isHost: false,
    isModerator: false,
    isOnline: true,
    isActive: true,
    hasJoined: true,
    joinTime: new Date(),
    lastActivity: new Date()
  };

  const mockRoomContext: RoomContext = {
    isPrivate: false,
    hasPassword: false,
    maxPlayers: 10,
    currentPlayerCount: 5,
    roomStatus: 'ACTIVE',
    allowSpectators: true,
    allowGuests: true,
    puzzleDifficulty: 'MEDIUM',
    puzzleType: 'CROSSWORD',
    timeLimit: 3600,
    isTimeLimited: true
  };

  const mockPuzzleContext: PuzzleContext = {
    isCompleted: false,
    isLocked: false,
    isShared: false,
    isPublic: true,
    hasTimeLimit: true,
    timeRemaining: 1800,
    difficulty: 'MEDIUM',
    type: 'CROSSWORD',
    maxHints: 5,
    hintsUsed: 0,
    canCollaborate: true,
    requiresPremium: false
  };

  describe('validatePuzzlePermissions', () => {
    it('should allow player to edit puzzle', () => {
      const permissions = validatePuzzlePermissions(mockUserContext, mockRoomContext, mockPuzzleContext);
      
      expect(permissions.canView).toBe(true);
      expect(permissions.canEdit).toBe(true);
      expect(permissions.canHint).toBe(true);
    });

    it('should deny spectator from editing', () => {
      const spectatorContext = { ...mockUserContext, role: 'SPECTATOR' as const };
      const permissions = validatePuzzlePermissions(spectatorContext, mockRoomContext, mockPuzzleContext);
      
      expect(permissions.canView).toBe(true);
      expect(permissions.canEdit).toBe(false);
      expect(permissions.canHint).toBe(false);
    });

    it('should deny offline user from editing', () => {
      const offlineContext = { ...mockUserContext, isOnline: false };
      const permissions = validatePuzzlePermissions(offlineContext, mockRoomContext, mockPuzzleContext);
      
      expect(permissions.canView).toBe(true);
      expect(permissions.canEdit).toBe(false);
    });

    it('should deny editing completed puzzle', () => {
      const completedPuzzle = { ...mockPuzzleContext, isCompleted: true };
      const permissions = validatePuzzlePermissions(mockUserContext, mockRoomContext, completedPuzzle);
      
      expect(permissions.canView).toBe(true);
      expect(permissions.canEdit).toBe(false);
    });

    it('should deny editing locked puzzle for non-hosts', () => {
      const lockedPuzzle = { ...mockPuzzleContext, isLocked: true };
      const permissions = validatePuzzlePermissions(mockUserContext, mockRoomContext, lockedPuzzle);
      
      expect(permissions.canView).toBe(true);
      expect(permissions.canEdit).toBe(false);
    });

    it('should allow host to edit locked puzzle', () => {
      const hostContext = { ...mockUserContext, isHost: true };
      const lockedPuzzle = { ...mockPuzzleContext, isLocked: true };
      const permissions = validatePuzzlePermissions(hostContext, mockRoomContext, lockedPuzzle);
      
      expect(permissions.canView).toBe(true);
      expect(permissions.canEdit).toBe(true);
    });

    it('should deny editing when room is full', () => {
      const fullRoom = { ...mockRoomContext, currentPlayerCount: 10, maxPlayers: 10 };
      const permissions = validatePuzzlePermissions(mockUserContext, fullRoom, mockPuzzleContext);
      
      expect(permissions.canEdit).toBe(false);
    });

    it('should allow host to edit even when room is full', () => {
      const hostContext = { ...mockUserContext, isHost: true };
      const fullRoom = { ...mockRoomContext, currentPlayerCount: 10, maxPlayers: 10 };
      const permissions = validatePuzzlePermissions(hostContext, fullRoom, mockPuzzleContext);
      
      expect(permissions.canEdit).toBe(true);
    });

    it('should limit hints for free users', () => {
      const freeUserContext = { ...mockUserContext, isPremium: false };
      const permissions = validatePuzzlePermissions(freeUserContext, mockRoomContext, mockPuzzleContext);
      
      expect(permissions.canHint).toBe(true);
    });

    it('should deny hints when limit reached', () => {
      const puzzleWithHintsUsed = { ...mockPuzzleContext, hintsUsed: 5, maxHints: 5 };
      const permissions = validatePuzzlePermissions(mockUserContext, mockRoomContext, puzzleWithHintsUsed);
      
      expect(permissions.canHint).toBe(false);
    });

    it('should allow only hosts and moderators to reveal answers', () => {
      const permissions = validatePuzzlePermissions(mockUserContext, mockRoomContext, mockPuzzleContext);
      
      expect(permissions.canReveal).toBe(false);
    });

    it('should allow moderators to reveal answers', () => {
      const moderatorContext = { ...mockUserContext, isModerator: true };
      const permissions = validatePuzzlePermissions(moderatorContext, mockRoomContext, mockPuzzleContext);
      
      expect(permissions.canReveal).toBe(true);
    });

    it('should allow only hosts to reset puzzle', () => {
      const permissions = validatePuzzlePermissions(mockUserContext, mockRoomContext, mockPuzzleContext);
      
      expect(permissions.canReset).toBe(false);
    });

    it('should allow hosts to reset puzzle', () => {
      const hostContext = { ...mockUserContext, isHost: true };
      const permissions = validatePuzzlePermissions(hostContext, mockRoomContext, mockPuzzleContext);
      
      expect(permissions.canReset).toBe(true);
    });

    it('should allow sharing for premium users', () => {
      const permissions = validatePuzzlePermissions(mockUserContext, mockRoomContext, mockPuzzleContext);
      
      expect(permissions.canShare).toBe(true);
    });

    it('should deny sharing for free users with private puzzle', () => {
      const freeUserContext = { ...mockUserContext, isPremium: false };
      const privatePuzzle = { ...mockPuzzleContext, isPublic: false };
      const permissions = validatePuzzlePermissions(freeUserContext, mockRoomContext, privatePuzzle);
      
      expect(permissions.canShare).toBe(false);
    });

    it('should allow sharing public puzzles for free users', () => {
      const freeUserContext = { ...mockUserContext, isPremium: false };
      const permissions = validatePuzzlePermissions(freeUserContext, mockRoomContext, mockPuzzleContext);
      
      expect(permissions.canShare).toBe(true);
    });

    it('should allow moderation for hosts and moderators', () => {
      const permissions = validatePuzzlePermissions(mockUserContext, mockRoomContext, mockPuzzleContext);
      
      expect(permissions.canModerate).toBe(false);
    });

    it('should allow moderation for moderators', () => {
      const moderatorContext = { ...mockUserContext, isModerator: true };
      const permissions = validatePuzzlePermissions(moderatorContext, mockRoomContext, mockPuzzleContext);
      
      expect(permissions.canModerate).toBe(true);
    });

    it('should allow only hosts to change settings', () => {
      const permissions = validatePuzzlePermissions(mockUserContext, mockRoomContext, mockPuzzleContext);
      
      expect(permissions.canChangeSettings).toBe(false);
    });

    it('should allow hosts to change settings', () => {
      const hostContext = { ...mockUserContext, isHost: true };
      const permissions = validatePuzzlePermissions(hostContext, mockRoomContext, mockPuzzleContext);
      
      expect(permissions.canChangeSettings).toBe(true);
    });
  });

  describe('getPermissionError', () => {
    it('should return error for spectator trying to edit', () => {
      const spectatorContext = { ...mockUserContext, role: 'SPECTATOR' as const };
      const error = getPermissionError('canEdit', spectatorContext, mockRoomContext, mockPuzzleContext);
      
      expect(error).toContain('Spectators cannot edit puzzles');
    });

    it('should return error for offline user trying to edit', () => {
      const offlineContext = { ...mockUserContext, isOnline: false };
      const error = getPermissionError('canEdit', offlineContext, mockRoomContext, mockPuzzleContext);
      
      expect(error).toContain('You must be online to edit puzzles');
    });

    it('should return error for completed puzzle', () => {
      const completedPuzzle = { ...mockPuzzleContext, isCompleted: true };
      const error = getPermissionError('canEdit', mockUserContext, mockRoomContext, completedPuzzle);
      
      expect(error).toContain('This puzzle has already been completed');
    });

    it('should return error for locked puzzle', () => {
      const lockedPuzzle = { ...mockPuzzleContext, isLocked: true };
      const error = getPermissionError('canEdit', mockUserContext, mockRoomContext, lockedPuzzle);
      
      expect(error).toContain('This puzzle is currently locked');
    });

    it('should return error for full room', () => {
      const fullRoom = { ...mockRoomContext, currentPlayerCount: 10, maxPlayers: 10 };
      const error = getPermissionError('canEdit', mockUserContext, fullRoom, mockPuzzleContext);
      
      expect(error).toContain('Room is at maximum capacity');
    });

    it('should return error for hint limit reached', () => {
      const puzzleWithHintsUsed = { ...mockPuzzleContext, hintsUsed: 5, maxHints: 5 };
      const error = getPermissionError('canHint', mockUserContext, mockRoomContext, puzzleWithHintsUsed);
      
      expect(error).toContain('No more hints available');
    });

    it('should return error for free user hint limit', () => {
      const freeUserContext = { ...mockUserContext, isPremium: false };
      const puzzleWithHintsUsed = { ...mockPuzzleContext, hintsUsed: 2, maxHints: 5 };
      const error = getPermissionError('canHint', freeUserContext, mockRoomContext, puzzleWithHintsUsed);
      
      expect(error).toContain('Free users have limited hints');
    });

    it('should return error for reveal permission', () => {
      const error = getPermissionError('canReveal', mockUserContext, mockRoomContext, mockPuzzleContext);
      
      expect(error).toContain('Only hosts and moderators can reveal answers');
    });

    it('should return error for reset permission', () => {
      const error = getPermissionError('canReset', mockUserContext, mockRoomContext, mockPuzzleContext);
      
      expect(error).toContain('Only hosts can reset the puzzle');
    });

    it('should return error for share permission', () => {
      const freeUserContext = { ...mockUserContext, isPremium: false };
      const privatePuzzle = { ...mockPuzzleContext, isPublic: false };
      const error = getPermissionError('canShare', freeUserContext, mockRoomContext, privatePuzzle);
      
      expect(error).toContain('Premium subscription required to share private puzzles');
    });
  });

  describe('canPerformAction', () => {
    it('should return true for allowed action', () => {
      const canEdit = canPerformAction('canEdit', mockUserContext, mockRoomContext, mockPuzzleContext);
      expect(canEdit).toBe(true);
    });

    it('should return false for denied action', () => {
      const spectatorContext = { ...mockUserContext, role: 'SPECTATOR' as const };
      const canEdit = canPerformAction('canEdit', spectatorContext, mockRoomContext, mockPuzzleContext);
      expect(canEdit).toBe(false);
    });
  });

  describe('getAvailableActions', () => {
    it('should return available actions for player', () => {
      const actions = getAvailableActions(mockUserContext, mockRoomContext, mockPuzzleContext);
      
      expect(actions).toContain('canView');
      expect(actions).toContain('canEdit');
      expect(actions).toContain('canHint');
      expect(actions).toContain('canShare');
      expect(actions).toContain('canExport');
    });

    it('should return limited actions for spectator', () => {
      const spectatorContext = { ...mockUserContext, role: 'SPECTATOR' as const };
      const actions = getAvailableActions(spectatorContext, mockRoomContext, mockPuzzleContext);
      
      expect(actions).toContain('canView');
      expect(actions).not.toContain('canEdit');
      expect(actions).not.toContain('canHint');
    });

    it('should return all actions for host', () => {
      const hostContext = { ...mockUserContext, isHost: true };
      const actions = getAvailableActions(hostContext, mockRoomContext, mockPuzzleContext);
      
      expect(actions).toContain('canView');
      expect(actions).toContain('canEdit');
      expect(actions).toContain('canHint');
      expect(actions).toContain('canReveal');
      expect(actions).toContain('canReset');
      expect(actions).toContain('canShare');
      expect(actions).toContain('canExport');
      expect(actions).toContain('canModerate');
      expect(actions).toContain('canInvite');
      expect(actions).toContain('canKick');
      expect(actions).toContain('canChangeSettings');
      expect(actions).toContain('canViewAnalytics');
      expect(actions).toContain('canManageRoles');
    });
  });
});
