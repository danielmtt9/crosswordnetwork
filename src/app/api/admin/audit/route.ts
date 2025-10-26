import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
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
