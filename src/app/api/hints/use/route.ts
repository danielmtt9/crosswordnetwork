import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { computeRollingWindowLimit, HINT_LIMITS_PER_HOUR, HINT_WINDOW_SECONDS, type HintKind } from '@/lib/hints/rateLimit';

const schema = z.object({
  hintType: z.enum(['letter', 'word']),
});

function getHintLabel(hintType: HintKind): string {
  return hintType === 'word' ? 'Reveal Word' : 'Reveal Letter';
}

export async function POST(req: NextRequest) {
  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const hintType = parsed.data.hintType as HintKind;
  const limit = HINT_LIMITS_PER_HOUR[hintType];

  const session = await auth();
  const userId = session?.user?.id || null;

  let guestId = req.cookies.get('cw_guest_id')?.value || null;
  const shouldSetGuestCookie = !userId && !guestId;
  if (shouldSetGuestCookie) {
    guestId = randomUUID();
  }

  if (!userId && !guestId) {
    return NextResponse.json({ error: 'Unable to identify user.' }, { status: 400 });
  }

  const nowMs = Date.now();
  const since = new Date(nowMs - HINT_WINDOW_SECONDS * 1000);

  try {
    const where = userId
      ? { userId, hintType, createdAt: { gte: since } }
      : { guestId: guestId!, hintType, createdAt: { gte: since } };

    // Fetch only up to `limit` events, sorted ascending; this is enough to compute the window state.
    const events = await prisma.hintUsageEvent.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
      take: limit,
    });

    const limitState = computeRollingWindowLimit({
      nowMs,
      windowSeconds: HINT_WINDOW_SECONDS,
      limit,
      eventTimesAsc: events.map((e) => e.createdAt),
    });

    if (!limitState.ok) {
      const res = NextResponse.json(
        {
          error: `${getHintLabel(hintType)} limit reached`,
          retryAfterSeconds: limitState.retryAfterSeconds,
        },
        { status: 429, headers: { 'Retry-After': String(limitState.retryAfterSeconds) } }
      );

      if (shouldSetGuestCookie && guestId) {
        res.cookies.set('cw_guest_id', guestId, {
          httpOnly: true,
          sameSite: 'lax',
          secure: req.nextUrl.protocol === 'https:',
          path: '/',
          maxAge: 60 * 60 * 24 * 365,
        });
      }

      return res;
    }

    // Record this hint use now.
    await prisma.hintUsageEvent.create({
      data: {
        userId: userId ?? undefined,
        guestId: userId ? undefined : guestId ?? undefined,
        hintType,
      },
    });

    const res = NextResponse.json(
      {
        ok: true,
        remaining: limitState.remaining,
        limit,
        windowSeconds: HINT_WINDOW_SECONDS,
      },
      { status: 200 }
    );

    if (shouldSetGuestCookie && guestId) {
      res.cookies.set('cw_guest_id', guestId, {
        httpOnly: true,
        sameSite: 'lax',
        secure: req.nextUrl.protocol === 'https:',
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
      });
    }

    return res;
  } catch (err) {
    console.error('[api/hints/use] error:', err);
    const res = NextResponse.json({ error: 'Failed to process hint request.' }, { status: 500 });
    if (shouldSetGuestCookie && guestId) {
      res.cookies.set('cw_guest_id', guestId, {
        httpOnly: true,
        sameSite: 'lax',
        secure: req.nextUrl.protocol === 'https:',
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
      });
    }
    return res;
  }
}

