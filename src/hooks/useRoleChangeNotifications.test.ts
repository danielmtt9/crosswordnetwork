import { renderHook, act } from '@testing-library/react';
import { useRoleChangeNotifications, useNotificationPreferences } from './useRoleChangeNotifications';

// Mock useSocket
jest.mock('./useSocket', () => ({
  useSocket: () => ({
    socket: {
      on: jest.fn(),
      off: jest.fn(),
      emit: jest.fn()
    },
    isConnected: true
  })
}));

describe('useRoleChangeNotifications', () => {
  const mockProps = {
    roomId: 'room123',
    currentUserId: 'user123',
    enabled: true
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with default state', async () => {
    const { result } = renderHook(() => useRoleChangeNotifications(mockProps));

    expect(result.current.notifications).toEqual([]);
    expect(result.current.unreadCount).toBe(0);
    expect(result.current.error).toBeNull();
    
    // Wait for loading to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 600));
    });
    
    expect(result.current.isLoading).toBe(false);
  });

  it('should add notification', () => {
    const { result } = renderHook(() => useRoleChangeNotifications(mockProps));

    act(() => {
      result.current.addNotification({
        type: 'ROLE_CHANGED',
        userId: 'user456',
        userName: 'John Doe',
        oldRole: 'PLAYER',
        newRole: 'MODERATOR',
        reason: 'Promoted for good behavior',
        isActionable: false
      });
    });

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].type).toBe('ROLE_CHANGED');
    expect(result.current.notifications[0].userName).toBe('John Doe');
    expect(result.current.unreadCount).toBe(1);
  });

  it('should mark notification as read', () => {
    const { result } = renderHook(() => useRoleChangeNotifications(mockProps));

    // Add a notification first
    act(() => {
      result.current.addNotification({
        type: 'ROLE_CHANGED',
        userId: 'user456',
        userName: 'John Doe',
        oldRole: 'PLAYER',
        newRole: 'MODERATOR',
        isActionable: false
      });
    });

    expect(result.current.unreadCount).toBe(1);

    // Mark as read
    act(() => {
      result.current.markAsRead(result.current.notifications[0].id);
    });

    expect(result.current.unreadCount).toBe(0);
    expect(result.current.notifications[0].isRead).toBe(true);
  });

  it('should mark all notifications as read', () => {
    const { result } = renderHook(() => useRoleChangeNotifications(mockProps));

    // Add multiple notifications
    act(() => {
      result.current.addNotification({
        type: 'ROLE_CHANGED',
        userId: 'user456',
        userName: 'John Doe',
        oldRole: 'PLAYER',
        newRole: 'MODERATOR',
        isActionable: false
      });
      result.current.addNotification({
        type: 'USER_PROMOTED',
        userId: 'user789',
        userName: 'Jane Smith',
        newRole: 'MODERATOR',
        isActionable: false
      });
    });

    expect(result.current.unreadCount).toBe(2);

    // Mark all as read
    act(() => {
      result.current.markAllAsRead();
    });

    expect(result.current.unreadCount).toBe(0);
    expect(result.current.notifications.every(n => n.isRead)).toBe(true);
  });

  it('should dismiss notification', () => {
    const { result } = renderHook(() => useRoleChangeNotifications(mockProps));

    // Add a notification
    act(() => {
      result.current.addNotification({
        type: 'ROLE_CHANGED',
        userId: 'user456',
        userName: 'John Doe',
        oldRole: 'PLAYER',
        newRole: 'MODERATOR',
        isActionable: false
      });
    });

    expect(result.current.notifications).toHaveLength(1);

    // Dismiss notification
    act(() => {
      result.current.dismiss(result.current.notifications[0].id);
    });

    expect(result.current.notifications).toHaveLength(0);
  });

  it('should clear all notifications', () => {
    const { result } = renderHook(() => useRoleChangeNotifications(mockProps));

    // Add multiple notifications
    act(() => {
      result.current.addNotification({
        type: 'ROLE_CHANGED',
        userId: 'user456',
        userName: 'John Doe',
        oldRole: 'PLAYER',
        newRole: 'MODERATOR',
        isActionable: false
      });
      result.current.addNotification({
        type: 'USER_PROMOTED',
        userId: 'user789',
        userName: 'Jane Smith',
        newRole: 'MODERATOR',
        isActionable: false
      });
    });

    expect(result.current.notifications).toHaveLength(2);

    // Clear all
    act(() => {
      result.current.clearAll();
    });

    expect(result.current.notifications).toHaveLength(0);
  });

  it('should handle notification action', () => {
    const { result } = renderHook(() => useRoleChangeNotifications(mockProps));

    // Add an actionable notification
    act(() => {
      result.current.addNotification({
        type: 'ROLE_CHANGED',
        userId: 'user456',
        userName: 'John Doe',
        oldRole: 'PLAYER',
        newRole: 'MODERATOR',
        isActionable: true
      });
    });

    const notificationId = result.current.notifications[0].id;

    // Handle action
    act(() => {
      result.current.handleAction(notificationId, 'approve');
    });

    // Should mark as read after action
    expect(result.current.notifications[0].isRead).toBe(true);
  });

  it('should get notifications by type', () => {
    const { result } = renderHook(() => useRoleChangeNotifications(mockProps));

    // Add notifications of different types
    act(() => {
      result.current.addNotification({
        type: 'ROLE_CHANGED',
        userId: 'user456',
        userName: 'John Doe',
        oldRole: 'PLAYER',
        newRole: 'MODERATOR',
        isActionable: false
      });
      result.current.addNotification({
        type: 'USER_PROMOTED',
        userId: 'user789',
        userName: 'Jane Smith',
        newRole: 'MODERATOR',
        isActionable: false
      });
    });

    const roleChangedNotifications = result.current.getNotificationsByType('ROLE_CHANGED');
    const promotedNotifications = result.current.getNotificationsByType('USER_PROMOTED');

    expect(roleChangedNotifications).toHaveLength(1);
    expect(roleChangedNotifications[0].type).toBe('ROLE_CHANGED');
    expect(promotedNotifications).toHaveLength(1);
    expect(promotedNotifications[0].type).toBe('USER_PROMOTED');
  });

  it('should get notifications by user', () => {
    const { result } = renderHook(() => useRoleChangeNotifications(mockProps));

    // Add notifications for different users
    act(() => {
      result.current.addNotification({
        type: 'ROLE_CHANGED',
        userId: 'user456',
        userName: 'John Doe',
        oldRole: 'PLAYER',
        newRole: 'MODERATOR',
        isActionable: false
      });
      result.current.addNotification({
        type: 'USER_PROMOTED',
        userId: 'user789',
        userName: 'Jane Smith',
        newRole: 'MODERATOR',
        isActionable: false
      });
    });

    const user456Notifications = result.current.getNotificationsByUser('user456');
    const user789Notifications = result.current.getNotificationsByUser('user789');

    expect(user456Notifications).toHaveLength(1);
    expect(user456Notifications[0].userId).toBe('user456');
    expect(user789Notifications).toHaveLength(1);
    expect(user789Notifications[0].userId).toBe('user789');
  });

  it('should handle socket events', () => {
    const { result } = renderHook(() => useRoleChangeNotifications(mockProps));

    // Simulate socket event
    act(() => {
      result.current.addNotification({
        type: 'ROLE_CHANGED',
        userId: 'user456',
        userName: 'John Doe',
        oldRole: 'PLAYER',
        newRole: 'MODERATOR',
        reason: 'Socket event',
        isActionable: false
      });
    });

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].reason).toBe('Socket event');
  });

  it('should auto-mark non-actionable notifications as read after 5 seconds', async () => {
    jest.useFakeTimers();

    const { result } = renderHook(() => useRoleChangeNotifications(mockProps));

    // Add non-actionable notification
    act(() => {
      result.current.addNotification({
        type: 'ROLE_CHANGED',
        userId: 'user456',
        userName: 'John Doe',
        oldRole: 'PLAYER',
        newRole: 'MODERATOR',
        isActionable: false
      });
    });

    expect(result.current.unreadCount).toBe(1);

    // Fast-forward time by 5 seconds
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(result.current.unreadCount).toBe(0);
    expect(result.current.notifications[0].isRead).toBe(true);

    jest.useRealTimers();
  });
});

