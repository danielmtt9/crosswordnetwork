// Mock dependencies
jest.mock("next-auth");
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  },
}));

jest.mock("@/lib/superAdmin", () => ({
  isSuperAdmin: jest.fn(),
}));

import { NextRequest } from "next/server";
import { GET, PATCH, DELETE } from "./route";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/superAdmin";

const mockGetServerSession = getServerSession ;
const mockPrisma = prisma ;
const mockIsSuperAdmin = isSuperAdmin ;

describe("/api/admin/users", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET", () => {
    it("should return 401 if user is not authenticated", async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/admin/users");
      const response = await GET(request);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 403 if user is not admin", async () => {
      mockGetServerSession.mockResolvedValue({
        userId: "user1",
        user: { email: "user@example.com" },
      } as any);

      mockPrisma.user.findUnique.mockResolvedValue({
        role: "FREE",
        email: "user@example.com",
      } as any);

      mockIsSuperAdmin.mockReturnValue(false);

      const request = new NextRequest("http://localhost:3000/api/admin/users");
      const response = await GET(request);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe("Forbidden");
    });

    it("should return users with pagination for admin user", async () => {
      mockGetServerSession.mockResolvedValue({
        userId: "admin1",
        user: { email: "admin@example.com" },
      } as any);

      mockPrisma.user.findUnique.mockResolvedValue({
        role: "ADMIN",
        email: "admin@example.com",
      } as any);

      mockIsSuperAdmin.mockReturnValue(false);

      const mockUsers = [
        {
          id: "user1",
          name: "Test User",
          email: "test@example.com",
          role: "FREE",
          subscriptionStatus: "TRIAL",
          trialEndsAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastLoginAt: new Date(),
          _count: {
            progress: 5,
            hostedRooms: 2,
            notifications: 3,
          },
        },
      ];

      mockPrisma.user.findMany.mockResolvedValue(mockUsers as any);
      mockPrisma.user.count.mockResolvedValue(1);

      const request = new NextRequest("http://localhost:3000/api/admin/users?page=1&limit=20");
      const response = await GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.users).toHaveLength(1);
      expect(data.pagination).toEqual({
        page: 1,
        limit: 20,
        totalCount: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      });
    });

    it("should filter users by search term", async () => {
      mockGetServerSession.mockResolvedValue({
        userId: "admin1",
        user: { email: "admin@example.com" },
      } as any);

      mockPrisma.user.findUnique.mockResolvedValue({
        role: "ADMIN",
        email: "admin@example.com",
      } as any);

      mockIsSuperAdmin.mockReturnValue(false);

      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      const request = new NextRequest("http://localhost:3000/api/admin/users?search=test");
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { name: { contains: "test", mode: "insensitive" } },
              { email: { contains: "test", mode: "insensitive" } },
            ],
          }),
        })
      );
    });
  });

  describe("PATCH", () => {
    it("should return 401 if user is not authenticated", async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/admin/users", {
        method: "PATCH",
        body: JSON.stringify({ userId: "user1", updates: { role: "PREMIUM" } }),
      });
      const response = await PATCH(request);

      expect(response.status).toBe(401);
    });

    it("should update user role successfully", async () => {
      mockGetServerSession.mockResolvedValue({
        userId: "admin1",
        user: { email: "admin@example.com" },
      } as any);

      mockPrisma.user.findUnique
        .mockResolvedValueOnce({
          role: "ADMIN",
          email: "admin@example.com",
        } as any)
        .mockResolvedValueOnce({
          role: "FREE",
          subscriptionStatus: "TRIAL",
          trialEndsAt: null,
        } as any);

      mockIsSuperAdmin.mockReturnValue(false);

      const updatedUser = {
        id: "user1",
        name: "Test User",
        email: "test@example.com",
        role: "PREMIUM",
        subscriptionStatus: "TRIAL",
        trialEndsAt: null,
        updatedAt: new Date(),
      };

      mockPrisma.user.update.mockResolvedValue(updatedUser as any);
      mockPrisma.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest("http://localhost:3000/api/admin/users", {
        method: "PATCH",
        body: JSON.stringify({ userId: "user1", updates: { role: "PREMIUM" } }),
      });
      const response = await PATCH(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.user.role).toBe("PREMIUM");
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });

    it("should return 400 for invalid updates", async () => {
      mockGetServerSession.mockResolvedValue({
        userId: "admin1",
        user: { email: "admin@example.com" },
      } as any);

      mockPrisma.user.findUnique.mockResolvedValue({
        role: "ADMIN",
        email: "admin@example.com",
      } as any);

      mockIsSuperAdmin.mockReturnValue(false);

      const request = new NextRequest("http://localhost:3000/api/admin/users", {
        method: "PATCH",
        body: JSON.stringify({ userId: "user1", updates: { invalidField: "value" } }),
      });
      const response = await PATCH(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("No valid updates provided");
    });
  });

  describe("DELETE", () => {
    it("should return 403 if user is not super admin", async () => {
      mockGetServerSession.mockResolvedValue({
        userId: "admin1",
        user: { email: "admin@example.com" },
      } as any);

      mockPrisma.user.findUnique.mockResolvedValue({
        role: "ADMIN",
        email: "admin@example.com",
      } as any);

      mockIsSuperAdmin.mockReturnValue(false);

      const request = new NextRequest("http://localhost:3000/api/admin/users?userId=user1", {
        method: "DELETE",
      });
      const response = await DELETE(request);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe("Forbidden - Super admin required");
    });

    it("should delete user successfully for super admin", async () => {
      mockGetServerSession.mockResolvedValue({
        userId: "superadmin1",
        user: { email: "superadmin@crossword.network" },
      } as any);

      mockPrisma.user.findUnique.mockResolvedValue({
        role: "ADMIN",
        email: "superadmin@crossword.network",
      } as any);

      mockIsSuperAdmin.mockReturnValue(true);

      mockPrisma.user.delete.mockResolvedValue({} as any);
      mockPrisma.auditLog.create.mockResolvedValue({} as any);

      const request = new NextRequest("http://localhost:3000/api/admin/users?userId=user1", {
        method: "DELETE",
      });
      const response = await DELETE(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(mockPrisma.user.delete).toHaveBeenCalledWith({
        where: { id: "user1" },
      });
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });

    it("should prevent self-deletion", async () => {
      mockGetServerSession.mockResolvedValue({
        userId: "superadmin1",
        user: { email: "superadmin@crossword.network" },
      } as any);

      mockPrisma.user.findUnique.mockResolvedValue({
        role: "ADMIN",
        email: "superadmin@crossword.network",
      } as any);

      mockIsSuperAdmin.mockReturnValue(true);

      const request = new NextRequest("http://localhost:3000/api/admin/users?userId=superadmin1", {
        method: "DELETE",
      });
      const response = await DELETE(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Cannot delete your own account");
    });
  });
});
