import { prisma } from './prisma';

export interface FeatureFlag {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  rolloutPercentage: number;
  targetUsers?: any;
  targetRoles?: any;
  conditions?: any;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  version: number;
}

export async function getAllFeatureFlags(): Promise<FeatureFlag[]> {
  try {
    return await prisma.featureFlag.findMany({
      orderBy: { createdAt: 'desc' }
    });
  } catch (error) {
    console.error('Error fetching feature flags:', error);
    return [];
  }
}

export async function createFeatureFlag(data: {
  name: string;
  description?: string;
  enabled?: boolean;
  rolloutPercentage?: number;
  targetUsers?: any;
  targetRoles?: any;
  conditions?: any;
  createdBy: string;
}): Promise<FeatureFlag | null> {
  try {
    return await prisma.featureFlag.create({
      data: {
        name: data.name,
        description: data.description,
        enabled: data.enabled || false,
        rolloutPercentage: data.rolloutPercentage || 0,
        targetUsers: data.targetUsers,
        targetRoles: data.targetRoles,
        conditions: data.conditions,
        createdBy: data.createdBy
      }
    });
  } catch (error) {
    console.error('Error creating feature flag:', error);
    return null;
  }
}

export async function updateFeatureFlag(
  id: string,
  data: Partial<FeatureFlag>
): Promise<FeatureFlag | null> {
  try {
    return await prisma.featureFlag.update({
      where: { id },
      data: {
        ...data,
        version: { increment: 1 }
      }
    });
  } catch (error) {
    console.error('Error updating feature flag:', error);
    return null;
  }
}

export async function hasAdminAccess(userId: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, accountStatus: true }
    });

    return user?.role === 'ADMIN' && user?.accountStatus === 'ACTIVE';
  } catch (error) {
    console.error('Error checking admin access:', error);
    return false;
  }
}

export async function getSystemHealth() {
  try {
    // Basic health check
    const dbHealth = await prisma.$queryRaw`SELECT 1 as health`;
    
    return {
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    };
  } catch (error) {
    console.error('Error checking system health:', error);
    return {
      status: 'unhealthy',
      database: 'disconnected',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function banUser(userId: string, reason: string, bannedBy: string): Promise<boolean> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        accountStatus: 'BANNED',
        bannedAt: new Date(),
        banReason: reason,
        bannedBy: bannedBy
      }
    });
    return true;
  } catch (error) {
    console.error('Error banning user:', error);
    return false;
  }
}

