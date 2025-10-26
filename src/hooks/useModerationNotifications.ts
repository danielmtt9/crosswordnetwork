/**
 * Hook for managing moderation notifications
 */

import { useState, useCallback, useEffect } from 'react';
import { ModerationNotification } from '@/components/ModerationNotification';

interface UseModerationNotificationsProps {
  userId: string;
  roomId?: string;
  autoDismissDelay?: number; // in milliseconds
  maxNotifications?: number;
}

export function useModerationNotifications({
  userId,
  roomId,
  autoDismissDelay = 10000, // 10 seconds
  maxNotifications = 50
}: UseModerationNotificationsProps) {
  const [notifications, setNotifications] = useState<ModerationNotification[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // Load notifications from localStorage on mount
  useEffect(() => {
    try {
      const savedNotifications = localStorage.getItem(`moderation-notifications-${userId}`);
      if (savedNotifications) {
        const parsed = JSON.parse(savedNotifications);
        setNotifications(parsed.map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp)
        })));
      }
    } catch (error) {
      console.error('Error loading moderation notifications:', error);
    }
  }, [userId]);

  // Save notifications to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem(
        `moderation-notifications-${userId}`,
        JSON.stringify(notifications)
      );
    } catch (error) {
      console.error('Error saving moderation notifications:', error);
    }
  }, [notifications, userId]);

  // Auto-dismiss notifications after delay
  useEffect(() => {
    if (autoDismissDelay <= 0) return;

    const timers: NodeJS.Timeout[] = [];

    notifications.forEach(notification => {
      if (!notification.dismissed) {
        const timer = setTimeout(() => {
          dismissNotification(notification.id);
        }, autoDismissDelay);
        timers.push(timer);
      }
    });

    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [notifications, autoDismissDelay]);

  const addNotification = useCallback((notification: Omit<ModerationNotification, 'id' | 'timestamp'>) => {
    const newNotification: ModerationNotification = {
      ...notification,
      id: `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    };

    setNotifications(prev => {
      const updated = [newNotification, ...prev];
      // Keep only the most recent notifications
      return updated.slice(0, maxNotifications);
    });
  }, [maxNotifications]);

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, dismissed: true }
          : notification
      )
    );
  }, []);

  const acknowledgeNotification = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, dismissed: true }
          : notification
      )
    );
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, dismissed: true }))
    );
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const getActiveNotifications = useCallback(() => {
    return notifications.filter(n => !n.dismissed);
  }, [notifications]);

  const getNotificationsByType = useCallback((type: ModerationNotification['type']) => {
    return notifications.filter(n => n.type === type && !n.dismissed);
  }, [notifications]);

  const getNotificationsBySeverity = useCallback((severity: ModerationNotification['severity']) => {
    return notifications.filter(n => n.severity === severity && !n.dismissed);
  }, [notifications]);

  const getNotificationStats = useCallback(() => {
    const active = getActiveNotifications();
    const total = notifications.length;
    const dismissed = total - active.length;

    const byType = active.reduce((acc, notification) => {
      acc[notification.type] = (acc[notification.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const bySeverity = active.reduce((acc, notification) => {
      const severity = notification.severity || 'low';
      acc[severity] = (acc[severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      total,
      active: active.length,
      dismissed,
      byType,
      bySeverity
    };
  }, [notifications, getActiveNotifications]);

  // Simulate receiving notifications (in real app, this would come from Socket.IO)
  const simulateNotification = useCallback((type: ModerationNotification['type'], reason?: string) => {
    const severityMap: Record<string, ModerationNotification['severity']> = {
      'warning': 'medium',
      'mute': 'high',
      'ban': 'critical',
      'message_deleted': 'low',
      'message_edited': 'low'
    };

    addNotification({
      type,
      userId,
      userName: 'You',
      reason,
      severity: severityMap[type] || 'low'
    });
  }, [addNotification, userId]);

  // Connect to real-time notifications (placeholder for Socket.IO integration)
  useEffect(() => {
    // In a real implementation, this would connect to Socket.IO
    // and listen for moderation events
    setIsConnected(true);
    
    return () => {
      setIsConnected(false);
    };
  }, [roomId]);

  return {
    notifications,
    activeNotifications: getActiveNotifications(),
    isConnected,
    addNotification,
    dismissNotification,
    acknowledgeNotification,
    clearAllNotifications,
    removeNotification,
    getNotificationsByType,
    getNotificationsBySeverity,
    getNotificationStats,
    simulateNotification
  };
}
