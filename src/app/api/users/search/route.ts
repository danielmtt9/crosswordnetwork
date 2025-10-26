import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ 
        users: [], 
        pagination: { page, limit, total: 0, pages: 0 } 
      });
    }

    const searchTerm = query.trim();

    // Get user's existing friendships to exclude already-friends
    const userFriendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { userId: session.userId },
          { friendId: session.userId }
        ],
        status: { in: ['PENDING', 'ACCEPTED'] }
      },
      select: {
        userId: true,
        friendId: true
      }
    });

    const friendIds = new Set([
      session.userId, // Exclude self
      ...userFriendships.map(f => f.userId),
      ...userFriendships.map(f => f.friendId)
    ]);

    // Search users by name or email
    const users = await prisma.user.findMany({
      where: {
        AND: [
          {
            OR: [
              { name: { contains: searchTerm, mode: 'insensitive' } },
              { email: { contains: searchTerm, mode: 'insensitive' } }
            ]
          },
          {
            id: { notIn: Array.from(friendIds) }
          }
        ]
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        subscriptionStatus: true,
        createdAt: true
      },
      orderBy: [
        { name: 'asc' },
        { email: 'asc' }
      ],
      skip: (page - 1) * limit,
      take: limit
    });

    // Get total count for pagination
    const total = await prisma.user.count({
      where: {
        AND: [
          {
            OR: [
              { name: { contains: searchTerm, mode: 'insensitive' } },
              { email: { contains: searchTerm, mode: 'insensitive' } }
            ]
          },
          {
            id: { notIn: Array.from(friendIds) }
          }
        ]
      }
    });

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error("Error searching users:", error);
    return NextResponse.json(
      { error: "Failed to search users" },
      { status: 500 }
    );
  }
}
