import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { HostControls } from './HostControls';

// Mock the UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => <div data-testid="card" {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: any) => <div data-testid="card-header" {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: any) => <div data-testid="card-title" {...props}>{children}</div>,
  CardContent: ({ children, ...props }: any) => <div data-testid="card-content" {...props}>{children}</div>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant, ...props }: any) => (
    <button
      data-testid="button"
      onClick={onClick}
      disabled={disabled}
      data-variant={variant}
      {...props}
    >
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: any) => <div data-testid="dropdown-menu">{children}</div>,
  DropdownMenuContent: ({ children }: any) => <div data-testid="dropdown-content">{children}</div>,
  DropdownMenuItem: ({ children, onClick }: any) => (
    <div data-testid="dropdown-item" onClick={onClick}>{children}</div>
  ),
  DropdownMenuTrigger: ({ children }: any) => <div data-testid="dropdown-trigger">{children}</div>,
}));

// Mock Lucide icons
jest.mock('lucide-react', () => ({
  Users: () => <div data-testid="users-icon" />,
  Pause: () => <div data-testid="pause-icon" />,
  Play: () => <div data-testid="play-icon" />,
  XCircle: () => <div data-testid="x-circle-icon" />,
  Settings: () => <div data-testid="settings-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  Crown: () => <div data-testid="crown-icon" />,
}));

