# Source Tree Analysis

## Project Structure (Monolith)

```
crosswordnetwork/
├── deploy-package/      # Deployment artifacts and configuration
│   ├── ecosystem.config.js # PM2 configuration for production
│   └── DEPLOY_INSTRUCTIONS.txt
├── docs/                # Project documentation
├── prisma/              # Database ORM configuration
│   ├── schema.prisma    # Data models
│   ├── migrations/      # SQL migrations
│   └── seed-achievements.ts # Seeding scripts
├── public/              # Static assets (images, fonts)
├── scripts/             # Maintenance and utility scripts
│   ├── run_prisma.mjs   # Database migration runner
│   └── create-test-users.ts
├── src/
│   ├── app/             # Next.js App Router (Pages & API)
│   │   ├── admin/       # Admin Dashboard routes
│   │   ├── api/         # Backend API endpoints
│   │   └── (routes)     # Application pages
│   ├── components/      # React UI Components
│   │   ├── admin/       # Admin-specific components
│   │   ├── puzzle/      # Crossword game components
│   │   └── ui/          # Reusable UI primitives
│   └── (lib/utils)      # Shared utilities (implied)
├── .env                 # Environment variables
├── next.config.ts       # Next.js configuration
├── package.json         # Dependencies and scripts
├── server.js            # Custom server entry point
└── tailwind.config.ts   # Styling configuration
```

## Critical Directories

- **src/app**: The core application logic, defining both the frontend views and the backend API routes.
- **src/components**: Contains all visual elements, separated into feature-specific folders (puzzle, admin) and generic UI primitives.
- **prisma**: The source of truth for the database schema. Changes here drive database migrations.
- **scripts**: Essential for database maintenance, seeding, and deployment tasks.
