/**
 * Tests for useChatModeration hook
 */

import { renderHook, act } from '@testing-library/react';
import { useChatModeration } from './useChatModeration';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('useChatModeration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  it('initializes with default values', () => {
    const { result } = renderHook(() => useChatModeration({}));

    expect(result.current.isEnabled).toBe(true);
    expect(result.current.isStrictMode).toBe(false);
    expect(result.current.blockedUsers.size).toBe(0);
    expect(result.current.warningCounts.size).toBe(0);
  });

  it('loads configuration from localStorage', () => {
    const savedConfig = {
      maxWarnings: 5,
      warningCooldown: 10 * 60 * 1000,
      strictMode: true,
      customFilters: ['spam', 'scam'],
      whitelist: ['user1'],
      enabled: false
    };
    
    localStorageMock.getItem.mockReturnValue(JSON.stringify(savedConfig));

    const { result } = renderHook(() => useChatModeration({}));

    expect(result.current.isEnabled).toBe(false);
    expect(result.current.isStrictMode).toBe(true);
  });

  it('saves configuration to localStorage', () => {
    const { result } = renderHook(() => useChatModeration({}));

    act(() => {
      result.current.toggleModeration();
    });

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'chat-moderation-config',
      expect.stringContaining('"enabled":false')
    );
  });

  it('checks messages for inappropriate content', () => {
    const { result } = renderHook(() => useChatModeration({}));

    // Test with inappropriate content
    const isAllowed = result.current.checkMessage('This is spam content', 'user1');
    expect(isAllowed).toBe(false);

    // Test with appropriate content
    const isAllowed2 = result.current.checkMessage('Hello everyone!', 'user1');
    expect(isAllowed2).toBe(true);
  });

  it('blocks users when they exceed warning limit', () => {
    const mockOnBlock = jest.fn();
    const { result } = renderHook(() => useChatModeration({ onBlock: mockOnBlock }));

    // Send multiple inappropriate messages to trigger blocking
    act(() => {
      result.current.checkMessage('spam', 'user1');
      result.current.checkMessage('spam', 'user1');
      result.current.checkMessage('spam', 'user1');
    });

    expect(result.current.isUserBlocked('user1')).toBe(true);
    expect(mockOnBlock).toHaveBeenCalledWith('user1', expect.any(String));
  });

  it('allows unblocking users', () => {
    const { result } = renderHook(() => useChatModeration({}));

    // Block a user first
    act(() => {
      result.current.blockUser('user1', 'Test reason');
    });

    expect(result.current.isUserBlocked('user1')).toBe(true);

    // Unblock the user
    act(() => {
      result.current.unblockUser('user1');
    });

    expect(result.current.isUserBlocked('user1')).toBe(false);
  });

  it('clears warnings for users', () => {
    const { result } = renderHook(() => useChatModeration({}));

    // Generate some warnings
    act(() => {
      result.current.checkMessage('spam', 'user1');
      result.current.checkMessage('spam', 'user1');
    });

    expect(result.current.getUserWarningCount('user1')).toBe(2);

    // Clear warnings
    act(() => {
      result.current.clearWarnings('user1');
    });

    expect(result.current.getUserWarningCount('user1')).toBe(0);
  });

  it('toggles moderation on/off', () => {
    const { result } = renderHook(() => useChatModeration({}));

    expect(result.current.isEnabled).toBe(true);

    act(() => {
      result.current.toggleModeration();
    });

    expect(result.current.isEnabled).toBe(false);
  });

  it('toggles strict mode', () => {
    const { result } = renderHook(() => useChatModeration({}));

    expect(result.current.isStrictMode).toBe(false);

    act(() => {
      result.current.toggleStrictMode();
    });

    expect(result.current.isStrictMode).toBe(true);
  });

  it('provides moderation statistics', () => {
    const { result } = renderHook(() => useChatModeration({}));

    // Generate some activity
    act(() => {
      result.current.checkMessage('spam', 'user1');
      result.current.checkMessage('spam', 'user2');
      result.current.blockUser('user3', 'Test reason');
    });

    const stats = result.current.getStats();

    expect(stats.totalWarnings).toBe(2);
    expect(stats.blockedCount).toBe(1);
    expect(stats.isEnabled).toBe(true);
    expect(stats.isStrictMode).toBe(false);
  });

  it('tracks recent actions', () => {
    const { result } = renderHook(() => useChatModeration({}));

    // Generate some actions
    act(() => {
      result.current.checkMessage('spam', 'user1');
      result.current.blockUser('user2', 'Test reason');
      result.current.unblockUser('user2');
    });

    const recentActions = result.current.getRecentActions(5);

    expect(recentActions.length).toBe(3);
    expect(recentActions[0].action).toBe('unblock');
    expect(recentActions[1].action).toBe('block');
    expect(recentActions[2].action).toBe('warning');
  });

  it('respects whitelisted users', () => {
    const { result } = renderHook(() => useChatModeration({}));

    // Add user to whitelist
    act(() => {
      result.current.updateConfig({ whitelist: ['user1'] });
    });

    // Whitelisted user should be able to send any message
    const isAllowed = result.current.checkMessage('spam content', 'user1');
    expect(isAllowed).toBe(true);
  });

  it('handles localStorage errors gracefully', () => {
    localStorageMock.getItem.mockImplementation(() => {
      throw new Error('localStorage error');
    });

    const { result } = renderHook(() => useChatModeration({}));

    // Should still work with default values
    expect(result.current.isEnabled).toBe(true);
    expect(result.current.isStrictMode).toBe(false);
  });

  it('calls callbacks when provided', () => {
    const mockOnWarning = jest.fn();
    const mockOnBlock = jest.fn();
    const mockOnModerationAction = jest.fn();

    const { result } = renderHook(() => useChatModeration({
      onWarning: mockOnWarning,
      onBlock: mockOnBlock,
      onModerationAction: mockOnModerationAction
    }));

    act(() => {
      result.current.checkMessage('spam', 'user1');
    });

    expect(mockOnWarning).toHaveBeenCalledWith('user1', 1);
    expect(mockOnModerationAction).toHaveBeenCalledWith('warning', 'user1', expect.any(String));
  });
});
