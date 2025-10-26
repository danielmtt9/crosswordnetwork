import { prisma } from './prisma';
import { generateUsername } from './usernameGenerator';
import bcrypt from 'bcryptjs';

export interface AdminAccountRequest {
  id: string;
  requestedBy: string;
  requestedFor: {
    email: string;
    name: string;
    role: 'ADMIN' | 'SUPER_ADMIN';
    department?: string;
    justification: string;
  };
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PROVISIONED' | 'DEPROVISIONED';
  createdAt: Date;
  approvedAt?: Date;
  approvedBy?: string;
  provisionedAt?: Date;
  provisionedBy?: string;
  rejectionReason?: string;
  expiresAt?: Date;
}

export interface AdminAccountProvisioning {
  id: string;
  userId: string;
  provisionedBy: string;
  provisionedAt: Date;
  initialRole: string;
  accessLevel: 'READ_ONLY' | 'FULL_ACCESS' | 'RESTRICTED';
  permissions: string[];
  expiresAt?: Date;
  status: 'ACTIVE' | 'SUSPENDED' | 'EXPIRED' | 'DEPROVISIONED';
}

export interface AdminAccountDeprovisioning {
  id: string;
  userId: string;
  deprovisionedBy: string;
  deprovisionedAt: Date;
  reason: string;
  dataRetention: 'DELETE' | 'ANONYMIZE' | 'ARCHIVE';
  backupCreated: boolean;
  accessRevoked: boolean;
}

