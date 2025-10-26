import { EnhancedRoleSystem, UserRoleInfo, RoomRoleSettings } from './enhancedRoleSystem';

// Mock fetch
global.fetch = jest.fn();

describe('EnhancedRoleSystem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserRoleInfo', () => {
    it('should return user role info for premium user', async () => {
      const mockResponse = {
        isPremium: true,
        subscriptionStatus: 'ACTIVE',
        trialEndsAt: null,
        role: 'PREMIUM',
        canHost: true,
        canCollaborate: true,
        canSpectate: true
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await EnhancedRoleSystem.getUserRoleInfo('user123');

      expect(result).toEqual({
        userId: 'user123',
        isPremium: true,
        subscriptionStatus: 'ACTIVE',
        trialEndsAt: null,
        role: 'PREMIUM',
        canHost: true,
        canCollaborate: true,
        canSpectate: true
      });
    });

    it('should return default values for free user on error', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await EnhancedRoleSystem.getUserRoleInfo('user123');

      expect(result).toEqual({
        userId: 'user123',
        isPremium: false,
        subscriptionStatus: 'EXPIRED',
        trialEndsAt: null,
        role: 'SPECTATOR',
        canHost: false,
        canCollaborate: false,
        canSpectate: true
      });
    });
  });

  describe('canUserJoinAsRole', () => {
    it('should allow premium user to join as HOST', async () => {
      const userRoleInfo: UserRoleInfo = {
        userId: 'user123',
        isPremium: true,
        subscriptionStatus: 'ACTIVE',
        trialEndsAt: null,
        role: 'PREMIUM',
        canHost: true,
        canCollaborate: true,
        canSpectate: true
      };

      const mockGetUserRoleInfo = jest.spyOn(EnhancedRoleSystem, 'getUserRoleInfo');
      mockGetUserRoleInfo.mockResolvedValueOnce(userRoleInfo);

      const mockGetRoomRoleSettings = jest.spyOn(EnhancedRoleSystem, 'getRoomRoleSettings');
      mockGetRoomRoleSettings.mockResolvedValueOnce({
        maxCollaborators: 5,
        allowSpectators: true,
        requirePremiumToHost: true,
        allowRoleChanges: true,
        defaultRole: 'SPECTATOR'
      });

      const mockGetCurrentCollaboratorCount = jest.spyOn(EnhancedRoleSystem as any, 'getCurrentCollaboratorCount');
      mockGetCurrentCollaboratorCount.mockResolvedValueOnce(2);

      const result = await EnhancedRoleSystem.canUserJoinAsRole('user123', 'room123', 'HOST');

      expect(result).toEqual({ allowed: true });
    });

    it('should deny free user from joining as HOST', async () => {
      const userRoleInfo: UserRoleInfo = {
        userId: 'user123',
        isPremium: false,
        subscriptionStatus: 'EXPIRED',
        trialEndsAt: null,
        role: 'USER',
        canHost: false,
        canCollaborate: false,
        canSpectate: true
      };

      const mockGetUserRoleInfo = jest.spyOn(EnhancedRoleSystem, 'getUserRoleInfo');
      mockGetUserRoleInfo.mockResolvedValueOnce(userRoleInfo);

      const result = await EnhancedRoleSystem.canUserJoinAsRole('user123', 'room123', 'HOST');

      expect(result).toEqual({
        allowed: false,
        reason: 'Premium subscription required to host rooms'
      });
    });

    it('should deny joining when room is at capacity', async () => {
      const userRoleInfo: UserRoleInfo = {
        userId: 'user123',
        isPremium: true,
        subscriptionStatus: 'ACTIVE',
        trialEndsAt: null,
        role: 'PREMIUM',
        canHost: true,
        canCollaborate: true,
        canSpectate: true
      };

      const mockGetUserRoleInfo = jest.spyOn(EnhancedRoleSystem, 'getUserRoleInfo');
      mockGetUserRoleInfo.mockResolvedValueOnce(userRoleInfo);

      const mockGetRoomRoleSettings = jest.spyOn(EnhancedRoleSystem, 'getRoomRoleSettings');
      mockGetRoomRoleSettings.mockResolvedValueOnce({
        maxCollaborators: 3,
        allowSpectators: true,
        requirePremiumToHost: true,
        allowRoleChanges: true,
        defaultRole: 'SPECTATOR'
      });

      const mockGetCurrentCollaboratorCount = jest.spyOn(EnhancedRoleSystem as any, 'getCurrentCollaboratorCount');
      mockGetCurrentCollaboratorCount.mockResolvedValueOnce(3);

      const result = await EnhancedRoleSystem.canUserJoinAsRole('user123', 'room123', 'PLAYER');

      expect(result).toEqual({
        allowed: false,
        reason: 'Room is at maximum capacity (3 collaborators)'
      });
    });
  });

  describe('getRolePermissions', () => {
    it('should return correct permissions for HOST role', () => {
      const permissions = EnhancedRoleSystem.getRolePermissions('HOST', true);

      expect(permissions).toEqual({
        canEditPuzzle: true,
        canSendMessages: true,
        canModerate: true,
        canKickUsers: true,
        canChangeRoles: true,
        canHost: true,
        canInvite: true
      });
    });

    it('should return correct permissions for PLAYER role', () => {
      const permissions = EnhancedRoleSystem.getRolePermissions('PLAYER', false);

      expect(permissions).toEqual({
        canEditPuzzle: true,
        canSendMessages: true,
        canModerate: false,
        canKickUsers: false,
        canChangeRoles: false,
        canHost: false,
        canInvite: true
      });
    });

    it('should return correct permissions for SPECTATOR role', () => {
      const permissions = EnhancedRoleSystem.getRolePermissions('SPECTATOR', false);

      expect(permissions).toEqual({
        canEditPuzzle: false,
        canSendMessages: true,
        canModerate: false,
        canKickUsers: false,
        canChangeRoles: false,
        canHost: false,
        canInvite: false
      });
    });
  });

  describe('getUpgradePrompt', () => {
    it('should return empty string for active premium user', () => {
      const userRoleInfo: UserRoleInfo = {
        userId: 'user123',
        isPremium: true,
        subscriptionStatus: 'ACTIVE',
        trialEndsAt: null,
        role: 'PREMIUM',
        canHost: true,
        canCollaborate: true,
        canSpectate: true
      };

      const prompt = EnhancedRoleSystem.getUpgradePrompt(userRoleInfo);
      expect(prompt).toBe('');
    });

    it('should return trial expiration message', () => {
      const trialEndsAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days from now
      const userRoleInfo: UserRoleInfo = {
        userId: 'user123',
        isPremium: true,
        subscriptionStatus: 'TRIAL',
        trialEndsAt,
        role: 'PREMIUM',
        canHost: true,
        canCollaborate: true,
        canSpectate: true
      };

      const prompt = EnhancedRoleSystem.getUpgradePrompt(userRoleInfo);
      expect(prompt).toContain('Your trial expires in 3 days');
    });

    it('should return upgrade message for free user', () => {
      const userRoleInfo: UserRoleInfo = {
        userId: 'user123',
        isPremium: false,
        subscriptionStatus: 'EXPIRED',
        trialEndsAt: null,
        role: 'USER',
        canHost: false,
        canCollaborate: false,
        canSpectate: true
      };

      const prompt = EnhancedRoleSystem.getUpgradePrompt(userRoleInfo);
      expect(prompt).toBe('Upgrade to Premium to collaborate on puzzles and host rooms.');
    });
  });

  describe('validateRoleChange', () => {
    const roomSettings: RoomRoleSettings = {
      maxCollaborators: 5,
      allowSpectators: true,
      requirePremiumToHost: true,
      allowRoleChanges: true,
      defaultRole: 'SPECTATOR'
    };

    it('should allow valid role change', () => {
      const userRoleInfo: UserRoleInfo = {
        userId: 'user123',
        isPremium: true,
        subscriptionStatus: 'ACTIVE',
        trialEndsAt: null,
        role: 'PREMIUM',
        canHost: true,
        canCollaborate: true,
        canSpectate: true
      };

      const result = EnhancedRoleSystem.validateRoleChange(
        'SPECTATOR',
        'PLAYER',
        userRoleInfo,
        roomSettings
      );

      expect(result).toEqual({ valid: true });
    });

    it('should deny role change to same role', () => {
      const userRoleInfo: UserRoleInfo = {
        userId: 'user123',
        isPremium: true,
        subscriptionStatus: 'ACTIVE',
        trialEndsAt: null,
        role: 'PREMIUM',
        canHost: true,
        canCollaborate: true,
        canSpectate: true
      };

      const result = EnhancedRoleSystem.validateRoleChange(
        'PLAYER',
        'PLAYER',
        userRoleInfo,
        roomSettings
      );

      expect(result).toEqual({
        valid: false,
        reason: 'User already has this role'
      });
    });

    it('should deny HOST role for non-premium user', () => {
      const userRoleInfo: UserRoleInfo = {
        userId: 'user123',
        isPremium: false,
        subscriptionStatus: 'EXPIRED',
        trialEndsAt: null,
        role: 'USER',
        canHost: false,
        canCollaborate: false,
        canSpectate: true
      };

      const result = EnhancedRoleSystem.validateRoleChange(
        'SPECTATOR',
        'HOST',
        userRoleInfo,
        roomSettings
      );

      expect(result).toEqual({
        valid: false,
        reason: 'Premium subscription required to host'
      });
    });
  });
});
