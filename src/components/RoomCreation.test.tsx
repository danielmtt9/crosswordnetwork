import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import CreateRoomPage from '@/app/multiplayer/new/page';

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

// Mock the puzzles API response
const mockPuzzles = [
  { id: 'puzzle-1', title: 'Test Puzzle 1', difficulty: 'Easy' },
  { id: 'puzzle-2', title: 'Test Puzzle 2', difficulty: 'Medium' },
];

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('Room Creation Interface', () => {
  const mockPush = jest.fn();
  const mockSession = {
    user: {
      id: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
    },
    userId: 'user-1',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue({
      push: mockPush,
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
    });
    
    // Mock the puzzles API call that happens on component mount
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockPuzzles,
    } as Response);
  });

  describe('3.1 One-click room creation for authenticated users', () => {
    it('should redirect authenticated users to room creation page', async () => {
      mockUseSession.mockReturnValue({ data: mockSession, status: 'authenticated' });

      render(<CreateRoomPage />);

      // Wait for the component to load and render
      await waitFor(() => {
        expect(screen.getByText(/create.*new.*room/i)).toBeInTheDocument();
      });
    });

    it('should show premium features for premium users', async () => {
      mockUseSession.mockReturnValue({ 
        data: { 
          ...mockSession, 
          user: { ...mockSession.user, role: 'PREMIUM' } 
        }, 
        status: 'authenticated' 
      });

      render(<CreateRoomPage />);

      // Wait for component to load and check for premium features
      await waitFor(() => {
        expect(screen.getByText(/room.*settings/i)).toBeInTheDocument();
      });
    });
  });

  describe('3.2 Unique 6-character room code generation', () => {
    it('should generate unique room codes when creating rooms', async () => {
      mockUseSession.mockReturnValue({ data: mockSession, status: 'authenticated' });
      
      const mockRoomResponse = {
        roomCode: 'ABC123',
        id: 'room-1',
        name: 'Test Room',
      };

      // Mock the room creation API call
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRoomResponse,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 'room-1' }),
        } as Response);

      render(<CreateRoomPage />);

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByText(/room.*settings/i)).toBeInTheDocument();
      });

      // Find and click create room button
      const createButton = screen.getByRole('button', { name: /create.*room/i });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/multiplayer/rooms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('puzzleId'),
        });
      });

      // Should redirect to the room with the generated code
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/room/ABC123');
      });
    });

    it('should handle room creation errors gracefully', async () => {
      mockUseSession.mockReturnValue({ data: mockSession, status: 'authenticated' });
      
      // Mock the room creation API call to fail
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Failed to create room' }),
      } as Response);

      // Mock window.alert
      const mockAlert = jest.spyOn(window, 'alert').mockImplementation(() => {});

      render(<CreateRoomPage />);

      // Wait for component to load
      await waitFor(() => {
        expect(screen.getByText(/room.*settings/i)).toBeInTheDocument();
      });

      const createButton = screen.getByRole('button', { name: /create.*room/i });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith('Failed to create room');
      });

      mockAlert.mockRestore();
    });
  });

  describe('3.3 Room code validation for joining', () => {
    it('should validate room code format in HeroSection', () => {
      mockUseSession.mockReturnValue({ data: null, status: 'unauthenticated' });

      // Import HeroSection for this test
      const HeroSection = require('@/components/HeroSection').default;
      render(<HeroSection />);

      const input = screen.getByPlaceholderText('Enter 6-letter code');
      const joinButton = screen.getByRole('button', { name: /join/i });

      // Test with invalid length
      fireEvent.change(input, { target: { value: 'ABC12' } });
      expect(joinButton).toBeDisabled();

      // Test with valid length
      fireEvent.change(input, { target: { value: 'ABC123' } });
      expect(joinButton).not.toBeDisabled();
    });

    it('should handle room code validation errors', async () => {
      mockUseSession.mockReturnValue({ data: null, status: 'unauthenticated' });

      const HeroSection = require('@/components/HeroSection').default;
      render(<HeroSection />);

      const input = screen.getByPlaceholderText('Enter 6-letter code');
      
      // Mock window.alert
      const mockAlert = jest.spyOn(window, 'alert').mockImplementation(() => {});

      // Test with invalid length and Enter key
      fireEvent.change(input, { target: { value: 'ABC12' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith('Room code must be 6 characters long');
      });

      mockAlert.mockRestore();
    });
  });

  describe('3.4 User redirection based on authentication status', () => {
    it('should redirect unauthenticated users to signup', () => {
      mockUseSession.mockReturnValue({ data: null, status: 'unauthenticated' });

      const HeroSection = require('@/components/HeroSection').default;
      render(<HeroSection />);

      const startRoomButton = screen.getByRole('button', { name: /start.*room/i });
      fireEvent.click(startRoomButton);

      expect(mockPush).toHaveBeenCalledWith('/signup?redirect=/multiplayer/new');
    });

    it('should redirect authenticated users to room creation', () => {
      mockUseSession.mockReturnValue({ data: mockSession, status: 'authenticated' });

      const HeroSection = require('@/components/HeroSection').default;
      render(<HeroSection />);

      const startRoomButton = screen.getByRole('button', { name: /start.*room/i });
      fireEvent.click(startRoomButton);

      expect(mockPush).toHaveBeenCalledWith('/multiplayer/new');
    });
  });

  describe('3.5 Clear error messages for invalid room codes', () => {
    it('should show clear error messages for invalid room codes', async () => {
      mockUseSession.mockReturnValue({ data: null, status: 'unauthenticated' });

      const HeroSection = require('@/components/HeroSection').default;
      render(<HeroSection />);

      const input = screen.getByPlaceholderText('Enter 6-letter code');
      
      // Mock window.alert
      const mockAlert = jest.spyOn(window, 'alert').mockImplementation(() => {});

      // Test various invalid inputs
      fireEvent.change(input, { target: { value: 'ABC' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith('Room code must be 6 characters long');
      });

      mockAlert.mockRestore();
    });
  });

  describe('3.6 Room creation success with shareable link', () => {
    it('should provide shareable room links after creation', async () => {
      mockUseSession.mockReturnValue({ data: mockSession, status: 'authenticated' });
      
      const mockRoomResponse = {
        roomCode: 'XYZ789',
        id: 'room-2',
        name: 'Shareable Room',
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRoomResponse,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 'room-2' }),
        } as Response);

      render(<CreateRoomPage />);

      const createButton = screen.getByRole('button', { name: /create.*room/i });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/room/XYZ789');
      });
    });

    it('should handle room verification failures', async () => {
      mockUseSession.mockReturnValue({ data: mockSession, status: 'authenticated' });
      
      const mockRoomResponse = {
        roomCode: 'FAIL123',
        id: 'room-3',
        name: 'Failed Room',
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockRoomResponse,
        } as Response)
        .mockResolvedValue({
          ok: false,
          json: async () => ({ error: 'Room not found' }),
        } as Response);

      // Mock window.alert
      const mockAlert = jest.spyOn(window, 'alert').mockImplementation(() => {});

      render(<CreateRoomPage />);

      const createButton = screen.getByRole('button', { name: /create.*room/i });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith('Room creation verification failed');
      });

      mockAlert.mockRestore();
    });
  });

  describe('Accessibility and UX', () => {
    it('should have proper form labels and accessibility attributes', () => {
      mockUseSession.mockReturnValue({ data: mockSession, status: 'authenticated' });

      render(<CreateRoomPage />);

      // Check for proper form structure
      const roomNameInput = screen.getByLabelText(/room.*name/i);
      expect(roomNameInput).toBeInTheDocument();

      const maxPlayersInput = screen.getByLabelText(/max.*players/i);
      expect(maxPlayersInput).toBeInTheDocument();
    });

    it('should show loading states during room creation', async () => {
      mockUseSession.mockReturnValue({ data: mockSession, status: 'authenticated' });

      // Mock a slow response
      mockFetch.mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            json: async () => ({ roomCode: 'SLOW123', id: 'room-slow' }),
          } as Response), 100)
        )
      );

      render(<CreateRoomPage />);

      const createButton = screen.getByRole('button', { name: /create.*room/i });
      fireEvent.click(createButton);

      // Should show loading state (button should be disabled or show loading text)
      expect(createButton).toBeDisabled();
    });
  });
});
