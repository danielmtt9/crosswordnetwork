# Crossword.Network Implementation Plan v4.0 (NEXT.JS FULL-STACK)
## Maple-Tyne Technologies Inc.™

**🚀 Version 4.0 - Complete Next.js Migration (October 6, 2025):**
- ✅ **Complete stack migration:** PHP → Next.js 14+ with React, TypeScript, and App Router
- ✅ **Modern ORM:** MariaDB with Prisma (type-safe schema, automated migrations)
- ✅ **True real-time:** Socket.IO for multiplayer (Hostinger Cloud Business supports Node.js)
- ✅ **Production authentication:** NextAuth.js with JWT sessions
- ✅ **Modern UI framework:** Shadcn/UI + Radix UI + Tailwind CSS 3+
- ✅ **Admin dashboard:** Refine.js framework for content management
- ✅ **Professional deployment:** PM2 process manager + Git/SSH deployment
- ✅ **Preserved standards:** WCAG 2.1 Level AA accessibility, hardened security, realistic performance targets

---

## Executive Summary

**Crossword.Network** - A premium HTML crossword solving platform where users solve admin-uploaded interactive puzzles (from EclipseCrossword) with progress saving, real-time multiplayer collaboration, and role-based access control.

**Core Value Proposition:**
- **Everyone saves progress** (free + premium users)
- **Free users:** 5 hints per puzzle, access to free-tier puzzles, 1-week premium trial, spectator mode
- **Premium users ($2/month, $20/year):** Unlimited hints, all puzzles, multiplayer hosting and editing
- **Admin-only uploads:** No user-generated content, professionally curated puzzles
- **Desktop and mobile optimized:** Minimal, clean design; responsive 320px → 1440px

---

## Complete Technology Stack (Next.js Full-Stack)

### Frontend Stack
- **Framework:** Next.js 14+ (App Router for hybrid SSR/SSG/CSR)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS 3+ (utility-first, JIT compiler)
- **UI Components:** Shadcn/UI (customizable, accessible) + Radix UI (headless primitives)
- **Icons:** Lucide React (SVG-based, stroke icons)
- **Animations:** Framer Motion (subtle fades, respects `prefers-reduced-motion`)
- **Fonts:** Inter (via Google Fonts; preconnect for performance)
- **State Management:** Zustand (lightweight global store for user session, puzzle state)
- **Forms:** React Hook Form + Zod (client + server validation)
- **Charts (Admin):** Recharts (simple line/bar for analytics)

### Backend Stack (Integrated in Next.js)
- **Runtime:** Node.js 20+ (LTS)
- **API Routes:** Next.js App Router API routes (`app/api/**/route.ts`)
- **Authentication:** NextAuth.js v5 (JWT-based; credentials + optional Google OAuth)
- **Real-Time:** Socket.IO (WebSocket server for multiplayer grid sync, chat)
- **Payments:** Stripe SDK (subscriptions, checkout, webhooks)
- **File Uploads:** Multer (multipart/form-data handling; store in `/public/puzzles`)
- **ORM:** Prisma (type-safe database client, schema-first migrations)
- **Admin Dashboard:** Refine.js (React-based admin UI with CRUD resources)

### Database
- **Provider:** Hostinger MariaDB (MySQL-compatible; setup via hPanel)
- **Connection:** Prisma client (connection pooling built-in)
- **Schema Management:** Prisma migrations (`npx prisma migrate`)
- **Models:** User, Puzzle, UserProgress, MultiplayerSession, SessionParticipant

### External Services
- **Payment Processor:** Stripe (subscriptions, webhooks for role upgrades)
- **Email:** Optional via Resend or SendGrid (transactional emails)
- **File Storage:** Local filesystem (`/public/puzzles/`) or S3 if scaling
- **Analytics:** Optional Google Analytics via `next/script`

### Development Tools
- **Version Control:** Git with GitHub
- **Package Management:** npm (Node.js packages)
- **Testing:** Jest + React Testing Library (unit/integration)
- **Linting:** ESLint + Prettier
- **Type Checking:** TypeScript compiler (`tsc --noEmit`)
- **Local Dev:** Next.js dev server (`npm run dev`)
- **Build:** Next.js production build (`npm run build`)

### Deployment (Hostinger Cloud Business)
- **Environment:** Node.js 20+ runtime (supported on Hostinger Cloud)
- **Process Manager:** PM2 (keeps Next.js server running, auto-restart)
- **Web Server:** Nginx reverse proxy (port 3000 → public domain)
- **Deployment Method:** Git clone + SSH (no FTP for source files)
- **SSL:** Let's Encrypt via Hostinger control panel

---

## Database Schema (Prisma Format)

**File:** `prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

// ===== USER MODEL =====
model User {
  id                 Int                  @id @default(autoincrement())
  username           String               @unique @db.VarChar(50)
  email              String               @unique @db.VarChar(255)
  password           String               @db.VarChar(255) // bcrypt hash
  role               Role                 @default(FREE)
  subscriptionStatus SubscriptionStatus   @default(TRIAL)
  stripeCustomerId   String?              @db.VarChar(255)
  stripeSubscriptionId String?            @db.VarChar(255)
  trialEndsAt        DateTime?
  createdAt          DateTime             @default(now())
  updatedAt          DateTime             @updatedAt

  // Relations
  uploadedPuzzles     Puzzle[]            @relation("UploaderPuzzles")
  progress            UserProgress[]
  hostedSessions      MultiplayerSession[] @relation("HostSessions")
  sessionParticipants SessionParticipant[]

  @@index([role])
  @@index([subscriptionStatus])
  @@index([email])
}

enum Role {
  ADMIN
  FREE
  PREMIUM
}

enum SubscriptionStatus {
  TRIAL
  ACTIVE
  CANCELLED
  EXPIRED
}

// ===== PUZZLE MODEL =====
model Puzzle {
  id          Int      @id @default(autoincrement())
  uploaderId  Int
  title       String   @db.VarChar(255)
  description String?  @db.Text
  htmlPath    String   @db.VarChar(500) // e.g., /puzzles/puzzle-123.html
  difficulty  Difficulty @default(MEDIUM)
  accessLevel AccessLevel @default(FREE)
  category    String?  @db.VarChar(100)
  isActive    Boolean  @default(true)
  playsCount  Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  uploader    User              @relation("UploaderPuzzles", fields: [uploaderId], references: [id])
  progress    UserProgress[]
  sessions    MultiplayerSession[]

  @@index([accessLevel])
  @@index([difficulty])
  @@index([isActive])
  @@index([uploaderId])
}

enum Difficulty {
  EASY
  MEDIUM
  HARD
}

enum AccessLevel {
  FREE
  PREMIUM
}

// ===== USER PROGRESS MODEL =====
model UserProgress {
  id                   Int      @id @default(autoincrement())
  userId               Int
  puzzleId             Int
  hintsUsed            Int      @default(0)
  maxHints             Int      @default(5) // Role-based
  completed            Boolean  @default(false)
  completionTimeSeconds Int?
  score                Int      @default(0)
  lastSaved            DateTime @default(now()) @updatedAt
  puzzleState          Json?    // Grid state, cursor position

  // Relations
  user    User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  puzzle  Puzzle @relation(fields: [puzzleId], references: [id], onDelete: Cascade)

  @@unique([userId, puzzleId])
  @@index([completed])
  @@index([userId])
  @@index([puzzleId])
}

// ===== MULTIPLAYER SESSION MODEL =====
model MultiplayerSession {
  id                  Int       @id @default(autoincrement())
  puzzleId            Int
  sessionCode         String    @unique @db.Char(6)
  hostUserId          Int
  maxPlayers          Int       @default(4)
  activePlayersCount  Int       @default(0)
  status              SessionStatus @default(WAITING)
  createdAt           DateTime  @default(now())
  expiresAt           DateTime?
  sessionState        Json?     // Grid state for multiplayer

  // Relations
  puzzle       Puzzle              @relation(fields: [puzzleId], references: [id])
  host         User                @relation("HostSessions", fields: [hostUserId], references: [id])
  participants SessionParticipant[]

  @@index([status])
  @@index([puzzleId])
  @@index([hostUserId])
  @@index([sessionCode])
}

enum SessionStatus {
  WAITING
  ACTIVE
  COMPLETED
}

// ===== SESSION PARTICIPANT MODEL =====
model SessionParticipant {
  id        Int      @id @default(autoincrement())
  sessionId Int
  userId    Int
  role      ParticipantRole @default(PARTICIPANT)
  score     Int      @default(0)
  joinedAt  DateTime @default(now())

  // Relations
  session MultiplayerSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  user    User               @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([sessionId, userId])
  @@index([sessionId])
  @@index([userId])
}

enum ParticipantRole {
  HOST
  PARTICIPANT
  SPECTATOR
}
```

