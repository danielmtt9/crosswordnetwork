import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import { sendVerificationEmail } from "@/lib/email";
import { generateUniqueUsername } from "@/lib/usernameGenerator";

export async function POST(req: Request) {
    try {
        const { email, name, password } = await req.json();
        if (!email || !password)
            return NextResponse.json(
                { message: "Email and password required" },
                { status: 400 },
            );
        const lower = String(email).toLowerCase();

        const existing = await prisma.user.findUnique({
            where: { email: lower },
        });
        if (existing)
            return NextResponse.json(
                { message: "Email already registered" },
                { status: 400 },
            );

    const hash = await bcrypt.hash(password, 12);
    const username = await generateUniqueUsername();
    const user = await prisma.user.create({ 
      data: { 
        email: lower, 
        name: name || null, 
        username,
        password: hash 
      } 
    });

    const token = randomUUID();
    const expires = new Date(Date.now() + 1000 * 60 * 60 * 24);
    await prisma.verificationToken.create({ data: { identifier: lower, token, expires } });

    const url = new URL("/api/auth/verify", process.env.NEXTAUTH_URL || "http://localhost:3000");
    url.searchParams.set("token", token);
    url.searchParams.set("email", lower);
    await sendVerificationEmail(lower, url.toString(), name || 'User');

    return NextResponse.json({ message: "Verification email sent" });
  } catch (e) {
    return NextResponse.json({ message: "Signup failed" }, { status: 500 });
  }
}
