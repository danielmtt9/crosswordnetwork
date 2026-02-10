import { render, screen, act } from '@testing-library/react';
import { TimerDisplay } from './TimerDisplay';

describe('TimerDisplay', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders 0:00 when no startTime', () => {
    render(<TimerDisplay startTime={null} />);
    expect(screen.getByTestId('timer-display')).toHaveTextContent('0:00');
  });

  it('renders elapsed time when startTime is set', () => {
    const now = 1000000000000;
    jest.setSystemTime(now);
    const startTime = now - 65000; // 65 seconds ago
    render(<TimerDisplay startTime={startTime} />);
    expect(screen.getByTestId('timer-display')).toHaveTextContent('1:05');
  });

  it('shows completion time when isCompleted and completionTimeSeconds provided', () => {
    render(
      <TimerDisplay
        startTime={null}
        isCompleted={true}
        completionTimeSeconds={125}
      />
    );
    expect(screen.getByTestId('timer-display')).toHaveTextContent('2:05');
  });

  it('updates every second', () => {
    const now = 1000000000000;
    jest.setSystemTime(now);
    const startTime = now - 1000;
    render(<TimerDisplay startTime={startTime} />);
    expect(screen.getByTestId('timer-display')).toHaveTextContent('0:01');
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    act(() => {
      jest.setSystemTime(now + 3000);
      jest.advanceTimersByTime(0);
    });
    expect(screen.getByTestId('timer-display')).toHaveTextContent('0:03');
  });

  it('has aria-live and aria-label for accessibility', () => {
    render(<TimerDisplay startTime={null} />);
    const el = screen.getByTestId('timer-display');
    expect(el).toHaveAttribute('aria-live', 'polite');
    expect(el).toHaveAttribute('aria-label');
    expect(el.getAttribute('aria-label')).toContain('Elapsed time');
  });
});
