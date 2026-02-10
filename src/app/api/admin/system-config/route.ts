import { NextRequest, NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { 
  getSystemConfigsByCategory,
  setSystemConfig,
  hasAdminAccess 
} from "@/lib/admin";

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'general';

    const configs = await getSystemConfigsByCategory(category);
    return NextResponse.json({ configs });

  } catch (error) {
    console.error("Error fetching system configs:", error);
    return NextResponse.json(
      { error: "Failed to fetch system configs" },
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
    const { key, value, description, category, isPublic } = body;

    if (!key || value === undefined) {
      return NextResponse.json(
        { error: "Key and value are required" },
        { status: 400 }
      );
    }

    const config = await setSystemConfig(
      key,
      value,
      description || '',
      category || 'general',
      isPublic || false,
      session.userId
    );

    return NextResponse.json({ config });

  } catch (error) {
    console.error("Error setting system config:", error);
    return NextResponse.json(
      { error: "Failed to set system config" },
      { status: 500 }
    );
  }
}
