import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HintsMenu } from './HintsMenu';
import * as useDeviceTypeModule from '@/hooks/useDeviceType';

// Mock the useDeviceType hook
jest.mock('@/hooks/useDeviceType');

describe('HintsMenu', () => {
  const mockUseDeviceType = useDeviceTypeModule.useDeviceType as jest.MockedFunction<
    typeof useDeviceTypeModule.useDeviceType
  >;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Desktop variant', () => {
    beforeEach(() => {
      mockUseDeviceType.mockReturnValue('desktop');
    });

    it('should render desktop dropdown button', () => {
      render(<HintsMenu />);

      const button = screen.getByRole('button', { name: /hints/i });
      expect(button).toBeInTheDocument();
      expect(button).not.toHaveClass('rounded-full');
    });

    it('should display hint options when opened', async () => {
      const user = userEvent.setup();
      render(<HintsMenu />);

      const button = screen.getByRole('button', { name: /hints/i });
      await user.click(button);

      expect(await screen.findByText('Reveal Letter')).toBeInTheDocument();
      expect(screen.getByText('Reveal Word')).toBeInTheDocument();
      expect(screen.getByText('Check Puzzle')).toBeInTheDocument();
    });

    it('should call onRevealLetter when clicked', async () => {
      const user = userEvent.setup();
      const handleRevealLetter = jest.fn();
      render(<HintsMenu onRevealLetter={handleRevealLetter} />);

      const button = screen.getByRole('button', { name: /hints/i });
      await user.click(button);

      const revealLetterItem = await screen.findByText('Reveal Letter');
      await user.click(revealLetterItem);

      expect(handleRevealLetter).toHaveBeenCalled();
    });

    it('should call onRevealWord when clicked', async () => {
      const user = userEvent.setup();
      const handleRevealWord = jest.fn();
      render(<HintsMenu onRevealWord={handleRevealWord} />);

      const button = screen.getByRole('button', { name: /hints/i });
      await user.click(button);

      const revealWordItem = await screen.findByText('Reveal Word');
      await user.click(revealWordItem);

      expect(handleRevealWord).toHaveBeenCalled();
    });

    it('should call onCheckPuzzle when clicked', async () => {
      const user = userEvent.setup();
      const handleCheckPuzzle = jest.fn();
      render(<HintsMenu onCheckPuzzle={handleCheckPuzzle} />);

      const button = screen.getByRole('button', { name: /hints/i });
      await user.click(button);

      const checkPuzzleItem = await screen.findByText('Check Puzzle');
      await user.click(checkPuzzleItem);

      expect(handleCheckPuzzle).toHaveBeenCalled();
    });

    it('should be disabled when disabled prop is true', () => {
      render(<HintsMenu disabled={true} />);

      const button = screen.getByRole('button', { name: /hints/i });
      expect(button).toBeDisabled();
    });
  });

  describe('Mobile variant', () => {
    beforeEach(() => {
      mockUseDeviceType.mockReturnValue('mobile');
    });

    it('should render mobile FAB button', () => {
      render(<HintsMenu />);

      const button = screen.getByRole('button', { name: /hints menu/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass('rounded-full');
    });

    it('should have fixed positioning for FAB', () => {
      render(<HintsMenu />);

      const button = screen.getByRole('button', { name: /hints menu/i });
      expect(button).toHaveClass('fixed');
      expect(button).toHaveClass('bottom-20');
      expect(button).toHaveClass('right-4');
    });

    it('should display hint options when FAB is clicked', async () => {
      const user = userEvent.setup();
      render(<HintsMenu />);

      const button = screen.getByRole('button', { name: /hints menu/i });
      await user.click(button);

      expect(await screen.findByText('Reveal Letter')).toBeInTheDocument();
      expect(screen.getByText('Reveal Word')).toBeInTheDocument();
      expect(screen.getByText('Check Puzzle')).toBeInTheDocument();
    });

    it('should call handlers when menu items clicked on mobile', async () => {
      const user = userEvent.setup();
      const handleRevealLetter = jest.fn();
      const handleRevealWord = jest.fn();
      const handleCheckPuzzle = jest.fn();

      render(
        <HintsMenu
          onRevealLetter={handleRevealLetter}
          onRevealWord={handleRevealWord}
          onCheckPuzzle={handleCheckPuzzle}
        />
      );

      const button = screen.getByRole('button', { name: /hints menu/i });
      await user.click(button);

      await user.click(await screen.findByText('Reveal Letter'));
      expect(handleRevealLetter).toHaveBeenCalled();
    });
  });

  describe('Tablet variant', () => {
    beforeEach(() => {
      mockUseDeviceType.mockReturnValue('tablet');
    });

    it('should render mobile FAB for tablet', () => {
      render(<HintsMenu />);

      const button = screen.getByRole('button', { name: /hints menu/i });
      expect(button).toHaveClass('rounded-full');
    });
  });

  describe('Custom className', () => {
    it('should apply custom className on desktop', () => {
      mockUseDeviceType.mockReturnValue('desktop');
      render(<HintsMenu className="custom-class" />);

      const button = screen.getByRole('button', { name: /hints/i });
      expect(button).toHaveClass('custom-class');
    });

    it('should apply custom className on mobile', () => {
      mockUseDeviceType.mockReturnValue('mobile');
      render(<HintsMenu className="custom-class" />);

      const button = screen.getByRole('button', { name: /hints menu/i });
      expect(button).toHaveClass('custom-class');
    });
  });

  describe('Accessibility', () => {
    it('should have accessible labels', () => {
      mockUseDeviceType.mockReturnValue('mobile');
      render(<HintsMenu />);

      const button = screen.getByRole('button', { name: /hints menu/i });
      expect(button).toHaveAttribute('aria-label', 'Hints menu');
    });
  });
});
