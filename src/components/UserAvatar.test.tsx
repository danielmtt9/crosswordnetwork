import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { UserAvatar, UserAvatarCompact, UserAvatarListItem } from './UserAvatar';

const mockProps = {
  userId: 'user123',
  userName: 'John Doe',
  userEmail: 'john@example.com',
  avatarUrl: 'https://example.com/avatar.jpg',
  role: 'PLAYER' as const,
  subscriptionStatus: 'ACTIVE' as const,
  isOnline: true,
  userStatus: 'online' as const,
  isPremium: true,
  isHost: false,
  isModerator: false
};

describe('UserAvatar', () => {
  it('should render user avatar with name', () => {
    render(<UserAvatar {...mockProps} />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('JD')).toBeInTheDocument(); // Initials fallback
  });

  it('should render with different sizes', () => {
    const { rerender } = render(<UserAvatar {...mockProps} size="sm" />);
    expect(screen.getByText('John Doe')).toHaveClass('text-xs');

    rerender(<UserAvatar {...mockProps} size="lg" />);
    expect(screen.getByText('John Doe')).toHaveClass('text-base');

    rerender(<UserAvatar {...mockProps} size="xl" />);
    expect(screen.getByText('John Doe')).toHaveClass('text-lg');
  });

  it('should show host indicator', () => {
    render(<UserAvatar {...mockProps} isHost={true} />);
    
    expect(screen.getByText('(Host)')).toBeInTheDocument();
  });

  it('should show role indicator', () => {
    render(<UserAvatar {...mockProps} size="lg" />);
    
    expect(screen.getByText('Player')).toBeInTheDocument();
  });

  it('should show subscription status', () => {
    render(<UserAvatar {...mockProps} size="lg" />);
    
    expect(screen.getByText('Premium')).toBeInTheDocument();
  });

  it('should show online status', () => {
    render(<UserAvatar {...mockProps} isOnline={true} userStatus="online" size="lg" />);
    
    expect(screen.getByText('Online')).toBeInTheDocument();
  });

  it('should show offline status', () => {
    render(<UserAvatar {...mockProps} isOnline={false} userStatus="offline" size="lg" />);
    
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  it('should show away status', () => {
    render(<UserAvatar {...mockProps} userStatus="away" size="lg" />);
    
    expect(screen.getByText('Away')).toBeInTheDocument();
  });

  it('should show busy status', () => {
    render(<UserAvatar {...mockProps} userStatus="busy" size="lg" />);
    
    expect(screen.getByText('Busy')).toBeInTheDocument();
  });

  it('should hide role when showRole is false', () => {
    render(<UserAvatar {...mockProps} showRole={false} />);
    
    expect(screen.queryByText('Player')).not.toBeInTheDocument();
  });

  it('should hide status when showStatus is false', () => {
    render(<UserAvatar {...mockProps} showStatus={false} />);
    
    expect(screen.queryByText('Online')).not.toBeInTheDocument();
  });

  it('should hide subscription when showSubscription is false', () => {
    render(<UserAvatar {...mockProps} showSubscription={false} />);
    
    expect(screen.queryByText('Premium')).not.toBeInTheDocument();
  });

  it('should handle click events', () => {
    const onClick = jest.fn();
    render(<UserAvatar {...mockProps} onClick={onClick} />);
    
    fireEvent.click(screen.getByText('John Doe'));
    expect(onClick).toHaveBeenCalled();
  });

  it('should generate correct initials', () => {
    render(<UserAvatar {...mockProps} userName="Alice Smith" />);
    
    expect(screen.getByText('AS')).toBeInTheDocument();
  });

  it('should handle single name', () => {
    render(<UserAvatar {...mockProps} userName="Alice" />);
    
    expect(screen.getByText('A')).toBeInTheDocument();
  });

  it('should handle long names', () => {
    render(<UserAvatar {...mockProps} userName="Alice Bob Charlie" />);
    
    expect(screen.getByText('AB')).toBeInTheDocument();
  });
});

describe('UserAvatarCompact', () => {
  it('should render compact version', () => {
    render(<UserAvatarCompact {...mockProps} />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('should show role indicators', () => {
    render(<UserAvatarCompact {...mockProps} />);
    
    // Should have role indicators but no text labels
    expect(screen.queryByText('Player')).not.toBeInTheDocument();
  });

  it('should handle click events', () => {
    const onClick = jest.fn();
    render(<UserAvatarCompact {...mockProps} onClick={onClick} />);
    
    fireEvent.click(screen.getByText('John Doe'));
    expect(onClick).toHaveBeenCalled();
  });
});

describe('UserAvatarListItem', () => {
  it('should render list item version', () => {
    render(<UserAvatarListItem {...mockProps} />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('should show host indicator', () => {
    render(<UserAvatarListItem {...mockProps} isHost={true} />);
    
    expect(screen.getByText('(Host)')).toBeInTheDocument();
  });

  it('should show role indicators', () => {
    render(<UserAvatarListItem {...mockProps} />);
    
    // Should have role indicators but no text labels
    expect(screen.queryByText('Player')).not.toBeInTheDocument();
  });

  it('should handle click events', () => {
    const onClick = jest.fn();
    render(<UserAvatarListItem {...mockProps} onClick={onClick} />);
    
    fireEvent.click(screen.getByText('John Doe'));
    expect(onClick).toHaveBeenCalled();
  });

  it('should handle missing email', () => {
    render(<UserAvatarListItem {...mockProps} userEmail={undefined} />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.queryByText('john@example.com')).not.toBeInTheDocument();
  });
});
