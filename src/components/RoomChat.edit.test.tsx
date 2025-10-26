import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RoomChat } from './RoomChat';
import { ChatMessage, MutedUser } from './RoomChat';

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
  messages: [],
  mutedUsers: mockMutedUsers,
  participants: mockParticipants,
  onSendMessage: jest.fn(),
  onDeleteMessage: jest.fn(),
  onMuteUser: jest.fn(),
  onUnmuteUser: jest.fn(),
  onAddReaction: jest.fn(),
  onRemoveReaction: jest.fn()
};

// Mock scrollIntoView
Object.defineProperty(Element.prototype, 'scrollIntoView', {
  value: jest.fn(),
  writable: true
});

// Mock fetch
global.fetch = jest.fn();

describe('RoomChat Message Editing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  it('shows edit button for own recent messages', async () => {
    const recentMessage: ChatMessage = {
      id: 'msg-1',
      userId: 'user-1', // Current user
      userName: 'Alice',
      content: 'Hello world!',
      type: 'text',
      createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2 minutes ago
      reactions: []
    };

    render(<RoomChat {...mockProps} messages={[recentMessage]} />);
    
    // Hover over message to show moderation tools
    const messageElement = screen.getByText('Hello world!');
    fireEvent.mouseEnter(messageElement.closest('.group')!);
    
    // Click on moderation menu
    const moreButton = screen.getByRole('button', { name: 'More options' });
    fireEvent.click(moreButton);
    
    expect(screen.getByText('Edit Message')).toBeInTheDocument();
  });

  it('does not show edit button for old messages', async () => {
    const oldMessage: ChatMessage = {
      id: 'msg-1',
      userId: 'user-1', // Current user
      userName: 'Alice',
      content: 'Hello world!',
      type: 'text',
      createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 minutes ago
      reactions: []
    };

    render(<RoomChat {...mockProps} messages={[oldMessage]} />);
    
    // Hover over message to show moderation tools
    const messageElement = screen.getByText('Hello world!');
    fireEvent.mouseEnter(messageElement.closest('.group')!);
    
    // Click on moderation menu
    const moreButton = screen.getByRole('button', { name: 'More options' });
    fireEvent.click(moreButton);
    
    expect(screen.queryByText('Edit Message')).not.toBeInTheDocument();
  });

  it('does not show edit button for other users messages', async () => {
    const otherUserMessage: ChatMessage = {
      id: 'msg-1',
      userId: 'user-2', // Other user
      userName: 'Bob',
      content: 'Hello world!',
      type: 'text',
      createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2 minutes ago
      reactions: []
    };

    render(<RoomChat {...mockProps} messages={[otherUserMessage]} />);
    
    // Hover over message to show moderation tools
    const messageElement = screen.getByText('Hello world!');
    fireEvent.mouseEnter(messageElement.closest('.group')!);
    
    // Click on moderation menu
    const moreButton = screen.getByRole('button', { name: 'More options' });
    fireEvent.click(moreButton);
    
    expect(screen.queryByText('Edit Message')).not.toBeInTheDocument();
  });

  it('does not show edit button for system messages', async () => {
    const systemMessage: ChatMessage = {
      id: 'msg-1',
      userId: 'user-1', // Current user
      userName: 'Alice',
      content: 'System message',
      type: 'system',
      createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2 minutes ago
      reactions: []
    };

    render(<RoomChat {...mockProps} messages={[systemMessage]} />);
    
    // System messages don't have moderation tools
    expect(screen.queryByText('Edit Message')).not.toBeInTheDocument();
  });

  it('enters edit mode when edit button is clicked', async () => {
    const recentMessage: ChatMessage = {
      id: 'msg-1',
      userId: 'user-1',
      userName: 'Alice',
      content: 'Hello world!',
      type: 'text',
      createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      reactions: []
    };

    render(<RoomChat {...mockProps} messages={[recentMessage]} />);
    
    // Hover and click edit
    const messageElement = screen.getByText('Hello world!');
    fireEvent.mouseEnter(messageElement.closest('.group')!);
    const moreButton = screen.getByRole('button', { name: 'More options' });
    fireEvent.click(moreButton);
    const editButton = await waitFor(() => screen.getByText('Edit Message'));
    fireEvent.click(editButton);
    
    // Should show edit interface
    expect(screen.getByDisplayValue('Hello world!')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('saves edited message successfully', async () => {
    const recentMessage: ChatMessage = {
      id: 'msg-1',
      userId: 'user-1',
      userName: 'Alice',
      content: 'Hello world!',
      type: 'text',
      createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      reactions: []
    };

    // Mock successful API response
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'msg-1',
        content: 'Hello edited world!',
        updatedAt: new Date().toISOString()
      })
    });

    render(<RoomChat {...mockProps} messages={[recentMessage]} />);
    
    // Enter edit mode
    const messageElement = screen.getByText('Hello world!');
    fireEvent.mouseEnter(messageElement.closest('.group')!);
    const moreButton = screen.getByRole('button', { name: 'More options' });
    fireEvent.click(moreButton);
    const editButton = await waitFor(() => screen.getByText('Edit Message'));
    fireEvent.click(editButton);
    
    // Edit content
    const input = screen.getByDisplayValue('Hello world!');
    fireEvent.change(input, { target: { value: 'Hello edited world!' } });
    
    // Save
    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/multiplayer/rooms/room-1/messages/msg-1',
        expect.objectContaining({
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: 'Hello edited world!' })
        })
      );
    });
  });

  it('cancels editing when cancel button is clicked', async () => {
    const recentMessage: ChatMessage = {
      id: 'msg-1',
      userId: 'user-1',
      userName: 'Alice',
      content: 'Hello world!',
      type: 'text',
      createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      reactions: []
    };

    render(<RoomChat {...mockProps} messages={[recentMessage]} />);
    
    // Enter edit mode
    const messageElement = screen.getByText('Hello world!');
    fireEvent.mouseEnter(messageElement.closest('.group')!);
    const moreButton = screen.getByRole('button', { name: 'More options' });
    fireEvent.click(moreButton);
    const editButton = await waitFor(() => screen.getByText('Edit Message'));
    fireEvent.click(editButton);
    
    // Cancel
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    // Should return to normal message display
    expect(screen.getByText('Hello world!')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Hello world!')).not.toBeInTheDocument();
  });

  it('saves when Enter key is pressed', async () => {
    const recentMessage: ChatMessage = {
      id: 'msg-1',
      userId: 'user-1',
      userName: 'Alice',
      content: 'Hello world!',
      type: 'text',
      createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      reactions: []
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'msg-1',
        content: 'Hello edited world!',
        updatedAt: new Date().toISOString()
      })
    });

    render(<RoomChat {...mockProps} messages={[recentMessage]} />);
    
    // Enter edit mode
    const messageElement = screen.getByText('Hello world!');
    fireEvent.mouseEnter(messageElement.closest('.group')!);
    const moreButton = screen.getByRole('button', { name: 'More options' });
    fireEvent.click(moreButton);
    const editButton = await waitFor(() => screen.getByText('Edit Message'));
    fireEvent.click(editButton);
    
    // Edit and press Enter
    const input = screen.getByDisplayValue('Hello world!');
    fireEvent.change(input, { target: { value: 'Hello edited world!' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  it('cancels when Escape key is pressed', async () => {
    const recentMessage: ChatMessage = {
      id: 'msg-1',
      userId: 'user-1',
      userName: 'Alice',
      content: 'Hello world!',
      type: 'text',
      createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      reactions: []
    };

    render(<RoomChat {...mockProps} messages={[recentMessage]} />);
    
    // Enter edit mode
    const messageElement = screen.getByText('Hello world!');
    fireEvent.mouseEnter(messageElement.closest('.group')!);
    const moreButton = screen.getByRole('button', { name: 'More options' });
    fireEvent.click(moreButton);
    const editButton = await waitFor(() => screen.getByText('Edit Message'));
    fireEvent.click(editButton);
    
    // Press Escape
    const input = screen.getByDisplayValue('Hello world!');
    fireEvent.keyDown(input, { key: 'Escape' });
    
    // Should return to normal message display
    expect(screen.getByText('Hello world!')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Hello world!')).not.toBeInTheDocument();
  });

  it('disables save button when content is empty', async () => {
    const recentMessage: ChatMessage = {
      id: 'msg-1',
      userId: 'user-1',
      userName: 'Alice',
      content: 'Hello world!',
      type: 'text',
      createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      reactions: []
    };

    render(<RoomChat {...mockProps} messages={[recentMessage]} />);
    
    // Enter edit mode
    const messageElement = screen.getByText('Hello world!');
    fireEvent.mouseEnter(messageElement.closest('.group')!);
    const moreButton = screen.getByRole('button', { name: 'More options' });
    fireEvent.click(moreButton);
    const editButton = await waitFor(() => screen.getByText('Edit Message'));
    fireEvent.click(editButton);
    
    // Clear content
    const input = screen.getByDisplayValue('Hello world!');
    fireEvent.change(input, { target: { value: '' } });
    
    // Save button should be disabled
    const saveButton = screen.getByText('Save');
    expect(saveButton).toBeDisabled();
  });

  it('handles API errors gracefully', async () => {
    const recentMessage: ChatMessage = {
      id: 'msg-1',
      userId: 'user-1',
      userName: 'Alice',
      content: 'Hello world!',
      type: 'text',
      createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
      reactions: []
    };

    // Mock API error
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Message is too old to edit' })
    });

    // Mock alert
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

    render(<RoomChat {...mockProps} messages={[recentMessage]} />);
    
    // Enter edit mode and save
    const messageElement = screen.getByText('Hello world!');
    fireEvent.mouseEnter(messageElement.closest('.group')!);
    const moreButton = screen.getByRole('button', { name: 'More options' });
    fireEvent.click(moreButton);
    const editButton = await waitFor(() => screen.getByText('Edit Message'));
    fireEvent.click(editButton);
    
    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Failed to edit message. Please try again.');
    });

    alertSpy.mockRestore();
  });
});
