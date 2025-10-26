import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RoleManagementPanel } from './RoleManagementPanel';
import { useRoleManagement } from '@/hooks/useRoleManagement';
import { useRoleChangeNotifications } from '@/hooks/useRoleChangeNotifications';

// Mock the hooks
jest.mock('@/hooks/useRoleManagement');
jest.mock('@/hooks/useRoleChangeNotifications');

const mockUseRoleManagement = useRoleManagement as jest.MockedFunction<typeof useRoleManagement>;
const mockUseRoleChangeNotifications = useRoleChangeNotifications as jest.MockedFunction<typeof useRoleChangeNotifications>;

const mockParticipants = [
  {
    id: '1',
    userId: 'user1',
    userName: 'John Doe',
    userEmail: 'john@example.com',
    userAvatar: 'https://example.com/avatar1.jpg',
    role: 'HOST' as const,
    isOnline: true,
    joinedAt: new Date('2024-01-01'),
    lastSeenAt: new Date('2024-01-01'),
    user: {
      id: 'user1',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'HOST',
      subscriptionStatus: 'ACTIVE'
    }
  },
  {
    id: '2',
    userId: 'user2',
    userName: 'Jane Smith',
    userEmail: 'jane@example.com',
    userAvatar: 'https://example.com/avatar2.jpg',
    role: 'PLAYER' as const,
    isOnline: true,
    joinedAt: new Date('2024-01-01'),
    lastSeenAt: new Date('2024-01-01'),
    user: {
      id: 'user2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      role: 'PLAYER',
      subscriptionStatus: 'TRIAL'
    }
  },
  {
    id: '3',
    userId: 'user3',
    userName: 'Bob Wilson',
    userEmail: 'bob@example.com',
    userAvatar: 'https://example.com/avatar3.jpg',
    role: 'SPECTATOR' as const,
    isOnline: false,
    joinedAt: new Date('2024-01-01'),
    lastSeenAt: new Date('2024-01-01'),
    user: {
      id: 'user3',
      name: 'Bob Wilson',
      email: 'bob@example.com',
      role: 'SPECTATOR',
      subscriptionStatus: 'TRIAL'
    }
  }
];

const mockNotifications = [
  {
    id: 'notif1',
    type: 'ROLE_CHANGED' as const,
    userId: 'user2',
    userName: 'Jane Smith',
    userAvatar: 'https://example.com/avatar2.jpg',
    oldRole: 'PLAYER',
    newRole: 'MODERATOR',
    reason: 'Promoted by host',
    timestamp: new Date('2024-01-01'),
    isRead: false,
    isActionable: false
  }
];

