import NextAuth, { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/superAdmin";
import bcrypt from "bcrypt";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        });
        if (!user?.password) return null;
        const ok = await bcrypt.compare(credentials.password, user.password);
        if (!ok) return null;
        return { id: user.id, name: user.name ?? undefined, email: user.email ?? undefined, image: user.image ?? undefined };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      console.log('JWT Callback - User:', user?.email, 'Account:', account?.provider);
      if (user?.id) {
        token.userId = user.id;
        // Fetch user role and subscription from database
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true, subscriptionStatus: true, trialEndsAt: true }
        });
        token.role = dbUser?.role || 'FREE';
        token.subscriptionStatus = dbUser?.subscriptionStatus || 'TRIAL';
        token.trialEndsAt = dbUser?.trialEndsAt;

        // Production-ready: force super admin to change password until they have changed it once
        let requirePasswordChange = false;
        const email = (user as any).email as string | undefined;
        if (email && isSuperAdmin(email)) {
          const hasChanged = await prisma.auditLog.findFirst({
            where: {
              actorUserId: user.id,
              action: 'PASSWORD_CHANGED'
            },
            select: { id: true }
          });
          requirePasswordChange = !hasChanged;
        }
        (token as any).requirePasswordChange = requirePasswordChange;
      }
      if (account?.provider) token.provider = account.provider;
      return token;
    },
    async session({ session, token }) {
      console.log('Session Callback - Token userId:', token?.userId, 'Session user:', session?.user?.email);
      if (token?.userId) {
        (session as any).userId = token.userId;
        (session as any).role = token.role;
        (session as any).subscriptionStatus = token.subscriptionStatus;
        (session as any).trialEndsAt = token.trialEndsAt;
        (session as any).requirePasswordChange = (token as any).requirePasswordChange;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      try {
        const u = new URL(url);
        if (u.origin === baseUrl) return url;
      } catch {}
      return `${baseUrl}/dashboard`;
    },
  },
  pages: {
    signIn: "/signin",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };


