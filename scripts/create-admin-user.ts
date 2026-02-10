import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Creating admin user...');

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@crossword.network';
  const adminPassword = process.env.ADMIN_PASSWORD || 'AdminPassword123!';

  if (!adminEmail || !adminPassword) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required.');
  }

  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      password: hashedPassword,
      role: 'ADMIN',
      emailVerified: new Date(),
      subscriptionStatus: 'ACTIVE',
      accountStatus: 'ACTIVE',
    },
    create: {
      email: adminEmail,
      password: hashedPassword,
      name: 'Super Admin',
      role: 'ADMIN',
      emailVerified: new Date(),
      subscriptionStatus: 'ACTIVE',
      accountStatus: 'ACTIVE',
    },
  });

  console.log('✅ Admin user created:', {
    email: adminUser.email,
    name: adminUser.name,
    role: adminUser.role,
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