**Migration Notes:**
- Run `npx prisma generate` after schema changes to update Prisma client
- Run `npx prisma migrate dev --name init` for initial migration
- Use `npx prisma migrate deploy` in production
- Prisma handles connection pooling automatically
- JSON fields store grid state; indexed columns for queries

---

## Project Structure (Next.js App Router)

```
crossword-network/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   └── [...nextauth]/route.ts       # NextAuth.js handler
│   │   ├── puzzles/
│   │   │   ├── route.ts                     # GET /api/puzzles (list)
│   │   │   └── [id]/route.ts                # GET /api/puzzles/:id
│   │   ├── progress/
│   │   │   └── route.ts                     # POST /api/progress (save)
│   │   ├── subscribe/
│   │   │   └── route.ts                     # POST /api/subscribe (Stripe checkout)
│   │   ├── webhook/
│   │   │   └── stripe/route.ts              # POST /api/webhook/stripe
│   │   └── upload/
│   │       └── route.ts                     # POST /api/upload (admin puzzle upload)
│   ├── admin/
│   │   ├── layout.tsx                       # Admin layout (Refine wrapper)
│   │   ├── page.tsx                         # Admin dashboard home
│   │   ├── users/
│   │   │   └── page.tsx                     # User management
│   │   └── puzzles/
│   │       ├── page.tsx                     # Puzzle list
│   │       └── create/page.tsx              # Puzzle upload form
│   ├── dashboard/
│   │   └── page.tsx                         # User dashboard (profile, subscription)
│   ├── multiplayer/
│   │   ├── page.tsx                         # Multiplayer lobby (room list)
│   │   └── [roomId]/page.tsx                # Multiplayer room (live grid)
│   ├── puzzles/
│   │   ├── page.tsx                         # Puzzle gallery (list/filter)
│   │   └── [id]/page.tsx                    # Puzzle player (iframe embed)
│   ├── pricing/
│   │   └── page.tsx                         # Pricing page (Stripe checkout)
│   ├── login/
│   │   └── page.tsx                         # Login form
│   ├── signup/
│   │   └── page.tsx                         # Signup form
│   ├── layout.tsx                           # Root layout (header, footer, providers)
│   ├── page.tsx                             # Homepage (hero, featured puzzles)
│   └── globals.css                          # Tailwind imports + custom styles
├── components/
│   ├── ui/                                  # Shadcn/UI components (button, dialog, etc.)
│   ├── Header.tsx                           # Global header (nav, auth avatar)
│   ├── Footer.tsx                           # Global footer
│   ├── PuzzleCard.tsx                       # Puzzle card for gallery
│   ├── PuzzlePlayer.tsx                     # Iframe puzzle embed
│   ├── MultiplayerGrid.tsx                  # Real-time collaborative grid
│   ├── ThemeToggle.tsx                      # Dark/light mode switcher
│   └── ProtectedRoute.tsx                   # Client-side route guard
├── lib/
│   ├── auth.ts                              # NextAuth config
│   ├── prisma.ts                            # Prisma client singleton
│   ├── socket.ts                            # Socket.IO server setup
│   ├── stripe.ts                            # Stripe client
│   ├── guards.ts                            # Auth middleware helpers
│   └── utils.ts                             # General utilities
├── prisma/
│   ├── schema.prisma                        # Database schema
│   └── migrations/                          # Migration history
├── public/
│   ├── puzzles/                             # Uploaded HTML/JS/CSS puzzles
│   └── images/                              # Static images
├── .env.local                               # Environment variables (not committed)
├── .gitignore
├── ecosystem.config.js                      # PM2 config for deployment
├── middleware.ts                            # Next.js middleware (auth guards)
├── next.config.js                           # Next.js configuration
├── package.json                             # Node dependencies
├── postcss.config.js                        # PostCSS config
├── tailwind.config.js                       # Tailwind configuration
├── tsconfig.json                            # TypeScript configuration
└── README.md                                # Project documentation
```

---

## Site Architecture, Pages, and User Workflows (Full Scope)

### Decisions (locked-in)
- Scope v1: Full scope including billing, uploads, admin, achievements, leaderboards
- Admin access policy: email domain allowlist `@crossword.network` AND `role = ADMIN` (both required)

### Information Architecture (Top-level Routes)
- Public: `/`, `/puzzles`, `/puzzles/[slug]`, `/pricing`, `/legal/{terms,privacy}`
- Auth: `/signup`, `/login`, `/reset-password`, `/verify-email`
- App (authed): `/app`, `/app/puzzles`, `/app/puzzles/[id]`, `/app/profile`, `/app/settings`
- Multiplayer: `/multiplayer/new`, `/multiplayer/join`, `/room/[roomId]`
- Billing: `/billing`, `/api/billing/*`
- Creator: `/studio`, `/api/uploads/*`
- Admin (role-gated): `/admin` with nested sections
- System: `/_not-found`, `/maintenance` (feature-flag)

### Next.js App Router Structure (app/)
- `app/layout.tsx` (root), `app/page.tsx` (landing)
- Public: `app/(public)/puzzles/page.tsx`, `app/(public)/puzzles/[slug]/page.tsx`, `app/(public)/pricing/page.tsx`
- Auth: `app/(auth)/login/page.tsx`, `app/(auth)/signup/page.tsx`, `app/(auth)/reset-password/page.tsx`, `app/(auth)/verify-email/page.tsx`
- App: `app/(app)/app/page.tsx`, `app/(app)/app/puzzles/page.tsx`, `app/(app)/app/puzzles/[id]/page.tsx`, `app/(app)/profile/page.tsx`, `app/(app)/settings/page.tsx`
- Realtime: `app/(realtime)/multiplayer/new/page.tsx`, `app/(realtime)/multiplayer/join/page.tsx`, `app/(realtime)/room/[roomId]/page.tsx`
- Billing: `app/(billing)/billing/page.tsx`
- Creator: `app/(creator)/studio/page.tsx`
- Admin: `app/(admin)/admin/{page.tsx,users/page.tsx,puzzles/page.tsx,sessions/page.tsx,billing/page.tsx,flags/page.tsx,audit/page.tsx,system/page.tsx}`
- System: `app/_not-found/page.tsx`

### Core User Workflows
- Anonymous: Land on `/` → browse `/puzzles` preview → signup/login on start/join actions
- Free: Access free puzzles, 5 hints per puzzle, progress saving, can join rooms per policy (often spectator)
- Premium: Full library, unlimited hints, create/host rooms, edit in multiplayer, progress sync across devices
- Admin: Manage users/puzzles/sessions, feature flags, maintenance, view audit logs and system health

### Multiplayer Flow
- Create Room: `/multiplayer/new` → server creates `MultiplayerSession` (6-char code) → redirect to `/room/[roomId]` with invite link
- Join Room: `/multiplayer/join` with code/link → redirect to `/room/[roomId]`
- Realtime: Socket.IO channels for presence, cursors, cell edits, and chat

### Billing Flow (Stripe)
- `/pricing` → Checkout session API → Stripe Checkout; webhook updates `Subscription` and user role
- `/billing` → Stripe customer portal link for manage/cancel

### Creator Uploads
- `/studio` (admin-only for v1) uploads HTML/JSON; sanitize, store, assign metadata, publish/unpublish

### Admin Dashboard IA
- `/admin` Home: KPIs (DAU/WAU/MAU, live sessions, MRR/ARR, active subs, churn), quick links
- `/admin/users`: search/filter, user detail (roles, sub status), actions: grant/revoke roles, ban/suspend
- `/admin/puzzles`: list, publish/unpublish, feature, difficulty/category, preview, validation reports
- `/admin/sessions`: live sessions monitor (participants, latency), terminate room, kick participant
- `/admin/billing`: Stripe summaries and deep links to customers/invoices; refunds via Stripe
- `/admin/flags`: feature flags, maintenance mode, limits (e.g., free hints)
- `/admin/audit`: audit timeline of admin actions (who/what/when, before/after)
- `/admin/system`: health checks (DB, sockets, Stripe), queue depth, version/hash, env

### APIs Map (route handlers)
- `app/api/auth/*` (NextAuth)
- `app/api/puzzles/*` (list/detail)
- `app/api/rooms/*` (create/join/presence)
- `app/api/uploads/*` (creator/admin uploads)
- `app/api/billing/*` (checkout, portal, webhooks)
- `app/api/admin/*` (users, roles, puzzles, sessions, flags, audit) — all audited

### Prisma Additions (Admin and Flags)
- `AuditLog` model to record admin mutations (actor, action, entity, before/after, timestamp)
- `FeatureFlag` model for runtime-togglable features (key, enabled, rollout %, updatedAt)
- Seed initial flags and ensure indices on frequently filtered columns

### Security & Middleware
- `middleware.ts` protects `/app`, `/room/*`, `/studio`, `/admin`, `/billing`
- Admin routes require both `email.endsWith('@crossword.network')` and `role === 'ADMIN'`
- All admin mutations write `AuditLog` entries; rate-limit sensitive endpoints

### Rollout Phases (Full scope)
- Phase 1: Landing, Auth, App dashboard, Puzzles list, Solo play, Rooms (basic)
- Phase 2: Billing + Premium gates, Profiles/Settings, Presence polish
- Phase 3: Admin Dashboard (users, puzzles, sessions, flags, audit, system)
- Phase 4: Creator Studio, Achievements/Leaderboard, Admin billing page polish

### Admin Implementation Todos
- admin-setup: Create `/admin` route group with protected layout
- admin-users: Users list/search, role toggles, suspend/ban
- admin-puzzles: Publish/unpublish/feature controls and metadata
- admin-sessions: Live viewer and terminate room action
- admin-flags: Feature flags + maintenance toggle UI
- admin-audit: Audit log list with filters
- admin-system: System health cards (DB/socket/stripe), version info
- auth-allowlist: Enforce `@crossword.network` + `ADMIN` role in middleware
- audit-hooks: Log all admin API mutations into `AuditLog`

---

### Admin Access Policy (Middleware Snippet)

```ts
// middleware.ts (augment existing)
import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token as any;
    const path = req.nextUrl.pathname;

    const isAdminRoute = path.startsWith('/admin');
    const isProtected = isAdminRoute ||
      path.startsWith('/app') ||
      path.startsWith('/room') ||
      path.startsWith('/studio') ||
      path.startsWith('/billing');

    if (!token && isProtected) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    if (isAdminRoute) {
      const hasAdminRole = token?.role === 'ADMIN';
      const domainAllowed = (token?.email || '').endsWith('@crossword.network');
      if (!(hasAdminRole && domainAllowed)) {
        return NextResponse.redirect(new URL('/unauthorized', req.url));
      }
    }

    return NextResponse.next();
  },
  { callbacks: { authorized: ({ token }) => !!token } }
);

export const config = {
  matcher: ['/admin/:path*', '/app/:path*', '/room/:path*', '/studio/:path*', '/billing/:path*'],
};
```

### Prisma Models (Admin Auditing and Flags)

```prisma
model AuditLog {
  id          Int       @id @default(autoincrement())
  actorUserId Int
  action      String    @db.VarChar(80)     // e.g., 'USER_ROLE_UPDATE'
  entityType  String    @db.VarChar(80)     // e.g., 'User' | 'Puzzle'
  entityId    String    @db.VarChar(80)
  before      Json?
  after       Json?
  ip          String?   @db.VarChar(64)
  createdAt   DateTime  @default(now())

  @@index([actorUserId])
  @@index([entityType, entityId])
}

model FeatureFlag {
  id        Int       @id @default(autoincrement())
  key       String    @unique @db.VarChar(100)
  enabled   Boolean   @default(false)
  rollout   Int       @default(100)         // 0–100 percent
  updatedAt DateTime  @updatedAt

  @@index([key])
}
```

### Admin API Outline (All audited)

```
app/api/admin/users/route.ts           # GET list/search
app/api/admin/users/[id]/route.ts      # GET detail, PATCH role/status
app/api/admin/puzzles/route.ts         # GET list, POST create (metadata only)
app/api/admin/puzzles/[id]/route.ts    # PATCH publish/feature/update, DELETE
app/api/admin/sessions/route.ts        # GET live/historic
app/api/admin/sessions/[id]/route.ts   # POST terminate/kick
app/api/admin/flags/route.ts           # GET/POST flags
app/api/admin/audit/route.ts           # GET audit logs
```

Each mutation writes an `AuditLog` record with `{actorUserId, action, entityType, entityId, before, after, ip}`.

### Prisma Models (Achievements, Leaderboard, Subscription, Room Logs)

```prisma
// Normalized subscription tracking
model Subscription {
  id                 Int       @id @default(autoincrement())
  userId             Int       @unique
  status             SubscriptionStatus @default(TRIAL)
  plan               String    @db.VarChar(32) // 'monthly' | 'yearly'
  stripeCustomerId   String?   @db.VarChar(255)
  stripeSubscriptionId String? @db.VarChar(255)
  trialEndsAt        DateTime?
  currentPeriodEnd   DateTime?
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt

  user User @relation(fields: [userId], references: [id])

  @@index([status])
}

enum SubscriptionStatus {
  TRIAL
  ACTIVE
  CANCELLED
  EXPIRED
}

// Achievements and user progress toward them
model Achievement {
  id          Int      @id @default(autoincrement())
  key         String   @unique @db.VarChar(64) // e.g., 'streak_7', 'first_puzzle'
  name        String   @db.VarChar(120)
  description String?  @db.VarChar(300)
  points      Int      @default(0)
}

model UserAchievement {
  id             Int      @id @default(autoincrement())
  userId         Int
  achievementId  Int
  earnedAt       DateTime @default(now())

  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  achievement  Achievement  @relation(fields: [achievementId], references: [id], onDelete: Cascade)

  @@unique([userId, achievementId])
  @@index([userId])
}

// Leaderboard snapshots (e.g., daily/weekly/global)
model LeaderboardEntry {
  id        Int      @id @default(autoincrement())
  period    String   @db.VarChar(16)   // 'daily' | 'weekly' | 'all_time'
  userId    Int
  score     Int      @default(0)
  rank      Int?
  computedAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([period, score])
  @@index([userId])
}

// Room chat/messages and key events for moderation/analytics
model RoomMessage {
  id        Int      @id @default(autoincrement())
  sessionId Int
  userId    Int
  content   String   @db.VarChar(1000)
  createdAt DateTime @default(now())

  session MultiplayerSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  user    User               @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([sessionId])
  @@index([createdAt])
}

model RoomEvent {
  id         Int      @id @default(autoincrement())
  sessionId  Int
  type       String   @db.VarChar(64) // 'join' | 'leave' | 'kick' | 'grid_edit' | 'hint'
  payload    Json?
  createdAt  DateTime @default(now())

  session MultiplayerSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@index([sessionId])
  @@index([type, createdAt])
}
```

