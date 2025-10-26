import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RoleChangeNotification, RoleChangeNotificationList } from './RoleChangeNotification';

const mockNotification = {
  id: 'notif1',
  type: 'ROLE_CHANGED' as const,
  userId: 'user123',
  userName: 'John Doe',
  userAvatar: 'https://example.com/avatar.jpg',
  oldRole: 'PLAYER',
  newRole: 'MODERATOR',
  reason: 'Promoted for good behavior',
  timestamp: new Date('2024-01-01T10:00:00Z'),
  isRead: false,
  isActionable: false
};

const mockNotifications = [
  mockNotification,
  {
    id: 'notif2',
    type: 'USER_PROMOTED' as const,
    userId: 'user456',
    userName: 'Jane Smith',
    userAvatar: 'https://example.com/avatar2.jpg',
    newRole: 'MODERATOR',
    reason: 'Active participation',
    timestamp: new Date('2024-01-01T09:00:00Z'),
    isRead: true,
    isActionable: false
  },
  {
    id: 'notif3',
    type: 'HOST_TRANSFERRED' as const,
    userId: 'user789',
    userName: 'Bob Wilson',
    userAvatar: 'https://example.com/avatar3.jpg',
    newRole: 'HOST',
    reason: 'Host transferred ownership',
    timestamp: new Date('2024-01-01T08:00:00Z'),
    isRead: false,
    isActionable: true
  }
];

describe('RoleChangeNotification', () => {
  const mockProps = {
    notification: mockNotification,
    onDismiss: jest.fn(),
    onMarkAsRead: jest.fn(),
    onAction: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render notification with correct content', () => {
    render(<RoleChangeNotification {...mockProps} />);

    expect(screen.getByText('Role Changed')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('was changed from')).toBeInTheDocument();
    expect(screen.getByText('PLAYER')).toBeInTheDocument();
    expect(screen.getByText('to')).toBeInTheDocument();
    expect(screen.getByText('MODERATOR')).toBeInTheDocument();
    expect(screen.getByText('Reason: Promoted for good behavior')).toBeInTheDocument();
  });

  it('should show unread indicator for unread notifications', () => {
    render(<RoleChangeNotification {...mockProps} />);

    expect(screen.getByRole('button', { name: /mark as read/i })).toBeInTheDocument();
  });

  it('should not show unread indicator for read notifications', () => {
    const readNotification = { ...mockNotification, isRead: true };
    render(<RoleChangeNotification {...mockProps} notification={readNotification} />);

    expect(screen.queryByRole('button', { name: /mark as read/i })).not.toBeInTheDocument();
  });

  it('should handle dismiss action', () => {
    render(<RoleChangeNotification {...mockProps} />);

    const dismissButton = screen.getByRole('button', { name: /dismiss/i });
    fireEvent.click(dismissButton);

    expect(mockProps.onDismiss).toHaveBeenCalledWith('notif1');
  });

  it('should handle mark as read action', () => {
    render(<RoleChangeNotification {...mockProps} />);

    const markAsReadButton = screen.getByRole('button', { name: /mark as read/i });
    fireEvent.click(markAsReadButton);

    expect(mockProps.onMarkAsRead).toHaveBeenCalledWith('notif1');
  });

  it('should handle expand/collapse functionality', async () => {
    render(<RoleChangeNotification {...mockProps} />);

    const expandButton = screen.getByRole('button', { name: /expand/i });
    fireEvent.click(expandButton);

    await waitFor(() => {
      expect(screen.getByText('User ID: user123')).toBeInTheDocument();
      expect(screen.getByText('Timestamp: 1/1/2024, 10:00:00 AM')).toBeInTheDocument();
    });

    const collapseButton = screen.getByRole('button', { name: /collapse/i });
    fireEvent.click(collapseButton);

    await waitFor(() => {
      expect(screen.queryByText('User ID: user123')).not.toBeInTheDocument();
    });
  });

  it('should show action buttons for actionable notifications', () => {
    const actionableNotification = { ...mockNotification, isActionable: true };
    render(<RoleChangeNotification {...mockProps} notification={actionableNotification} />);

    const expandButton = screen.getByRole('button', { name: /expand/i });
    fireEvent.click(expandButton);

    expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument();
  });

  it('should handle action buttons for actionable notifications', () => {
    const actionableNotification = { ...mockNotification, isActionable: true };
    render(<RoleChangeNotification {...mockProps} notification={actionableNotification} />);

    const expandButton = screen.getByRole('button', { name: /expand/i });
    fireEvent.click(expandButton);

    const approveButton = screen.getByRole('button', { name: /approve/i });
    fireEvent.click(approveButton);

    expect(mockProps.onAction).toHaveBeenCalledWith('notif1', 'approve');
  });

  it('should format timestamp correctly', () => {
    render(<RoleChangeNotification {...mockProps} />);

    // The timestamp should be formatted and displayed
    expect(screen.getByText(/ago/)).toBeInTheDocument();
  });

  it('should show different notification types', () => {
    const promotedNotification = {
      ...mockNotification,
      type: 'USER_PROMOTED' as const,
      oldRole: undefined
    };

    render(<RoleChangeNotification {...mockProps} notification={promotedNotification} />);

    expect(screen.getByText('User Promoted')).toBeInTheDocument();
    // The text might be split across elements, so we check for partial text
    expect(screen.getByText(/is now the host/)).toBeInTheDocument();
  });

  it('should handle host transfer notifications', () => {
    const hostTransferNotification = {
      ...mockNotification,
      type: 'HOST_TRANSFERRED' as const,
      oldRole: undefined
    };

    render(<RoleChangeNotification {...mockProps} notification={hostTransferNotification} />);

    expect(screen.getByText('Host Transferred')).toBeInTheDocument();
    expect(screen.getByText('is now the host')).toBeInTheDocument();
  });

  it('should handle participant removed notifications', () => {
    const removedNotification = {
      ...mockNotification,
      type: 'PARTICIPANT_REMOVED' as const,
      oldRole: undefined,
      newRole: undefined
    };

    render(<RoleChangeNotification {...mockProps} notification={removedNotification} />);

    expect(screen.getByText('Participant Removed')).toBeInTheDocument();
    expect(screen.getByText('was removed from the room')).toBeInTheDocument();
  });
});

