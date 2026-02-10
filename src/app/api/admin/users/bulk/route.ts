import { NextRequest, NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/superAdmin";

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin or super admin
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true, email: true }
    });

    if (!user || (user.role !== 'ADMIN' && !isSuperAdmin(user.email))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { action, userIds, data } = body;

    if (!action || !userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: "Action and user IDs are required" },
        { status: 400 }
      );
    }

    // Prevent bulk operations on super admins
    const superAdminUsers = await prisma.user.findMany({
      where: {
        id: { in: userIds },
        email: { in: ['superadmin@crossword.network'] }
      },
      select: { id: true, email: true }
    });

    if (superAdminUsers.length > 0) {
      return NextResponse.json(
        { error: `Cannot perform bulk operations on super admin users: ${superAdminUsers.map(u => u.email).join(', ')}` },
        { status: 400 }
      );
    }

    // Prevent self-modification in bulk operations
    if (userIds.includes(session.userId)) {
      return NextResponse.json(
        { error: "Cannot perform bulk operations on your own account" },
        { status: 400 }
      );
    }

    let results = [];
    let errors = [];

    switch (action) {
      case 'updateRole':
        if (!data?.role) {
          return NextResponse.json(
            { error: "Role is required for updateRole action" },
            { status: 400 }
          );
        }

        for (const userId of userIds) {
          try {
            const updatedUser = await prisma.user.update({
              where: { id: userId },
              data: { role: data.role },
              select: { id: true, name: true, email: true, role: true }
            });

            // Log the bulk role change
            await prisma.auditLog.create({
              data: {
                action: 'BULK_ROLE_CHANGED',
                entityType: 'USER',
                entityId: userId,
                actorUserId: session.userId,
                details: {
                  newRole: data.role,
                  userName: updatedUser.name,
                  userEmail: updatedUser.email,
                  bulkOperation: true
                }
              }
            });

            results.push({ userId, success: true, data: updatedUser });
          } catch (error) {
            errors.push({ userId, error: error instanceof Error ? error.message : 'Unknown error' });
          }
        }
        break;

      case 'suspend':
        if (!data?.reason) {
          return NextResponse.json(
            { error: "Reason is required for suspend action" },
            { status: 400 }
          );
        }

        for (const userId of userIds) {
          try {
            const expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
            
            const updatedUser = await prisma.user.update({
              where: { id: userId },
              data: {
                accountStatus: 'SUSPENDED',
                suspendedAt: new Date(),
                suspendedBy: session.userId,
                suspensionReason: data.reason,
                suspensionExpiresAt: expiresAt
              },
              select: { id: true, name: true, email: true, accountStatus: true }
            });

            // Log the bulk suspension
            await prisma.auditLog.create({
              data: {
                action: 'BULK_USER_SUSPENDED',
                entityType: 'USER',
                entityId: userId,
                actorUserId: session.userId,
                details: {
                  reason: data.reason,
                  expiresAt: data.expiresAt,
                  userName: updatedUser.name,
                  userEmail: updatedUser.email,
                  bulkOperation: true
                }
              }
            });

            results.push({ userId, success: true, data: updatedUser });
          } catch (error) {
            errors.push({ userId, error: error instanceof Error ? error.message : 'Unknown error' });
          }
        }
        break;

      case 'unsuspend':
        for (const userId of userIds) {
          try {
            const updatedUser = await prisma.user.update({
              where: { id: userId },
              data: {
                accountStatus: 'ACTIVE',
                suspendedAt: null,
                suspendedBy: null,
                suspensionReason: null,
                suspensionExpiresAt: null
              },
              select: { id: true, name: true, email: true, accountStatus: true }
            });

            // Log the bulk unsuspension
            await prisma.auditLog.create({
              data: {
                action: 'BULK_USER_UNSUSPENDED',
                entityType: 'USER',
                entityId: userId,
                actorUserId: session.userId,
                details: {
                  userName: updatedUser.name,
                  userEmail: updatedUser.email,
                  bulkOperation: true
                }
              }
            });

            results.push({ userId, success: true, data: updatedUser });
          } catch (error) {
            errors.push({ userId, error: error instanceof Error ? error.message : 'Unknown error' });
          }
        }
        break;

      case 'delete':
        // Only super admins can perform bulk deletions
        if (!isSuperAdmin(user.email)) {
          return NextResponse.json(
            { error: "Only super admins can perform bulk user deletions" },
            { status: 403 }
          );
        }

        for (const userId of userIds) {
          try {
            const userToDelete = await prisma.user.findUnique({
              where: { id: userId },
              select: { name: true, email: true }
            });

            await prisma.user.delete({
              where: { id: userId }
            });

            // Log the bulk deletion
            await prisma.auditLog.create({
              data: {
                action: 'BULK_USER_DELETED',
                entityType: 'USER',
                entityId: userId,
                actorUserId: session.userId,
                details: {
                  deletedUserName: userToDelete?.name,
                  deletedUserEmail: userToDelete?.email,
                  bulkOperation: true
                }
              }
            });

            results.push({ userId, success: true });
          } catch (error) {
            errors.push({ userId, error: error instanceof Error ? error.message : 'Unknown error' });
          }
        }
        break;

      default:
        return NextResponse.json(
          { error: "Invalid action. Supported actions: updateRole, updateSubscriptionStatus, suspend, unsuspend, delete" },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      results,
      errors,
      summary: {
        total: userIds.length,
        successful: results.length,
        failed: errors.length
      }
    });

  } catch (error) {
    console.error("Error performing bulk user operations:", error);
    return NextResponse.json(
      { error: "Failed to perform bulk operations" },
      { status: 500 }
    );
  }
}
