import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import StorySection from './StorySection';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, whileInView, initial, transition, viewport, animate, exit, ...props }: any) => <div {...props}>{children}</div>,
    section: ({ children, whileInView, initial, transition, viewport, ...props }: any) => <section {...props}>{children}</section>,
  },
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Users: () => <div data-testid="users-icon">Users</div>,
  Share2: () => <div data-testid="share2-icon">Share2</div>,
  Puzzle: () => <div data-testid="puzzle-icon">Puzzle</div>,
  Smartphone: () => <div data-testid="smartphone-icon">Smartphone</div>,
  Laptop: () => <div data-testid="laptop-icon">Laptop</div>,
  Trophy: () => <div data-testid="trophy-icon">Trophy</div>,
  Flame: () => <div data-testid="flame-icon">Flame</div>,
  ArrowRight: () => <div data-testid="arrow-right-icon">ArrowRight</div>,
  Heart: () => <div data-testid="heart-icon">Heart</div>,
  Coffee: () => <div data-testid="coffee-icon">Coffee</div>,
  Sparkles: () => <div data-testid="sparkles-icon">Sparkles</div>,
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

// Mock Next.js Link
jest.mock('next/link', () => {
  return ({ children, href, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  );
});

describe('StorySection', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('5.1 Replace traditional feature cards with narrative stories', () => {
    it('should render the main section with proper heading', () => {
      render(<StorySection />);

      expect(screen.getByText('Three cozy ways to enjoy puzzles')).toBeInTheDocument();
      expect(screen.getByText(/whether you're solving solo or with friends/i)).toBeInTheDocument();
    });

    it('should render all three story cards', () => {
      render(<StorySection />);

      const cards = screen.getAllByTestId('card');
      expect(cards).toHaveLength(3);
    });

    it('should have proper semantic structure', () => {
      render(<StorySection />);

      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
      expect(screen.getByText('Three cozy ways to enjoy puzzles')).toBeInTheDocument();
    });
  });

  describe('5.2 Create "Play Together" story with host/invite/solve narrative', () => {
    it('should display the Play Together story', () => {
      render(<StorySection />);

      expect(screen.getByText('Play Together')).toBeInTheDocument();
      expect(screen.getByText('The magic happens when friends gather')).toBeInTheDocument();
    });

    it('should show the three steps for Play Together', () => {
      render(<StorySection />);

      expect(screen.getByText('Start a room')).toBeInTheDocument();
      expect(screen.getByText('Create your cozy crossword space in seconds')).toBeInTheDocument();
      expect(screen.getByText('Host')).toBeInTheDocument();

      expect(screen.getByText('Invite friends')).toBeInTheDocument();
      expect(screen.getByText('Share the 6-letter code or send a link')).toBeInTheDocument();
      expect(screen.getByText('Share')).toBeInTheDocument();

      expect(screen.getByText('Solve together')).toBeInTheDocument();
      expect(screen.getByText('Watch letters appear in real-time as everyone contributes')).toBeInTheDocument();
      expect(screen.getByText('Collaborate')).toBeInTheDocument();
    });

    it('should have correct CTA for Play Together', () => {
      render(<StorySection />);

      const ctaLink = screen.getByText('Start your first room');
      expect(ctaLink.closest('a')).toHaveAttribute('href', '/multiplayer/new');
    });

    it('should display appropriate icons for Play Together', () => {
      render(<StorySection />);

      // Main icon + step icon + leaderboard icon = 3 users icons
      expect(screen.getAllByTestId('users-icon')).toHaveLength(3);
      expect(screen.getByTestId('share2-icon')).toBeInTheDocument();
      expect(screen.getAllByTestId('puzzle-icon')).toHaveLength(2); // One in Play Together, one in Save & Resume
      expect(screen.getByTestId('heart-icon')).toBeInTheDocument(); // Decorative
    });
  });

  describe('5.3 Build "Save & Resume" story with cross-device continuity', () => {
    it('should display the Save & Resume story', () => {
      render(<StorySection />);

      expect(screen.getByText('Save & Resume')).toBeInTheDocument();
      expect(screen.getByText('Your progress follows you everywhere')).toBeInTheDocument();
    });

    it('should show the three steps for Save & Resume', () => {
      render(<StorySection />);

      expect(screen.getByText('Start on desktop')).toBeInTheDocument();
      expect(screen.getByText('Begin your puzzle on your computer')).toBeInTheDocument();
      expect(screen.getByText('Desktop')).toBeInTheDocument();

      expect(screen.getByText('Continue on mobile')).toBeInTheDocument();
      expect(screen.getByText('Pick up exactly where you left off')).toBeInTheDocument();
      expect(screen.getByText('Mobile')).toBeInTheDocument();

      expect(screen.getByText('Never lose progress')).toBeInTheDocument();
      expect(screen.getByText('Everything syncs automatically across devices')).toBeInTheDocument();
      expect(screen.getByText('Sync')).toBeInTheDocument();
    });

    it('should have correct CTA for Save & Resume', () => {
      render(<StorySection />);

      const ctaLink = screen.getByText('Try cross-device solving');
      expect(ctaLink.closest('a')).toHaveAttribute('href', '/puzzles');
    });

    it('should display appropriate icons for Save & Resume', () => {
      render(<StorySection />);

      expect(screen.getAllByTestId('smartphone-icon')).toHaveLength(2); // Main icon + step icon
      expect(screen.getByTestId('laptop-icon')).toBeInTheDocument();
      expect(screen.getByTestId('sparkles-icon')).toBeInTheDocument(); // Decorative
    });
  });

  describe('5.4 Add "Compete & Improve" story with streaks and leaderboards', () => {
    it('should display the Compete & Improve story', () => {
      render(<StorySection />);

      expect(screen.getByText('Compete & Improve')).toBeInTheDocument();
      expect(screen.getByText('Grow your skills and celebrate wins')).toBeInTheDocument();
    });

    it('should show the three steps for Compete & Improve', () => {
      render(<StorySection />);

      expect(screen.getByText('Build streaks')).toBeInTheDocument();
      expect(screen.getByText('Keep your solving momentum going')).toBeInTheDocument();
      expect(screen.getByText('Streak')).toBeInTheDocument();

      expect(screen.getByText('Earn achievements')).toBeInTheDocument();
      expect(screen.getByText('Unlock badges for your crossword mastery')).toBeInTheDocument();
      expect(screen.getByText('Achieve')).toBeInTheDocument();

      expect(screen.getByText('Climb leaderboards')).toBeInTheDocument();
      expect(screen.getByText('See how you stack up against friends')).toBeInTheDocument();
      expect(screen.getByText('Compete')).toBeInTheDocument();
    });

    it('should have correct CTA for Compete & Improve', () => {
      render(<StorySection />);

      const ctaLink = screen.getByText('View your progress');
      expect(ctaLink.closest('a')).toHaveAttribute('href', '/profile');
    });

    it('should display appropriate icons for Compete & Improve', () => {
      render(<StorySection />);

      expect(screen.getAllByTestId('trophy-icon')).toHaveLength(2); // Main icon + step icon
      expect(screen.getByTestId('flame-icon')).toBeInTheDocument();
      expect(screen.getByTestId('coffee-icon')).toBeInTheDocument(); // Decorative
    });
  });

  describe('5.5 Implement engaging visuals and micro-interactions', () => {
    it('should display all story icons with proper styling', () => {
      render(<StorySection />);

      // Check that all main story icons are present
      expect(screen.getAllByTestId('users-icon')).toHaveLength(3); // Main + step + leaderboard
      expect(screen.getAllByTestId('smartphone-icon')).toHaveLength(2); // Main + step
      expect(screen.getAllByTestId('trophy-icon')).toHaveLength(2); // Main + step
    });

    it('should display decorative elements for each story', () => {
      render(<StorySection />);

      expect(screen.getByTestId('heart-icon')).toBeInTheDocument();
      expect(screen.getByTestId('sparkles-icon')).toBeInTheDocument();
      expect(screen.getByTestId('coffee-icon')).toBeInTheDocument();
    });

    it('should have proper gradient styling classes', () => {
      render(<StorySection />);

      // Check that cards have gradient background classes
      const cards = screen.getAllByTestId('card');
      expect(cards.length).toBeGreaterThan(0);
      
      // Each card should have gradient styling
      cards.forEach(card => {
        expect(card.className).toMatch(/bg-gradient-to-br/);
      });
    });
  });

  describe('5.6 Add clear CTAs within each story section', () => {
    it('should have CTAs for all three stories', () => {
      render(<StorySection />);

      expect(screen.getByText('Start your first room')).toBeInTheDocument();
      expect(screen.getByText('Try cross-device solving')).toBeInTheDocument();
      expect(screen.getByText('View your progress')).toBeInTheDocument();
    });

    it('should have arrow icons in all CTAs', () => {
      render(<StorySection />);

      const arrowIcons = screen.getAllByTestId('arrow-right-icon');
      expect(arrowIcons).toHaveLength(3);
    });

    it('should have proper href attributes for all CTAs', () => {
      render(<StorySection />);

      const ctaLinks = screen.getAllByRole('link');
      expect(ctaLinks).toHaveLength(3);
      
      const hrefs = ctaLinks.map(link => link.getAttribute('href'));
      expect(hrefs).toContain('/multiplayer/new');
      expect(hrefs).toContain('/puzzles');
      expect(hrefs).toContain('/profile');
    });
  });

  describe('5.7 Build comprehensive unit tests for story sections', () => {
    it('should handle custom className prop', () => {
      render(<StorySection className="custom-class" />);

      const section = document.querySelector('section');
      expect(section).toHaveClass('custom-class');
    });

    it('should render without custom className', () => {
      render(<StorySection />);

      const section = document.querySelector('section');
      expect(section).toHaveClass('py-24');
    });

    it('should display all step action badges', () => {
      render(<StorySection />);

      // Check for all action badges
      expect(screen.getByText('Host')).toBeInTheDocument();
      expect(screen.getByText('Share')).toBeInTheDocument();
      expect(screen.getByText('Collaborate')).toBeInTheDocument();
      expect(screen.getByText('Desktop')).toBeInTheDocument();
      expect(screen.getByText('Mobile')).toBeInTheDocument();
      expect(screen.getByText('Sync')).toBeInTheDocument();
      expect(screen.getByText('Streak')).toBeInTheDocument();
      expect(screen.getByText('Achieve')).toBeInTheDocument();
      expect(screen.getByText('Compete')).toBeInTheDocument();
    });

    it('should have proper responsive grid layout', () => {
      render(<StorySection />);

      const gridContainer = document.querySelector('.grid.gap-8.md\\:grid-cols-3');
      expect(gridContainer).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      render(<StorySection />);

      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);
      
      // Main heading should be h2
      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
    });

    it('should have accessible links with proper hrefs', () => {
      render(<StorySection />);

      const links = screen.getAllByRole('link');
      expect(links.length).toBe(3);
      
      links.forEach(link => {
        expect(link).toHaveAttribute('href');
        expect(link.getAttribute('href')).not.toBe('');
      });
    });

    it('should have proper semantic structure', () => {
      render(<StorySection />);

      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
      expect(document.querySelector('section')).toBeInTheDocument();
    });
  });

  describe('Visual elements and styling', () => {
    it('should display all story titles and subtitles', () => {
      render(<StorySection />);

      // Main titles
      expect(screen.getByText('Play Together')).toBeInTheDocument();
      expect(screen.getByText('Save & Resume')).toBeInTheDocument();
      expect(screen.getByText('Compete & Improve')).toBeInTheDocument();

      // Subtitles
      expect(screen.getByText('The magic happens when friends gather')).toBeInTheDocument();
      expect(screen.getByText('Your progress follows you everywhere')).toBeInTheDocument();
      expect(screen.getByText('Grow your skills and celebrate wins')).toBeInTheDocument();
    });

    it('should have proper container structure', () => {
      render(<StorySection />);

      const container = document.querySelector('.container.mx-auto.max-w-7xl.px-4');
      expect(container).toBeInTheDocument();
    });

    it('should display all step descriptions', () => {
      render(<StorySection />);

      // Play Together steps
      expect(screen.getByText('Create your cozy crossword space in seconds')).toBeInTheDocument();
      expect(screen.getByText('Share the 6-letter code or send a link')).toBeInTheDocument();
      expect(screen.getByText('Watch letters appear in real-time as everyone contributes')).toBeInTheDocument();

      // Save & Resume steps
      expect(screen.getByText('Begin your puzzle on your computer')).toBeInTheDocument();
      expect(screen.getByText('Pick up exactly where you left off')).toBeInTheDocument();
      expect(screen.getByText('Everything syncs automatically across devices')).toBeInTheDocument();

      // Compete & Improve steps
      expect(screen.getByText('Keep your solving momentum going')).toBeInTheDocument();
      expect(screen.getByText('Unlock badges for your crossword mastery')).toBeInTheDocument();
      expect(screen.getByText('See how you stack up against friends')).toBeInTheDocument();
    });
  });
});