export async function getAdminStats() {
  try {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [totalUsers, activeUsers, totalPuzzles, newUsersThisMonth] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: {
          updatedAt: {
            gte: thirtyDaysAgo
          }
        }
      }),
      prisma.puzzle.count(),
      prisma.user.count({
        where: {
          createdAt: {
            gte: firstDayOfMonth
          }
        }
      })
    ]);

    return {
      totalUsers,
      activeUsers,
      totalPuzzles,
      newUsersThisMonth,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error getting admin stats:', error);
    return {
      totalUsers: 0,
      activeUsers: 0,
      totalPuzzles: 0,
      newUsersThisMonth: 0,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function toggleFeatureFlag(id: string): Promise<FeatureFlag | null> {
  try {
    const flag = await prisma.featureFlag.findUnique({ where: { id } });
    if (!flag) return null;

    return await prisma.featureFlag.update({
      where: { id },
      data: {
        enabled: !flag.enabled,
        version: { increment: 1 }
      }
    });
  } catch (error) {
    console.error('Error toggling feature flag:', error);
    return null;
  }
}

export async function rollbackFeatureFlag(id: string): Promise<FeatureFlag | null> {
  try {
    return await prisma.featureFlag.update({
      where: { id },
      data: {
        enabled: false,
        version: { increment: 1 }
      }
    });
  } catch (error) {
    console.error('Error rolling back feature flag:', error);
    return null;
  }
}

export async function getFeatureFlagHistory(id: string) {
  try {
    // This would need a separate history table in a real implementation
    return [];
  } catch (error) {
    console.error('Error getting feature flag history:', error);
    return [];
  }
}

export async function isMaintenanceMode(): Promise<boolean> {
  try {
    const setting = await prisma.systemConfig.findUnique({
      where: { key: 'maintenance_mode' }
    });
    return (setting?.value as string) === 'true';
  } catch (error) {
    console.error('Error checking maintenance mode:', error);
    return false;
  }
}

export async function setMaintenanceMode(enabled: boolean, message?: string, updatedBy: string = 'system'): Promise<boolean> {
  try {
    await prisma.systemConfig.upsert({
      where: { key: 'maintenance_mode' },
      update: { value: enabled.toString() as any, updatedBy },
      create: { key: 'maintenance_mode', value: enabled.toString() as any, updatedBy }
    });

    if (message) {
      await prisma.systemConfig.upsert({
        where: { key: 'maintenance_message' },
        update: { value: message as any, updatedBy },
        create: { key: 'maintenance_message', value: message as any, updatedBy }
      });
    }

    return true;
  } catch (error) {
    console.error('Error setting maintenance mode:', error);
    return false;
  }
}

export async function getMaintenanceMessage(): Promise<string> {
  try {
    const setting = await prisma.systemConfig.findUnique({
      where: { key: 'maintenance_message' }
    });
    return (setting?.value as string) || 'System is under maintenance. Please try again later.';
  } catch (error) {
    console.error('Error getting maintenance message:', error);
    return 'System is under maintenance. Please try again later.';
  }
}

export async function getSystemConfigsByCategory(category: string) {
  try {
    const configs = await prisma.systemConfig.findMany({
      where: { category },
      orderBy: { key: 'asc' }
    });
    return configs;
  } catch (error) {
    console.error('Error getting system configs by category:', error);
    return [];
  }
}

export async function setSystemConfig(key: string, value: string, updatedBy: string, category?: string) {
  try {
    await prisma.systemConfig.upsert({
      where: { key },
      update: { value: value as any, category, updatedBy },
      create: { key, value: value as any, category: category || 'general', updatedBy }
    });
    return true;
  } catch (error) {
    console.error('Error setting system config:', error);
    return false;
  }
}

export async function getUserActivity(userId?: string) {
  try {
    const whereClause = userId ? { actorUserId: userId } : {};
    
    // Get recent users
    const recentUsers = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        role: true,
        accountStatus: true
      }
    });

    // Get recent progress (completed puzzles)
    const recentProgress = await prisma.userProgress.findMany({
      where: {
        completedAt: { not: null }
      },
      orderBy: { completedAt: 'desc' },
      take: 10,
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        puzzle: {
          select: { id: true, title: true, difficulty: true }
        }
      }
    });

    // Get audit logs
    const auditLogs = await prisma.auditLog.findMany({
      where: whereClause,
      include: {
        actor: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    return {
      recentUsers,
      recentProgress,
      auditLogs
    };
  } catch (error) {
    console.error('Error getting user activity:', error);
    return {
      recentUsers: [],
      recentProgress: [],
      auditLogs: []
    };
  }
}

export async function getUserDetails(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        _count: {
          select: {
            hostedRooms: true,
            userProgress: true,
            userAchievements: true,
            notifications: true
          }
        }
      }
    });

    return user;
  } catch (error) {
    console.error('Error getting user details:', error);
    return null;
  }
}

export async function suspendUser(userId: string, reason: string, suspendedBy: string, expiresAt?: Date): Promise<boolean> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        accountStatus: 'SUSPENDED',
        suspendedAt: new Date(),
        suspensionReason: reason,
        suspendedBy: suspendedBy,
        suspensionExpiresAt: expiresAt
      }
    });
    return true;
  } catch (error) {
    console.error('Error suspending user:', error);
    return false;
  }
}

export async function unsuspendUser(userId: string): Promise<boolean> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        accountStatus: 'ACTIVE',
        suspendedAt: null,
        suspensionReason: null,
        suspendedBy: null,
        suspensionExpiresAt: null
      }
    });
    return true;
  } catch (error) {
    console.error('Error unsuspending user:', error);
    return false;
  }
}