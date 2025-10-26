import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
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
      // Generate reset token
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Store reset token
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          token,
          expiresAt
        }
      });

      // Send reset email
      try {
        await sendPasswordResetEmail({
          to: user.email!,
          name: user.name || 'User',
          resetUrl: `${process.env.NEXTAUTH_URL}/reset-password/${token}`
        });
      } catch (emailError) {
        console.error("Error sending password reset email:", emailError);
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({
      message: "If an account with that email exists, we've sent a password reset link."
    });
  } catch (error) {
    console.error("Error requesting password reset:", error);
    return NextResponse.json(
      { error: "Failed to process password reset request" },
      { status: 500 }
    );
  }
}