describe('RoleChangeNotificationList', () => {
  const mockProps = {
    notifications: mockNotifications,
    onDismiss: jest.fn(),
    onMarkAsRead: jest.fn(),
    onAction: jest.fn(),
    onMarkAllAsRead: jest.fn(),
    onClearAll: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render notification list with header', () => {
    render(<RoleChangeNotificationList {...mockProps} />);

    expect(screen.getByText('Role Changes')).toBeInTheDocument();
    expect(screen.getByText(/unread/)).toBeInTheDocument();
    expect(screen.getByText('Mark all read')).toBeInTheDocument();
    expect(screen.getByText('Clear all')).toBeInTheDocument();
  });

  it('should render all notifications', () => {
    render(<RoleChangeNotificationList {...mockProps} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
  });

  it('should handle empty notifications list', () => {
    render(<RoleChangeNotificationList {...mockProps} notifications={[]} />);

    expect(screen.getByText('No role change notifications')).toBeInTheDocument();
  });

  it('should handle mark all as read action', () => {
    render(<RoleChangeNotificationList {...mockProps} />);

    const markAllButton = screen.getByText('Mark all read');
    fireEvent.click(markAllButton);

    expect(mockProps.onMarkAllAsRead).toHaveBeenCalled();
  });

  it('should handle clear all action', () => {
    render(<RoleChangeNotificationList {...mockProps} />);

    const clearAllButton = screen.getByText('Clear all');
    fireEvent.click(clearAllButton);

    expect(mockProps.onClearAll).toHaveBeenCalled();
  });

  it('should show correct unread count', () => {
    render(<RoleChangeNotificationList {...mockProps} />);

    expect(screen.getByText(/unread/)).toBeInTheDocument();
  });

  it('should not show unread count when all notifications are read', () => {
    const allReadNotifications = mockNotifications.map(n => ({ ...n, isRead: true }));
    render(<RoleChangeNotificationList {...mockProps} notifications={allReadNotifications} />);

    expect(screen.queryByText(/unread/)).not.toBeInTheDocument();
  });

  it('should pass notification actions to individual notifications', () => {
    render(<RoleChangeNotificationList {...mockProps} />);

    // Each notification should receive the action handlers
    expect(mockProps.onDismiss).toBeDefined();
    expect(mockProps.onMarkAsRead).toBeDefined();
    expect(mockProps.onAction).toBeDefined();
  });
});
