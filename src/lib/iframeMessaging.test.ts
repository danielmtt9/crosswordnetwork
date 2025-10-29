import {
  isIframeToParentMessage,
  isParentToIframeMessage,
  isValidOrigin,
  validateMessage,
  generateMessageId,
} from './iframeMessaging';

describe('iframeMessaging', () => {
  describe('isIframeToParentMessage', () => {
    it('should validate progress messages', () => {
      expect(isIframeToParentMessage({ type: 'progress', completed: 10, total: 100 })).toBe(true);
    });

    it('should validate complete messages', () => {
      expect(isIframeToParentMessage({ type: 'complete', timestamp: Date.now() })).toBe(true);
    });

    it('should reject invalid messages', () => {
      expect(isIframeToParentMessage({ type: 'invalid' })).toBe(false);
      expect(isIframeToParentMessage(null)).toBe(false);
      expect(isIframeToParentMessage({})).toBe(false);
    });
  });

  describe('isParentToIframeMessage', () => {
    it('should validate GET_STATE messages', () => {
      expect(isParentToIframeMessage({ type: 'GET_STATE' })).toBe(true);
    });

    it('should validate LOAD_STATE messages', () => {
      expect(isParentToIframeMessage({ type: 'LOAD_STATE', state: 'test' })).toBe(true);
    });

    it('should reject invalid messages', () => {
      expect(isParentToIframeMessage({ type: 'invalid' })).toBe(false);
    });
  });

  describe('isValidOrigin', () => {
    it('should allow same origin', () => {
      expect(isValidOrigin(window.location.origin, [])).toBe(true);
    });

    it('should allow wildcard', () => {
      expect(isValidOrigin('https://example.com', ['*'])).toBe(true);
    });

    it('should allow specific origin', () => {
      expect(isValidOrigin('https://example.com', ['https://example.com'])).toBe(true);
    });

    it('should reject non-allowed origin', () => {
      expect(isValidOrigin('https://evil.com', ['https://example.com'])).toBe(false);
    });
  });

  describe('validateMessage', () => {
    it('should validate correct progress message', () => {
      const result = validateMessage({ type: 'progress', completed: 10, total: 100 });
      expect(result.valid).toBe(true);
    });

    it('should reject message without type', () => {
      const result = validateMessage({ data: 'test' });
      expect(result.valid).toBe(false);
    });

    it('should reject invalid progress message', () => {
      const result = validateMessage({ type: 'progress' });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('completed/total');
    });
  });

  describe('generateMessageId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateMessageId();
      const id2 = generateMessageId();
      expect(id1).not.toBe(id2);
    });
  });
});
