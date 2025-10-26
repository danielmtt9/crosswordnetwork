# Tasks: Landing Page Redesign - "Cozy Social" Theme

## Relevant Files

- `src/app/page.tsx` - Redesigned landing page with cozy social theme
- `src/app/page.test.tsx` - Unit tests for landing page
- `src/components/HeroSection.tsx` - Hero section with room creation/joining
- `src/components/HeroSection.test.tsx` - Unit tests for hero section
- `src/components/SocialPresenceStrip.tsx` - Live room and user count display
- `src/components/SocialPresenceStrip.test.tsx` - Unit tests for social presence
- `src/components/RoomSnapshot.tsx` - Visual room preview component
- `src/components/RoomSnapshot.test.tsx` - Unit tests for room snapshot
- `src/components/StorySection.tsx` - Story-based feature sections
- `src/components/StorySection.test.tsx` - Unit tests for story sections
- `src/components/GamificationPreview.tsx` - Achievement and leaderboard previews
- `src/components/GamificationPreview.test.tsx` - Unit tests for gamification preview
- `src/components/TrialMessaging.tsx` - Trial messaging and countdown
- `src/components/TrialMessaging.test.tsx` - Unit tests for trial messaging
- `src/app/api/presence/summary/route.ts` - Live presence data API
- `src/app/api/presence/summary/route.test.ts` - Unit tests for presence API
- `src/app/api/rooms/summary/route.ts` - Active rooms summary API
- `src/app/api/rooms/summary/route.test.ts` - Unit tests for rooms summary API
- `src/lib/presence.ts` - Presence data management utilities
- `src/lib/presence.test.ts` - Unit tests for presence utilities
- `src/lib/roomDiscovery.ts` - Room discovery and joining utilities
- `src/lib/roomDiscovery.test.ts` - Unit tests for room discovery
- `src/styles/landing.css` - Landing page specific styles
- `public/images/` - Landing page images and assets

### Notes

- Unit tests should typically be placed alongside the code files they are testing (e.g., `MyComponent.tsx` and `MyComponent.test.tsx` in the same directory).
- Use `npx jest [optional/path/to/test/file]` to run tests. Running without a path executes all tests found by the Jest configuration.

## Tasks

- [x] 1.0 Redesign Hero Section with "Cozy Social" Theme
  - [x] 1.1 Implement "Crossword nights, together" headline and messaging
  - [x] 1.2 Create compelling subtitle explaining social solving experience
  - [x] 1.3 Build prominent "Start a room" primary CTA button
  - [x] 1.4 Add "Join a room" secondary CTA with 6-character code input
  - [x] 1.5 Create visual room snapshot showing collaborative solving
  - [x] 1.6 Implement live participant cursors and avatars in preview
  - [x] 1.7 Build comprehensive unit tests for hero section features

- [x] 2.0 Implement Real-Time Social Presence Indicators
  - [x] 2.1 Create live room count display: "Live now: X rooms"
  - [x] 2.2 Add online user count: "X solvers online"
  - [x] 2.3 Build user avatar row representing active participants
  - [x] 2.4 Implement presence data updates every 15-30 seconds
  - [x] 2.5 Add graceful loading states when data is unavailable
  - [x] 2.6 Create fallback content when no users are online
  - [x] 2.7 Build comprehensive unit tests for presence indicators

- [x] 3.0 Create Room Creation and Joining Interface
  - [x] 3.1 Build one-click room creation for authenticated users
  - [x] 3.2 Implement unique 6-character room code generation
  - [x] 3.3 Add room code validation for joining (format and existence)
  - [x] 3.4 Create user redirection based on authentication status
  - [x] 3.5 Implement clear error messages for invalid room codes
  - [x] 3.6 Add room creation success with shareable link
  - [x] 3.7 Build comprehensive unit tests for room creation features

- [x] 4.0 Build Gamification Previews and Social Proof
  - [x] 4.1 Create user streak information display for returning users
  - [x] 4.2 Add recent achievement badges display (3-5 most recent)
  - [x] 4.3 Build compact leaderboard preview ("Top solvers tonight")
  - [x] 4.4 Implement locked achievements in grayscale for motivation
  - [x] 4.5 Add hover states with achievement descriptions
  - [x] 4.6 Create real-time gamification data updates
  - [x] 4.7 Build comprehensive unit tests for gamification features

- [x] 5.0 Design Story-Based Feature Sections
  - [x] 5.1 Replace traditional feature cards with narrative stories
  - [x] 5.2 Create "Play Together" story with host/invite/solve narrative
  - [x] 5.3 Build "Save & Resume" story with cross-device continuity
  - [x] 5.4 Add "Compete & Improve" story with streaks and leaderboards
  - [x] 5.5 Implement engaging visuals and micro-interactions
  - [x] 5.6 Add clear CTAs within each story section
  - [x] 5.7 Build comprehensive unit tests for story sections

- [x] 6.0 Integrate Trial Messaging and Conversion Optimization
  - [x] 6.1 Add subtle trial messaging: "1-week free trial • no card required"
  - [x] 6.2 Remove prominent pricing information from landing page
  - [x] 6.3 Create easy access to full pricing via navigation or footer
  - [x] 6.4 Implement trial countdown for users who have started trials
  - [x] 6.5 Add upgrade prompts for trial users approaching expiration
  - [x] 6.6 Create consistent messaging across all trial touchpoints
  - [x] 6.7 Build comprehensive unit tests for trial messaging features

- [x] 7.0 Optimize Performance and Mobile Responsiveness
  - [x] 7.1 Implement mobile-first responsive design (320px to 1440px)
  - [x] 7.2 Add touch-friendly interactions on mobile devices
  - [x] 7.3 Optimize images and animations for fast loading
  - [x] 7.4 Implement lazy loading for below-the-fold content
  - [x] 7.5 Add smooth animations that respect prefers-reduced-motion
  - [x] 7.6 Ensure accessibility compliance (WCAG 2.1 Level AA)
  - [x] 7.7 Build comprehensive unit tests for performance features
