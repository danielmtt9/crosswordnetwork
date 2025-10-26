/**
 * API endpoints for room state backup scheduling
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

    // Get backup schedule
    const schedule = await getBackupSchedule(roomId);

    return NextResponse.json(schedule);
  } catch (error) {
    console.error('Error fetching backup schedule:', error);
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
    const { schedule, options } = body;

    if (!schedule) {
      return new NextResponse('Schedule is required', { status: 400 });
    }

    // Create backup schedule
    const result = await createBackupSchedule(roomId, session.user.id, schedule, options);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error creating backup schedule:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function PUT(
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
    const { scheduleId, schedule, options } = body;

    if (!scheduleId) {
      return new NextResponse('Schedule ID is required', { status: 400 });
    }

    if (!schedule) {
      return new NextResponse('Schedule is required', { status: 400 });
    }

    // Update backup schedule
    const result = await updateBackupSchedule(roomId, session.user.id, scheduleId, schedule, options);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating backup schedule:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { roomId: string } }
) {
  try {
    const session = await getAuthSession();
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { roomId } = params;
    const { searchParams } = new URL(req.url);
    const scheduleId = searchParams.get('scheduleId');

    if (!scheduleId) {
      return new NextResponse('Schedule ID is required', { status: 400 });
    }

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

    // Delete backup schedule
    await deleteBackupSchedule(roomId, session.user.id, scheduleId);

    return new NextResponse('Backup schedule deleted', { status: 200 });
  } catch (error) {
    console.error('Error deleting backup schedule:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

async function getBackupSchedule(roomId: string) {
  // Get backup schedules
  const schedules = await db.roomBackupSchedule.findMany({
    where: { roomId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      type: true,
      frequency: true,
      interval: true,
      time: true,
      isActive: true,
      lastRun: true,
      nextRun: true,
      createdAt: true,
      metadata: true
    }
  });

  // Get schedule statistics
  const stats = await db.roomBackupSchedule.aggregate({
    where: { roomId },
    _count: { id: true },
    _sum: { runCount: true }
  });

  // Get recent schedule runs
  const recentRuns = await db.roomBackupScheduleRun.findMany({
    where: { roomId },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true,
      scheduleId: true,
      status: true,
      createdAt: true,
      metadata: true
    }
  });

  return {
    schedules: schedules.map(schedule => ({
      id: schedule.id,
      name: schedule.name,
      type: schedule.type,
      frequency: schedule.frequency,
      interval: schedule.interval,
      time: schedule.time,
      isActive: schedule.isActive,
      lastRun: schedule.lastRun,
      nextRun: schedule.nextRun,
      createdAt: schedule.createdAt,
      metadata: schedule.metadata
    })),
    statistics: {
      total: stats._count.id,
      totalRuns: stats._sum.runCount || 0
    },
    recentRuns: recentRuns.map(run => ({
      id: run.id,
      scheduleId: run.scheduleId,
      status: run.status,
      createdAt: run.createdAt,
      metadata: run.metadata
    }))
  };
}

async function createBackupSchedule(
  roomId: string,
  userId: string,
  schedule: any,
  options: any = {}
) {
  const {
    name,
    type = 'AUTOMATIC',
    frequency = 'DAILY',
    interval = 1,
    time = '00:00',
    isActive = true,
    metadata = {}
  } = schedule;

  if (!name) {
    throw new Error('Schedule name is required');
  }

  // Calculate next run time
  const nextRun = calculateNextRun(frequency, interval, time);

  // Create schedule
  const newSchedule = await db.roomBackupSchedule.create({
    data: {
      roomId,
      userId,
      name,
      type,
      frequency,
      interval,
      time,
      isActive,
      nextRun,
      metadata
    }
  });

  // Log activity
  await db.roomActivity.create({
    data: {
      roomId,
      userId,
      type: 'BACKUP_SCHEDULE_CREATED',
      description: `Backup schedule created: ${name}`,
      metadata: {
        scheduleId: newSchedule.id,
        frequency,
        interval,
        time,
        isActive
      }
    }
  });

  return {
    id: newSchedule.id,
    name: newSchedule.name,
    type: newSchedule.type,
    frequency: newSchedule.frequency,
    interval: newSchedule.interval,
    time: newSchedule.time,
    isActive: newSchedule.isActive,
    nextRun: newSchedule.nextRun,
    createdAt: newSchedule.createdAt
  };
}

async function updateBackupSchedule(
  roomId: string,
  userId: string,
  scheduleId: string,
  schedule: any,
  options: any = {}
) {
  // Get existing schedule
  const existingSchedule = await db.roomBackupSchedule.findUnique({
    where: { id: scheduleId }
  });

  if (!existingSchedule) {
    throw new Error('Schedule not found');
  }

  if (existingSchedule.roomId !== roomId) {
    throw new Error('Schedule does not belong to this room');
  }

  // Calculate next run time
  const nextRun = calculateNextRun(
    schedule.frequency || existingSchedule.frequency,
    schedule.interval || existingSchedule.interval,
    schedule.time || existingSchedule.time
  );

  // Update schedule
  const updatedSchedule = await db.roomBackupSchedule.update({
    where: { id: scheduleId },
    data: {
      name: schedule.name || existingSchedule.name,
      type: schedule.type || existingSchedule.type,
      frequency: schedule.frequency || existingSchedule.frequency,
      interval: schedule.interval || existingSchedule.interval,
      time: schedule.time || existingSchedule.time,
      isActive: schedule.isActive !== undefined ? schedule.isActive : existingSchedule.isActive,
      nextRun,
      metadata: { ...existingSchedule.metadata, ...schedule.metadata }
    }
  });

  // Log activity
  await db.roomActivity.create({
    data: {
      roomId,
      userId,
      type: 'BACKUP_SCHEDULE_UPDATED',
      description: `Backup schedule updated: ${updatedSchedule.name}`,
      metadata: {
        scheduleId: updatedSchedule.id,
        changes: schedule
      }
    }
  });

  return {
    id: updatedSchedule.id,
    name: updatedSchedule.name,
    type: updatedSchedule.type,
    frequency: updatedSchedule.frequency,
    interval: updatedSchedule.interval,
    time: updatedSchedule.time,
    isActive: updatedSchedule.isActive,
    nextRun: updatedSchedule.nextRun,
    updatedAt: updatedSchedule.updatedAt
  };
}

async function deleteBackupSchedule(roomId: string, userId: string, scheduleId: string) {
  // Get existing schedule
  const existingSchedule = await db.roomBackupSchedule.findUnique({
    where: { id: scheduleId }
  });

  if (!existingSchedule) {
    throw new Error('Schedule not found');
  }

  if (existingSchedule.roomId !== roomId) {
    throw new Error('Schedule does not belong to this room');
  }

  // Delete schedule
  await db.roomBackupSchedule.delete({
    where: { id: scheduleId }
  });

  // Log activity
  await db.roomActivity.create({
    data: {
      roomId,
      userId,
      type: 'BACKUP_SCHEDULE_DELETED',
      description: `Backup schedule deleted: ${existingSchedule.name}`,
      metadata: {
        scheduleId: existingSchedule.id
      }
    }
  });
}

function calculateNextRun(frequency: string, interval: number, time: string): Date {
  const now = new Date();
  const [hours, minutes] = time.split(':').map(Number);
  
  let nextRun = new Date();
  nextRun.setHours(hours, minutes, 0, 0);

  switch (frequency) {
    case 'HOURLY':
      nextRun.setHours(nextRun.getHours() + interval);
      break;
    case 'DAILY':
      nextRun.setDate(nextRun.getDate() + interval);
      break;
    case 'WEEKLY':
      nextRun.setDate(nextRun.getDate() + (interval * 7));
      break;
    case 'MONTHLY':
      nextRun.setMonth(nextRun.getMonth() + interval);
      break;
    default:
      nextRun.setDate(nextRun.getDate() + 1);
  }

  // If the calculated time is in the past, move to the next interval
  if (nextRun <= now) {
    switch (frequency) {
      case 'HOURLY':
        nextRun.setHours(nextRun.getHours() + interval);
        break;
      case 'DAILY':
        nextRun.setDate(nextRun.getDate() + interval);
        break;
      case 'WEEKLY':
        nextRun.setDate(nextRun.getDate() + (interval * 7));
        break;
      case 'MONTHLY':
        nextRun.setMonth(nextRun.getMonth() + interval);
        break;
    }
  }

  return nextRun;
}
