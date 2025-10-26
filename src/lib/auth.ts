import { Session } from "next-auth";

export function isPremiumUser(session: Session | null): boolean {
  if (!session) return false;
  
  // Check role in both user object and session root
  if (session?.user?.role === 'PREMIUM' || (session as any)?.role === 'PREMIUM') {
    return true;
  }
  
  // Check subscription status
  const status = session?.user?.subscriptionStatus || (session as any)?.subscriptionStatus;
  if (status === 'ACTIVE') {
    return true;
  }
  
  // Check trial period
  if (status === 'TRIAL') {
    const trialEnd = session?.user?.trialEndsAt || (session as any)?.trialEndsAt;
    if (trialEnd && new Date(trialEnd) > new Date()) {
      return true;
    }
  }
  
  return false;
}
