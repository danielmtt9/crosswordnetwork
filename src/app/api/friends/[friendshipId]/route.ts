import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ friendshipId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const friendshipId = resolvedParams.friendshipId;

    const body = await request.json();
    const { action } = body;

    const friendship = await prisma.friendship.findFirst({
      where: {
        id: friendshipId,
        OR: [
          { userId: session.userId },
          { friendId: session.userId }
        ]
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        },
        friend: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        }
      }
    });

    if (!friendship) {
      return NextResponse.json({ error: "Friendship not found" }, { status: 404 });
    }

    if (action === 'accept') {
      // Only the friend (not the initiator) can accept
      if (friendship.friendId !== session.userId) {
        return NextResponse.json({ 
          error: "Only the invited user can accept the request" 
        }, { status: 403 });
      }

      const updatedFriendship = await prisma.friendship.update({
        where: { id: friendshipId },
        data: { 
          status: 'ACCEPTED',
          updatedAt: new Date()
        }
      });

      // Create notification for the original requester
      await prisma.notification.create({
        data: {
          userId: friendship.userId,
          type: 'FRIEND_ACCEPTED',
          title: 'Friend Request Accepted',
          message: `${session.user?.name || 'Someone'} accepted your friend request`,
          actionUrl: `/friends`,
          metadata: JSON.stringify({
            friendshipId: friendship.id,
            friendUserId: session.userId,
            friendUserName: session.user?.name
          })
        }
      });

      return NextResponse.json(updatedFriendship);
    }

    if (action === 'reject') {
      // Either user can reject
      const updatedFriendship = await prisma.friendship.update({
        where: { id: friendshipId },
        data: { 
          status: 'REJECTED',
          updatedAt: new Date()
        }
      });

      return NextResponse.json(updatedFriendship);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (error) {
    console.error("Error updating friendship:", error);
    return NextResponse.json(
      { error: "Failed to update friendship" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ friendshipId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const friendshipId = resolvedParams.friendshipId;

    const friendship = await prisma.friendship.findFirst({
      where: {
        id: friendshipId,
        OR: [
          { userId: session.userId },
          { friendId: session.userId }
        ]
      }
    });

    if (!friendship) {
      return NextResponse.json({ error: "Friendship not found" }, { status: 404 });
    }

    await prisma.friendship.delete({
      where: { id: friendshipId }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Error deleting friendship:", error);
    return NextResponse.json(
      { error: "Failed to delete friendship" },
      { status: 500 }
    );
  }
}
