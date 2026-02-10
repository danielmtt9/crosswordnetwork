import { render, screen, fireEvent } from '@testing-library/react';
import { CluesPanel, Clue } from './CluesPanel';

describe('CluesPanel', () => {
  const mockAcrossClues: Clue[] = [
    { number: 1, text: 'Capital of France' },
    { number: 3, text: 'Largest ocean' },
  ];

  const mockDownClues: Clue[] = [
    { number: 1, text: 'Programming language' },
    { number: 2, text: 'Red fruit' },
  ];

  it('should render with across and down clues', () => {
    render(
      <CluesPanel acrossClues={mockAcrossClues} downClues={mockDownClues} />
    );

    expect(screen.getByText('Clues')).toBeInTheDocument();
    expect(screen.getByText('Across')).toBeInTheDocument();
    expect(screen.getByText('Down')).toBeInTheDocument();
  });

  it('should display all clues when expanded', () => {
    render(
      <CluesPanel acrossClues={mockAcrossClues} downClues={mockDownClues} />
    );

    expect(screen.getByText('Capital of France')).toBeInTheDocument();
    expect(screen.getByText('Largest ocean')).toBeInTheDocument();
    expect(screen.getByText('Programming language')).toBeInTheDocument();
    expect(screen.getByText('Red fruit')).toBeInTheDocument();
  });

  it('should display clue counts', () => {
    render(
      <CluesPanel acrossClues={mockAcrossClues} downClues={mockDownClues} />
    );

    const acrossCounts = screen.getAllByText('2');
    expect(acrossCounts.length).toBeGreaterThan(0);
  });

  it('should toggle across section collapse', () => {
    render(
      <CluesPanel acrossClues={mockAcrossClues} downClues={mockDownClues} />
    );

    const acrossButton = screen.getByText('Across').closest('button');
    expect(acrossButton).toHaveAttribute('aria-expanded', 'true');

    // Collapse
    fireEvent.click(acrossButton!);
    expect(acrossButton).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Capital of France')).not.toBeInTheDocument();

    // Expand again
    fireEvent.click(acrossButton!);
    expect(acrossButton).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Capital of France')).toBeInTheDocument();
  });

  it('should toggle down section collapse', () => {
    render(
      <CluesPanel acrossClues={mockAcrossClues} downClues={mockDownClues} />
    );

    const downButton = screen.getByText('Down').closest('button');
    expect(downButton).toHaveAttribute('aria-expanded', 'true');

    // Collapse
    fireEvent.click(downButton!);
    expect(downButton).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Programming language')).not.toBeInTheDocument();

    // Expand again
    fireEvent.click(downButton!);
    expect(downButton).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Programming language')).toBeInTheDocument();
  });

  it('should call onClueClick when clue is clicked', () => {
    const handleClueClick = jest.fn();
    render(
      <CluesPanel
        acrossClues={mockAcrossClues}
        downClues={mockDownClues}
        onClueClick={handleClueClick}
      />
    );

    const firstAcrossClue = screen.getByText('Capital of France');
    fireEvent.click(firstAcrossClue);
    expect(handleClueClick).toHaveBeenCalledWith(
      expect.objectContaining({ direction: 'across', number: 1, text: 'Capital of France' })
    );

    const firstDownClue = screen.getByText('Programming language');
    fireEvent.click(firstDownClue);
    expect(handleClueClick).toHaveBeenCalledWith(
      expect.objectContaining({ direction: 'down', number: 1, text: 'Programming language' })
    );
  });

  it('should highlight selected clue', () => {
    render(
      <CluesPanel
        acrossClues={mockAcrossClues}
        downClues={mockDownClues}
        selectedClue={{ direction: 'across', number: 1 }}
      />
    );

    const selectedClue = screen
      .getByText('Capital of France')
      .closest('button');
    expect(selectedClue).toHaveAttribute('aria-pressed', 'true');
    expect(selectedClue).toHaveClass('border-primary');
    // The UI uses an amber selection background rather than `bg-primary/10`.
    expect(selectedClue?.className).toMatch(/bg-amber-100\/80|dark:bg-amber-900\/30/);
  });

  it('should apply custom className', () => {
    const { container } = render(
      <CluesPanel
        acrossClues={mockAcrossClues}
        downClues={mockDownClues}
        className="custom-class"
      />
    );

    const card = container.querySelector('.custom-class');
    expect(card).toBeInTheDocument();
  });

  it('should render with empty clue lists', () => {
    render(<CluesPanel acrossClues={[]} downClues={[]} />);

    expect(screen.getByText('Across')).toBeInTheDocument();
    expect(screen.getByText('Down')).toBeInTheDocument();
    expect(screen.getAllByText('0')).toHaveLength(2);
  });

  it('should have accessible aria attributes', () => {
    render(
      <CluesPanel acrossClues={mockAcrossClues} downClues={mockDownClues} />
    );

    const acrossButton = screen.getByText('Across').closest('button');
    const downButton = screen.getByText('Down').closest('button');

    expect(acrossButton).toHaveAttribute('aria-expanded');
    expect(downButton).toHaveAttribute('aria-expanded');
  });

  it('should render clue numbers correctly', () => {
    render(
      <CluesPanel acrossClues={mockAcrossClues} downClues={mockDownClues} />
    );

    expect(screen.getAllByText(/^1\.$/)).toHaveLength(2); // Across and Down both have clue 1
    expect(screen.getByText(/^3\.$/)).toBeInTheDocument();
  });
});
