import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

import { getAuthSession } from "@/lib/auth";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const puzzleId = parseInt(id);
    
    if (isNaN(puzzleId)) {
      return NextResponse.json(
        { error: "Invalid puzzle ID" },
        { status: 400 }
      );
    }

    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = (session as any).userId;
    if (!userId) {
      return NextResponse.json(
        { error: "User ID not found" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { 
      gridState, 
      completedCells, 
      hintsUsed, 
      timeElapsed,
      timestamp 
    } = body;

    // Validate required fields
    if (!gridState) {
      return NextResponse.json(
        { error: "Grid state is required" },
        { status: 400 }
      );
    }

    const now = new Date();
    const cutoff = new Date(now.getTime() - SEVEN_DAYS_MS);

    // Get existing progress to check for conflicts
    const existingProgress = await prisma.userProgress.findFirst({
      where: {
        userId: userId,
        puzzleId: puzzleId,
      },
      select: {
        id: true,
        lastAutoSave: true,
        saveHistory: true,
        startedAt: true,
        isCompleted: true,
      },
    });

    // If progress has expired (unfinished), reset it on the next save.
    const hasExpired =
      !!existingProgress &&
      !existingProgress.isCompleted &&
      !!existingProgress.startedAt &&
      existingProgress.startedAt < cutoff;

    // Conflict detection: check if server has newer data
    if (existingProgress?.lastAutoSave && timestamp) {
      const clientTimestamp = new Date(timestamp);
      if (existingProgress.lastAutoSave > clientTimestamp) {
        return NextResponse.json(
          { 
            error: "Conflict detected",
            serverTimestamp: existingProgress.lastAutoSave,
            clientTimestamp: clientTimestamp,
          },
          { status: 409 }
        );
      }
    }

    // Update save history
    let saveHistory: Array<{ timestamp: string; cellsCompleted: number }> = [];
    if (existingProgress?.saveHistory) {
      try {
        saveHistory = JSON.parse(existingProgress.saveHistory);
        // Keep only last 10 saves
        if (saveHistory.length >= 10) {
          saveHistory = saveHistory.slice(-9);
        }
      } catch (e) {
        console.error("Error parsing save history:", e);
      }
    }

    saveHistory.push({
      timestamp: now.toISOString(),
      cellsCompleted: completedCells || 0,
    });

    // Upsert user progress with auto-save tracking
    const userProgress = await prisma.userProgress.upsert({
      where: {
        userId_puzzleId: {
          userId: userId,
          puzzleId: puzzleId,
        },
      },
      update: {
        completedCells: JSON.stringify(gridState),
        hintsUsed: hintsUsed || 0,
        lastPlayedAt: now,
        lastAutoSave: now,
        autoSaveCount: { increment: 1 },
        saveHistory: JSON.stringify(saveHistory),
        completionTimeSeconds: timeElapsed || null,
        ...(hasExpired ? { startedAt: now } : {}),
      },
      create: {
        userId: userId,
        puzzleId: puzzleId,
        completedCells: JSON.stringify(gridState),
        hintsUsed: hintsUsed || 0,
        lastPlayedAt: now,
        lastAutoSave: now,
        autoSaveCount: 1,
        saveHistory: JSON.stringify(saveHistory),
        completionTimeSeconds: timeElapsed || null,
        startedAt: now,
      },
      select: {
        id: true,
        lastAutoSave: true,
        autoSaveCount: true,
      },
    });

    return NextResponse.json({
      success: true,
      saved: true,
      timestamp: userProgress.lastAutoSave,
      autoSaveCount: userProgress.autoSaveCount,
    });
  } catch (error) {
    console.error("Error auto-saving puzzle progress:", error);
    return NextResponse.json(
      { 
        error: "Failed to save puzzle progress",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

// Batch save for offline queue processing
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const puzzleId = parseInt(id);
    
    if (isNaN(puzzleId)) {
      return NextResponse.json(
        { error: "Invalid puzzle ID" },
        { status: 400 }
      );
    }

    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = (session as any).userId;
    if (!userId) {
      return NextResponse.json(
        { error: "User ID not found" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { saves } = body;

    if (!Array.isArray(saves) || saves.length === 0) {
      return NextResponse.json(
        { error: "Invalid batch save request" },
        { status: 400 }
      );
    }

    // Process the most recent save only (optimization)
    const latestSave = saves.reduce((latest, current) => {
      const latestTime = new Date(latest.timestamp);
      const currentTime = new Date(current.timestamp);
      return currentTime > latestTime ? current : latest;
    });

    const now = new Date();

    // Apply the latest save
    const userProgress = await prisma.userProgress.upsert({
      where: {
        userId_puzzleId: {
          userId: userId,
          puzzleId: puzzleId,
        },
      },
      update: {
        completedCells: JSON.stringify(latestSave.gridState),
        hintsUsed: latestSave.hintsUsed || 0,
        lastPlayedAt: now,
        lastAutoSave: now,
        autoSaveCount: { increment: saves.length },
      },
      create: {
        userId: userId,
        puzzleId: puzzleId,
        completedCells: JSON.stringify(latestSave.gridState),
        hintsUsed: latestSave.hintsUsed || 0,
        lastPlayedAt: now,
        lastAutoSave: now,
        autoSaveCount: saves.length,
        startedAt: now,
      },
    });

    return NextResponse.json({
      success: true,
      processed: saves.length,
      timestamp: userProgress.lastAutoSave,
    });
  } catch (error) {
    console.error("Error processing batch save:", error);
    return NextResponse.json(
      { error: "Failed to process batch save" },
      { status: 500 }
    );
  }
}
