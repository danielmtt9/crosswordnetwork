import { NextRequest, NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { suspendUser, hasAdminAccess } from "@/lib/admin";

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
    const body = await request.json();
    const { reason, expiresAt } = body;

    if (!reason) {
      return NextResponse.json(
        { error: "Suspension reason is required" },
        { status: 400 }
      );
    }

    const expirationDate = expiresAt ? new Date(expiresAt) : null;

    await suspendUser(userId, reason, expirationDate, session.userId);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Error suspending user:", error);
    if (error instanceof Error) {
      if (error.message.includes("Cannot suspend")) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }
    return NextResponse.json(
      { error: "Failed to suspend user" },
      { status: 500 }
    );
  }
}
