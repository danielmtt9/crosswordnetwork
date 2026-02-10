import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session as any).userId;
    if (!userId) {
      return NextResponse.json({ error: 'User ID not found' }, { status: 401 });
    }

    const { id } = await params;
    const puzzleId = parseInt(id, 10);
    if (Number.isNaN(puzzleId)) {
      return NextResponse.json({ error: 'Invalid puzzle ID' }, { status: 400 });
    }

    await prisma.userProgress.deleteMany({
      where: { userId, puzzleId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting in-progress puzzle:', error);
    return NextResponse.json({ error: 'Failed to delete in-progress puzzle' }, { status: 500 });
  }
}

