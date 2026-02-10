import { render, screen, act, waitFor } from '@testing-library/react';
import { PuzzleArea } from './PuzzleArea';

describe('PuzzleArea', () => {
  // In production this is typically a path stored under `public/...` in the DB.
  const mockPuzzleUrl = 'public/puzzles/test-puzzle.html';

  it('should render iframe with correct src', () => {
    render(<PuzzleArea puzzleUrl={mockPuzzleUrl} />);

    const iframe = screen.getByTitle('Crossword Puzzle');
    expect(iframe).toBeInTheDocument();
    // `PuzzleArea` normalizes `public/...` to `/<path>` for Next.js static serving.
    expect(iframe).toHaveAttribute('src', '/puzzles/test-puzzle.html');
  });

  it('should set initial height to minHeight', () => {
    const { container } = render(
      <PuzzleArea puzzleUrl={mockPuzzleUrl} minHeight={500} />
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveStyle({ height: '500px' });
  });

  it('should use default minHeight of 400px', () => {
    const { container } = render(<PuzzleArea puzzleUrl={mockPuzzleUrl} />);

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveStyle({ height: '400px' });
  });

  it('should update height when receiving dimensions message', async () => {
    const onDimensionsUpdate = jest.fn();
    const { container } = render(
      <PuzzleArea
        puzzleUrl={mockPuzzleUrl}
        onDimensionsUpdate={onDimensionsUpdate}
        minHeight={400}
        maxHeight={800}
      />
    );

    const iframe = screen.getByTitle('Crossword Puzzle') as HTMLIFrameElement;

    // Simulate message from iframe
    await act(async () => {
      const messageEvent = new MessageEvent('message', {
        data: {
          type: 'dimensions',
          width: 600,
          height: 650,
        },
        source: iframe.contentWindow,
      });
      window.dispatchEvent(messageEvent);
    });

    await waitFor(() => {
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveStyle({ height: '650px' });
    });

    expect(onDimensionsUpdate).toHaveBeenCalledWith(600, 650);
  });

  it('should clamp height to minHeight', async () => {
    const { container } = render(
      <PuzzleArea puzzleUrl={mockPuzzleUrl} minHeight={400} maxHeight={800} />
    );

    const iframe = screen.getByTitle('Crossword Puzzle') as HTMLIFrameElement;

    await act(async () => {
      const messageEvent = new MessageEvent('message', {
        data: {
          type: 'dimensions',
          width: 600,
          height: 300, // Below minHeight
        },
        source: iframe.contentWindow,
      });
      window.dispatchEvent(messageEvent);
    });

    await waitFor(() => {
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveStyle({ height: '400px' });
    });
  });

  it('should clamp height to maxHeight', async () => {
    const { container } = render(
      <PuzzleArea puzzleUrl={mockPuzzleUrl} minHeight={400} maxHeight={800} />
    );

    const iframe = screen.getByTitle('Crossword Puzzle') as HTMLIFrameElement;

    await act(async () => {
      const messageEvent = new MessageEvent('message', {
        data: {
          type: 'dimensions',
          width: 600,
          height: 1000, // Above maxHeight
        },
        source: iframe.contentWindow,
      });
      window.dispatchEvent(messageEvent);
    });

    await waitFor(() => {
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveStyle({ height: '800px' });
    });
  });

  it('should ignore messages from other sources', async () => {
    const onDimensionsUpdate = jest.fn();
    const { container } = render(
      <PuzzleArea
        puzzleUrl={mockPuzzleUrl}
        onDimensionsUpdate={onDimensionsUpdate}
      />
    );

    await act(async () => {
      const messageEvent = new MessageEvent('message', {
        data: {
          type: 'dimensions',
          width: 600,
          height: 650,
        },
        source: window, // Different source
      });
      window.dispatchEvent(messageEvent);
    });

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveStyle({ height: '400px' }); // Should remain at minHeight
    expect(onDimensionsUpdate).not.toHaveBeenCalled();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <PuzzleArea puzzleUrl={mockPuzzleUrl} className="custom-class" />
    );

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('custom-class');
  });

  it('should have overflow hidden', () => {
    const { container } = render(<PuzzleArea puzzleUrl={mockPuzzleUrl} />);

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('overflow-hidden');
  });

  it('should clean up message listener on unmount', () => {
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

    const { unmount } = render(<PuzzleArea puzzleUrl={mockPuzzleUrl} />);
    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'message',
      expect.any(Function)
    );

    removeEventListenerSpy.mockRestore();
  });

  it('should have sandbox attributes for security', () => {
    render(<PuzzleArea puzzleUrl={mockPuzzleUrl} />);

    const iframe = screen.getByTitle('Crossword Puzzle');
    expect(iframe).toHaveAttribute('sandbox', 'allow-scripts allow-same-origin');
  });
});
