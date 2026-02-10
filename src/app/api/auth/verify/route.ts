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
      select: { id: true, email: true, emailVerified: true, name: true }
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { error: "Email is already verified" },
        { status: 400 }
      );
    }

    // Generate verification token
    const { token, expiresAt } = emailSecurity.generateTokenWithExpiration(24);
    const hashedToken = emailSecurity.hashToken(token);

    // Store verification token
    await prisma.emailVerification.create({
      data: {
        userId: user.id,
        token: hashedToken,
        expiresAt,
        email
      }
    });

    // Generate verification URL
    const verificationUrl = `${process.env.NEXTAUTH_URL}/verify-email?token=${token}`;

    // Get email template
    const template = emailTemplateManager.getTemplate('verify-email');
    if (!template) {
      return NextResponse.json(
        { error: "Email template not found" },
        { status: 500 }
      );
    }

    // Send verification email
    const emailResult = await emailService.sendEmail({
      to: email,
      subject: "Verify your email address - Crossword Network",
      template,
      data: {
        verificationUrl,
        userName: user.name || 'User',
        expiresIn: 24
      }
    });

    if (!emailResult.success) {
      return NextResponse.json(
        { error: "Failed to send verification email" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Verification email sent successfully"
    });

  } catch (error) {
    console.error("Email verification error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: "Verification token is required" },
        { status: 400 }
      );
    }

    // Hash the token to compare with stored hash
    const hashedToken = emailSecurity.hashToken(token);

    // Find verification record
    const verification = await prisma.emailVerification.findFirst({
      where: {
        token: hashedToken,
        expiresAt: {
          gt: new Date()
        }
      },
      include: {
        user: {
          select: { id: true, email: true, emailVerified: true }
        }
      }
    });

    if (!verification) {
      return NextResponse.json(
        { error: "Invalid or expired verification token" },
        { status: 400 }
      );
    }

    // Check if email is already verified
    if (verification.user.emailVerified) {
      return NextResponse.json(
        { error: "Email is already verified" },
        { status: 400 }
      );
    }

    // Update user email verification status
    await prisma.user.update({
      where: { id: verification.userId },
      data: { emailVerified: true }
    });

    // Mark verification as used
    await prisma.emailVerification.update({
      where: { id: verification.id },
      data: { usedAt: new Date() }
    });

    return NextResponse.json({
      success: true,
      message: "Email verified successfully"
    });

  } catch (error) {
    console.error("Email verification error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}