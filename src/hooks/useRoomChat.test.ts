import { renderHook, act } from '@testing-library/react';
import { useRoomChat } from './useRoomChat';

// Mock fetch
global.fetch = jest.fn();

// Mock Socket.IO
const mockSocket = {
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  disconnect: jest.fn(),
};

jest.mock('socket.io-client', () => ({
  io: () => mockSocket,
}));

describe('useRoomChat', () => {
  const mockProps = {
    roomId: 'room-123',
    roomCode: 'ABC123',
    currentUserId: 'user-123',
    currentUserName: 'John Doe',
    currentUserRole: 'PLAYER' as const,
    isHost: false,
    canModerate: false,
    onSendMessage: jest.fn(),
    onDeleteMessage: jest.fn(),
    onMuteUser: jest.fn(),
    onUnmuteUser: jest.fn(),
    onAddReaction: jest.fn(),
    onRemoveReaction: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  it('initializes with empty state', () => {
    const { result } = renderHook(() => useRoomChat(mockProps));

    expect(result.current.messages).toEqual([]);
    expect(result.current.messageInput).toBe('');
    expect(result.current.typingUsers).toEqual([]);
    expect(result.current.isTyping).toBe(false);
  });

  it('updates message input', () => {
    const { result } = renderHook(() => useRoomChat(mockProps));

    act(() => {
      result.current.setMessageInput('Hello world');
    });

    expect(result.current.messageInput).toBe('Hello world');
  });

  it('sends message when sendMessage is called', async () => {
    const { result } = renderHook(() => useRoomChat(mockProps));

    act(() => {
      result.current.setMessageInput('Hello world');
    });

    await act(async () => {
      await result.current.sendMessage();
    });

    expect(mockSocket.emit).toHaveBeenCalledWith('chat_message', {
      roomCode: 'ABC123',
      userId: 'user-123',
      userName: 'John Doe',
      content: 'Hello world',
      type: 'text',
      metadata: null,
    });
  });

  it('handles typing start', () => {
    const { result } = renderHook(() => useRoomChat(mockProps));

    act(() => {
      result.current.handleTyping();
    });

    expect(mockSocket.emit).toHaveBeenCalledWith('typing_start', {
      roomCode: 'ABC123',
      userId: 'user-123',
      userName: 'John Doe',
    });
  });

  it('handles typing stop', () => {
    const { result } = renderHook(() => useRoomChat(mockProps));

    act(() => {
      result.current.handleTyping();
    });

    // Simulate typing timeout
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(mockSocket.emit).toHaveBeenCalledWith('typing_stop', {
      roomCode: 'ABC123',
      userId: 'user-123',
    });
  });

  it('adds reaction to message', async () => {
    const { result } = renderHook(() => useRoomChat(mockProps));

    await act(async () => {
      await result.current.addReaction('msg-123', '😀');
    });

    expect(mockSocket.emit).toHaveBeenCalledWith('message_reaction', {
      roomCode: 'ABC123',
      messageId: 'msg-123',
      emoji: '😀',
      userId: 'user-123',
    });
  });

  it('removes reaction from message', async () => {
    const { result } = renderHook(() => useRoomChat(mockProps));

    await act(async () => {
      await result.current.removeReaction('msg-123', '😀');
    });

    expect(mockSocket.emit).toHaveBeenCalledWith('message_reaction', {
      roomCode: 'ABC123',
      messageId: 'msg-123',
      emoji: '😀',
      userId: 'user-123',
    });
  });

  it('edits message', async () => {
    const { result } = renderHook(() => useRoomChat(mockProps));

    await act(async () => {
      await result.current.editMessage('msg-123', 'Updated content');
    });

    expect(mockSocket.emit).toHaveBeenCalledWith('message_edit', {
      roomCode: 'ABC123',
      messageId: 'msg-123',
      content: 'Updated content',
      userId: 'user-123',
    });
  });

  it('deletes message', async () => {
    const { result } = renderHook(() => useRoomChat(mockProps));

    await act(async () => {
      await result.current.deleteMessage('msg-123');
    });

    expect(mockSocket.emit).toHaveBeenCalledWith('message_delete', {
      roomCode: 'ABC123',
      messageId: 'msg-123',
      userId: 'user-123',
      userRole: 'PLAYER',
      isHost: false,
    });
  });

  it('mutes user', async () => {
    const { result } = renderHook(() => useRoomChat(mockProps));

    await act(async () => {
      await result.current.muteUser('user-456', 5);
    });

    expect(mockSocket.emit).toHaveBeenCalledWith('mute_user', {
      roomCode: 'ABC123',
      userId: 'user-456',
      durationMinutes: 5,
      mutedBy: 'user-123',
    });
  });

  it('unmutes user', async () => {
    const { result } = renderHook(() => useRoomChat(mockProps));

    await act(async () => {
      await result.current.unmuteUser('user-456');
    });

    expect(mockSocket.emit).toHaveBeenCalledWith('unmute_user', {
      roomCode: 'ABC123',
      userId: 'user-456',
      unmutedBy: 'user-123',
    });
  });

  it('handles socket events', () => {
    const { result } = renderHook(() => useRoomChat(mockProps));

    // Simulate receiving a message
    const messageHandler = mockSocket.on.mock.calls.find(
      call => call[0] === 'chat_message_received'
    )?.[1];

    if (messageHandler) {
      act(() => {
        messageHandler({
          id: 'msg-123',
          userId: 'user-456',
          userName: 'Jane Smith',
          content: 'Hello!',
          type: 'text',
          metadata: null,
          createdAt: '2024-01-01T00:00:00Z',
        });
      });

      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0].content).toBe('Hello!');
    }

    // Simulate typing indicator
    const typingHandler = mockSocket.on.mock.calls.find(
      call => call[0] === 'user_typing'
    )?.[1];

    if (typingHandler) {
      act(() => {
        typingHandler({
          userId: 'user-456',
          userName: 'Jane Smith',
        });
      });

      expect(result.current.typingUsers).toContain('Jane Smith');
    }

    // Simulate typing stop
    const typingStopHandler = mockSocket.on.mock.calls.find(
      call => call[0] === 'user_stopped_typing'
    )?.[1];

    if (typingStopHandler) {
      act(() => {
        typingStopHandler({
          userId: 'user-456',
        });
      });

      expect(result.current.typingUsers).not.toContain('Jane Smith');
    }
  });

  it('cleans up socket listeners on unmount', () => {
    const { unmount } = renderHook(() => useRoomChat(mockProps));

    unmount();

    expect(mockSocket.off).toHaveBeenCalled();
    expect(mockSocket.disconnect).toHaveBeenCalled();
  });

  it('handles error responses', async () => {
    const { result } = renderHook(() => useRoomChat(mockProps));

    // Mock socket error
    const errorHandler = mockSocket.on.mock.calls.find(
      call => call[0] === 'error'
    )?.[1];

    if (errorHandler) {
      act(() => {
        errorHandler({
          message: 'Rate limit exceeded',
        });
      });

      // Error should be handled gracefully
      expect(result.current.messages).toEqual([]);
    }
  });

  it('handles message reactions', () => {
    const { result } = renderHook(() => useRoomChat(mockProps));

    // Simulate receiving a message with reactions
    const messageHandler = mockSocket.on.mock.calls.find(
      call => call[0] === 'chat_message_received'
    )?.[1];

    if (messageHandler) {
      act(() => {
        messageHandler({
          id: 'msg-123',
          userId: 'user-456',
          userName: 'Jane Smith',
          content: 'Hello!',
          type: 'text',
          metadata: null,
          createdAt: '2024-01-01T00:00:00Z',
          reactions: [
            {
              emoji: '😀',
              users: ['user-456'],
              count: 1,
            },
          ],
        });
      });

      expect(result.current.messages[0].reactions).toEqual([
        {
          emoji: '😀',
          users: ['user-456'],
          count: 1,
        },
      ]);
    }
  });

  it('handles message editing', () => {
    const { result } = renderHook(() => useRoomChat(mockProps));

    // First add a message
    const messageHandler = mockSocket.on.mock.calls.find(
      call => call[0] === 'chat_message_received'
    )?.[1];

    if (messageHandler) {
      act(() => {
        messageHandler({
          id: 'msg-123',
          userId: 'user-456',
          userName: 'Jane Smith',
          content: 'Hello!',
          type: 'text',
          metadata: null,
          createdAt: '2024-01-01T00:00:00Z',
        });
      });

      // Then simulate message edit
      const editHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'message_edited'
      )?.[1];

      if (editHandler) {
        act(() => {
          editHandler({
            messageId: 'msg-123',
            content: 'Hello! (edited)',
            editedAt: '2024-01-01T00:01:00Z',
            isEdited: true,
          });
        });

        expect(result.current.messages[0].content).toBe('Hello! (edited)');
        expect(result.current.messages[0].isEdited).toBe(true);
      }
    }
  });

  it('handles message deletion', () => {
    const { result } = renderHook(() => useRoomChat(mockProps));

    // First add a message
    const messageHandler = mockSocket.on.mock.calls.find(
      call => call[0] === 'chat_message_received'
    )?.[1];

    if (messageHandler) {
      act(() => {
        messageHandler({
          id: 'msg-123',
          userId: 'user-456',
          userName: 'Jane Smith',
          content: 'Hello!',
          type: 'text',
          metadata: null,
          createdAt: '2024-01-01T00:00:00Z',
        });
      });

      // Then simulate message deletion
      const deleteHandler = mockSocket.on.mock.calls.find(
        call => call[0] === 'message_deleted'
      )?.[1];

      if (deleteHandler) {
        act(() => {
          deleteHandler({
            messageId: 'msg-123',
            deletedBy: 'user-123',
            deletedAt: '2024-01-01T00:01:00Z',
          });
        });

        expect(result.current.messages[0].isDeleted).toBe(true);
        expect(result.current.messages[0].deletedBy).toBe('user-123');
      }
    }
  });
});
