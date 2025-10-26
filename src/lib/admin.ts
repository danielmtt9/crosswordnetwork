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
    const [userCount, roomCount, puzzleCount] = await Promise.all([
      prisma.user.count(),
      prisma.multiplayerRoom.count(),
      prisma.puzzle.count()
    ]);

    return {
      users: userCount,
      rooms: roomCount,
      puzzles: puzzleCount,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error getting admin stats:', error);
    return {
      users: 0,
      rooms: 0,
      puzzles: 0,
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
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'maintenance_mode' }
    });
    return setting?.value === 'true';
  } catch (error) {
    console.error('Error checking maintenance mode:', error);
    return false;
  }
}

export async function setMaintenanceMode(enabled: boolean, message?: string): Promise<boolean> {
  try {
    await prisma.systemSetting.upsert({
      where: { key: 'maintenance_mode' },
      update: { value: enabled.toString() },
      create: { key: 'maintenance_mode', value: enabled.toString() }
    });

    if (message) {
      await prisma.systemSetting.upsert({
        where: { key: 'maintenance_message' },
        update: { value: message },
        create: { key: 'maintenance_message', value: message }
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
    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'maintenance_message' }
    });
    return setting?.value || 'System is under maintenance. Please try again later.';
  } catch (error) {
    console.error('Error getting maintenance message:', error);
    return 'System is under maintenance. Please try again later.';
  }
}

export async function getSystemConfigsByCategory(category: string) {
  try {
    const configs = await prisma.systemSetting.findMany({
      where: { category },
      orderBy: { key: 'asc' }
    });
    return configs;
  } catch (error) {
    console.error('Error getting system configs by category:', error);
    return [];
  }
}

export async function setSystemConfig(key: string, value: string, category?: string) {
  try {
    await prisma.systemSetting.upsert({
      where: { key },
      update: { value, category },
      create: { key, value, category }
    });
    return true;
  } catch (error) {
    console.error('Error setting system config:', error);
    return false;
  }
}

export async function getUserActivity(userId?: string) {
  try {
    const whereClause = userId ? { userId } : {};
    
    const activities = await prisma.userActivity.findMany({
      where: whereClause,
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { timestamp: 'desc' },
      take: 100
    });

    return activities;
  } catch (error) {
    console.error('Error getting user activity:', error);
    return [];
  }
}

export async function getUserDetails(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        _count: {
          select: {
            roomsHosted: true,
            roomsJoined: true,
            achievements: true,
            puzzlesSolved: true
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