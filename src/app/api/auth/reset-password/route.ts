import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json();
    if (!token || !password) return NextResponse.json({ message: "Token and password required" }, { status: 400 });

    const pr = await prisma.passwordResetToken.findUnique({ where: { token } });
    if (!pr || pr.expiresAt < new Date()) {
      return NextResponse.json({ message: "Invalid or expired token" }, { status: 400 });
    }

    const hash = await bcrypt.hash(password, 12);
    await prisma.user.update({ where: { id: pr.userId }, data: { password: hash } });
    await prisma.passwordResetToken.delete({ where: { token } });

    return NextResponse.json({ message: "Password updated" });
  } catch (e) {
    return NextResponse.json({ message: "Unable to reset password" }, { status: 500 });
  }
}


