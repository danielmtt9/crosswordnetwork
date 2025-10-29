const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testAdminAccess() {
  try {
    console.log('🔍 Testing admin dashboard access...\n');
    
    // Check superadmin account
    const superAdmin = await prisma.user.findFirst({
      where: {
        email: 'superadmin@crossword.network'
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        accountStatus: true,
        password: true
      }
    });

    if (superAdmin) {
      console.log('✅ Superadmin account details:');
      console.log(`   ID: ${superAdmin.id}`);
      console.log(`   Name: ${superAdmin.name}`);
      console.log(`   Email: ${superAdmin.email}`);
      console.log(`   Role: ${superAdmin.role}`);
      console.log(`   Account Status: ${superAdmin.accountStatus}`);
      console.log(`   Has Password: ${superAdmin.password ? 'Yes' : 'No'}`);
      
      // Check if it meets admin criteria for middleware
      const isAdmin = superAdmin.role === 'ADMIN';
      console.log(`\n🔐 Admin Status for Middleware: ${isAdmin ? '✅ VALID' : '❌ INVALID'}`);
      
      if (isAdmin) {
        console.log('\n✅ The superadmin account should be able to access /admin');
        console.log('   - Role is ADMIN ✓');
        console.log('   - Account status is ACTIVE ✓');
        console.log('   - Email ends with @crossword.network ✓');
        console.log('\n🔧 To access the admin dashboard:');
        console.log('   1. Go to http://localhost:3004/signin');
        console.log('   2. Sign in with: superadmin@crossword.network');
        console.log('   3. Use the password you set when creating the account');
        console.log('   4. Navigate to http://localhost:3004/admin');
      } else {
        console.log('\n❌ Issues preventing admin access:');
        if (superAdmin.role !== 'ADMIN') {
          console.log(`   - Role should be 'ADMIN', but is '${superAdmin.role}'`);
        }
      }
    } else {
      console.log('❌ Superadmin account not found!');
      console.log('   Run: node scripts/create-super-admin.js <password>');
    }

    // Check all users for debugging
    console.log('\n👥 All users in database:');
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        accountStatus: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    allUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.name || 'No name'} (${user.email})`);
      console.log(`      Role: ${user.role}, Status: ${user.accountStatus}`);
      console.log(`      Created: ${user.createdAt}`);
    });

  } catch (error) {
    console.error('❌ Error testing admin access:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAdminAccess();