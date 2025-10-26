import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/superAdmin";

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalPuzzles: number;
  activeRooms: number;
  monthlyRevenue: number;
  conversionRate: number;
  newUsersThisMonth: number;
  premiumUsers: number;
  trialUsers: number;
  adminUsers: number;
}

export interface UserActivity {
  recentUsers: Array<{
    id: string;
    name: string | null;
    email: string;
    role: string;
    createdAt: Date;
  }>;
  recentProgress: Array<{
    id: string;
    userId: string;
    puzzleId: number;
    completedAt: Date;
    user: {
      name: string | null;
      email: string;
    };
    puzzle: {
      title: string;
    };
  }>;
  auditLogs: Array<{
    id: string;
    action: string;
    entityType: string;
    entityId: string;
    actorUserId: string;
    createdAt: Date;
    details: any;
    actor: {
      name: string | null;
      email: string;
    };
  }>;
}

export interface SystemHealth {
  database: 'healthy' | 'warning' | 'error';
  api: 'healthy' | 'warning' | 'error';
  payments: 'healthy' | 'warning' | 'error';
  email: 'healthy' | 'warning' | 'error';
  diskSpace: number; // percentage
  memoryUsage: number; // percentage
  cpuUsage: number; // percentage
  activeConnections: number;
  responseTime: number; // milliseconds
}

export interface UserListOptions {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface UserListResult {
  users: Array<{
    id: string;
    name: string | null;
    email: string;
    role: string;
    accountStatus: string;
    createdAt: Date;
    updatedAt: Date;
    subscriptionStatus: string | null;
    trialEndsAt: Date | null;
  }>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Get comprehensive admin statistics
 */
export async function getAdminStats(): Promise<AdminStats> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    activeUsers,
    totalPuzzles,
    activeRooms,
    newUsersThisMonth,
    premiumUsers,
    trialUsers,
    adminUsers
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({
      where: {
        updatedAt: {
          gte: thirtyDaysAgo
        }
      }
    }),
    prisma.puzzle.count(),
    prisma.multiplayerRoom.count({
      where: {
        status: 'ACTIVE'
      }
    }),
    prisma.user.count({
      where: {
        createdAt: {
          gte: startOfMonth
        }
      }
    }),
    prisma.user.count({
      where: {
        role: 'PREMIUM'
      }
    }),
    prisma.user.count({
      where: {
        subscriptionStatus: 'TRIAL'
      }
    }),
    prisma.user.count({
      where: {
        role: 'ADMIN'
      }
    })
  ]);

  // Calculate conversion rate (premium users / total users)
  const conversionRate = totalUsers > 0 ? (premiumUsers / totalUsers) * 100 : 0;

  // TODO: Calculate monthly revenue from Stripe integration
  const monthlyRevenue = 0;

  return {
    totalUsers,
    activeUsers,
    totalPuzzles,
    activeRooms,
    monthlyRevenue,
    conversionRate: Math.round(conversionRate * 100) / 100,
    newUsersThisMonth,
    premiumUsers,
    trialUsers,
    adminUsers
  };
}

/**
 * Get user activity data
 */
export async function getUserActivity(): Promise<UserActivity> {
  const [recentUsers, recentProgress, auditLogs] = await Promise.all([
    prisma.user.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      }
    }),
    prisma.userProgress.findMany({
      take: 10,
      where: {
        completedAt: {
          not: null
        }
      },
      orderBy: { completedAt: 'desc' },
      select: {
        id: true,
        userId: true,
        puzzleId: true,
        completedAt: true,
        user: {
          select: {
            name: true,
            email: true
          }
        },
      }
    }),
    prisma.auditLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        actorUserId: true,
        createdAt: true,
        after: true,
        actor: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })
  ]);

  return {
    recentUsers,
    recentProgress,
    auditLogs
  };
}

/**
 * Get system health status
 */
export async function getSystemHealth(): Promise<SystemHealth> {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    const databaseHealth: 'healthy' | 'warning' | 'error' = 'healthy';

    // Get active connections count
  const activeConnections = await prisma.user.count({
    where: {
      updatedAt: {
        gte: new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
      }
    }
  });

    // TODO: Implement real system metrics
    // For now, return mock data
    return {
      database: databaseHealth,
      api: 'healthy',
      payments: 'healthy',
      email: 'healthy',
      diskSpace: 45, // Mock percentage
      memoryUsage: 62, // Mock percentage
      cpuUsage: 23, // Mock percentage
      activeConnections,
      responseTime: 120 // Mock milliseconds
    };
  } catch (error) {
    console.error('System health check failed:', error);
    return {
      database: 'error',
      api: 'error',
      payments: 'error',
      email: 'error',
      diskSpace: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      activeConnections: 0,
      responseTime: 0
    };
  }
}

/**
 * Check if user has admin access
 */
export async function hasAdminAccess(userId: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, email: true }
    });

    if (!user) return false;

    return user.role === 'ADMIN' || isSuperAdmin(user.email);
  } catch (error) {
    console.error('Error checking admin access:', error);
    return false;
  }
}

/**
 * Check if user has super admin access
 */
export async function hasSuperAdminAccess(userId: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true }
    });

    if (!user) return false;

    return isSuperAdmin(user.email);
  } catch (error) {
    console.error('Error checking super admin access:', error);
    return false;
  }
}

/**
 * Update user role with audit logging
 */
export async function updateUserRole(
  userId: string,
  newRole: string,
  actorUserId: string
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, name: true, email: true }
  });

  if (!user) {
    throw new Error('User not found');
  }

  const oldRole = user.role;

  await prisma.user.update({
    where: { id: userId },
    data: { role: newRole as any }
  });

  // Log the role change
  await prisma.auditLog.create({
    data: {
      action: 'ROLE_CHANGED',
      entityType: 'USER',
      entityId: userId,
      actorUserId,
      details: {
        oldRole,
        newRole,
        userName: user.name,
        userEmail: user.email
      }
    }
  });
}

/**
 * Update user subscription status with audit logging
 */
export async function updateUserSubscription(
  userId: string,
  newStatus: string,
  trialEndsAt: Date | null,
  actorUserId: string
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionStatus: true, trialEndsAt: true, name: true, email: true }
  });

  if (!user) {
    throw new Error('User not found');
  }

  const oldStatus = user.subscriptionStatus;
  const oldTrialEndsAt = user.trialEndsAt;

  await prisma.user.update({
    where: { id: userId },
    data: { 
      subscriptionStatus: newStatus as any,
      trialEndsAt
    }
  });

  // Log the subscription change
  await prisma.auditLog.create({
    data: {
      action: 'SUBSCRIPTION_CHANGED',
      entityType: 'USER',
      entityId: userId,
      actorUserId,
      details: {
        oldStatus,
        newStatus,
        oldTrialEndsAt,
        newTrialEndsAt: trialEndsAt,
        userName: user.name,
        userEmail: user.email
      }
    }
  });
}

/**
 * Suspend user account with audit logging
 */
export async function suspendUser(
  userId: string,
  reason: string,
  expiresAt: Date | null,
  actorUserId: string
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, role: true, accountStatus: true }
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Prevent suspension of super admins
  if (isSuperAdmin(user.email)) {
    throw new Error('Cannot suspend super admin user');
  }

  // Prevent self-suspension
  if (userId === actorUserId) {
    throw new Error('Cannot suspend your own account');
  }

  const oldStatus = user.accountStatus;

  await prisma.user.update({
    where: { id: userId },
    data: {
      accountStatus: 'SUSPENDED',
      suspendedAt: new Date(),
      suspendedBy: actorUserId,
      suspensionReason: reason,
      suspensionExpiresAt: expiresAt
    }
  });

  // Log the suspension
  await prisma.auditLog.create({
    data: {
      action: 'USER_SUSPENDED',
      entityType: 'USER',
      entityId: userId,
      actorUserId,
      details: {
        oldStatus,
        newStatus: 'SUSPENDED',
        reason,
        expiresAt,
        suspendedUserName: user.name,
        suspendedUserEmail: user.email
      }
    }
  });
}

/**
 * Unsuspend user account with audit logging
 */
export async function unsuspendUser(
  userId: string,
  actorUserId: string
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, role: true, accountStatus: true }
  });

  if (!user) {
    throw new Error('User not found');
  }

  if (user.accountStatus !== 'SUSPENDED') {
    throw new Error('User is not suspended');
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      accountStatus: 'ACTIVE',
      suspendedAt: null,
      suspendedBy: null,
      suspensionReason: null,
      suspensionExpiresAt: null
    }
  });

  // Log the unsuspension
  await prisma.auditLog.create({
    data: {
      action: 'USER_UNSUSPENDED',
      entityType: 'USER',
      entityId: userId,
      actorUserId,
      details: {
        oldStatus: 'SUSPENDED',
        newStatus: 'ACTIVE',
        unsuspendedUserName: user.name,
        unsuspendedUserEmail: user.email
      }
    }
  });
}

