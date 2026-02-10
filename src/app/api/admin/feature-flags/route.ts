import { NextRequest, NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { 
  getAllFeatureFlags, 
  createFeatureFlag, 
  updateFeatureFlag,
  hasAdminAccess 
} from "@/lib/admin";
import { isSuperAdmin } from "@/lib/superAdmin";

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

    const flags = await getAllFeatureFlags();
    return NextResponse.json({ flags });

  } catch (error) {
    console.error("Error fetching feature flags:", error);
    return NextResponse.json(
      { error: "Failed to fetch feature flags" },
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
    const { name, description, enabled, rolloutPercentage, targetUsers, targetRoles, conditions } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Feature flag name is required" },
        { status: 400 }
      );
    }

    const flag = await createFeatureFlag(name, description || '', session.userId, {
      enabled: enabled || false,
      rolloutPercentage: rolloutPercentage || 0,
      targetUsers,
      targetRoles,
      conditions
    });

    return NextResponse.json({ flag });

  } catch (error) {
    console.error("Error creating feature flag:", error);
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: "A feature flag with this name already exists" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Failed to create feature flag" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
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
    const { flagId, updates } = body;

    if (!flagId || !updates) {
      return NextResponse.json(
        { error: "Flag ID and updates are required" },
        { status: 400 }
      );
    }

    const flag = await updateFeatureFlag(flagId, updates, session.userId);
    return NextResponse.json({ flag });

  } catch (error) {
    console.error("Error updating feature flag:", error);
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { error: "Feature flag not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "Failed to update feature flag" },
      { status: 500 }
    );
  }
}
