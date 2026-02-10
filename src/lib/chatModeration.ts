/**
 * Chat moderation utilities and types
 */

export interface ModerationConfig {
  maxWarnings: number;
  warningCooldown: number;
  strictMode: boolean;
  customFilters: string[];
  whitelist: string[];
}

export interface ModerationAction {
  action: 'warning' | 'block' | 'unblock' | 'clear-warnings';
  userId: string;
  timestamp: Date;
  reason?: string;
}

export interface ModerationStats {
  totalWarnings: number;
  blockedCount: number;
  recentActionCount: number;
  isEnabled: boolean;
  isStrictMode: boolean;
}

export interface ModerationResult {
  allowed: boolean;
  reason?: string;
  action?: ModerationAction;
}

/**
 * Default inappropriate words list
 */
export const DEFAULT_INAPPROPRIATE_WORDS = [
  'spam', 'scam', 'fake', 'hack', 'cheat', 'exploit',
  'hate', 'discrimination', 'harassment', 'abuse',
  'inappropriate', 'offensive', 'vulgar', 'profanity',
  'racist', 'sexist', 'homophobic', 'transphobic',
  'threat', 'violence', 'suicide', 'self-harm'
];

/**
 * Check if a message contains inappropriate content
 */
export function checkInappropriateContent(
  message: string,
  customFilters: string[] = [],
  strictMode: boolean = false
): { hasInappropriate: boolean; matchedWords: string[] } {
  const messageLower = message.toLowerCase();
  const allFilters = [...DEFAULT_INAPPROPRIATE_WORDS, ...customFilters];
  
  const matchedWords: string[] = [];
  
  for (const word of allFilters) {
    if (messageLower.includes(word.toLowerCase())) {
      matchedWords.push(word);
    }
  }
  
  // In strict mode, also check for partial matches and common variations
  if (strictMode) {
    const strictPatterns = [
      /\b(?:f\*ck|f\*\*k|f\*\*\*)\b/i,
      /\b(?:sh\*t|sh\*\*t|sh\*\*\*)\b/i,
      /\b(?:b\*tch|b\*\*ch|b\*\*\*)\b/i,
      /\b(?:d\*mn|d\*\*n|d\*\*\*)\b/i,
      /\b(?:h\*ll|h\*\*l|h\*\*\*)\b/i
    ];
    
    for (const pattern of strictPatterns) {
      if (pattern.test(message)) {
        matchedWords.push('profanity');
      }
    }
  }
  
  return {
    hasInappropriate: matchedWords.length > 0,
    matchedWords
  };
}

/**
 * Check if a user is in cooldown period
 */
export function isUserInCooldown(
  userId: string,
  lastWarningTime: number,
  cooldownPeriod: number
): boolean {
  const now = Date.now();
  return (now - lastWarningTime) < cooldownPeriod;
}

/**
 * Generate a moderation reason based on detected content
 */
export function generateModerationReason(
  matchedWords: string[],
  isStrictMode: boolean
): string {
  if (matchedWords.length === 0) return 'Unknown violation';
  
  if (matchedWords.includes('profanity')) {
    return 'Profanity detected';
  }
  
  if (matchedWords.some(word => ['hate', 'discrimination', 'racist', 'sexist'].includes(word))) {
    return 'Hate speech detected';
  }
  
  if (matchedWords.some(word => ['harassment', 'abuse'].includes(word))) {
    return 'Harassment detected';
  }
  
  if (matchedWords.some(word => ['spam', 'scam'].includes(word))) {
    return 'Spam/scam content detected';
  }
  
  if (matchedWords.some(word => ['hack', 'cheat', 'exploit'].includes(word))) {
    return 'Suspicious activity detected';
  }
  
  if (isStrictMode) {
    return 'Content violates strict moderation rules';
  }
  
  return 'Inappropriate content detected';
}

/**
 * Sanitize a message by removing or replacing inappropriate content
 */
export function sanitizeMessage(
  message: string,
  replacement: string = '[FILTERED]'
): string {
  const { matchedWords } = checkInappropriateContent(message);
  
  if (matchedWords.length === 0) return message;
  
  // Simple replacement - in a real implementation, you'd want more sophisticated filtering
  let sanitized = message;
  for (const word of matchedWords) {
    const regex = new RegExp(word, 'gi');
    sanitized = sanitized.replace(regex, replacement);
  }
  
  return sanitized;
}

/**
 * Check if a user should be automatically blocked
 */
export function shouldBlockUser(
  warningCount: number,
  maxWarnings: number,
  isStrictMode: boolean
): boolean {
  if (isStrictMode) {
    return warningCount >= Math.max(1, maxWarnings - 1);
  }
  
  return warningCount >= maxWarnings;
}

/**
 * Get moderation severity level
 */
export function getModerationSeverity(
  matchedWords: string[],
  isStrictMode: boolean
): 'low' | 'medium' | 'high' | 'critical' {
  const criticalWords = ['hate', 'discrimination', 'racist', 'sexist', 'homophobic', 'transphobic'];
  const highWords = ['harassment', 'abuse', 'threat', 'violence'];
  const mediumWords = ['spam', 'scam', 'fake', 'inappropriate', 'offensive'];
  
  if (criticalWords.some(word => matchedWords.includes(word))) {
    return 'critical';
  }
  
  if (highWords.some(word => matchedWords.includes(word))) {
    return 'high';
  }
  
  if (mediumWords.some(word => matchedWords.includes(word))) {
    return 'medium';
  }
  
  if (isStrictMode) {
    return 'medium';
  }
  
  return 'low';
}

/**
 * Create a moderation action record
 */
export function createModerationAction(
  action: ModerationAction['action'],
  userId: string,
  reason?: string
): ModerationAction {
  return {
    action,
    userId,
    timestamp: new Date(),
    reason
  };
}

/**
 * Validate moderation configuration
 */
export function validateModerationConfig(config: Partial<ModerationConfig>): string[] {
  const errors: string[] = [];
  
  if (config.maxWarnings !== undefined && (config.maxWarnings < 1 || config.maxWarnings > 10)) {
    errors.push('maxWarnings must be between 1 and 10');
  }
  
  if (config.warningCooldown !== undefined && (config.warningCooldown < 0 || config.warningCooldown > 60 * 60 * 1000)) {
    errors.push('warningCooldown must be between 0 and 60 minutes');
  }
  
  if (config.customFilters !== undefined && !Array.isArray(config.customFilters)) {
    errors.push('customFilters must be an array');
  }
  
  if (config.whitelist !== undefined && !Array.isArray(config.whitelist)) {
    errors.push('whitelist must be an array');
  }
  
  return errors;
}

/**
 * Get default moderation configuration
 */
export function getDefaultModerationConfig(): ModerationConfig {
  return {
    maxWarnings: 3,
    warningCooldown: 5 * 60 * 1000, // 5 minutes
    strictMode: false,
    customFilters: [],
    whitelist: []
  };
}