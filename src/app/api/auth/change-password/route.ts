import { NextRequest, NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import { createAuditLog } from "@/lib/auditLog";

export async function POST(request: NextRequest) {
  const session = await getAuthSession();
  if (!session || !(session as any).userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { password } = await request.json();
  if (!password || typeof password !== 'string' || password.length < 8) {
    return NextResponse.json({ error: "Invalid password" }, { status: 400 });
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  await prisma.user.update({
    where: { id: (session as any).userId as string },
    data: {
      password: hashedPassword,
    },
  });

  // Record audit that the password has been changed so future logins won't prompt
  await createAuditLog({
    actorUserId: (session as any).userId as string,
    action: 'PASSWORD_CHANGED',
    entityType: 'User',
    entityId: (session as any).userId as string,
  });

  return NextResponse.json({ success: true });
}

