import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { OperationalTransformer, Operation, ConflictResolutionStrategy } from '@/lib/operationalTransformation';

interface SyncRequest {
  operations: Operation[];
  lastVersion: number;
  userId: string;
}

interface SyncResponse {
  operations: Operation[];
  conflicts: Operation[];
  version: number;
  requiresResolution: boolean;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { roomId } = params;
    const body: SyncRequest = await request.json();
    const { operations, lastVersion, userId } = body;

    // Validate room access
    const room = await prisma.multiplayerRoom.findFirst({
      where: {
        id: roomId,
        participants: {
          some: {
            userId: session.user.id
          }
        }
      },
      include: {
        participants: true
      }
    });

    if (!room) {
      return NextResponse.json({ error: 'Room not found or access denied' }, { status: 404 });
    }

    // Get current room state
    const roomState = await prisma.roomState.findFirst({
      where: { roomId },
      orderBy: { version: 'desc' }
    });

    if (!roomState) {
      return NextResponse.json({ error: 'Room state not found' }, { status: 404 });
    }

    // Initialize operational transformer
    const transformer = new OperationalTransformer({
      operations: roomState.operations as Operation[],
      lastApplied: roomState.lastApplied,
      version: roomState.version
    });

    // Process incoming operations
    const results: SyncResponse = {
      operations: [],
      conflicts: [],
      version: roomState.version,
      requiresResolution: false
    };

    for (const operation of operations) {
      // Validate operation
      if (!transformer.validateOperation(operation)) {
        continue;
      }

      // Apply transformation
      const result = transformer.applyOperation(operation);
      
      if (result.conflicts.length > 0) {
        results.conflicts.push(...result.conflicts);
        results.requiresResolution = true;
      }

      results.operations.push(result.operation);
    }

    // Update room state
    const newVersion = transformer.getState().version;
    await prisma.roomState.upsert({
      where: { roomId },
      update: {
        operations: transformer.getState().operations,
        version: newVersion,
        lastApplied: Date.now(),
        lastModifiedBy: session.user.id
      },
      create: {
        roomId,
        operations: transformer.getState().operations,
        version: newVersion,
        lastApplied: Date.now(),
        lastModifiedBy: session.user.id
      }
    });

    // Log sync activity
    await prisma.roomActivity.create({
      data: {
        roomId,
        userId: session.user.id,
        action: 'SYNC_OPERATIONS',
        details: {
          operationsCount: operations.length,
          conflictsCount: results.conflicts.length,
          version: newVersion
        }
      }
    });

    return NextResponse.json(results);

  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync operations' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { roomId } = params;
    const { searchParams } = new URL(request.url);
    const sinceVersion = parseInt(searchParams.get('since') || '0');

    // Validate room access
    const room = await prisma.multiplayerRoom.findFirst({
      where: {
        id: roomId,
        participants: {
          some: {
            userId: session.user.id
          }
        }
      }
    });

    if (!room) {
      return NextResponse.json({ error: 'Room not found or access denied' }, { status: 404 });
    }

    // Get room state
    const roomState = await prisma.roomState.findFirst({
      where: { roomId },
      orderBy: { version: 'desc' }
    });

    if (!roomState) {
      return NextResponse.json({ error: 'Room state not found' }, { status: 404 });
    }

    // Get operations since specified version
    const operations = (roomState.operations as Operation[]).slice(sinceVersion);

    return NextResponse.json({
      operations,
      version: roomState.version,
      lastApplied: roomState.lastApplied
    });

  } catch (error) {
    console.error('Get sync state error:', error);
    return NextResponse.json(
      { error: 'Failed to get sync state' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { roomId } = params;
    const body = await request.json();
    const { strategy, selectedOperations, customResolution } = body;

    // Validate room access
    const room = await prisma.multiplayerRoom.findFirst({
      where: {
        id: roomId,
        participants: {
          some: {
            userId: session.user.id,
            role: { in: ['HOST', 'MODERATOR'] }
          }
        }
      }
    });

    if (!room) {
      return NextResponse.json({ error: 'Room not found or insufficient permissions' }, { status: 404 });
    }

    // Get current room state
    const roomState = await prisma.roomState.findFirst({
      where: { roomId },
      orderBy: { version: 'desc' }
    });

    if (!roomState) {
      return NextResponse.json({ error: 'Room state not found' }, { status: 404 });
    }

    // Initialize transformer
    const transformer = new OperationalTransformer({
      operations: roomState.operations as Operation[],
      lastApplied: roomState.lastApplied,
      version: roomState.version
    });

    // Apply conflict resolution
    let resolvedOperations: Operation[] = [];
    
    switch (strategy) {
      case ConflictResolutionStrategy.LAST_WRITE_WINS:
        resolvedOperations = transformer.getState().operations
          .sort((a, b) => b.timestamp - a.timestamp);
        break;
      case ConflictResolutionStrategy.FIRST_WRITE_WINS:
        resolvedOperations = transformer.getState().operations
          .sort((a, b) => a.timestamp - b.timestamp);
        break;
      case ConflictResolutionStrategy.MANUAL_RESOLUTION:
        if (selectedOperations && selectedOperations.length > 0) {
          resolvedOperations = transformer.getState().operations
            .filter(op => selectedOperations.includes(op.id));
        }
        break;
      case ConflictResolutionStrategy.AUTOMATIC_MERGE:
        resolvedOperations = transformer.mergeOperations(transformer.getState().operations);
        break;
      default:
        return NextResponse.json({ error: 'Invalid resolution strategy' }, { status: 400 });
    }

    // Update room state with resolved operations
    const newVersion = roomState.version + 1;
    await prisma.roomState.upsert({
      where: { roomId },
      update: {
        operations: resolvedOperations,
        version: newVersion,
        lastApplied: Date.now(),
        lastModifiedBy: session.user.id
      },
      create: {
        roomId,
        operations: resolvedOperations,
        version: newVersion,
        lastApplied: Date.now(),
        lastModifiedBy: session.user.id
      }
    });

    // Log resolution activity
    await prisma.roomActivity.create({
      data: {
        roomId,
        userId: session.user.id,
        action: 'RESOLVE_CONFLICTS',
        details: {
          strategy,
          selectedOperations: selectedOperations?.length || 0,
          customResolution: !!customResolution,
          version: newVersion
        }
      }
    });

    return NextResponse.json({
      success: true,
      version: newVersion,
      operations: resolvedOperations
    });

  } catch (error) {
    console.error('Resolve conflicts error:', error);
    return NextResponse.json(
      { error: 'Failed to resolve conflicts' },
      { status: 500 }
    );
  }
}
