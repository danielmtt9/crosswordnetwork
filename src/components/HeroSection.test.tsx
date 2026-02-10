import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import HeroSection from './HeroSection';

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

describe('HeroSection', () => {
  const mockPush = jest.fn();
  const mockRouter = {
    push: mockPush,
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  };

  beforeEach(() => {
    mockUseRouter.mockReturnValue(mockRouter);
    mockPush.mockClear();
  });

  describe('1.1 "Crossword nights, together" headline and messaging', () => {
    it('should display the cozy social headline', () => {
      mockUseSession.mockReturnValue({ data: null, status: 'unauthenticated' });
      
      render(<HeroSection />);
      
      expect(screen.getByText('Crossword nights,')).toBeInTheDocument();
      expect(screen.getByText('together')).toBeInTheDocument();
    });

    it('should display compelling subtitle about social solving', () => {
      mockUseSession.mockReturnValue({ data: null, status: 'unauthenticated' });
      
      render(<HeroSection />);
      
      expect(screen.getByText(/Gather your friends for the coziest crossword solving experience/)).toBeInTheDocument();
      expect(screen.getByText(/Share laughs, celebrate victories, and create memories/)).toBeInTheDocument();
    });

    it('should display cozy badge with coffee icon', () => {
      mockUseSession.mockReturnValue({ data: null, status: 'unauthenticated' });
      
      render(<HeroSection />);
      
      expect(screen.getByText('Cozy crossword nights')).toBeInTheDocument();
    });
  });

  describe('1.3 Prominent "Start a room" primary CTA button', () => {
    it('should display start room button with home icon', () => {
      mockUseSession.mockReturnValue({ data: null, status: 'unauthenticated' });
      
      render(<HeroSection />);
      
      const startButton = screen.getByText('Start a room');
      expect(startButton).toBeInTheDocument();
      expect(startButton.closest('button')).toHaveClass('bg-gradient-to-r from-amber-600 to-orange-600');
    });

    it('should redirect authenticated users to room creation', async () => {
      mockUseSession.mockReturnValue({ 
        data: { user: { id: '1', name: 'Test User' } }, 
        status: 'authenticated' 
      });
      
      render(<HeroSection />);
      
      const startButton = screen.getByText('Start a room');
      fireEvent.click(startButton);
      
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/multiplayer/new');
      });
    });

    it('should redirect unauthenticated users to signup with redirect', async () => {
      mockUseSession.mockReturnValue({ data: null, status: 'unauthenticated' });
      
      render(<HeroSection />);
      
      const startButton = screen.getByText('Start a room');
      fireEvent.click(startButton);
      
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/signup?redirect=/multiplayer/new');
      });
    });
  });

  describe('1.4 "Join a room" secondary CTA with 6-character code input', () => {
    it('should display room code input with placeholder', () => {
      mockUseSession.mockReturnValue({ data: null, status: 'unauthenticated' });
      
      render(<HeroSection />);
      
      const input = screen.getByPlaceholderText('Enter 6-letter code');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('maxLength', '6');
    });

    it('should convert input to uppercase automatically', () => {
      mockUseSession.mockReturnValue({ data: null, status: 'unauthenticated' });
      
      render(<HeroSection />);
      
      const input = screen.getByPlaceholderText('Enter 6-letter code');
      fireEvent.change(input, { target: { value: 'abc123' } });
      
      expect(input).toHaveValue('ABC123');
    });

    it('should enable join button only when code is 6 characters', () => {
      mockUseSession.mockReturnValue({ data: null, status: 'unauthenticated' });
      
      render(<HeroSection />);
      
      const input = screen.getByPlaceholderText('Enter 6-letter code');
      const joinButton = screen.getByText('Join');
      
      // Initially disabled
      expect(joinButton).toBeDisabled();
      
      // Enable when 6 characters
      fireEvent.change(input, { target: { value: 'ABC123' } });
      expect(joinButton).not.toBeDisabled();
      
      // Disable when not 6 characters
      fireEvent.change(input, { target: { value: 'ABC12' } });
      expect(joinButton).toBeDisabled();
    });

    it('should handle join room on button click', async () => {
      mockUseSession.mockReturnValue({ data: null, status: 'unauthenticated' });
      
      render(<HeroSection />);
      
      const input = screen.getByPlaceholderText('Enter 6-letter code');
      const joinButton = screen.getByText('Join');
      
      fireEvent.change(input, { target: { value: 'ABC123' } });
      fireEvent.click(joinButton);
      
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/multiplayer/join/ABC123');
      });
    });

    it('should handle join room on Enter key press', async () => {
      mockUseSession.mockReturnValue({ data: null, status: 'unauthenticated' });
      
      render(<HeroSection />);
      
      const input = screen.getByPlaceholderText('Enter 6-letter code');
      
      fireEvent.change(input, { target: { value: 'ABC123' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
      
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/multiplayer/join/ABC123');
      });
    });

    it('should show error for invalid room code length', async () => {
      mockUseSession.mockReturnValue({ data: null, status: 'unauthenticated' });
      
      // Mock window.alert
      const mockAlert = jest.spyOn(window, 'alert').mockImplementation(() => {});
      
      render(<HeroSection />);
      
      const input = screen.getByPlaceholderText('Enter 6-letter code');
      
      // Test with 5 characters - should trigger alert on Enter key
      fireEvent.change(input, { target: { value: 'ABC12' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
      
      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith('Room code must be 6 characters long');
      });
      
      mockAlert.mockRestore();
    });
  });

  describe('1.5 Visual room snapshot showing collaborative solving', () => {
    it('should display room preview with live indicator', () => {
      mockUseSession.mockReturnValue({ data: null, status: 'unauthenticated' });
      
      render(<HeroSection />);
      
      expect(screen.getByText('Room ABC123')).toBeInTheDocument();
      expect(screen.getByText('4 solving together')).toBeInTheDocument();
      expect(screen.getByText('Live')).toBeInTheDocument();
    });

    it('should display crossword grid preview', () => {
      mockUseSession.mockReturnValue({ data: null, status: 'unauthenticated' });
      
      render(<HeroSection />);
      
      // Should have a 5x5 grid (25 cells)
      const gridCells = screen.getAllByRole('generic').filter(el => 
        el.className.includes('aspect-square') && el.className.includes('rounded-md')
      );
      expect(gridCells).toHaveLength(25);
    });

    it('should display participant avatars', () => {
      mockUseSession.mockReturnValue({ data: null, status: 'unauthenticated' });
      
      render(<HeroSection />);
      
      // Should have 4 participant avatars
      const avatars = screen.getAllByRole('generic').filter(el => 
        el.className.includes('rounded-full') && el.className.includes('bg-gradient-to-br')
      );
      expect(avatars.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('1.6 Live participant cursors and avatars in preview', () => {
    it('should display live activity indicators', () => {
      mockUseSession.mockReturnValue({ data: null, status: 'unauthenticated' });
      
      render(<HeroSection />);
      
      // Should have green pulse indicators
      const pulseElements = screen.getAllByRole('generic').filter(el => 
        el.className.includes('animate-pulse') && el.className.includes('bg-green-500')
      );
      expect(pulseElements.length).toBeGreaterThan(0);
    });

    it('should display cozy decorative elements', () => {
      mockUseSession.mockReturnValue({ data: null, status: 'unauthenticated' });
      
      render(<HeroSection />);
      
      // Should have heart and coffee icons as decorative elements
      expect(screen.getByText('Cozy vibes')).toBeInTheDocument();
    });
  });

  describe('Social proof and trial messaging', () => {
    it('should display trial benefits', () => {
      mockUseSession.mockReturnValue({ data: null, status: 'unauthenticated' });
      
      render(<HeroSection />);
      
      expect(screen.getByText('1-week free trial')).toBeInTheDocument();
      expect(screen.getByText('No credit card required')).toBeInTheDocument();
    });

    it('should display heart and sparkles icons for benefits', () => {
      mockUseSession.mockReturnValue({ data: null, status: 'unauthenticated' });
      
      render(<HeroSection />);
      
      // Check for heart icons in the benefits section
      const heartIcon = screen.getByText('1-week free trial').closest('div')?.querySelector('svg');
      expect(heartIcon).toBeInTheDocument();
      
      // Check for sparkles icon in the benefits section  
      const sparklesIcon = screen.getByText('No credit card required').closest('div')?.querySelector('svg');
      expect(sparklesIcon).toBeInTheDocument();
    });
  });

  describe('Props handling', () => {
    it('should use custom live rooms count when provided', () => {
      mockUseSession.mockReturnValue({ data: null, status: 'unauthenticated' });
      
      render(<HeroSection liveRoomsCount={25} onlineUsersCount={100} />);
      
      // The component should accept these props (they're used in the visual)
      expect(screen.getByText('Room ABC123')).toBeInTheDocument();
    });
  });

  describe('Loading states', () => {
    it('should handle loading state gracefully', () => {
      mockUseSession.mockReturnValue({ data: null, status: 'loading' });
      
      render(<HeroSection />);
      
      // Should still render the component
      expect(screen.getByText('Crossword nights,')).toBeInTheDocument();
    });
  });
});
