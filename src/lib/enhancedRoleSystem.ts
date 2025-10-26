import { ParticipantRole } from '@prisma/client';

export interface UserRoleInfo {
  userId: string;
  isPremium: boolean;
  subscriptionStatus: 'TRIAL' | 'ACTIVE' | 'CANCELLED' | 'EXPIRED';
  trialEndsAt?: Date | null;
  role: ParticipantRole;
  canHost: boolean;
  canCollaborate: boolean;
  canSpectate: boolean;
}

export interface RoomRoleSettings {
  maxCollaborators: number;
  allowSpectators: boolean;
  requirePremiumToHost: boolean;
  allowRoleChanges: boolean;
  defaultRole: ParticipantRole;
}

export interface RolePermission {
  canEditPuzzle: boolean;
  canSendMessages: boolean;
  canModerate: boolean;
  canKickUsers: boolean;
  canChangeRoles: boolean;
  canHost: boolean;
  canInvite: boolean;
}

export class EnhancedRoleSystem {
  private static readonly DEFAULT_ROOM_SETTINGS: RoomRoleSettings = {
    maxCollaborators: 5,
    allowSpectators: true,
    requirePremiumToHost: true,
    allowRoleChanges: true,
    defaultRole: 'SPECTATOR'
  };

  /**
   * Get user role information including premium status
   */
  static async getUserRoleInfo(userId: string): Promise<UserRoleInfo> {
    try {
      const response = await fetch(`/api/user/${userId}/role-info`);
      if (!response.ok) {
        throw new Error('Failed to fetch user role info');
      }
      
      const data = await response.json();
      return {
        userId,
        isPremium: data.isPremium || false,
        subscriptionStatus: data.subscriptionStatus || 'EXPIRED',
        trialEndsAt: data.trialEndsAt ? new Date(data.trialEndsAt) : null,
        role: data.role || 'SPECTATOR',
        canHost: data.canHost || false,
        canCollaborate: data.canCollaborate || false,
        canSpectate: data.canSpectate || true
      };
    } catch (error) {
      console.error('Error fetching user role info:', error);
      // Return default values for free users
      return {
        userId,
        isPremium: false,
        subscriptionStatus: 'EXPIRED',
        trialEndsAt: null,
        role: 'SPECTATOR',
        canHost: false,
        canCollaborate: false,
        canSpectate: true
      };
    }
  }

  /**
   * Check if user can join a room with specific role
   */
  static async canUserJoinAsRole(
    userId: string, 
    roomId: string, 
    desiredRole: ParticipantRole
  ): Promise<{ allowed: boolean; reason?: string }> {
    try {
      const userRoleInfo = await this.getUserRoleInfo(userId);
      
      // Check basic role permissions
      switch (desiredRole) {
        case 'HOST':
          if (!userRoleInfo.canHost) {
            return { 
              allowed: false, 
              reason: 'Premium subscription required to host rooms' 
            };
          }
          break;
        case 'PLAYER':
          if (!userRoleInfo.canCollaborate) {
            return { 
              allowed: false, 
              reason: 'Premium subscription required to collaborate on puzzles' 
            };
          }
          break;
        case 'SPECTATOR':
          if (!userRoleInfo.canSpectate) {
            return { 
              allowed: false, 
              reason: 'Spectator access not available' 
            };
          }
          break;
      }

      // Check room-specific limits
      const roomSettings = await this.getRoomRoleSettings(roomId);
      
      if (desiredRole === 'PLAYER' || desiredRole === 'HOST') {
        const currentCollaborators = await this.getCurrentCollaboratorCount(roomId);
        if (currentCollaborators >= roomSettings.maxCollaborators) {
          return { 
            allowed: false, 
            reason: `Room is at maximum capacity (${roomSettings.maxCollaborators} collaborators)` 
          };
        }
      }

      return { allowed: true };
    } catch (error) {
      console.error('Error checking join permissions:', error);
      return { allowed: false, reason: 'Failed to check permissions' };
    }
  }

