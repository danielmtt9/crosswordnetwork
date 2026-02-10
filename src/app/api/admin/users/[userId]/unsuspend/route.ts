import { NextRequest, NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { unsuspendUser, hasAdminAccess } from "@/lib/admin";

export async function POST(
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

    await unsuspendUser(userId, session.userId);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Error unsuspending user:", error);
    if (error instanceof Error) {
      if (error.message.includes("not suspended") || error.message.includes("not found")) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }
    return NextResponse.json(
      { error: "Failed to unsuspend user" },
      { status: 500 }
    );
  }
}