Acceptance criteria:
- Prisma models compile (`npx prisma generate`) and migrate (`npx prisma migrate dev`) cleanly.
- Leaderboard queries p95 ≤ 200ms with appropriate indexes.
- Room logs enable basic moderation (filter by user/session/time) and can be purged/archived.

### Acceptance Criteria (Admin)
- `/admin` accessible only to users with `ADMIN` role and `@crossword.network` email
- Users table supports search by email/username; role toggle persists
- Puzzles table supports publish/unpublish/feature; changes audit-logged
- Sessions page shows live rooms; terminate action disconnects clients
- Flags page toggles features and maintenance; changes audit-logged
- Audit page filters by actor/action/entity; paginated ≤ 200ms p95
- System page shows DB/socket/Stripe health and deployed version

## Authentication (Credentials + Google OAuth, Email Verification)

### Decisions (confirmed)
- Email verification required at signup
- Providers at launch: Credentials (email+password) and Google OAuth
- Sessions: NextAuth JWT (stateless), 7‑day rolling; rotate on login

### Pages and Routes (App Router)
- `app/(auth)/signup/page.tsx`: signup form (email, password, username)
- `app/(auth)/login/page.tsx`: login form (email, password, Google button)
- `app/(auth)/verify-email/page.tsx`: show “check your email” + handle token
- `app/(auth)/reset-password/page.tsx`: request reset (email)
- `app/(auth)/reset-password/[token]/page.tsx`: set new password
- API routes:
  - `app/api/auth/register/route.ts` (create user, send verify email)
  - `app/api/auth/verify/route.ts` (consume token)
  - `app/api/auth/reset/request/route.ts` (send reset email)
  - `app/api/auth/reset/confirm/route.ts` (consume reset token)
  - NextAuth handler: `app/api/auth/[...nextauth]/route.ts`

### Prisma: Models to Add/Confirm
```prisma
model Account {
  id                 Int     @id @default(autoincrement())
  userId             Int
  type               String
  provider           String
  providerAccountId  String
  refresh_token      String? @db.Text
  access_token       String? @db.Text
  expires_at         Int?
  token_type         String?
  scope              String?
  id_token           String? @db.Text
  session_state      String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@index([userId])
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

model PasswordResetToken {
  id        Int      @id @default(autoincrement())
  email     String   @db.VarChar(255)
  token     String   @unique @db.VarChar(255)
  expires   DateTime
  used      Boolean  @default(false)

  @@index([email])
  @@index([expires])
}

model LoginAttempt {
  id        Int      @id @default(autoincrement())
  email     String   @db.VarChar(255)
  ip        String   @db.VarChar(64)
  success   Boolean
  createdAt DateTime @default(now())

  @@index([email, createdAt])
}
```

### NextAuth Configuration
- Credentials: bcrypt (≥12), 5‑fail lockout → 15m (use `LoginAttempt`)
- Google OAuth: client ID/secret from Google Cloud Console; restrict redirect URIs
- JWT callbacks: add `userId`, `email`, `role`, `subscriptionStatus`, `trialEndsAt`
- Optional events: audit sign-in/out

### Email (Verification & Reset)
- Provider: Resend or SendGrid
- Templates: `src/emails/{verifyEmail.tsx, resetPassword.tsx}`
- Rate limits: throttle verification/reset per email/IP
- Tokens: 15–30m TTL, single-use

### Security, Middleware, Secrets
- Middleware: protect `/app`, `/room/*`, `/studio`, `/billing`; `/admin/*` requires `role=ADMIN` + `@crossword.network`
- Secrets in `.env.local` (never committed): DB, NEXTAUTH, Google, email provider, Stripe keys
- Production: store secrets in Hostinger env; rotate quarterly; least-privilege API keys

### UX & Acceptance Criteria
- Verified email required before premium/hosting; unverified users redirected to Verify page
- Google OAuth working end‑to‑end; new users default to FREE+TRIAL
- JWT includes role/subscription; guards enforce access
- Verification/reset tokens expire and are one‑time; requests rate‑limited
- No secrets in repo; OAuth redirect URIs restricted

---

## Configuration Files

### `next.config.js`
```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [], // Add CDN domains if using external images
  },
  env: {
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' https://fonts.googleapis.com 'unsafe-inline'; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' wss: https:;",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

### `tailwind.config.js`
```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#3B82F6',
        secondary: '#22C55E',
        neutral: {
          50: '#F9FAFB',
          900: '#111827',
        },
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
```

### `.env.local` (Template - DO NOT COMMIT)
```env
# Database
DATABASE_URL="mysql://username:password@host:3306/database"

