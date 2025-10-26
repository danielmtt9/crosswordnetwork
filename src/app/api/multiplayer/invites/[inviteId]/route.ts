import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ inviteId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const inviteId = resolvedParams.inviteId;

    const body = await request.json();
    const { action } = body;

    const invite = await prisma.roomInvite.findFirst({
      where: {
        id: inviteId,
        inviteeId: session.userId,
        status: 'PENDING'
      },
      include: {
        room: {
          include: {
            participants: true,
            puzzle: true
          }
        },
        invitedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        }
      }
    });

    if (!invite) {
      return NextResponse.json({ error: "Invite not found" }, { status: 404 });
    }

    // Check if invite has expired
    if (new Date() > invite.expiresAt) {
      await prisma.roomInvite.update({
        where: { id: inviteId },
        data: { status: 'EXPIRED' }
      });
      return NextResponse.json({ error: "Invite has expired" }, { status: 400 });
    }

    if (action === 'accept') {
      // Check if room is full
      if (invite.room.participants.length >= invite.room.maxPlayers) {
        return NextResponse.json({ 
          error: "Room is full" 
        }, { status: 400 });
      }

      // Check if room is still waiting
      if (invite.room.status !== 'WAITING') {
        return NextResponse.json({ 
          error: "Room is no longer accepting players" 
        }, { status: 400 });
      }

      // Update invite status
      await prisma.roomInvite.update({
        where: { id: inviteId },
        data: { status: 'ACCEPTED' }
      });

      // Add user to room participants
      await prisma.roomParticipant.create({
        data: {
          roomId: invite.room.id,
          userId: session.userId,
          displayName: session.user?.name || 'Player',
          role: 'PLAYER',
          isOnline: true
        }
      });

      // Create notification for the inviter
      await prisma.notification.create({
        data: {
          userId: invite.invitedById,
          type: 'INVITE_ACCEPTED',
          title: 'Invite Accepted',
          message: `${session.user?.name || 'Someone'} accepted your room invitation`,
          actionUrl: `/room/${invite.room.roomCode}`,
          metadata: JSON.stringify({
            roomId: invite.room.id,
            roomCode: invite.room.roomCode,
            roomName: invite.room.name,
            acceptedByUserId: session.userId,
            acceptedByUserName: session.user?.name
          })
        }
      });

      return NextResponse.json({ 
        success: true,
        roomCode: invite.room.roomCode 
      });
    }

    if (action === 'reject') {
      await prisma.roomInvite.update({
        where: { id: inviteId },
        data: { status: 'REJECTED' }
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (error) {
    console.error("Error updating room invite:", error);
    return NextResponse.json(
      { error: "Failed to update invite" },
      { status: 500 }
    );
  }
}
