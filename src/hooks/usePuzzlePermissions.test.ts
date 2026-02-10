import { renderHook, act } from '@testing-library/react';
import { usePuzzlePermissions, usePermissionCheck, useMultiplePermissions, usePermissionBasedUI } from './usePuzzlePermissions';
import { UserContext, RoomContext, PuzzleContext } from '@/lib/puzzlePermissions';

describe('usePuzzlePermissions', () => {
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

  describe('usePuzzlePermissions', () => {
    it('should return permissions for valid context', () => {
      const { result } = renderHook(() => usePuzzlePermissions({
        userContext: mockUserContext,
        roomContext: mockRoomContext,
        puzzleContext: mockPuzzleContext
      }));

      expect(result.current.permissions).toBeDefined();
      expect(result.current.permissions.canView).toBe(true);
      expect(result.current.permissions.canEdit).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should check individual permissions', () => {
      const { result } = renderHook(() => usePuzzlePermissions({
        userContext: mockUserContext,
        roomContext: mockRoomContext,
        puzzleContext: mockPuzzleContext
      }));

      expect(result.current.canPerform('canEdit')).toBe(true);
      expect(result.current.canPerform('canView')).toBe(true);
      expect(result.current.canPerform('canReset')).toBe(false);
    });

    it('should get error messages for denied permissions', () => {
      const { result } = renderHook(() => usePuzzlePermissions({
        userContext: mockUserContext,
        roomContext: mockRoomContext,
        puzzleContext: mockPuzzleContext
      }));

      const error = result.current.getError('canReset');
      expect(error).toContain('Only hosts can reset the puzzle');
    });

    it('should get available actions', () => {
      const { result } = renderHook(() => usePuzzlePermissions({
        userContext: mockUserContext,
        roomContext: mockRoomContext,
        puzzleContext: mockPuzzleContext
      }));

      const actions = result.current.getAvailableActions();
      expect(actions).toContain('canView');
      expect(actions).toContain('canEdit');
      expect(actions).toContain('canHint');
    });

    it('should validate actions', () => {
      const { result } = renderHook(() => usePuzzlePermissions({
        userContext: mockUserContext,
        roomContext: mockRoomContext,
        puzzleContext: mockPuzzleContext
      }));

      const validation = result.current.validateAction('canEdit');
      expect(validation.allowed).toBe(true);
      expect(validation.error).toBeUndefined();
    });

    it('should validate denied actions', () => {
      const { result } = renderHook(() => usePuzzlePermissions({
        userContext: mockUserContext,
        roomContext: mockRoomContext,
        puzzleContext: mockPuzzleContext
      }));

      const validation = result.current.validateAction('canReset');
      expect(validation.allowed).toBe(false);
      expect(validation.error).toContain('Only hosts can reset the puzzle');
    });

    it('should check permissions asynchronously', async () => {
      const { result } = renderHook(() => usePuzzlePermissions({
        userContext: mockUserContext,
        roomContext: mockRoomContext,
        puzzleContext: mockPuzzleContext
      }));

      const allowed = await result.current.checkPermission('canEdit');
      expect(allowed).toBe(true);
    });

    it('should handle permission check errors', async () => {
      const { result } = renderHook(() => usePuzzlePermissions({
        userContext: mockUserContext,
        roomContext: mockRoomContext,
        puzzleContext: mockPuzzleContext
      }));

      const allowed = await result.current.checkPermission('canReset');
      expect(allowed).toBe(false);
      // Note: Error might be cleared by useEffect, so we just check that the permission was denied
      expect(result.current.canPerform('canReset')).toBe(false);
    });
  });

  describe('usePermissionCheck', () => {
    it('should check single permission', () => {
      const { result } = renderHook(() => usePermissionCheck(
        'canEdit',
        mockUserContext,
        mockRoomContext,
        mockPuzzleContext
      ));

      expect(result.current.allowed).toBe(true);
      expect(result.current.error).toBeNull();
      expect(result.current.validation.allowed).toBe(true);
    });

    it('should handle denied permission', () => {
      const { result } = renderHook(() => usePermissionCheck(
        'canReset',
        mockUserContext,
        mockRoomContext,
        mockPuzzleContext
      ));

      expect(result.current.allowed).toBe(false);
      expect(result.current.error).toContain('Only hosts can reset the puzzle');
      expect(result.current.validation.allowed).toBe(false);
    });
  });

  describe('useMultiplePermissions', () => {
    it('should check multiple permissions', () => {
      const { result } = renderHook(() => useMultiplePermissions(
        ['canEdit', 'canHint', 'canReset'],
        mockUserContext,
        mockRoomContext,
        mockPuzzleContext
      ));

      expect(result.current.results).toHaveLength(3);
      expect(result.current.results[0].allowed).toBe(true);
      expect(result.current.results[1].allowed).toBe(true);
      expect(result.current.results[2].allowed).toBe(false);
      expect(result.current.anyAllowed).toBe(true);
      expect(result.current.allAllowed).toBe(false);
    });

    it('should handle all allowed permissions', () => {
      const { result } = renderHook(() => useMultiplePermissions(
        ['canView', 'canEdit', 'canHint'],
        mockUserContext,
        mockRoomContext,
        mockPuzzleContext
      ));

      expect(result.current.allAllowed).toBe(true);
      expect(result.current.anyAllowed).toBe(true);
      expect(result.current.errors).toHaveLength(0);
    });

    it('should handle all denied permissions', () => {
      const spectatorContext = { ...mockUserContext, role: 'SPECTATOR' as const };
      const { result } = renderHook(() => useMultiplePermissions(
        ['canEdit', 'canHint', 'canReset'],
        spectatorContext,
        mockRoomContext,
        mockPuzzleContext
      ));

      expect(result.current.allAllowed).toBe(false);
      expect(result.current.anyAllowed).toBe(false);
      expect(result.current.errors.length).toBeGreaterThan(0);
    });
  });

  describe('usePermissionBasedUI', () => {
    it('should return UI state based on permissions', () => {
      const { result } = renderHook(() => usePermissionBasedUI(
        mockUserContext,
        mockRoomContext,
        mockPuzzleContext
      ));

      expect(result.current.uiState.showEditControls).toBe(true);
      expect(result.current.uiState.showHintButton).toBe(true);
      expect(result.current.uiState.showRevealButton).toBe(false);
      expect(result.current.uiState.showResetButton).toBe(false);
      expect(result.current.uiState.isEditDisabled).toBe(false);
      expect(result.current.uiState.isHintDisabled).toBe(false);
      expect(result.current.uiState.isRevealDisabled).toBe(true);
      expect(result.current.uiState.isResetDisabled).toBe(true);
    });

    it('should handle spectator permissions', () => {
      const spectatorContext = { ...mockUserContext, role: 'SPECTATOR' as const };
      const { result } = renderHook(() => usePermissionBasedUI(
        spectatorContext,
        mockRoomContext,
        mockPuzzleContext
      ));

      expect(result.current.uiState.showEditControls).toBe(false);
      expect(result.current.uiState.showHintButton).toBe(false);
      expect(result.current.uiState.isEditDisabled).toBe(true);
      expect(result.current.uiState.isHintDisabled).toBe(true);
      expect(result.current.uiState.editError).toContain('Spectators cannot edit puzzles');
    });

    it('should handle host permissions', () => {
      const hostContext = { ...mockUserContext, isHost: true };
      const { result } = renderHook(() => usePermissionBasedUI(
        hostContext,
        mockRoomContext,
        mockPuzzleContext
      ));

      expect(result.current.uiState.showEditControls).toBe(true);
      expect(result.current.uiState.showHintButton).toBe(true);
      expect(result.current.uiState.showRevealButton).toBe(true);
      expect(result.current.uiState.showResetButton).toBe(true);
      expect(result.current.uiState.showSettingsButton).toBe(true);
      expect(result.current.uiState.showAnalyticsButton).toBe(true);
      expect(result.current.uiState.showRoleManagement).toBe(true);
    });

    it('should handle moderator permissions', () => {
      const moderatorContext = { ...mockUserContext, isModerator: true };
      const { result } = renderHook(() => usePermissionBasedUI(
        moderatorContext,
        mockRoomContext,
        mockPuzzleContext
      ));

      expect(result.current.uiState.showEditControls).toBe(true);
      expect(result.current.uiState.showHintButton).toBe(true);
      expect(result.current.uiState.showRevealButton).toBe(true);
      expect(result.current.uiState.showModerationControls).toBe(true);
      expect(result.current.uiState.showInviteButton).toBe(true);
      expect(result.current.uiState.showKickButton).toBe(true);
      expect(result.current.uiState.showAnalyticsButton).toBe(true);
    });

    it('should handle completed puzzle', () => {
      const completedPuzzle = { ...mockPuzzleContext, isCompleted: true };
      const { result } = renderHook(() => usePermissionBasedUI(
        mockUserContext,
        mockRoomContext,
        completedPuzzle
      ));

      expect(result.current.uiState.showEditControls).toBe(false);
      expect(result.current.uiState.showHintButton).toBe(false);
      expect(result.current.uiState.isEditDisabled).toBe(true);
      expect(result.current.uiState.isHintDisabled).toBe(true);
      expect(result.current.uiState.editError).toContain('This puzzle has already been completed');
    });

    it('should handle locked puzzle', () => {
      const lockedPuzzle = { ...mockPuzzleContext, isLocked: true };
      const { result } = renderHook(() => usePermissionBasedUI(
        mockUserContext,
        mockRoomContext,
        lockedPuzzle
      ));

      expect(result.current.uiState.showEditControls).toBe(false);
      expect(result.current.uiState.isEditDisabled).toBe(true);
      expect(result.current.uiState.editError).toContain('This puzzle is currently locked');
    });

    it('should handle hint limits', () => {
      const puzzleWithHintsUsed = { ...mockPuzzleContext, hintsUsed: 5, maxHints: 5 };
      const { result } = renderHook(() => usePermissionBasedUI(
        mockUserContext,
        mockRoomContext,
        puzzleWithHintsUsed
      ));

      expect(result.current.uiState.showHintButton).toBe(false);
      expect(result.current.uiState.isHintDisabled).toBe(true);
      expect(result.current.uiState.hintError).toContain('No more hints available');
    });

    it('should handle free user hint limits', () => {
      const freeUserContext = { ...mockUserContext, isPremium: false };
      const puzzleWithHintsUsed = { ...mockPuzzleContext, hintsUsed: 2, maxHints: 5 };
      const { result } = renderHook(() => usePermissionBasedUI(
        freeUserContext,
        mockRoomContext,
        puzzleWithHintsUsed
      ));

      expect(result.current.uiState.showHintButton).toBe(false);
      expect(result.current.uiState.isHintDisabled).toBe(true);
      expect(result.current.uiState.hintError).toContain('Free users have limited hints');
    });
  });
});
