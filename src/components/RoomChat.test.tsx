import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RoomChat, ChatMessage, RoomParticipant } from './RoomChat';

// Mock scrollIntoView
Element.prototype.scrollIntoView = jest.fn();

// Mock the useRoomChat hook
jest.mock('../hooks/useRoomChat', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    messages: [],
    messageInput: '',
    setMessageInput: jest.fn(),
    sendMessage: jest.fn(),
    deleteMessage: jest.fn(),
    muteUser: jest.fn(),
    unmuteUser: jest.fn(),
    addReaction: jest.fn(),
    removeReaction: jest.fn(),
    editMessage: jest.fn(),
    typingUsers: [],
    isTyping: false,
    handleTyping: jest.fn(),
  }))
}));

// Mock the EmojiPicker component
jest.mock('./EmojiPicker', () => {
  return function MockEmojiPicker({ onEmojiSelect, onClose, isOpen }: any) {
    if (!isOpen) return null;
    return (
      <div data-testid="emoji-picker">
        <button onClick={() => onEmojiSelect('😀')}>😀</button>
        <button onClick={onClose}>Close</button>
      </div>
    );
  };
});

describe('RoomChat', () => {
  const mockProps = {
    roomId: 'room-123',
    roomCode: 'ABC123',
    currentUserId: 'user-123',
    currentUserName: 'John Doe',
    currentUserRole: 'PLAYER' as const,
    isHost: false,
    canModerate: false,
    messages: [],
    mutedUsers: [],
    participants: [
      {
        userId: 'user-123',
        userName: 'John Doe',
        userRole: 'PLAYER' as const,
        isOnline: true,
        joinedAt: '2024-01-01T00:00:00Z'
      },
      {
        userId: 'user-456',
        userName: 'Jane Smith',
        userRole: 'HOST' as const,
        isOnline: true,
        joinedAt: '2024-01-01T00:00:00Z'
      }
    ],
    onSendMessage: jest.fn(),
    onDeleteMessage: jest.fn(),
    onMuteUser: jest.fn(),
    onUnmuteUser: jest.fn(),
    onAddReaction: jest.fn(),
    onRemoveReaction: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders chat interface', () => {
    render(<RoomChat {...mockProps} />);
    
    expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument();
    expect(screen.getByText('Send')).toBeInTheDocument();
  });

  it('displays messages', () => {
    const messages: ChatMessage[] = [
      {
        id: 'msg-1',
        userId: 'user-123',
        userName: 'John Doe',
        content: 'Hello everyone!',
        type: 'text',
        createdAt: '2024-01-01T00:00:00Z',
        reactions: []
      }
    ];

    render(<RoomChat {...mockProps} messages={messages} />);
    
    expect(screen.getByText('Hello everyone!')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('sends message when send button is clicked', async () => {
    const mockSendMessage = jest.fn();
    const useRoomChat = require('../hooks/useRoomChat').default;
    useRoomChat.mockReturnValue({
      messages: [],
      messageInput: 'Test message',
      setMessageInput: jest.fn(),
      sendMessage: mockSendMessage,
      deleteMessage: jest.fn(),
      muteUser: jest.fn(),
      unmuteUser: jest.fn(),
      addReaction: jest.fn(),
      removeReaction: jest.fn(),
      editMessage: jest.fn(),
      typingUsers: [],
      isTyping: false,
      handleTyping: jest.fn(),
    });

    render(<RoomChat {...mockProps} />);
    
    const sendButton = screen.getByText('Send');
    fireEvent.click(sendButton);
    
    expect(mockSendMessage).toHaveBeenCalled();
  });

  it('sends message when Enter key is pressed', async () => {
    const mockSendMessage = jest.fn();
    const useRoomChat = require('../hooks/useRoomChat').default;
    useRoomChat.mockReturnValue({
      messages: [],
      messageInput: 'Test message',
      setMessageInput: jest.fn(),
      sendMessage: mockSendMessage,
      deleteMessage: jest.fn(),
      muteUser: jest.fn(),
      unmuteUser: jest.fn(),
      addReaction: jest.fn(),
      removeReaction: jest.fn(),
      editMessage: jest.fn(),
      typingUsers: [],
      isTyping: false,
      handleTyping: jest.fn(),
    });

    render(<RoomChat {...mockProps} />);
    
    const input = screen.getByPlaceholderText('Type a message...');
    fireEvent.keyPress(input, { key: 'Enter', code: 'Enter' });
    
    expect(mockSendMessage).toHaveBeenCalled();
  });

  it('shows emoji picker when emoji button is clicked', () => {
    render(<RoomChat {...mockProps} />);
    
    const emojiButton = screen.getByLabelText('Add emoji reaction');
    fireEvent.click(emojiButton);
    
    expect(screen.getByTestId('emoji-picker')).toBeInTheDocument();
  });

  it('handles emoji selection', () => {
    const mockAddReaction = jest.fn();
    const useRoomChat = require('../hooks/useRoomChat').default;
    useRoomChat.mockReturnValue({
      messages: [],
      messageInput: '',
      setMessageInput: jest.fn(),
      sendMessage: jest.fn(),
      deleteMessage: jest.fn(),
      muteUser: jest.fn(),
      unmuteUser: jest.fn(),
      addReaction: mockAddReaction,
      removeReaction: jest.fn(),
      editMessage: jest.fn(),
      typingUsers: [],
      isTyping: false,
      handleTyping: jest.fn(),
    });

    const messages: ChatMessage[] = [
      {
        id: 'msg-1',
        userId: 'user-123',
        userName: 'John Doe',
        content: 'Hello everyone!',
        type: 'text',
        createdAt: '2024-01-01T00:00:00Z',
        reactions: []
      }
    ];

    render(<RoomChat {...mockProps} messages={messages} />);
    
    const emojiButton = screen.getByLabelText('Add emoji reaction');
    fireEvent.click(emojiButton);
    
    const emojiPicker = screen.getByTestId('emoji-picker');
    const emojiButtonInPicker = emojiPicker.querySelector('button');
    fireEvent.click(emojiButtonInPicker!);
    
    expect(mockAddReaction).toHaveBeenCalledWith('msg-1', '😀');
  });

  it('shows mention suggestions when @ is typed', async () => {
    render(<RoomChat {...mockProps} />);
    
    const input = screen.getByPlaceholderText('Type a message...');
    fireEvent.change(input, { target: { value: '@' } });
    
    await waitFor(() => {
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  it('handles mention selection', async () => {
    render(<RoomChat {...mockProps} />);
    
    const input = screen.getByPlaceholderText('Type a message...');
    fireEvent.change(input, { target: { value: '@' } });
    
    await waitFor(() => {
      const mentionButton = screen.getByText('Jane Smith');
      fireEvent.click(mentionButton);
    });
    
    expect(input).toHaveValue('@Jane Smith ');
  });

  it('shows edit interface for own messages', () => {
    const messages: ChatMessage[] = [
      {
        id: 'msg-1',
        userId: 'user-123',
        userName: 'John Doe',
        content: 'Hello everyone!',
        type: 'text',
        createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2 minutes ago
        reactions: []
      }
    ];

    render(<RoomChat {...mockProps} messages={messages} />);
    
    const moreButton = screen.getByLabelText('More options');
    fireEvent.click(moreButton);
    
    expect(screen.getByText('Edit Message')).toBeInTheDocument();
  });

  it('allows editing message content', async () => {
    const messages: ChatMessage[] = [
      {
        id: 'msg-1',
        userId: 'user-123',
        userName: 'John Doe',
        content: 'Hello everyone!',
        type: 'text',
        createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2 minutes ago
        reactions: []
      }
    ];

    render(<RoomChat {...mockProps} messages={messages} />);
    
    const moreButton = screen.getByLabelText('More options');
    fireEvent.click(moreButton);
    
    const editButton = screen.getByText('Edit Message');
    fireEvent.click(editButton);
    
    const editInput = screen.getByDisplayValue('Hello everyone!');
    fireEvent.change(editInput, { target: { value: 'Hello everyone! (edited)' } });
    
    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);
    
    // The actual edit functionality would be handled by the useRoomChat hook
    expect(editInput).toHaveValue('Hello everyone! (edited)');
  });

  it('shows typing indicators', () => {
    const useRoomChat = require('../hooks/useRoomChat').default;
    useRoomChat.mockReturnValue({
      messages: [],
      messageInput: '',
      setMessageInput: jest.fn(),
      sendMessage: jest.fn(),
      deleteMessage: jest.fn(),
      muteUser: jest.fn(),
      unmuteUser: jest.fn(),
      addReaction: jest.fn(),
      removeReaction: jest.fn(),
      editMessage: jest.fn(),
      typingUsers: ['Jane Smith'],
      isTyping: false,
      handleTyping: jest.fn(),
    });

    render(<RoomChat {...mockProps} />);
    
    expect(screen.getByText('Jane Smith is typing...')).toBeInTheDocument();
  });

  it('displays message reactions', () => {
    const messages: ChatMessage[] = [
      {
        id: 'msg-1',
        userId: 'user-123',
        userName: 'John Doe',
        content: 'Hello everyone!',
        type: 'text',
        createdAt: '2024-01-01T00:00:00Z',
        reactions: [
          {
            emoji: '😀',
            users: ['user-123', 'user-456'],
            count: 2
          }
        ]
      }
    ];

    render(<RoomChat {...mockProps} messages={messages} />);
    
    expect(screen.getByText('😀')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('handles reaction clicks', () => {
    const mockAddReaction = jest.fn();
    const mockRemoveReaction = jest.fn();
    const useRoomChat = require('../hooks/useRoomChat').default;
    useRoomChat.mockReturnValue({
      messages: [],
      messageInput: '',
      setMessageInput: jest.fn(),
      sendMessage: jest.fn(),
      deleteMessage: jest.fn(),
      muteUser: jest.fn(),
      unmuteUser: jest.fn(),
      addReaction: mockAddReaction,
      removeReaction: mockRemoveReaction,
      editMessage: jest.fn(),
      typingUsers: [],
      isTyping: false,
      handleTyping: jest.fn(),
    });

    const messages: ChatMessage[] = [
      {
        id: 'msg-1',
        userId: 'user-123',
        userName: 'John Doe',
        content: 'Hello everyone!',
        type: 'text',
        createdAt: '2024-01-01T00:00:00Z',
        reactions: [
          {
            emoji: '😀',
            users: ['user-456'],
            count: 1
          }
        ]
      }
    ];

    render(<RoomChat {...mockProps} messages={messages} />);
    
    const reactionButton = screen.getByText('😀');
    fireEvent.click(reactionButton);
    
    expect(mockAddReaction).toHaveBeenCalledWith('msg-1', '😀');
  });

  it('shows moderation options for host', () => {
    const messages: ChatMessage[] = [
      {
        id: 'msg-1',
        userId: 'user-456',
        userName: 'Jane Smith',
        content: 'Hello everyone!',
        type: 'text',
        createdAt: '2024-01-01T00:00:00Z',
        reactions: []
      }
    ];

    render(<RoomChat {...mockProps} isHost={true} canModerate={true} messages={messages} />);
    
    const moreButton = screen.getByLabelText('More options');
    fireEvent.click(moreButton);
    
    expect(screen.getByText('Delete Message')).toBeInTheDocument();
    expect(screen.getByText('Mute User')).toBeInTheDocument();
  });

  it('handles keyboard shortcuts', () => {
    const mockSendMessage = jest.fn();
    const useRoomChat = require('../hooks/useRoomChat').default;
    useRoomChat.mockReturnValue({
      messages: [],
      messageInput: 'Test message',
      setMessageInput: jest.fn(),
      sendMessage: mockSendMessage,
      deleteMessage: jest.fn(),
      muteUser: jest.fn(),
      unmuteUser: jest.fn(),
      addReaction: jest.fn(),
      removeReaction: jest.fn(),
      editMessage: jest.fn(),
      typingUsers: [],
      isTyping: false,
      handleTyping: jest.fn(),
    });

    render(<RoomChat {...mockProps} />);
    
    const input = screen.getByPlaceholderText('Type a message...');
    
    // Test Ctrl+Enter shortcut
    fireEvent.keyDown(input, { key: 'Enter', ctrlKey: true });
    expect(mockSendMessage).toHaveBeenCalled();
  });
});