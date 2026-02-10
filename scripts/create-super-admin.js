const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createSuperAdmin() {
  const email = 'superadmin@crossword.network';
  const password = process.argv[2]; // Get password from command line
  
  if (!password) {
    console.error('Usage: node scripts/create-super-admin.js <password>');
    process.exit(1);
  }
  
  const hashedPassword = await bcrypt.hash(password, 12);
  
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      role: 'ADMIN',
      name: 'Super Admin',
      password: hashedPassword,
      requirePasswordChange: true,
    },
    create: {
      email,
      name: 'Super Admin',
      password: hashedPassword,
      role: 'ADMIN',
      subscriptionStatus: 'ACTIVE',
      requirePasswordChange: true,
    },
  });
  
  console.log('Super admin created/updated:', user.email);
  await prisma.$disconnect();
}

createSuperAdmin().catch(console.error);