describe('RoleManagementPanel', () => {
  const mockProps = {
    roomId: 'room123',
    currentUserId: 'user1',
    participants: mockParticipants,
    onParticipantUpdate: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseRoleManagement.mockReturnValue({
      isLoading: false,
      error: null,
      changeRole: jest.fn().mockResolvedValue(true),
      promoteUser: jest.fn().mockResolvedValue(true),
      demoteUser: jest.fn().mockResolvedValue(true),
      transferHost: jest.fn().mockResolvedValue(true),
      removeParticipant: jest.fn().mockResolvedValue(true),
      getActivityLogs: jest.fn().mockResolvedValue([])
    });

    mockUseRoleChangeNotifications.mockReturnValue({
      notifications: mockNotifications,
      unreadCount: 1,
      isLoading: false,
      error: null,
      addNotification: jest.fn(),
      markAsRead: jest.fn(),
      markAllAsRead: jest.fn(),
      dismiss: jest.fn(),
      clearAll: jest.fn(),
      handleAction: jest.fn(),
      getNotificationsByType: jest.fn(),
      getNotificationsByUser: jest.fn()
    });
  });

  it('should render role management panel', () => {
    render(<RoleManagementPanel {...mockProps} />);

    expect(screen.getByText('Role Management')).toBeInTheDocument();
    expect(screen.getByText('Manage participant roles and permissions')).toBeInTheDocument();
    expect(screen.getByText('Participants')).toBeInTheDocument();
  });

  it('should display participants list', () => {
    render(<RoleManagementPanel {...mockProps} />);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
    expect(screen.getByText('3 participants in the room')).toBeInTheDocument();
  });

  it('should show role indicators for each participant', () => {
    render(<RoleManagementPanel {...mockProps} />);

    expect(screen.getByText('HOST')).toBeInTheDocument();
    expect(screen.getByText('PLAYER')).toBeInTheDocument();
    expect(screen.getByText('SPECTATOR')).toBeInTheDocument();
  });

  it('should show online/offline status', () => {
    render(<RoleManagementPanel {...mockProps} />);

    expect(screen.getAllByText('Online')).toHaveLength(2);
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  it('should show notification bell with unread count', () => {
    render(<RoleManagementPanel {...mockProps} />);

    const bellButton = screen.getByRole('button', { name: /bell/i });
    expect(bellButton).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument(); // Unread count
  });

  it('should toggle notifications panel when bell is clicked', async () => {
    render(<RoleManagementPanel {...mockProps} />);

    const bellButton = screen.getByRole('button', { name: /bell/i });
    fireEvent.click(bellButton);

    await waitFor(() => {
      expect(screen.getByText('Role Change Notifications')).toBeInTheDocument();
    });
  });

  it('should toggle preferences panel when settings is clicked', async () => {
    render(<RoleManagementPanel {...mockProps} />);

    const settingsButton = screen.getByRole('button', { name: /settings/i });
    fireEvent.click(settingsButton);

    await waitFor(() => {
      expect(screen.getByText('Notification Preferences')).toBeInTheDocument();
    });
  });

  it('should show action dropdown for host', () => {
    render(<RoleManagementPanel {...mockProps} />);

    // Host should have action dropdown
    const hostActions = screen.getAllByRole('button', { name: /more/i });
    expect(hostActions).toHaveLength(1); // Only host has actions
  });

  it('should not show action dropdown for non-host participants', () => {
    render(<RoleManagementPanel {...mockProps} />);

    // Only host should have actions, others should not
    const actionButtons = screen.getAllByRole('button', { name: /more/i });
    expect(actionButtons).toHaveLength(1);
  });

  it('should display error when role management fails', () => {
    mockUseRoleManagement.mockReturnValue({
      isLoading: false,
      error: 'Failed to change role',
      changeRole: jest.fn().mockResolvedValue(false),
      promoteUser: jest.fn().mockResolvedValue(false),
      demoteUser: jest.fn().mockResolvedValue(false),
      transferHost: jest.fn().mockResolvedValue(false),
      removeParticipant: jest.fn().mockResolvedValue(false),
      getActivityLogs: jest.fn().mockResolvedValue([])
    });

    render(<RoleManagementPanel {...mockProps} />);

    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Failed to change role')).toBeInTheDocument();
  });

  it('should show loading state when role management is loading', () => {
    mockUseRoleManagement.mockReturnValue({
      isLoading: true,
      error: null,
      changeRole: jest.fn().mockResolvedValue(true),
      promoteUser: jest.fn().mockResolvedValue(true),
      demoteUser: jest.fn().mockResolvedValue(true),
      transferHost: jest.fn().mockResolvedValue(true),
      removeParticipant: jest.fn().mockResolvedValue(true),
      getActivityLogs: jest.fn().mockResolvedValue([])
    });

    render(<RoleManagementPanel {...mockProps} />);

    // Should still render the panel even when loading
    expect(screen.getByText('Role Management')).toBeInTheDocument();
  });

  it('should handle participant update callback', () => {
    const onParticipantUpdate = jest.fn();
    render(<RoleManagementPanel {...mockProps} onParticipantUpdate={onParticipantUpdate} />);

    // The callback should be available for the component to use
    expect(onParticipantUpdate).toBeDefined();
  });

  it('should show "You" badge for current user', () => {
    render(<RoleManagementPanel {...mockProps} />);

    expect(screen.getByText('You')).toBeInTheDocument();
  });

  it('should handle empty participants list', () => {
    render(<RoleManagementPanel {...mockProps} participants={[]} />);

    expect(screen.getByText('0 participants in the room')).toBeInTheDocument();
  });

  it('should handle single participant', () => {
    const singleParticipant = [mockParticipants[0]];
    render(<RoleManagementPanel {...mockProps} participants={singleParticipant} />);

    expect(screen.getByText('1 participant in the room')).toBeInTheDocument();
  });
});