/**
 * Ban user account with audit logging
 */
export async function banUser(
  userId: string,
  reason: string,
  actorUserId: string
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, role: true, accountStatus: true }
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Prevent banning of super admins
  if (isSuperAdmin(user.email)) {
    throw new Error('Cannot ban super admin user');
  }

  // Prevent self-banning
  if (userId === actorUserId) {
    throw new Error('Cannot ban your own account');
  }

  const oldStatus = user.accountStatus;

  await prisma.user.update({
    where: { id: userId },
    data: {
      accountStatus: 'BANNED',
      suspendedAt: new Date(),
      suspendedBy: actorUserId,
      suspensionReason: reason,
      suspensionExpiresAt: null // Permanent ban
    }
  });

  // Log the ban
  await prisma.auditLog.create({
    data: {
      action: 'USER_BANNED',
      entityType: 'USER',
      entityId: userId,
      actorUserId,
      details: {
        oldStatus,
        newStatus: 'BANNED',
        reason,
        bannedUserName: user.name,
        bannedUserEmail: user.email
      }
    }
  });
}

/**
 * Delete user with audit logging
 */
export async function deleteUser(
  userId: string,
  actorUserId: string
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, role: true }
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Prevent deletion of super admins
  if (isSuperAdmin(user.email)) {
    throw new Error('Cannot delete super admin user');
  }

  // Prevent self-deletion
  if (userId === actorUserId) {
    throw new Error('Cannot delete your own account');
  }

  // Delete user (cascade will handle related records)
  await prisma.user.delete({
    where: { id: userId }
  });

  // Log the deletion
  await prisma.auditLog.create({
    data: {
      action: 'USER_DELETED',
      entityType: 'USER',
      entityId: userId,
      actorUserId,
      details: {
        deletedUserName: user.name,
        deletedUserEmail: user.email,
        deletedUserRole: user.role
      }
    }
  });
}

/**
 * Get user details for admin view
 */
export async function getUserDetails(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      subscriptionStatus: true,
      accountStatus: true,
      suspendedAt: true,
      suspendedBy: true,
      suspensionReason: true,
      suspensionExpiresAt: true,
      trialEndsAt: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          progress: true,
          hostedRooms: true,
          roomParticipants: true
        }
      }
    }
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Get recent activity
  const [recentProgress, recentRooms, auditLogs] = await Promise.all([
    prisma.userProgress.findMany({
      where: { userId },
      take: 10,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        puzzleId: true,
        completedAt: true,
        updatedAt: true,
        puzzle: {
          select: {
            title: true,
            difficulty: true
          }
        }
      }
    }),
    prisma.roomParticipant.findMany({
      where: { userId },
      take: 10,
      orderBy: { joinedAt: 'desc' },
      select: {
        id: true,
        role: true,
        joinedAt: true,
        room: {
          select: {
            roomCode: true,
            name: true,
            status: true
          }
        }
      }
    }),
    prisma.auditLog.findMany({
      where: { actorUserId: userId },
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        action: true,
        entityType: true,
        createdAt: true,
        details: true
      }
    })
  ]);

  return {
    user,
    recentProgress,
    recentRooms,
    auditLogs
  };
}

/**
 * Get users for admin management with pagination and filtering
 */
export async function getUsersForAdmin(options: UserListOptions = {}): Promise<UserListResult> {
  const {
    page = 1,
    limit = 10,
    search = '',
    role = '',
    status = '',
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = options;

  const skip = (page - 1) * limit;
  
  // Build where clause
  const where: any = {};
  
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } }
    ];
  }
  
  if (role) {
    where.role = role;
  }
  
  if (status) {
    where.accountStatus = status;
  }

  // Build orderBy clause
  const orderBy: any = {};
  orderBy[sortBy] = sortOrder;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        accountStatus: true,
        createdAt: true,
        updatedAt: true,
        subscriptionStatus: true,
        trialEndsAt: true
      }
    }),
    prisma.user.count({ where })
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    users,
    total,
    page,
    limit,
    totalPages
  };
}