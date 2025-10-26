/**
 * API endpoints for room persistence management
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { 
  getRoomPersistenceSettings, 
  updateRoomPersistenceSettings,
  extendRoomPersistence,
  isRoomExpired,
  getRoomAnalytics
} from '@/lib/roomPersistence';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
try {
    const session = await getAuthSession();
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { roomId } = params;
    const { searchParams } = new URL(request.url);
    const includeAnalytics = searchParams.get('includeAnalytics') === 'true';

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

    // Get persistence settings
    const settings = await getRoomPersistenceSettings(roomId);
    if (!settings) {
      return new NextResponse('Room not found', { status: 404 });
    }

    // Get analytics if requested
    let analytics = null;
    if (includeAnalytics) {
      analytics = await getRoomAnalytics(roomId);
    }

    // Check if room is expired
    const isExpired = await isRoomExpired(roomId);

    return NextResponse.json({
      settings,
      analytics,
      isExpired,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error fetching room persistence settings:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
try {
    const session = await getAuthSession();
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { roomId } = params;
    const { isPersistent, persistenceDays, autoCleanup } = await req.json();

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

    // Update persistence settings
    await updateRoomPersistenceSettings(roomId, {
      isPersistent,
      persistenceDays,
      autoCleanup,
    });

    return NextResponse.json({
      success: true,
      message: 'Room persistence settings updated successfully',
      settings: {
        isPersistent,
        persistenceDays,
        autoCleanup
      }
    });
  } catch (error) {
    console.error('Error updating room persistence settings:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
try {
    const session = await getAuthSession();
    if (!session?.user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { roomId } = params;
    const { action, additionalDays } = await req.json();

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
      case 'extend':
        if (!additionalDays || additionalDays <= 0) {
          return new NextResponse('Invalid additional days', { status: 400 });
        }
        await extendRoomPersistence(roomId, additionalDays);
        result = {
          success: true,
          message: `Room persistence extended by ${additionalDays} days`,
          additionalDays
        };
        break;
      case 'check_expiry':
        const isExpired = await isRoomExpired(roomId);
        result = {
          success: true,
          isExpired,
          message: isExpired ? 'Room has expired' : 'Room is still active'
        };
        break;
      default:
        return new NextResponse('Invalid action', { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error handling room persistence action:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}