import { NextRequest, NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { getUserDetails, hasAdminAccess } from "@/lib/admin";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
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

    const { userId } = await params;
    const userDetails = await getUserDetails(userId);

    return NextResponse.json(userDetails);

  } catch (error) {
    console.error("Error fetching user details:", error);
    if (error instanceof Error && error.message === "User not found") {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Failed to fetch user details" },
      { status: 500 }
    );
  }
}
