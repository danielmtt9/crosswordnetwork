import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { getUserAccessLevel, requirePermission } from "@/lib/accessControl";

/**
 * Database access control levels
 */
export enum DatabaseAccessLevel {
  NONE = 'NONE',
  READ_OWN = 'READ_OWN',
  READ_ALL = 'READ_ALL',
  WRITE_OWN = 'WRITE_OWN',
  WRITE_ALL = 'WRITE_ALL',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN'
}

/**
 * Map user access levels to database access levels
 */
export function mapToDatabaseAccessLevel(userLevel: string): DatabaseAccessLevel {
  switch (userLevel) {
    case 'SUPER_ADMIN':
      return DatabaseAccessLevel.SUPER_ADMIN;
    case 'ADMIN':
      return DatabaseAccessLevel.ADMIN;
    case 'USER':
      return DatabaseAccessLevel.READ_OWN;
    case 'NONE':
    default:
      return DatabaseAccessLevel.NONE;
  }
}

/**
 * Check if user can access specific database operations
 */
export async function checkDatabaseAccess(
  userId: string,
  operation: 'read' | 'write' | 'delete',
  resource: 'own' | 'all' | 'admin'
): Promise<boolean> {
  try {
    const accessLevel = await getUserAccessLevel(userId);
    
    if (accessLevel.level === 'NONE') {
      return false;
    }

    // Super admin can do everything
    if (accessLevel.level === 'SUPER_ADMIN') {
      return true;
    }

    // Admin can access admin resources
    if (accessLevel.level === 'ADMIN' && resource === 'admin') {
      return true;
    }

    // Users can access their own resources
    if (accessLevel.level === 'USER' && resource === 'own') {
      return operation === 'read' || operation === 'write';
    }

    // Premium users can access more resources
    if (accessLevel.level === 'USER' && accessLevel.permissions.includes('create:rooms')) {
      if (resource === 'all' && operation === 'read') {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Error checking database access:', error);
    return false;
  }
}

/**
 * Middleware to protect API routes with database access control
 */
export function withDatabaseAccessControl(
  handler: (request: NextRequest, context: any) => Promise<NextResponse>,
  requiredAccess: {
    operation: 'read' | 'write' | 'delete';
    resource: 'own' | 'all' | 'admin';
    permission?: string;
  }
) {
  return async (request: NextRequest, context: any): Promise<NextResponse> => {
    try {
      // Get session
      const session = await getAuthSession();
      if (!session?.userId) {
        return NextResponse.json(
          { error: "Unauthorized - No session" },
          { status: 401 }
        );
      }

      // Check specific permission if provided
      if (requiredAccess.permission) {
        await requirePermission(session.userId, requiredAccess.permission);
      }

      // Check database access
      const hasAccess = await checkDatabaseAccess(
        session.userId,
        requiredAccess.operation,
        requiredAccess.resource
      );

      if (!hasAccess) {
        return NextResponse.json(
          { 
            error: "Forbidden - Insufficient database access",
            details: `Required: ${requiredAccess.operation} access to ${requiredAccess.resource} resources`
          },
          { status: 403 }
        );
      }

      // Add user context to request
      (request as any).user = {
        id: session.userId,
        email: session.user?.email,
        name: session.user?.name
      };

      // Call the original handler
      return await handler(request, context);

    } catch (error) {
      console.error('Database access control error:', error);
      
      // Type-safe error handling: check if error is an Error instance
      if (error instanceof Error) {
        const errorMessage = error.message;
        if (errorMessage.includes('Permission denied') || errorMessage.includes('Access denied')) {
          return NextResponse.json(
            { error: errorMessage },
            { status: 403 }
          );
        }
      }

      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  };
}

/**
 * Log database access attempts
 */
export async function logDatabaseAccess(
  userId: string,
  operation: string,
  resource: string,
  success: boolean,
  details?: any
): Promise<void> {
  try {
    const { prisma } = await import('@/lib/prisma');
    
    await prisma.auditLog.create({
      data: {
        actorUserId: userId,
        action: `DATABASE_${operation.toUpperCase()}`,
        entityType: 'DATABASE_ACCESS',
        entityId: resource,
        after: JSON.stringify({
          operation,
          resource,
          success,
          details,
          timestamp: new Date().toISOString()
        })
      }
    });
  } catch (error) {
    console.error('Error logging database access:', error);
  }
}

/**
 * Rate limiting for database operations
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  userId: string,
  operation: string,
  maxRequests: number = 100,
  windowMs: number = 60000 // 1 minute
): boolean {
  const key = `${userId}:${operation}`;
  const now = Date.now();
  const userLimit = rateLimitMap.get(key);

  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(key, {
      count: 1,
      resetTime: now + windowMs
    });
    return true;
  }

  if (userLimit.count >= maxRequests) {
    return false;
  }

  userLimit.count++;
  return true;
}
