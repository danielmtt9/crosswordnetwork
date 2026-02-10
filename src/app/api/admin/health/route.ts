import { NextRequest, NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session || (session as any).role !== 'ADMIN') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Check database connectivity
    let dbStatus = 'healthy';
    let dbLatency = 0;
    try {
      const start = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      dbLatency = Date.now() - start;
    } catch (error) {
      dbStatus = 'unhealthy';
      console.error("Database health check failed:", error);
    }

    // Check email service (mock for now)
    let emailStatus = 'healthy';
    try {
      // TODO: Implement real email service health check
      // await emailService.ping();
    } catch (error) {
      emailStatus = 'unhealthy';
    }

    // Check file storage (mock for now)
    let storageStatus = 'healthy';
    try {
      // TODO: Implement real file storage health check
      // await storageService.ping();
    } catch (error) {
      storageStatus = 'unhealthy';
    }

    // Get system metrics
    const [userCount, puzzleCount, activeUsers] = await Promise.all([
      prisma.user.count(),
      prisma.puzzle.count(),
      prisma.user.count({
        where: {
          updatedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      })
    ]);

    const health = {
      status: dbStatus === 'healthy' && emailStatus === 'healthy' && storageStatus === 'healthy' ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        database: {
          status: dbStatus,
          latency: dbLatency,
          message: dbStatus === 'healthy' ? 'Connected' : 'Connection failed'
        },
        email: {
          status: emailStatus,
          message: emailStatus === 'healthy' ? 'Service available' : 'Service unavailable'
        },
        storage: {
          status: storageStatus,
          message: storageStatus === 'healthy' ? 'Storage accessible' : 'Storage inaccessible'
        }
      },
      metrics: {
        totalUsers: userCount,
        totalPuzzles: puzzleCount,
        activeUsers24h: activeUsers,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        nodeVersion: process.version
      }
    };

    return NextResponse.json(health);
  } catch (error) {
    console.error("Error checking system health:", error);
    return NextResponse.json(
      { 
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed'
      },
      { status: 500 }
    );
  }
}
