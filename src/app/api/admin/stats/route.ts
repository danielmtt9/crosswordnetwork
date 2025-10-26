import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getAdminStats } from "@/lib/admin";
import { requireAdminAccess } from "@/lib/accessControl";

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
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