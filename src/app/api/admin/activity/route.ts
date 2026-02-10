import { NextRequest, NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { getUserActivity, hasAdminAccess } from "@/lib/admin";

export async function GET(_request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin access
    const isAdmin = await hasAdminAccess(session.userId);
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const activity = await getUserActivity();
    return NextResponse.json(activity);

  } catch (error) {
    console.error("Error fetching admin activity:", error);
    
    // Handle access control errors
    if (error instanceof Error && error.message.includes('Access denied')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to fetch admin activity" },
      { status: 500 }
    );
  }
}