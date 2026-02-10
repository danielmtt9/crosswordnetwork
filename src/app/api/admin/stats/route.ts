import { NextRequest, NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { getAdminStats } from "@/lib/admin";
import { requireAdminAccess } from "@/lib/accessControl";

export async function GET(_request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin access with detailed logging
    const accessResult = await requireAdminAccess(session.userId);

    const stats = await getAdminStats();
    return NextResponse.json(stats);

  } catch (error) {
    console.error("Error fetching admin stats:", error);
    
    // Handle access control errors
    if (error.message.includes('Access denied')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to fetch admin stats" },
      { status: 500 }
    );
  }
}