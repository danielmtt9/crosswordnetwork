/**
 * API endpoints for host transfer
 */

import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(
  req: Request,
  { params }: { params: { roomId: string } }
) {
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { roomId } = params;

    // Check if user has access to room
    const room = await db.multiplayerRoom.findUnique({
      where: { id: roomId },
      select: { 
        hostUserId: true,
        participants: {
          select: { userId: true }
        }
      }
    });

    if (!room) {
      return new NextResponse('Room not found', { status: 404 });
    }

    const isParticipant = room.participants.some(p => p.userId === session.user.id);
    
    if (!isParticipant) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    // Get host transfer state
    const transferState = await getHostTransferState(roomId);

    return NextResponse.json(transferState);
  } catch (error) {
    console.error('Error fetching host transfer state:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: { roomId: string } }
) {
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { roomId } = params;
    const body = await req.json();
    const { action, newHostId, confirm } = body;

    // Check if user is host
    const room = await db.multiplayerRoom.findUnique({
      where: { id: roomId },
      select: { hostUserId: true }
    });

    if (!room) {
      return new NextResponse('Room not found', { status: 404 });
    }

    if (room.hostUserId !== session.user.id) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    let result;
    switch (action) {
      case 'initiate':
        result = await initiateHostTransfer(roomId, session.user.id, newHostId);
        break;
      case 'confirm':
        result = await confirmHostTransfer(roomId, session.user.id, newHostId, confirm);
        break;
      case 'cancel':
        result = await cancelHostTransfer(roomId, session.user.id);
        break;
      default:
        return new NextResponse('Invalid action', { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error processing host transfer:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

async function getHostTransferState(roomId: string) {
  // Get current host
  const room = await db.multiplayerRoom.findUnique({
    where: { id: roomId },
    select: {
      hostUserId: true,
      createdAt: true
    }
  });

  if (!room) {
    throw new Error('Room not found');
  }

  // Get pending transfer
  const pendingTransfer = await db.roomHostTransfer.findFirst({
    where: {
      roomId,
      status: 'PENDING'
    },
    include: {
      newHost: {
        select: { name: true, image: true }
      },
      currentHost: {
        select: { name: true, image: true }
      }
    }
  });

  // Get transfer history
  const transferHistory = await db.roomHostTransfer.findMany({
    where: { roomId },
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: {
      newHost: {
        select: { name: true }
      },
      currentHost: {
        select: { name: true }
      }
    }
  });

  return {
    currentHostId: room.hostUserId,
    hostSince: room.createdAt,
    pendingTransfer: pendingTransfer ? {
      id: pendingTransfer.id,
      newHostId: pendingTransfer.newHostId,
      newHostName: pendingTransfer.newHost.name,
      currentHostName: pendingTransfer.currentHost.name,
      expiresAt: pendingTransfer.expiresAt,
      createdAt: pendingTransfer.createdAt
    } : null,
    transferHistory: transferHistory.map(transfer => ({
      id: transfer.id,
      fromName: transfer.currentHost.name,
      toName: transfer.newHost.name,
      status: transfer.status,
      timestamp: transfer.createdAt
    }))
  };
}

async function initiateHostTransfer(roomId: string, currentHostId: string, newHostId: string) {
  // Validate new host
  const newHost = await db.roomParticipant.findUnique({
    where: {
      roomId_userId: {
        roomId,
        userId: newHostId
      }
    },
    include: {
      user: {
        select: { name: true, image: true }
      }
    }
  });

  if (!newHost) {
    throw new Error('New host not found in room');
  }

  if (newHost.userId === currentHostId) {
    throw new Error('Cannot transfer to yourself');
  }

  if (!newHost.isActive) {
    throw new Error('New host is not active');
  }

  // Check if there's already a pending transfer
  const existingTransfer = await db.roomHostTransfer.findFirst({
    where: {
      roomId,
      status: 'PENDING'
    }
  });

  if (existingTransfer) {
    throw new Error('Transfer already in progress');
  }

  // Create transfer record
  const transfer = await db.roomHostTransfer.create({
    data: {
      roomId,
      currentHostId,
      newHostId,
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
    }
  });

  // Log activity
  await db.roomActivity.create({
    data: {
      roomId,
      userId: currentHostId,
      type: 'HOST_TRANSFER_INITIATED',
      description: `Host transfer initiated to ${newHost.user.name}`,
      metadata: {
        transferId: transfer.id,
        newHostId,
        newHostName: newHost.user.name
      }
    }
  });

  return {
    transferId: transfer.id,
    newHostId,
    newHostName: newHost.user.name,
    expiresAt: transfer.expiresAt,
    status: 'PENDING'
  };
}

async function confirmHostTransfer(roomId: string, currentHostId: string, newHostId: string, confirm: boolean) {
  // Get pending transfer
  const transfer = await db.roomHostTransfer.findFirst({
    where: {
      roomId,
      status: 'PENDING',
      currentHostId,
      newHostId
    }
  });

  if (!transfer) {
    throw new Error('No pending transfer found');
  }

  if (transfer.expiresAt < new Date()) {
    throw new Error('Transfer has expired');
  }

  if (confirm) {
    // Execute transfer
    await db.$transaction(async (tx) => {
      // Update room host
      await tx.multiplayerRoom.update({
        where: { id: roomId },
        data: { hostUserId: newHostId }
      });

      // Update transfer status
      await tx.roomHostTransfer.update({
        where: { id: transfer.id },
        data: { status: 'COMPLETED' }
      });

      // Log activity
      await tx.roomActivity.create({
        data: {
          roomId,
          userId: currentHostId,
          type: 'HOST_TRANSFER_COMPLETED',
          description: `Host transferred to ${newHostId}`,
          metadata: {
            transferId: transfer.id,
            newHostId
          }
        }
      });
    });

    return {
      success: true,
      newHostId,
      transferredAt: new Date()
    };
  } else {
    // Cancel transfer
    await db.roomHostTransfer.update({
      where: { id: transfer.id },
      data: { status: 'CANCELLED' }
    });

    // Log activity
    await db.roomActivity.create({
      data: {
        roomId,
        userId: currentHostId,
        type: 'HOST_TRANSFER_CANCELLED',
        description: 'Host transfer cancelled',
        metadata: {
          transferId: transfer.id
        }
      }
    });

    return {
      success: true,
      cancelled: true,
      cancelledAt: new Date()
    };
  }
}

async function cancelHostTransfer(roomId: string, currentHostId: string) {
  // Get pending transfer
  const transfer = await db.roomHostTransfer.findFirst({
    where: {
      roomId,
      status: 'PENDING',
      currentHostId
    }
  });

  if (!transfer) {
    throw new Error('No pending transfer found');
  }

  // Cancel transfer
  await db.roomHostTransfer.update({
    where: { id: transfer.id },
    data: { status: 'CANCELLED' }
  });

  // Log activity
  await db.roomActivity.create({
    data: {
      roomId,
      userId: currentHostId,
      type: 'HOST_TRANSFER_CANCELLED',
      description: 'Host transfer cancelled',
      metadata: {
        transferId: transfer.id
      }
    }
  });

  return {
    success: true,
    cancelled: true,
    cancelledAt: new Date()
  };
}