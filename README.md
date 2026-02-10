This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Super Admin System

This application includes a super admin system for managing user roles and permissions.

### Super Admin Email
- **Email**: `superadmin@crossword.network`
- **Role**: Only this email can promote users to ADMIN role
- **Protection**: Cannot be demoted or deleted by other admins

### Creating the Super Admin Account

Use the provided script to create the super admin account:

```bash
node scripts/create-super-admin.js <password>
```

Replace `<password>` with a secure password for the super admin account.

### Super Admin Privileges

1. **Admin Promotion**: Only the super admin can promote users to ADMIN role
2. **Account Protection**: Super admin account cannot be modified by regular admins
3. **Full Access**: Super admin has all regular admin privileges plus the above

### Security Considerations

- Super admin email is hardcoded for security (cannot be changed through UI)
- Only way to change super admin is through direct database access
- All attempts to modify super admin are logged in audit trail
- Super admin privileges are checked on both frontend and backend

### Admin Dashboard Access

1. Sign in with the super admin account
2. Navigate to `/admin` to access the admin dashboard
3. Use the "Manage Users" section to promote users to admin role
4. Regular admins will see restricted options when trying to modify the super admin account
# crosswordnetworkfree
