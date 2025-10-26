import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SpectatorView } from './SpectatorView';

const mockProps = {
  roomId: 'room123',
  puzzleId: 'puzzle456',
  puzzleContent: '<div class="crossword">Mock puzzle content</div>',
  participants: [
    {
      userId: 'user1',
      userName: 'Alice',
      userRole: 'PLAYER' as const,
      isOnline: true,
      isActive: true
    },
    {
      userId: 'user2',
      userName: 'Bob',
      userRole: 'PLAYER' as const,
      isOnline: true,
      isActive: false
    },
    {
      userId: 'user3',
      userName: 'Charlie',
      userRole: 'SPECTATOR' as const,
      isOnline: true,
      isActive: false
    }
  ],
  currentUserId: 'user3',
  currentUserRole: 'SPECTATOR' as const,
  onRequestUpgrade: jest.fn()
};

describe('SpectatorView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render spectator mode for spectators', () => {
    render(<SpectatorView {...mockProps} />);
    
    expect(screen.getByText('Spectator Mode')).toBeInTheDocument();
    expect(screen.getByText('Read-Only')).toBeInTheDocument();
    expect(screen.getByText("You're watching the puzzle being solved in real-time")).toBeInTheDocument();
  });

  it('should show upgrade button for spectators', () => {
    render(<SpectatorView {...mockProps} />);
    
    expect(screen.getByText('Upgrade to Collaborate')).toBeInTheDocument();
  });

  it('should show upgrade prompt for spectators', () => {
    render(<SpectatorView {...mockProps} />);
    
    expect(screen.getByText(/As a spectator, you can watch the puzzle being solved but cannot make changes/)).toBeInTheDocument();
  });

  it('should toggle watching state', () => {
    render(<SpectatorView {...mockProps} />);
    
    const watchButton = screen.getByText('Start Watching');
    fireEvent.click(watchButton);
    
    expect(screen.getByText('Stop Watching')).toBeInTheDocument();
    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  it('should show live activity when watching', async () => {
    render(<SpectatorView {...mockProps} />);
    
    const watchButton = screen.getByText('Start Watching');
    fireEvent.click(watchButton);
    
    await waitFor(() => {
      expect(screen.getByText('Live Activity')).toBeInTheDocument();
      expect(screen.getByText('Active Collaborators')).toBeInTheDocument();
      expect(screen.getByText('Puzzle Progress')).toBeInTheDocument();
      expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    });
  });

  it('should show puzzle content with read-only overlay when watching', async () => {
    render(<SpectatorView {...mockProps} />);
    
    const watchButton = screen.getByText('Start Watching');
    fireEvent.click(watchButton);
    
    await waitFor(() => {
      expect(screen.getByText('Puzzle View')).toBeInTheDocument();
      expect(screen.getAllByText('Read-Only')).toHaveLength(2); // One in header, one in puzzle view
      expect(screen.getByText('Read-only mode - Upgrade to collaborate')).toBeInTheDocument();
    });
  });

  it('should call onRequestUpgrade when upgrade button is clicked', () => {
    render(<SpectatorView {...mockProps} />);
    
    const upgradeButton = screen.getByText('Upgrade to Collaborate');
    fireEvent.click(upgradeButton);
    
    expect(mockProps.onRequestUpgrade).toHaveBeenCalled();
  });

  it('should show spectator guidelines', () => {
    render(<SpectatorView {...mockProps} />);
    
    expect(screen.getByText('Spectator Guidelines')).toBeInTheDocument();
    expect(screen.getByText('You can watch the puzzle being solved in real-time')).toBeInTheDocument();
    expect(screen.getByText('You cannot make changes to the puzzle')).toBeInTheDocument();
  });

  it('should display active collaborators count', async () => {
    render(<SpectatorView {...mockProps} />);
    
    const watchButton = screen.getByText('Start Watching');
    fireEvent.click(watchButton);
    
    await waitFor(() => {
      expect(screen.getByText(/online/)).toBeInTheDocument();
    });
  });

  it('should show different content for non-spectators', () => {
    const nonSpectatorProps = {
      ...mockProps,
      currentUserRole: 'PLAYER' as const
    };
    
    render(<SpectatorView {...nonSpectatorProps} />);
    
    expect(screen.getByText('Switch to spectator mode to watch without participating')).toBeInTheDocument();
    expect(screen.queryByText('Upgrade to Collaborate')).not.toBeInTheDocument();
  });

  it('should handle stop watching', async () => {
    render(<SpectatorView {...mockProps} />);
    
    const watchButton = screen.getByText('Start Watching');
    fireEvent.click(watchButton);
    
    await waitFor(() => {
      expect(screen.getByText('Stop Watching')).toBeInTheDocument();
    });
    
    const stopButton = screen.getByText('Stop Watching');
    fireEvent.click(stopButton);
    
    expect(screen.getByText('Start Watching')).toBeInTheDocument();
    expect(screen.queryByText('Live Activity')).not.toBeInTheDocument();
  });

  it('should show live indicator when watching', async () => {
    render(<SpectatorView {...mockProps} />);
    
    const watchButton = screen.getByText('Start Watching');
    fireEvent.click(watchButton);
    
    await waitFor(() => {
      expect(screen.getByText('Live')).toBeInTheDocument();
    });
  });

  it('should display puzzle progress', async () => {
    render(<SpectatorView {...mockProps} />);
    
    const watchButton = screen.getByText('Start Watching');
    fireEvent.click(watchButton);
    
    await waitFor(() => {
      expect(screen.getByText('Puzzle Progress')).toBeInTheDocument();
    });
  });

  it('should show recent activity feed', async () => {
    render(<SpectatorView {...mockProps} />);
    
    const watchButton = screen.getByText('Start Watching');
    fireEvent.click(watchButton);
    
    await waitFor(() => {
      expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    });
  });
});
