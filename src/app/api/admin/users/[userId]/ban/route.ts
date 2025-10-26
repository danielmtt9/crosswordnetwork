import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { banUser, hasAdminAccess } from "@/lib/admin";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
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
    const { reason } = body;

    if (!reason) {
      return NextResponse.json(
        { error: "Ban reason is required" },
        { status: 400 }
      );
    }

    await banUser(userId, reason, session.userId);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Error banning user:", error);
    if (error instanceof Error) {
      if (error.message.includes("Cannot ban")) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }
    return NextResponse.json(
      { error: "Failed to ban user" },
      { status: 500 }
    );
  }
}
