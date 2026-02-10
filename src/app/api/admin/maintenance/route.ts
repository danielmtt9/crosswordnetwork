import { NextRequest, NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { 
  isMaintenanceMode,
  setMaintenanceMode,
  getMaintenanceMessage,
  hasAdminAccess 
} from "@/lib/admin";

export async function GET(_request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin access
    const hasAccess = await hasAdminAccess(session.userId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [enabled, message] = await Promise.all([
      isMaintenanceMode(),
      getMaintenanceMessage()
    ]);

    return NextResponse.json({ enabled, message });

  } catch (error) {
    console.error("Error checking maintenance mode:", error);
    return NextResponse.json(
      { error: "Failed to check maintenance mode" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin access
    const hasAccess = await hasAdminAccess(session.userId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { enabled, message } = body;

    await setMaintenanceMode(enabled, message, session.userId);

    return NextResponse.json({ 
      success: true, 
      enabled, 
      message: message || 'The system is currently under maintenance. Please try again later.' 
    });

  } catch (error) {
    console.error("Error setting maintenance mode:", error);
    return NextResponse.json(
      { error: "Failed to set maintenance mode" },
      { status: 500 }
    );
  }
}
