import { NextRequest, NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getAuthSession();
  if (!session || (session as { role?: string }).role !== 'ADMIN') {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const action = searchParams.get("action");
  const entityType = searchParams.get("entityType");

  const where = {
    ...(action && { action }),
    ...(entityType && { entityType })
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        actor: {
          select: { name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.auditLog.count({ where })
  ]);

  return NextResponse.json({
    logs,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
}
