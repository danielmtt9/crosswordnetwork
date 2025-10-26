import { prisma } from './prisma';

// Generate random username like "SwiftSolver123"
export function generateRandomUsername(): string {
  const adjectives = ['Swift', 'Clever', 'Bright', 'Quick', 'Sharp', 'Wise', 'Smart', 'Fast', 'Bold', 'Cool'];
  const nouns = ['Solver', 'Puzzler', 'Mind', 'Thinker', 'Genius', 'Master', 'Player', 'Brain', 'Ace', 'Star'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 1000);
  return `${adj}${noun}${num}`;
}

// Check if username is available
export async function isUsernameAvailable(username: string): Promise<boolean> {
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
export async function generateUniqueUsername(): Promise<string> {
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

// Validate username format
export function validateUsername(username: string): { valid: boolean; error?: string } {
  if (!username || username.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters long' };
  }
  
  if (username.length > 20) {
    return { valid: false, error: 'Username must be 20 characters or less' };
  }
  
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return { valid: false, error: 'Username can only contain letters, numbers, and underscores' };
  }
  
  if (username.startsWith('_') || username.endsWith('_')) {
    return { valid: false, error: 'Username cannot start or end with underscore' };
  }
  
  if (username.includes('__')) {
    return { valid: false, error: 'Username cannot contain consecutive underscores' };
  }
  
  return { valid: true };
}

// Generate username for existing user (migration helper)
export async function assignUsernameToUser(userId: string): Promise<string> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true }
    });
    
    if (!user) {
      throw new Error('User not found');
    }
    
    if (user.username) {
      return user.username; // Already has username
    }
    
    const username = await generateUniqueUsername();
    
    await prisma.user.update({
      where: { id: userId },
      data: { username }
    });
    
    return username;
  } catch (error) {
    console.error('Error assigning username to user:', error);
    throw error;
  }
}
