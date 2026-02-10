import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Creating test users...');

  // Hash password for both users
  const password = 'Test123!';
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create FREE user
  const freeUser = await prisma.user.upsert({
    where: { email: 'free@test.com' },
    update: {},
    create: {
      email: 'free@test.com',
      password: hashedPassword,
      name: 'Free User',
      role: 'FREE',
      emailVerified: new Date(),
      subscriptionStatus: 'NONE',
      trialEndsAt: null,
    },
  });

  console.log('✅ Free user created:', {
    email: freeUser.email,
    name: freeUser.name,
    role: freeUser.role,
  });

  // Create PREMIUM user
  const premiumUser = await prisma.user.upsert({
    where: { email: 'premium@test.com' },
    update: {},
    create: {
      email: 'premium@test.com',
      password: hashedPassword,
      name: 'Premium User',
      role: 'PREMIUM',
      emailVerified: new Date(),
      subscriptionStatus: 'ACTIVE',
      trialEndsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
    },
  });

  console.log('✅ Premium user created:', {
    email: premiumUser.email,
    name: premiumUser.name,
    role: premiumUser.role,
    subscriptionStatus: premiumUser.subscriptionStatus,
  });

  console.log('\n📝 Test User Credentials:');
  console.log('─────────────────────────────────────');
  console.log('FREE USER:');
  console.log('  Email: free@test.com');
  console.log('  Password: Test123!');
  console.log('  Role: FREE');
  console.log('  Access: Limited features');
  console.log('');
  console.log('PREMIUM USER:');
  console.log('  Email: premium@test.com');
  console.log('  Password: Test123!');
  console.log('  Role: PREMIUM');
  console.log('  Access: Full features, multiplayer host/player');
  console.log('─────────────────────────────────────');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Error creating test users:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
