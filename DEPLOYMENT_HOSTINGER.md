# Hostinger hPanel Node.js Deployment Guide (Full App)

This guide walks you through deploying the full crossword.network Next.js app (UI + API + emails) to Hostinger using the **hPanel Node.js App** manager and **GitHub deploy**.

> **Prerequisites**
> - Hostinger plan that supports Node.js apps (hPanel Node.js)
> - Node.js 18+ available on the server
> - Verified Resend domain for `crossword.network`
> - Provisioned MySQL/MariaDB instance (via Hostinger or external provider)

---

## 1. Create a Dedicated App Root Folder (Recommended)

Use a separate folder for the Node.js app root (do not run from `public_html`):

- **Node app root**: `~/domains/crossword.network/nodeapp`
- **Web root**: `~/domains/crossword.network/public_html`

Hostinger will clone/pull your GitHub repo into `nodeapp` and run build/start there.

---

## 2. Prepare Environment Variables

Set environment variables in Hostinger’s dashboard (recommended) rather than committing `.env` files.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Prisma connection string to your MySQL/MariaDB database |
| `NEXTAUTH_URL` | Public URL, e.g., `https://crossword.network` |
| `NEXTAUTH_SECRET` | Strong random string for NextAuth |
| `RESEND_API_KEY` | API key from Resend |
| `EMAIL_FROM` | Official sender, e.g., `Crossword Network <noreply@crossword.network>` |
| `NEXT_PUBLIC_APP_URL` | Public URL for client features, e.g., `https://crossword.network` |

Also required for Google sign-in:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

Recommended runtime bind:
- `BIND_HOST=127.0.0.1`

**Hostinger UI:** Dashboard → Websites → Manage → Advanced → Environment Variables → add keys above. Avoid committing actual secrets to Git.

---

## 3. Database Schema Changes (Important)

1. Create a new database via Hostinger’s “Databases” panel (MySQL > Create).
2. Note the credentials and construct `DATABASE_URL`, e.g.:
   ```
   mysql://USER:PASSWORD@HOST:PORT/DATABASE
   ```

### Production migration strategy

If your production DB is not baselined for Prisma Migrate, `npx prisma migrate deploy` will fail with `P3005`.

In that case, apply migrations via direct SQL:

```bash
npx prisma db execute \
  --file prisma/migrations/20260209_add_hint_usage_events/migration.sql \
  --schema prisma/schema.prisma
```

---

## 4. Build the Application

From your development machine:

```bash
npm ci
npm test
npm run build
```

This runs `next build` and outputs `.next` plus the custom `server.js` entry that the app already uses for dev/prod.

---

## 5. Deploy via GitHub (Hostinger Node.js App)

You can deploy via Git, ZIP upload, or FTP. Using Git is recommended:

1. In Hostinger Node.js App manager, connect your GitHub repo.
2. Set **Application root** to: `~/domains/crossword.network/nodeapp`
3. Configure the **Build Command**: `npm ci && npm test && npm run build`
4. Configure the **Start Command**: `npm run start`

Hostinger will install packages, run the build, and start the Node process with `node server.js`.

---

## 5. Resend Domain Verification

1. In Resend, add the domain `crossword.network`.
2. Add the provided TXT/CNAME records to your DNS (Cloudflare, Hostinger DNS, etc.).
3. Wait for verification (usually < 10 minutes).
4. Set `EMAIL_FROM` to the verified sender, e.g., `Crossword Network <waitlist@crossword.network>`.

All waitlist confirmations and admin notifications will now come from the official domain.

---

## 6. Expose Only the Waitlist (Optional)

If you want Hostinger to serve only the waitlist experience:

1. Deploy the full project (API routes live under `/api`).
2. In Hostinger → Domains → “Rewrite & Redirects”, add a redirect from `/` to `/waitlist` (or configure inside `src/middleware.ts` if you prefer app-level control).
3. Keep `/api/waitlist` accessible for form submissions.

---

## 7. Post-Deployment Checklist

- [ ] Visit `https://crossword.network/puzzles` and open a puzzle.
- [ ] Confirm guest mode works (no sign-in required for puzzles).
- [ ] Use hints and confirm rate limits (word 2/hr, letter 5/hr).
- [ ] Run DB smoke: `npx tsx scripts/predeploy-smoke.ts`
- [ ] Submit the Contact Us form and confirm email delivery.
- [ ] Monitor Hostinger logs (`Dashboard → Manage → Logs`) for errors.

---

## Troubleshooting

| Issue | Fix |
| --- | --- |
| `500 Internal Server Error` | Check `npm run build` output and server logs. Ensure environment variables are set. |
| Emails not sending | Verify `RESEND_API_KEY`, make sure domain is verified, check rate limits. |
| Database connection errors | Confirm firewall/whitelist settings and correct `DATABASE_URL`. |
| Waiting page not reachable | Confirm the app is running on the correct port (Hostinger proxies automatically) and that `/waitlist` route exists. |

---

By following the steps above, you deploy the waitlist UI, the `/api/waitlist` endpoint, and the email workflows to Hostinger Cloud hosting using the official crossword.network email identity.

For repeatable configuration, see `deploy/hostinger/nodeapp/README.md`.
