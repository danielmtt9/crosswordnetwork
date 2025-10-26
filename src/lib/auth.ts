import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/authOptions';

export async function getAuthSession() {
  return await getServerSession(authOptions);
}

export function isPremiumUser(session: any): boolean {
  return session?.user?.role === 'PREMIUM' || session?.user?.role === 'ADMIN';
}

export { authOptions };