import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { RoomPermissionManager, createPermissionContext } from "@/lib/roomPermissions";

export async function PATCH(
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
    const { action } = body; // 'start', 'pause', 'resume', 'end'

    if (!action || !['start', 'pause', 'resume', 'end'].includes(action)) {
      return NextResponse.json({ 
        error: "Invalid action. Must be 'start', 'pause', 'resume', or 'end'" 
      }, { status: 400 });
    }

    // Verify room exists and get participant info
    const room = await prisma.multiplayerRoom.findUnique({
      where: { roomCode },
      include: { 
        participants: {
          where: { userId: session.userId },
          select: { role: true, isOnline: true }
        }
      }
    });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const actorParticipant = room.participants[0];
    if (!actorParticipant) {
      return NextResponse.json({ error: "You are not a participant in this room" }, { status: 403 });
    }

    // Check permissions using the permission system
    const permissionContext = createPermissionContext(
      actorParticipant.role,
      room.hostUserId === session.userId,
      actorParticipant.isOnline,
      room.status,
      room.isPrivate,
      !!room.password,
      false // TODO: Get premium status from user
    );

    const permissionCheck = RoomPermissionManager.validateAction('manage_session', permissionContext);
    if (!permissionCheck.allowed) {
      return NextResponse.json({ 
        error: permissionCheck.reason || "You don't have permission to manage the session" 
      }, { status: 403 });
    }

    let updateData: any = {};
    let auditAction = '';
    let notificationMessage = '';

    switch (action) {
      case 'start':
        if (room.status !== 'WAITING') {
          return NextResponse.json({ 
            error: "Can only start waiting rooms" 
          }, { status: 400 });
        }
        
        if (room.participants.length < 2) {
          return NextResponse.json({ 
            error: "Need at least 2 players to start the session" 
          }, { status: 400 });
        }

        updateData = {
          status: 'ACTIVE',
          startedAt: new Date()
        };
        auditAction = 'START_SESSION';
        notificationMessage = `Session started in room "${room.name || roomCode}"`;
        break;

      case 'pause':
        if (room.status !== 'ACTIVE') {
          return NextResponse.json({ 
            error: "Can only pause active sessions" 
          }, { status: 400 });
        }

        updateData = {
          status: 'WAITING' // Pause by setting back to waiting
        };
        auditAction = 'PAUSE_SESSION';
        notificationMessage = `Session paused in room "${room.name || roomCode}"`;
        break;

      case 'resume':
        if (room.status !== 'WAITING') {
          return NextResponse.json({ 
            error: "Can only resume paused sessions" 
          }, { status: 400 });
        }

        updateData = {
          status: 'ACTIVE'
        };
        auditAction = 'RESUME_SESSION';
        notificationMessage = `Session resumed in room "${room.name || roomCode}"`;
        break;

      case 'end':
        if (room.status === 'COMPLETED' || room.status === 'EXPIRED') {
          return NextResponse.json({ 
            error: "Session is already ended" 
          }, { status: 400 });
        }

        updateData = {
          status: 'COMPLETED',
          completedAt: new Date()
        };
        auditAction = 'END_SESSION';
        notificationMessage = `Session ended in room "${room.name || roomCode}"`;
        break;
    }

    // Update room
    const updatedRoom = await prisma.multiplayerRoom.update({
      where: { id: room.id },
      data: updateData
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        actorUserId: session.userId,
        action: auditAction,
        entityType: 'ROOM',
        entityId: room.id,
        before: JSON.stringify({ status: room.status }),
        after: JSON.stringify({ status: updateData.status }),
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
      }
    });

    // Create notifications for all participants
    const participantIds = room.participants.map(p => p.userId);
    if (participantIds.length > 0) {
      await prisma.notification.createMany({
        data: participantIds.map(userId => ({
          userId,
          type: 'ROOM_SESSION_UPDATE',
          title: 'Session Update',
          message: notificationMessage,
          actionUrl: `/room/${roomCode}`,
          metadata: JSON.stringify({
            roomId: room.id,
            roomCode: room.roomCode,
            roomName: room.name,
            action,
            newStatus: updateData.status
          })
        }))
      });
    }

    return NextResponse.json({ 
      success: true, 
      room: updatedRoom,
      message: `Session ${action}ed successfully` 
    });

  } catch (error) {
    console.error("Error managing session:", error);
    return NextResponse.json(
      { error: "Failed to manage session" },
      { status: 500 }
    );
  }
}
