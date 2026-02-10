import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Generate random username like "SwiftSolver123"
function generateRandomUsername() {
  const adjectives = ['Swift', 'Clever', 'Bright', 'Quick', 'Sharp', 'Wise', 'Smart', 'Fast', 'Bold', 'Cool'];
  const nouns = ['Solver', 'Puzzler', 'Mind', 'Thinker', 'Genius', 'Master', 'Player', 'Brain', 'Ace', 'Star'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 1000);
  return `${adj}${noun}${num}`;
}

// Check if username is available
async function isUsernameAvailable(username) {
  try {
    const existing = await prisma.user.findUnique({ 
      where: { username },
      select: { id: true }
    });
    return !existing;
  } catch (error) {
    console.error('Error checking username availability:', error);
    return false;
  }
}

// Generate unique username
async function generateUniqueUsername() {
  let username = generateRandomUsername();
  let attempts = 0;
  
  while (attempts < 10) {
    if (await isUsernameAvailable(username)) {
      return username;
    }
    username = generateRandomUsername();
    attempts++;
  }
  
  // Fallback: use timestamp
  return `Player_${Date.now()}`;
}

async function assignUsernamesToExistingUsers() {
  try {
    console.log('Starting username assignment for existing users...');
    
    // Find all users without usernames
    const usersWithoutUsernames = await prisma.user.findMany({
      where: {
        username: null
      },
      select: {
        id: true,
        name: true,
        email: true
      }
    });
    
    console.log(`Found ${usersWithoutUsernames.length} users without usernames`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const user of usersWithoutUsernames) {
      try {
        const username = await generateUniqueUsername();
        
        await prisma.user.update({
          where: { id: user.id },
          data: { username }
        });
        
        console.log(`✓ Assigned username "${username}" to user ${user.email || user.name || user.id}`);
        successCount++;
      } catch (error) {
        console.error(`✗ Failed to assign username to user ${user.email || user.name || user.id}:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`\nUsername assignment completed:`);
    console.log(`✓ Successfully assigned: ${successCount}`);
    console.log(`✗ Errors: ${errorCount}`);
    
  } catch (error) {
    console.error('Error in username assignment process:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
assignUsernamesToExistingUsers();
