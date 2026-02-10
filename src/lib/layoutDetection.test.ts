import {
  getLayoutType,
  shouldUseTabbedClues,
  getGridTemplate,
  shouldUseCluesSidebar,
  getPuzzleMaxWidth,
  getMobileComponentPriority,
} from './layoutDetection';

describe('layoutDetection', () => {
  describe('getLayoutType', () => {
    it('should return desktop-single for desktop', () => {
      const result = getLayoutType('desktop', 'single');
      expect(result).toBe('desktop-single');
    });

    it('should return mobile-single for mobile', () => {
      const result = getLayoutType('mobile', 'single');
      expect(result).toBe('mobile-single');
    });

    it('should treat tablet as mobile for single player', () => {
      const result = getLayoutType('tablet', 'single');
      expect(result).toBe('mobile-single');
    });
  });

  describe('shouldUseTabbedClues', () => {
    it('should return false for desktop layouts', () => {
      expect(shouldUseTabbedClues('desktop-single')).toBe(false);
    });

    it('should return true for mobile layouts', () => {
      expect(shouldUseTabbedClues('mobile-single')).toBe(true);
    });
  });

  describe('getGridTemplate', () => {
    it('should return 2-column grid for desktop-single', () => {
      expect(getGridTemplate('desktop-single')).toBe('3fr 7fr');
    });

    it('should return single column for mobile-single', () => {
      expect(getGridTemplate('mobile-single')).toBe('1fr');
    });
  });

  describe('shouldUseCluesSidebar', () => {
    it('should return true for desktop', () => {
      expect(shouldUseCluesSidebar('desktop')).toBe(true);
    });

    it('should return false for mobile', () => {
      expect(shouldUseCluesSidebar('mobile')).toBe(false);
    });

    it('should return false for tablet', () => {
      expect(shouldUseCluesSidebar('tablet')).toBe(false);
    });
  });

  describe('getPuzzleMaxWidth', () => {
    it('should return 1000px for desktop-single', () => {
      expect(getPuzzleMaxWidth('desktop-single')).toBe('1000px');
    });

    it('should return 100% for mobile-single', () => {
      expect(getPuzzleMaxWidth('mobile-single')).toBe('100%');
    });
  });

  describe('getMobileComponentPriority', () => {
    it('should return correct priority for single player mode', () => {
      const result = getMobileComponentPriority('single');
      expect(result).toEqual(['puzzle', 'clues']);
    });

    it('should always have puzzle as first priority', () => {
      expect(getMobileComponentPriority('single')[0]).toBe('puzzle');
    });
  });
});
