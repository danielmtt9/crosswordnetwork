import { NextRequest, NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { 
  toggleFeatureFlag, 
  rollbackFeatureFlag,
  getFeatureFlagHistory,
  hasAdminAccess 
} from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ flagId: string }> }
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

    const { flagId } = await params;
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'toggle':
        const toggledFlag = await toggleFeatureFlag(flagId, session.userId);
        return NextResponse.json({ flag: toggledFlag });

      case 'rollback':
        const { historyId } = body;
        if (!historyId) {
          return NextResponse.json(
            { error: "History ID is required for rollback" },
            { status: 400 }
          );
        }
        const rolledBackFlag = await rollbackFeatureFlag(flagId, historyId, session.userId);
        return NextResponse.json({ flag: rolledBackFlag });

      default:
        return NextResponse.json(
          { error: "Invalid action. Supported actions: toggle, rollback" },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error("Error performing feature flag action:", error);
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        );
      }
    }
    return NextResponse.json(
      { error: "Failed to perform feature flag action" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ flagId: string }> }
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

    const { flagId } = await params;
    const { searchParams } = new URL(request.url);
    const includeHistory = searchParams.get('includeHistory') === 'true';

    const flag = await prisma.featureFlag.findUnique({
      where: { id: flagId }
    });

    if (!flag) {
      return NextResponse.json(
        { error: "Feature flag not found" },
        { status: 404 }
      );
    }

    let history = null;
    if (includeHistory) {
      history = await getFeatureFlagHistory(flagId);
    }

    return NextResponse.json({ 
      flag, 
      ...(history && { history }) 
    });

  } catch (error) {
    console.error("Error fetching feature flag details:", error);
    return NextResponse.json(
      { error: "Failed to fetch feature flag details" },
      { status: 500 }
    );
  }
}
