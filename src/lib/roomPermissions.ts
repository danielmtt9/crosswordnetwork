import { ParticipantRole } from '@prisma/client';

export type RoomAction = 
  | 'view_room'
  | 'join_room'
  | 'leave_room'
  | 'update_cell'
  | 'use_hints'
  | 'send_message'
  | 'kick_player'
  | 'change_role'
  | 'manage_session'
  | 'update_room_settings'
  | 'view_participants'
  | 'invite_players'
  | 'request_join'
  | 'moderate_chat';

export interface PermissionContext {
  userRole: ParticipantRole | null;
  isHost: boolean;
  isOnline: boolean;
  roomStatus: 'WAITING' | 'ACTIVE' | 'COMPLETED' | 'EXPIRED';
  isPrivate: boolean;
  hasPassword: boolean;
  isPremium: boolean;
}

/**
 * Role hierarchy: HOST > PLAYER > SPECTATOR
 * HOST: Full control over room, can manage all aspects
 * PLAYER: Can play, use hints, send messages, but cannot manage room
 * SPECTATOR: Can only view and send messages, cannot play or use hints
 */
export class RoomPermissionManager {
  private static readonly ROLE_HIERARCHY: Record<ParticipantRole, number> = {
    'HOST': 3,
    'PLAYER': 2,
    'SPECTATOR': 1
  };

  /**
   * Check if a user can perform a specific action
   */
  static canPerformAction(action: RoomAction, context: PermissionContext): boolean {
    const { userRole, isHost, isOnline, roomStatus, isPrivate, hasPassword, isPremium } = context;

    // Basic checks
    if (!userRole || !isOnline) {
      return ['view_room', 'join_room'].includes(action);
    }

    // Room status checks
    if (roomStatus === 'EXPIRED') {
      return ['view_room'].includes(action);
    }

    if (roomStatus === 'COMPLETED') {
      return ['view_room', 'view_participants', 'send_message'].includes(action);
    }

    // Role-based permissions
    switch (action) {
      case 'view_room':
        return true; // Anyone can view room details

      case 'join_room':
        return roomStatus === 'WAITING' && (
          isPremium || 
          (isPrivate && hasPassword) || 
          !isPrivate
        );

      case 'leave_room':
        return true; // Anyone can leave

      case 'update_cell':
        if (userRole === 'SPECTATOR') {
          return false;
        }
        if (roomStatus !== 'ACTIVE') {
          return false;
        }
        return true;

      case 'use_hints':
        if (userRole === 'SPECTATOR') {
          return false;
        }
        if (roomStatus !== 'ACTIVE') {
          return false;
        }
        return true;

      case 'send_message':
        if (userRole === 'SPECTATOR' && !isPremium) {
          return false;
        }
        return true;

      case 'kick_player':
        if (!isHost) {
          return false;
        }
        if (roomStatus === 'COMPLETED' || roomStatus === 'EXPIRED') {
          return false;
        }
        return true;

      case 'change_role':
        if (!isHost) {
          return false;
        }
        if (roomStatus === 'COMPLETED' || roomStatus === 'EXPIRED') {
          return false;
        }
        return true;

      case 'manage_session':
        if (!isHost) {
          return false;
        }
        if (roomStatus === 'COMPLETED') {
          return false;
        }
        return true;

      case 'update_room_settings':
        if (!isHost) {
          return false;
        }
        if (roomStatus === 'ACTIVE') {
          return false;
        }
        return true;

      case 'view_participants':
        return true; // All participants can view others

      case 'invite_players':
        if (!isHost && userRole !== 'PLAYER') {
          return false;
        }
        return true;

      case 'request_join':
        if (roomStatus !== 'WAITING') {
          return false;
        }
        if (isPrivate) {
          return false;
        }
        return true;

      case 'moderate_chat':
        if (!isHost) {
          return false;
        }
        return true;

      default:
        return false;
    }
  }

