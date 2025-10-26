import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { sendPasswordResetEmail } from "@/lib/email";

export async function POST(req: Request) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ message: "Email required" }, { status: 400 });
  const lower = String(email).toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: lower } });
  if (user) {
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 30);
    await prisma.passwordResetToken.create({ data: { userId: user.id, token, expiresAt } });
    const url = new URL(`/reset-password/${token}`, process.env.NEXTAUTH_URL || "http://localhost:3000");
    await sendPasswordResetEmail({ to: lower, resetUrl: url.toString() });
  }
  return NextResponse.json({ message: "If that email exists, a reset link was sent." });
}


