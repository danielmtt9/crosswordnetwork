import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export async function GET() {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ puzzles: [], expiresInDays: 7 }, { status: 401 });
    }

    const userId = (session as any).userId;
    if (!userId) {
      return NextResponse.json({ puzzles: [], expiresInDays: 7 }, { status: 401 });
    }

    const now = new Date();
    const cutoff = new Date(now.getTime() - SEVEN_DAYS_MS);

    // Clean up expired in-progress puzzles so they don't show up.
    await prisma.userProgress.deleteMany({
      where: {
        userId,
        isCompleted: false,
        startedAt: { lt: cutoff },
      },
    });

    const progressRows = await prisma.userProgress.findMany({
      where: {
        userId,
        isCompleted: false,
        startedAt: { gte: cutoff },
      },
      orderBy: [{ lastPlayedAt: 'desc' }],
      take: 50,
      select: {
        puzzleId: true,
        completedCells: true,
        hintsUsed: true,
        startedAt: true,
        lastPlayedAt: true,
        lastAutoSave: true,
      },
    });

    const puzzleIds = Array.from(new Set(progressRows.map((r) => r.puzzleId)));
    const puzzles = await prisma.puzzle.findMany({
      where: { id: { in: puzzleIds }, is_active: true },
      select: {
        id: true,
        title: true,
        description: true,
        difficulty: true,
        category: true,
        estimated_solve_time: true,
        upload_date: true,
      },
    });
    const puzzleById = new Map(puzzles.map((p) => [p.id, p]));

    const items = progressRows
      .map((r) => {
        const p = puzzleById.get(r.puzzleId);
        if (!p) return null;

        let filledCells = 0;
        try {
          if (r.completedCells) {
            const parsed = JSON.parse(r.completedCells);
            if (parsed && typeof parsed === 'object') filledCells = Object.keys(parsed).length;
          }
        } catch {
          // ignore parse failures
        }

        const expiresAt = new Date(new Date(r.startedAt).getTime() + SEVEN_DAYS_MS);
        const remainingMs = Math.max(0, expiresAt.getTime() - now.getTime());

        return {
          puzzle: p,
          progress: {
            puzzleId: r.puzzleId,
            filledCells,
            hintsUsed: r.hintsUsed,
            startedAt: r.startedAt,
            lastPlayedAt: r.lastPlayedAt,
            lastAutoSave: r.lastAutoSave,
            expiresAt,
            remainingMs,
          },
        };
      })
      .filter(Boolean);

    return NextResponse.json({
      puzzles: items,
      expiresInDays: 7,
      serverTime: now.toISOString(),
    });
  } catch (error) {
    console.error('Error fetching in-progress puzzles:', error);
    return NextResponse.json({ error: 'Failed to fetch in-progress puzzles' }, { status: 500 });
  }
}

