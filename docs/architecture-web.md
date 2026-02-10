# Architecture - Web Application

## Executive Summary
The Crossword Network Web Application is a full-stack Next.js 15 application designed for collaborative crossword puzzle solving. It features real-time multiplayer capabilities, a comprehensive admin dashboard, and user progression systems.

## Technology Stack
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Frontend**: React 19, Tailwind CSS, Radix UI
- **Backend**: Next.js API Routes, Socket.io (for real-time features)
- **Database**: MySQL (accessed via Prisma ORM)
- **Authentication**: NextAuth.js (v5 beta)
- **Testing**: Jest

## Architecture Pattern
The application follows a **Monolithic** architecture using the **Next.js App Router** structure.
- **Frontend & Backend Co-location**: API routes and UI components reside in the same repository (`src/app`).
- **Server-Side Rendering (SSR) & Server Components**: Heavily utilizes React Server Components for performance and SEO.
- **Real-time Layer**: Integrates a custom Socket.io server (likely attached to the Next.js server or running alongside) for multiplayer synchronization.

## Data Architecture
Data is managed via **Prisma ORM** connecting to a **MySQL** database.
- **Key Models**: `User`, `Puzzle`, `MultiplayerRoom`, `UserProgress`.
- **Schema**: Defined in `prisma/schema.prisma`.
- **Migrations**: Managed via Prisma Migrate (`scripts/run_prisma.mjs`).

See [Data Models](./data-models-web.md) for details.

## API Design
The API is built using **Next.js Route Handlers** (`src/app/api/...`).
- **RESTful**: Endpoints follow REST conventions.
- **Security**: Protected via NextAuth.js session validation.

See [API Contracts](./api-contracts-web.md) for details.

## Component Overview
UI is modularized into feature-specific directories:
- **Puzzle**: Game grid, clues, controls.
- **Admin**: Dashboard widgets, tables.
- **UI**: Reusable primitives (buttons, dialogs).

See [Component Inventory](./component-inventory-web.md) for details.

## Development Workflow
- **Package Manager**: npm
- **Build Tool**: Next.js Compiler
- **Linting**: ESLint
- **Testing**: Jest (Unit/Integration)

See [Development Guide](./development-guide.md) for details.

## Deployment Architecture
Deployed as a Node.js application via PM2.
- **Entry Point**: `server.js` (Custom server to handle both Next.js request handler and Socket.io).
- **Process Management**: PM2 keeps the application alive.

See [Deployment Guide](./deployment-guide.md) for details.
