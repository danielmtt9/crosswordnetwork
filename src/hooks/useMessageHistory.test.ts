import { renderHook, act } from '@testing-library/react';
import { useMessageHistory } from './useMessageHistory';
import { ChatMessage } from '../components/RoomChat';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('useMessageHistory', () => {
  const mockMessages: ChatMessage[] = [
    {
      id: 'msg-1',
      userId: 'user-123',
      userName: 'John Doe',
      content: 'Hello everyone!',
      type: 'text',
      createdAt: '2024-01-01T00:00:00Z',
      reactions: []
    },
    {
      id: 'msg-2',
      userId: 'user-456',
      userName: 'Jane Smith',
      content: 'Hi John!',
      type: 'text',
      createdAt: '2024-01-01T00:01:00Z',
      reactions: []
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  it('initializes with empty history', () => {
    const { result } = renderHook(() => useMessageHistory('room-123'));

    expect(result.current.messageHistory).toEqual([]);
    expect(result.current.hasHistory).toBe(false);
  });

  it('loads history from localStorage on mount', () => {
    const savedHistory = JSON.stringify(mockMessages);
    localStorageMock.getItem.mockReturnValue(savedHistory);

    const { result } = renderHook(() => useMessageHistory('room-123'));

    expect(result.current.messageHistory).toEqual(mockMessages);
    expect(result.current.hasHistory).toBe(true);
  });

  it('handles corrupted localStorage data gracefully', () => {
    localStorageMock.getItem.mockReturnValue('invalid json');

    const { result } = renderHook(() => useMessageHistory('room-123'));

    expect(result.current.messageHistory).toEqual([]);
    expect(result.current.hasHistory).toBe(false);
  });

  it('saves messages to history', () => {
    const { result } = renderHook(() => useMessageHistory('room-123'));

    act(() => {
      result.current.saveMessage(mockMessages[0]);
    });

    expect(result.current.messageHistory).toHaveLength(1);
    expect(result.current.messageHistory[0]).toEqual(mockMessages[0]);
    expect(result.current.hasHistory).toBe(true);
  });

  it('updates existing message in history', () => {
    const { result } = renderHook(() => useMessageHistory('room-123'));

    // First save a message
    act(() => {
      result.current.saveMessage(mockMessages[0]);
    });

    // Then update it
    const updatedMessage = { ...mockMessages[0], content: 'Hello everyone! (edited)' };
    act(() => {
      result.current.saveMessage(updatedMessage);
    });

    expect(result.current.messageHistory).toHaveLength(1);
    expect(result.current.messageHistory[0].content).toBe('Hello everyone! (edited)');
  });

  it('limits history to 100 messages', () => {
    const { result } = renderHook(() => useMessageHistory('room-123'));

    // Add 101 messages
    for (let i = 0; i < 101; i++) {
      act(() => {
        result.current.saveMessage({
          ...mockMessages[0],
          id: `msg-${i}`,
          content: `Message ${i}`,
        });
      });
    }

    expect(result.current.messageHistory).toHaveLength(100);
    expect(result.current.messageHistory[0].content).toBe('Message 1'); // First message should be removed
    expect(result.current.messageHistory[99].content).toBe('Message 100'); // Last message should be the newest
  });

  it('clears history', () => {
    const { result } = renderHook(() => useMessageHistory('room-123'));

    // First add some messages
    act(() => {
      result.current.saveMessage(mockMessages[0]);
      result.current.saveMessage(mockMessages[1]);
    });

    expect(result.current.messageHistory).toHaveLength(2);

    // Then clear
    act(() => {
      result.current.clearHistory();
    });

    expect(result.current.messageHistory).toEqual([]);
    expect(result.current.hasHistory).toBe(false);
  });

  it('gets message by id', () => {
    const { result } = renderHook(() => useMessageHistory('room-123'));

    act(() => {
      result.current.saveMessage(mockMessages[0]);
      result.current.saveMessage(mockMessages[1]);
    });

    const message = result.current.getMessageById('msg-1');
    expect(message).toEqual(mockMessages[0]);

    const nonExistentMessage = result.current.getMessageById('msg-999');
    expect(nonExistentMessage).toBeUndefined();
  });

  it('gets recent messages', () => {
    const { result } = renderHook(() => useMessageHistory('room-123'));

    // Add 5 messages
    for (let i = 0; i < 5; i++) {
      act(() => {
        result.current.saveMessage({
          ...mockMessages[0],
          id: `msg-${i}`,
          content: `Message ${i}`,
        });
      });
    }

    const recentMessages = result.current.getRecentMessages(3);
    expect(recentMessages).toHaveLength(3);
    expect(recentMessages[0].content).toBe('Message 2'); // Most recent
    expect(recentMessages[2].content).toBe('Message 4'); // Oldest of the 3
  });

  it('filters messages by user', () => {
    const { result } = renderHook(() => useMessageHistory('room-123'));

    act(() => {
      result.current.saveMessage(mockMessages[0]); // John Doe
      result.current.saveMessage(mockMessages[1]); // Jane Smith
    });

    const johnMessages = result.current.getMessagesByUser('user-123');
    expect(johnMessages).toHaveLength(1);
    expect(johnMessages[0].userName).toBe('John Doe');

    const janeMessages = result.current.getMessagesByUser('user-456');
    expect(janeMessages).toHaveLength(1);
    expect(janeMessages[0].userName).toBe('Jane Smith');
  });

  it('searches messages by content', () => {
    const { result } = renderHook(() => useMessageHistory('room-123'));

    act(() => {
      result.current.saveMessage({
        ...mockMessages[0],
        content: 'Hello everyone!',
      });
      result.current.saveMessage({
        ...mockMessages[1],
        content: 'Hi John!',
      });
    });

    const helloMessages = result.current.searchMessages('Hello');
    expect(helloMessages).toHaveLength(1);
    expect(helloMessages[0].content).toBe('Hello everyone!');

    const hiMessages = result.current.searchMessages('Hi');
    expect(hiMessages).toHaveLength(1);
    expect(hiMessages[0].content).toBe('Hi John!');
  });

  it('handles localStorage errors gracefully', () => {
    localStorageMock.setItem.mockImplementation(() => {
      throw new Error('Storage quota exceeded');
    });

    const { result } = renderHook(() => useMessageHistory('room-123'));

    // Should not throw error
    act(() => {
      result.current.saveMessage(mockMessages[0]);
    });

    expect(result.current.messageHistory).toHaveLength(1);
  });

  it('persists history across room changes', () => {
    const { result, rerender } = renderHook(
      ({ roomId }) => useMessageHistory(roomId),
      { initialProps: { roomId: 'room-123' } }
    );

    // Add messages to room-123
    act(() => {
      result.current.saveMessage(mockMessages[0]);
    });

    expect(result.current.messageHistory).toHaveLength(1);

    // Switch to different room
    rerender({ roomId: 'room-456' });

    expect(result.current.messageHistory).toEqual([]);
    expect(result.current.hasHistory).toBe(false);
  });

  it('restores history when returning to room', () => {
    const { result, rerender } = renderHook(
      ({ roomId }) => useMessageHistory(roomId),
      { initialProps: { roomId: 'room-123' } }
    );

    // Add messages to room-123
    act(() => {
      result.current.saveMessage(mockMessages[0]);
    });

    // Switch to different room
    rerender({ roomId: 'room-456' });

    // Return to original room
    rerender({ roomId: 'room-123' });

    expect(result.current.messageHistory).toHaveLength(1);
    expect(result.current.messageHistory[0]).toEqual(mockMessages[0]);
  });

  it('handles message reactions in history', () => {
    const { result } = renderHook(() => useMessageHistory('room-123'));

    const messageWithReactions = {
      ...mockMessages[0],
      reactions: [
        {
          emoji: '😀',
          users: ['user-123', 'user-456'],
          count: 2,
        },
      ],
    };

    act(() => {
      result.current.saveMessage(messageWithReactions);
    });

    expect(result.current.messageHistory[0].reactions).toEqual([
      {
        emoji: '😀',
        users: ['user-123', 'user-456'],
        count: 2,
      },
    ]);
  });

  it('handles edited messages in history', () => {
    const { result } = renderHook(() => useMessageHistory('room-123'));

    const editedMessage = {
      ...mockMessages[0],
      content: 'Hello everyone! (edited)',
      isEdited: true,
      editedAt: '2024-01-01T00:01:00Z',
    };

    act(() => {
      result.current.saveMessage(editedMessage);
    });

    expect(result.current.messageHistory[0].content).toBe('Hello everyone! (edited)');
    expect(result.current.messageHistory[0].isEdited).toBe(true);
    expect(result.current.messageHistory[0].editedAt).toBe('2024-01-01T00:01:00Z');
  });

  it('handles deleted messages in history', () => {
    const { result } = renderHook(() => useMessageHistory('room-123'));

    const deletedMessage = {
      ...mockMessages[0],
      isDeleted: true,
      deletedBy: 'user-123',
      deletedAt: '2024-01-01T00:01:00Z',
    };

    act(() => {
      result.current.saveMessage(deletedMessage);
    });

    expect(result.current.messageHistory[0].isDeleted).toBe(true);
    expect(result.current.messageHistory[0].deletedBy).toBe('user-123');
    expect(result.current.messageHistory[0].deletedAt).toBe('2024-01-01T00:01:00Z');
  });
});