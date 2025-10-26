import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import TrialMessaging from './TrialMessaging';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, whileInView, initial, transition, viewport, animate, exit, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Heart: () => <div data-testid="heart-icon">Heart</div>,
  Sparkles: () => <div data-testid="sparkles-icon">Sparkles</div>,
  Clock: () => <div data-testid="clock-icon">Clock</div>,
  CheckCircle: () => <div data-testid="check-circle-icon">CheckCircle</div>,
  ArrowRight: () => <div data-testid="arrow-right-icon">ArrowRight</div>,
  Gift: () => <div data-testid="gift-icon">Gift</div>,
  Coffee: () => <div data-testid="coffee-icon">Coffee</div>,
  Star: () => <div data-testid="star-icon">Star</div>,
  Users: () => <div data-testid="users-icon">Users</div>,
}));

// Mock UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => <div data-testid="card" {...props}>{children}</div>,
  CardContent: ({ children, ...props }: any) => <div data-testid="card-content" {...props}>{children}</div>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, asChild, ...props }: any) => {
    if (asChild) {
      return <div data-testid="button" {...props}>{children}</div>;
    }
    return <button data-testid="button" {...props}>{children}</button>;
  },
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }: any) => <span data-testid="badge" {...props}>{children}</span>,
}));

// Mock Next.js Link
jest.mock('next/link', () => {
  return ({ children, href, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  );
});

describe('TrialMessaging', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('6.1 Add subtle trial messaging: "1-week free trial • no card required"', () => {
    it('should display trial messaging for new users', () => {
      render(<TrialMessaging />);

      expect(screen.getByText('Start your cozy crossword journey')).toBeInTheDocument();
      expect(screen.getByText(/experience premium crosswords.*1-week free trial/i)).toBeInTheDocument();
      expect(screen.getByText('1-week free trial')).toBeInTheDocument();
      expect(screen.getByText('No credit card required')).toBeInTheDocument();
      expect(screen.getByText('Cancel anytime')).toBeInTheDocument();
    });

    it('should display trial messaging for users with active trial', () => {
      render(<TrialMessaging hasActiveTrial={true} />);

      expect(screen.getByText('Enjoying your trial?')).toBeInTheDocument();
      expect(screen.getByText(/you're experiencing the full premium crossword experience/i)).toBeInTheDocument();
    });

    it('should show trial benefits', () => {
      render(<TrialMessaging />);

      expect(screen.getByText('Cozy Experience')).toBeInTheDocument();
      expect(screen.getByText('Ad-free solving with warm, inviting design')).toBeInTheDocument();
      expect(screen.getByText('Social Solving')).toBeInTheDocument();
      expect(screen.getByText('Create rooms and solve with friends')).toBeInTheDocument();
      expect(screen.getByText('Unlimited Hints')).toBeInTheDocument();
      expect(screen.getByText('Get help when you need it most')).toBeInTheDocument();
    });
  });

  describe('6.2 Remove prominent pricing information from landing page', () => {
    it('should not display pricing information', () => {
      render(<TrialMessaging />);

      // Should not show any pricing-related text
      expect(screen.queryByText(/\$/)).not.toBeInTheDocument();
      expect(screen.queryByText(/price/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/cost/i)).not.toBeInTheDocument();
    });

    it('should focus on trial benefits instead of pricing', () => {
      render(<TrialMessaging />);

      expect(screen.getByText('Free Trial')).toBeInTheDocument();
      expect(screen.getByText('1-week free trial')).toBeInTheDocument();
      expect(screen.getByText('No credit card required')).toBeInTheDocument();
    });
  });

  describe('6.3 Create easy access to full pricing via navigation or footer', () => {
    it('should provide signup link for new users', () => {
      render(<TrialMessaging />);

      const signupLink = screen.getByText('Start Free Trial');
      expect(signupLink.closest('a')).toHaveAttribute('href', '/signup');
    });

    it('should provide upgrade link for trial users', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1); // 1 day from now

      render(<TrialMessaging hasActiveTrial={true} trialExpiresAt={futureDate} />);

      // Wait for countdown to appear
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        const upgradeLink = screen.getByText('Continue Premium');
        expect(upgradeLink.closest('a')).toHaveAttribute('href', '/upgrade');
      });
    });
  });

  describe('6.4 Implement trial countdown for users who have started trials', () => {
    it('should display countdown when trial is active', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 3); // 3 days from now

      render(<TrialMessaging hasActiveTrial={true} trialExpiresAt={futureDate} />);

      // Wait for countdown to appear
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(screen.getByText('Trial time remaining')).toBeInTheDocument();
        expect(screen.getByText('days')).toBeInTheDocument();
        expect(screen.getByText('hours')).toBeInTheDocument();
        expect(screen.getByText('minutes')).toBeInTheDocument();
      });
    });

    it('should not display countdown when showCountdown is false', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 3);

      render(<TrialMessaging hasActiveTrial={true} trialExpiresAt={futureDate} showCountdown={false} />);

      expect(screen.queryByText('Trial time remaining')).not.toBeInTheDocument();
    });

    it('should update countdown every minute', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5); // 5 days from now (definitely not expiring soon)

      render(<TrialMessaging hasActiveTrial={true} trialExpiresAt={futureDate} />);

      // Wait for initial countdown
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(screen.getByText('Trial time remaining')).toBeInTheDocument();
      });

      // Advance time by 1 minute
      act(() => {
        jest.advanceTimersByTime(60000);
      });

      // Countdown should still be visible (content may have updated)
      expect(screen.getByText('Trial time remaining')).toBeInTheDocument();
    });
  });

  describe('6.5 Add upgrade prompts for trial users approaching expiration', () => {
    it('should show urgent styling when trial expires soon', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1); // 1 day from now

      render(<TrialMessaging hasActiveTrial={true} trialExpiresAt={futureDate} />);

      // Wait for countdown to appear
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(screen.getByText('Trial ending soon!')).toBeInTheDocument();
        expect(screen.getByText('Continue Premium')).toBeInTheDocument();
      });
    });

    it('should show normal styling when trial has time remaining', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5); // 5 days from now

      render(<TrialMessaging hasActiveTrial={true} trialExpiresAt={futureDate} />);

      // Wait for countdown to appear
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(screen.getByText('Trial time remaining')).toBeInTheDocument();
        expect(screen.queryByText('Trial ending soon!')).not.toBeInTheDocument();
      });
    });

    it('should show upgrade button only when trial expires soon', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1); // 1 day from now

      render(<TrialMessaging hasActiveTrial={true} trialExpiresAt={futureDate} />);

      // Wait for countdown to appear
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(screen.getByText('Continue Premium')).toBeInTheDocument();
      });
    });
  });

  describe('6.6 Create consistent messaging across all trial touchpoints', () => {
    it('should display consistent trial messaging in footer', () => {
      render(<TrialMessaging />);

      expect(screen.getByText('1-week free trial • Cancel anytime • No credit card required')).toBeInTheDocument();
    });

    it('should show consistent benefits across all sections', () => {
      render(<TrialMessaging />);

      // Main section benefits
      expect(screen.getByText('1-week free trial')).toBeInTheDocument();
      expect(screen.getByText('No credit card required')).toBeInTheDocument();
      expect(screen.getByText('Cancel anytime')).toBeInTheDocument();

      // Footer benefits
      expect(screen.getByText('1-week free trial • Cancel anytime • No credit card required')).toBeInTheDocument();
    });

    it('should maintain consistent styling and branding', () => {
      render(<TrialMessaging />);

      expect(screen.getByText('Free Trial')).toBeInTheDocument();
      expect(screen.getByTestId('gift-icon')).toBeInTheDocument();
      expect(screen.getByTestId('heart-icon')).toBeInTheDocument();
    });
  });

  describe('6.7 Build comprehensive unit tests for trial messaging features', () => {
    it('should handle custom trial days remaining', () => {
      render(<TrialMessaging hasActiveTrial={true} trialDaysRemaining={3} />);

      expect(screen.getByText('Enjoying your trial?')).toBeInTheDocument();
    });

    it('should display appropriate icons for trial benefits', () => {
      render(<TrialMessaging />);

      expect(screen.getByTestId('coffee-icon')).toBeInTheDocument();
      expect(screen.getByTestId('users-icon')).toBeInTheDocument();
      expect(screen.getByTestId('sparkles-icon')).toBeInTheDocument();
    });

    it('should show check circle icons for trial benefits', () => {
      render(<TrialMessaging />);

      const checkIcons = screen.getAllByTestId('check-circle-icon');
      expect(checkIcons).toHaveLength(3); // Three benefits with check icons
    });

    it('should handle trial expiration gracefully', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1); // 1 day ago

      render(<TrialMessaging hasActiveTrial={true} trialExpiresAt={pastDate} />);

      // Wait for any potential updates
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Should not show countdown for expired trial
      expect(screen.queryByText('Trial time remaining')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper semantic structure', () => {
      render(<TrialMessaging />);

      expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument();
      expect(screen.getByText('Start your cozy crossword journey')).toBeInTheDocument();
    });

    it('should have accessible links with proper hrefs', () => {
      render(<TrialMessaging />);

      const links = screen.getAllByRole('link');
      expect(links.length).toBeGreaterThan(0);
      
      links.forEach(link => {
        expect(link).toHaveAttribute('href');
        expect(link.getAttribute('href')).not.toBe('');
      });
    });

    it('should display icons with proper accessibility', () => {
      render(<TrialMessaging />);

      expect(screen.getByTestId('gift-icon')).toBeInTheDocument();
      expect(screen.getByTestId('heart-icon')).toBeInTheDocument();
      expect(screen.getAllByTestId('check-circle-icon')).toHaveLength(3); // Three check icons for benefits
    });
  });

  describe('Visual elements and styling', () => {
    it('should display trial badge with proper styling', () => {
      render(<TrialMessaging />);

      expect(screen.getByText('Free Trial')).toBeInTheDocument();
      expect(screen.getByTestId('badge')).toBeInTheDocument();
    });

    it('should show trial benefits in grid layout', () => {
      render(<TrialMessaging />);

      const gridContainer = document.querySelector('.grid.gap-4.md\\:grid-cols-3');
      expect(gridContainer).toBeInTheDocument();
    });

    it('should display countdown with proper time formatting', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 2);
      futureDate.setHours(futureDate.getHours() + 3);
      futureDate.setMinutes(futureDate.getMinutes() + 45);

      render(<TrialMessaging hasActiveTrial={true} trialExpiresAt={futureDate} />);

      // Wait for countdown to appear
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(screen.getByText('days')).toBeInTheDocument();
        expect(screen.getByText('hours')).toBeInTheDocument();
        expect(screen.getByText('minutes')).toBeInTheDocument();
      });
    });

    it('should have proper card structure', () => {
      render(<TrialMessaging />);

      const cards = screen.getAllByTestId('card');
      expect(cards.length).toBeGreaterThan(0);
    });
  });
});
