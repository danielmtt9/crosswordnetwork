import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { HostChangeNotification, useHostChangeNotification } from './HostChangeNotification';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <div data-testid="animate-presence">{children}</div>,
}));

// Mock UI components
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant, size, className, ...props }: any) => (
    <button
      data-testid="button"
      onClick={onClick}
      data-variant={variant}
      data-size={size}
      className={className}
      {...props}
    >
      {children}
    </button>
  ),
}));

// Mock Lucide icons
jest.mock('lucide-react', () => ({
  Crown: () => <div data-testid="crown-icon" />,
  X: () => <div data-testid="x-icon" />,
}));

describe('HostChangeNotification', () => {
  const mockProps = {
    isVisible: true,
    newHostName: 'New Host',
    previousHostName: 'Previous Host',
    onDismiss: jest.fn(),
    autoHideDelay: 1000,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should render notification when visible', () => {
    render(<HostChangeNotification {...mockProps} />);
    
    expect(screen.getByText('Host Changed')).toBeInTheDocument();
    expect(screen.getByText('New Host is now the host')).toBeInTheDocument();
    expect(screen.getByText('Previous host: Previous Host')).toBeInTheDocument();
    expect(screen.getByTestId('crown-icon')).toBeInTheDocument();
  });

  it('should not render when not visible', () => {
    render(<HostChangeNotification {...mockProps} isVisible={false} />);
    
    expect(screen.queryByText('Host Changed')).not.toBeInTheDocument();
  });

  it('should call onDismiss when dismiss button is clicked', () => {
    render(<HostChangeNotification {...mockProps} />);
    
    const dismissButton = screen.getByTestId('button');
    fireEvent.click(dismissButton);
    
    expect(mockProps.onDismiss).toHaveBeenCalledTimes(1);
  });

  it('should auto-dismiss after specified delay', async () => {
    render(<HostChangeNotification {...mockProps} autoHideDelay={1000} />);
    
    expect(screen.getByText('Host Changed')).toBeInTheDocument();
    
    // Fast-forward time
    jest.advanceTimersByTime(1000);
    
    await waitFor(() => {
      expect(mockProps.onDismiss).toHaveBeenCalledTimes(1);
    });
  });

  it('should handle missing previous host name', () => {
    render(<HostChangeNotification {...mockProps} previousHostName="" />);
    
    expect(screen.getByText('Host Changed')).toBeInTheDocument();
    expect(screen.getByText('New Host is now the host')).toBeInTheDocument();
    expect(screen.queryByText(/Previous host:/)).not.toBeInTheDocument();
  });

  it('should handle long host names', () => {
    const longHostName = 'Very Long Host Name That Might Cause Layout Issues';
    render(<HostChangeNotification {...mockProps} newHostName={longHostName} />);
    
    expect(screen.getByText('Host Changed')).toBeInTheDocument();
    expect(screen.getByText(`${longHostName} is now the host`)).toBeInTheDocument();
  });

  it('should have correct styling classes', () => {
    render(<HostChangeNotification {...mockProps} />);
    
    const notification = screen.getByText('Host Changed').closest('div');
    expect(notification).toHaveClass('bg-gradient-to-r', 'from-yellow-500', 'to-orange-500');
  });

  it('should clear timeout when component unmounts', () => {
    const { unmount } = render(<HostChangeNotification {...mockProps} />);
    
    // Unmount before timeout
    unmount();
    
    // Fast-forward time
    jest.advanceTimersByTime(1000);
    
    // Should not call onDismiss after unmount
    expect(mockProps.onDismiss).not.toHaveBeenCalled();
  });

  it('should clear timeout when dismiss is called manually', () => {
    render(<HostChangeNotification {...mockProps} />);
    
    const dismissButton = screen.getByTestId('button');
    fireEvent.click(dismissButton);
    
    // Fast-forward time
    jest.advanceTimersByTime(1000);
    
    // Should only be called once (manually)
    expect(mockProps.onDismiss).toHaveBeenCalledTimes(1);
  });

  it('should handle multiple visibility changes', () => {
    const { rerender } = render(<HostChangeNotification {...mockProps} isVisible={false} />);
    
    expect(screen.queryByText('Host Changed')).not.toBeInTheDocument();
    
    rerender(<HostChangeNotification {...mockProps} isVisible={true} />);
    expect(screen.getByText('Host Changed')).toBeInTheDocument();
    
    rerender(<HostChangeNotification {...mockProps} isVisible={false} />);
    expect(screen.queryByText('Host Changed')).not.toBeInTheDocument();
  });
});

