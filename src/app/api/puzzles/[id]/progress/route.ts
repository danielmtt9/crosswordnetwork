import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

import { getAuthSession } from "@/lib/auth";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export async function GET(
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

    // Get user progress for this puzzle
    const progress = await prisma.userProgress.findFirst({
      where: {
        userId: userId,
        puzzleId: puzzleId,
      },
      select: {
        id: true,
        completedCells: true,
        completedAt: true,
        completionTimeSeconds: true,
        hintsUsed: true,
        score: true,
        lastPlayedAt: true,
        isCompleted: true,
        startedAt: true,
        timesPlayed: true,
        bestTimeSeconds: true,
        totalAccuracy: true,
      },
    });

    if (!progress) {
      // Return empty progress if none exists
      return NextResponse.json({
        progress: null,
        completedAt: null,
        completionTimeSeconds: null,
        hintsUsed: 0,
        score: 0,
        lastPlayedAt: null,
        isCompleted: false,
        startedAt: null,
        timesPlayed: 0,
        bestTimeSeconds: null,
        totalAccuracy: 100,
      });
    }

    // Enforce 7-day expiration for unfinished puzzles.
    if (!progress.isCompleted) {
      const cutoff = new Date(Date.now() - SEVEN_DAYS_MS);
      if (progress.startedAt && progress.startedAt < cutoff) {
        await prisma.userProgress.deleteMany({
          where: {
            userId,
            puzzleId,
          },
        });
        return NextResponse.json({
          progress: null,
          completedAt: null,
          completionTimeSeconds: null,
          hintsUsed: 0,
          score: 0,
          lastPlayedAt: null,
          isCompleted: false,
          startedAt: null,
          timesPlayed: 0,
          bestTimeSeconds: null,
          totalAccuracy: 100,
          expired: true,
        });
      }
    }

    return NextResponse.json({
      progress: progress,
      completedAt: progress.completedAt,
      completionTimeSeconds: progress.completionTimeSeconds,
      hintsUsed: progress.hintsUsed,
      score: progress.score,
      lastPlayedAt: progress.lastPlayedAt,
      isCompleted: progress.isCompleted,
      startedAt: progress.startedAt,
      timesPlayed: progress.timesPlayed,
      bestTimeSeconds: progress.bestTimeSeconds,
      totalAccuracy: progress.totalAccuracy,
    });
  } catch (error) {
    console.error("Error fetching puzzle progress:", error);
    return NextResponse.json(
      { error: "Failed to fetch puzzle progress" },
      { status: 500 }
    );
  }
}

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
    const { completedCells, completionTimeSeconds, hintsUsed, score, isCompleted, gridState, isAutoSave } = body;

    const now = new Date();
    
    // Prepare auto-save tracking updates if this is an auto-save
    const autoSaveUpdates = isAutoSave ? {
      autoSaveCount: { increment: 1 },
      lastAutoSave: now,
    } : {};

    // Upsert user progress
    const userProgress = await prisma.userProgress.upsert({
      where: {
        userId_puzzleId: {
          userId: userId,
          puzzleId: puzzleId,
        },
      },
      update: {
        completedCells: completedCells ? JSON.stringify(completedCells) : null,
        completionTimeSeconds: completionTimeSeconds || null,
        hintsUsed: hintsUsed || 0,
        score: score || 0,
        isCompleted: isCompleted || false,
        lastPlayedAt: now,
        completedAt: isCompleted ? now : null,
        ...autoSaveUpdates,
      },
      create: {
        userId: userId,
        puzzleId: puzzleId,
        completedCells: completedCells ? JSON.stringify(completedCells) : null,
        completionTimeSeconds: completionTimeSeconds || null,
        hintsUsed: hintsUsed || 0,
        score: score || 0,
        isCompleted: isCompleted || false,
        lastPlayedAt: now,
        completedAt: isCompleted ? now : null,
        autoSaveCount: isAutoSave ? 1 : 0,
        lastAutoSave: isAutoSave ? now : null,
      },
    });

    return NextResponse.json({
      success: true,
      progress: userProgress,
    });
  } catch (error) {
    console.error("Error saving puzzle progress:", error);
    return NextResponse.json(
      { error: "Failed to save puzzle progress" },
      { status: 500 }
    );
  }
}
