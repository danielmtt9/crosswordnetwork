import { isSuperAdmin, getSuperAdminUsers } from '../superAdmin';
import { prisma } from '../prisma';

// Mock Prisma
jest.mock('../prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('SuperAdmin Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('isSuperAdmin', () => {
    it('should return true for valid super admin user', async () => {
      const mockUser = {
        role: 'ADMIN',
        accountStatus: 'ACTIVE',
        email: 'superadmin@crossword.network',
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);

      const result = await isSuperAdmin('user123');
      
      expect(result).toBe(true);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user123' },
        select: { 
          role: true, 
          accountStatus: true,
          email: true 
        }
      });
    });

    it('should return false for non-admin role', async () => {
      const mockUser = {
        role: 'FREE',
        accountStatus: 'ACTIVE',
        email: 'user@crossword.network',
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);

      const result = await isSuperAdmin('user123');
      
      expect(result).toBe(false);
    });

    it('should return false for inactive account', async () => {
      const mockUser = {
        role: 'ADMIN',
        accountStatus: 'SUSPENDED',
        email: 'superadmin@crossword.network',
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);

      const result = await isSuperAdmin('user123');
      
      expect(result).toBe(false);
    });

    it('should return false for non-crossword.network email', async () => {
      const mockUser = {
        role: 'ADMIN',
        accountStatus: 'ACTIVE',
        email: 'admin@gmail.com',
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);

      const result = await isSuperAdmin('user123');
      
      expect(result).toBe(false);
    });

    it('should return false for null email', async () => {
      const mockUser = {
        role: 'ADMIN',
        accountStatus: 'ACTIVE',
        email: null,
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);

      const result = await isSuperAdmin('user123');
      
      expect(result).toBe(false);
    });

    it('should return false when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await isSuperAdmin('user123');
      
      expect(result).toBe(false);
    });

    it('should return false and log error when database error occurs', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Database error'));

      const result = await isSuperAdmin('user123');
      
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Error checking super admin status:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('getSuperAdminUsers', () => {
    it('should return super admin users', async () => {
      const mockUsers = [
        {
          id: 'user1',
          name: 'Super Admin 1',
          email: 'superadmin1@crossword.network',
          createdAt: new Date('2024-01-01'),
          lastLoginAt: new Date('2024-01-15'),
        },
        {
          id: 'user2',
          name: 'Super Admin 2',
          email: 'superadmin2@crossword.network',
          createdAt: new Date('2024-01-02'),
          lastLoginAt: new Date('2024-01-16'),
        },
      ];

      mockPrisma.user.findMany.mockResolvedValue(mockUsers as any);

      const result = await getSuperAdminUsers();
      
      expect(result).toEqual(mockUsers);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: {
          role: 'ADMIN',
          accountStatus: 'ACTIVE',
          email: {
            endsWith: '@crossword.network'
          }
        },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          lastLoginAt: true
        }
      });
    });

    it('should return empty array when no super admin users found', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);

      const result = await getSuperAdminUsers();
      
      expect(result).toEqual([]);
    });

    it('should return empty array and log error when database error occurs', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockPrisma.user.findMany.mockRejectedValue(new Error('Database error'));

      const result = await getSuperAdminUsers();
      
      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith('Error fetching super admin users:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });
});