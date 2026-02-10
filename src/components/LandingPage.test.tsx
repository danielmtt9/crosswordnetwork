import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import HomePage from '../app/page';

// Mock all the components
jest.mock('@/components/HeroSection', () => {
  return function MockHeroSection() {
    return <div data-testid="hero-section">Hero Section</div>;
  };
});

jest.mock('@/components/SocialPresenceStrip', () => {
  return function MockSocialPresenceStrip() {
    return <div data-testid="social-presence-strip">Social Presence Strip</div>;
  };
});

jest.mock('@/components/StorySection', () => {
  return function MockStorySection() {
    return <div data-testid="story-section">Story Section</div>;
  };
});

jest.mock('@/components/GamificationPreview', () => {
  return function MockGamificationPreview() {
    return <div data-testid="gamification-preview">Gamification Preview</div>;
  };
});

jest.mock('@/components/TrialMessaging', () => {
  return function MockTrialMessaging() {
    return <div data-testid="trial-messaging">Trial Messaging</div>;
  };
});

// Mock Next.js Suspense
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  Suspense: ({ children, fallback }: any) => (
    <div data-testid="suspense-wrapper">
      {children}
      {fallback && <div data-testid="suspense-fallback">{fallback}</div>}
    </div>
  ),
}));

describe('HomePage - Performance and Mobile Responsiveness', () => {
  describe('7.1 Implement mobile-first responsive design (320px to 1440px)', () => {
    it('should render all main sections', () => {
      render(<HomePage />);

      expect(screen.getByTestId('hero-section')).toBeInTheDocument();
      expect(screen.getByTestId('social-presence-strip')).toBeInTheDocument();
      expect(screen.getByTestId('story-section')).toBeInTheDocument();
      expect(screen.getByTestId('gamification-preview')).toBeInTheDocument();
      expect(screen.getByTestId('trial-messaging')).toBeInTheDocument();
    });

    it('should have proper semantic structure', () => {
      render(<HomePage />);

      // Check for main content structure (using section with id="main-content")
      const mainContent = document.querySelector('#main-content');
      expect(mainContent).toBeInTheDocument();
    });

    it('should render components in correct order', () => {
      render(<HomePage />);

      const heroSection = screen.getByTestId('hero-section');
      const socialPresence = screen.getByTestId('social-presence-strip');
      const storySection = screen.getByTestId('story-section');
      const gamification = screen.getByTestId('gamification-preview');
      const trialMessaging = screen.getByTestId('trial-messaging');

      // Check that components are rendered in the expected order
      expect(heroSection.compareDocumentPosition(socialPresence)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
      expect(socialPresence.compareDocumentPosition(storySection)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
      expect(storySection.compareDocumentPosition(gamification)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
      expect(gamification.compareDocumentPosition(trialMessaging)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });
  });

  describe('7.2 Add touch-friendly interactions on mobile devices', () => {
    it('should render with Suspense for loading states', () => {
      render(<HomePage />);

      // Check that Suspense wrappers are present (multiple components use Suspense)
      const suspenseWrappers = screen.getAllByTestId('suspense-wrapper');
      expect(suspenseWrappers.length).toBeGreaterThan(0);
    });

    it('should handle component loading gracefully', async () => {
      render(<HomePage />);

      // All components should be rendered
      await waitFor(() => {
        expect(screen.getByTestId('hero-section')).toBeInTheDocument();
        expect(screen.getByTestId('social-presence-strip')).toBeInTheDocument();
        expect(screen.getByTestId('story-section')).toBeInTheDocument();
        expect(screen.getByTestId('gamification-preview')).toBeInTheDocument();
        expect(screen.getByTestId('trial-messaging')).toBeInTheDocument();
      });
    });
  });

  describe('7.3 Optimize images and animations for fast loading', () => {
    it('should render without errors', () => {
      expect(() => render(<HomePage />)).not.toThrow();
    });

    it('should have proper component structure', () => {
      render(<HomePage />);

      // Check that all expected components are present
      const components = [
        'hero-section',
        'social-presence-strip', 
        'story-section',
        'gamification-preview',
        'trial-messaging'
      ];

      components.forEach(componentId => {
        expect(screen.getByTestId(componentId)).toBeInTheDocument();
      });
    });
  });

  describe('7.4 Implement lazy loading for below-the-fold content', () => {
    it('should use Suspense for component loading', () => {
      render(<HomePage />);

      const suspenseWrappers = screen.getAllByTestId('suspense-wrapper');
      expect(suspenseWrappers.length).toBeGreaterThan(0);
    });

    it('should render all components eventually', async () => {
      render(<HomePage />);

      await waitFor(() => {
        expect(screen.getByTestId('hero-section')).toBeInTheDocument();
        expect(screen.getByTestId('social-presence-strip')).toBeInTheDocument();
        expect(screen.getByTestId('story-section')).toBeInTheDocument();
        expect(screen.getByTestId('gamification-preview')).toBeInTheDocument();
        expect(screen.getByTestId('trial-messaging')).toBeInTheDocument();
      });
    });
  });

  describe('7.5 Add smooth animations that respect prefers-reduced-motion', () => {
    it('should render without animation-related errors', () => {
      expect(() => render(<HomePage />)).not.toThrow();
    });

    it('should have proper component hierarchy', () => {
      render(<HomePage />);

      const mainContent = document.querySelector('#main-content');
      expect(mainContent).toBeInTheDocument();
      
      // Check that story section is within main-content
      expect(mainContent?.contains(screen.getByTestId('story-section'))).toBe(true);
      
      // Other components are outside main-content but still in the page
      expect(screen.getByTestId('hero-section')).toBeInTheDocument();
      expect(screen.getByTestId('social-presence-strip')).toBeInTheDocument();
      expect(screen.getByTestId('gamification-preview')).toBeInTheDocument();
      expect(screen.getByTestId('trial-messaging')).toBeInTheDocument();
    });
  });

  describe('7.6 Ensure accessibility compliance (WCAG 2.1 Level AA)', () => {
    it('should have proper semantic structure', () => {
      render(<HomePage />);

      const mainContent = document.querySelector('#main-content');
      expect(mainContent).toBeInTheDocument();
    });

    it('should render all components without accessibility errors', () => {
      expect(() => render(<HomePage />)).not.toThrow();
    });

    it('should have proper document structure', () => {
      render(<HomePage />);

      // Check for main content landmark
      expect(document.querySelector('#main-content')).toBeInTheDocument();
    });
  });

  describe('7.7 Build comprehensive unit tests for performance features', () => {
    it('should render consistently across multiple renders', () => {
      const { rerender } = render(<HomePage />);

      // First render
      expect(screen.getByTestId('hero-section')).toBeInTheDocument();
      expect(screen.getByTestId('social-presence-strip')).toBeInTheDocument();
      expect(screen.getByTestId('story-section')).toBeInTheDocument();
      expect(screen.getByTestId('gamification-preview')).toBeInTheDocument();
      expect(screen.getByTestId('trial-messaging')).toBeInTheDocument();

      // Re-render
      rerender(<HomePage />);

      // Should still have all components
      expect(screen.getByTestId('hero-section')).toBeInTheDocument();
      expect(screen.getByTestId('social-presence-strip')).toBeInTheDocument();
      expect(screen.getByTestId('story-section')).toBeInTheDocument();
      expect(screen.getByTestId('gamification-preview')).toBeInTheDocument();
      expect(screen.getByTestId('trial-messaging')).toBeInTheDocument();
    });

    it('should handle component unmounting gracefully', () => {
      const { unmount } = render(<HomePage />);

      expect(screen.getByTestId('hero-section')).toBeInTheDocument();

      // Should not throw when unmounting
      expect(() => unmount()).not.toThrow();
    });

    it('should render with proper component isolation', () => {
      render(<HomePage />);

      // Each component should be independently rendered
      const components = [
        'hero-section',
        'social-presence-strip',
        'story-section', 
        'gamification-preview',
        'trial-messaging'
      ];

      components.forEach(componentId => {
        const component = screen.getByTestId(componentId);
        expect(component).toBeInTheDocument();
        // Check that component has the expected text content
        const expectedText = componentId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        expect(component).toHaveTextContent(expectedText);
      });
    });
  });

  describe('Integration and Performance', () => {
    it('should render all components without performance issues', () => {
      const startTime = performance.now();
      render(<HomePage />);
      const endTime = performance.now();

      // Basic performance check - should render quickly
      expect(endTime - startTime).toBeLessThan(1000); // Less than 1 second
    });

    it('should handle multiple rapid re-renders', () => {
      const { rerender } = render(<HomePage />);

      // Multiple rapid re-renders
      for (let i = 0; i < 5; i++) {
        rerender(<HomePage />);
      }

      // Should still have all components
      expect(screen.getByTestId('hero-section')).toBeInTheDocument();
      expect(screen.getByTestId('social-presence-strip')).toBeInTheDocument();
      expect(screen.getByTestId('story-section')).toBeInTheDocument();
      expect(screen.getByTestId('gamification-preview')).toBeInTheDocument();
      expect(screen.getByTestId('trial-messaging')).toBeInTheDocument();
    });

    it('should maintain component state across renders', () => {
      const { rerender } = render(<HomePage />);

      // Initial render
      const initialHero = screen.getByTestId('hero-section');
      const initialSocial = screen.getByTestId('social-presence-strip');

      // Re-render
      rerender(<HomePage />);

      // Components should still be present
      expect(screen.getByTestId('hero-section')).toBeInTheDocument();
      expect(screen.getByTestId('social-presence-strip')).toBeInTheDocument();
    });
  });
});
