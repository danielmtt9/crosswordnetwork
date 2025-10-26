/**
 * Hook for managing keyboard shortcuts in chat
 */

import { useEffect, useCallback, useRef } from 'react';

interface ChatKeyboardShortcutsConfig {
  onSendMessage?: () => void;
  onFocusInput?: () => void;
  onToggleEmojiPicker?: () => void;
  onScrollToBottom?: () => void;
  onScrollToTop?: () => void;
  onClearInput?: () => void;
  onToggleModerationTools?: () => void;
  onMentionUser?: (userId: string) => void;
  onEditLastMessage?: () => void;
  onDeleteLastMessage?: () => void;
  onToggleTyping?: () => void;
  onSearchMessages?: () => void;
  onToggleMute?: () => void;
  onToggleNotifications?: () => void;
  onHelp?: () => void;
}

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  action: string;
  description: string;
  enabled?: boolean;
}

const DEFAULT_SHORTCUTS: KeyboardShortcut[] = [
  {
    key: 'Enter',
    action: 'send_message',
    description: 'Send message',
    enabled: true
  },
  {
    key: 'Enter',
    shiftKey: true,
    action: 'new_line',
    description: 'New line in message',
    enabled: true
  },
  {
    key: 'Escape',
    action: 'clear_input',
    description: 'Clear message input',
    enabled: true
  },
  {
    key: 'KeyC',
    ctrlKey: true,
    action: 'focus_input',
    description: 'Focus message input',
    enabled: true
  },
  {
    key: 'KeyE',
    ctrlKey: true,
    action: 'toggle_emoji_picker',
    description: 'Toggle emoji picker',
    enabled: true
  },
  {
    key: 'End',
    action: 'scroll_to_bottom',
    description: 'Scroll to bottom',
    enabled: true
  },
  {
    key: 'Home',
    action: 'scroll_to_top',
    description: 'Scroll to top',
    enabled: true
  },
  {
    key: 'KeyM',
    ctrlKey: true,
    action: 'toggle_moderation_tools',
    description: 'Toggle moderation tools',
    enabled: true
  },
  {
    key: 'KeyA',
    ctrlKey: true,
    action: 'select_all',
    description: 'Select all text in input',
    enabled: true
  },
  {
    key: 'KeyZ',
    ctrlKey: true,
    action: 'undo',
    description: 'Undo last action',
    enabled: true
  },
  {
    key: 'KeyY',
    ctrlKey: true,
    action: 'redo',
    description: 'Redo last action',
    enabled: true
  },
  {
    key: 'KeyF',
    ctrlKey: true,
    action: 'search_messages',
    description: 'Search messages',
    enabled: true
  },
  {
    key: 'KeyH',
    ctrlKey: true,
    action: 'help',
    description: 'Show help',
    enabled: true
  },
  {
    key: 'KeyT',
    ctrlKey: true,
    action: 'toggle_typing',
    description: 'Toggle typing indicator',
    enabled: true
  },
  {
    key: 'KeyU',
    ctrlKey: true,
    action: 'toggle_mute',
    description: 'Toggle mute status',
    enabled: true
  },
  {
    key: 'KeyN',
    ctrlKey: true,
    action: 'toggle_notifications',
    description: 'Toggle notifications',
    enabled: true
  },
  {
    key: 'KeyD',
    ctrlKey: true,
    action: 'delete_last_message',
    description: 'Delete last message',
    enabled: true
  },
  {
    key: 'KeyE',
    ctrlKey: true,
    shiftKey: true,
    action: 'edit_last_message',
    description: 'Edit last message',
    enabled: true
  }
];