describe('useHostChangeNotification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with correct default state', () => {
    const TestComponent = () => {
      const { notification } = useHostChangeNotification();
      return (
        <div>
          <div data-testid="is-visible">{notification.isVisible.toString()}</div>
          <div data-testid="new-host">{notification.newHostName}</div>
          <div data-testid="previous-host">{notification.previousHostName}</div>
        </div>
      );
    };

    render(<TestComponent />);
    
    expect(screen.getByTestId('is-visible')).toHaveTextContent('false');
    expect(screen.getByTestId('new-host')).toHaveTextContent('');
    expect(screen.getByTestId('previous-host')).toHaveTextContent('');
  });

  it('should update notification state when showHostChange is called', () => {
    const TestComponent = () => {
      const { notification, showHostChange } = useHostChangeNotification();
      return (
        <div>
          <div data-testid="is-visible">{notification.isVisible.toString()}</div>
          <div data-testid="new-host">{notification.newHostName}</div>
          <div data-testid="previous-host">{notification.previousHostName}</div>
          <button
            data-testid="show-button"
            onClick={() => showHostChange('New Host', 'Previous Host')}
          >
            Show Notification
          </button>
        </div>
      );
    };

    render(<TestComponent />);
    
    expect(screen.getByTestId('is-visible')).toHaveTextContent('false');
    
    fireEvent.click(screen.getByTestId('show-button'));
    
    expect(screen.getByTestId('is-visible')).toHaveTextContent('true');
    expect(screen.getByTestId('new-host')).toHaveTextContent('New Host');
    expect(screen.getByTestId('previous-host')).toHaveTextContent('Previous Host');
  });

  it('should reset notification state when dismissNotification is called', () => {
    const TestComponent = () => {
      const { notification, showHostChange, dismissNotification } = useHostChangeNotification();
      return (
        <div>
          <div data-testid="is-visible">{notification.isVisible.toString()}</div>
          <div data-testid="new-host">{notification.newHostName}</div>
          <div data-testid="previous-host">{notification.previousHostName}</div>
          <button
            data-testid="show-button"
            onClick={() => showHostChange('New Host', 'Previous Host')}
          >
            Show Notification
          </button>
          <button
            data-testid="dismiss-button"
            onClick={dismissNotification}
          >
            Dismiss
          </button>
        </div>
      );
    };

    render(<TestComponent />);
    
    // Show notification
    fireEvent.click(screen.getByTestId('show-button'));
    expect(screen.getByTestId('is-visible')).toHaveTextContent('true');
    
    // Dismiss notification
    fireEvent.click(screen.getByTestId('dismiss-button'));
    expect(screen.getByTestId('is-visible')).toHaveTextContent('false');
    expect(screen.getByTestId('new-host')).toHaveTextContent('');
    expect(screen.getByTestId('previous-host')).toHaveTextContent('');
  });

  it('should handle multiple show/dismiss cycles', () => {
    const TestComponent = () => {
      const { notification, showHostChange, dismissNotification } = useHostChangeNotification();
      return (
        <div>
          <div data-testid="is-visible">{notification.isVisible.toString()}</div>
          <div data-testid="new-host">{notification.newHostName}</div>
          <button
            data-testid="show-button"
            onClick={() => showHostChange('Host 1', 'Previous 1')}
          >
            Show 1
          </button>
          <button
            data-testid="show-button-2"
            onClick={() => showHostChange('Host 2', 'Previous 2')}
          >
            Show 2
          </button>
          <button
            data-testid="dismiss-button"
            onClick={dismissNotification}
          >
            Dismiss
          </button>
        </div>
      );
    };

    render(<TestComponent />);
    
    // Show first notification
    fireEvent.click(screen.getByTestId('show-button'));
    expect(screen.getByTestId('new-host')).toHaveTextContent('Host 1');
    
    // Dismiss
    fireEvent.click(screen.getByTestId('dismiss-button'));
    expect(screen.getByTestId('is-visible')).toHaveTextContent('false');
    
    // Show second notification
    fireEvent.click(screen.getByTestId('show-button-2'));
    expect(screen.getByTestId('new-host')).toHaveTextContent('Host 2');
    expect(screen.getByTestId('is-visible')).toHaveTextContent('true');
  });
});
