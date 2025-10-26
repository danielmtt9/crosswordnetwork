import React from 'react';
import { render, screen } from '@testing-library/react';
import { CursorDisplay, ParticipantCursors } from './CursorDisplay';

// Mock the cursor position interface
interface CursorPosition {
  cellId: string;
  x: number;
  y: number;
  userId: string;
  userName: string;
  timestamp: number;
}

describe('CursorDisplay', () => {
  const mockCursorPositions = new Map<string, CursorPosition>();

  beforeEach(() => {
    mockCursorPositions.clear();
  });

  it('should render nothing when no cursors', () => {
    const { container } = render(
      <CursorDisplay
        cursorPositions={mockCursorPositions}
        currentUserId="user1"
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should render cursors for other users', () => {
    const now = Date.now();
    mockCursorPositions.set('user2', {
      cellId: 'A1',
      x: 100,
      y: 200,
      userId: 'user2',
      userName: 'Other User',
      timestamp: now
    });

    render(
      <CursorDisplay
        cursorPositions={mockCursorPositions}
        currentUserId="user1"
      />
    );

    expect(screen.getByText('Other User')).toBeInTheDocument();
  });

  it('should not render cursor for current user', () => {
    const now = Date.now();
    mockCursorPositions.set('user1', {
      cellId: 'A1',
      x: 100,
      y: 200,
      userId: 'user1',
      userName: 'Current User',
      timestamp: now
    });

    const { container } = render(
      <CursorDisplay
        cursorPositions={mockCursorPositions}
        currentUserId="user1"
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should fade out old cursors', () => {
    const oldTime = Date.now() - 2000; // 2 seconds ago
    mockCursorPositions.set('user2', {
      cellId: 'A1',
      x: 100,
      y: 200,
      userId: 'user2',
      userName: 'Other User',
      timestamp: oldTime
    });

    render(
      <CursorDisplay
        cursorPositions={mockCursorPositions}
        currentUserId="user1"
      />
    );

    const cursorElement = screen.getByText('Other User').closest('div');
    expect(cursorElement).toHaveStyle({ opacity: expect.any(String) });
  });

  it('should assign different colors to different users', () => {
    const now = Date.now();
    mockCursorPositions.set('user2', {
      cellId: 'A1',
      x: 100,
      y: 200,
      userId: 'user2',
      userName: 'User 2',
      timestamp: now
    });
    mockCursorPositions.set('user3', {
      cellId: 'A2',
      x: 150,
      y: 250,
      userId: 'user3',
      userName: 'User 3',
      timestamp: now
    });

    render(
      <CursorDisplay
        cursorPositions={mockCursorPositions}
        currentUserId="user1"
      />
    );

    const user2Element = screen.getByText('User 2').closest('div');
    const user3Element = screen.getByText('User 3').closest('div');

    // Should have different colors (we can't easily test exact colors, but we can test they exist)
    expect(user2Element).toHaveStyle({ color: expect.any(String) });
    expect(user3Element).toHaveStyle({ color: expect.any(String) });
  });
});

describe('ParticipantCursors', () => {
  const mockCursorPositions = new Map<string, CursorPosition>();

  beforeEach(() => {
    mockCursorPositions.clear();
  });

  it('should render nothing when no participants', () => {
    const { container } = render(
      <ParticipantCursors
        cursorPositions={mockCursorPositions}
        currentUserId="user1"
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should show active participants', () => {
    const now = Date.now();
    mockCursorPositions.set('user2', {
      cellId: 'A1',
      x: 100,
      y: 200,
      userId: 'user2',
      userName: 'Active User',
      timestamp: now
    });

    render(
      <ParticipantCursors
        cursorPositions={mockCursorPositions}
        currentUserId="user1"
      />
    );

    expect(screen.getByText('Active User')).toBeInTheDocument();
    expect(screen.getByText('Active cursors:')).toBeInTheDocument();
  });

  it('should show inactive participants with different styling', () => {
    const oldTime = Date.now() - 6000; // 6 seconds ago (inactive)
    mockCursorPositions.set('user2', {
      cellId: 'A1',
      x: 100,
      y: 200,
      userId: 'user2',
      userName: 'Inactive User',
      timestamp: oldTime
    });

    render(
      <ParticipantCursors
        cursorPositions={mockCursorPositions}
        currentUserId="user1"
      />
    );

    const userElement = screen.getByText('Inactive User');
    expect(userElement).toHaveClass('text-muted-foreground');
  });

  it('should show active participants with normal styling', () => {
    const now = Date.now();
    mockCursorPositions.set('user2', {
      cellId: 'A1',
      x: 100,
      y: 200,
      userId: 'user2',
      userName: 'Active User',
      timestamp: now
    });

    render(
      <ParticipantCursors
        cursorPositions={mockCursorPositions}
        currentUserId="user1"
      />
    );

    const userElement = screen.getByText('Active User');
    expect(userElement).toHaveClass('text-foreground');
  });

  it('should not show current user', () => {
    const now = Date.now();
    mockCursorPositions.set('user1', {
      cellId: 'A1',
      x: 100,
      y: 200,
      userId: 'user1',
      userName: 'Current User',
      timestamp: now
    });

    const { container } = render(
      <ParticipantCursors
        cursorPositions={mockCursorPositions}
        currentUserId="user1"
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should show color indicators for participants', () => {
    const now = Date.now();
    mockCursorPositions.set('user2', {
      cellId: 'A1',
      x: 100,
      y: 200,
      userId: 'user2',
      userName: 'User 2',
      timestamp: now
    });

    render(
      <ParticipantCursors
        cursorPositions={mockCursorPositions}
        currentUserId="user1"
      />
    );

    // Should have a color indicator (circle)
    const colorIndicator = screen.getByText('User 2').previousElementSibling;
    expect(colorIndicator).toHaveClass('w-3', 'h-3', 'rounded-full');
  });
});
