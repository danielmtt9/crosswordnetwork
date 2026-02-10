import { NextRequest, NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validateUsername, isUsernameAvailable } from "@/lib/usernameGenerator";

export async function PATCH(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { username } = await request.json();
    
    if (!username) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }

    // Validate username format
    const validation = validateUsername(username);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Check if username is available
    const available = await isUsernameAvailable(username);
    if (!available) {
      return NextResponse.json({ error: "Username is already taken" }, { status: 409 });
    }

    // Update username
    await prisma.user.update({
      where: { id: session.userId },
      data: { username }
    });

    return NextResponse.json({ success: true, username });
  } catch (error) {
    console.error("Error updating username:", error);
    return NextResponse.json(
      { error: "Failed to update username" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json({ error: "Username parameter is required" }, { status: 400 });
    }

    // Validate username format
    const validation = validateUsername(username);
    if (!validation.valid) {
      return NextResponse.json({ 
        available: false, 
        error: validation.error 
      }, { status: 400 });
    }

    // Check availability
    const available = await isUsernameAvailable(username);
    
    return NextResponse.json({ 
      available,
      username 
    });
  } catch (error) {
    console.error("Error checking username availability:", error);
    return NextResponse.json(
      { error: "Failed to check username availability" },
      { status: 500 }
    );
  }
}
