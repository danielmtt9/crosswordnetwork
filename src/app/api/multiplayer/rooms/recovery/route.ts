import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { roomRecoveryManager } from "@/lib/roomRecovery";
import { isSuperAdmin } from "@/lib/superAdmin";

// GET /api/multiplayer/rooms/recovery - Get recovery statistics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.userId || !isSuperAdmin(session.userId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stats = await roomRecoveryManager.getRecoveryStats();
    return NextResponse.json(stats);

  } catch (error) {
    console.error("Error fetching recovery stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch recovery stats" },
      { status: 500 }
    );
  }
}

// POST /api/multiplayer/rooms/recovery - Trigger room recovery
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.userId || !isSuperAdmin(session.userId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, roomId } = body;

    if (action === 'recover_all') {
      const results = await roomRecoveryManager.recoverAllRooms();
      return NextResponse.json({
        success: true,
        message: `Recovery completed: ${results.filter(r => r.recovered).length}/${results.length} rooms recovered`,
        results
      });
    }

    if (action === 'recover_room' && roomId) {
      const result = await roomRecoveryManager.recoverRoom(roomId, 'UNKNOWN');
      return NextResponse.json({
        success: result.recovered,
        message: result.recovered ? 'Room recovered successfully' : 'Failed to recover room',
        result
      });
    }

    if (action === 'cleanup') {
      await roomRecoveryManager.cleanupOldRecoveryData();
      return NextResponse.json({
        success: true,
        message: 'Recovery data cleanup completed'
      });
    }

    return NextResponse.json({ 
      error: "Invalid action. Use 'recover_all', 'recover_room', or 'cleanup'" 
    }, { status: 400 });

  } catch (error) {
    console.error("Error during room recovery:", error);
    return NextResponse.json(
      { error: "Failed to perform recovery operation" },
      { status: 500 }
    );
  }
}
