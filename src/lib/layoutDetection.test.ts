import {
  getLayoutType,
  shouldShowMultiplayerPanel,
  shouldUseTabbedClues,
  getGridTemplate,
  shouldUseCluesSidebar,
  getPuzzleMaxWidth,
  getMobileComponentPriority,
  LayoutType,
} from './layoutDetection';
import { DeviceType } from '@/hooks/useDeviceType';
import { GameMode } from '@/hooks/useGameMode';

describe('layoutDetection', () => {
  describe('getLayoutType', () => {
    it('should return desktop-multiplayer for desktop and multiplayer mode', () => {
      const result = getLayoutType('desktop', 'multiplayer');
      expect(result).toBe('desktop-multiplayer');
    });

    it('should return desktop-single for desktop and single mode', () => {
      const result = getLayoutType('desktop', 'single');
      expect(result).toBe('desktop-single');
    });

    it('should return mobile-multiplayer for mobile and multiplayer mode', () => {
      const result = getLayoutType('mobile', 'multiplayer');
      expect(result).toBe('mobile-multiplayer');
    });

    it('should return mobile-single for mobile and single mode', () => {
      const result = getLayoutType('mobile', 'single');
      expect(result).toBe('mobile-single');
    });

    it('should treat tablet as mobile for multiplayer', () => {
      const result = getLayoutType('tablet', 'multiplayer');
      expect(result).toBe('mobile-multiplayer');
    });

    it('should treat tablet as mobile for single player', () => {
      const result = getLayoutType('tablet', 'single');
      expect(result).toBe('mobile-single');
    });
  });

  describe('shouldShowMultiplayerPanel', () => {
    it('should return true for desktop-multiplayer', () => {
      expect(shouldShowMultiplayerPanel('desktop-multiplayer')).toBe(true);
    });

    it('should return true for mobile-multiplayer', () => {
      expect(shouldShowMultiplayerPanel('mobile-multiplayer')).toBe(true);
    });

    it('should return false for desktop-single', () => {
      expect(shouldShowMultiplayerPanel('desktop-single')).toBe(false);
    });

    it('should return false for mobile-single', () => {
      expect(shouldShowMultiplayerPanel('mobile-single')).toBe(false);
    });
  });

  describe('shouldUseTabbedClues', () => {
    it('should return false for desktop layouts', () => {
      expect(shouldUseTabbedClues('desktop-multiplayer')).toBe(false);
      expect(shouldUseTabbedClues('desktop-single')).toBe(false);
    });

    it('should return true for mobile layouts', () => {
      expect(shouldUseTabbedClues('mobile-multiplayer')).toBe(true);
      expect(shouldUseTabbedClues('mobile-single')).toBe(true);
    });

    it('should return true for tablet layouts', () => {
      expect(shouldUseTabbedClues('tablet-multiplayer')).toBe(true);
      expect(shouldUseTabbedClues('tablet-single')).toBe(true);
    });
  });

  describe('getGridTemplate', () => {
    it('should return 3-column grid for desktop-multiplayer', () => {
      expect(getGridTemplate('desktop-multiplayer')).toBe('1fr 2fr 1fr');
    });

    it('should return 2-column grid for desktop-single', () => {
      expect(getGridTemplate('desktop-single')).toBe('3fr 7fr');
    });

    it('should return single column for mobile-multiplayer', () => {
      expect(getGridTemplate('mobile-multiplayer')).toBe('1fr');
    });

    it('should return single column for mobile-single', () => {
      expect(getGridTemplate('mobile-single')).toBe('1fr');
    });

    it('should return single column for tablet layouts', () => {
      expect(getGridTemplate('tablet-multiplayer')).toBe('1fr');
      expect(getGridTemplate('tablet-single')).toBe('1fr');
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
    it('should return 800px for desktop-multiplayer', () => {
      expect(getPuzzleMaxWidth('desktop-multiplayer')).toBe('800px');
    });

    it('should return 1000px for desktop-single', () => {
      expect(getPuzzleMaxWidth('desktop-single')).toBe('1000px');
    });

    it('should return 100% for mobile layouts', () => {
      expect(getPuzzleMaxWidth('mobile-multiplayer')).toBe('100%');
      expect(getPuzzleMaxWidth('mobile-single')).toBe('100%');
    });

    it('should return 100% for tablet layouts', () => {
      expect(getPuzzleMaxWidth('tablet-multiplayer')).toBe('100%');
      expect(getPuzzleMaxWidth('tablet-single')).toBe('100%');
    });
  });

  describe('getMobileComponentPriority', () => {
    it('should return correct priority for single player mode', () => {
      const result = getMobileComponentPriority('single');
      expect(result).toEqual(['puzzle', 'clues']);
    });

    it('should return correct priority for multiplayer mode', () => {
      const result = getMobileComponentPriority('multiplayer');
      expect(result).toEqual(['puzzle', 'clues', 'chat', 'players']);
    });

    it('should always have puzzle as first priority', () => {
      expect(getMobileComponentPriority('single')[0]).toBe('puzzle');
      expect(getMobileComponentPriority('multiplayer')[0]).toBe('puzzle');
    });
  });
});
