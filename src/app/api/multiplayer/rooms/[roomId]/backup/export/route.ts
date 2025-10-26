/**
 * API endpoints for room state backup export
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
    const format = searchParams.get('format') || 'json';
    const includeMetadata = searchParams.get('includeMetadata') === 'true';

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

    // Export room state
    const exportData = await exportRoomState(roomId, format, includeMetadata);

    // Set appropriate headers based on format
    const headers: Record<string, string> = {
      'Content-Disposition': `attachment; filename="room-${roomId}-export.${format}"`
    };

    if (format === 'json') {
      headers['Content-Type'] = 'application/json';
    } else if (format === 'csv') {
      headers['Content-Type'] = 'text/csv';
    } else if (format === 'xml') {
      headers['Content-Type'] = 'application/xml';
    }

    return new NextResponse(exportData, { headers });
  } catch (error) {
    console.error('Error exporting room state:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

async function exportRoomState(roomId: string, format: string, includeMetadata: boolean) {
  // Get room data
  const room = await db.multiplayerRoom.findUnique({
    where: { id: roomId },
    select: {
      id: true,
      name: true,
      state: true,
      version: true,
      settings: true,
      createdAt: true,
      updatedAt: true,
      lastActivityAt: true
    }
  });

  if (!room) {
    throw new Error('Room not found');
  }

  // Get participants
  const participants = await db.roomParticipant.findMany({
    where: { roomId },
    include: {
      user: {
        select: { id: true, name: true, image: true }
      }
    }
  });

  // Get puzzle state
  const puzzleState = await db.roomPuzzleState.findMany({
    where: { roomId },
    select: {
      id: true,
      userId: true,
      cellId: true,
      value: true,
      isCompleted: true,
      attempts: true,
      hintsUsed: true,
      updatedAt: true
    }
  });

  // Get messages
  const messages = await db.roomMessage.findMany({
    where: { roomId },
    orderBy: { createdAt: 'asc' },
    include: {
      user: {
        select: { id: true, name: true, image: true }
      }
    }
  });

  // Get activity log
  const activities = await db.roomActivity.findMany({
    where: { roomId },
    orderBy: { createdAt: 'asc' },
    include: {
      user: {
        select: { id: true, name: true }
      }
    }
  });

  // Get backups
  const backups = await db.roomRecoveryBackup.findMany({
    where: { roomId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      type: true,
      size: true,
      createdAt: true,
      expiresAt: true,
      isExpired: true,
      isCorrupted: true
    }
  });

  // Prepare export data
  const exportData = {
    room: {
      id: room.id,
      name: room.name,
      state: room.state,
      version: room.version,
      settings: room.settings,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
      lastActivityAt: room.lastActivityAt
    },
    participants: participants.map(p => ({
      id: p.userId,
      name: p.user.name,
      avatar: p.user.image,
      role: p.role,
      isActive: p.isActive,
      lastSeen: p.lastSeen
    })),
    puzzle: {
      state: puzzleState.map(ps => ({
        id: ps.id,
        userId: ps.userId,
        cellId: ps.cellId,
        value: ps.value,
        isCompleted: ps.isCompleted,
        attempts: ps.attempts,
        hintsUsed: ps.hintsUsed,
        updatedAt: ps.updatedAt
      }))
    },
    messages: messages.map(m => ({
      id: m.id,
      userId: m.userId,
      content: m.content,
      type: m.type,
      createdAt: m.createdAt,
      user: {
        id: m.user.id,
        name: m.user.name,
        image: m.user.image
      }
    })),
    activities: activities.map(a => ({
      id: a.id,
      type: a.type,
      description: a.description,
      createdAt: a.createdAt,
      user: {
        id: a.user.id,
        name: a.user.name
      },
      metadata: a.metadata
    })),
    backups: backups.map(b => ({
      id: b.id,
      name: b.name,
      type: b.type,
      size: b.size,
      createdAt: b.createdAt,
      expiresAt: b.expiresAt,
      isExpired: b.isExpired,
      isCorrupted: b.isCorrupted
    }))
  };

  // Add metadata if requested
  if (includeMetadata) {
    (exportData as any).metadata = {
      exportedAt: new Date(),
      exportedBy: 'system',
      format,
      version: '1.0'
    };
  }

  // Convert to requested format
  switch (format) {
    case 'json':
      return JSON.stringify(exportData, null, 2);
    
    case 'csv':
      return convertToCSV(exportData);
    
    case 'xml':
      return convertToXML(exportData);
    
    default:
      return JSON.stringify(exportData, null, 2);
  }
}

function convertToCSV(data: any): string {
  const csvRows: string[] = [];
  
  // Add room information
  csvRows.push('Section,Field,Value');
  csvRows.push(`Room,ID,"${data.room.id}"`);
  csvRows.push(`Room,Name,"${data.room.name}"`);
  csvRows.push(`Room,Version,"${data.room.version}"`);
  csvRows.push(`Room,Created,"${data.room.createdAt}"`);
  csvRows.push(`Room,Updated,"${data.room.updatedAt}"`);
  
  // Add participants
  csvRows.push('');
  csvRows.push('Participant,ID,Name,Role,Active,LastSeen');
  data.participants.forEach((p: any) => {
    csvRows.push(`Participant,"${p.id}","${p.name}","${p.role}","${p.isActive}","${p.lastSeen}"`);
  });
  
  // Add puzzle state
  csvRows.push('');
  csvRows.push('Puzzle,CellID,Value,Completed,Attempts,Hints');
  data.puzzle.state.forEach((ps: any) => {
    csvRows.push(`Puzzle,"${ps.cellId}","${ps.value}","${ps.isCompleted}","${ps.attempts}","${ps.hintsUsed}"`);
  });
  
  // Add messages
  csvRows.push('');
  csvRows.push('Message,ID,User,Content,Type,Created');
  data.messages.forEach((m: any) => {
    csvRows.push(`Message,"${m.id}","${m.user.name}","${m.content}","${m.type}","${m.createdAt}"`);
  });
  
  return csvRows.join('\n');
}

function convertToXML(data: any): string {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<roomExport>\n';
  
  // Room information
  xml += '  <room>\n';
  xml += `    <id>${data.room.id}</id>\n`;
  xml += `    <name><![CDATA[${data.room.name}]]></name>\n`;
  xml += `    <version>${data.room.version}</version>\n`;
  xml += `    <created>${data.room.createdAt}</created>\n`;
  xml += `    <updated>${data.room.updatedAt}</updated>\n`;
  xml += '  </room>\n';
  
  // Participants
  xml += '  <participants>\n';
  data.participants.forEach((p: any) => {
    xml += '    <participant>\n';
    xml += `      <id>${p.id}</id>\n`;
    xml += `      <name><![CDATA[${p.name}]]></name>\n`;
    xml += `      <role>${p.role}</role>\n`;
    xml += `      <active>${p.isActive}</active>\n`;
    xml += `      <lastSeen>${p.lastSeen}</lastSeen>\n`;
    xml += '    </participant>\n';
  });
  xml += '  </participants>\n';
  
  // Puzzle state
  xml += '  <puzzle>\n';
  data.puzzle.state.forEach((ps: any) => {
    xml += '    <cell>\n';
    xml += `      <id>${ps.id}</id>\n`;
    xml += `      <cellId>${ps.cellId}</cellId>\n`;
    xml += `      <value><![CDATA[${ps.value}]]></value>\n`;
    xml += `      <completed>${ps.isCompleted}</completed>\n`;
    xml += `      <attempts>${ps.attempts}</attempts>\n`;
    xml += `      <hints>${ps.hintsUsed}</hints>\n`;
    xml += '    </cell>\n';
  });
  xml += '  </puzzle>\n';
  
  // Messages
  xml += '  <messages>\n';
  data.messages.forEach((m: any) => {
    xml += '    <message>\n';
    xml += `      <id>${m.id}</id>\n`;
    xml += `      <user><![CDATA[${m.user.name}]]></user>\n`;
    xml += `      <content><![CDATA[${m.content}]]></content>\n`;
    xml += `      <type>${m.type}</type>\n`;
    xml += `      <created>${m.createdAt}</created>\n`;
    xml += '    </message>\n';
  });
  xml += '  </messages>\n';
  
  xml += '</roomExport>';
  
  return xml;
}
