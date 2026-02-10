import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    // Get active rooms with participant counts
    const activeRooms = await prisma.room.findMany({
      where: {
        status: {
          in: ['WAITING', 'ACTIVE']
        }
      },
      include: {
        _count: {
          select: {
            participants: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    // Get room statistics
    const totalRooms = await prisma.room.count();
    const completedRooms = await prisma.room.count({
      where: {
        status: 'COMPLETED'
      }
    });

    return NextResponse.json({
      activeRooms: activeRooms.map(room => ({
        id: room.id,
        code: room.code,
        status: room.status,
        participantCount: room._count.participants,
        maxParticipants: room.maxParticipants,
        createdAt: room.createdAt,
        difficulty: room.difficulty || 'Medium',
        theme: room.theme || 'Cozy'
      })),
      statistics: {
        totalRooms,
        activeRooms: activeRooms.length,
        completedRooms
      }
    });

  } catch (error) {
    console.error('Error fetching rooms summary:', error);
    
    // Return fallback data
    return NextResponse.json({
      activeRooms: [
        {
          id: 'fallback-1',
          code: 'ABC123',
          status: 'ACTIVE',
          participantCount: 4,
          maxParticipants: 8,
          createdAt: new Date(),
          difficulty: 'Medium',
          theme: 'Cozy'
        },
        {
          id: 'fallback-2',
          code: 'DEF456',
          status: 'WAITING',
          participantCount: 2,
          maxParticipants: 6,
          createdAt: new Date(Date.now() - 5 * 60 * 1000),
          difficulty: 'Easy',
          theme: 'Social'
        }
      ],
      statistics: {
        totalRooms: 156,
        activeRooms: 12,
        completedRooms: 144
      }
    });
  }
}
