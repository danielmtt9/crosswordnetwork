import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const cronSecret = request.headers.get('x-cron-secret');
    const expectedSecret = process.env.CRON_SECRET;
    
    if (expectedSecret && cronSecret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Mark expired rooms
    const expiredRooms = await prisma.multiplayerRoom.updateMany({
      where: {
        status: { in: ['WAITING', 'ACTIVE'] },
        createdAt: { lt: sevenDaysAgo }
      },
      data: { status: 'EXPIRED' }
    });

    // Delete expired rooms older than 30 days (for analytics)
    const deletedRooms = await prisma.multiplayerRoom.deleteMany({
      where: {
        status: 'EXPIRED',
        createdAt: { lt: thirtyDaysAgo }
      }
    });

    return NextResponse.json({
      success: true,
      expiredRooms: expiredRooms.count,
      deletedRooms: deletedRooms.count,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error in room cleanup cron:", error);
    return NextResponse.json(
      { error: "Failed to cleanup rooms" },
      { status: 500 }
    );
  }
}
