import { prisma } from "@/lib/prisma";

export interface FeatureFlag {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  rolloutPercentage: number;
  targetUsers?: string[];
  targetRoles?: string[];
  conditions?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  version: number;
}

export interface FeatureFlagHistory {
  id: string;
  featureFlagId: string;
  action: string;
  previousState?: any;
  newState?: any;
  actorUserId: string;
  createdAt: Date;
}

export interface SystemConfig {
  id: string;
  key: string;
  value: any;
  description?: string;
  category: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
  updatedBy: string;
}

/**
 * Check if a feature flag is enabled for a specific user
 */
export async function isFeatureEnabled(
  flagName: string,
  userId?: string,
  userRole?: string,
  userEmail?: string
): Promise<boolean> {
  try {
    const flag = await prisma.featureFlag.findUnique({
      where: { name: flagName }
    });

    if (!flag) {
      return false;
    }

    // If flag is globally disabled, return false
    if (!flag.enabled) {
      return false;
    }

    // If no user context, return based on rollout percentage
    if (!userId) {
      return Math.random() * 100 < flag.rolloutPercentage;
    }

    // Check if user is specifically targeted
    if (flag.targetUsers && Array.isArray(flag.targetUsers)) {
      if (flag.targetUsers.includes(userId) || flag.targetUsers.includes(userEmail)) {
        return true;
      }
    }

    // Check if user role is targeted
    if (flag.targetRoles && Array.isArray(flag.targetRoles)) {
      if (userRole && flag.targetRoles.includes(userRole)) {
        return true;
      }
    }

    // Check rollout percentage for non-targeted users
    if (flag.rolloutPercentage > 0) {
      // Use a deterministic hash based on userId for consistent rollout
      const hash = simpleHash(userId + flagName);
      return hash % 100 < flag.rolloutPercentage;
    }

    return false;
  } catch (error) {
    console.error(`Error checking feature flag ${flagName}:`, error);
    return false;
  }
}

/**
 * Get all feature flags for a user (for debugging/admin purposes)
 */
export async function getUserFeatureFlags(
  userId?: string,
  userRole?: string,
  userEmail?: string
): Promise<Record<string, boolean>> {
  try {
    const flags = await prisma.featureFlag.findMany({
      where: { enabled: true }
    });

    const result: Record<string, boolean> = {};

    for (const flag of flags) {
      result[flag.name] = await isFeatureEnabled(flag.name, userId, userRole, userEmail);
    }

    return result;
  } catch (error) {
    console.error('Error getting user feature flags:', error);
    return {};
  }
}

/**
 * Create a new feature flag
 */
export async function createFeatureFlag(
  name: string,
  description: string,
  createdBy: string,
  options: {
    enabled?: boolean;
    rolloutPercentage?: number;
    targetUsers?: string[];
    targetRoles?: string[];
    conditions?: Record<string, any>;
  } = {}
): Promise<FeatureFlag> {
  const flag = await prisma.featureFlag.create({
    data: {
      name,
      description,
      enabled: options.enabled || false,
      rolloutPercentage: options.rolloutPercentage || 0,
      targetUsers: options.targetUsers || null,
      targetRoles: options.targetRoles || null,
      conditions: options.conditions || null,
      createdBy
    }
  });

  // Log the creation
  await prisma.featureFlagHistory.create({
    data: {
      featureFlagId: flag.id,
      action: 'CREATED',
      newState: flag,
      actorUserId: createdBy
    }
  });

  return flag as FeatureFlag;
}

/**
 * Update a feature flag
 */
export async function updateFeatureFlag(
  flagId: string,
  updates: Partial<FeatureFlag>,
  actorUserId: string
): Promise<FeatureFlag> {
  const previousFlag = await prisma.featureFlag.findUnique({
    where: { id: flagId }
  });

  if (!previousFlag) {
    throw new Error('Feature flag not found');
  }

  const updatedFlag = await prisma.featureFlag.update({
    where: { id: flagId },
    data: {
      ...updates,
      version: previousFlag.version + 1,
      updatedAt: new Date()
    }
  });

  // Log the update
  await prisma.featureFlagHistory.create({
    data: {
      featureFlagId: flagId,
      action: 'UPDATED',
      previousState: previousFlag,
      newState: updatedFlag,
      actorUserId
    }
  });

  return updatedFlag as FeatureFlag;
}

/**
 * Toggle a feature flag
 */
