import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const achievements = [
  // COMPLETION Category
  { 
    key: 'first_puzzle', 
    name: 'First Steps', 
    description: 'Complete your first puzzle', 
    category: 'COMPLETION', 
    tier: 'BRONZE', 
    points: 10, 
    iconName: 'Baby',
    requirement: JSON.stringify({ type: 'puzzles_completed', threshold: 1 }),
    order: 1
  },
  { 
    key: 'puzzle_5', 
    name: 'Getting Started', 
    description: 'Complete 5 puzzles', 
    category: 'COMPLETION', 
    tier: 'BRONZE', 
    points: 25, 
    iconName: 'Target',
    requirement: JSON.stringify({ type: 'puzzles_completed', threshold: 5 }),
    order: 2
  },
  { 
    key: 'puzzle_25', 
    name: 'Dedicated Solver', 
    description: 'Complete 25 puzzles', 
    category: 'COMPLETION', 
    tier: 'SILVER', 
    points: 50, 
    iconName: 'Award',
    requirement: JSON.stringify({ type: 'puzzles_completed', threshold: 25 }),
    order: 3
  },
  { 
    key: 'puzzle_50', 
    name: 'Puzzle Master', 
    description: 'Complete 50 puzzles', 
    category: 'COMPLETION', 
    tier: 'GOLD', 
    points: 100, 
    iconName: 'Crown',
    requirement: JSON.stringify({ type: 'puzzles_completed', threshold: 50 }),
    order: 4
  },
  { 
    key: 'puzzle_100', 
    name: 'Centurion', 
    description: 'Complete 100 puzzles', 
    category: 'COMPLETION', 
    tier: 'PLATINUM', 
    points: 250, 
    iconName: 'Trophy',
    requirement: JSON.stringify({ type: 'puzzles_completed', threshold: 100 }),
    order: 5
  },

  // SPEED Category
  { 
    key: 'speed_5min', 
    name: 'Lightning Fast', 
    description: 'Complete a puzzle in under 5 minutes', 
    category: 'SPEED', 
    tier: 'SILVER', 
    points: 30, 
    iconName: 'Zap',
    requirement: JSON.stringify({ type: 'completion_time', threshold: 300 }),
    order: 6
  },
  { 
    key: 'speed_3min', 
    name: 'Speed Demon', 
    description: 'Complete a puzzle in under 3 minutes', 
    category: 'SPEED', 
    tier: 'GOLD', 
    points: 75, 
    iconName: 'Bolt',
    requirement: JSON.stringify({ type: 'completion_time', threshold: 180 }),
    order: 7
  },
  
  // STREAK Category
  { 
    key: 'streak_3', 
    name: 'Getting Consistent', 
    description: 'Solve puzzles 3 days in a row', 
    category: 'STREAK', 
    tier: 'BRONZE', 
    points: 20, 
    iconName: 'Flame',
    requirement: JSON.stringify({ type: 'daily_streak', threshold: 3 }),
    order: 8
  },
  { 
    key: 'streak_7', 
    name: 'Week Warrior', 
    description: 'Solve puzzles 7 days in a row', 
    category: 'STREAK', 
    tier: 'SILVER', 
    points: 50, 
    iconName: 'Calendar',
    requirement: JSON.stringify({ type: 'daily_streak', threshold: 7 }),
    order: 9
  },
  { 
    key: 'streak_30', 
    name: 'Monthly Master', 
    description: 'Solve puzzles 30 days in a row', 
    category: 'STREAK', 
    tier: 'GOLD', 
    points: 150, 
    iconName: 'Star',
    requirement: JSON.stringify({ type: 'daily_streak', threshold: 30 }),
    order: 10
  },
  
  // ACCURACY Category
  { 
    key: 'accuracy_95', 
    name: 'Precision Player', 
    description: 'Complete a puzzle with 95%+ accuracy', 
    category: 'ACCURACY', 
    tier: 'SILVER', 
    points: 40, 
    iconName: 'Crosshair',
    requirement: JSON.stringify({ type: 'accuracy_threshold', threshold: 95 }),
    order: 11
  },
  { 
    key: 'accuracy_100', 
    name: 'Flawless Victory', 
    description: 'Complete a puzzle with 100% accuracy', 
    category: 'ACCURACY', 
    tier: 'GOLD', 
    points: 100, 
    iconName: 'CheckCircle',
    requirement: JSON.stringify({ type: 'accuracy_threshold', threshold: 100 }),
    order: 12
  },
  
  // MASTERY Category
  { 
    key: 'hard_complete', 
    name: 'Challenge Accepted', 
    description: 'Complete a hard difficulty puzzle', 
    category: 'MASTERY', 
    tier: 'SILVER', 
    points: 35, 
    iconName: 'Shield',
    requirement: JSON.stringify({ type: 'difficulty_complete', threshold: 'hard' }),
    order: 13
  },
  { 
    key: 'hard_10', 
    name: 'Expert Solver', 
    description: 'Complete 10 hard puzzles', 
    category: 'MASTERY', 
    tier: 'GOLD', 
    points: 125, 
    iconName: 'Sword',
    requirement: JSON.stringify({ type: 'difficulty_completed_count', threshold: 10, meta: { difficulty: 'hard' } }),
    order: 14
  },
  
  // SOCIAL Category
  { 
    key: 'multiplayer_join', 
    name: 'Team Player', 
    description: 'Join a multiplayer room', 
    category: 'SOCIAL', 
    tier: 'BRONZE', 
    points: 15, 
    iconName: 'Users',
    requirement: JSON.stringify({ type: 'multiplayer_join', threshold: 1 }),
    order: 15
  },
  { 
    key: 'multiplayer_host', 
    name: 'Room Host', 
    description: 'Host a multiplayer room', 
    category: 'SOCIAL', 
    tier: 'SILVER', 
    points: 30, 
    iconName: 'Home',
    requirement: JSON.stringify({ type: 'multiplayer_host', threshold: 1 }),
    order: 16
  },
];

async function seedAchievements() {
  console.log('Seeding achievements...');
  
  for (const achievement of achievements) {
    await prisma.achievement.upsert({
      where: { key: achievement.key },
      update: {
        ...achievement,
        category: achievement.category as any,
        tier: achievement.tier as any,
      },
      create: {
        ...achievement,
        category: achievement.category as any,
        tier: achievement.tier as any,
      },
    });
  }
  
  console.log(`Seeded ${achievements.length} achievements`);
}

seedAchievements()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
