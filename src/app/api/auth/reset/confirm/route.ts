import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { EmailSecurity } from "@/lib/emailSecurity";
import bcrypt from "bcrypt";

const emailSecurity = new EmailSecurity();

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token and password are required" },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    // Hash the token to compare with stored hash
    const hashedToken = emailSecurity.hashToken(token);

    // Find reset record
    const resetRecord = await prisma.passwordReset.findFirst({
      where: {
        token: hashedToken,
        expiresAt: {
          gt: new Date()
        },
        usedAt: null
      },
      include: {
        user: {
          select: { id: true, email: true }
        }
      }
    });

    if (!resetRecord) {
      return NextResponse.json(
        { error: "Invalid or expired reset token" },
        { status: 400 }
      );
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update user password
    await prisma.user.update({
      where: { id: resetRecord.userId },
      data: { 
        password: hashedPassword,
        // Force password change on next login if required
        requirePasswordChange: false
      }
    });

    // Mark reset token as used
    await prisma.passwordReset.update({
      where: { id: resetRecord.id },
      data: { usedAt: new Date() }
    });

    // Invalidate all other reset tokens for this user
    await prisma.passwordReset.updateMany({
      where: {
        userId: resetRecord.userId,
        usedAt: null
      },
      data: { usedAt: new Date() }
    });

    return NextResponse.json({
      success: true,
      message: "Password reset successfully"
    });

  } catch (error) {
    console.error("Password reset confirmation error:", error);
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
        { error: "Reset token is required" },
        { status: 400 }
      );
    }

    // Hash the token to compare with stored hash
    const hashedToken = emailSecurity.hashToken(token);

    // Find reset record
    const resetRecord = await prisma.passwordReset.findFirst({
      where: {
        token: hashedToken,
        expiresAt: {
          gt: new Date()
        },
        usedAt: null
      },
      include: {
        user: {
          select: { id: true, email: true }
        }
      }
    });

    if (!resetRecord) {
      return NextResponse.json(
        { error: "Invalid or expired reset token" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Reset token is valid",
      email: resetRecord.user.email
    });

  } catch (error) {
    console.error("Password reset token validation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
