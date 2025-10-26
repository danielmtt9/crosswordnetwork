import { SpectatorPermissionManager, createSpectatorContext } from './spectatorPermissions';
import { ParticipantRole } from '@prisma/client';

describe('SpectatorPermissionManager', () => {
  describe('canEditGrid', () => {
    it('should allow HOST to edit grid when room is active', () => {
      const context = createSpectatorContext('HOST', true, 'ACTIVE', true, true);
      const result = SpectatorPermissionManager.canEditGrid(context);

      expect(result.canEdit).toBe(true);
      expect(result.canUseHints).toBe(true);
      expect(result.canViewHints).toBe(true);
      expect(result.canChat).toBe(true);
      expect(result.canModerate).toBe(true);
    });

    it('should allow PLAYER to edit grid when room is active', () => {
      const context = createSpectatorContext('PLAYER', true, 'ACTIVE', false, true);
      const result = SpectatorPermissionManager.canEditGrid(context);

      expect(result.canEdit).toBe(true);
      expect(result.canUseHints).toBe(true);
      expect(result.canViewHints).toBe(true);
      expect(result.canChat).toBe(true);
      expect(result.canModerate).toBe(false);
    });

    it('should deny SPECTATOR from editing grid', () => {
      const context = createSpectatorContext('SPECTATOR', true, 'ACTIVE', false, true);
      const result = SpectatorPermissionManager.canEditGrid(context);

      expect(result.canEdit).toBe(false);
      expect(result.canUseHints).toBe(false);
      expect(result.canViewHints).toBe(true);
      expect(result.canChat).toBe(true);
      expect(result.canModerate).toBe(false);
      expect(result.reason).toBe('Spectators have view-only access');
    });

    it('should deny free SPECTATOR from chatting', () => {
      const context = createSpectatorContext('SPECTATOR', false, 'ACTIVE', false, true);
      const result = SpectatorPermissionManager.canEditGrid(context);

      expect(result.canEdit).toBe(false);
      expect(result.canUseHints).toBe(false);
      expect(result.canViewHints).toBe(true);
      expect(result.canChat).toBe(false);
      expect(result.canModerate).toBe(false);
    });

    it('should deny editing when user is offline', () => {
      const context = createSpectatorContext('PLAYER', true, 'ACTIVE', false, false);
      const result = SpectatorPermissionManager.canEditGrid(context);

      expect(result.canEdit).toBe(false);
      expect(result.reason).toBe('User is offline');
    });

    it('should deny editing when room is completed', () => {
      const context = createSpectatorContext('PLAYER', true, 'COMPLETED', false, true);
      const result = SpectatorPermissionManager.canEditGrid(context);

      expect(result.canEdit).toBe(false);
      expect(result.canUseHints).toBe(false);
      expect(result.canViewHints).toBe(true);
      expect(result.canChat).toBe(true);
      expect(result.reason).toBe('Room session completed');
    });

    it('should deny editing when room is expired', () => {
      const context = createSpectatorContext('PLAYER', true, 'EXPIRED', false, true);
      const result = SpectatorPermissionManager.canEditGrid(context);

      expect(result.canEdit).toBe(false);
      expect(result.canUseHints).toBe(false);
      expect(result.canViewHints).toBe(true);
      expect(result.canChat).toBe(false);
      expect(result.reason).toBe('Room has expired');
    });
  });

  describe('canUpgradeToPlayer', () => {
    it('should allow premium spectator to upgrade', () => {
      const context = createSpectatorContext('SPECTATOR', true, 'ACTIVE', false, true);
      const result = SpectatorPermissionManager.canUpgradeToPlayer(context);

      expect(result.canUpgrade).toBe(true);
    });

    it('should deny free spectator from upgrading', () => {
      const context = createSpectatorContext('SPECTATOR', false, 'ACTIVE', false, true);
      const result = SpectatorPermissionManager.canUpgradeToPlayer(context);

      expect(result.canUpgrade).toBe(false);
      expect(result.reason).toBe('Premium subscription required to upgrade to player');
    });

    it('should deny non-spectator from upgrading', () => {
      const context = createSpectatorContext('PLAYER', true, 'ACTIVE', false, true);
      const result = SpectatorPermissionManager.canUpgradeToPlayer(context);

      expect(result.canUpgrade).toBe(false);
      expect(result.reason).toBe('User is not a spectator');
    });

    it('should deny upgrade in completed room', () => {
      const context = createSpectatorContext('SPECTATOR', true, 'COMPLETED', false, true);
      const result = SpectatorPermissionManager.canUpgradeToPlayer(context);

      expect(result.canUpgrade).toBe(false);
      expect(result.reason).toBe('Cannot upgrade in completed or expired rooms');
    });

    it('should deny upgrade in expired room', () => {
      const context = createSpectatorContext('SPECTATOR', true, 'EXPIRED', false, true);
      const result = SpectatorPermissionManager.canUpgradeToPlayer(context);

      expect(result.canUpgrade).toBe(false);
      expect(result.reason).toBe('Cannot upgrade in completed or expired rooms');
    });
  });

  describe('canDemoteToSpectator', () => {
    it('should allow host to demote player to spectator', () => {
      const actorContext = createSpectatorContext('HOST', true, 'ACTIVE', true, true);
      const result = SpectatorPermissionManager.canDemoteToSpectator(actorContext, 'PLAYER');

      expect(result.canDemote).toBe(true);
    });

    it('should deny non-host from demoting', () => {
      const actorContext = createSpectatorContext('PLAYER', true, 'ACTIVE', false, true);
      const result = SpectatorPermissionManager.canDemoteToSpectator(actorContext, 'PLAYER');

      expect(result.canDemote).toBe(false);
      expect(result.reason).toBe('Only hosts can change participant roles');
    });

    it('should deny demoting host', () => {
      const actorContext = createSpectatorContext('HOST', true, 'ACTIVE', true, true);
      const result = SpectatorPermissionManager.canDemoteToSpectator(actorContext, 'HOST');

      expect(result.canDemote).toBe(false);
      expect(result.reason).toBe('Cannot demote the host');
    });
  });

  describe('getSpectatorRestrictions', () => {
    it('should return correct restrictions for spectator', () => {
      const context = createSpectatorContext('SPECTATOR', true, 'ACTIVE', false, true);
      const result = SpectatorPermissionManager.getSpectatorRestrictions(context);

      expect(result.showUpgradePrompt).toBe(true);
      expect(result.disableCellEditing).toBe(true);
      expect(result.disableHintUsage).toBe(true);
      expect(result.showSpectatorBadge).toBe(true);
      expect(result.allowChat).toBe(true);
    });

    it('should return correct restrictions for free spectator', () => {
      const context = createSpectatorContext('SPECTATOR', false, 'ACTIVE', false, true);
      const result = SpectatorPermissionManager.getSpectatorRestrictions(context);

      expect(result.showUpgradePrompt).toBe(false);
      expect(result.disableCellEditing).toBe(true);
      expect(result.disableHintUsage).toBe(true);
      expect(result.showSpectatorBadge).toBe(true);
      expect(result.allowChat).toBe(false);
    });

    it('should return correct restrictions for player', () => {
      const context = createSpectatorContext('PLAYER', true, 'ACTIVE', false, true);
      const result = SpectatorPermissionManager.getSpectatorRestrictions(context);

      expect(result.showUpgradePrompt).toBe(false);
      expect(result.disableCellEditing).toBe(false);
      expect(result.disableHintUsage).toBe(false);
      expect(result.showSpectatorBadge).toBe(false);
      expect(result.allowChat).toBe(true);
    });
  });

  describe('getSpectatorIndicators', () => {
    it('should return correct indicators for premium spectator', () => {
      const context = createSpectatorContext('SPECTATOR', true, 'ACTIVE', false, true);
      const result = SpectatorPermissionManager.getSpectatorIndicators(context);

      expect(result.badgeColor).toBe('bg-blue-100 text-blue-800');
      expect(result.badgeText).toBe('Premium Spectator');
      expect(result.icon).toBe('👀');
      expect(result.description).toBe('View-only access with chat privileges');
    });

    it('should return correct indicators for free spectator', () => {
      const context = createSpectatorContext('SPECTATOR', false, 'ACTIVE', false, true);
      const result = SpectatorPermissionManager.getSpectatorIndicators(context);

      expect(result.badgeColor).toBe('bg-gray-100 text-gray-800');
      expect(result.badgeText).toBe('Free Spectator');
      expect(result.icon).toBe('👀');
      expect(result.description).toBe('View-only access, upgrade for chat');
    });

    it('should return correct indicators for player', () => {
      const context = createSpectatorContext('PLAYER', true, 'ACTIVE', false, true);
      const result = SpectatorPermissionManager.getSpectatorIndicators(context);

      expect(result.badgeColor).toBe('bg-green-100 text-green-800');
      expect(result.badgeText).toBe('Player');
      expect(result.icon).toBe('🎮');
      expect(result.description).toBe('Full access to puzzle features');
    });
  });

  describe('canViewHints', () => {
    it('should allow all roles to view hints in active room', () => {
      const spectatorContext = createSpectatorContext('SPECTATOR', true, 'ACTIVE', false, true);
      const playerContext = createSpectatorContext('PLAYER', true, 'ACTIVE', false, true);
      const hostContext = createSpectatorContext('HOST', true, 'ACTIVE', true, true);

      expect(SpectatorPermissionManager.canViewHints(spectatorContext)).toBe(true);
      expect(SpectatorPermissionManager.canViewHints(playerContext)).toBe(true);
      expect(SpectatorPermissionManager.canViewHints(hostContext)).toBe(true);
    });

    it('should deny viewing hints in expired room', () => {
      const context = createSpectatorContext('SPECTATOR', true, 'EXPIRED', false, true);
      const result = SpectatorPermissionManager.canViewHints(context);

      expect(result).toBe(false);
    });
  });

  describe('getSpectatorCountInfo', () => {
    it('should correctly count spectators and players', () => {
      const participants = [
        { role: 'HOST' as ParticipantRole, isOnline: true },
        { role: 'PLAYER' as ParticipantRole, isOnline: true },
        { role: 'PLAYER' as ParticipantRole, isOnline: false },
        { role: 'SPECTATOR' as ParticipantRole, isOnline: true },
        { role: 'SPECTATOR' as ParticipantRole, isOnline: false },
        { role: 'SPECTATOR' as ParticipantRole, isOnline: true },
      ];

      const result = SpectatorPermissionManager.getSpectatorCountInfo(participants);

      expect(result.spectatorCount).toBe(3);
      expect(result.onlineSpectators).toBe(2);
      expect(result.playerCount).toBe(3);
      expect(result.onlinePlayers).toBe(2);
    });

    it('should handle empty participants list', () => {
      const participants: Array<{ role: ParticipantRole; isOnline: boolean }> = [];
      const result = SpectatorPermissionManager.getSpectatorCountInfo(participants);

      expect(result.spectatorCount).toBe(0);
      expect(result.onlineSpectators).toBe(0);
      expect(result.playerCount).toBe(0);
      expect(result.onlinePlayers).toBe(0);
    });
  });
});
