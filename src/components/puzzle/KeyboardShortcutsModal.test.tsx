import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal';

describe('KeyboardShortcutsModal', () => {
  it('renders when isOpen is true', () => {
    render(
      <KeyboardShortcutsModal
        isOpen={true}
        onClose={() => {}}
      />
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
  });

  it('shows shortcut list when open', () => {
    render(
      <KeyboardShortcutsModal
        isOpen={true}
        onClose={() => {}}
      />
    );
    expect(screen.getByText('Enter')).toBeInTheDocument();
    expect(screen.getByText('Escape')).toBeInTheDocument();
    expect(screen.getByText('Backspace')).toBeInTheDocument();
  });

  it('calls onClose when dialog is closed', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    render(
      <KeyboardShortcutsModal
        isOpen={true}
        onClose={onClose}
      />
    );
    const closeButton = screen.getByRole('button', { name: /close/i });
    if (closeButton) {
      await user.click(closeButton);
      expect(onClose).toHaveBeenCalled();
    }
  });

  it('is hidden when isOpen is false', () => {
    render(
      <KeyboardShortcutsModal
        isOpen={false}
        onClose={() => {}}
      />
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
