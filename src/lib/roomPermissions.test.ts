import { RoomPermissionManager, createPermissionContext } from './roomPermissions';
import { ParticipantRole } from '@prisma/client';

describe('RoomPermissionManager', () => {
  describe('canPerformAction', () => {
    const baseContext = createPermissionContext(
      'PLAYER',
      false,
      true,
      'WAITING',
      false,
      false,
      true
    );

    it('should allow players to view rooms', () => {
      expect(RoomPermissionManager.canPerformAction('view_room', baseContext)).toBe(true);
    });

    it('should allow players to join rooms', () => {
      expect(RoomPermissionManager.canPerformAction('join_room', baseContext)).toBe(true);
    });

    it('should allow players to leave rooms', () => {
      expect(RoomPermissionManager.canPerformAction('leave_room', baseContext)).toBe(true);
    });

    it('should allow players to update cells in active rooms', () => {
      const activeContext = createPermissionContext(
        'PLAYER',
        false,
        true,
        'ACTIVE',
        false,
        false,
        true
      );
      expect(RoomPermissionManager.canPerformAction('update_cell', activeContext)).toBe(true);
    });

    it('should not allow players to update cells in waiting rooms', () => {
      expect(RoomPermissionManager.canPerformAction('update_cell', baseContext)).toBe(false);
    });

    it('should allow players to use hints in active rooms', () => {
      const activeContext = createPermissionContext(
        'PLAYER',
        false,
        true,
        'ACTIVE',
        false,
        false,
        true
      );
      expect(RoomPermissionManager.canPerformAction('use_hints', activeContext)).toBe(true);
    });

    it('should not allow players to use hints in waiting rooms', () => {
      expect(RoomPermissionManager.canPerformAction('use_hints', baseContext)).toBe(false);
    });

    it('should allow players to send messages', () => {
      expect(RoomPermissionManager.canPerformAction('send_message', baseContext)).toBe(true);
    });

    it('should not allow players to kick other players', () => {
      expect(RoomPermissionManager.canPerformAction('kick_player', baseContext)).toBe(false);
    });

    it('should not allow players to change roles', () => {
      expect(RoomPermissionManager.canPerformAction('change_role', baseContext)).toBe(false);
    });

    it('should not allow players to manage sessions', () => {
      expect(RoomPermissionManager.canPerformAction('manage_session', baseContext)).toBe(false);
    });

    it('should not allow players to update room settings', () => {
      expect(RoomPermissionManager.canPerformAction('update_room_settings', baseContext)).toBe(false);
    });

    it('should allow players to view participants', () => {
      expect(RoomPermissionManager.canPerformAction('view_participants', baseContext)).toBe(true);
    });

    it('should allow players to invite other players', () => {
      expect(RoomPermissionManager.canPerformAction('invite_players', baseContext)).toBe(true);
    });

    it('should allow players to request to join rooms', () => {
      expect(RoomPermissionManager.canPerformAction('request_join', baseContext)).toBe(true);
    });
  });

  describe('Host permissions', () => {
    const hostContext = createPermissionContext(
      'HOST',
      true,
      true,
      'WAITING',
      false,
      false,
      true
    );

    it('should allow hosts to kick players', () => {
      expect(RoomPermissionManager.canPerformAction('kick_player', hostContext)).toBe(true);
    });

    it('should allow hosts to change roles', () => {
      expect(RoomPermissionManager.canPerformAction('change_role', hostContext)).toBe(true);
    });

    it('should allow hosts to manage sessions', () => {
      expect(RoomPermissionManager.canPerformAction('manage_session', hostContext)).toBe(true);
    });

    it('should allow hosts to update room settings', () => {
      expect(RoomPermissionManager.canPerformAction('update_room_settings', hostContext)).toBe(true);
    });
  });

  describe('Spectator permissions', () => {
    const spectatorContext = createPermissionContext(
      'SPECTATOR',
      false,
      true,
      'WAITING',
      false,
      false,
      true
    );

    it('should allow spectators to view rooms', () => {
      expect(RoomPermissionManager.canPerformAction('view_room', spectatorContext)).toBe(true);
    });

    it('should allow spectators to send messages', () => {
      expect(RoomPermissionManager.canPerformAction('send_message', spectatorContext)).toBe(true);
    });

    it('should allow spectators to view participants', () => {
      expect(RoomPermissionManager.canPerformAction('view_participants', spectatorContext)).toBe(true);
    });

    it('should not allow spectators to update cells', () => {
      expect(RoomPermissionManager.canPerformAction('update_cell', spectatorContext)).toBe(false);
    });

    it('should not allow spectators to use hints', () => {
      expect(RoomPermissionManager.canPerformAction('use_hints', spectatorContext)).toBe(false);
    });

    it('should not allow spectators to invite players', () => {
      expect(RoomPermissionManager.canPerformAction('invite_players', spectatorContext)).toBe(false);
    });
  });

  describe('Room status restrictions', () => {
    const expiredContext = createPermissionContext(
      'PLAYER',
      false,
      true,
      'EXPIRED',
      false,
      false,
      true
    );

    const completedContext = createPermissionContext(
      'PLAYER',
      false,
      true,
      'COMPLETED',
      false,
      false,
      true
    );

    it('should only allow viewing expired rooms', () => {
      expect(RoomPermissionManager.canPerformAction('view_room', expiredContext)).toBe(true);
      expect(RoomPermissionManager.canPerformAction('update_cell', expiredContext)).toBe(false);
      expect(RoomPermissionManager.canPerformAction('use_hints', expiredContext)).toBe(false);
    });

    it('should allow limited actions in completed rooms', () => {
      expect(RoomPermissionManager.canPerformAction('view_room', completedContext)).toBe(true);
      expect(RoomPermissionManager.canPerformAction('view_participants', completedContext)).toBe(true);
      expect(RoomPermissionManager.canPerformAction('send_message', completedContext)).toBe(true);
      expect(RoomPermissionManager.canPerformAction('update_cell', completedContext)).toBe(false);
    });
  });

  describe('Offline user restrictions', () => {
    const offlineContext = createPermissionContext(
      'PLAYER',
      false,
      false,
      'WAITING',
      false,
      false,
      true
    );

    it('should only allow basic actions for offline users', () => {
      expect(RoomPermissionManager.canPerformAction('view_room', offlineContext)).toBe(true);
      expect(RoomPermissionManager.canPerformAction('join_room', offlineContext)).toBe(true);
      expect(RoomPermissionManager.canPerformAction('update_cell', offlineContext)).toBe(false);
      expect(RoomPermissionManager.canPerformAction('use_hints', offlineContext)).toBe(false);
    });
  });

  describe('canChangeRole', () => {
    it('should allow host to change any role except their own to non-host', () => {
      expect(RoomPermissionManager.canChangeRole('HOST', 'PLAYER', 'SPECTATOR', true)).toBe(true);
      expect(RoomPermissionManager.canChangeRole('HOST', 'SPECTATOR', 'PLAYER', true)).toBe(true);
    });

    it('should not allow non-hosts to change roles', () => {
      expect(RoomPermissionManager.canChangeRole('PLAYER', 'SPECTATOR', 'PLAYER', false)).toBe(false);
      expect(RoomPermissionManager.canChangeRole('SPECTATOR', 'PLAYER', 'SPECTATOR', false)).toBe(false);
    });

    it('should not allow changing role without host status', () => {
      expect(RoomPermissionManager.canChangeRole('HOST', 'PLAYER', 'SPECTATOR', false)).toBe(false);
    });
  });

  describe('canKickUser', () => {
    it('should allow host to kick any user except themselves', () => {
      expect(RoomPermissionManager.canKickUser('HOST', 'PLAYER', true)).toBe(true);
      expect(RoomPermissionManager.canKickUser('HOST', 'SPECTATOR', true)).toBe(true);
    });

    it('should not allow non-hosts to kick users', () => {
      expect(RoomPermissionManager.canKickUser('PLAYER', 'SPECTATOR', false)).toBe(false);
      expect(RoomPermissionManager.canKickUser('SPECTATOR', 'PLAYER', false)).toBe(false);
    });

    it('should not allow kicking without host status', () => {
      expect(RoomPermissionManager.canKickUser('HOST', 'PLAYER', false)).toBe(false);
    });
  });

  describe('getMinimumRoleForAction', () => {
    it('should return correct minimum roles for actions', () => {
      expect(RoomPermissionManager.getMinimumRoleForAction('view_room')).toBe('SPECTATOR');
      expect(RoomPermissionManager.getMinimumRoleForAction('update_cell')).toBe('PLAYER');
      expect(RoomPermissionManager.getMinimumRoleForAction('kick_player')).toBe('HOST');
      expect(RoomPermissionManager.getMinimumRoleForAction('request_join')).toBe(null);
    });
  });

  describe('isRoleHigherOrEqual', () => {
    it('should correctly compare role hierarchy', () => {
      expect(RoomPermissionManager.isRoleHigherOrEqual('HOST', 'PLAYER')).toBe(true);
      expect(RoomPermissionManager.isRoleHigherOrEqual('HOST', 'SPECTATOR')).toBe(true);
      expect(RoomPermissionManager.isRoleHigherOrEqual('PLAYER', 'SPECTATOR')).toBe(true);
      expect(RoomPermissionManager.isRoleHigherOrEqual('PLAYER', 'HOST')).toBe(false);
      expect(RoomPermissionManager.isRoleHigherOrEqual('SPECTATOR', 'HOST')).toBe(false);
      expect(RoomPermissionManager.isRoleHigherOrEqual('HOST', 'HOST')).toBe(true);
    });
  });

  describe('getActionsForRole', () => {
    it('should return correct actions for SPECTATOR role', () => {
      const actions = RoomPermissionManager.getActionsForRole('SPECTATOR');
      expect(actions).toContain('view_room');
      expect(actions).toContain('leave_room');
      expect(actions).toContain('send_message');
      expect(actions).toContain('view_participants');
      expect(actions).not.toContain('update_cell');
      expect(actions).not.toContain('kick_player');
    });

    it('should return correct actions for PLAYER role', () => {
      const actions = RoomPermissionManager.getActionsForRole('PLAYER');
      expect(actions).toContain('view_room');
      expect(actions).toContain('update_cell');
      expect(actions).toContain('use_hints');
      expect(actions).toContain('invite_players');
      expect(actions).not.toContain('kick_player');
      expect(actions).not.toContain('change_role');
    });

    it('should return correct actions for HOST role', () => {
      const actions = RoomPermissionManager.getActionsForRole('HOST');
      expect(actions).toContain('view_room');
      expect(actions).toContain('update_cell');
      expect(actions).toContain('kick_player');
      expect(actions).toContain('change_role');
      expect(actions).toContain('manage_session');
      expect(actions).toContain('update_room_settings');
    });
  });

  describe('validateAction', () => {
    const baseContext = createPermissionContext(
      'PLAYER',
      false,
      true,
      'WAITING',
      false,
      false,
      true
    );

    it('should return allowed for valid actions', () => {
      const result = RoomPermissionManager.validateAction('view_room', baseContext);
      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should return not allowed with reason for invalid actions', () => {
      const result = RoomPermissionManager.validateAction('kick_player', baseContext);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('HOST role or higher');
    });

    it('should return not allowed for offline users', () => {
      const offlineContext = createPermissionContext(
        'PLAYER',
        false,
        false,
        'WAITING',
        false,
        false,
        true
      );
      const result = RoomPermissionManager.validateAction('update_cell', offlineContext);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('offline');
    });

    it('should return not allowed for expired rooms', () => {
      const expiredContext = createPermissionContext(
        'PLAYER',
        false,
        true,
        'EXPIRED',
        false,
        false,
        true
      );
      const result = RoomPermissionManager.validateAction('update_cell', expiredContext);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('expired');
    });
  });
});
