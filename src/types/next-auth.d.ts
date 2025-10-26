import "next-auth";

declare module "next-auth" {
  interface Session {
    userId?: string;
    role?: string;
    subscriptionStatus?: string;
    trialEndsAt?: Date;
    requirePasswordChange?: boolean;
  }
}

