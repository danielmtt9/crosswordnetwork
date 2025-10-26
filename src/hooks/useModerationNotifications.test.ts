/**
 * Tests for useModerationNotifications hook
 */

import { renderHook, act } from '@testing-library/react';
import { useModerationNotifications } from './useModerationNotifications';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('useModerationNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  it('initializes with empty notifications', () => {
    const { result } = renderHook(() =>
      useModerationNotifications({
        userId: 'user-123',
        roomId: 'room-123'
      })
    );

    expect(result.current.notifications).toEqual([]);
    expect(result.current.activeNotifications).toEqual([]);
    expect(result.current.isConnected).toBe(true);
  });

  it('loads notifications from localStorage on mount', () => {
    const savedNotifications = [
      {
        id: 'notification-1',
        type: 'warning',
        userId: 'user-123',
        userName: 'Test User',
        reason: 'Test reason',
        timestamp: '2023-01-01T00:00:00Z',
        dismissed: false
      }
    ];

    localStorageMock.getItem.mockReturnValue(JSON.stringify(savedNotifications));

    const { result } = renderHook(() =>
      useModerationNotifications({
        userId: 'user-123',
        roomId: 'room-123'
      })
    );

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].id).toBe('notification-1');
    expect(result.current.notifications[0].timestamp).toBeInstanceOf(Date);
  });

  it('saves notifications to localStorage when they change', () => {
    const { result } = renderHook(() =>
      useModerationNotifications({
        userId: 'user-123',
        roomId: 'room-123'
      })
    );

    act(() => {
      result.current.addNotification({
        type: 'warning',
        userId: 'user-123',
        userName: 'Test User',
        reason: 'Test reason'
      });
    });

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'moderation-notifications-user-123',
      expect.stringContaining('"type":"warning"')
    );
  });

  it('adds notification correctly', () => {
    const { result } = renderHook(() =>
      useModerationNotifications({
        userId: 'user-123',
        roomId: 'room-123'
      })
    );

    act(() => {
      result.current.addNotification({
        type: 'warning',
        userId: 'user-123',
        userName: 'Test User',
        reason: 'Test reason',
        severity: 'medium'
      });
    });

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].type).toBe('warning');
    expect(result.current.notifications[0].reason).toBe('Test reason');
    expect(result.current.notifications[0].severity).toBe('medium');
    expect(result.current.notifications[0].id).toBeDefined();
    expect(result.current.notifications[0].timestamp).toBeInstanceOf(Date);
  });

  it('dismisses notification correctly', () => {
    const { result } = renderHook(() =>
      useModerationNotifications({
        userId: 'user-123',
        roomId: 'room-123'
      })
    );

    act(() => {
      result.current.addNotification({
        type: 'warning',
        userId: 'user-123',
        userName: 'Test User',
        reason: 'Test reason'
      });
    });

    const notificationId = result.current.notifications[0].id;

    act(() => {
      result.current.dismissNotification(notificationId);
    });

    expect(result.current.notifications[0].dismissed).toBe(true);
    expect(result.current.activeNotifications).toHaveLength(0);
  });

  it('acknowledges notification correctly', () => {
    const { result } = renderHook(() =>
      useModerationNotifications({
        userId: 'user-123',
        roomId: 'room-123'
      })
    );

    act(() => {
      result.current.addNotification({
        type: 'warning',
        userId: 'user-123',
        userName: 'Test User',
        reason: 'Test reason'
      });
    });

    const notificationId = result.current.notifications[0].id;

    act(() => {
      result.current.acknowledgeNotification(notificationId);
    });

    expect(result.current.notifications[0].dismissed).toBe(true);
  });

  it('clears all notifications', () => {
    const { result } = renderHook(() =>
      useModerationNotifications({
        userId: 'user-123',
        roomId: 'room-123'
      })
    );

    act(() => {
      result.current.addNotification({
        type: 'warning',
        userId: 'user-123',
        userName: 'Test User',
        reason: 'Test reason 1'
      });
      result.current.addNotification({
        type: 'mute',
        userId: 'user-123',
        userName: 'Test User',
        reason: 'Test reason 2'
      });
    });

    expect(result.current.activeNotifications).toHaveLength(2);

    act(() => {
      result.current.clearAllNotifications();
    });

    expect(result.current.activeNotifications).toHaveLength(0);
    expect(result.current.notifications.every(n => n.dismissed)).toBe(true);
  });

  it('removes notification completely', () => {
    const { result } = renderHook(() =>
      useModerationNotifications({
        userId: 'user-123',
        roomId: 'room-123'
      })
    );

    act(() => {
      result.current.addNotification({
        type: 'warning',
        userId: 'user-123',
        userName: 'Test User',
        reason: 'Test reason'
      });
    });

    const notificationId = result.current.notifications[0].id;

    act(() => {
      result.current.removeNotification(notificationId);
    });

    expect(result.current.notifications).toHaveLength(0);
  });

  it('filters notifications by type', () => {
    const { result } = renderHook(() =>
      useModerationNotifications({
        userId: 'user-123',
        roomId: 'room-123'
      })
    );

    act(() => {
      result.current.addNotification({
        type: 'warning',
        userId: 'user-123',
        userName: 'Test User',
        reason: 'Test reason 1'
      });
      result.current.addNotification({
        type: 'mute',
        userId: 'user-123',
        userName: 'Test User',
        reason: 'Test reason 2'
      });
      result.current.addNotification({
        type: 'warning',
        userId: 'user-123',
        userName: 'Test User',
        reason: 'Test reason 3'
      });
    });

    const warningNotifications = result.current.getNotificationsByType('warning');
    const muteNotifications = result.current.getNotificationsByType('mute');

    expect(warningNotifications).toHaveLength(2);
    expect(muteNotifications).toHaveLength(1);
  });

  it('filters notifications by severity', () => {
    const { result } = renderHook(() =>
      useModerationNotifications({
        userId: 'user-123',
        roomId: 'room-123'
      })
    );

    act(() => {
      result.current.addNotification({
        type: 'warning',
        userId: 'user-123',
        userName: 'Test User',
        reason: 'Test reason 1',
        severity: 'medium'
      });
      result.current.addNotification({
        type: 'ban',
        userId: 'user-123',
        userName: 'Test User',
        reason: 'Test reason 2',
        severity: 'critical'
      });
      result.current.addNotification({
        type: 'mute',
        userId: 'user-123',
        userName: 'Test User',
        reason: 'Test reason 3',
        severity: 'medium'
      });
    });

    const mediumNotifications = result.current.getNotificationsBySeverity('medium');
    const criticalNotifications = result.current.getNotificationsBySeverity('critical');

    expect(mediumNotifications).toHaveLength(2);
    expect(criticalNotifications).toHaveLength(1);
  });

  it('calculates notification stats correctly', () => {
    const { result } = renderHook(() =>
      useModerationNotifications({
        userId: 'user-123',
        roomId: 'room-123'
      })
    );

    act(() => {
      result.current.addNotification({
        type: 'warning',
        userId: 'user-123',
        userName: 'Test User',
        reason: 'Test reason 1',
        severity: 'medium'
      });
      result.current.addNotification({
        type: 'mute',
        userId: 'user-123',
        userName: 'Test User',
        reason: 'Test reason 2',
        severity: 'high'
      });
      result.current.addNotification({
        type: 'warning',
        userId: 'user-123',
        userName: 'Test User',
        reason: 'Test reason 3',
        severity: 'low'
      });
    });

    const stats = result.current.getNotificationStats();

    expect(stats.total).toBe(3);
    expect(stats.active).toBe(3);
    expect(stats.dismissed).toBe(0);
    expect(stats.byType.warning).toBe(2);
    expect(stats.byType.mute).toBe(1);
    expect(stats.bySeverity.medium).toBe(1);
    expect(stats.bySeverity.high).toBe(1);
    expect(stats.bySeverity.low).toBe(1);
  });

  it('simulates notification with correct severity mapping', () => {
    const { result } = renderHook(() =>
      useModerationNotifications({
        userId: 'user-123',
        roomId: 'room-123'
      })
    );

    act(() => {
      result.current.simulateNotification('warning', 'Test warning');
    });

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0].type).toBe('warning');
    expect(result.current.notifications[0].severity).toBe('medium');
    expect(result.current.notifications[0].reason).toBe('Test warning');
  });

  it('limits notifications to maxNotifications', () => {
    const { result } = renderHook(() =>
      useModerationNotifications({
        userId: 'user-123',
        roomId: 'room-123',
        maxNotifications: 3
      })
    );

    act(() => {
      for (let i = 0; i < 5; i++) {
        result.current.addNotification({
          type: 'warning',
          userId: 'user-123',
          userName: 'Test User',
          reason: `Test reason ${i}`
        });
      }
    });

    expect(result.current.notifications).toHaveLength(3);
  });

  it('handles localStorage errors gracefully', () => {
    localStorageMock.getItem.mockImplementation(() => {
      throw new Error('localStorage error');
    });

    const { result } = renderHook(() =>
      useModerationNotifications({
        userId: 'user-123',
        roomId: 'room-123'
      })
    );

    expect(result.current.notifications).toEqual([]);
  });
});
