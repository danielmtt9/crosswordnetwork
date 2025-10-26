/**
 * API endpoints for room state backup search
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
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!query) {
      return new NextResponse('Query parameter is required', { status: 400 });
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

    // Search backups
    const results = await searchBackups(roomId, {
      query,
      type,
      status,
      dateFrom,
      dateTo,
      limit,
      offset
    });

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error searching backups:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

async function searchBackups(
  roomId: string,
  options: {
    query: string;
    type?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    limit: number;
    offset: number;
  }
) {
  const { query, type, status, dateFrom, dateTo, limit, offset } = options;

  // Build where clause
  const whereClause: any = {
    roomId,
    OR: [
      { name: { contains: query, mode: 'insensitive' } },
      { type: { contains: query, mode: 'insensitive' } }
    ]
  };

  // Add type filter
  if (type) {
    whereClause.type = type;
  }

  // Add status filter
  if (status) {
    if (status === 'active') {
      whereClause.expiresAt = { gt: new Date() };
      whereClause.isCorrupted = false;
    } else if (status === 'expired') {
      whereClause.expiresAt = { lte: new Date() };
    } else if (status === 'corrupted') {
      whereClause.isCorrupted = true;
    }
  }

  // Add date filters
  if (dateFrom) {
    whereClause.createdAt = { gte: new Date(dateFrom) };
  }

  if (dateTo) {
    if (whereClause.createdAt) {
      whereClause.createdAt.lte = new Date(dateTo);
    } else {
      whereClause.createdAt = { lte: new Date(dateTo) };
    }
  }

  // Search backups
  const backups = await db.roomRecoveryBackup.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
    skip: offset,
    take: limit,
    select: {
      id: true,
      name: true,
      type: true,
      size: true,
      createdAt: true,
      expiresAt: true,
      isExpired: true,
      isCorrupted: true,
      metadata: true
    }
  });

  // Get total count
  const totalCount = await db.roomRecoveryBackup.count({
    where: whereClause
  });

  // Get search suggestions
  const suggestions = await getSearchSuggestions(roomId, query);

  return {
    results: backups.map(backup => ({
      id: backup.id,
      name: backup.name,
      type: backup.type,
      size: backup.size,
      createdAt: backup.createdAt,
      expiresAt: backup.expiresAt,
      isExpired: backup.isExpired,
      isCorrupted: backup.isCorrupted,
      metadata: backup.metadata
    })),
    pagination: {
      total: totalCount,
      limit,
      offset,
      hasMore: offset + limit < totalCount
    },
    suggestions,
    query: {
      original: query,
      type,
      status,
      dateFrom,
      dateTo
    }
  };
}

async function getSearchSuggestions(roomId: string, query: string) {
  // Get backup names that match the query
  const nameMatches = await db.roomRecoveryBackup.findMany({
    where: {
      roomId,
      name: { contains: query, mode: 'insensitive' }
    },
    select: { name: true },
    distinct: ['name'],
    take: 5
  });

  // Get backup types that match the query
  const typeMatches = await db.roomRecoveryBackup.findMany({
    where: {
      roomId,
      type: { contains: query, mode: 'insensitive' }
    },
    select: { type: true },
    distinct: ['type'],
    take: 5
  });

  return {
    names: nameMatches.map(match => match.name),
    types: typeMatches.map(match => match.type)
  };
}
