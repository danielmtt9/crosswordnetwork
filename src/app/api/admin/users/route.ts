import { NextRequest, NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/superAdmin";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const skip = (page - 1) * limit;

    // Build where clause with proper Prisma types
    const where: Prisma.UserWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (role) {
      where.role = role;
    }

    // Build orderBy clause with proper Prisma types
    // Validate sortBy is a valid field
    const validSortFields = ['createdAt', 'updatedAt', 'name', 'email', 'role'] as const;
    const validSortOrder = sortOrder === 'asc' || sortOrder === 'desc' ? sortOrder : 'desc';
    
    const orderBy: Prisma.UserOrderByWithRelationInput = {};
    if (validSortFields.includes(sortBy as typeof validSortFields[number])) {
      orderBy[sortBy as typeof validSortFields[number]] = validSortOrder;
    } else {
      orderBy.createdAt = 'desc'; // Default fallback
    }

    // Get users with pagination
    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              userProgress: true,
              hostedRooms: true,
              notifications: true,
              userAchievements: true
            }
          }
        },
        orderBy,
        skip,
        take: limit
      }),
      prisma.user.count({ where })
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage,
        hasPrevPage
      }
    });

  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
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
    const { userId, updates } = body;

    if (!userId || !updates) {
      return NextResponse.json(
        { error: "User ID and updates are required" },
        { status: 400 }
      );
    }

    // Validate updates with proper Prisma types
    const allowedUpdates = ['role'] as const;
    const updateData: Prisma.UserUpdateInput = {};

    for (const [key, value] of Object.entries(updates)) {
      if (allowedUpdates.includes(key as typeof allowedUpdates[number])) {
        // Type-safe assignment
        if (key === 'role') {
          updateData.role = value as string;
        }
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid updates provided" },
        { status: 400 }
      );
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        updatedAt: true
      }
    });

    // Log the admin action
    await prisma.auditLog.create({
      data: {
        action: 'USER_UPDATED',
        entityType: 'USER',
        entityId: userId,
        actorUserId: session.userId,
        details: {
          updates: updateData,
          previousValues: await prisma.user.findUnique({
            where: { id: userId },
            select: updateData
          })
        }
      }
    });

    return NextResponse.json({ user: updatedUser });

  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is super admin only
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { role: true, email: true }
    });

    if (!user || !isSuperAdmin(user.email)) {
      return NextResponse.json({ error: "Forbidden - Super admin required" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Prevent self-deletion
    if (userId === session.userId) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      );
    }

    // Delete user (cascade will handle related records)
    await prisma.user.delete({
      where: { id: userId }
    });

    // Log the admin action
    await prisma.auditLog.create({
      data: {
        action: 'USER_DELETED',
        entityType: 'USER',
        entityId: userId,
        actorUserId: session.userId,
        details: {
          deletedBy: user.email,
          timestamp: new Date().toISOString()
        }
      }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
