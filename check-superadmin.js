const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkSuperAdmin() {
  try {
    console.log('🔍 Checking superadmin account and admin users...\n');
    
    // Check for superadmin account
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
        createdAt: true,
        updatedAt: true
      }
    });

    if (superAdmin) {
      console.log('✅ Superadmin account found:');
      console.log(`   ID: ${superAdmin.id}`);
      console.log(`   Name: ${superAdmin.name || 'Not set'}`);
      console.log(`   Email: ${superAdmin.email}`);
      console.log(`   Role: ${superAdmin.role}`);
      console.log(`   Account Status: ${superAdmin.accountStatus}`);
      console.log(`   Created: ${superAdmin.createdAt}`);
      console.log(`   Updated: ${superAdmin.updatedAt}`);
      
      // Check if it meets superadmin criteria
      const isSuperAdmin = (
        superAdmin.role === 'ADMIN' && 
        superAdmin.accountStatus === 'ACTIVE' &&
        superAdmin.email?.endsWith('@crossword.network') === true
      );
      
      console.log(`\n🔐 Superadmin Status: ${isSuperAdmin ? '✅ VALID' : '❌ INVALID'}`);
      
      if (!isSuperAdmin) {
        console.log('\n❌ Issues found:');
        if (superAdmin.role !== 'ADMIN') console.log(`   - Role should be 'ADMIN', but is '${superAdmin.role}'`);
        if (superAdmin.accountStatus !== 'ACTIVE') console.log(`   - Account status should be 'ACTIVE', but is '${superAdmin.accountStatus}'`);
        if (!superAdmin.email?.endsWith('@crossword.network')) console.log(`   - Email should end with '@crossword.network'`);
      }
    } else {
      console.log('❌ Superadmin account not found!');
      console.log('   Email: superadmin@crossword.network');
    }

    // Check all admin users
    console.log('\n👥 All admin users:');
    const adminUsers = await prisma.user.findMany({
      where: {
        role: 'ADMIN'
      },
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

    if (adminUsers.length > 0) {
      adminUsers.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.name || 'No name'} (${user.email})`);
        console.log(`      Role: ${user.role}, Status: ${user.accountStatus}`);
        console.log(`      Created: ${user.createdAt}`);
      });
    } else {
      console.log('   No admin users found');
    }

    // Check total user count
    const totalUsers = await prisma.user.count();
    console.log(`\n📊 Total users in database: ${totalUsers}`);

  } catch (error) {
    console.error('❌ Error checking superadmin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSuperAdmin();