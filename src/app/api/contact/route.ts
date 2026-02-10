import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { EmailService } from '@/lib/email';
import { emailTemplateManager } from '@/lib/emailTemplates';

const schema = z.object({
  email: z.string().email().max(254),
  subject: z.string().min(3).max(160),
  message: z.string().min(10).max(5000),
  company: z.string().optional().default(''), // honeypot
  startedAt: z.number().optional(),
});

type RateLimitState = { count: number; resetAt: number };
const rateLimit = new Map<string, RateLimitState>();

function getIp(req: NextRequest): string {
  const xf = req.headers.get('x-forwarded-for');
  if (xf) return xf.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

function checkRateLimit(ip: string): { ok: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const windowMs = 60_000;
  const limit = 5;
  const state = rateLimit.get(ip);
  if (!state || now > state.resetAt) {
    rateLimit.set(ip, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  if (state.count >= limit) {
    return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((state.resetAt - now) / 1000)) };
  }
  state.count += 1;
  rateLimit.set(ip, state);
  return { ok: true };
}

export async function POST(req: NextRequest) {
  const ip = getIp(req);
  const rl = checkRateLimit(ip);
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds || 60) } }
    );
  }

  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid form fields.' }, { status: 400 });
  }

  const { email, subject, message, company, startedAt } = parsed.data;

  // Honeypot
  if (company && company.trim().length > 0) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  // Minimum time-to-submit (best-effort)
  if (typeof startedAt === 'number') {
    const elapsed = Date.now() - startedAt;
    if (elapsed >= 0 && elapsed < 1500) {
      return NextResponse.json({ error: 'Please try again.' }, { status: 400 });
    }
  }

  const svc = new EmailService();
  const ua = req.headers.get('user-agent') || '';
  const referer = req.headers.get('referer') || '';
  const createdAt = new Date().toISOString();

  const template = emailTemplateManager.getTemplate('contact-us');
  if (!template) {
    return NextResponse.json({ error: 'Email template not configured.' }, { status: 500 });
  }

  const result = await svc.sendEmail({
    to: 'support@crossword.network',
    subject: `[crossword.network] ${subject}`,
    template,
    rateLimitKey: email.toLowerCase(),
    data: {
      fromEmail: email,
      subject,
      message,
      ip,
      userAgent: ua,
      pageUrl: referer,
      createdAt,
    },
    tags: {
      type: 'contact',
    },
  });

  if (!result.success) {
    return NextResponse.json({ error: 'Failed to send message. Please try again.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