export async function toggleFeatureFlag(
  flagId: string,
  actorUserId: string
): Promise<FeatureFlag> {
  const flag = await prisma.featureFlag.findUnique({
    where: { id: flagId }
  });

  if (!flag) {
    throw new Error('Feature flag not found');
  }

  return updateFeatureFlag(flagId, { enabled: !flag.enabled }, actorUserId);
}

/**
 * Rollback a feature flag to a previous version
 */
export async function rollbackFeatureFlag(
  flagId: string,
  historyId: string,
  actorUserId: string
): Promise<FeatureFlag> {
  const history = await prisma.featureFlagHistory.findUnique({
    where: { id: historyId }
  });

  if (!history || history.featureFlagId !== flagId) {
    throw new Error('Feature flag history not found');
  }

  if (!history.previousState) {
    throw new Error('No previous state available for rollback');
  }

  const previousState = history.previousState as FeatureFlag;

  const rolledBackFlag = await prisma.featureFlag.update({
    where: { id: flagId },
    data: {
      ...previousState,
      version: previousState.version + 1,
      updatedAt: new Date()
    }
  });

  // Log the rollback
  await prisma.featureFlagHistory.create({
    data: {
      featureFlagId: flagId,
      action: 'ROLLBACK',
      previousState: rolledBackFlag,
      newState: previousState,
      actorUserId
    }
  });

  return rolledBackFlag as FeatureFlag;
}

/**
 * Get system configuration value
 */
export async function getSystemConfig(key: string): Promise<any> {
  try {
    const config = await prisma.systemConfig.findUnique({
      where: { key }
    });

    return config?.value || null;
  } catch (error) {
    console.error(`Error getting system config ${key}:`, error);
    return null;
  }
}

/**
 * Set system configuration value
 */
export async function setSystemConfig(
  key: string,
  value: any,
  description: string,
  category: string = 'general',
  isPublic: boolean = false,
  updatedBy: string
): Promise<SystemConfig> {
  const config = await prisma.systemConfig.upsert({
    where: { key },
    update: {
      value,
      description,
      category,
      isPublic,
      updatedBy,
      updatedAt: new Date()
    },
    create: {
      key,
      value,
      description,
      category,
      isPublic,
      updatedBy
    }
  });

  return config as SystemConfig;
}

/**
 * Get all system configurations by category
 */
export async function getSystemConfigsByCategory(category: string): Promise<SystemConfig[]> {
  try {
    const configs = await prisma.systemConfig.findMany({
      where: { category },
      orderBy: { key: 'asc' }
    });

    return configs as SystemConfig[];
  } catch (error) {
    console.error(`Error getting system configs for category ${category}:`, error);
    return [];
  }
}

/**
 * Check if maintenance mode is enabled
 */
export async function isMaintenanceMode(): Promise<boolean> {
  const maintenanceMode = await getSystemConfig('maintenance_mode');
  return maintenanceMode === true;
}

/**
 * Set maintenance mode
 */
export async function setMaintenanceMode(
  enabled: boolean,
  message?: string,
  updatedBy: string = 'system'
): Promise<void> {
  await setSystemConfig(
    'maintenance_mode',
    enabled,
    'System maintenance mode',
    'system',
    true,
    updatedBy
  );

  if (message) {
    await setSystemConfig(
      'maintenance_message',
      message,
      'Maintenance mode message',
      'system',
      true,
      updatedBy
    );
  }
}

/**
 * Get maintenance mode message
 */
export async function getMaintenanceMessage(): Promise<string> {
  const message = await getSystemConfig('maintenance_message');
  return message || 'The system is currently under maintenance. Please try again later.';
}

/**
 * Simple hash function for deterministic rollout
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Get feature flag history
 */
export async function getFeatureFlagHistory(
  flagId: string,
  limit: number = 50
): Promise<FeatureFlagHistory[]> {
  try {
    const history = await prisma.featureFlagHistory.findMany({
      where: { featureFlagId: flagId },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    return history as FeatureFlagHistory[];
  } catch (error) {
    console.error(`Error getting feature flag history for ${flagId}:`, error);
    return [];
  }
}

/**
 * Get all feature flags (admin function)
 */
export async function getAllFeatureFlags(): Promise<FeatureFlag[]> {
  try {
    const flags = await prisma.featureFlag.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return flags as FeatureFlag[];
  } catch (error) {
    console.error('Error getting all feature flags:', error);
    return [];
  }
}
