export const PUZZLE_TAGS = {
  DAILY: 'daily',
  THEMED: 'themed',
  BEGINNER_FRIENDLY: 'beginner-friendly',
  EXPERT: 'expert',
  SEASONAL: 'seasonal',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly'
} as const;

export type PuzzleTag = typeof PUZZLE_TAGS[keyof typeof PUZZLE_TAGS];

export interface Puzzle {
  id: number;
  title: string;
  description?: string;
  tags?: string;
  // ... other puzzle fields
}

export function parseTags(tagsString?: string): string[] {
  if (!tagsString) return [];
  try {
    return JSON.parse(tagsString);
  } catch {
    return [];
  }
}

export function hasTags(puzzle: Puzzle, tags: string[]): boolean {
  const puzzleTags = parseTags(puzzle.tags);
  return tags.every(tag => puzzleTags.includes(tag));
}

export function hasAnyTag(puzzle: Puzzle, tags: string[]): boolean {
  const puzzleTags = parseTags(puzzle.tags);
  return tags.some(tag => puzzleTags.includes(tag));
}

export function getTagDisplayName(tag: string): string {
  const displayNames: Record<string, string> = {
    [PUZZLE_TAGS.DAILY]: 'Daily Puzzle',
    [PUZZLE_TAGS.THEMED]: 'Themed',
    [PUZZLE_TAGS.BEGINNER_FRIENDLY]: 'Beginner Friendly',
    [PUZZLE_TAGS.EXPERT]: 'Expert Level',
    [PUZZLE_TAGS.SEASONAL]: 'Seasonal',
    [PUZZLE_TAGS.WEEKLY]: 'Weekly Challenge',
    [PUZZLE_TAGS.MONTHLY]: 'Monthly Special'
  };
  
  return displayNames[tag] || tag;
}

export function getTagColor(tag: string): string {
  const colors: Record<string, string> = {
    [PUZZLE_TAGS.DAILY]: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    [PUZZLE_TAGS.THEMED]: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    [PUZZLE_TAGS.BEGINNER_FRIENDLY]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    [PUZZLE_TAGS.EXPERT]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    [PUZZLE_TAGS.SEASONAL]: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    [PUZZLE_TAGS.WEEKLY]: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
    [PUZZLE_TAGS.MONTHLY]: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200'
  };
  
  return colors[tag] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
}
