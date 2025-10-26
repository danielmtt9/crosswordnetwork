import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Get user's friends
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { userId: session.userId, status: 'ACCEPTED' },
          { friendId: session.userId, status: 'ACCEPTED' }
        ]
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
            lastActiveAt: true,
          }
        },
        friend: {
          select: {
            id: true,
            name: true,
            image: true,
            lastActiveAt: true,
          }
        }
      }
    });

    // Transform friendships to friends list
    const friends = friendships.map(friendship => {
      const friend = friendship.userId === session.userId ? friendship.friend : friendship.user;
      const isOnline = friend.lastActiveAt ? 
        (new Date().getTime() - new Date(friend.lastActiveAt).getTime()) < 5 * 60 * 1000 : // 5 minutes
        false;

      return {
        id: friend.id,
        name: friend.name || 'Anonymous',
        image: friend.image,
        isOnline,
        lastActiveAt: friend.lastActiveAt,
      };
    });

    return NextResponse.json({ friends });
  } catch (error) {
    console.error("Error fetching friends:", error);
    return NextResponse.json(
      { error: "Failed to fetch friends" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.userId) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { friendId, action } = body;

    if (!friendId || !action) {
      return NextResponse.json(
        { error: "Friend ID and action are required" },
        { status: 400 }
      );
    }

    if (friendId === session.userId) {
      return NextResponse.json(
        { error: "Cannot add yourself as a friend" },
        { status: 400 }
      );
    }

    // Validate that the target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: friendId },
      select: { id: true, name: true }
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    switch (action) {
      case 'send_request':
        // Check if friendship already exists
        const existingFriendship = await prisma.friendship.findFirst({
          where: {
            OR: [
              { userId: session.userId, friendId },
              { userId: friendId, friendId: session.userId }
            ]
          }
        });

        if (existingFriendship) {
          return NextResponse.json(
            { error: "Friendship already exists or request already sent" },
            { status: 400 }
          );
        }

        // Create friendship request
        await prisma.friendship.create({
          data: {
            userId: session.userId,
            friendId,
            status: 'PENDING'
          }
        });

        return NextResponse.json({ success: true, message: "Friend request sent" });

      case 'accept_request':
        // Update friendship status
        const friendship = await prisma.friendship.findFirst({
          where: {
            userId: friendId,
            friendId: session.userId,
            status: 'PENDING'
          }
        });

        if (!friendship) {
          return NextResponse.json(
            { error: "Friend request not found" },
            { status: 404 }
          );
        }

        await prisma.friendship.update({
          where: { id: friendship.id },
          data: { status: 'ACCEPTED' }
        });

        return NextResponse.json({ success: true, message: "Friend request accepted" });

      case 'reject_request':
        // Delete friendship request
        await prisma.friendship.deleteMany({
          where: {
            userId: friendId,
            friendId: session.userId,
            status: 'PENDING'
          }
        });

        return NextResponse.json({ success: true, message: "Friend request rejected" });

      case 'remove_friend':
        // Delete friendship
        await prisma.friendship.deleteMany({
          where: {
            OR: [
              { userId: session.userId, friendId },
              { userId: friendId, friendId: session.userId }
            ],
            status: 'ACCEPTED'
          }
        });

        return NextResponse.json({ success: true, message: "Friend removed" });

      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error managing friendship:", error);
    return NextResponse.json(
      { error: "Failed to manage friendship" },
      { status: 500 }
    );
  }
}