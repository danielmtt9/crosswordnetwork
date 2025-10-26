import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { RoomPermissionManager, createPermissionContext } from "@/lib/roomPermissions";

// POST /api/multiplayer/rooms/[roomId]/invite - Send room invitations
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const roomCode = resolvedParams.roomId; // roomId is actually roomCode

    const body = await request.json();
    const { 
      inviteType, // 'email', 'username', 'direct_link'
      recipients, // array of emails/usernames
      message, // optional custom message
      expiresIn // optional expiration in hours (default 24)
    } = body;

    if (!inviteType || !recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json({ 
        error: "Invite type and recipients are required" 
      }, { status: 400 });
    }

    if (!['email', 'username', 'direct_link'].includes(inviteType)) {
      return NextResponse.json({ 
        error: "Invalid invite type. Must be 'email', 'username', or 'direct_link'" 
      }, { status: 400 });
    }

    // Verify room exists and user is a participant
    const room = await prisma.multiplayerRoom.findUnique({
      where: { roomCode },
      include: {
        participants: {
          where: { userId: session.userId },
          select: { role: true, isOnline: true }
        },
        hostUser: {
          select: { name: true, username: true }
        }
      }
    });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const participant = room.participants[0];
    if (!participant) {
      return NextResponse.json({ error: "You are not a participant in this room" }, { status: 403 });
    }

    // Check permissions - hosts and players can invite
    const permissionContext = createPermissionContext(
      participant.role,
      room.hostUserId === session.userId,
      participant.isOnline,
      room.status,
      room.isPrivate,
      !!room.password,
      false // TODO: Get premium status from user
    );

    const permissionCheck = RoomPermissionManager.validateAction('invite_players', permissionContext);
    if (!permissionCheck.allowed) {
      return NextResponse.json({ 
        error: permissionCheck.reason || "You don't have permission to invite players" 
      }, { status: 403 });
    }

    // Check if room is full
    if (room.participants.length >= room.maxPlayers) {
      return NextResponse.json({ 
        error: "Room is full" 
      }, { status: 400 });
    }

    const expiresAt = new Date(Date.now() + (expiresIn || 24) * 60 * 60 * 1000);
    const inviteResults = [];

    for (const recipient of recipients) {
      try {
        let targetUserId: string | null = null;
        let targetEmail: string | null = null;
        let targetUsername: string | null = null;

        if (inviteType === 'email') {
          targetEmail = recipient;
          // Find user by email
          const user = await prisma.user.findUnique({
            where: { email: recipient },
            select: { id: true, name: true, username: true }
          });
          if (user) {
            targetUserId = user.id;
            targetUsername = user.username || user.name;
          }
        } else if (inviteType === 'username') {
          targetUsername = recipient;
          // Find user by username
          const user = await prisma.user.findUnique({
            where: { username: recipient },
            select: { id: true, name: true, email: true }
          });
          if (user) {
            targetUserId = user.id;
            targetEmail = user.email;
          }
        }

        // Check if user is already a participant
        if (targetUserId) {
          const existingParticipant = await prisma.roomParticipant.findFirst({
            where: {
              roomId: room.id,
              userId: targetUserId
            }
          });

          if (existingParticipant) {
            inviteResults.push({
              recipient,
              success: false,
              error: "User is already in this room"
            });
            continue;
          }
        }

        // Create invitation
        const invite = await prisma.roomInvite.create({
          data: {
            roomId: room.id,
            invitedBy: session.userId,
            invitedByUserName: session.user?.name || 'User',
            targetUserId,
            targetEmail,
            targetUsername,
            inviteType: inviteType as any,
            message: message || `Join me in solving "${room.puzzle?.title || 'a crossword puzzle'}"!`,
            expiresAt,
            metadata: JSON.stringify({
              roomName: room.name,
              roomCode: room.roomCode,
              puzzleTitle: room.puzzle?.title,
              hostName: room.hostUser.name || room.hostUser.username
            })
          }
        });

        // Create notification for existing user
        if (targetUserId) {
          await prisma.notification.create({
            data: {
              userId: targetUserId,
              type: 'ROOM_INVITE',
              title: 'Room Invitation',
              message: `${session.user?.name || 'Someone'} invited you to join room "${room.name || roomCode}"`,
              actionUrl: `/room/${roomCode}`,
              metadata: JSON.stringify({
                roomId: room.id,
                roomCode: room.roomCode,
                roomName: room.name,
                invitedBy: session.user?.name || 'User',
                inviteId: invite.id
              })
            }
          });
        }

        // TODO: Send email invitation if targetEmail is provided and user doesn't exist
        // This would integrate with an email service like Resend

        inviteResults.push({
          recipient,
          success: true,
          inviteId: invite.id
        });

      } catch (error) {
        console.error(`Error creating invite for ${recipient}:`, error);
        inviteResults.push({
          recipient,
          success: false,
          error: "Failed to create invitation"
        });
      }
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        actorUserId: session.userId,
        action: 'SEND_ROOM_INVITE',
        entityType: 'ROOM',
        entityId: room.id,
        before: null,
        after: JSON.stringify({ 
          inviteType, 
          recipientCount: recipients.length,
          successfulInvites: inviteResults.filter(r => r.success).length
        }),
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
      }
    });

    return NextResponse.json({
      success: true,
      results: inviteResults,
      message: `Invitations sent to ${inviteResults.filter(r => r.success).length} of ${recipients.length} recipients`
    });

  } catch (error) {
    console.error("Error sending room invitations:", error);
    return NextResponse.json(
      { error: "Failed to send invitations" },
      { status: 500 }
    );
  }
}