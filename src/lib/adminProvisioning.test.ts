import { AdminProvisioningManager } from './adminProvisioning';
import bcrypt from 'bcryptjs';

// Mock prisma
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
  },
  auditLog: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn()
  },
  session: {
    deleteMany: jest.fn()
  },
  userProgress: {
    deleteMany: jest.fn(),
    updateMany: jest.fn()
  },
  userStats: {
    deleteMany: jest.fn(),
    updateMany: jest.fn()
  }
};

// Mock dependencies
jest.mock('bcryptjs');
jest.mock('./usernameGenerator', () => ({
  generateUsername: jest.fn().mockResolvedValue('testuser123')
}));

jest.mock('./prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn()
    },
    auditLog: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn()
    },
    session: {
      deleteMany: jest.fn()
    },
    userProgress: {
      deleteMany: jest.fn(),
      updateMany: jest.fn()
    },
    userStats: {
      deleteMany: jest.fn(),
      updateMany: jest.fn()
    }
  }
}));

describe('AdminProvisioningManager', () => {
  const mockPrisma = require('./prisma').prisma;
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('requestAdminAccount', () => {
    it('should create admin account request', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.auditLog.findFirst.mockResolvedValue(null);
      mockPrisma.auditLog.create.mockResolvedValue({});

      const requestedFor = {
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'ADMIN' ,
        department: 'IT',
        justification: 'Need admin access for system management'
      };

      const request = await AdminProvisioningManager.requestAdminAccount(
        'requester1',
        requestedFor,
        7
      );

      expect(request.requestedFor).toEqual(requestedFor);
      expect(request.status).toBe('PENDING');
      expect(request.requestedBy).toBe('requester1');
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'requester1',
          action: 'ADMIN_ACCOUNT_REQUEST',
          resource: 'ADMIN_PROVISIONING',
          details: expect.objectContaining({
            requestedFor,
            status: 'PENDING'
          }),
          ipAddress: 'system',
          userAgent: 'system'
        }
      });
    });

    it('should throw error if user already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user1',
        email: 'admin@example.com'
      });

      const requestedFor = {
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'ADMIN' ,
        justification: 'Need admin access'
      };

      await expect(
        AdminProvisioningManager.requestAdminAccount('requester1', requestedFor)
      ).rejects.toThrow('User with this email already exists');
    });

    it('should throw error if pending request exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.auditLog.findFirst.mockResolvedValue({
        id: 'existing-request'
      });

      const requestedFor = {
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'ADMIN' ,
        justification: 'Need admin access'
      };

      await expect(
        AdminProvisioningManager.requestAdminAccount('requester1', requestedFor)
      ).rejects.toThrow('A pending request for this email already exists');
    });
  });

  describe('approveAdminRequest', () => {
    it('should approve admin request', async () => {
      const mockRequest = {
        id: 'request1',
        requestedBy: 'requester1',
        requestedFor: {
          email: 'admin@example.com',
          name: 'Admin User',
          role: 'ADMIN',
          justification: 'Need admin access'
        },
        status: 'PENDING',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000)
      };

      // Mock getAdminRequest method
      jest.spyOn(AdminProvisioningManager as any, 'getAdminRequest').mockResolvedValue(mockRequest);
      mockPrisma.auditLog.create.mockResolvedValue({});

      const approvedRequest = await AdminProvisioningManager.approveAdminRequest(
        'request1',
        'approver1',
        'FULL_ACCESS',
        ['read', 'write']
      );

      expect(approvedRequest.status).toBe('APPROVED');
      expect(approvedRequest.approvedBy).toBe('approver1');
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'approver1',
          action: 'ADMIN_ACCOUNT_APPROVED',
          resource: 'ADMIN_PROVISIONING',
          details: expect.objectContaining({
            requestId: 'request1',
            approvedBy: 'approver1',
            accessLevel: 'FULL_ACCESS',
            permissions: ['read', 'write']
          }),
          ipAddress: 'system',
          userAgent: 'system'
        }
      });
    });

    it('should throw error if request not found', async () => {
      jest.spyOn(AdminProvisioningManager as any, 'getAdminRequest').mockResolvedValue(null);

      await expect(
        AdminProvisioningManager.approveAdminRequest('request1', 'approver1')
      ).rejects.toThrow('Admin request not found');
    });

    it('should throw error if request not pending', async () => {
      const mockRequest = {
        id: 'request1',
        status: 'APPROVED'
      };

      jest.spyOn(AdminProvisioningManager as any, 'getAdminRequest').mockResolvedValue(mockRequest);

      await expect(
        AdminProvisioningManager.approveAdminRequest('request1', 'approver1')
      ).rejects.toThrow('Request is not pending');
    });

    it('should throw error if request expired', async () => {
      const mockRequest = {
        id: 'request1',
        status: 'PENDING',
        expiresAt: new Date(Date.now() - 86400000) // Expired
      };

      jest.spyOn(AdminProvisioningManager as any, 'getAdminRequest').mockResolvedValue(mockRequest);

      await expect(
        AdminProvisioningManager.approveAdminRequest('request1', 'approver1')
      ).rejects.toThrow('Request has expired');
    });
  });

  describe('rejectAdminRequest', () => {
    it('should reject admin request', async () => {
      const mockRequest = {
        id: 'request1',
        requestedBy: 'requester1',
        status: 'PENDING'
      };

      jest.spyOn(AdminProvisioningManager as any, 'getAdminRequest').mockResolvedValue(mockRequest);
      mockPrisma.auditLog.create.mockResolvedValue({});

      const rejectedRequest = await AdminProvisioningManager.rejectAdminRequest(
        'request1',
        'rejecter1',
        'Insufficient justification'
      );

      expect(rejectedRequest.status).toBe('REJECTED');
      expect(rejectedRequest.rejectionReason).toBe('Insufficient justification');
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          userId: 'rejecter1',
          action: 'ADMIN_ACCOUNT_REJECTED',
          resource: 'ADMIN_PROVISIONING',
          details: expect.objectContaining({
            requestId: 'request1',
            rejectedBy: 'rejecter1',
            reason: 'Insufficient justification'
          }),
          ipAddress: 'system',
          userAgent: 'system'
        }
      });
    });
  });

  describe('provisionAdminAccount', () => {
    it('should provision admin account', async () => {
      const mockRequest = {
        id: 'request1',
        status: 'APPROVED',
        requestedFor: {
          email: 'admin@example.com',
          name: 'Admin User',
          role: 'ADMIN'
        }
      };

      const mockUser = {
        id: 'user1',
        email: 'admin@example.com',
        name: 'Admin User',
        username: 'adminuser',
        role: 'ADMIN'
      };

      jest.spyOn(AdminProvisioningManager as any, 'getAdminRequest').mockResolvedValue(mockRequest);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedpassword');
      mockPrisma.user.create.mockResolvedValue(mockUser);
      mockPrisma.auditLog.create.mockResolvedValue({});

      const result = await AdminProvisioningManager.provisionAdminAccount(
        'request1',
        'provisioner1'
      );

      expect(result.user).toEqual(mockUser);
      expect(result.provisioning.userId).toBe('user1');
      expect(result.provisioning.provisionedBy).toBe('provisioner1');
      expect(result.provisioning.status).toBe('ACTIVE');
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'admin@example.com',
          name: 'Admin User',
          role: 'ADMIN',
          requirePasswordChange: true,
          accountStatus: 'ACTIVE'
        })
      });
    });

    it('should throw error if request not approved', async () => {
      const mockRequest = {
        id: 'request1',
        status: 'PENDING'
      };

      jest.spyOn(AdminProvisioningManager as any, 'getAdminRequest').mockResolvedValue(mockRequest);

      await expect(
        AdminProvisioningManager.provisionAdminAccount('request1', 'provisioner1')
      ).rejects.toThrow('Request must be approved before provisioning');
    });
  });

  describe('deprovisionAdminAccount', () => {
    it('should deprovision admin account', async () => {
      const mockUser = {
        id: 'user1',
        role: 'ADMIN'
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.session.deleteMany.mockResolvedValue({ count: 2 });
      mockPrisma.userProgress.deleteMany.mockResolvedValue({ count: 5 });
      mockPrisma.userStats.deleteMany.mockResolvedValue({ count: 1 });
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});

      const deprovisioning = await AdminProvisioningManager.deprovisionAdminAccount(
        'user1',
        'deprovisioner1',
        'No longer needed',
        'ANONYMIZE'
      );

      expect(deprovisioning.userId).toBe('user1');
      expect(deprovisioning.deprovisionedBy).toBe('deprovisioner1');
      expect(deprovisioning.reason).toBe('No longer needed');
      expect(deprovisioning.dataRetention).toBe('ANONYMIZE');
      expect(deprovisioning.accessRevoked).toBe(true);
      expect(mockPrisma.session.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user1' }
      });
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user1' },
        data: expect.objectContaining({
          role: 'FREE',
          accountStatus: 'DELETED'
        })
      });
    });

    it('should throw error if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        AdminProvisioningManager.deprovisionAdminAccount('user1', 'deprovisioner1', 'Reason')
      ).rejects.toThrow('User not found');
    });

    it('should throw error if user is not admin', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user1',
        role: 'FREE'
      });

      await expect(
        AdminProvisioningManager.deprovisionAdminAccount('user1', 'deprovisioner1', 'Reason')
      ).rejects.toThrow('User is not an admin');
    });
  });

  describe('getPendingAdminRequests', () => {
    it('should return pending admin requests', async () => {
      const mockRequests = [
        {
          details: {
            requestId: 'request1',
            requestedFor: {
              email: 'admin@example.com',
              name: 'Admin User',
              role: 'ADMIN',
              justification: 'Need access'
            },
            status: 'PENDING'
          },
          userId: 'requester1',
          createdAt: new Date()
        }
      ];

      mockPrisma.auditLog.findMany.mockResolvedValue(mockRequests);

      const requests = await AdminProvisioningManager.getPendingAdminRequests();

      expect(requests).toHaveLength(1);
      expect(requests[0].id).toBe('request1');
      expect(requests[0].status).toBe('PENDING');
    });
  });

  describe('getAdminProvisioningHistory', () => {
    it('should return admin provisioning history', async () => {
      const mockProvisions = [
        {
          details: {
            provisioningId: 'prov1',
            userId: 'user1',
            initialRole: 'ADMIN',
            accessLevel: 'FULL_ACCESS',
            permissions: [],
            status: 'ACTIVE'
          },
          userId: 'provisioner1',
          createdAt: new Date()
        }
      ];

      mockPrisma.auditLog.findMany.mockResolvedValue(mockProvisions);

      const history = await AdminProvisioningManager.getAdminProvisioningHistory();

      expect(history).toHaveLength(1);
      expect(history[0].id).toBe('prov1');
      expect(history[0].userId).toBe('user1');
      expect(history[0].status).toBe('ACTIVE');
    });
  });

  describe('getAdminDeprovisioningHistory', () => {
    it('should return admin deprovisioning history', async () => {
      const mockDeprovisions = [
        {
          details: {
            deprovisioningId: 'deprov1',
            targetUserId: 'user1',
            reason: 'No longer needed',
            dataRetention: 'ANONYMIZE',
            backupCreated: true
          },
          userId: 'deprovisioner1',
          createdAt: new Date()
        }
      ];

      mockPrisma.auditLog.findMany.mockResolvedValue(mockDeprovisions);

      const history = await AdminProvisioningManager.getAdminDeprovisioningHistory();

      expect(history).toHaveLength(1);
      expect(history[0].id).toBe('deprov1');
      expect(history[0].userId).toBe('user1');
      expect(history[0].reason).toBe('No longer needed');
    });
  });

  describe('canRequestAdminAccess', () => {
    it('should return true if user can request admin access', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user1',
        role: 'FREE'
      });
      mockPrisma.auditLog.findFirst.mockResolvedValue(null);

      const canRequest = await AdminProvisioningManager.canRequestAdminAccess('user1');

      expect(canRequest).toBe(true);
    });

    it('should return false if user is already admin', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user1',
        role: 'ADMIN'
      });

      const canRequest = await AdminProvisioningManager.canRequestAdminAccess('user1');

      expect(canRequest).toBe(false);
    });

    it('should return false if user has recent request', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user1',
        role: 'FREE'
      });
      mockPrisma.auditLog.findFirst.mockResolvedValue({
        id: 'recent-request'
      });

      const canRequest = await AdminProvisioningManager.canRequestAdminAccess('user1');

      expect(canRequest).toBe(false);
    });
  });

  describe('getAdminAccountStatistics', () => {
    it('should return admin account statistics', async () => {
      mockPrisma.user.count
        .mockResolvedValueOnce(10) // totalAdmins
        .mockResolvedValueOnce(8);  // activeAdmins

      mockPrisma.auditLog.count
        .mockResolvedValueOnce(2)   // pendingRequests
        .mockResolvedValueOnce(5)   // recentProvisionings
        .mockResolvedValueOnce(1);  // recentDeprovisionings

      const statistics = await AdminProvisioningManager.getAdminAccountStatistics();

      expect(statistics.totalAdmins).toBe(10);
      expect(statistics.activeAdmins).toBe(8);
      expect(statistics.pendingRequests).toBe(2);
      expect(statistics.recentProvisionings).toBe(5);
      expect(statistics.recentDeprovisionings).toBe(1);
    });
  });

  describe('generateTemporaryPassword', () => {
    it('should generate temporary password', () => {
      const password = (AdminProvisioningManager as any).generateTemporaryPassword();
      
      expect(password).toHaveLength(12);
      expect(typeof password).toBe('string');
    });
  });

  describe('createUserBackup', () => {
    it('should create user backup', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const result = await (AdminProvisioningManager as any).createUserBackup('user1');

      expect(result).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith('Creating backup for user user1');

      consoleSpy.mockRestore();
    });
  });

  describe('deleteUserData', () => {
    it('should delete user data', async () => {
      mockPrisma.userProgress.deleteMany.mockResolvedValue({ count: 5 });
      mockPrisma.userStats.deleteMany.mockResolvedValue({ count: 1 });

      await (AdminProvisioningManager as any).deleteUserData('user1');

      expect(mockPrisma.userProgress.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user1' }
      });
      expect(mockPrisma.userStats.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user1' }
      });
    });
  });

  describe('anonymizeUserData', () => {
    it('should anonymize user data', async () => {
      mockPrisma.userProgress.updateMany.mockResolvedValue({ count: 5 });
      mockPrisma.userStats.updateMany.mockResolvedValue({ count: 1 });

      await (AdminProvisioningManager as any).anonymizeUserData('user1');

      expect(mockPrisma.userProgress.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user1' },
        data: { userId: expect.stringMatching(/^anon_\d+_[a-z0-9]+$/) }
      });
      expect(mockPrisma.userStats.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user1' },
        data: { userId: expect.stringMatching(/^anon_\d+_[a-z0-9]+$/) }
      });
    });
  });

  describe('archiveUserData', () => {
    it('should archive user data', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await (AdminProvisioningManager as any).archiveUserData('user1');

      expect(consoleSpy).toHaveBeenCalledWith('Archiving data for user user1');

      consoleSpy.mockRestore();
    });
  });
});
