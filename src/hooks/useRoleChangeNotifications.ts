import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSocket } from './useSocket';

interface RoleChangeNotification {
  id: string;
  type: 'ROLE_CHANGED' | 'USER_PROMOTED' | 'USER_DEMOTED' | 'HOST_TRANSFERRED' | 'PARTICIPANT_REMOVED';
  userId: string;
  userName: string;
  userAvatar?: string;
  oldRole?: string;
  newRole?: string;
  reason?: string;
  timestamp: Date;
  isRead: boolean;
  isActionable: boolean;
}

interface UseRoleChangeNotificationsProps {
  roomId: string;
  currentUserId: string;
  enabled?: boolean;
}

interface UseRoleChangeNotificationsReturn {
  notifications: RoleChangeNotification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  addNotification: (notification: Omit<RoleChangeNotification, 'id' | 'timestamp' | 'isRead'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  dismiss: (id: string) => void;
  clearAll: () => void;
  handleAction: (id: string, action: string) => void;
  getNotificationsByType: (type: RoleChangeNotification['type']) => RoleChangeNotification[];
  getNotificationsByUser: (userId: string) => RoleChangeNotification[];
}

export function useRoleChangeNotifications({
  roomId,
  currentUserId,
  enabled = true
}: UseRoleChangeNotificationsProps): UseRoleChangeNotificationsReturn {
  const [notifications, setNotifications] = useState<RoleChangeNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { socket, isConnected } = useSocket();

  // Generate unique ID for notifications
  const generateId = useCallback(() => {
    return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Add notification
  const addNotification = useCallback((notification: Omit<RoleChangeNotification, 'id' | 'timestamp' | 'isRead'>) => {
    const newNotification: RoleChangeNotification = {
      ...notification,
      id: generateId(),
      timestamp: new Date(),
      isRead: false
    };

    setNotifications(prev => [newNotification, ...prev]);
  }, [generateId]);

  // Mark notification as read
  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, isRead: true }
          : notification
      )
    );
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, isRead: true }))
    );
  }, []);

  // Dismiss notification
  const dismiss = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Handle notification action
  const handleAction = useCallback((id: string, action: string) => {
    const notification = notifications.find(n => n.id === id);
    if (!notification) return;

    // Handle different actions
    switch (action) {
      case 'approve':
        // Implement approval logic
        console.log('Approving notification:', id);
        break;
      case 'reject':
        // Implement rejection logic
        console.log('Rejecting notification:', id);
        break;
      default:
        console.log('Unknown action:', action);
    }

    // Mark as read after action
    markAsRead(id);
  }, [notifications, markAsRead]);

  // Get notifications by type
  const getNotificationsByType = useCallback((type: RoleChangeNotification['type']) => {
    return notifications.filter(notification => notification.type === type);
  }, [notifications]);

  // Get notifications by user
  const getNotificationsByUser = useCallback((userId: string) => {
    return notifications.filter(notification => notification.userId === userId);
  }, [notifications]);

  // Calculate unread count
  const unreadCount = useMemo(() => {
    return notifications.filter(notification => !notification.isRead).length;
  }, [notifications]);

  // Socket event handlers
  useEffect(() => {
    if (!socket || !isConnected || !enabled) return;

    const handleRoleChanged = (data: {
      userId: string;
      userName: string;
      userAvatar?: string;
      oldRole: string;
      newRole: string;
      reason?: string;
    }) => {
      addNotification({
        type: 'ROLE_CHANGED',
        userId: data.userId,
        userName: data.userName,
        userAvatar: data.userAvatar,
        oldRole: data.oldRole,
        newRole: data.newRole,
        reason: data.reason,
        isActionable: false
      });
    };

    const handleUserPromoted = (data: {
      userId: string;
      userName: string;
      userAvatar?: string;
      reason?: string;
    }) => {
      addNotification({
        type: 'USER_PROMOTED',
        userId: data.userId,
        userName: data.userName,
        userAvatar: data.userAvatar,
        newRole: 'MODERATOR',
        reason: data.reason,
        isActionable: false
      });
    };

    const handleUserDemoted = (data: {
      userId: string;
      userName: string;
      userAvatar?: string;
      oldRole: string;
      newRole: string;
      reason?: string;
    }) => {
      addNotification({
        type: 'USER_DEMOTED',
        userId: data.userId,
        userName: data.userName,
        userAvatar: data.userAvatar,
        oldRole: data.oldRole,
        newRole: data.newRole,
        reason: data.reason,
        isActionable: false
      });
    };

    const handleHostTransferred = (data: {
      newHostUserId: string;
      newHostUserName: string;
      newHostAvatar?: string;
      reason?: string;
    }) => {
      addNotification({
        type: 'HOST_TRANSFERRED',
        userId: data.newHostUserId,
        userName: data.newHostUserName,
        userAvatar: data.newHostAvatar,
        newRole: 'HOST',
        reason: data.reason,
        isActionable: false
      });
    };

    const handleParticipantRemoved = (data: {
      userId: string;
      userName: string;
      userAvatar?: string;
      reason?: string;
    }) => {
      addNotification({
        type: 'PARTICIPANT_REMOVED',
        userId: data.userId,
        userName: data.userName,
        userAvatar: data.userAvatar,
        reason: data.reason,
        isActionable: false
      });
    };

    // Register event listeners
    socket.on('role_changed', handleRoleChanged);
    socket.on('user_promoted', handleUserPromoted);
    socket.on('user_demoted', handleUserDemoted);
    socket.on('host_transferred', handleHostTransferred);
    socket.on('participant_removed', handleParticipantRemoved);

    // Cleanup
    return () => {
      socket.off('role_changed', handleRoleChanged);
      socket.off('user_promoted', handleUserPromoted);
      socket.off('user_demoted', handleUserDemoted);
      socket.off('host_transferred', handleHostTransferred);
      socket.off('participant_removed', handleParticipantRemoved);
    };
  }, [socket, isConnected, enabled, addNotification]);

  // Load initial notifications
  useEffect(() => {
    if (!enabled) return;

    const loadNotifications = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // In a real implementation, you would fetch from an API
        // For now, we'll simulate loading
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Simulate some initial notifications
        const initialNotifications: RoleChangeNotification[] = [
          {
            id: generateId(),
            type: 'ROLE_CHANGED',
            userId: 'user1',
            userName: 'John Doe',
            oldRole: 'PLAYER',
            newRole: 'MODERATOR',
            reason: 'Promoted for good behavior',
            timestamp: new Date(Date.now() - 300000), // 5 minutes ago
            isRead: false,
            isActionable: false
          },
          {
            id: generateId(),
            type: 'USER_PROMOTED',
            userId: 'user2',
            userName: 'Jane Smith',
            newRole: 'MODERATOR',
            reason: 'Active participation',
            timestamp: new Date(Date.now() - 600000), // 10 minutes ago
            isRead: true,
            isActionable: false
          }
        ];

        setNotifications(initialNotifications);
      } catch (err) {
        console.error('Error loading notifications:', err);
        setError(err instanceof Error ? err.message : 'Failed to load notifications');
      } finally {
        setIsLoading(false);
      }
    };

    loadNotifications();
  }, [enabled, generateId]);

  // Auto-mark as read after 5 seconds for non-actionable notifications
  useEffect(() => {
    const timer = setTimeout(() => {
      setNotifications(prev => 
        prev.map(notification => 
          !notification.isActionable && !notification.isRead
            ? { ...notification, isRead: true }
            : notification
        )
      );
    }, 5000);

    return () => clearTimeout(timer);
  }, [notifications]);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    addNotification,
    markAsRead,
    markAllAsRead,
    dismiss,
    clearAll,
    handleAction,
    getNotificationsByType,
    getNotificationsByUser
  };
}

// Hook for managing notification preferences
export function useNotificationPreferences() {
  const [preferences, setPreferences] = useState({
    roleChanges: true,
    promotions: true,
    demotions: true,
    hostTransfers: true,
    participantRemovals: true,
    soundEnabled: true,
    desktopNotifications: true
  });

  const updatePreference = useCallback((key: keyof typeof preferences, value: boolean) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetPreferences = useCallback(() => {
    setPreferences({
      roleChanges: true,
      promotions: true,
      demotions: true,
      hostTransfers: true,
      participantRemovals: true,
      soundEnabled: true,
      desktopNotifications: true
    });
  }, []);

  return {
    preferences,
    updatePreference,
    resetPreferences
  };
}
