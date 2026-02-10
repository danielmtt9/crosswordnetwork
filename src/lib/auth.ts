import { auth } from '@/auth';

export async function getAuthSession() {
  const session = await auth();
  // Convert NextAuth v5 session to compatible format
  if (session?.user) {
    return {
      ...session,
      user: {
        ...session.user,
        id: session.user.id || session.userId,
      },
      userId: session.user.id || session.userId,
      role: (session as any).role || session.user.role,
    };
  }
  return session;
}
