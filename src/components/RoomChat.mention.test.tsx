import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RoomChat } from './RoomChat';
import { ChatMessage, MutedUser } from './RoomChat';

// Mock scrollIntoView
Object.defineProperty(Element.prototype, 'scrollIntoView', {
  value: jest.fn(),
  writable: true
});

// Mock participants data
const mockParticipants = [
  {
    userId: 'user-1',
    userName: 'Alice',
    userRole: 'HOST' as const,
    isOnline: true,
    joinedAt: '2024-01-01T00:00:00Z'
  },
  {
    userId: 'user-2',
    userName: 'Bob',
    userRole: 'PLAYER' as const,
    isOnline: true,
    joinedAt: '2024-01-01T00:00:00Z'
  },
  {
    userId: 'user-3',
    userName: 'Charlie',
    userRole: 'SPECTATOR' as const,
    isOnline: false,
    joinedAt: '2024-01-01T00:00:00Z'
  }
];

const mockMessages: ChatMessage[] = [
  {
    id: 'msg-1',
    userId: 'user-1',
    userName: 'Alice',
    content: 'Hello @Bob, how are you?',
    type: 'text',
    createdAt: new Date().toISOString(),
    reactions: []
  }
];

const mockMutedUsers: MutedUser[] = [];

const mockProps = {
  roomId: 'room-1',
  roomCode: 'ABC123',
  currentUserId: 'user-1',
  currentUserName: 'Alice',
  currentUserRole: 'HOST' as const,
  isHost: true,
  canModerate: true,
  messages: mockMessages,
  mutedUsers: mockMutedUsers,
  participants: mockParticipants,
  onSendMessage: jest.fn(),
  onDeleteMessage: jest.fn(),
  onMuteUser: jest.fn(),
  onUnmuteUser: jest.fn(),
  onAddReaction: jest.fn(),
  onRemoveReaction: jest.fn()
};

