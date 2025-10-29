import { render, screen } from '@testing-library/react';
import { SaveIndicator } from './SaveIndicator';

describe('SaveIndicator', () => {
  it('should render nothing when status is idle', () => {
    const { container } = render(<SaveIndicator status="idle" />);
    expect(container.firstChild).toBeNull();
  });

  it('should show saving state', () => {
    render(<SaveIndicator status="saving" />);
    expect(screen.getByText('Saving...')).toBeInTheDocument();
  });

  it('should show saved state', () => {
    render(<SaveIndicator status="saved" />);
    expect(screen.getByText('Saved')).toBeInTheDocument();
  });

  it('should show saved with timestamp', () => {
    const date = new Date(Date.now() - 30000); // 30 seconds ago
    render(<SaveIndicator status="saved" lastSavedAt={date} />);
    expect(screen.getByText(/Saved 30s ago/)).toBeInTheDocument();
  });

  it('should show error state', () => {
    render(<SaveIndicator status="error" />);
    expect(screen.getByText('Failed to save')).toBeInTheDocument();
  });
});
