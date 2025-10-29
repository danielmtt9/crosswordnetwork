import { prisma } from './prisma';

export type RoomAction = 'EDIT' | 'HOST' | 'MODERATE' | 'SPECTATE' | 'view_room' | 'join_room' | 'leave_room' | 'update_cell' | 'use_hints' | 'send_chat_message' | 'moderate_chat' | 'kick_player' | 'change_role' | 'manage_session' | 'update_room_settings' | 'view_participants' | 'invite_players' | 'request_join';

export interface PermissionContext {
  userId: string;
  roomId: string;
  userRole?: string;
  isHost?: boolean;
}

export function createPermissionContext(
  userId: string,
  roomId: string,
  userRole?: string,
  isHost?: boolean
): PermissionContext {
  return {
    userId,
    roomId,
    userRole,
    isHost
  };
}

export class RoomPermissionManager {
  static async canUserEditRoom(userId: string, roomId: string): Promise<boolean> {
    try {
      const participant = await prisma.roomParticipant.findFirst({
        where: {
          userId,
          roomId,
          role: {
            in: ['HOST', 'PLAYER']
          }
        }
      });

      return !!participant;
    } catch (error) {
      console.error('Error checking room permissions:', error);
      return false;
    }
  }

  static async canUserHostRoom(userId: string, roomId: string): Promise<boolean> {
    try {
      const room = await prisma.multiplayerRoom.findFirst({
        where: {
          id: roomId,
          hostUserId: userId
        }
      });

      return !!room;
    } catch (error) {
      console.error('Error checking host permissions:', error);
      return false;
    }
  }

  static async canUserModerateRoom(userId: string, roomId: string): Promise<boolean> {
    try {
      const participant = await prisma.roomParticipant.findFirst({
        where: {
          userId,
          roomId,
          role: 'HOST'
        }
      });

      return !!participant;
    } catch (error) {
      console.error('Error checking moderation permissions:', error);
      return false;
    }
  }

  static async checkPermission(
    action: RoomAction,
    context: PermissionContext
  ): Promise<boolean> {
    const { userId, roomId, userRole, isHost } = context;

    switch (action) {
      case 'EDIT':
        return this.canUserEditRoom(userId, roomId);
      case 'HOST':
        return this.canUserHostRoom(userId, roomId);
      case 'MODERATE':
        return this.canUserModerateRoom(userId, roomId);
      case 'SPECTATE':
        return true; // Anyone can spectate
      default:
        return false;
    }
  }

  // Sync version for client-side use (no DB calls)
  static canPerformAction(action: RoomAction, context: PermissionContext): boolean {
    const { userRole, isHost } = context;

    switch (action) {
      case 'view_room':
      case 'join_room':
      case 'request_join':
        return true; // Anyone can view/join
      
      case 'leave_room':
      case 'send_chat_message':
      case 'view_participants':
      case 'use_hints':
        return true; // All participants
      
      case 'update_cell':
      case 'invite_players':
        return userRole === 'PLAYER' || userRole === 'HOST';
      
      case 'moderate_chat':
      case 'kick_player':
      case 'change_role':
      case 'manage_session':
      case 'update_room_settings':
        return isHost || userRole === 'HOST';
      
      default:
        return false;
    }
  }

  static validateAction(action: RoomAction, context: PermissionContext): { valid: boolean; reason?: string } {
    const allowed = this.canPerformAction(action, context);
    if (!allowed) {
      return { valid: false, reason: `User role '${context.userRole}' cannot perform action '${action}'` };
    }
    return { valid: true };
  }

  static getActionsForRole(role: string): RoomAction[] {
    switch (role) {
      case 'HOST':
        return [
          'view_room', 'leave_room', 'update_cell', 'use_hints',
          'send_chat_message', 'moderate_chat', 'kick_player',
          'change_role', 'manage_session', 'update_room_settings',
          'view_participants', 'invite_players'
        ];
      case 'PLAYER':
        return [
          'view_room', 'leave_room', 'update_cell', 'use_hints',
          'send_chat_message', 'view_participants', 'invite_players', 'request_join'
        ];
      case 'SPECTATOR':
        return [
          'view_room', 'leave_room', 'use_hints',
          'send_chat_message', 'view_participants', 'request_join'
        ];
      default:
        return ['view_room'];
    }
  }

  static isRoleHigherOrEqual(roleA: string, roleB: string): boolean {
    const hierarchy: Record<string, number> = {
      'HOST': 3,
      'PLAYER': 2,
      'SPECTATOR': 1
    };
    return (hierarchy[roleA] || 0) >= (hierarchy[roleB] || 0);
  }

  static canKickUser(actorRole: string | null, targetRole: string, isActorHost: boolean): boolean {
    if (!actorRole) return false;
    if (!isActorHost && actorRole !== 'HOST') return false;
    return this.isRoleHigherOrEqual(actorRole, targetRole) && actorRole !== targetRole;
  }

  static canChangeRole(actorRole: string | null, targetRole: string, newRole: string, isActorHost: boolean): boolean {
    if (!actorRole) return false;
    if (!isActorHost && actorRole !== 'HOST') return false;
    if (newRole === 'HOST') return false; // Can't promote to HOST
    return this.isRoleHigherOrEqual(actorRole, newRole);
  }
}
