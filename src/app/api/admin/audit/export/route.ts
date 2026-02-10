import { NextRequest, NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasAdminAccess } from "@/lib/admin";

export async function GET(request: NextRequest) {
  try {
    const session = await getAuthSession();
    if (!session?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin access
    const hasAccess = await hasAdminAccess(session.userId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const action = searchParams.get('action');
    const entityType = searchParams.get('entityType');
    const actorUserId = searchParams.get('actorUserId');

    // Build where clause
    const where: any = {};
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }
    
    if (action) {
      where.action = action;
    }
    
    if (entityType) {
      where.entityType = entityType;
    }
    
    if (actorUserId) {
      where.actorUserId = actorUserId;
    }

    // Fetch audit logs with actor information
    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        actor: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10000 // Limit to prevent memory issues
    });

    // Log the export action
    await prisma.auditLog.create({
      data: {
        action: 'AUDIT_LOG_EXPORTED',
        entityType: 'AUDIT_LOG',
        entityId: 'bulk_export',
        actorUserId: session.userId,
        details: {
          format,
          startDate,
          endDate,
          action,
          entityType,
          actorUserId,
          recordCount: logs.length,
          exportTimestamp: new Date().toISOString()
        }
      }
    });

    if (format === 'csv') {
      // Generate CSV
      const csvHeaders = [
        'Timestamp',
        'Actor Name',
        'Actor Email',
        'Action',
        'Entity Type',
        'Entity ID',
        'Before State',
        'After State',
        'IP Address'
      ];

      const csvRows = logs.map(log => [
        log.createdAt.toISOString(),
        log.actor?.name || '',
        log.actor?.email || '',
        log.action,
        log.entityType,
        log.entityId,
        log.before ? JSON.stringify(log.before) : '',
        log.after ? JSON.stringify(log.after) : '',
        log.ip || ''
      ]);

      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.map(field => `"${field}"`).join(','))
      ].join('\n');

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    } else if (format === 'json') {
      // Generate JSON
      const jsonData = {
        exportInfo: {
          exportedAt: new Date().toISOString(),
          exportedBy: session.userId,
          totalRecords: logs.length,
          filters: {
            startDate,
            endDate,
            action,
            entityType,
            actorUserId
          }
        },
        logs: logs.map(log => ({
          id: log.id,
          timestamp: log.createdAt.toISOString(),
          actor: {
            name: log.actor?.name,
            email: log.actor?.email
          },
          action: log.action,
          entityType: log.entityType,
          entityId: log.entityId,
          before: log.before,
          after: log.after,
          ip: log.ip
        }))
      };

      return new NextResponse(JSON.stringify(jsonData, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="audit-logs-${new Date().toISOString().split('T')[0]}.json"`
        }
      });
    } else {
      return NextResponse.json(
        { error: "Invalid format. Supported formats: json, csv" },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error("Error exporting audit logs:", error);
    return NextResponse.json(
      { error: "Failed to export audit logs" },
      { status: 500 }
    );
  }
}
