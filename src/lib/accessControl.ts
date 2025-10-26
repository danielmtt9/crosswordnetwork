import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/superAdmin";

export interface AccessLevel {
  level: 'NONE' | 'USER' | 'ADMIN' | 'SUPER_ADMIN';
  permissions: string[];
}

export interface AccessCheckResult {
  hasAccess: boolean;
  level: AccessLevel['level'];
  reason?: string;
}

/**
 * Get user access level and permissions
 */
export async function getUserAccessLevel(userId: string): Promise<AccessLevel> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        role: true, 
        email: true, 
        accountStatus: true,
        subscriptionStatus: true
      }
    });

    if (!user) {
      return {
        level: 'NONE',
        permissions: []
      };
    }

    // Check if account is suspended or banned
    if (user.accountStatus === 'SUSPENDED' || user.accountStatus === 'BANNED') {
      return {
        level: 'NONE',
        permissions: []
      };
    }

    // Super admin has all permissions
    if (isSuperAdmin(user.email)) {
      return {
        level: 'SUPER_ADMIN',
        permissions: [
          'read:all',
          'write:all',
          'delete:all',
          'admin:users',
          'admin:system',
          'admin:audit',
          'admin:settings'
        ]
      };
    }

    // Admin has most permissions
    if (user.role === 'ADMIN') {
      return {
        level: 'ADMIN',
        permissions: [
          'read:all',
          'write:users',
          'delete:users',
          'admin:users',
          'admin:audit'
        ]
      };
    }

    // Premium users have enhanced permissions
    if (user.role === 'PREMIUM' || user.subscriptionStatus === 'ACTIVE') {
      return {
        level: 'USER',
        permissions: [
          'read:own',
          'write:own',
          'create:rooms',
          'join:rooms',
          'upload:puzzles'
        ]
      };
    }

    // Free users have basic permissions
    return {
      level: 'USER',
      permissions: [
        'read:own',
        'write:own',
        'join:rooms'
      ]
    };

  } catch (error) {
    console.error('Error getting user access level:', error);
    return {
      level: 'NONE',
      permissions: []
    };
  }
}

/**
 * Check if user has specific permission
 */
export async function hasPermission(
  userId: string, 
  permission: string
): Promise<AccessCheckResult> {
  try {
    const accessLevel = await getUserAccessLevel(userId);
    
    if (accessLevel.level === 'NONE') {
      return {
        hasAccess: false,
        level: 'NONE',
        reason: 'Account suspended or banned'
      };
    }

    if (accessLevel.level === 'SUPER_ADMIN') {
      return {
        hasAccess: true,
        level: 'SUPER_ADMIN'
      };
    }

    const hasPermission = accessLevel.permissions.includes(permission) || 
                         accessLevel.permissions.includes('read:all') ||
                         accessLevel.permissions.includes('write:all');

    return {
      hasAccess: hasPermission,
      level: accessLevel.level,
      reason: hasPermission ? undefined : 'Insufficient permissions'
    };

  } catch (error) {
    console.error('Error checking permission:', error);
    return {
      hasAccess: false,
      level: 'NONE',
      reason: 'Error checking permissions'
    };
  }
}

/**
 * Check admin access with detailed logging
 */
export async function checkAdminAccess(userId: string): Promise<AccessCheckResult> {
  try {
    const accessLevel = await getUserAccessLevel(userId);
    
    if (accessLevel.level === 'NONE') {
      // Log unauthorized access attempt
      await logAccessAttempt(userId, 'admin_access_denied', 'Account suspended or banned');
      return {
        hasAccess: false,
        level: 'NONE',
        reason: 'Account suspended or banned'
      };
    }

    if (accessLevel.level === 'ADMIN' || accessLevel.level === 'SUPER_ADMIN') {
      // Log successful admin access
      await logAccessAttempt(userId, 'admin_access_granted', `Level: ${accessLevel.level}`);
      return {
        hasAccess: true,
        level: accessLevel.level
      };
    }

    // Log unauthorized access attempt
    await logAccessAttempt(userId, 'admin_access_denied', `Insufficient permissions. Level: ${accessLevel.level}`);
    return {
      hasAccess: false,
      level: accessLevel.level,
      reason: 'Insufficient permissions'
    };

  } catch (error) {
    console.error('Error checking admin access:', error);
    await logAccessAttempt(userId, 'admin_access_error', `Error: ${error.message}`);
    return {
      hasAccess: false,
      level: 'NONE',
      reason: 'Error checking access'
    };
  }
}

/**
 * Log access attempts for audit purposes
 */
async function logAccessAttempt(
  userId: string, 
  action: string, 
  details: string
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorUserId: userId,
        action,
        entityType: 'ACCESS_CONTROL',
        entityId: userId,
        after: JSON.stringify({
          action,
          details,
          timestamp: new Date().toISOString()
        })
      }
    });
  } catch (error) {
    console.error('Error logging access attempt:', error);
  }
}

/**
 * Middleware for API routes to check admin access
 */
export async function requireAdminAccess(userId: string): Promise<AccessCheckResult> {
  const result = await checkAdminAccess(userId);
  
  if (!result.hasAccess) {
    throw new Error(`Access denied: ${result.reason}`);
  }
  
  return result;
}

/**
 * Middleware for API routes to check specific permission
 */
export async function requirePermission(
  userId: string, 
  permission: string
): Promise<AccessCheckResult> {
  const result = await hasPermission(userId, permission);
  
  if (!result.hasAccess) {
    throw new Error(`Permission denied: ${result.reason}`);
  }
  
  return result;
}