# NextAuth
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="https://crossword.network"

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Optional
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
```

### `ecosystem.config.js` (PM2 Deployment)
```js
module.exports = {
  apps: [
    {
      name: 'crossword-network',
      script: 'npm',
      args: 'start',
      cwd: '/path/to/app',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
    },
  ],
};
```

### `middleware.ts` (Auth Guards)
```ts
import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Admin-only routes
    if (path.startsWith('/admin') && token?.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/unauthorized', req.url));
    }

    // Premium-only routes
    if (path.startsWith('/multiplayer') && token?.role === 'FREE') {
      return NextResponse.redirect(new URL('/pricing', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ['/admin/:path*', '/dashboard/:path*', '/multiplayer/:path*'],
};
```

---

## Phase-by-Phase Implementation Plan

## PHASE 1: FOUNDATION & AUTHENTICATION (2 weeks)
**Focus:** Next.js setup, database, authentication system

### Deliverables
- Next.js project initialization with TypeScript
- Shadcn/UI component library setup
- Prisma schema + initial migration
- NextAuth.js configuration (credentials provider)
- User registration/login pages
- JWT session management
- Role-based middleware

### CLI Commands
```bash
# Initialize Next.js project
npx create-next-app@latest crossword-network --typescript --tailwind --eslint --app

# Add Shadcn/UI
npx shadcn-ui@latest init

# Add UI components
npx shadcn-ui@latest add button input label card dialog table

# Initialize Prisma
npx prisma init

# Generate Prisma client
npx prisma generate

# Create initial migration
npx prisma migrate dev --name init

# Install additional dependencies
npm install next-auth@beta @prisma/client bcryptjs zod react-hook-form @hookform/resolvers zustand
npm install -D @types/bcryptjs
```

### Acceptance Criteria
- ✅ `npm run dev` starts Next.js dev server on port 3000
- ✅ User can register with email/password (bcrypt hashing, cost ≥ 12)
- ✅ User can login and receive JWT session cookie
- ✅ Session persists across page refreshes
- ✅ Free users get 7-day premium trial automatically (trialEndsAt set)
- ✅ Role-based middleware redirects unauthorized users (e.g., /admin → 403)
- ✅ Prisma client connects to Hostinger MariaDB without errors

---

## PHASE 2: PUZZLE SYSTEM & ADMIN (3 weeks)
**Focus:** Puzzle gallery, player, admin upload, Refine.js dashboard

### Deliverables
- Puzzle list page (React Server Components for SSR)
- Puzzle player page (iframe embed of EclipseCrossword HTML)
- Admin upload API route (Multer multipart handling)
- File validation (HTML only, 1MB max, sanitization)
- Refine.js admin dashboard (user/puzzle CRUD)
- Free/premium access guards

### CLI Commands
```bash
# Install dependencies
npm install multer formidable @refinedev/core @refinedev/nextjs-router recharts

# Add Shadcn components for admin
npx shadcn-ui@latest add table dropdown-menu badge
```

### Acceptance Criteria
- ✅ Puzzle gallery displays all puzzles with filters (difficulty, category)
- ✅ Free users see only `accessLevel = FREE` puzzles
- ✅ Premium puzzles show lock overlay for free users with upgrade CTA
- ✅ Puzzle player page embeds HTML in iframe without CORS errors
- ✅ Admin can upload HTML file via `/admin/puzzles/create` (Multer processes upload)
- ✅ Upload validates: MIME type `text/html`, size ≤ 1MB, strips `<script>` tags
- ✅ Uploaded puzzle appears in gallery immediately
- ✅ Refine.js dashboard at `/admin` shows user/puzzle tables with edit/delete
- ✅ Admin can change user roles and subscription status

---

## PHASE 3: PROGRESS TRACKING & HINTS (2 weeks)
**Focus:** Save/restore puzzle state, hint system, Zustand state

### Deliverables
- Progress API routes (POST /api/progress for save, GET for load)
- Hint system with role-based limits (5 for free, unlimited for premium)
- Zustand store for global puzzle state (hints used, grid state)
- Auto-save progress every 30 seconds (debounced)
- Resume puzzle from last saved state
- Completion tracking (time, score)

### CLI Commands
```bash
# Install dependencies (already added in Phase 1)
# npm install zustand
```

### Acceptance Criteria
- ✅ User opens puzzle → progress loads from DB (if exists)
- ✅ User edits grid → auto-saves to DB every 30s
- ✅ Free users limited to 5 hints per puzzle (counter enforced server-side)
- ✅ Premium users have unlimited hints (no counter)
- ✅ Hint counter displays correctly and updates in real-time
- ✅ Puzzle completion triggers time/score calculation and DB update
- ✅ Progress syncs across devices (user logs in elsewhere, sees same state)

---

## PHASE 4: MULTIPLAYER & REAL-TIME (3 weeks)
**Focus:** Socket.IO setup, collaborative grid, chat, spectator mode

### Deliverables
- Socket.IO server setup (custom Next.js server or separate process)
- Multiplayer lobby page (list active rooms)
- Room creation API (generate 6-char unique code)
- Real-time grid sync (premium users edit, all spectate)
- Chat system (messages persist during session)
- Spectator mode (free users can view, not edit)

### CLI Commands
```bash
# Install Socket.IO
npm install socket.io socket.io-client

# Create custom server file (if needed)
touch server.js
```

### Socket.IO Setup (Custom Server)
```js
// server.js (optional - can integrate into Next.js API route)
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(server, {
    cors: {
      origin: process.env.NEXTAUTH_URL,
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('joinRoom', (roomId) => {
      socket.join(roomId);
      io.to(roomId).emit('playerJoined', { socketId: socket.id });
    });

    socket.on('updateCell', (data) => {
      if (data.role === 'PREMIUM') {
        io.to(data.roomId).emit('cellUpdated', data);
      }
    });

    socket.on('chatMessage', (data) => {
      io.to(data.roomId).emit('newMessage', data);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  server.listen(3000, () => {
    console.log('> Ready on http://localhost:3000');
  });
});
```

### Acceptance Criteria
- ✅ Premium user can create multiplayer room (6-char code generated)
- ✅ Users can join room via code or link
- ✅ Socket.IO connects without errors (check browser console)
- ✅ Premium users can edit grid; updates sync to all clients <1s
- ✅ Free users can spectate (see updates) but inputs disabled
- ✅ Chat messages send/receive in real-time
- ✅ Host can kick participants or end session
- ✅ Session persists in DB (participants, state) until completion

---

## PHASE 5: SUBSCRIPTIONS & PAYMENTS (2 weeks)
**Focus:** Stripe integration, pricing page, webhooks, trial logic

### Deliverables
- Stripe checkout session API route
- Pricing page with $2/month and $20/year plans
- Stripe webhook handler (verify signature, update user role)
- Subscription management in user dashboard
- Trial expiration logic (cron or API check)
- Cancel/resume subscription flows

### CLI Commands
```bash
# Install Stripe SDK
npm install stripe

# Test webhook locally (Stripe CLI)
stripe listen --forward-to localhost:3000/api/webhook/stripe
```

### Stripe Webhook Handler
```ts
// app/api/webhook/stripe/route.ts
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';

export async function POST(req: Request) {
  const body = await req.text();
  const signature = headers().get('stripe-signature')!;

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      await prisma.user.update({
        where: { stripeCustomerId: session.customer as string },
        data: {
          role: 'PREMIUM',
          subscriptionStatus: 'ACTIVE',
          stripeSubscriptionId: session.subscription as string,
        },
      });
      break;

    case 'customer.subscription.deleted':
      const subscription = event.data.object;
      await prisma.user.update({
        where: { stripeSubscriptionId: subscription.id },
        data: {
          role: 'FREE',
          subscriptionStatus: 'CANCELLED',
        },
      });
      break;
  }

  return new Response('OK', { status: 200 });
}
```

### Acceptance Criteria
- ✅ Pricing page displays $2/month and $20/year plans
- ✅ Click "Subscribe" → redirects to Stripe Checkout
- ✅ Payment succeeds → webhook updates user role to PREMIUM
- ✅ User dashboard shows current plan and billing info
- ✅ Trial users see expiration date and upgrade CTA
- ✅ Trial expires → user role reverts to FREE (cron job or login check)
- ✅ Cancel subscription → role downgrades to FREE after period ends

---

## PHASE 6: DEPLOYMENT & OPTIMIZATION (1 week)
**Focus:** Hostinger Cloud deployment, PM2 setup, performance tuning

### Deliverables
- Production build (`npm run build`)
- PM2 ecosystem config
- Deploy to Hostinger Cloud via Git/SSH
- Nginx reverse proxy configuration
- Lighthouse audits (Performance, Accessibility, SEO)
- Error monitoring setup (optional: Sentry)

### Deployment Steps (Hostinger Cloud)
```bash
# 1. SSH into Hostinger Cloud
ssh u247536265@92.112.189.216 -p 65002

# 2. Clone repository
git clone https://github.com/yourusername/crossword-network.git
cd crossword-network

# 3. Install dependencies
npm install --production

# 4. Create .env.local with production values
nano .env.local
# (Paste DATABASE_URL, NEXTAUTH_SECRET, STRIPE keys)

# 5. Run Prisma migrations
npx prisma migrate deploy

# 6. Build Next.js
npm run build

# 7. Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# 8. Configure Nginx reverse proxy
sudo nano /etc/nginx/sites-available/crossword.network
# Add proxy_pass http://localhost:3000;
sudo nginx -t
sudo systemctl reload nginx
```

### Nginx Configuration
```nginx
server {
    listen 80;
    server_name crossword.network www.crossword.network;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Acceptance Criteria
- ✅ `npm run build` completes without errors
- ✅ PM2 starts Next.js server successfully (`pm2 list` shows online)
- ✅ Site accessible at https://crossword.network
- ✅ Nginx reverse proxy routes traffic to Next.js (port 3000)
- ✅ SSL certificate active (Let's Encrypt via Hostinger)
- ✅ Lighthouse Desktop: Performance ≥ 90, Accessibility ≥ 95, SEO ≥ 90
- ✅ Lighthouse Mobile: Performance ≥ 85, Accessibility ≥ 95
- ✅ All Tailwind classes render correctly (no missing styles)

---

## User Role Specifications

| Capability | Admin | Free User | Premium ($2/mo) |
|------------|--------|-----------|----------------|
| Puzzle Access | All (free + premium) | Only `accessLevel = FREE` | All (free + premium) |
| Difficulty Access | All difficulties | All difficulties (if free access) | All difficulties |
| Hints Per Puzzle | Unlimited | 5 hints maximum | Unlimited |
| Progress Saving | ✅ Yes | ✅ Yes | ✅ Yes |
| Multiplayer Hosting | ✅ Yes | ❌ Spectator only | ✅ Yes |
| Multiplayer Editing | ✅ Yes | ❌ View-only | ✅ Yes |
| Puzzle Upload | ✅ Yes | ❌ No | ❌ No |
| User Management | ✅ Yes | ❌ No | ❌ No |
| Subscription Plans | View all | View upgrade options | Manage subscription |
| 1-Week Trial | N/A | ✅ Auto-activated on signup | N/A |

---

## Security Requirements (Next.js Adapted)

### Authentication & Authorization
- **Password hashing:** bcrypt via `bcryptjs` library (cost ≥ 12)
- **JWT sessions:** NextAuth.js with secure cookies (httpOnly, secure, SameSite)
- **CSRF protection:** Built into NextAuth.js (token verification)
- **Session security:** Regenerate session on login; short expiry (7 days)
- **Account lockout:** 5 failed login attempts → 15-minute lockout (implement in login API route)

### File Upload Security
- **MIME validation:** Accept only `text/html` (check Content-Type + file extension)
- **File size:** 1MB max per puzzle upload (enforce in Multer config)
- **Content sanitization:** Parse HTML; strip `<script>`, `<style>`, `<iframe>`, event handlers (use DOMPurify or regex)
- **Storage:** Save uploads to `/public/puzzles/` with random prefix (e.g., `puzzle-abc123.html`)
- **Serve safely:** Serve from iframe with `sandbox` attribute to isolate execution

### Data Protection
- **SQL injection:** Prisma uses parameterized queries by default (safe)
- **XSS prevention:** React escapes JSX by default; use `dangerouslySetInnerHTML` cautiously
- **HTTPS:** Force HTTPS via Nginx; set Strict-Transport-Security header (Next.js config)
- **Environment variables:** Store secrets in `.env.local`; never commit to Git
- **Dependencies:** Run `npm audit` monthly; update packages

### Rate Limiting
- **Login:** 5 attempts per 15 min (per IP + username) — implement in API route with Redis or in-memory store
- **API endpoints:** 100 requests/min per IP (use `express-rate-limit` or Vercel's built-in)
- **File uploads:** 10 uploads/hour per user (track in DB or cache)

### HTTP Security Headers (Set in `next.config.js`)
- **Content-Security-Policy:** See config above (allow fonts from Google, scripts from self)
- **X-Content-Type-Options:** `nosniff`
- **Referrer-Policy:** `strict-origin-when-cross-origin`
- **Permissions-Policy:** `camera=(), microphone=(), geolocation=()`

### Stripe Security
- **Webhook verification:** Verify `Stripe-Signature` header with `stripe.webhooks.constructEvent()`
- **Idempotency keys:** Use on payment API calls to prevent duplicate charges
- **Secrets:** Store `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in `.env.local`

---

## Performance Targets (Realistic & Actionable)

### Build Pipeline
- **CSS:** Tailwind CSS 3+ with JIT compiler (purge unused classes automatically)
- **Cache-busting:** Next.js handles asset hashing automatically (`/_next/static/...`)
- **Assets:** Use Next.js `<Image>` component (auto-optimizes, WebP, lazy-load)
- **Fonts:** Preconnect to Google Fonts; use `font-display: swap` in Tailwind config

### Loading Times
- **Desktop First Contentful Paint (FCP):** ≤ 1.5s
- **Desktop Time to Interactive (TTI):** ≤ 2.5s for homepage
- **Mobile FCP:** ≤ 2s
- **Mobile TTI:** ≤ 3.5s

### Lighthouse Targets
- **Performance:** ≥ 90 (Desktop), ≥ 85 (Mobile)
- **Accessibility:** ≥ 95 (keyboard navigation, focus, contrast, ARIA)
- **Best Practices:** ≥ 90 (HTTPS, CSP, no console errors)
- **SEO:** ≥ 90 (meta tags, semantic HTML, sitemap)

### Caching Strategy
- **Static assets:** Next.js sets long cache headers automatically (`Cache-Control: public, immutable, max-age=31536000`)
- **HTML pages:** SSR pages: short cache (5 min); SSG pages: revalidate via ISR
- **API routes:** No cache by default; add `Cache-Control` headers if needed

### Database Performance
- **p95 query time:** ≤ 200ms (Prisma connection pooling + MariaDB indexes)
- **Indexes:** All foreign keys and frequently queried columns indexed (see Prisma schema)
- **Connection pooling:** Prisma handles automatically (default pool size: 10)

### Browser Compatibility
- **Desktop:** Chrome 90+, Firefox 88+, Safari 14+, Edge 90+ (full feature support)
- **Mobile:** Chrome/Safari latest (responsive Tailwind breakpoints)

### Scalability
- **Concurrent users:** 100+ simultaneously (Node.js event loop + PM2 clustering if needed)
- **File upload:** < 5s for 1MB HTML files (Multer streaming)
- **Real-time (Socket.IO):** ≤ 1s update latency

---

## Accessibility Requirements (WCAG 2.1 Level AA)

### Keyboard Navigation
- **Tab order:** Logical flow through interactive elements (Shadcn/UI components are keyboard-friendly)
- **Focus indicators:** Visible focus outline on all interactive elements (Tailwind `focus:ring-2`)
- **Skip links:** "Skip to main content" link at top of page (hidden visually, accessible via keyboard)
- **No keyboard traps:** Users can navigate away from all interactive elements (test modals, dropdowns)

### Semantic HTML & Landmarks
- **Landmarks:** Use `<header>`, `<main>`, `<nav>`, `<footer>` in layout.tsx
- **Headings:** Single `<h1>` per page; hierarchical structure (h1 → h2 → h3)
- **Lists:** Use `<ul>`, `<ol>` for puzzle lists, `<dl>` for definitions

### Color & Contrast
- **Text contrast:** Minimum 4.5:1 for normal text, 3:1 for large text (test with WAVE tool)
- **Non-text contrast:** Minimum 3:1 for UI components (buttons, borders)
- **Color independence:** Never rely on color alone (use icons + text for status)

### ARIA & Screen Readers
- **Alt text:** Descriptive alt text for images; `alt=""` for decorative images
- **ARIA labels:** Use `aria-label` for icon-only buttons (e.g., theme toggle)
- **Live regions:** Use `aria-live="polite"` for dynamic content (e.g., hint counter, chat messages)
- **Form labels:** React Hook Form + Shadcn/UI components handle labels automatically

### Responsive & Mobile
- **Touch targets:** Minimum 44×44px for interactive elements on mobile (Tailwind `min-h-11 min-w-11`)
- **Zoom support:** Allow up to 200% zoom without horizontal scrolling (use relative units)
- **Responsive text:** Use `rem`/`em` instead of `px` (Tailwind default is `rem`-based)

---

## Testing Strategy (Pragmatic)

### Unit Testing (Priority)
- **Authentication:** Password hashing, JWT token generation, session validation
- **Access control:** Free vs premium puzzle access, hint limits (mock Prisma queries)
- **File validation:** Upload size/type checks, filename sanitization (test Multer middleware)
- **Progress logic:** Save/restore state, hint tracking (test API routes with Jest)

### Integration Testing
- **Registration → Login:** User creation, trial setup, JWT session creation
- **Upload → Gallery:** Admin puzzle upload, Prisma insert, gallery fetch
- **Progress resume:** Save progress via API, log out, log back in, verify state restored
- **Stripe webhooks:** Mock Stripe events, verify user role update

### End-to-End Testing (Critical Paths)
- **Free user journey:** Register → solve free puzzle → hit hint limit → see upgrade prompt
- **Premium upgrade:** Click pricing → Stripe checkout → payment success → verify premium access
- **Admin workflow:** Login as admin → upload puzzle → set metadata → verify in gallery
- **Multiplayer session:** Create room → invite user → edit grid → verify real-time sync

### Performance Testing (Basic)
- **Load test:** 50 concurrent users on homepage and puzzle pages (use `artillery` or `k6`)
- **Database profiling:** Prisma query logging; identify slow queries (> 200ms)
- **Lighthouse audits:** Run on production URL (Desktop + Mobile)

### Browser Compatibility Testing
- **Manual testing:** Chrome, Firefox, Safari, Edge (latest versions)
- **Focus areas:** Keyboard navigation, responsive layout, form submissions, Socket.IO connection

---

## Deployment & Maintenance

### Development Workflow
1. **Local development:** `npm run dev` (Next.js hot reload on port 3000)
2. **Build assets:** `npm run build` (generates `.next/` with optimized bundles)
3. **Git commit and push** to GitHub/GitLab
4. **Deploy to Hostinger Cloud:** SSH → `git pull` → `npm install` → `npm run build` → `pm2 restart`
5. **Database migrations:** `npx prisma migrate deploy` (production)

### Deployment Best Practices
- **Ignore list (`.gitignore`):** Exclude `node_modules/`, `.env.local`, `.next/`, `*.map`, `prisma/migrations/*.sql` (keep migration folder structure)
- **Cache-busting:** Next.js handles automatically via `/_next/static/` hashed filenames
- **Secrets:** Use environment variables for DB credentials, API keys; never commit `.env.local`
- **Backups:** Daily automated database backups (Hostinger cPanel or manual `mysqldump`)
- **Rollback plan:** Keep previous Git commit; use `pm2 restart` to reload old version

### Post-Launch Monitoring
- **Server health:** PM2 dashboard (`pm2 monit`) for CPU/memory usage
- **Error logging:** Next.js logs to console; optionally integrate Sentry for error tracking
- **User analytics:** Optional Google Analytics via `next/script` or Plausible (privacy-friendly)
- **Uptime monitoring:** Optional UptimeRobot or Pingdom (free tier available)

### Support & Updates
- **Security patches:** Monthly `npm audit` and dependency updates
- **Feature updates:** Quarterly releases (plan in GitHub Issues/Projects)
- **User support:** Email support or help center (optional Intercom/Crisp chat widget)
- **Database backups:** Verify weekly; test restore process quarterly

---

## Budget & Resource Requirements

### Development Costs
- **Hosting (Hostinger Cloud Business):** ~$10–20/month (supports Node.js, SSL, 100GB storage)
- **Stripe Fees:** 2.9% + $0.30 per transaction
- **Domain:** $15/year (if purchasing new)
- **Total Year 1:** ~$300–400 (excluding development time)

### Revenue Projections
- **Month 6:** 100 premium subscribers → $200/month revenue
- **Month 12:** 500 premium subscribers → $1,000/month revenue
- **Break-even:** ~Month 3 with 30 paying subscribers

### Resource Allocation
- **Development Time:** 13 weeks full-time equivalent (faster than PHP due to modern tooling)
- **Asset Creation:** Puzzle content from external sources (EclipseCrossword files)
- **Marketing:** Email campaigns, social media presence (Twitter, Reddit r/crossword)
- **Support:** 5-10 hours/week for community management

---

## Success Metrics

### Launch Metrics (Month 1)
- ▫️ User acquisition: 500+ registered users
- ▫️ Puzzle catalog: 50+ puzzles uploaded
- ▫️ Premium conversion: 15% of free users upgrade
- ▫️ User retention: 70% return within 7 days

### Growth Metrics (Quarterly)
- ▫️ Monthly active users: 50% growth rate
- ▫️ Revenue milestones: $500/month Q2, $1,000/month Q4
- ▫️ Content engagement: Average 3 puzzles solved per active user
- ▫️ Platform stability: 99.5% uptime, <5 minute incident resolution

---

## Project Risk Assessment

### Technical Risks
- **Low:** Hostinger Cloud supports Node.js and Socket.IO (verified)
- **Medium:** EclipseCrossword HTML compatibility issues (test with sample files)
- **Low:** Stripe integration complexity (well-documented, official SDK)

### Business Risks
- **High:** Low premium conversion from free tier (mitigate with strong trial UX)
- **Medium:** Puzzle content availability and quality (partner with creators)
- **Low:** Competition from established crossword platforms (differentiate with multiplayer)

### Mitigation Strategies
- **Technical:** Test EclipseCrossword HTML early; ensure iframe isolation works
- **Business:** Strong free tier benefits, clear premium value prop, 1-week trial
- **Content:** Partner with crossword creators, establish content pipeline

---

## Launch Checklist

### Pre-Launch (2 weeks before)
- ▫️ Full system testing completed (unit + integration + E2E)
- ▫️ Performance optimization finished (Lighthouse ≥ 90)
- ▫️ Security audit passed (no critical vulnerabilities, `npm audit`)
- ▫️ Content library populated (50+ quality puzzles)
- ▫️ Payment system tested end-to-end (Stripe test mode → live mode)

### Launch Day
- ▫️ Domain and SSL certificates active
- ▫️ PM2 running in production mode (`pm2 list` shows online)
- ▫️ Social media announcements prepared (Twitter, LinkedIn)
- ▫️ Email marketing campaign ready (if applicable)
- ▫️ Support documentation published (FAQ, help center)
- ▫️ Monitoring and alerting configured (optional Sentry, UptimeRobot)

### Post-Launch (First 30 days)
- ▫️ Daily user activity monitoring (Google Analytics or custom)
- ▫️ Bug tracking and priority fixes (GitHub Issues)
- ▫️ Performance metrics review (Lighthouse audits weekly)
- ▫️ User feedback collection and analysis (surveys, support tickets)
- ▫️ Content upload pipeline established (weekly puzzle additions)

---

## Next.js Project Specification (Cursor Prompt-Ready)

This document provides a comprehensive blueprint for building **crossword.network** using a **full-stack JavaScript approach with Next.js 14+**. It's designed for development in **Cursor (AI-powered code editor)** with CLI integration. The site is a minimal, clean platform for interactive crossword puzzles generated from **EclipseCrossword** (static HTML/JS/CSS files). Focus on **responsiveness across phone, tablet, and desktop**. Address past Tailwind rendering issues by ensuring proper **Next.js build process** (`npm run build`) and deployment to **Hostinger Cloud Hosting** (Node.js runtime required; no raw FTP for source files—use **Git/SSH** for deployment).

### Architecture Summary
- **Frontend:** Next.js 14+ (App Router), Tailwind CSS 3+, Shadcn/UI, React, TypeScript
- **Backend:** Next.js API Routes, NextAuth.js (JWT), Socket.IO, Prisma ORM
- **Database:** Hostinger MariaDB (MySQL-compatible)
- **Payments:** Stripe (subscriptions, webhooks)
- **Admin:** Refine.js framework
- **Deployment:** PM2 on Hostinger Cloud (Node.js 20+, Nginx reverse proxy)

### User Roles
- **Free:** 5 hints per puzzle, free-tier puzzles only, 1-week premium trial, spectator in multiplayer
- **Premium ($2/mo, $20/yr):** Unlimited hints, all puzzles, multiplayer hosting/editing
- **Admin:** Upload puzzles, manage users, view analytics

### Key Features
1. **Puzzle Gallery:** List/filter puzzles by difficulty, category; free/premium access gates
2. **Puzzle Player:** Iframe embed of EclipseCrossword HTML; save/restore progress
3. **Multiplayer:** Socket.IO real-time grid sync, chat, spectator mode
4. **Subscriptions:** Stripe checkout, webhook role upgrades, trial expiration
5. **Admin Dashboard:** Refine.js CRUD for users/puzzles, upload interface, analytics charts

### Design Principles
- **Minimal, clean:** No unnecessary text/clichés; white space heavy
- **Neutral palette:** Light (#F9FAFB), dark (#111827); blue accents (#3B82F6 CTAs); green feedback (#22C55E)
- **Responsive:** Mobile-first (320px → 1440px); Tailwind breakpoints `sm:`, `md:`, `lg:`
- **Accessible:** WCAG 2.1 Level AA (keyboard nav, ARIA, contrast, focus indicators)

### CLI Workflow (Paste into Cursor)
```bash
# 1. Initialize Next.js
npx create-next-app@latest crossword-network --typescript --tailwind --eslint --app

# 2. Add Shadcn/UI
cd crossword-network
npx shadcn-ui@latest init
npx shadcn-ui@latest add button input label card dialog table badge dropdown-menu

# 3. Install dependencies
npm install next-auth@beta @prisma/client bcryptjs zod react-hook-form @hookform/resolvers zustand stripe socket.io socket.io-client multer @refinedev/core @refinedev/nextjs-router recharts
npm install -D @types/bcryptjs prisma

# 4. Initialize Prisma
npx prisma init
# (Edit prisma/schema.prisma with the schema from this document)
npx prisma generate
npx prisma migrate dev --name init

# 5. Create .env.local
# (Add DATABASE_URL, NEXTAUTH_SECRET, STRIPE keys)

# 6. Start development server
npm run dev
```

### Iterative Development Approach (For Cursor)
1. **Phase 1:** Generate auth pages (login, signup) with NextAuth.js config
2. **Phase 2:** Generate puzzle gallery and player pages
3. **Phase 3:** Generate admin upload page with Multer API route
4. **Phase 4:** Generate multiplayer lobby and room pages with Socket.IO
5. **Phase 5:** Generate pricing page and Stripe checkout API routes
6. **Phase 6:** Generate deployment configs (ecosystem.config.js, middleware.ts)

### Acceptance Criteria
- ✅ `npm run build` completes without errors; all Tailwind classes render
- ✅ User can register, login, receive JWT session
- ✅ Free users see only free puzzles; premium users see all
- ✅ Puzzle player embeds EclipseCrossword HTML in iframe
- ✅ Progress saves/restores correctly across sessions
- ✅ Multiplayer room syncs grid edits in real-time (<1s latency)
- ✅ Stripe checkout updates user role via webhook
- ✅ Admin can upload puzzles and manage users via Refine.js
- ✅ Site runs on Hostinger Cloud via PM2 at https://crossword.network
- ✅ Lighthouse: Performance ≥ 90 (Desktop), ≥ 85 (Mobile); Accessibility ≥ 95

**Paste this entire spec into Cursor as a prompt to generate the codebase iteratively. Start with folder structure, then components, then integrations. If errors occur, debug with `npm run build` locally.**

---

**This comprehensive plan provides everything needed to build Crossword.Network successfully with modern Next.js full-stack architecture. With clear acceptance criteria, technology choices, and phased rollout, the project is positioned for successful implementation and growth.**

**© 2024 Maple-Tyne Technologies Inc. - Crossword.Network Trademark Protected**

**Created:** October 4, 2025
**Updated:** October 6, 2025  
**Version:** 4.0 (NEXT.JS FULL-STACK)  
**Status:** Ready for Implementation — Complete Next.js migration with Socket.IO, Prisma, NextAuth, Stripe

---

## Cozy Social UI Direction (Landing Revamp)

### Product Positioning
- Tone shifts from SaaS-first to cozy-social gaming: “Crossword nights, together.”
- Remove full pricing from the landing. Keep a small note only: “1‑week free trial • no card required”.

### Landing Structure
- **Header**: Minimal nav (Puzzles, Multiplayer), theme toggle, and a primary “Start a room” button.
- **Hero**:
  - Title: “Crossword nights, together.”
  - Sub: “Host a room, invite friends and family, and solve live—across phone, tablet, and desktop.”
  - CTAs: Primary “Start a room”. Secondary inline “Join a room” with a 6‑character code input + Join.
  - Visual: A “room snapshot” (small crossword grid) showing 2–4 colored cursors and 1–2 avatar chips.
- **Social Presence Strip (DB-backed)**: “Live now: {activeRoomsCount} rooms • {onlineCount} solvers online” plus a small avatar row.
- **Stories (replace 6 feature cards)**:
  - Play Together (host/invite, live cursors, spectate)
  - Save & Resume (progress sync across devices)
  - Compete & Improve (streaks, badges, leaderboards)

### Gamification Cues
- Streak chip for returning users (small pill near hero).
- Badges preview (3 compact icons; greyscale when locked).
- Leaderboard preview (“Top solvers tonight” – compact 3 rows).

### Visual Design System
- **Light theme**:
  - background: `#F6F7F5`
  - card: `#FFFFFF`
  - border: `#E5E8E2`
  - text: `#0E1512`
  - muted text: `#5F6E66`
  - primary (earthy green): `#2C7A5B`
  - primary-foreground: `#F4FBF7`
- **Dark theme**:
  - background: `#0B0F0D`
  - card: `#10161C`
  - border: `#1A211D`
  - text: `#E6ECE8`
  - muted text: `#9DB0A8`
  - primary (earthy green): `#2C7A5B`
  - primary-foreground: `#F4FBF7`
- Optional subtle accent for live presence/cursors only: `#60A5FA`.
- Accessibility: Maintain ≥ 4.5:1 contrast; low-glare backgrounds in both modes.

---

## Presence & Rooms (Prisma Additions)

To support real social presence and active room counts on the landing, add the following Prisma models (indices included):

```prisma
model Presence {
  id          Int      @id @default(autoincrement())
  userId      Int
  displayName String   @db.VarChar(100)
  avatarUrl   String?  @db.VarChar(255)
  status      PresenceStatus @default(ONLINE)
  lastSeenAt  DateTime @default(now())

  @@index([status])
  @@index([lastSeenAt])
}

enum PresenceStatus {
  ONLINE
  OFFLINE
}

model ActiveRoom {
  id                 Int      @id @default(autoincrement())
  code               String   @unique @db.Char(6)
  hostUserId         Int
  title              String?  @db.VarChar(120)
  participantsCount  Int      @default(0)
  isActive           Boolean  @default(true)
  startedAt          DateTime @default(now())
  lastUpdatedAt      DateTime @updatedAt

  @@index([isActive])
  @@index([lastUpdatedAt])
}

model RoomParticipant {
  id        Int      @id @default(autoincrement())
  roomId    Int
  userId    Int
  role      RoomRole @default(PLAYER)
  joinedAt  DateTime @default(now())
  leftAt    DateTime?

  @@index([roomId])
  @@index([userId])
  @@unique([roomId, userId])
}

enum RoomRole {
  HOST
  PLAYER
  SPECTATOR
}
```

---

## API Endpoints (Presence & Rooms)

- `GET /api/presence/summary` → `{ onlineCount: number, friendsOnline: Array<{displayName, avatarUrl}>, featuredAvatars: string[] }`
- `GET /api/rooms/summary` → `{ activeRoomsCount: number, featuredRooms: Array<{ code: string, participantsCount: number }> }`
- `GET /api/rooms/:code/exists` → `{ exists: boolean }`
- `POST /api/rooms` → `{ code: string }` (creates a room with a unique 6‑char `code`; host is current user)

Realtime (Phase 2):
- Socket.IO broadcasts presence/room updates; landing uses SWR polling (15–30s) with optional web socket subscription.

---

## Phased Delivery for Cozy Social Landing

- **Phase A (UI)**: Apply palette; implement new hero (Start/Join), room snapshot visual, social strip (placeholder), replace features with stories; remove pricing from landing; keep trial note.
- **Phase B (Data)**: Add Prisma models (Presence, ActiveRoom, RoomParticipant) and the summary endpoints; wire landing to live data.
- **Phase C (Realtime)**: Add Socket.IO for presence/rooms; reduce polling.

---

## Acceptance Criteria (Updated)

### Landing (Cozy Social)
- Hero shows “Crossword nights, together.” with Start/Join controls (client validation for 6‑char join code).
- Social strip displays real counts and avatar row via `/api/presence/summary` and `/api/rooms/summary`.
- Stories section replaces feature grid (Play Together, Save & Resume, Compete & Improve).
- Pricing removed from landing; a subtle trial note remains.
- Light/dark themes match the specified tokens and pass contrast checks.

### Database & API
- Prisma models created with indexes and relations where applicable.
- Endpoints return correct shapes and perform within p95 ≤ 200ms.
- POST `/api/rooms` generates unique 6‑char `code`; GET `/api/rooms/:code/exists` returns `exists` flag.

### Performance & Accessibility
- Landing maintains Lighthouse Performance ≥ 90 (desktop) / ≥ 85 (mobile), Accessibility ≥ 95.
- Live counts announced politely (aria-live) without layout shifts or excessive reflow.
