import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConflictNotification, useConflictNotification } from './ConflictNotification';

// Mock the conflict data interface
interface ConflictData {
  cellId: string;
  attemptedValue: string;
  actualValue: string;
  winnerUserName: string;
  message: string;
}

describe('ConflictNotification', () => {
  const mockConflict: ConflictData = {
    cellId: 'A1',
    attemptedValue: 'X',
    actualValue: 'Y',
    winnerUserName: 'Other User',
    message: 'Conflict resolved: Other User\'s edit was applied'
  };

  it('should render nothing when no conflict', () => {
    const { container } = render(
      <ConflictNotification
        conflict={null}
        onDismiss={jest.fn()}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should render conflict notification when conflict exists', () => {
    render(
      <ConflictNotification
        conflict={mockConflict}
        onDismiss={jest.fn()}
      />
    );

    expect(screen.getByText('Edit Conflict Resolved')).toBeInTheDocument();
    expect(screen.getByText('You tried to enter "X" but Other User entered "Y" first')).toBeInTheDocument();
    expect(screen.getByText('Cell: A1')).toBeInTheDocument();
  });

  it('should auto-dismiss after 5 seconds', async () => {
    const onDismiss = jest.fn();
    
    render(
      <ConflictNotification
        conflict={mockConflict}
        onDismiss={onDismiss}
      />
    );

    expect(screen.getByText('Edit Conflict Resolved')).toBeInTheDocument();

    // Fast-forward time by 5 seconds
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    // Should be dismissed
    expect(onDismiss).toHaveBeenCalled();
  });

  it('should allow manual dismissal', () => {
    const onDismiss = jest.fn();
    
    render(
      <ConflictNotification
        conflict={mockConflict}
        onDismiss={onDismiss}
      />
    );

    const dismissButton = screen.getByRole('button');
    fireEvent.click(dismissButton);

    await waitFor(() => {
      expect(onDismiss).toHaveBeenCalled();
    });
  });

  it('should have correct styling for conflict alert', () => {
    render(
      <ConflictNotification
        conflict={mockConflict}
        onDismiss={jest.fn()}
      />
    );

    const alert = screen.getByText('Edit Conflict Resolved').closest('[role="alert"]');
    expect(alert).toHaveClass('border-orange-200', 'bg-orange-50');
  });
});

describe('useConflictNotification', () => {
  it('should manage conflict state correctly', () => {
    const { result } = renderHook(() => useConflictNotification());

    expect(result.current.conflict).toBeNull();

    act(() => {
      result.current.showConflict({
        cellId: 'A1',
        userInput: 'X',
        actualValue: 'Y',
        userName: 'Other User',
        timestamp: new Date(),
      });
    });

    expect(result.current.conflict).toEqual(mockConflict);

    act(() => {
      result.current.dismissConflict();
    });

    expect(result.current.conflict).toBeNull();
  });

  it('should allow showing multiple conflicts sequentially', () => {
    const { result } = renderHook(() => useConflictNotification());

    const conflict1 = {
      cellId: 'A1',
      userInput: 'X',
      actualValue: 'Y',
      userName: 'Other User',
      timestamp: new Date(),
    };
    const conflict2 = {
      cellId: 'A2',
      userInput: 'Z',
      actualValue: 'W',
      userName: 'Another User',
      timestamp: new Date(),
    };

    act(() => {
      result.current.showConflict(conflict1);
    });

    expect(result.current.conflict).toEqual(conflict1);

    act(() => {
      result.current.dismissConflict();
    });

    act(() => {
      result.current.showConflict(conflict2);
    });

    expect(result.current.conflict).toEqual(conflict2);
  });
});

// Helper function to render hook
function renderHook(hook: () => any) {
  let result: any;
  
  function TestComponent() {
    result = hook();
    return null;
  }
  
  render(<TestComponent />);
  
  return {
    result: {
      get current() {
        return result;
      }
    }
  };
}

// Mock timers for auto-dismiss testing
beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});
