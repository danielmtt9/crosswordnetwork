/**
 * Tests for chatModeration library
 */

import {
  checkInappropriateContent,
  isUserInCooldown,
  generateModerationReason,
  sanitizeMessage,
  shouldBlockUser,
  getModerationSeverity,
  createModerationAction,
  validateModerationConfig,
  getDefaultModerationConfig
} from './chatModeration';

describe('chatModeration', () => {
  describe('checkInappropriateContent', () => {
    it('detects inappropriate words', () => {
      const result = checkInappropriateContent('This is spam content');
      expect(result.hasInappropriate).toBe(true);
      expect(result.matchedWords).toContain('spam');
    });

    it('detects multiple inappropriate words', () => {
      const result = checkInappropriateContent('This is spam and fake content');
      expect(result.hasInappropriate).toBe(true);
      expect(result.matchedWords).toContain('spam');
      expect(result.matchedWords).toContain('fake');
    });

    it('returns false for clean content', () => {
      const result = checkInappropriateContent('Hello everyone, how are you?');
      expect(result.hasInappropriate).toBe(false);
      expect(result.matchedWords).toHaveLength(0);
    });

    it('detects custom filters', () => {
      const result = checkInappropriateContent('This is custom spam', ['custom']);
      expect(result.hasInappropriate).toBe(true);
      expect(result.matchedWords).toContain('custom');
    });

    it('detects profanity in strict mode', () => {
      const result = checkInappropriateContent('f*ck this', [], true);
      expect(result.hasInappropriate).toBe(true);
      expect(result.matchedWords).toContain('profanity');
    });
  });

  describe('isUserInCooldown', () => {
    it('returns true when user is in cooldown', () => {
      const lastWarningTime = Date.now() - 2 * 60 * 1000; // 2 minutes ago
      const cooldownPeriod = 5 * 60 * 1000; // 5 minutes
      
      const result = isUserInCooldown('user1', lastWarningTime, cooldownPeriod);
      expect(result).toBe(true);
    });

    it('returns false when user is not in cooldown', () => {
      const lastWarningTime = Date.now() - 10 * 60 * 1000; // 10 minutes ago
      const cooldownPeriod = 5 * 60 * 1000; // 5 minutes
      
      const result = isUserInCooldown('user1', lastWarningTime, cooldownPeriod);
      expect(result).toBe(false);
    });
  });

  describe('generateModerationReason', () => {
    it('generates reason for profanity', () => {
      const reason = generateModerationReason(['profanity'], false);
      expect(reason).toBe('Profanity detected');
    });

    it('generates reason for hate speech', () => {
      const reason = generateModerationReason(['hate', 'racist'], false);
      expect(reason).toBe('Hate speech detected');
    });

    it('generates reason for harassment', () => {
      const reason = generateModerationReason(['harassment', 'abuse'], false);
      expect(reason).toBe('Harassment detected');
    });

    it('generates reason for spam', () => {
      const reason = generateModerationReason(['spam', 'scam'], false);
      expect(reason).toBe('Spam/scam content detected');
    });

    it('generates reason for suspicious activity', () => {
      const reason = generateModerationReason(['hack', 'cheat'], false);
      expect(reason).toBe('Suspicious activity detected');
    });

    it('generates reason for strict mode', () => {
      const reason = generateModerationReason(['inappropriate'], true);
      expect(reason).toBe('Content violates strict moderation rules');
    });

    it('generates default reason', () => {
      const reason = generateModerationReason(['unknown'], false);
      expect(reason).toBe('Inappropriate content detected');
    });
  });

  describe('sanitizeMessage', () => {
    it('replaces inappropriate words', () => {
      const result = sanitizeMessage('This is spam content');
      expect(result).toBe('This is [FILTERED] content');
    });

    it('replaces multiple inappropriate words', () => {
      const result = sanitizeMessage('This is spam and fake content');
      expect(result).toBe('This is [FILTERED] and [FILTERED] content');
    });

    it('returns original message if no inappropriate content', () => {
      const result = sanitizeMessage('Hello everyone!');
      expect(result).toBe('Hello everyone!');
    });

    it('uses custom replacement', () => {
      const result = sanitizeMessage('This is spam content', '***');
      expect(result).toBe('This is *** content');
    });
  });

  describe('shouldBlockUser', () => {
    it('blocks user when warning count exceeds limit', () => {
      const result = shouldBlockUser(3, 3, false);
      expect(result).toBe(true);
    });

    it('does not block user when warning count is below limit', () => {
      const result = shouldBlockUser(2, 3, false);
      expect(result).toBe(false);
    });

    it('blocks user earlier in strict mode', () => {
      const result = shouldBlockUser(2, 3, true);
      expect(result).toBe(true);
    });
  });

  describe('getModerationSeverity', () => {
    it('returns critical for hate speech', () => {
      const result = getModerationSeverity(['hate', 'racist'], false);
      expect(result).toBe('critical');
    });

    it('returns high for harassment', () => {
      const result = getModerationSeverity(['harassment', 'abuse'], false);
      expect(result).toBe('high');
    });

    it('returns medium for spam', () => {
      const result = getModerationSeverity(['spam', 'scam'], false);
      expect(result).toBe('medium');
    });

    it('returns medium for strict mode', () => {
      const result = getModerationSeverity(['inappropriate'], true);
      expect(result).toBe('medium');
    });

    it('returns low for minor violations', () => {
      const result = getModerationSeverity(['fake'], false);
      expect(result).toBe('low');
    });
  });

  describe('createModerationAction', () => {
    it('creates warning action', () => {
      const action = createModerationAction('warning', 'user1', 'Test reason');
      expect(action.action).toBe('warning');
      expect(action.userId).toBe('user1');
      expect(action.reason).toBe('Test reason');
      expect(action.timestamp).toBeInstanceOf(Date);
    });

    it('creates block action', () => {
      const action = createModerationAction('block', 'user1', 'Test reason');
      expect(action.action).toBe('block');
      expect(action.userId).toBe('user1');
      expect(action.reason).toBe('Test reason');
    });

    it('creates action without reason', () => {
      const action = createModerationAction('unblock', 'user1');
      expect(action.action).toBe('unblock');
      expect(action.userId).toBe('user1');
      expect(action.reason).toBeUndefined();
    });
  });

  describe('validateModerationConfig', () => {
    it('validates valid configuration', () => {
      const config = {
        maxWarnings: 3,
        warningCooldown: 5 * 60 * 1000,
        customFilters: ['spam'],
        whitelist: ['user1']
      };
      
      const errors = validateModerationConfig(config);
      expect(errors).toHaveLength(0);
    });

    it('validates invalid maxWarnings', () => {
      const config = { maxWarnings: 0 };
      const errors = validateModerationConfig(config);
      expect(errors).toContain('maxWarnings must be between 1 and 10');
    });

    it('validates invalid warningCooldown', () => {
      const config = { warningCooldown: -1 };
      const errors = validateModerationConfig(config);
      expect(errors).toContain('warningCooldown must be between 0 and 60 minutes');
    });

    it('validates invalid customFilters', () => {
      const config = { customFilters: 'not an array' };
      const errors = validateModerationConfig(config);
      expect(errors).toContain('customFilters must be an array');
    });

    it('validates invalid whitelist', () => {
      const config = { whitelist: 'not an array' };
      const errors = validateModerationConfig(config);
      expect(errors).toContain('whitelist must be an array');
    });
  });

  describe('getDefaultModerationConfig', () => {
    it('returns default configuration', () => {
      const config = getDefaultModerationConfig();
      expect(config.maxWarnings).toBe(3);
      expect(config.warningCooldown).toBe(5 * 60 * 1000);
      expect(config.strictMode).toBe(false);
      expect(config.customFilters).toEqual([]);
      expect(config.whitelist).toEqual([]);
    });
  });
});