  /**
   * Check if a user can change another user's role
   */
  static canChangeRole(
    actorRole: ParticipantRole | null,
    targetRole: ParticipantRole,
    newRole: ParticipantRole,
    isActorHost: boolean
  ): boolean {
    if (!actorRole || !isActorHost) {
      return false;
    }

    // Host can change any role except their own to non-host
    if (isActorHost && actorRole === 'HOST') {
      return true;
    }

    return false;
  }

  /**
   * Check if a user can kick another user
   */
  static canKickUser(
    actorRole: ParticipantRole | null,
    targetRole: ParticipantRole,
    isActorHost: boolean
  ): boolean {
    if (!actorRole || !isActorHost) {
      return false;
    }

    // Host can kick anyone except themselves
    if (isActorHost && actorRole === 'HOST') {
      return true;
    }

    return false;
  }

  /**
   * Get the minimum role required for an action
   */
  static getMinimumRoleForAction(action: RoomAction): ParticipantRole | null {
    switch (action) {
      case 'view_room':
      case 'join_room':
      case 'leave_room':
      case 'send_message':
      case 'view_participants':
        return 'SPECTATOR';

      case 'update_cell':
      case 'use_hints':
      case 'invite_players':
        return 'PLAYER';

      case 'kick_player':
      case 'change_role':
      case 'manage_session':
      case 'update_room_settings':
        return 'HOST';

      case 'request_join':
        return null; // No role required, but must not be in room

      default:
        return null;
    }
  }

  /**
   * Check if role A is higher than or equal to role B
   */
  static isRoleHigherOrEqual(roleA: ParticipantRole, roleB: ParticipantRole): boolean {
    return this.ROLE_HIERARCHY[roleA] >= this.ROLE_HIERARCHY[roleB];
  }

  /**
   * Get all actions a role can perform
   */
  static getActionsForRole(role: ParticipantRole): RoomAction[] {
    const actions: RoomAction[] = [
      'view_room',
      'leave_room',
      'send_message',
      'view_participants'
    ];

    if (role === 'PLAYER' || role === 'HOST') {
      actions.push('update_cell', 'use_hints', 'invite_players');
    }

    if (role === 'HOST') {
      actions.push(
        'kick_player',
        'change_role',
        'manage_session',
        'update_room_settings'
      );
    }

    return actions;
  }

  /**
   * Validate room action with detailed error message
   */
  static validateAction(action: RoomAction, context: PermissionContext): {
    allowed: boolean;
    reason?: string;
  } {
    const allowed = this.canPerformAction(action, context);

    if (allowed) {
      return { allowed: true };
    }

    // Provide specific error reasons
    const { userRole, isHost, isOnline, roomStatus } = context;

    if (!userRole) {
      return { allowed: false, reason: 'User is not a participant in this room' };
    }

    if (!isOnline) {
      return { allowed: false, reason: 'User is offline' };
    }

    if (roomStatus === 'EXPIRED') {
      return { allowed: false, reason: 'Room has expired' };
    }

    if (roomStatus === 'COMPLETED') {
      return { allowed: false, reason: 'Room session has completed' };
    }

    const minRole = this.getMinimumRoleForAction(action);
    if (minRole && !this.isRoleHigherOrEqual(userRole, minRole)) {
      return { 
        allowed: false, 
        reason: `This action requires ${minRole} role or higher. Current role: ${userRole}` 
      };
    }

    return { allowed: false, reason: 'Action not allowed' };
  }
}

/**
 * Helper function to create permission context from room and user data
 */
export function createPermissionContext(
  userRole: ParticipantRole | null,
  isHost: boolean,
  isOnline: boolean,
  roomStatus: 'WAITING' | 'ACTIVE' | 'COMPLETED' | 'EXPIRED',
  isPrivate: boolean,
  hasPassword: boolean,
  isPremium: boolean
): PermissionContext {
  return {
    userRole,
    isHost,
    isOnline,
    roomStatus,
    isPrivate,
    hasPassword,
    isPremium
  };
}
