# Development Guide

## Prerequisites
- Node.js (Version compatible with Next.js 15, likely 18+)
- MySQL Database
- npm, yarn, pnpm, or bun

## Installation

```bash
npm install
```

## Environment Setup
Create a `.env` file in the root directory. Required variables typically include:
- `DATABASE_URL`: Connection string for MySQL/Prisma
- `NEXTAUTH_SECRET`: Secret for authentication
- `NEXTAUTH_URL`: URL of the application
- (See `.env.example` if available, otherwise check `prisma/schema.prisma` and code for usages)

## Running Locally

```bash
npm run dev
```

The server will start on [http://localhost:3000](http://localhost:3000).

## Database Management
- **Migrate**: `npm run db:migrate` (Runs `scripts/run_prisma.mjs`)
- **Seed Users**: `npm run db:seed-test-users`
- **Create Super Admin**: `node scripts/create-super-admin.js <password>`

## Testing
- **Run Tests**: `npm test` (Jest)
- **Watch Mode**: `npm run test:watch`
- **Coverage**: `npm run test:coverage`

## Linting
- **Lint**: `npm run lint`