describe('useNotificationPreferences', () => {
  it('should initialize with default preferences', () => {
    const { result } = renderHook(() => useNotificationPreferences());

    expect(result.current.preferences).toEqual({
      roleChanges: true,
      promotions: true,
      demotions: true,
      hostTransfers: true,
      participantRemovals: true,
      soundEnabled: true,
      desktopNotifications: true
    });
  });

  it('should update preference', () => {
    const { result } = renderHook(() => useNotificationPreferences());

    act(() => {
      result.current.updatePreference('soundEnabled', false);
    });

    expect(result.current.preferences.soundEnabled).toBe(false);
    expect(result.current.preferences.roleChanges).toBe(true); // Other preferences unchanged
  });

  it('should reset preferences', () => {
    const { result } = renderHook(() => useNotificationPreferences());

    // Update some preferences
    act(() => {
      result.current.updatePreference('soundEnabled', false);
      result.current.updatePreference('roleChanges', false);
    });

    expect(result.current.preferences.soundEnabled).toBe(false);
    expect(result.current.preferences.roleChanges).toBe(false);

    // Reset preferences
    act(() => {
      result.current.resetPreferences();
    });

    expect(result.current.preferences).toEqual({
      roleChanges: true,
      promotions: true,
      demotions: true,
      hostTransfers: true,
      participantRemovals: true,
      soundEnabled: true,
      desktopNotifications: true
    });
  });
});