export class AdminProvisioningManager {
  /**
   * Request admin account provisioning
   */
  static async requestAdminAccount(
    requestedBy: string,
    requestedFor: {
      email: string;
      name: string;
      role: 'ADMIN' | 'SUPER_ADMIN';
      department?: string;
      justification: string;
    },
    expiresInDays: number = 7
  ): Promise<AdminAccountRequest> {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: requestedFor.email }
    });

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Check if there's already a pending request
    const existingRequest = await prisma.auditLog.findFirst({
      where: {
        action: 'ADMIN_ACCOUNT_REQUEST',
        details: {
          path: ['requestedFor', 'email'],
          equals: requestedFor.email
        },
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      }
    });

    if (existingRequest) {
      throw new Error('A pending request for this email already exists');
    }

    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

    // Log the request
    await prisma.auditLog.create({
      data: {
        userId: requestedBy,
        action: 'ADMIN_ACCOUNT_REQUEST',
        resource: 'ADMIN_PROVISIONING',
        details: {
          requestId,
          requestedFor,
          status: 'PENDING',
          expiresAt
        },
        ipAddress: 'system',
        userAgent: 'system'
      }
    });

    // Send notification to super admins
    await this.notifySuperAdmins('ADMIN_ACCOUNT_REQUEST', {
      requestId,
      requestedBy,
      requestedFor,
      expiresAt
    });

    return {
      id: requestId,
      requestedBy,
      requestedFor,
      status: 'PENDING',
      createdAt: new Date(),
      expiresAt
    };
  }

  /**
   * Approve admin account request
   */
  static async approveAdminRequest(
    requestId: string,
    approvedBy: string,
    accessLevel: 'READ_ONLY' | 'FULL_ACCESS' | 'RESTRICTED' = 'FULL_ACCESS',
    permissions: string[] = [],
    expiresAt?: Date
  ): Promise<AdminAccountRequest> {
    // Find the request
    const request = await this.getAdminRequest(requestId);
    
    if (!request) {
      throw new Error('Admin request not found');
    }

    if (request.status !== 'PENDING') {
      throw new Error('Request is not pending');
    }

    if (request.expiresAt && request.expiresAt < new Date()) {
      throw new Error('Request has expired');
    }

    // Update request status
    await prisma.auditLog.create({
      data: {
        userId: approvedBy,
        action: 'ADMIN_ACCOUNT_APPROVED',
        resource: 'ADMIN_PROVISIONING',
        details: {
          requestId,
          approvedBy,
          accessLevel,
          permissions,
          expiresAt
        },
        ipAddress: 'system',
        userAgent: 'system'
      }
    });

    // Send notification to requester
    await this.notifyUser(request.requestedBy, 'ADMIN_ACCOUNT_APPROVED', {
      requestId,
      approvedBy,
      accessLevel
    });

    return {
      ...request,
      status: 'APPROVED',
      approvedAt: new Date(),
      approvedBy
    };
  }

  /**
   * Reject admin account request
   */
  static async rejectAdminRequest(
    requestId: string,
    rejectedBy: string,
    reason: string
  ): Promise<AdminAccountRequest> {
    const request = await this.getAdminRequest(requestId);
    
    if (!request) {
      throw new Error('Admin request not found');
    }

    if (request.status !== 'PENDING') {
      throw new Error('Request is not pending');
    }

    // Log the rejection
    await prisma.auditLog.create({
      data: {
        userId: rejectedBy,
        action: 'ADMIN_ACCOUNT_REJECTED',
        resource: 'ADMIN_PROVISIONING',
        details: {
          requestId,
          rejectedBy,
          reason
        },
        ipAddress: 'system',
        userAgent: 'system'
      }
    });

    // Send notification to requester
    await this.notifyUser(request.requestedBy, 'ADMIN_ACCOUNT_REJECTED', {
      requestId,
      rejectedBy,
      reason
    });

    return {
      ...request,
      status: 'REJECTED',
      rejectionReason: reason
    };
  }

  /**
   * Provision admin account
   */
  static async provisionAdminAccount(
    requestId: string,
    provisionedBy: string,
    temporaryPassword?: string
  ): Promise<{ user: any; provisioning: AdminAccountProvisioning }> {
    const request = await this.getAdminRequest(requestId);
    
    if (!request) {
      throw new Error('Admin request not found');
    }

    if (request.status !== 'APPROVED') {
      throw new Error('Request must be approved before provisioning');
    }

    // Generate username
    const username = await generateUsername(request.requestedFor.name);

    // Generate temporary password if not provided
    const password = temporaryPassword || this.generateTemporaryPassword();

    // Create user account
    const hashedPassword = await bcrypt.hash(password, 12);
    
    const user = await prisma.user.create({
      data: {
        email: request.requestedFor.email,
        name: request.requestedFor.name,
        username,
        password: hashedPassword,
        role: request.requestedFor.role,
        requirePasswordChange: true,
        accountStatus: 'ACTIVE'
      }
    });

    // Create provisioning record
    const provisioningId = `prov_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await prisma.auditLog.create({
      data: {
        userId: provisionedBy,
        action: 'ADMIN_ACCOUNT_PROVISIONED',
        resource: 'ADMIN_PROVISIONING',
        details: {
          requestId,
          provisioningId,
          userId: user.id,
          initialRole: user.role,
          accessLevel: 'FULL_ACCESS',
          permissions: [],
          status: 'ACTIVE'
        },
        ipAddress: 'system',
        userAgent: 'system'
      }
    });

    // Send welcome email with credentials
    await this.sendWelcomeEmail(user.email, {
      name: user.name,
      username: user.username,
      temporaryPassword: password,
      loginUrl: `${process.env.NEXTAUTH_URL}/admin/login`
    });

    // Notify super admins
    await this.notifySuperAdmins('ADMIN_ACCOUNT_PROVISIONED', {
      requestId,
      provisioningId,
      userId: user.id,
      provisionedBy
    });

    const provisioning: AdminAccountProvisioning = {
      id: provisioningId,
      userId: user.id,
      provisionedBy,
      provisionedAt: new Date(),
      initialRole: user.role,
      accessLevel: 'FULL_ACCESS',
      permissions: [],
      status: 'ACTIVE'
    };

    return { user, provisioning };
  }

  /**
   * Deprovision admin account
   */
  static async deprovisionAdminAccount(
    userId: string,
    deprovisionedBy: string,
    reason: string,
    dataRetention: 'DELETE' | 'ANONYMIZE' | 'ARCHIVE' = 'ANONYMIZE'
  ): Promise<AdminAccountDeprovisioning> {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      throw new Error('User is not an admin');
    }

    // Create backup if required
    let backupCreated = false;
    if (dataRetention === 'ARCHIVE') {
      backupCreated = await this.createUserBackup(userId);
    }

    // Revoke all sessions
    await prisma.session.deleteMany({
      where: { userId }
    });

    // Handle data retention
    switch (dataRetention) {
      case 'DELETE':
        await this.deleteUserData(userId);
        break;
      case 'ANONYMIZE':
        await this.anonymizeUserData(userId);
        break;
      case 'ARCHIVE':
        await this.archiveUserData(userId);
        break;
    }

    // Update user status
    await prisma.user.update({
      where: { id: userId },
      data: {
        role: 'FREE',
        accountStatus: 'DELETED',
        email: `deleted_${Date.now()}@crossword.network`,
        name: 'Deleted User',
        username: `deleted_${Date.now()}`,
        password: null,
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: null
      }
    });

    // Log the deprovisioning
    const deprovisioningId = `deprov_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await prisma.auditLog.create({
      data: {
        userId: deprovisionedBy,
        action: 'ADMIN_ACCOUNT_DEPROVISIONED',
        resource: 'ADMIN_PROVISIONING',
        details: {
          deprovisioningId,
          targetUserId: userId,
          reason,
          dataRetention,
          backupCreated
        },
        ipAddress: 'system',
        userAgent: 'system'
      }
    });

    // Notify super admins
    await this.notifySuperAdmins('ADMIN_ACCOUNT_DEPROVISIONED', {
      deprovisioningId,
      userId,
      deprovisionedBy,
      reason
    });

    return {
      id: deprovisioningId,
      userId,
      deprovisionedBy,
      deprovisionedAt: new Date(),
      reason,
      dataRetention,
      backupCreated,
      accessRevoked: true
    };
  }

  /**
   * Get admin request by ID
   */
  private static async getAdminRequest(requestId: string): Promise<AdminAccountRequest | null> {
    const request = await prisma.auditLog.findFirst({
      where: {
        action: 'ADMIN_ACCOUNT_REQUEST',
        details: {
          path: ['requestId'],
          equals: requestId
        }
      }
    });

    if (!request) return null;

    return {
      id: requestId,
      requestedBy: request.userId,
      requestedFor: request.details.requestedFor,
      status: request.details.status,
      createdAt: request.createdAt,
      expiresAt: request.details.expiresAt
    };
  }

  /**
   * Generate temporary password
   */
  private static generateTemporaryPassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  /**
   * Create user backup
   */
  private static async createUserBackup(userId: string): Promise<boolean> {
    try {
      // Implementation would create a backup of user data
      console.log(`Creating backup for user ${userId}`);
      return true;
    } catch (error) {
      console.error('Failed to create user backup:', error);
      return false;
    }
  }

  /**
   * Delete user data
   */
  private static async deleteUserData(userId: string): Promise<void> {
    // Delete user progress, achievements, etc.
    await prisma.userProgress.deleteMany({
      where: { userId }
    });

    await prisma.userStats.deleteMany({
      where: { userId }
    });

    // Delete audit logs (keep for compliance)
    // await prisma.auditLog.deleteMany({
    //   where: { userId }
    // });
  }

  /**
   * Anonymize user data
   */
  private static async anonymizeUserData(userId: string): Promise<void> {
    const anonymizedId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Update user progress with anonymized ID
    await prisma.userProgress.updateMany({
      where: { userId },
      data: { userId: anonymizedId }
    });

    await prisma.userStats.updateMany({
      where: { userId },
      data: { userId: anonymizedId }
    });
  }

  /**
   * Archive user data
   */
  private static async archiveUserData(userId: string): Promise<void> {
    // Implementation would archive user data to cold storage
    console.log(`Archiving data for user ${userId}`);
  }

  /**
   * Send welcome email
   */
  private static async sendWelcomeEmail(email: string, data: any): Promise<void> {
    // Implementation would send welcome email with credentials
    console.log(`Sending welcome email to ${email}:`, data);
  }

  /**
   * Notify super admins
   */
  private static async notifySuperAdmins(event: string, data: any): Promise<void> {
    // Implementation would send notifications to super admins
    console.log(`Notifying super admins about ${event}:`, data);
  }

  /**
   * Notify user
   */
  private static async notifyUser(userId: string, event: string, data: any): Promise<void> {
    // Implementation would send notification to user
    console.log(`Notifying user ${userId} about ${event}:`, data);
  }

  /**
   * Get pending admin requests
   */
  static async getPendingAdminRequests(): Promise<AdminAccountRequest[]> {
    const requests = await prisma.auditLog.findMany({
      where: {
        action: 'ADMIN_ACCOUNT_REQUEST',
        details: {
          path: ['status'],
          equals: 'PENDING'
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return requests.map(request => ({
      id: request.details.requestId,
      requestedBy: request.userId,
      requestedFor: request.details.requestedFor,
      status: request.details.status,
      createdAt: request.createdAt,
      expiresAt: request.details.expiresAt
    }));
  }

  /**
   * Get admin provisioning history
   */
  static async getAdminProvisioningHistory(limit: number = 50): Promise<AdminAccountProvisioning[]> {
    const provisions = await prisma.auditLog.findMany({
      where: {
        action: 'ADMIN_ACCOUNT_PROVISIONED'
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    });

    return provisions.map(provision => ({
      id: provision.details.provisioningId,
      userId: provision.details.userId,
      provisionedBy: provision.userId,
      provisionedAt: provision.createdAt,
      initialRole: provision.details.initialRole,
      accessLevel: provision.details.accessLevel,
      permissions: provision.details.permissions,
      status: provision.details.status
    }));
  }

  /**
   * Get admin deprovisioning history
   */
  static async getAdminDeprovisioningHistory(limit: number = 50): Promise<AdminAccountDeprovisioning[]> {
    const deprovisions = await prisma.auditLog.findMany({
      where: {
        action: 'ADMIN_ACCOUNT_DEPROVISIONED'
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    });

    return deprovisions.map(deprovision => ({
      id: deprovision.details.deprovisioningId,
      userId: deprovision.details.targetUserId,
      deprovisionedBy: deprovision.userId,
      deprovisionedAt: deprovision.createdAt,
      reason: deprovision.details.reason,
      dataRetention: deprovision.details.dataRetention,
      backupCreated: deprovision.details.backupCreated,
      accessRevoked: true
    }));
  }

  /**
   * Check if user can request admin access
   */
  static async canRequestAdminAccess(userId: string): Promise<boolean> {
    // Check if user is already an admin
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') {
      return false;
    }

    // Check if user has made a recent request
    const recentRequest = await prisma.auditLog.findFirst({
      where: {
        userId,
        action: 'ADMIN_ACCOUNT_REQUEST',
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      }
    });

    return !recentRequest;
  }

  /**
   * Get admin account statistics
   */
  static async getAdminAccountStatistics(): Promise<{
    totalAdmins: number;
    activeAdmins: number;
    pendingRequests: number;
    recentProvisionings: number;
    recentDeprovisionings: number;
  }> {
    const totalAdmins = await prisma.user.count({
      where: {
        role: { in: ['ADMIN', 'SUPER_ADMIN'] }
      }
    });

    const activeAdmins = await prisma.user.count({
      where: {
        role: { in: ['ADMIN', 'SUPER_ADMIN'] },
        accountStatus: 'ACTIVE'
      }
    });

    const pendingRequests = await prisma.auditLog.count({
      where: {
        action: 'ADMIN_ACCOUNT_REQUEST',
        details: {
          path: ['status'],
          equals: 'PENDING'
        }
      }
    });

    const recentProvisionings = await prisma.auditLog.count({
      where: {
        action: 'ADMIN_ACCOUNT_PROVISIONED',
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      }
    });

    const recentDeprovisionings = await prisma.auditLog.count({
      where: {
        action: 'ADMIN_ACCOUNT_DEPROVISIONED',
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        }
      }
    });

    return {
      totalAdmins,
      activeAdmins,
      pendingRequests,
      recentProvisionings,
      recentDeprovisionings
    };
  }
}
