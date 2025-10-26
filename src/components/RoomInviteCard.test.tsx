import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RoomInviteCard } from './RoomInviteCard';

// Mock Next.js router
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock the UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>,
  CardContent: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: any) => (
    <span className={`badge ${variant} ${className}`}>{children}</span>
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ onChange, onKeyPress, value, placeholder, ...props }: any) => (
    <input
      onChange={onChange}
      onKeyPress={onKeyPress}
      value={value}
      placeholder={placeholder}
      {...props}
    />
  ),
}));

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

// Mock icons
jest.mock('lucide-react', () => ({
  Users: () => <span>Users</span>,
  Clock: () => <span>Clock</span>,
  Lock: () => <span>Lock</span>,
  Crown: () => <span>Crown</span>,
  Eye: () => <span>Eye</span>,
  Play: () => <span>Play</span>,
  CheckCircle: () => <span>CheckCircle</span>,
  XCircle: () => <span>XCircle</span>,
  User: () => <span>User</span>,
  Calendar: () => <span>Calendar</span>,
  MessageCircle: () => <span>MessageCircle</span>,
  AlertCircle: () => <span>AlertCircle</span>,
}));

describe('RoomInviteCard', () => {
  const mockInvite = {
    id: 'invite1',
    room: {
      id: 'room1',
      roomCode: 'ABC123',
      name: 'Test Room',
      description: 'A test room',
      isPrivate: false,
      hasPassword: false,
      maxPlayers: 4,
      participantCount: 2,
      hostName: 'Alice',
      hostAvatar: 'avatar.jpg',
      puzzleTitle: 'Test Puzzle',
      puzzleDifficulty: 'EASY' as const,
      status: 'WAITING' as const,
      timeLimit: 30,
      allowSpectators: true,
    },
    invitedBy: 'Bob',
    message: 'Join me for fun!',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
    createdAt: new Date().toISOString(),
  };

  const defaultProps = {
    invite: mockInvite,
    onAccept: jest.fn(),
    onDecline: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders invite card correctly', () => {
    render(<RoomInviteCard {...defaultProps} />);
    
    expect(screen.getByText('Test Room')).toBeInTheDocument();
    expect(screen.getByText('Invited by Bob')).toBeInTheDocument();
    expect(screen.getByText('Host: Alice')).toBeInTheDocument();
    expect(screen.getByText('Test Puzzle')).toBeInTheDocument();
    expect(screen.getByText('Join me for fun!')).toBeInTheDocument();
  });

  it('displays room information correctly', () => {
    render(<RoomInviteCard {...defaultProps} />);
    
    expect(screen.getByText('2/4 players')).toBeInTheDocument();
    expect(screen.getByText('Spectators allowed')).toBeInTheDocument();
    expect(screen.getByText('Time limit: 30 minutes')).toBeInTheDocument();
    expect(screen.getByText('EASY')).toBeInTheDocument();
  });

  it('handles accepting invitation', async () => {
    render(<RoomInviteCard {...defaultProps} />);
    
    const acceptButton = screen.getByText('Accept & Join');
    fireEvent.click(acceptButton);
    
    expect(defaultProps.onAccept).toHaveBeenCalledWith('invite1');
  });

  it('handles declining invitation', async () => {
    render(<RoomInviteCard {...defaultProps} />);
    
    const declineButton = screen.getByText('Decline');
    fireEvent.click(declineButton);
    
    expect(defaultProps.onDecline).toHaveBeenCalledWith('invite1');
  });

  it('handles password input for private rooms', async () => {
    const privateInvite = {
      ...mockInvite,
      room: {
        ...mockInvite.room,
        isPrivate: true,
        hasPassword: true,
      },
    };

    render(<RoomInviteCard {...defaultProps} invite={privateInvite} />);
    
    const acceptButton = screen.getByText('Accept & Join');
    fireEvent.click(acceptButton);
    
    // Should show password input
    expect(screen.getByPlaceholderText('Enter room password')).toBeInTheDocument();
    
    // Enter password and accept
    const passwordInput = screen.getByPlaceholderText('Enter room password');
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    
    const acceptWithPasswordButton = screen.getByText('Accept & Join');
    fireEvent.click(acceptWithPasswordButton);
    
    expect(defaultProps.onAccept).toHaveBeenCalledWith('invite1', 'password123');
  });

  it('handles Enter key in password input', async () => {
    const privateInvite = {
      ...mockInvite,
      room: {
        ...mockInvite.room,
        isPrivate: true,
        hasPassword: true,
      },
    };

    render(<RoomInviteCard {...defaultProps} invite={privateInvite} />);
    
    const acceptButton = screen.getByText('Accept & Join');
    fireEvent.click(acceptButton);
    
    const passwordInput = screen.getByPlaceholderText('Enter room password');
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.keyPress(passwordInput, { key: 'Enter' });
    
    expect(defaultProps.onAccept).toHaveBeenCalledWith('invite1', 'password123');
  });

  it('displays expired invitation correctly', () => {
    const expiredInvite = {
      ...mockInvite,
      expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 24 hours ago
    };

    render(<RoomInviteCard {...defaultProps} invite={expiredInvite} />);
    
    expect(screen.getByText('This invitation has expired')).toBeInTheDocument();
    expect(screen.getByText('View Room')).toBeInTheDocument();
  });

  it('displays full room correctly', () => {
    const fullRoomInvite = {
      ...mockInvite,
      room: {
        ...mockInvite.room,
        participantCount: 4,
        maxPlayers: 4,
      },
    };

    render(<RoomInviteCard {...defaultProps} invite={fullRoomInvite} />);
    
    expect(screen.getByText('This room is full')).toBeInTheDocument();
    expect(screen.getByText('View Room')).toBeInTheDocument();
  });

  it('handles viewing room', () => {
    render(<RoomInviteCard {...defaultProps} />);
    
    // Make room non-joinable by setting it to active
    const activeInvite = {
      ...mockInvite,
      room: {
        ...mockInvite.room,
        status: 'ACTIVE' as const,
      },
    };

    render(<RoomInviteCard {...defaultProps} invite={activeInvite} />);
    
    const viewRoomButton = screen.getByText('View Room');
    fireEvent.click(viewRoomButton);
    
    expect(mockPush).toHaveBeenCalledWith('/room/ABC123');
  });

  it('displays different room statuses correctly', () => {
    const activeInvite = {
      ...mockInvite,
      room: {
        ...mockInvite.room,
        status: 'ACTIVE' as const,
      },
    };

    render(<RoomInviteCard {...defaultProps} invite={activeInvite} />);
    
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
  });

  it('displays private room indicator', () => {
    const privateInvite = {
      ...mockInvite,
      room: {
        ...mockInvite.room,
        isPrivate: true,
      },
    };

    render(<RoomInviteCard {...defaultProps} invite={privateInvite} />);
    
    expect(screen.getByText('Private')).toBeInTheDocument();
  });

  it('displays difficulty levels correctly', () => {
    const hardInvite = {
      ...mockInvite,
      room: {
        ...mockInvite.room,
        puzzleDifficulty: 'HARD' as const,
      },
    };

    render(<RoomInviteCard {...defaultProps} invite={hardInvite} />);
    
    expect(screen.getByText('HARD')).toBeInTheDocument();
  });

  it('handles loading state during accept', async () => {
    const mockOnAccept = jest.fn().mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<RoomInviteCard {...defaultProps} onAccept={mockOnAccept} />);
    
    const acceptButton = screen.getByText('Accept & Join');
    fireEvent.click(acceptButton);
    
    expect(screen.getByText('Joining...')).toBeInTheDocument();
    expect(acceptButton).toBeDisabled();
  });

  it('handles error state during accept', async () => {
    const mockOnAccept = jest.fn().mockRejectedValue(new Error('Failed to join'));

    render(<RoomInviteCard {...defaultProps} onAccept={mockOnAccept} />);
    
    const acceptButton = screen.getByText('Accept & Join');
    fireEvent.click(acceptButton);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to join')).toBeInTheDocument();
    });
  });

  it('displays expiration time correctly', () => {
    render(<RoomInviteCard {...defaultProps} />);
    
    const expirationText = screen.getByText(/expires/i);
    expect(expirationText).toBeInTheDocument();
  });

  it('displays creation date correctly', () => {
    render(<RoomInviteCard {...defaultProps} />);
    
    expect(screen.getByText(/invited by bob/i)).toBeInTheDocument();
  });

  it('handles room without description', () => {
    const inviteWithoutDescription = {
      ...mockInvite,
      room: {
        ...mockInvite.room,
        description: undefined,
      },
    };

    render(<RoomInviteCard {...defaultProps} invite={inviteWithoutDescription} />);
    
    expect(screen.getByText('Test Room')).toBeInTheDocument();
    expect(screen.queryByText('A test room')).not.toBeInTheDocument();
  });

  it('handles room without time limit', () => {
    const inviteWithoutTimeLimit = {
      ...mockInvite,
      room: {
        ...mockInvite.room,
        timeLimit: undefined,
      },
    };

    render(<RoomInviteCard {...defaultProps} invite={inviteWithoutTimeLimit} />);
    
    expect(screen.queryByText(/time limit/i)).not.toBeInTheDocument();
  });

  it('handles room without custom message', () => {
    const inviteWithoutMessage = {
      ...mockInvite,
      message: undefined,
    };

    render(<RoomInviteCard {...defaultProps} invite={inviteWithoutMessage} />);
    
    expect(screen.queryByText('Join me for fun!')).not.toBeInTheDocument();
  });
});