export function useChatKeyboardShortcuts(
  config: ChatKeyboardShortcutsConfig,
  enabled: boolean = true
) {
  const shortcutsRef = useRef<KeyboardShortcut[]>(DEFAULT_SHORTCUTS);
  const configRef = useRef(config);

  // Update config ref when config changes
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  // Handle keyboard events
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    const { key, ctrlKey, shiftKey, altKey, metaKey } = event;
    
    // Find matching shortcut
    const shortcut = shortcutsRef.current.find(s => 
      s.enabled !== false &&
      s.key === key &&
      s.ctrlKey === ctrlKey &&
      s.shiftKey === shiftKey &&
      s.altKey === altKey &&
      s.metaKey === metaKey
    );

    if (!shortcut) return;

    // Prevent default behavior for custom shortcuts
    event.preventDefault();
    event.stopPropagation();

    // Execute action
    switch (shortcut.action) {
      case 'send_message':
        configRef.current.onSendMessage?.();
        break;
      case 'new_line':
        // Allow default behavior for Shift+Enter (new line)
        event.preventDefault();
        break;
      case 'clear_input':
        configRef.current.onClearInput?.();
        break;
      case 'focus_input':
        configRef.current.onFocusInput?.();
        break;
      case 'toggle_emoji_picker':
        configRef.current.onToggleEmojiPicker?.();
        break;
      case 'scroll_to_bottom':
        configRef.current.onScrollToBottom?.();
        break;
      case 'scroll_to_top':
        configRef.current.onScrollToTop?.();
        break;
      case 'toggle_moderation_tools':
        configRef.current.onToggleModerationTools?.();
        break;
      case 'select_all':
        // Allow default behavior for Ctrl+A
        break;
      case 'undo':
        // Allow default behavior for Ctrl+Z
        break;
      case 'redo':
        // Allow default behavior for Ctrl+Y
        break;
      case 'search_messages':
        configRef.current.onSearchMessages?.();
        break;
      case 'help':
        configRef.current.onHelp?.();
        break;
      case 'toggle_typing':
        configRef.current.onToggleTyping?.();
        break;
      case 'toggle_mute':
        configRef.current.onToggleMute?.();
        break;
      case 'toggle_notifications':
        configRef.current.onToggleNotifications?.();
        break;
      case 'delete_last_message':
        configRef.current.onDeleteLastMessage?.();
        break;
      case 'edit_last_message':
        configRef.current.onEditLastMessage?.();
        break;
    }
  }, [enabled]);

  // Register keyboard event listener
  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, enabled]);

  // Update shortcuts
  const updateShortcuts = useCallback((newShortcuts: KeyboardShortcut[]) => {
    shortcutsRef.current = newShortcuts;
  }, []);

  // Get available shortcuts
  const getShortcuts = useCallback(() => {
    return shortcutsRef.current.filter(s => s.enabled !== false);
  }, []);

  // Get shortcuts by category
  const getShortcutsByCategory = useCallback(() => {
    const shortcuts = getShortcuts();
    const categories = {
      messaging: shortcuts.filter(s => 
        ['send_message', 'new_line', 'clear_input', 'focus_input'].includes(s.action)
      ),
      navigation: shortcuts.filter(s => 
        ['scroll_to_bottom', 'scroll_to_top'].includes(s.action)
      ),
      editing: shortcuts.filter(s => 
        ['select_all', 'undo', 'redo', 'edit_last_message', 'delete_last_message'].includes(s.action)
      ),
      tools: shortcuts.filter(s => 
        ['toggle_emoji_picker', 'toggle_moderation_tools', 'search_messages'].includes(s.action)
      ),
      status: shortcuts.filter(s => 
        ['toggle_typing', 'toggle_mute', 'toggle_notifications'].includes(s.action)
      ),
      help: shortcuts.filter(s => 
        ['help'].includes(s.action)
      )
    };
    return categories;
  }, [getShortcuts]);

  // Check if a shortcut is available
  const isShortcutAvailable = useCallback((action: string) => {
    return shortcutsRef.current.some(s => s.action === action && s.enabled !== false);
  }, []);

  // Get shortcut description
  const getShortcutDescription = useCallback((action: string) => {
    const shortcut = shortcutsRef.current.find(s => s.action === action);
    return shortcut?.description || '';
  }, []);

  // Get shortcut key combination
  const getShortcutKeys = useCallback((action: string) => {
    const shortcut = shortcutsRef.current.find(s => s.action === action);
    if (!shortcut) return '';

    const keys = [];
    if (shortcut.ctrlKey) keys.push('Ctrl');
    if (shortcut.shiftKey) keys.push('Shift');
    if (shortcut.altKey) keys.push('Alt');
    if (shortcut.metaKey) keys.push('Meta');
    keys.push(shortcut.key);

    return keys.join(' + ');
  }, []);

  return {
    updateShortcuts,
    getShortcuts,
    getShortcutsByCategory,
    isShortcutAvailable,
    getShortcutDescription,
    getShortcutKeys
  };
}
