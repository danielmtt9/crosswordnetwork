import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LiveProgressIndicators, LiveProgressIndicatorsCompact } from './LiveProgressIndicators';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Users: () => <div data-testid="users-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  CheckCircle: () => <div data-testid="check-circle-icon" />,
  Play: () => <div data-testid="play-icon" />,
  Pause: () => <div data-testid="pause-icon" />,
  RotateCcw: () => <div data-testid="rotate-ccw-icon" />,
  TrendingUp: () => <div data-testid="trending-up-icon" />,
  Target: () => <div data-testid="target-icon" />,
  Zap: () => <div data-testid="zap-icon" />,
  Award: () => <div data-testid="award-icon" />,
}));

const mockParticipants = [
  {
    userId: 'user1',
    userName: 'John Doe',
    userAvatar: 'https://example.com/avatar1.jpg',
    isOnline: true,
    progress: {
      completedCells: 15,
      totalCells: 20,
      completionPercentage: 75,
      currentSection: 'Across',
      lastActivity: Date.now() - 1000,
      streak: 5,
      hintsUsed: 2,
      accuracy: 0.9
    },
    status: 'active' as const,
    achievements: [
      {
        id: 'achievement1',
        name: 'Speed Demon',
        icon: '⚡',
        timestamp: Date.now() - 5000
      }
    ]
  },
  {
    userId: 'user2',
    userName: 'Jane Smith',
    userAvatar: 'https://example.com/avatar2.jpg',
    isOnline: true,
    progress: {
      completedCells: 8,
      totalCells: 20,
      completionPercentage: 40,
      currentSection: 'Down',
      lastActivity: Date.now() - 2000,
      streak: 3,
      hintsUsed: 1,
      accuracy: 0.85
    },
    status: 'idle' as const,
    achievements: []
  },
  {
    userId: 'user3',
    userName: 'Bob Wilson',
    userAvatar: 'https://example.com/avatar3.jpg',
    isOnline: false,
    progress: {
      completedCells: 20,
      totalCells: 20,
      completionPercentage: 100,
      currentSection: 'Completed',
      lastActivity: Date.now() - 10000,
      streak: 10,
      hintsUsed: 0,
      accuracy: 1.0
    },
    status: 'completed' as const,
    achievements: [
      {
        id: 'achievement2',
        name: 'Perfect Score',
        icon: '🏆',
        timestamp: Date.now() - 3000
      }
    ]
  }
];

const defaultProps = {
  participants: mockParticipants,
  currentUserId: 'user1',
  isVisible: true,
  onParticipantClick: jest.fn()
};

describe('LiveProgressIndicators', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render when visible', () => {
    render(<LiveProgressIndicators {...defaultProps} />);
    
    expect(screen.getByText('Live Progress')).toBeInTheDocument();
    expect(screen.getByText('3 participants')).toBeInTheDocument();
  });

  it('should not render when not visible', () => {
    render(<LiveProgressIndicators {...defaultProps} isVisible={false} />);
    
    expect(screen.queryByText('Live Progress')).not.toBeInTheDocument();
  });

  it('should display participant information', () => {
    render(<LiveProgressIndicators {...defaultProps} />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
  });

  it('should display progress percentages', () => {
    render(<LiveProgressIndicators {...defaultProps} />);
    
    expect(screen.getByText('75.0%')).toBeInTheDocument();
    expect(screen.getByText('40.0%')).toBeInTheDocument();
    expect(screen.getByText('100.0%')).toBeInTheDocument();
  });

  it('should display status indicators', () => {
    render(<LiveProgressIndicators {...defaultProps} />);
    
    expect(screen.getByText('active')).toBeInTheDocument();
    expect(screen.getByText('idle')).toBeInTheDocument();
    expect(screen.getByText('completed')).toBeInTheDocument();
  });

  it('should display online/offline status', () => {
    render(<LiveProgressIndicators {...defaultProps} />);
    
    expect(screen.getAllByText('Online')).toHaveLength(2);
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  it('should display achievements when participant is expanded', async () => {
    const user = userEvent.setup();
    render(<LiveProgressIndicators {...defaultProps} />);
    
    // Click on Bob Wilson to expand his details
    const participant = screen.getByText('Bob Wilson');
    await user.click(participant);
    
    expect(screen.getByText('Perfect Score')).toBeInTheDocument();
  });

  it('should handle participant click', async () => {
    const user = userEvent.setup();
    const onParticipantClick = jest.fn();
    render(<LiveProgressIndicators {...defaultProps} onParticipantClick={onParticipantClick} />);
    
    const participant = screen.getByText('Jane Smith');
    await user.click(participant);
    
    expect(onParticipantClick).toHaveBeenCalledWith('user2');
  });

  it('should handle sort change', async () => {
    const user = userEvent.setup();
    render(<LiveProgressIndicators {...defaultProps} />);
    
    const sortButton = screen.getByRole('button', { name: /Progress/i });
    await user.click(sortButton);
    
    expect(screen.getByText('Activity')).toBeInTheDocument();
  });

  it('should display room summary', () => {
    render(<LiveProgressIndicators {...defaultProps} />);
    
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Avg Progress')).toBeInTheDocument();
  });

  it('should display participant details when expanded', async () => {
    const user = userEvent.setup();
    render(<LiveProgressIndicators {...defaultProps} />);
    
    // Click on a participant to expand their details
    const participant = screen.getByText('Bob Wilson');
    await user.click(participant);
    
    expect(screen.getByText('10 cells')).toBeInTheDocument();
    expect(screen.getByText('100.0%')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('should handle empty participants', () => {
    render(<LiveProgressIndicators {...defaultProps} participants={[]} />);
    
    expect(screen.getByText('0 participants')).toBeInTheDocument();
  });

  it('should display current user indicator', () => {
    render(<LiveProgressIndicators {...defaultProps} />);
    
    expect(screen.getByText('You')).toBeInTheDocument();
  });
});

describe('LiveProgressIndicatorsCompact', () => {
  it('should render compact version', () => {
    render(<LiveProgressIndicatorsCompact {...defaultProps} />);
    
    expect(screen.getByText('Live Progress')).toBeInTheDocument();
    expect(screen.getByText('1 active')).toBeInTheDocument();
    expect(screen.getByText('1 done')).toBeInTheDocument();
  });

  it('should display summary information', () => {
    render(<LiveProgressIndicatorsCompact {...defaultProps} />);
    
    expect(screen.getByText('1 active')).toBeInTheDocument();
    expect(screen.getByText('1 done')).toBeInTheDocument();
    expect(screen.getByText('72%')).toBeInTheDocument();
  });

  it('should display progress bars', () => {
    render(<LiveProgressIndicatorsCompact {...defaultProps} />);
    
    const progressBars = screen.getAllByRole('progressbar');
    expect(progressBars).toHaveLength(1);
  });
});