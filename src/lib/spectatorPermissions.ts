import { ParticipantRole } from '@prisma/client';

export interface SpectatorContext {
  userRole: ParticipantRole;
  isPremium: boolean;
  roomStatus: 'WAITING' | 'ACTIVE' | 'COMPLETED' | 'EXPIRED';
  isHost: boolean;
  isOnline: boolean;
}

export interface GridEditPermission {
  canEdit: boolean;
  canUseHints: boolean;
  canViewHints: boolean;
  canChat: boolean;
  canModerate: boolean;
  reason?: string;
}

/**
 * Spectator-specific permission manager
 * Handles role-based access control for grid editing and other features
 */
export class SpectatorPermissionManager {
  /**
   * Check if a user can edit grid cells based on their role
   */
  static canEditGrid(context: SpectatorContext): GridEditPermission {
    const { userRole, roomStatus, isOnline } = context;

    // Basic checks
    if (!isOnline) {
      return {
        canEdit: false,
        canUseHints: false,
        canViewHints: false,
        canChat: false,
        canModerate: false,
        reason: 'User is offline'
      };
    }

    if (roomStatus === 'EXPIRED') {
      return {
        canEdit: false,
        canUseHints: false,
        canViewHints: true,
        canChat: false,
        canModerate: false,
        reason: 'Room has expired'
      };
    }

    if (roomStatus === 'COMPLETED') {
      return {
        canEdit: false,
        canUseHints: false,
        canViewHints: true,
        canChat: true,
        canModerate: false,
        reason: 'Room session completed'
      };
    }

    // Role-based permissions
    switch (userRole) {
      case 'HOST':
        return {
          canEdit: roomStatus === 'ACTIVE',
          canUseHints: roomStatus === 'ACTIVE',
          canViewHints: true,
          canChat: true,
          canModerate: true,
          reason: roomStatus !== 'ACTIVE' ? 'Session not active' : undefined
        };

      case 'PLAYER':
        return {
          canEdit: roomStatus === 'ACTIVE',
          canUseHints: roomStatus === 'ACTIVE',
          canViewHints: true,
          canChat: true,
          canModerate: false,
          reason: roomStatus !== 'ACTIVE' ? 'Session not active' : undefined
        };

      case 'SPECTATOR':
        return {
          canEdit: false,
          canUseHints: false,
          canViewHints: true,
          canChat: context.isPremium, // Free spectators cannot chat
          canModerate: false,
          reason: 'Spectators have view-only access'
        };

      default:
        return {
          canEdit: false,
          canUseHints: false,
          canViewHints: false,
          canChat: false,
          canModerate: false,
          reason: 'Invalid user role'
        };
    }
  }

  /**
   * Check if a user can upgrade from spectator to player
   */
  static canUpgradeToPlayer(context: SpectatorContext): {
    canUpgrade: boolean;
    reason?: string;
  } {
    const { userRole, roomStatus, isPremium } = context;

    if (userRole !== 'SPECTATOR') {
      return {
        canUpgrade: false,
        reason: 'User is not a spectator'
      };
    }

    if (roomStatus === 'COMPLETED' || roomStatus === 'EXPIRED') {
      return {
        canUpgrade: false,
        reason: 'Cannot upgrade in completed or expired rooms'
      };
    }

    if (!isPremium) {
      return {
        canUpgrade: false,
        reason: 'Premium subscription required to upgrade to player'
      };
    }

    return {
      canUpgrade: true
    };
  }

  /**
   * Check if a user can be demoted to spectator
   */
  static canDemoteToSpectator(
    actorContext: SpectatorContext,
    targetRole: ParticipantRole
  ): {
    canDemote: boolean;
    reason?: string;
  } {
    const { isHost, userRole } = actorContext;

    if (!isHost) {
      return {
        canDemote: false,
        reason: 'Only hosts can change participant roles'
      };
    }

    if (userRole !== 'HOST') {
      return {
        canDemote: false,
        reason: 'Only hosts can demote participants'
      };
    }

    if (targetRole === 'HOST') {
      return {
        canDemote: false,
        reason: 'Cannot demote the host'
      };
    }

    return {
      canDemote: true
    };
  }

  /**
   * Get spectator-specific UI restrictions
   */
  static getSpectatorRestrictions(context: SpectatorContext): {
    showUpgradePrompt: boolean;
    disableCellEditing: boolean;
    disableHintUsage: boolean;
    showSpectatorBadge: boolean;
    allowChat: boolean;
  } {
    const { userRole, isPremium } = context;
    const isSpectator = userRole === 'SPECTATOR';

    return {
      showUpgradePrompt: isSpectator && isPremium,
      disableCellEditing: isSpectator,
      disableHintUsage: isSpectator,
      showSpectatorBadge: isSpectator,
      allowChat: isSpectator ? isPremium : true
    };
  }

  /**
   * Get visual indicators for spectator mode
   */
  static getSpectatorIndicators(context: SpectatorContext): {
    badgeColor: string;
    badgeText: string;
    icon: string;
    description: string;
  } {
    const { userRole, isPremium } = context;

    if (userRole === 'SPECTATOR') {
      return {
        badgeColor: isPremium ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800',
        badgeText: isPremium ? 'Premium Spectator' : 'Free Spectator',
        icon: '👀',
        description: isPremium 
          ? 'View-only access with chat privileges'
          : 'View-only access, upgrade for chat'
      };
    }

    return {
      badgeColor: 'bg-green-100 text-green-800',
      badgeText: 'Player',
      icon: '🎮',
      description: 'Full access to puzzle features'
    };
  }

  /**
   * Check if a spectator can see hint information
   */
  static canViewHints(context: SpectatorContext): boolean {
    const { userRole, roomStatus } = context;

    if (roomStatus === 'EXPIRED') {
      return false;
    }

    // All roles can view hints when they're used
    return ['HOST', 'PLAYER', 'SPECTATOR'].includes(userRole);
  }

  /**
   * Get spectator count display information
   */
  static getSpectatorCountInfo(participants: Array<{
    role: ParticipantRole;
    isOnline: boolean;
  }>): {
    spectatorCount: number;
    onlineSpectators: number;
    playerCount: number;
    onlinePlayers: number;
  } {
    const spectators = participants.filter(p => p.role === 'SPECTATOR');
    const players = participants.filter(p => p.role !== 'SPECTATOR');

    return {
      spectatorCount: spectators.length,
      onlineSpectators: spectators.filter(p => p.isOnline).length,
      playerCount: players.length,
      onlinePlayers: players.filter(p => p.isOnline).length
    };
  }
}

/**
 * Helper function to create spectator context
 */
export function createSpectatorContext(
  userRole: ParticipantRole,
  isPremium: boolean,
  roomStatus: 'WAITING' | 'ACTIVE' | 'COMPLETED' | 'EXPIRED',
  isHost: boolean,
  isOnline: boolean
): SpectatorContext {
  return {
    userRole,
    isPremium,
    roomStatus,
    isHost,
    isOnline
  };
}
