import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RoomBrowser, RoomInfo } from './RoomBrowser';

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

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: any) => (
    <span className={`badge ${variant} ${className}`}>{children}</span>
  ),
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <select value={value} onChange={(e) => onValueChange(e.target.value)}>
      {children}
    </select>
  ),
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
}));

jest.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ checked, onCheckedChange, id }: any) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange(e.target.checked)}
      id={id}
    />
  ),
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <div>{children}</div>,
}));

// Mock icons
jest.mock('lucide-react', () => ({
  Search: () => <span>Search</span>,
  Users: () => <span>Users</span>,
  Clock: () => <span>Clock</span>,
  Lock: () => <span>Lock</span>,
  Unlock: () => <span>Unlock</span>,
  Crown: () => <span>Crown</span>,
  Eye: () => <span>Eye</span>,
  Play: () => <span>Play</span>,
  Pause: () => <span>Pause</span>,
  CheckCircle: () => <span>CheckCircle</span>,
  XCircle: () => <span>XCircle</span>,
  Filter: () => <span>Filter</span>,
  RefreshCw: () => <span>RefreshCw</span>,
  Copy: () => <span>Copy</span>,
  Share2: () => <span>Share2</span>,
  Star: () => <span>Star</span>,
  TrendingUp: () => <span>TrendingUp</span>,
}));

// Mock fetch
global.fetch = jest.fn();

const mockRooms: RoomInfo[] = [
  {
    id: '1',
    roomCode: 'ABC123',
    name: 'Test Room 1',
    description: 'A test room',
    hostName: 'Alice',
    hostAvatar: 'avatar1.jpg',
    puzzleTitle: 'Test Puzzle 1',
    puzzleDifficulty: 'EASY',
    participantCount: 2,
    maxPlayers: 4,
    spectatorCount: 1,
    allowSpectators: true,
    isPrivate: false,
    hasPassword: false,
    status: 'WAITING',
    timeLimit: 30,
    tags: ['test', 'easy'],
    createdAt: '2023-01-01T10:00:00Z',
    averageRating: 4.5,
    totalPlays: 10,
  },
  {
    id: '2',
    roomCode: 'DEF456',
    name: 'Test Room 2',
    description: 'Another test room',
    hostName: 'Bob',
    hostAvatar: 'avatar2.jpg',
    puzzleTitle: 'Test Puzzle 2',
    puzzleDifficulty: 'HARD',
    participantCount: 3,
    maxPlayers: 4,
    spectatorCount: 0,
    allowSpectators: false,
    isPrivate: true,
    hasPassword: true,
    status: 'ACTIVE',
    timeLimit: 60,
    tags: ['test', 'hard'],
    createdAt: '2023-01-01T11:00:00Z',
    averageRating: 3.8,
    totalPlays: 5,
  },
];

