import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import EmojiPicker from './EmojiPicker';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('EmojiPicker', () => {
  const mockOnEmojiSelect = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  it('renders when isOpen is true', () => {
    render(
      <EmojiPicker
        onEmojiSelect={mockOnEmojiSelect}
        onClose={mockOnClose}
        isOpen={true}
      />
    );

    expect(screen.getByText('Choose an emoji')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search emojis...')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(
      <EmojiPicker
        onEmojiSelect={mockOnEmojiSelect}
        onClose={mockOnClose}
        isOpen={false}
      />
    );

    expect(screen.queryByText('Choose an emoji')).not.toBeInTheDocument();
  });

  it('displays emoji categories', () => {
    render(
      <EmojiPicker
        onEmojiSelect={mockOnEmojiSelect}
        onClose={mockOnClose}
        isOpen={true}
      />
    );

    expect(screen.getByText('Smileys & People')).toBeInTheDocument();
    expect(screen.getByText('Animals & Nature')).toBeInTheDocument();
    expect(screen.getByText('Food & Drink')).toBeInTheDocument();
  });

  it('shows emojis for the active category', () => {
    render(
      <EmojiPicker
        onEmojiSelect={mockOnEmojiSelect}
        onClose={mockOnClose}
        isOpen={true}
      />
    );

    // Should show smiley emojis by default (use getAllByText to get all instances)
    const emojiButtons = screen.getAllByText('😀');
    expect(emojiButtons.length).toBeGreaterThan(0);
    
    const emojiButtons2 = screen.getAllByText('😃');
    expect(emojiButtons2.length).toBeGreaterThan(0);
  });

  it('calls onEmojiSelect when an emoji is clicked', () => {
    render(
      <EmojiPicker
        onEmojiSelect={mockOnEmojiSelect}
        onClose={mockOnClose}
        isOpen={true}
      />
    );

    // Get the emoji button (not the category tab)
    const emojiButtons = screen.getAllByText('😀');
    const emojiButton = emojiButtons.find(button => 
      button.getAttribute('title') === '😀'
    );
    expect(emojiButton).toBeDefined();
    
    if (emojiButton) {
      fireEvent.click(emojiButton);
      expect(mockOnEmojiSelect).toHaveBeenCalledWith('😀');
      expect(mockOnClose).toHaveBeenCalled();
    }
  });

  it('switches categories when category button is clicked', () => {
    render(
      <EmojiPicker
        onEmojiSelect={mockOnEmojiSelect}
        onClose={mockOnClose}
        isOpen={true}
      />
    );

    // Click on Animals & Nature category
    const animalsButton = screen.getByText('Animals & Nature');
    fireEvent.click(animalsButton);

    // Should show animal emojis (use getAllByText to get all instances)
    const dogEmojis = screen.getAllByText('🐶');
    expect(dogEmojis.length).toBeGreaterThan(0);
    
    const catEmojis = screen.getAllByText('🐱');
    expect(catEmojis.length).toBeGreaterThan(0);
  });

  it('filters emojis based on search query', () => {
    render(
      <EmojiPicker
        onEmojiSelect={mockOnEmojiSelect}
        onClose={mockOnClose}
        isOpen={true}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search emojis...');
    fireEvent.change(searchInput, { target: { value: '😀' } });

    // Should show only matching emojis (use getAllByText to get all instances)
    const matchingEmojis = screen.getAllByText('😀');
    expect(matchingEmojis.length).toBeGreaterThan(0);
    
    // Check that non-matching emojis are not in the grid (but may be in category tabs)
    const nonMatchingEmojis = screen.queryAllByText('😃');
    const gridEmojis = nonMatchingEmojis.filter(emoji => 
      emoji.getAttribute('title') === '😃'
    );
    expect(gridEmojis.length).toBe(0);
  });

  it('shows "No emojis found" when search has no results', () => {
    render(
      <EmojiPicker
        onEmojiSelect={mockOnEmojiSelect}
        onClose={mockOnClose}
        isOpen={true}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search emojis...');
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

    expect(screen.getByText('No emojis found')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    render(
      <EmojiPicker
        onEmojiSelect={mockOnEmojiSelect}
        onClose={mockOnClose}
        isOpen={true}
      />
    );

    const closeButton = screen.getByRole('button', { name: '' }); // Close button
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('loads recent emojis from localStorage', () => {
    const recentEmojis = ['😀', '😃', '😄'];
    localStorageMock.getItem.mockReturnValue(JSON.stringify(recentEmojis));

    render(
      <EmojiPicker
        onEmojiSelect={mockOnEmojiSelect}
        onClose={mockOnClose}
        isOpen={true}
      />
    );

    // Switch to recent category
    const recentButton = screen.getByText('Recent');
    fireEvent.click(recentButton);

    // Check that recent emojis are displayed (use getAllByText to get all instances)
    const emoji1Buttons = screen.getAllByText('😀');
    expect(emoji1Buttons.length).toBeGreaterThan(0);
    
    const emoji2Buttons = screen.getAllByText('😃');
    expect(emoji2Buttons.length).toBeGreaterThan(0);
    
    const emoji3Buttons = screen.getAllByText('😄');
    expect(emoji3Buttons.length).toBeGreaterThan(0);
  });

  it('saves emoji to recent emojis when selected', () => {
    render(
      <EmojiPicker
        onEmojiSelect={mockOnEmojiSelect}
        onClose={mockOnClose}
        isOpen={true}
      />
    );

    // Get the emoji button (not the category tab)
    const emojiButtons = screen.getAllByText('😀');
    const emojiButton = emojiButtons.find(button => 
      button.getAttribute('title') === '😀'
    );
    expect(emojiButton).toBeDefined();
    
    if (emojiButton) {
      fireEvent.click(emojiButton);
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'recent-emojis',
        JSON.stringify(['😀'])
      );
    }
  });

  it('handles localStorage errors gracefully', () => {
    localStorageMock.getItem.mockImplementation(() => {
      throw new Error('localStorage error');
    });

    // Should not throw an error
    expect(() => {
      render(
        <EmojiPicker
          onEmojiSelect={mockOnEmojiSelect}
          onClose={mockOnClose}
          isOpen={true}
        />
      );
    }).not.toThrow();
  });

  it('applies custom className', () => {
    const { container } = render(
      <EmojiPicker
        onEmojiSelect={mockOnEmojiSelect}
        onClose={mockOnClose}
        isOpen={true}
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('handles escape key to close', () => {
    render(
      <EmojiPicker
        onEmojiSelect={mockOnEmojiSelect}
        onClose={mockOnClose}
        isOpen={true}
      />
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('handles click outside to close', async () => {
    const { container } = render(
      <div>
        <EmojiPicker
          onEmojiSelect={mockOnEmojiSelect}
          onClose={mockOnClose}
          isOpen={true}
        />
        <div data-testid="outside">Outside element</div>
      </div>
    );

    const outsideElement = screen.getByTestId('outside');
    fireEvent.mouseDown(outsideElement);

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