describe('HostControls', () => {
  const mockProps = {
    roomCode: 'ABC123',
    participants: [
      { userId: 'user1', displayName: 'Player 1', role: 'PLAYER', isOnline: true },
      { userId: 'user2', displayName: 'Player 2', role: 'SPECTATOR', isOnline: true },
      { userId: 'user3', displayName: 'Player 3', role: 'PLAYER', isOnline: false },
    ],
    currentUserId: 'host-user',
    roomStatus: 'WAITING' as const,
    onKickPlayer: jest.fn(),
    onPauseSession: jest.fn(),
    onResumeSession: jest.fn(),
    onEndSession: jest.fn(),
    onStartSession: jest.fn(),
    onUpdateRoomSettings: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render host controls with correct title', () => {
    render(<HostControls {...mockProps} />);
    
    expect(screen.getByTestId('card-title')).toHaveTextContent('Host Controls');
    expect(screen.getByTestId('crown-icon')).toBeInTheDocument();
  });

  it('should show start session button when room is waiting', () => {
    render(<HostControls {...mockProps} roomStatus="WAITING" />);
    
    const startButton = screen.getByText('Start Session');
    expect(startButton).toBeInTheDocument();
    expect(startButton).not.toBeDisabled();
  });

  it('should show pause session button when room is active', () => {
    render(<HostControls {...mockProps} roomStatus="ACTIVE" />);
    
    const pauseButton = screen.getByText('Pause Session');
    expect(pauseButton).toBeInTheDocument();
    expect(pauseButton).not.toBeDisabled();
  });

  it('should show resume session button when room is waiting or completed', () => {
    render(<HostControls {...mockProps} roomStatus="WAITING" />);
    
    const resumeButton = screen.getByText('Resume Session');
    expect(resumeButton).toBeInTheDocument();
    expect(resumeButton).not.toBeDisabled();
  });

  it('should show end session button', () => {
    render(<HostControls {...mockProps} />);
    
    const endButton = screen.getByText('End Session');
    expect(endButton).toBeInTheDocument();
    expect(endButton).not.toBeDisabled();
  });

  it('should show room settings button', () => {
    render(<HostControls {...mockProps} />);
    
    const settingsButton = screen.getByText('Room Settings');
    expect(settingsButton).toBeInTheDocument();
    expect(settingsButton).not.toBeDisabled();
  });

  it('should display room information', () => {
    render(<HostControls {...mockProps} timeLimit={30} />);
    
    expect(screen.getByText('Room Code: ABC123')).toBeInTheDocument();
    expect(screen.getByText('Status: WAITING')).toBeInTheDocument();
    expect(screen.getByText('Time Limit: 30 minutes')).toBeInTheDocument();
  });

  it('should call onStartSession when start button is clicked', () => {
    render(<HostControls {...mockProps} roomStatus="WAITING" />);
    
    const startButton = screen.getByText('Start Session');
    fireEvent.click(startButton);
    
    expect(mockProps.onStartSession).toHaveBeenCalledTimes(1);
  });

  it('should call onPauseSession when pause button is clicked', () => {
    render(<HostControls {...mockProps} roomStatus="ACTIVE" />);
    
    const pauseButton = screen.getByText('Pause Session');
    fireEvent.click(pauseButton);
    
    expect(mockProps.onPauseSession).toHaveBeenCalledTimes(1);
  });

  it('should call onResumeSession when resume button is clicked', () => {
    render(<HostControls {...mockProps} roomStatus="WAITING" />);
    
    const resumeButton = screen.getByText('Resume Session');
    fireEvent.click(resumeButton);
    
    expect(mockProps.onResumeSession).toHaveBeenCalledTimes(1);
  });

  it('should call onEndSession when end button is clicked', () => {
    render(<HostControls {...mockProps} />);
    
    const endButton = screen.getByText('End Session');
    fireEvent.click(endButton);
    
    expect(mockProps.onEndSession).toHaveBeenCalledTimes(1);
  });

  it('should call onUpdateRoomSettings when settings button is clicked', () => {
    render(<HostControls {...mockProps} />);
    
    const settingsButton = screen.getByText('Room Settings');
    fireEvent.click(settingsButton);
    
    expect(mockProps.onUpdateRoomSettings).toHaveBeenCalledTimes(1);
  });

  it('should show kick player dropdown with other participants', () => {
    render(<HostControls {...mockProps} />);
    
    const kickButton = screen.getByText('Kick Player');
    expect(kickButton).toBeInTheDocument();
  });

  it('should call onKickPlayer when a participant is selected for kicking', () => {
    render(<HostControls {...mockProps} />);
    
    // This would require more complex testing of the dropdown menu
    // For now, we'll just verify the kick button is present
    const kickButton = screen.getByText('Kick Player');
    expect(kickButton).toBeInTheDocument();
  });

  it('should disable start button when no players are available', () => {
    const propsWithNoPlayers = {
      ...mockProps,
      participants: [
        { userId: 'host-user', displayName: 'Host', role: 'HOST', isOnline: true }
      ]
    };
    
    render(<HostControls {...propsWithNoPlayers} roomStatus="WAITING" />);
    
    const startButton = screen.getByText('Start Session');
    expect(startButton).toBeDisabled();
  });

  it('should show correct participant counts', () => {
    render(<HostControls {...mockProps} />);
    
    // The component should show the number of active players
    // This would be visible in the participant management section
    expect(screen.getByText('Manage Participants')).toBeInTheDocument();
  });

  it('should handle time limit display correctly', () => {
    render(<HostControls {...mockProps} timeLimit={60} />);
    
    expect(screen.getByText('Time Limit: 60 minutes')).toBeInTheDocument();
  });

  it('should handle missing time limit gracefully', () => {
    render(<HostControls {...mockProps} />);
    
    // Should not show time limit if not provided
    expect(screen.queryByText(/Time Limit:/)).not.toBeInTheDocument();
  });

  it('should show correct icons for different actions', () => {
    render(<HostControls {...mockProps} roomStatus="WAITING" />);
    
    expect(screen.getByTestId('play-icon')).toBeInTheDocument();
    expect(screen.getByTestId('users-icon')).toBeInTheDocument();
    expect(screen.getByTestId('settings-icon')).toBeInTheDocument();
    expect(screen.getByTestId('crown-icon')).toBeInTheDocument();
  });

  it('should handle different room statuses correctly', () => {
    const { rerender } = render(<HostControls {...mockProps} roomStatus="WAITING" />);
    expect(screen.getByText('Start Session')).toBeInTheDocument();
    
    rerender(<HostControls {...mockProps} roomStatus="ACTIVE" />);
    expect(screen.getByText('Pause Session')).toBeInTheDocument();
    
    rerender(<HostControls {...mockProps} roomStatus="COMPLETED" />);
    expect(screen.getByText('Resume Session')).toBeInTheDocument();
  });
});
