import { NextRequest } from 'next/server';
import { POST } from './route';

jest.mock('@/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    hintUsageEvent: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  },
}));

import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

const mockAuth = auth as jest.MockedFunction<typeof auth>;
const mockPrisma = prisma as unknown as {
  hintUsageEvent: {
    findMany: jest.Mock;
    create: jest.Mock;
  };
};

function makeRequest(body: any, cookie?: string) {
  return new NextRequest('http://localhost:3000/api/hints/use', {
    method: 'POST',
    headers: cookie ? { cookie } : undefined,
    body: JSON.stringify(body),
  });
}

describe('/api/hints/use', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-02-09T10:00:00.000Z'));
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should set guest cookie on first use (signed out) and allow hint when under limit', async () => {
    mockAuth.mockResolvedValueOnce(null as any);
    mockPrisma.hintUsageEvent.findMany.mockResolvedValueOnce([]);
    mockPrisma.hintUsageEvent.create.mockResolvedValueOnce({ id: 'e1' });

    const req = makeRequest({ hintType: 'letter' });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.limit).toBe(5);
    expect(data.remaining).toBe(4);

    const setCookie = res.headers.get('set-cookie') || '';
    expect(setCookie).toContain('cw_guest_id=');
    expect(setCookie.toLowerCase()).toContain('httponly');
    expect(mockPrisma.hintUsageEvent.create).toHaveBeenCalledTimes(1);
  });

  it('should enforce reveal letter limit (5/hour) for signed-in user', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: 'user-1' } } as any);
    mockPrisma.hintUsageEvent.findMany.mockResolvedValueOnce(
      Array.from({ length: 5 }, (_, i) => ({
        createdAt: new Date(`2026-02-09T09:${30 + i}:00.000Z`),
      }))
    );

    const req = makeRequest({ hintType: 'letter' });
    const res = await POST(req);
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBeTruthy();
    const data = await res.json();
    expect(data.error).toMatch(/Reveal Letter limit reached/i);
    expect(typeof data.retryAfterSeconds).toBe('number');
    expect(data.retryAfterSeconds).toBeGreaterThan(0);
    expect(data.retryAfterSeconds).toBeLessThanOrEqual(3600);
    expect(mockPrisma.hintUsageEvent.create).not.toHaveBeenCalled();
  });

  it('should enforce reveal word limit (2/hour) for signed-in user', async () => {
    mockAuth.mockResolvedValueOnce({ user: { id: 'user-1' } } as any);
    mockPrisma.hintUsageEvent.findMany.mockResolvedValueOnce([
      { createdAt: new Date('2026-02-09T09:10:00.000Z') },
      { createdAt: new Date('2026-02-09T09:20:00.000Z') },
    ]);

    const req = makeRequest({ hintType: 'word' });
    const res = await POST(req);
    expect(res.status).toBe(429);
    const data = await res.json();
    expect(data.error).toMatch(/Reveal Word limit reached/i);
    expect(mockPrisma.hintUsageEvent.create).not.toHaveBeenCalled();
  });

  it('should return 400 for invalid hintType', async () => {
    mockAuth.mockResolvedValueOnce(null as any);
    const req = makeRequest({ hintType: 'nope' });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