describe('RoomChat Mention Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays mention suggestions when typing @', async () => {
    render(<RoomChat {...mockProps} />);
    
    const input = screen.getByPlaceholderText('Type a message... (Enter to send, Shift+Enter for new line)');
    fireEvent.change(input, { target: { value: '@' } });
    
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.getByText('Charlie')).toBeInTheDocument();
    });
  });

  it('filters mention suggestions based on query', async () => {
    render(<RoomChat {...mockProps} />);
    
    const input = screen.getByPlaceholderText('Type a message... (Enter to send, Shift+Enter for new line)');
    fireEvent.change(input, { target: { value: '@B' } });
    
    await waitFor(() => {
      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.queryByText('Alice')).not.toBeInTheDocument();
      expect(screen.queryByText('Charlie')).not.toBeInTheDocument();
    });
  });

  it('does not suggest current user in mentions', async () => {
    render(<RoomChat {...mockProps} />);
    
    const input = screen.getByPlaceholderText('Type a message... (Enter to send, Shift+Enter for new line)');
    fireEvent.change(input, { target: { value: '@A' } });
    
    await waitFor(() => {
      expect(screen.queryByText('Alice')).not.toBeInTheDocument();
    });
  });

  it('inserts mention when suggestion is clicked', async () => {
    render(<RoomChat {...mockProps} />);
    
    const input = screen.getByPlaceholderText('Type a message... (Enter to send, Shift+Enter for new line)');
    fireEvent.change(input, { target: { value: '@B' } });
    
    await waitFor(() => {
      const bobSuggestion = screen.getByText('Bob');
      fireEvent.click(bobSuggestion);
    });
    
    expect(input).toHaveValue('@Bob ');
  });

  it('navigates suggestions with arrow keys', async () => {
    render(<RoomChat {...mockProps} />);
    
    const input = screen.getByPlaceholderText('Type a message... (Enter to send, Shift+Enter for new line)');
    fireEvent.change(input, { target: { value: '@' } });
    
    await waitFor(() => {
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });
    
    // Press arrow down
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    
    // Check if Bob is highlighted (selected)
    const bobSuggestion = screen.getByText('Bob').closest('button');
    expect(bobSuggestion).toHaveClass('bg-blue-100');
  });

  it('selects mention with Enter key', async () => {
    render(<RoomChat {...mockProps} />);
    
    const input = screen.getByPlaceholderText('Type a message... (Enter to send, Shift+Enter for new line)');
    fireEvent.change(input, { target: { value: '@B' } });
    
    await waitFor(() => {
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });
    
    // Press Enter to select
    fireEvent.keyDown(input, { key: 'Enter' });
    
    expect(input).toHaveValue('@Bob ');
  });

  it('closes suggestions with Escape key', async () => {
    render(<RoomChat {...mockProps} />);
    
    const input = screen.getByPlaceholderText('Type a message... (Enter to send, Shift+Enter for new line)');
    fireEvent.change(input, { target: { value: '@' } });
    
    await waitFor(() => {
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });
    
    // Press Escape
    fireEvent.keyDown(input, { key: 'Escape' });
    
    await waitFor(() => {
      expect(screen.queryByText('Bob')).not.toBeInTheDocument();
    });
  });

  it('highlights mentions in message content', () => {
    render(<RoomChat {...mockProps} />);
    
    // Check if the mention in the message is highlighted
    const mentionSpan = screen.getByText('@Bob');
    expect(mentionSpan).toHaveClass('bg-blue-100', 'text-blue-700');
  });

  it('shows user role badges in mention suggestions', async () => {
    render(<RoomChat {...mockProps} />);
    
    const input = screen.getByPlaceholderText('Type a message... (Enter to send, Shift+Enter for new line)');
    fireEvent.change(input, { target: { value: '@' } });
    
    await waitFor(() => {
      expect(screen.getByText('HOST')).toBeInTheDocument();
      expect(screen.getByText('PLAYER')).toBeInTheDocument();
      expect(screen.getByText('SPECTATOR')).toBeInTheDocument();
    });
  });

  it('shows online status indicators in mention suggestions', async () => {
    render(<RoomChat {...mockProps} />);
    
    const input = screen.getByPlaceholderText('Type a message... (Enter to send, Shift+Enter for new line)');
    fireEvent.change(input, { target: { value: '@' } });
    
    await waitFor(() => {
      // Check for online indicators (green dots for online users)
      const onlineIndicators = document.querySelectorAll('.bg-green-500');
      expect(onlineIndicators.length).toBe(2); // Alice and Bob are online
      
      // Check for offline indicators (gray dots for offline users)
      const offlineIndicators = document.querySelectorAll('.bg-gray-400');
      expect(offlineIndicators.length).toBe(1); // Charlie is offline
    });
  });

  it('limits mention suggestions to 5 users', async () => {
    // Create more than 5 participants
    const manyParticipants = Array.from({ length: 10 }, (_, i) => ({
      userId: `user-${i}`,
      userName: `User${i}`,
      userRole: 'PLAYER' as const,
      isOnline: true,
      joinedAt: '2024-01-01T00:00:00Z'
    }));

    render(<RoomChat {...mockProps} participants={manyParticipants} />);
    
    const input = screen.getByPlaceholderText('Type a message... (Enter to send, Shift+Enter for new line)');
    fireEvent.change(input, { target: { value: '@' } });
    
    await waitFor(() => {
      // Should only show 5 suggestions (excluding current user)
      const suggestionButtons = document.querySelectorAll('button[class*="hover:bg-gray-100"]');
      expect(suggestionButtons.length).toBe(5);
    });
  });

  it('does not show suggestions when no @ is typed', () => {
    render(<RoomChat {...mockProps} />);
    
    const input = screen.getByPlaceholderText('Type a message... (Enter to send, Shift+Enter for new line)');
    fireEvent.change(input, { target: { value: 'Hello world' } });
    
    expect(screen.queryByText('Bob')).not.toBeInTheDocument();
  });

  it('handles case-insensitive mention matching', async () => {
    render(<RoomChat {...mockProps} />);
    
    const input = screen.getByPlaceholderText('Type a message... (Enter to send, Shift+Enter for new line)');
    fireEvent.change(input, { target: { value: '@b' } }); // lowercase
    
    await waitFor(() => {
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });
  });
});
