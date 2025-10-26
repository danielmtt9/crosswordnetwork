import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { RoomPermissionManager, createPermissionContext } from '@/lib/roomPermissions';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    console.log('[Hint API] Session check:', { 
      hasSession: !!session, 
      hasUserId: !!session?.userId,
      sessionKeys: session ? Object.keys(session) : []
    });
    
    if (!session || !session.userId) {
      console.log('[Hint API] Unauthorized - no session or userId');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { roomId } = await params;
    const { type, userId } = await request.json();

    // Validate hint type
    if (!['LETTER', 'WORD', 'DEFINITION'].includes(type)) {
      return NextResponse.json({ error: 'Invalid hint type' }, { status: 400 });
    }

    // Get room and verify user is a participant
    const room = await prisma.multiplayerRoom.findUnique({
      where: { roomCode: roomId },
      include: {
        participants: {
          where: { userId: session.userId },
          select: { role: true, isOnline: true }
        }
      }
    });

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const participant = room.participants[0];
    if (!participant) {
      return NextResponse.json({ error: 'User not in room' }, { status: 403 });
    }

    // Check permissions using the permission system
    const permissionContext = createPermissionContext(
      participant.role,
      room.hostUserId === session.userId,
      participant.isOnline,
      room.status,
      room.isPrivate,
      !!room.password,
      false // TODO: Get premium status from user
    );

    const permissionCheck = RoomPermissionManager.validateAction('use_hints', permissionContext);
    if (!permissionCheck.allowed) {
      return NextResponse.json({ 
        error: permissionCheck.reason || 'You cannot use hints' 
      }, { status: 403 });
    }

    // Log hint usage
    await prisma.roomHintUsage.create({
      data: {
        roomId: room.id,
        userId: session.userId,
        type,
        metadata: {
          timestamp: new Date().toISOString(),
          hintType: type
        }
      }
    });

    // Get the actual puzzle data
    const puzzle = await prisma.puzzle.findUnique({
      where: { id: room.puzzleId }
    });

    if (!puzzle) {
      return NextResponse.json({ error: 'Puzzle not found' }, { status: 404 });
    }

    // For now, return mock data - this would be enhanced with actual hint logic
    // In a real implementation, you'd parse the puzzle content to get actual solutions
    let result: any = { success: true };

    switch (type) {
      case 'LETTER':
        result = {
          success: true,
          cellId: 'c001001', // Mock cell ID - should be actual cell from puzzle
          letter: 'A', // Mock letter - should be actual correct letter
          cost: 5
        };
        break;
      case 'WORD':
        result = {
          success: true,
          wordData: {
            wordIndex: 1,
            word: 'EXAMPLE', // Mock word - should be actual word from puzzle
            cells: ['c001001', 'c001002', 'c001003', 'c001004', 'c001005', 'c001006', 'c001007']
          },
          cost: 15
        };
        break;
      case 'DEFINITION':
        result = {
          success: true,
          enhancedClue: 'This is an enhanced clue with more context and hints.',
          cost: 3
        };
        break;
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in hint API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
