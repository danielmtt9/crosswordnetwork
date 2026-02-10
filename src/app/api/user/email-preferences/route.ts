import { NextRequest, NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user email preferences
    const preferences = await prisma.emailPreferences.findUnique({
      where: { userId: session.userId }
    });

    const defaultPreferences = {
      marketing: true,
      notifications: true,
      frequency: 'immediate' as const,
      achievements: true,
      leaderboards: true,
      security: true
    };

    return NextResponse.json({
      preferences: preferences || defaultPreferences
    });

  } catch (error) {
    console.error("Get email preferences error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { preferences } = await request.json();

    if (!preferences) {
      return NextResponse.json(
        { error: "Preferences data is required" },
        { status: 400 }
      );
    }

    // Validate preferences structure
    const validKeys = ['marketing', 'notifications', 'frequency', 'achievements', 'leaderboards', 'security'];
    const hasValidKeys = validKeys.every(key => key in preferences);
    
    if (!hasValidKeys) {
      return NextResponse.json(
        { error: "Invalid preferences structure" },
        { status: 400 }
      );
    }

    // Validate frequency value
    const validFrequencies = ['immediate', 'daily', 'weekly'];
    if (!validFrequencies.includes(preferences.frequency)) {
      return NextResponse.json(
        { error: "Invalid frequency value" },
        { status: 400 }
      );
    }

    // Upsert email preferences
    const emailPreferences = await prisma.emailPreferences.upsert({
      where: { userId: session.userId },
      update: {
        marketing: Boolean(preferences.marketing),
        notifications: Boolean(preferences.notifications),
        frequency: preferences.frequency,
        achievements: Boolean(preferences.achievements),
        leaderboards: Boolean(preferences.leaderboards),
        security: Boolean(preferences.security),
        updatedAt: new Date()
      },
      create: {
        userId: session.userId,
        marketing: Boolean(preferences.marketing),
        notifications: Boolean(preferences.notifications),
        frequency: preferences.frequency,
        achievements: Boolean(preferences.achievements),
        leaderboards: Boolean(preferences.leaderboards),
        security: Boolean(preferences.security)
      }
    });

    return NextResponse.json({
      success: true,
      preferences: emailPreferences
    });

  } catch (error) {
    console.error("Update email preferences error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
