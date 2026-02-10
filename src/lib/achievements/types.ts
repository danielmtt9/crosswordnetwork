export type AchievementCategory = 
  | 'COMPLETION'
  | 'SPEED'
  | 'STREAK'
  | 'ACCURACY'
  | 'SOCIAL'
  | 'MASTERY'
  | 'SPECIAL';

export type AchievementTier = 
  | 'BRONZE'
  | 'SILVER'
  | 'GOLD'
  | 'PLATINUM'
  | 'DIAMOND';

export type AchievementEventType = 
  | 'puzzle_completed'
  | 'daily_activity'
  | 'streak_milestone'
  | 'accuracy_milestone'
  | 'speed_milestone';

export interface AchievementRequirement {
  type: string;
  threshold: number;
  meta?: Record<string, any>;
}

export interface Achievement {
  id: string;
  key: string;
  name: string;
  description: string | null;
  category: AchievementCategory;
  tier: AchievementTier;
  points: number;
  iconName: string;
  requirement: string; // JSON string of AchievementRequirement
  isSecret: boolean;
  order: number;
  createdAt: Date;
}

export interface UserAchievement {
  id: string;
  userId: string;
  achievementId: string;
  progress: number;
  earnedAt: Date | null;
  notified: boolean;
  createdAt: Date;
  achievement?: Achievement;
}

export interface AchievementEvent {
  type: AchievementEventType;
  data: any;
}

export interface UnlockedAchievement {
  id: string;
  key: string;
  name: string;
  description: string | null;
  category: AchievementCategory;
  tier: AchievementTier;
  points: number;
  iconName: string;
}

export interface AchievementProgress {
  achievement: Achievement;
  userProgress: UserAchievement | null;
  isUnlocked: boolean;
  progressPercentage: number;
}

// Achievement requirement types
export interface PuzzleCompletionRequirement extends AchievementRequirement {
  type: 'puzzles_completed';
  threshold: number;
}

export interface SpeedRequirement extends AchievementRequirement {
  type: 'completion_time';
  threshold: number; // in seconds
}

export interface StreakRequirement extends AchievementRequirement {
  type: 'daily_streak';
  threshold: number; // days
}

export interface AccuracyRequirement extends AchievementRequirement {
  type: 'accuracy_threshold';
  threshold: number; // percentage
}

export interface DifficultyRequirement extends AchievementRequirement {
  type: 'difficulty_complete';
  threshold: string; // difficulty level
}

export interface DifficultyCountRequirement extends AchievementRequirement {
  type: 'difficulty_completed_count';
  threshold: number;
  meta: {
    difficulty: string;
  };
}

// Achievement metadata
export const ACHIEVEMENT_CATEGORIES: Record<AchievementCategory, {
  name: string;
  description: string;
  icon: string;
  color: string;
}> = {
  COMPLETION: {
    name: 'Completion',
    description: 'Complete puzzles and reach milestones',
    icon: 'Target',
    color: 'blue',
  },
  SPEED: {
    name: 'Speed',
    description: 'Solve puzzles quickly',
    icon: 'Zap',
    color: 'yellow',
  },
  STREAK: {
    name: 'Streak',
    description: 'Maintain daily solving streaks',
    icon: 'Flame',
    color: 'orange',
  },
  ACCURACY: {
    name: 'Accuracy',
    description: 'Solve puzzles with high accuracy',
    icon: 'Target',
    color: 'green',
  },
  SOCIAL: {
    name: 'Social',
    description: 'Engage with the community',
    icon: 'Users',
    color: 'purple',
  },
  MASTERY: {
    name: 'Mastery',
    description: 'Master difficult puzzles',
    icon: 'Shield',
    color: 'red',
  },
  SPECIAL: {
    name: 'Special',
    description: 'Unique and seasonal achievements',
    icon: 'Sparkles',
    color: 'pink',
  },
};

export const ACHIEVEMENT_TIERS: Record<AchievementTier, {
  name: string;
  description: string;
  color: string;
  pointsMultiplier: number;
}> = {
  BRONZE: {
    name: 'Bronze',
    description: 'Basic achievements',
    color: 'amber',
    pointsMultiplier: 1,
  },
  SILVER: {
    name: 'Silver',
    description: 'Intermediate achievements',
    color: 'gray',
    pointsMultiplier: 2,
  },
  GOLD: {
    name: 'Gold',
    description: 'Advanced achievements',
    color: 'yellow',
    pointsMultiplier: 3,
  },
  PLATINUM: {
    name: 'Platinum',
    description: 'Expert achievements',
    color: 'slate',
    pointsMultiplier: 5,
  },
  DIAMOND: {
    name: 'Diamond',
    description: 'Legendary achievements',
    color: 'cyan',
    pointsMultiplier: 10,
  },
};
