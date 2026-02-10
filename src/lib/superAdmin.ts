import { prisma } from './prisma';

export async function isSuperAdmin(userId: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        role: true, 
        accountStatus: true,
        email: true 
      }
    });

    // Super admin must be ADMIN role, ACTIVE status, and have @crossword.network email
    return (
      user?.role === 'ADMIN' && 
      user?.accountStatus === 'ACTIVE' &&
      user?.email?.endsWith('@crossword.network') === true
    );
  } catch (error) {
    console.error('Error checking super admin status:', error);
    return false;
  }
}

export async function getSuperAdminUsers() {
  try {
    return await prisma.user.findMany({
      where: {
        role: 'ADMIN',
        accountStatus: 'ACTIVE',
        email: {
          endsWith: '@crossword.network'
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        lastLoginAt: true
      }
    });
  } catch (error) {
    console.error('Error fetching super admin users:', error);
    return [];
  }
}