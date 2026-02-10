import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { emailService } from '@/lib/email';
import { emailTemplateManager } from '@/lib/emailTemplates';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';

    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json(
        { success: false, message: 'Please provide a valid email address.' },
        { status: 400 }
      );
    }

    const existingEntry = await prisma.waitlistEntry.findUnique({
      where: { email }
    });

    if (existingEntry) {
      return NextResponse.json({
        success: true,
        message: 'You are already on the waitlist. Keep an eye on your inbox for updates!'
      });
    }

    await prisma.waitlistEntry.create({
      data: { email }
    });

    const totalCount = await prisma.waitlistEntry.count();

    const confirmationTemplate = emailTemplateManager.getTemplate('waitlist-confirmation');
    if (confirmationTemplate) {
      await emailService.sendEmail({
        to: email,
        subject: 'You are on the Crossword.Network waitlist 🎉',
        template: confirmationTemplate,
        data: {
          email
        },
        tags: {
          category: 'waitlist',
          type: 'confirmation'
        }
      });
    }

    const adminEmail = process.env.ADMIN_EMAIL;
    const notificationTemplate = emailTemplateManager.getTemplate('waitlist-notification');

    if (adminEmail && notificationTemplate) {
      await emailService.sendEmail({
        to: adminEmail,
        subject: `New waitlist signup: ${email}`,
        template: notificationTemplate,
        data: {
          email,
          totalCount,
          timestamp: new Date().toISOString()
        },
        tags: {
          category: 'waitlist',
          type: 'admin-notification'
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Thanks for joining the waitlist! Check your email for confirmation.'
    });
  } catch (error) {
    console.error('Waitlist signup error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'We could not add you to the waitlist right now. Please try again later.'
      },
      { status: 500 }
    );
  }
}

