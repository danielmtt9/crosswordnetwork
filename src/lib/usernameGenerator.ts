export function generateUniqueUsername(baseName?: string): string {
  const adjectives = [
    'Clever', 'Swift', 'Bright', 'Sharp', 'Quick', 'Smart', 'Wise', 'Bold',
    'Calm', 'Cool', 'Fast', 'Good', 'Great', 'Happy', 'Kind', 'Lucky',
    'Nice', 'Proud', 'Safe', 'Strong', 'Sweet', 'True', 'Warm', 'Wild'
  ];

  const nouns = [
    'Solver', 'Player', 'Master', 'Expert', 'Champion', 'Hero', 'Star',
    'Genius', 'Wizard', 'Ace', 'Pro', 'Guru', 'Legend', 'Virtuoso',
    'Puzzle', 'Crossword', 'Word', 'Grid', 'Square', 'Clue', 'Answer'
  ];

  if (baseName) {
    // Clean the base name and add a random number
    const cleanName = baseName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const randomNum = Math.floor(Math.random() * 1000);
    return `${cleanName}${randomNum}`;
  }

  // Generate a random username
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const randomNum = Math.floor(Math.random() * 1000);

  return `${adjective}${noun}${randomNum}`;
}

export function generateUsername(): string {
  return generateUniqueUsername();
}

export function validateUsername(username: string): { isValid: boolean; error?: string } {
  if (!username || username.length < 3) {
    return { isValid: false, error: 'Username must be at least 3 characters long' };
  }

  if (username.length > 20) {
    return { isValid: false, error: 'Username must be no more than 20 characters long' };
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    return { isValid: false, error: 'Username can only contain letters, numbers, underscores, and hyphens' };
  }

  if (username.startsWith('-') || username.endsWith('-')) {
    return { isValid: false, error: 'Username cannot start or end with a hyphen' };
  }

  return { isValid: true };
}

export async function isUsernameAvailable(username: string): Promise<boolean> {
  try {
    const { prisma } = await import('./prisma');
    const existingUser = await prisma.user.findFirst({
      where: { username: username.toLowerCase() }
    });
    return !existingUser;
  } catch (error) {
    console.error('Error checking username availability:', error);
    return false;
  }
}