describe('RoomBrowser', () => {
  const defaultProps = {
    onJoinRoom: jest.fn(),
    onRefresh: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        rooms: mockRooms,
        total: mockRooms.length,
        page: 1,
        limit: 20,
        totalPages: 1,
      }),
    });
  });

  it('renders room browser correctly', async () => {
    render(<RoomBrowser {...defaultProps} />);
    
    expect(screen.getByText('Browse Rooms')).toBeInTheDocument();
    expect(screen.getByText('Find and join multiplayer crossword rooms')).toBeInTheDocument();
    
    // Wait for rooms to load
    await waitFor(() => {
      expect(screen.getByText('Test Room 1')).toBeInTheDocument();
      expect(screen.getByText('Test Room 2')).toBeInTheDocument();
    });
  });

  it('displays room information correctly', async () => {
    render(<RoomBrowser {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Room 1')).toBeInTheDocument();
      expect(screen.getByText('A test room')).toBeInTheDocument();
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Test Puzzle 1')).toBeInTheDocument();
    });
  });

  it('handles search functionality', async () => {
    render(<RoomBrowser {...defaultProps} />);
    
    const searchInput = screen.getByPlaceholderText(/search rooms/i);
    fireEvent.change(searchInput, { target: { value: 'Test Room 1' } });
    
    // The search is handled by the parent component, so we just verify the input works
    expect(searchInput).toHaveValue('Test Room 1');
  });

  it('handles filter changes', async () => {
    render(<RoomBrowser {...defaultProps} />);
    
    // Test status filter
    const statusFilter = screen.getByDisplayValue('All Status');
    fireEvent.change(statusFilter, { target: { value: 'WAITING' } });
    
    // Test difficulty filter
    const difficultyFilter = screen.getByDisplayValue('All Difficulties');
    fireEvent.change(difficultyFilter, { target: { value: 'EASY' } });
    
    // Test privacy filter
    const privacyFilter = screen.getByDisplayValue('All Rooms');
    fireEvent.change(privacyFilter, { target: { value: 'public' } });
    
    // Test sort filter
    const sortFilter = screen.getByDisplayValue('Recently Created');
    fireEvent.change(sortFilter, { target: { value: 'participants' } });
  });

  it('handles checkbox filters', async () => {
    render(<RoomBrowser {...defaultProps} />);
    
    const joinableCheckbox = screen.getByLabelText('Only joinable rooms');
    const hasSpaceCheckbox = screen.getByLabelText('Only rooms with space');
    
    fireEvent.click(joinableCheckbox);
    fireEvent.click(hasSpaceCheckbox);
    
    expect(joinableCheckbox).toBeChecked();
    expect(hasSpaceCheckbox).toBeChecked();
  });

  it('handles room join', async () => {
    render(<RoomBrowser {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Room 1')).toBeInTheDocument();
    });
    
    const joinButtons = screen.getAllByText('Join');
    fireEvent.click(joinButtons[0]);
    
    expect(defaultProps.onJoinRoom).toHaveBeenCalledWith('ABC123');
  });

  it('handles room join with password', async () => {
    // Mock window.prompt
    const mockPrompt = jest.spyOn(window, 'prompt').mockReturnValue('password123');
    
    render(<RoomBrowser {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Room 2')).toBeInTheDocument();
    });
    
    const joinButtons = screen.getAllByText('Join');
    fireEvent.click(joinButtons[1]);
    
    expect(mockPrompt).toHaveBeenCalledWith('Enter password for room "Test Room 2":');
    expect(defaultProps.onJoinRoom).toHaveBeenCalledWith('DEF456', 'password123');
    
    mockPrompt.mockRestore();
  });

  it('handles room sharing', async () => {
    // Mock navigator.share and clipboard
    const mockShare = jest.fn().mockResolvedValue(undefined);
    const mockWriteText = jest.fn().mockResolvedValue(undefined);
    
    Object.defineProperty(navigator, 'share', {
      value: mockShare,
      writable: true,
    });
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockWriteText },
      writable: true,
    });
    
    render(<RoomBrowser {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Room 1')).toBeInTheDocument();
    });
    
    const shareButtons = screen.getAllByText('Share');
    fireEvent.click(shareButtons[0]);
    
    expect(mockShare).toHaveBeenCalledWith({
      title: 'Join Test Room 1',
      text: 'Join me in solving "Test Puzzle 1"!',
      url: expect.stringContaining('/room/ABC123'),
    });
  });

  it('handles refresh', async () => {
    render(<RoomBrowser {...defaultProps} />);
    
    const refreshButton = screen.getByText('Refresh');
    fireEvent.click(refreshButton);
    
    expect(defaultProps.onRefresh).toHaveBeenCalled();
  });

  it('handles create room navigation', async () => {
    render(<RoomBrowser {...defaultProps} />);
    
    const createButton = screen.getByText('Create Room');
    fireEvent.click(createButton);
    
    expect(mockPush).toHaveBeenCalledWith('/multiplayer/create');
  });

  it('handles clear filters', async () => {
    render(<RoomBrowser {...defaultProps} />);
    
    const clearFiltersButton = screen.getByText('Clear Filters');
    fireEvent.click(clearFiltersButton);
    
    // Verify filters are reset
    const searchInput = screen.getByPlaceholderText(/search rooms/i);
    expect(searchInput).toHaveValue('');
  });

  it('displays loading state', () => {
    (fetch as jest.Mock).mockImplementation(() => new Promise(() => {})); // Never resolves
    
    render(<RoomBrowser {...defaultProps} />);
    
    expect(screen.getByText('Loading rooms...')).toBeInTheDocument();
  });

  it('displays error state', async () => {
    (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
    
    render(<RoomBrowser {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });
  });

  it('displays no rooms found state', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        rooms: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      }),
    });
    
    render(<RoomBrowser {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('No rooms found matching your criteria')).toBeInTheDocument();
    });
  });

  it('disables join button for full rooms', async () => {
    const fullRoom: RoomInfo = {
      ...mockRooms[0],
      participantCount: 4,
      maxPlayers: 4,
    };
    
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        rooms: [fullRoom],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      }),
    });
    
    render(<RoomBrowser {...defaultProps} />);
    
    await waitFor(() => {
      const joinButton = screen.getByText('Join');
      expect(joinButton).toBeDisabled();
    });
  });

  it('disables join button for non-waiting rooms', async () => {
    const activeRoom: RoomInfo = {
      ...mockRooms[0],
      status: 'ACTIVE',
    };
    
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        rooms: [activeRoom],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      }),
    });
    
    render(<RoomBrowser {...defaultProps} />);
    
    await waitFor(() => {
      const joinButton = screen.getByText('Join');
      expect(joinButton).toBeDisabled();
    });
  });
});
