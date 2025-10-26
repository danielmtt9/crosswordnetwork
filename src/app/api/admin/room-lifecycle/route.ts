import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { isSuperAdmin } from "@/lib/superAdmin";
import { roomLifecycleManager } from "@/lib/roomLifecycle";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is super admin
    if (!isSuperAdmin(session.userId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const statistics = await roomLifecycleManager.getStatistics();

    return NextResponse.json({
      success: true,
      data: statistics
    });

  } catch (error) {
    console.error("Error fetching room lifecycle statistics:", error);
    return NextResponse.json(
      { error: "Failed to fetch statistics" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is super admin
    if (!isSuperAdmin(session.userId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'cleanup':
        await roomLifecycleManager.performCleanup();
        return NextResponse.json({
          success: true,
          message: "Room cleanup completed"
        });

      case 'restart':
        roomLifecycleManager.stop();
        roomLifecycleManager.start();
        return NextResponse.json({
          success: true,
          message: "Room lifecycle manager restarted"
        });

      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error("Error performing room lifecycle action:", error);
    return NextResponse.json(
      { error: "Failed to perform action" },
      { status: 500 }
    );
  }
}
