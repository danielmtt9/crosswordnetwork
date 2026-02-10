import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { emailService } from "@/lib/email";
import { emailTemplateManager } from "@/lib/emailTemplates";
import { EmailSecurity } from "@/lib/emailSecurity";

const emailSecurity = new EmailSecurity();

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email address is required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address format" },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true }
    });

    // Always return success to prevent email enumeration
    // But only send email if user exists
    if (user) {
      // Check for existing active reset token
      const existingReset = await prisma.passwordReset.findFirst({
        where: {
          userId: user.id,
          expiresAt: {
            gt: new Date()
          },
          usedAt: null
        }
      });

      if (existingReset) {
        // Invalidate existing token
        await prisma.passwordReset.update({
          where: { id: existingReset.id },
          data: { usedAt: new Date() }
        });
      }

      // Generate reset token
      const { token, expiresAt } = emailSecurity.generateTokenWithExpiration(1); // 1 hour
      const hashedToken = emailSecurity.hashToken(token);

      // Store reset token
      await prisma.passwordReset.create({
        data: {
          userId: user.id,
          token: hashedToken,
          expiresAt,
          email
        }
      });

      // Generate reset URL
      const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password/${token}`;

      // Get email template
      const template = emailTemplateManager.getTemplate('reset-password');
      if (template) {
        // Send reset email
        await emailService.sendEmail({
          to: email,
          subject: "Reset your password - Crossword Network",
          template,
          data: {
            resetUrl,
            userName: user.name || 'User',
            expiresIn: 1
          }
        });
      }
    }

    // Always return success to prevent email enumeration
    return NextResponse.json({
      success: true,
      message: "If an account with that email exists, a password reset link has been sent"
    });

  } catch (error) {
    console.error("Password reset request error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