  /**
   * Get role-based permissions for a user in a room
   */
  static getRolePermissions(
    userRole: ParticipantRole,
    isHost: boolean,
    isModerator: boolean = false
  ): RolePermission {
    const basePermissions: RolePermission = {
      canEditPuzzle: false,
      canSendMessages: true,
      canModerate: false,
      canKickUsers: false,
      canChangeRoles: false,
      canHost: false,
      canInvite: false
    };

    switch (userRole) {
      case 'HOST':
        return {
          ...basePermissions,
          canEditPuzzle: true,
          canModerate: true,
          canKickUsers: true,
          canChangeRoles: true,
          canHost: true,
          canInvite: true
        };

      case 'PLAYER':
        return {
          ...basePermissions,
          canEditPuzzle: true,
          canInvite: true
        };

      case 'SPECTATOR':
        return {
          ...basePermissions,
          canEditPuzzle: false,
          canSendMessages: true,
          canInvite: false
        };

      case 'MODERATOR':
        return {
          ...basePermissions,
          canEditPuzzle: true,
          canModerate: true,
          canKickUsers: true,
          canChangeRoles: true,
          canInvite: true
        };

      default:
        return basePermissions;
    }
  }

  /**
   * Get room role settings
   */
  static async getRoomRoleSettings(roomId: string): Promise<RoomRoleSettings> {
    try {
      const response = await fetch(`/api/multiplayer/rooms/${roomId}/role-settings`);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('Error fetching room role settings:', error);
    }
    
    return this.DEFAULT_ROOM_SETTINGS;
  }

  /**
   * Get default room settings
   */
  static getDefaultRoomSettings(): RoomRoleSettings {
    return { ...this.DEFAULT_ROOM_SETTINGS };
  }

  /**
   * Get current collaborator count in room
   */
  private static async getCurrentCollaboratorCount(roomId: string): Promise<number> {
    try {
      const response = await fetch(`/api/multiplayer/rooms/${roomId}/collaborator-count`);
      if (response.ok) {
        const data = await response.json();
        return data.count || 0;
      }
    } catch (error) {
      console.error('Error fetching collaborator count:', error);
    }
    
    return 0;
  }

  /**
   * Check if user can upgrade to premium
   */
  static canUpgradeToPremium(userRoleInfo: UserRoleInfo): boolean {
    return !userRoleInfo.isPremium || userRoleInfo.subscriptionStatus === 'EXPIRED';
  }

  /**
   * Get upgrade prompt message for user
   */
  static getUpgradePrompt(userRoleInfo: UserRoleInfo): string {
    if (userRoleInfo.isPremium && userRoleInfo.subscriptionStatus === 'ACTIVE') {
      return '';
    }

    if (userRoleInfo.subscriptionStatus === 'TRIAL' && userRoleInfo.trialEndsAt) {
      const daysLeft = Math.ceil(
        (userRoleInfo.trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      return `Your trial expires in ${daysLeft} days. Upgrade to continue collaborating.`;
    }

    if (userRoleInfo.subscriptionStatus === 'CANCELLED') {
      return 'Your subscription was cancelled. Reactivate to continue collaborating.';
    }

    return 'Upgrade to Premium to collaborate on puzzles and host rooms.';
  }

  /**
   * Validate role change request
   */
  static validateRoleChange(
    currentRole: ParticipantRole,
    newRole: ParticipantRole,
    userRoleInfo: UserRoleInfo,
    roomSettings: RoomRoleSettings
  ): { valid: boolean; reason?: string } {
    // Cannot change to same role
    if (currentRole === newRole) {
      return { valid: false, reason: 'User already has this role' };
    }

    // Check if user can have the new role
    switch (newRole) {
      case 'HOST':
        if (!userRoleInfo.canHost) {
          return { valid: false, reason: 'Premium subscription required to host' };
        }
        break;
      case 'PLAYER':
        if (!userRoleInfo.canCollaborate) {
          return { valid: false, reason: 'Premium subscription required to collaborate' };
        }
        break;
      case 'SPECTATOR':
        // Anyone can be a spectator
        break;
      case 'MODERATOR':
        if (!userRoleInfo.canHost && !userRoleInfo.canCollaborate) {
          return { valid: false, reason: 'Premium subscription required to moderate' };
        }
        break;
    }

    return { valid: true };
  }
}