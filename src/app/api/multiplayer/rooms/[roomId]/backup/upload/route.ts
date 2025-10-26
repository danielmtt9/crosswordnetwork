/**
 * API endpoints for room state backup upload
 */

import { NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { db } from '@/lib/db';

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

    // Parse request body
    const body = await req.json();
    const { name, data, metadata } = body;

    if (!name || !data) {
      return new NextResponse('Name and data are required', { status: 400 });
    }

    // Validate backup data
    if (!validateBackupData(data)) {
      return new NextResponse('Invalid backup data format', { status: 400 });
    }

    // Create backup
    const backup = await createUploadedBackup(roomId, session.user.id, name, data, metadata);

    return NextResponse.json(backup);
  } catch (error) {
    console.error('Error uploading backup:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

function validateBackupData(data: any): boolean {
  // Basic validation of backup data structure
  if (!data || typeof data !== 'object') {
    return false;
  }

  // Check for required fields
  if (!data.room || !data.puzzle || !data.messages) {
    return false;
  }

  // Validate room data
  if (!data.room.state || !data.room.version) {
    return false;
  }

  // Validate puzzle data
  if (!Array.isArray(data.puzzle.state)) {
    return false;
  }

  // Validate messages data
  if (!Array.isArray(data.messages)) {
    return false;
  }

  return true;
}

async function createUploadedBackup(
  roomId: string, 
  userId: string, 
  name: string, 
  data: any, 
  metadata?: any
) {
  // Calculate backup size
  const backupSize = JSON.stringify(data).length;

  // Create backup record
  const backup = await db.roomRecoveryBackup.create({
    data: {
      roomId,
      userId,
      name,
      type: 'UPLOADED',
      data,
      size: backupSize,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      metadata: {
        uploadedAt: new Date(),
        uploadedBy: userId,
        ...metadata
      }
    }
  });

  // Log activity
  await db.roomActivity.create({
    data: {
      roomId,
      userId,
      type: 'BACKUP_UPLOADED',
      description: `Backup uploaded: ${name}`,
      metadata: {
        backupId: backup.id,
        backupSize,
        backupType: 'UPLOADED'
      }
    }
  });

  return {
    id: backup.id,
    name: backup.name,
    type: backup.type,
    size: backup.size,
    createdAt: backup.createdAt,
    expiresAt: backup.expiresAt
  };
}
