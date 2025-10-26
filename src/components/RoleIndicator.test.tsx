import React from 'react';
import { render, screen } from '@testing-library/react';
import { RoleIndicator, RoleIndicatorCompact, RoleBadge } from './RoleIndicator';

describe('RoleIndicator', () => {
  it('should render host role correctly', () => {
    render(<RoleIndicator role="HOST" />);
    
    expect(screen.getByText('Host')).toBeInTheDocument();
  });

  it('should render player role correctly', () => {
    render(<RoleIndicator role="PLAYER" />);
    
    expect(screen.getByText('Player')).toBeInTheDocument();
  });

  it('should render spectator role correctly', () => {
    render(<RoleIndicator role="SPECTATOR" />);
    
    expect(screen.getByText('Spectator')).toBeInTheDocument();
  });

  it('should render moderator role correctly', () => {
    render(<RoleIndicator role="MODERATOR" />);
    
    expect(screen.getByText('Moderator')).toBeInTheDocument();
  });

  it('should show subscription status', () => {
    render(<RoleIndicator role="PLAYER" subscriptionStatus="ACTIVE" />);
    
    expect(screen.getByText('Player')).toBeInTheDocument();
    expect(screen.getByText('Premium')).toBeInTheDocument();
  });

  it('should show trial status', () => {
    render(<RoleIndicator role="PLAYER" subscriptionStatus="TRIAL" />);
    
    expect(screen.getByText('Player')).toBeInTheDocument();
    expect(screen.getByText('Trial')).toBeInTheDocument();
  });

  it('should show online status', () => {
    render(<RoleIndicator role="PLAYER" isOnline={true} userStatus="online" />);
    
    expect(screen.getByText('Player')).toBeInTheDocument();
    expect(screen.getByText('Online')).toBeInTheDocument();
  });

  it('should show offline status', () => {
    render(<RoleIndicator role="PLAYER" isOnline={false} userStatus="offline" />);
    
    expect(screen.getByText('Player')).toBeInTheDocument();
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  it('should show away status', () => {
    render(<RoleIndicator role="PLAYER" userStatus="away" />);
    
    expect(screen.getByText('Player')).toBeInTheDocument();
    expect(screen.getByText('Away')).toBeInTheDocument();
  });

  it('should show busy status', () => {
    render(<RoleIndicator role="PLAYER" userStatus="busy" />);
    
    expect(screen.getByText('Player')).toBeInTheDocument();
    expect(screen.getByText('Busy')).toBeInTheDocument();
  });

  it('should show premium badge when isPremium is true', () => {
    render(<RoleIndicator role="PLAYER" isPremium={true} />);
    
    expect(screen.getByText('Player')).toBeInTheDocument();
    expect(screen.getByText('Premium')).toBeInTheDocument();
  });

  it('should hide status when showStatus is false', () => {
    render(<RoleIndicator role="PLAYER" showStatus={false} />);
    
    expect(screen.getAllByText('Player')).toHaveLength(2); // One in badge, one in tooltip
    expect(screen.queryByText('Online')).not.toBeInTheDocument();
  });

  it('should hide subscription when showSubscription is false', () => {
    render(<RoleIndicator role="PLAYER" subscriptionStatus="ACTIVE" showSubscription={false} />);
    
    expect(screen.getByText('Player')).toBeInTheDocument();
    expect(screen.queryByText('Premium')).not.toBeInTheDocument();
  });

  it('should render with small size', () => {
    render(<RoleIndicator role="PLAYER" size="sm" />);
    
    expect(screen.getByText('Player')).toBeInTheDocument();
  });

  it('should render with large size', () => {
    render(<RoleIndicator role="PLAYER" size="lg" />);
    
    expect(screen.getByText('Player')).toBeInTheDocument();
  });

  it('should show custom tooltip', () => {
    render(<RoleIndicator role="PLAYER" tooltip="Custom tooltip" />);
    
    expect(screen.getByText('Player')).toBeInTheDocument();
  });
});

describe('RoleIndicatorCompact', () => {
  it('should render compact version', () => {
    render(<RoleIndicatorCompact role="PLAYER" />);
    
    // Should not have text labels, just icons
    expect(screen.queryByText('Player')).not.toBeInTheDocument();
  });

  it('should show subscription icon in compact version', () => {
    render(<RoleIndicatorCompact role="PLAYER" subscriptionStatus="ACTIVE" />);
    
    // Should have icons but no text
    expect(screen.queryByText('Player')).not.toBeInTheDocument();
    expect(screen.queryByText('Premium')).not.toBeInTheDocument();
  });

  it('should show premium icon in compact version', () => {
    render(<RoleIndicatorCompact role="PLAYER" isPremium={true} />);
    
    // Should have icons but no text
    expect(screen.queryByText('Player')).not.toBeInTheDocument();
    expect(screen.queryByText('Premium')).not.toBeInTheDocument();
  });

  it('should show status dot', () => {
    render(<RoleIndicatorCompact role="PLAYER" isOnline={true} />);
    
    // Should have status dot
    const statusDot = document.querySelector('.h-2.w-2.rounded-full');
    expect(statusDot).toBeInTheDocument();
  });
});

describe('RoleBadge', () => {
  it('should render badge version', () => {
    render(<RoleBadge role="PLAYER" />);
    
    expect(screen.getByText('Player')).toBeInTheDocument();
  });

  it('should show subscription in badge', () => {
    render(<RoleBadge role="PLAYER" subscriptionStatus="ACTIVE" />);
    
    expect(screen.getByText('Player')).toBeInTheDocument();
    expect(screen.getByText('Premium')).toBeInTheDocument();
  });

  it('should show premium in badge', () => {
    render(<RoleBadge role="PLAYER" isPremium={true} />);
    
    expect(screen.getByText('Player')).toBeInTheDocument();
    expect(screen.getByText('Premium')).toBeInTheDocument();
  });

  it('should render with different sizes', () => {
    render(<RoleBadge role="PLAYER" size="sm" />);
    
    expect(screen.getByText('Player')).toBeInTheDocument();
  });
});
