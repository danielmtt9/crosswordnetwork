const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testConnection() {
  try {
    console.log('Testing database connection...');
    
    // Test basic connection
    await prisma.$connect();
    console.log('✓ Database connected successfully');
    
    // Check for admin users
    console.log('\nChecking for admin users...');
    const adminUsers = await prisma.user.findMany({
      where: {
        role: 'ADMIN'
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        accountStatus: true
      }
    });
    
    console.log(`Found ${adminUsers.length} admin user(s):`);
    adminUsers.forEach(user => {
      console.log(`  - ${user.email} (${user.name}) - Status: ${user.accountStatus}`);
    });
    
    // Test stats queries
    console.log('\nTesting stats queries...');
    const totalUsers = await prisma.user.count();
    const totalPuzzles = await prisma.puzzle.count();
    const totalRooms = await prisma.multiplayerRoom.count();
    
    console.log(`  Total Users: ${totalUsers}`);
    console.log(`  Total Puzzles: ${totalPuzzles}`);
    console.log(`  Total Rooms: ${totalRooms}`);
    
    // Test audit log query
    console.log('\nTesting audit log query...');
    const auditLogs = await prisma.auditLog.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        actor: {
          select: { id: true, name: true, email: true }
        }
      }
    });
    console.log(`  Found ${auditLogs.length} audit log entries`);
    
    console.log('\n✓ All tests passed!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
