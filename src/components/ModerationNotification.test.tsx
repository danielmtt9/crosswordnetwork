/**
 * Tests for ModerationNotification components
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ModerationNotification, ModerationNotificationList, ModerationNotificationToast } from './ModerationNotification';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

const mockNotification: ModerationNotification = {
  id: 'notification-1',
  type: 'warning',
  userId: 'user-123',
  userName: 'Test User',
  reason: 'Inappropriate content detected',
  timestamp: new Date('2023-01-01T00:00:00Z'),
  severity: 'medium'
};

const mockMuteNotification: ModerationNotification = {
  id: 'notification-2',
  type: 'mute',
  userId: 'user-123',
  userName: 'Test User',
  reason: 'Spam',
  duration: 300000, // 5 minutes
  timestamp: new Date('2023-01-01T00:00:00Z'),
  severity: 'high'
};

const mockBanNotification: ModerationNotification = {
  id: 'notification-3',
  type: 'ban',
  userId: 'user-123',
  userName: 'Test User',
  reason: 'Repeated violations',
  timestamp: new Date('2023-01-01T00:00:00Z'),
  severity: 'critical'
};

describe('ModerationNotification', () => {
  const mockOnDismiss = jest.fn();
  const mockOnAcknowledge = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders warning notification correctly', () => {
    render(
      <ModerationNotification
        notification={mockNotification}
        onDismiss={mockOnDismiss}
        onAcknowledge={mockOnAcknowledge}
      />
    );

    expect(screen.getByText('Warning Issued')).toBeInTheDocument();
    expect(screen.getByText(/You have been warning/)).toBeInTheDocument();
    expect(screen.getByText('Inappropriate content detected')).toBeInTheDocument();
    expect(screen.getByText('medium')).toBeInTheDocument();
  });

  it('renders mute notification with duration', () => {
    render(
      <ModerationNotification
        notification={mockMuteNotification}
        onDismiss={mockOnDismiss}
        onAcknowledge={mockOnAcknowledge}
      />
    );

    expect(screen.getByText('You have been muted')).toBeInTheDocument();
    expect(screen.getByText('Spam')).toBeInTheDocument();
    expect(screen.getByText('Duration: 5 minutes')).toBeInTheDocument();
    expect(screen.getByText('high')).toBeInTheDocument();
  });

  it('renders ban notification with critical severity', () => {
    render(
      <ModerationNotification
        notification={mockBanNotification}
        onDismiss={mockOnDismiss}
        onAcknowledge={mockOnAcknowledge}
      />
    );

    expect(screen.getByText('You have been banned')).toBeInTheDocument();
    expect(screen.getByText('Repeated violations')).toBeInTheDocument();
    expect(screen.getByText('critical')).toBeInTheDocument();
  });

  it('calls onDismiss when dismiss button is clicked', () => {
    render(
      <ModerationNotification
        notification={mockNotification}
        onDismiss={mockOnDismiss}
        onAcknowledge={mockOnAcknowledge}
      />
    );

    const dismissButton = screen.getByRole('button', { name: '' });
    fireEvent.click(dismissButton);

    expect(mockOnDismiss).toHaveBeenCalledWith('notification-1');
  });

  it('calls onAcknowledge when acknowledge button is clicked', () => {
    render(
      <ModerationNotification
        notification={mockNotification}
        onDismiss={mockOnDismiss}
        onAcknowledge={mockOnAcknowledge}
      />
    );

    const acknowledgeButton = screen.getByText('Acknowledge');
    fireEvent.click(acknowledgeButton);

    expect(mockOnAcknowledge).toHaveBeenCalledWith('notification-1');
  });

  it('does not render acknowledge button when onAcknowledge is not provided', () => {
    render(
      <ModerationNotification
        notification={mockNotification}
        onDismiss={mockOnDismiss}
      />
    );

    expect(screen.queryByText('Acknowledge')).not.toBeInTheDocument();
  });

  it('does not render when notification is dismissed', () => {
    const dismissedNotification = { ...mockNotification, dismissed: true };
    
    render(
      <ModerationNotification
        notification={dismissedNotification}
        onDismiss={mockOnDismiss}
        onAcknowledge={mockOnAcknowledge}
      />
    );

    expect(screen.queryByText('Warning Issued')).not.toBeInTheDocument();
  });

  it('formats duration correctly', () => {
    const longDurationNotification = {
      ...mockMuteNotification,
      duration: 90000000 // 25 hours
    };

    render(
      <ModerationNotification
        notification={longDurationNotification}
        onDismiss={mockOnDismiss}
        onAcknowledge={mockOnAcknowledge}
      />
    );

    expect(screen.getByText('Duration: 1 day')).toBeInTheDocument();
  });
});

describe('ModerationNotificationList', () => {
  const mockOnDismiss = jest.fn();
  const mockOnAcknowledge = jest.fn();
  const mockOnClearAll = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders notification list with header', () => {
    render(
      <ModerationNotificationList
        notifications={[mockNotification]}
        onDismiss={mockOnDismiss}
        onAcknowledge={mockOnAcknowledge}
        onClearAll={mockOnClearAll}
      />
    );

    expect(screen.getByText('Moderation Notifications')).toBeInTheDocument();
    expect(screen.getByText('Warning Issued')).toBeInTheDocument();
  });

  it('shows empty state when no notifications', () => {
    render(
      <ModerationNotificationList
        notifications={[]}
        onDismiss={mockOnDismiss}
        onAcknowledge={mockOnAcknowledge}
        onClearAll={mockOnClearAll}
      />
    );

    expect(screen.getByText('No moderation notifications')).toBeInTheDocument();
  });

  it('shows dismissed count when notifications are dismissed', () => {
    const dismissedNotification = { ...mockNotification, dismissed: true };
    
    render(
      <ModerationNotificationList
        notifications={[mockNotification, dismissedNotification]}
        onDismiss={mockOnDismiss}
        onAcknowledge={mockOnAcknowledge}
        onClearAll={mockOnClearAll}
      />
    );

    expect(screen.getByText('1 dismissed')).toBeInTheDocument();
  });

  it('calls onClearAll when clear all button is clicked', () => {
    render(
      <ModerationNotificationList
        notifications={[mockNotification]}
        onDismiss={mockOnDismiss}
        onAcknowledge={mockOnAcknowledge}
        onClearAll={mockOnClearAll}
      />
    );

    const clearAllButton = screen.getByText('Clear All');
    fireEvent.click(clearAllButton);

    expect(mockOnClearAll).toHaveBeenCalled();
  });

  it('does not show clear all button when no notifications', () => {
    render(
      <ModerationNotificationList
        notifications={[]}
        onDismiss={mockOnDismiss}
        onAcknowledge={mockOnAcknowledge}
        onClearAll={mockOnClearAll}
      />
    );

    expect(screen.queryByText('Clear All')).not.toBeInTheDocument();
  });
});

describe('ModerationNotificationToast', () => {
  const mockOnDismiss = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders toast notification', () => {
    render(
      <ModerationNotificationToast
        notification={mockNotification}
        onDismiss={mockOnDismiss}
      />
    );

    expect(screen.getByText('Warning Issued')).toBeInTheDocument();
  });

  it('applies correct position classes for top-right', () => {
    const { container } = render(
      <ModerationNotificationToast
        notification={mockNotification}
        onDismiss={mockOnDismiss}
        position="top-right"
      />
    );

    const toastElement = container.firstChild as HTMLElement;
    expect(toastElement).toHaveClass('top-4', 'right-4');
  });

  it('applies correct position classes for bottom-left', () => {
    const { container } = render(
      <ModerationNotificationToast
        notification={mockNotification}
        onDismiss={mockOnDismiss}
        position="bottom-left"
      />
    );

    const toastElement = container.firstChild as HTMLElement;
    expect(toastElement).toHaveClass('bottom-4', 'left-4');
  });
});
