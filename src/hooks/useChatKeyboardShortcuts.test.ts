/**
 * Tests for useChatKeyboardShortcuts hook
 */

import { renderHook, act } from '@testing-library/react';
import { useChatKeyboardShortcuts } from './useChatKeyboardShortcuts';

describe('useChatKeyboardShortcuts', () => {
  const mockConfig = {
    onSendMessage: jest.fn(),
    onFocusInput: jest.fn(),
    onToggleEmojiPicker: jest.fn(),
    onScrollToBottom: jest.fn(),
    onScrollToTop: jest.fn(),
    onClearInput: jest.fn(),
    onToggleModerationTools: jest.fn(),
    onMentionUser: jest.fn(),
    onEditLastMessage: jest.fn(),
    onDeleteLastMessage: jest.fn(),
    onToggleTyping: jest.fn(),
    onSearchMessages: jest.fn(),
    onToggleMute: jest.fn(),
    onToggleNotifications: jest.fn(),
    onHelp: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes with default shortcuts', () => {
    const { result } = renderHook(() => useChatKeyboardShortcuts(mockConfig));

    expect(result.current.getShortcuts().length).toBeGreaterThan(15);
    expect(result.current.getShortcutsByCategory()).toHaveProperty('messaging');
    expect(result.current.getShortcutsByCategory()).toHaveProperty('navigation');
    expect(result.current.getShortcutsByCategory()).toHaveProperty('editing');
    expect(result.current.getShortcutsByCategory()).toHaveProperty('tools');
    expect(result.current.getShortcutsByCategory()).toHaveProperty('status');
    expect(result.current.getShortcutsByCategory()).toHaveProperty('help');
  });

  it('has correct shortcut configurations', () => {
    const { result } = renderHook(() => useChatKeyboardShortcuts(mockConfig));

    const shortcuts = result.current.getShortcuts();
    
    // Check that key shortcuts exist
    expect(shortcuts.some(s => s.action === 'send_message' && s.key === 'Enter')).toBe(true);
    expect(shortcuts.some(s => s.action === 'focus_input' && s.key === 'KeyC' && s.ctrlKey)).toBe(true);
    expect(shortcuts.some(s => s.action === 'toggle_emoji_picker' && s.key === 'KeyE' && s.ctrlKey)).toBe(true);
    expect(shortcuts.some(s => s.action === 'scroll_to_bottom' && s.key === 'End')).toBe(true);
    expect(shortcuts.some(s => s.action === 'scroll_to_top' && s.key === 'Home')).toBe(true);
    expect(shortcuts.some(s => s.action === 'clear_input' && s.key === 'Escape')).toBe(true);
  });

  it('does not trigger actions when disabled', () => {
    const { result } = renderHook(() => 
      useChatKeyboardShortcuts(mockConfig, false)
    );

    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      document.dispatchEvent(event);
    });

    expect(mockConfig.onSendMessage).not.toHaveBeenCalled();
  });

  it('updates shortcuts correctly', () => {
    const { result } = renderHook(() => useChatKeyboardShortcuts(mockConfig));

    const newShortcuts = [
      {
        key: 'KeyX',
        ctrlKey: true,
        action: 'custom_action',
        description: 'Custom action',
        enabled: true
      }
    ];

    act(() => {
      result.current.updateShortcuts(newShortcuts);
    });

    expect(result.current.getShortcuts()).toHaveLength(1);
    expect(result.current.getShortcuts()[0].action).toBe('custom_action');
  });

  it('checks if shortcut is available', () => {
    const { result } = renderHook(() => useChatKeyboardShortcuts(mockConfig));

    expect(result.current.isShortcutAvailable('send_message')).toBe(true);
    expect(result.current.isShortcutAvailable('nonexistent_action')).toBe(false);
  });

  it('gets shortcut description', () => {
    const { result } = renderHook(() => useChatKeyboardShortcuts(mockConfig));

    expect(result.current.getShortcutDescription('send_message')).toBe('Send message');
    expect(result.current.getShortcutDescription('nonexistent_action')).toBe('');
  });

  it('gets shortcut key combination', () => {
    const { result } = renderHook(() => useChatKeyboardShortcuts(mockConfig));

    expect(result.current.getShortcutKeys('send_message')).toBe('Enter');
    expect(result.current.getShortcutKeys('focus_input')).toBe('Ctrl + KeyC');
    expect(result.current.getShortcutKeys('nonexistent_action')).toBe('');
  });

  it('categorizes shortcuts correctly', () => {
    const { result } = renderHook(() => useChatKeyboardShortcuts(mockConfig));

    const categories = result.current.getShortcutsByCategory();

    expect(categories.messaging).toHaveLength(4);
    expect(categories.navigation).toHaveLength(2);
    expect(categories.editing).toHaveLength(5);
    expect(categories.tools).toHaveLength(3);
    expect(categories.status).toHaveLength(3);
    expect(categories.help).toHaveLength(1);
  });

  it('has Shift+Enter configured for new line', () => {
    const { result } = renderHook(() => useChatKeyboardShortcuts(mockConfig));

    const shortcuts = result.current.getShortcuts();
    const newLineShortcut = shortcuts.find(s => s.action === 'new_line');
    
    expect(newLineShortcut).toBeDefined();
    expect(newLineShortcut?.key).toBe('Enter');
    expect(newLineShortcut?.shiftKey).toBe(true);
  });

  it('cleans up event listeners on unmount', () => {
    const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');
    
    const { unmount } = renderHook(() => useChatKeyboardShortcuts(mockConfig));
    
    unmount();
    
    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    
    removeEventListenerSpy.mockRestore();
  });
});
