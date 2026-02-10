/**
 * Example: Interactive Crossword Puzzle
 * 
 * This demonstrates how to use the crossword input system with:
 * - Cell selection and navigation
 * - Keyboard input for answers
 * - Automatic clue highlighting
 * - Direction toggle (across/down)
 */

'use client';

import { useState } from 'react';
import { useCrosswordInput, type Clue, type GridCell } from '@/hooks/useCrosswordInput';
import { CrosswordGrid } from '@/components/puzzle/CrosswordGrid';
import { ClueList } from '@/components/puzzle/ClueList';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

/**
 * Example puzzle data
 */
const EXAMPLE_CLUES: Clue[] = [
  {
    number: 1,
    direction: 'across',
    clue: 'Man\'s best friend',
    answer: 'DOG',
    startRow: 0,
    startCol: 0,
    length: 3,
  },
  {
    number: 4,
    direction: 'across',
    clue: 'Feline pet',
    answer: 'CAT',
    startRow: 1,
    startCol: 0,
    length: 3,
  },
  {
    number: 1,
    direction: 'down',
    clue: 'Medical professional',
    answer: 'DOC',
    startRow: 0,
    startCol: 0,
    length: 3,
  },
  {
    number: 2,
    direction: 'down',
    clue: 'Not in',
    answer: 'OUT',
    startRow: 0,
    startCol: 1,
    length: 3,
  },
  {
    number: 3,
    direction: 'down',
    clue: 'Obtain',
    answer: 'GET',
    startRow: 0,
    startCol: 2,
    length: 3,
  },
];

const EXAMPLE_CELLS: GridCell[] = [
  // Row 0
  { row: 0, col: 0, number: 1, value: '', isBlack: false },
  { row: 0, col: 1, number: 2, value: '', isBlack: false },
  { row: 0, col: 2, number: 3, value: '', isBlack: false },
  
  // Row 1
  { row: 1, col: 0, number: 4, value: '', isBlack: false },
  { row: 1, col: 1, value: '', isBlack: false },
  { row: 1, col: 2, value: '', isBlack: false },
  
  // Row 2
  { row: 2, col: 0, value: '', isBlack: false },
  { row: 2, col: 1, value: '', isBlack: false },
  { row: 2, col: 2, value: '', isBlack: false },
];

/**
 * Interactive Crossword Puzzle Example
 */
export default function InteractiveCrosswordExample() {
  const [cells, setCells] = useState<GridCell[]>(EXAMPLE_CELLS);

  // Handle answer changes
  const handleAnswerChange = (row: number, col: number, value: string) => {
    setCells(prevCells => 
      prevCells.map(cell => 
        cell.row === row && cell.col === col 
          ? { ...cell, value }
          : cell
      )
    );
  };

  // Handle cell selection
  const handleCellSelect = (cell: any) => {
    console.log('Selected cell:', cell);
    // You can add additional logic here
  };

  // Use the crossword input hook
  const {
    selectedCell,
    direction,
    selectCell,
    toggleDirection,
    handleKeyPress,
    getCellValue,
    isCellHighlighted,
    getActiveClue,
  } = useCrosswordInput({
    rows: 3,
    cols: 3,
    clues: EXAMPLE_CLUES,
    cells,
    onAnswerChange: handleAnswerChange,
    onCellSelect: handleCellSelect,
  });

  // Get active clue
  const activeClue = getActiveClue();

  // Handle clue click
  const handleClueClick = (clue: Clue) => {
    // Jump to the first cell of the clue
    selectCell(clue.startRow, clue.startCol);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Interactive Crossword</h1>
            <p className="text-muted-foreground">
              Click cells to select, type to fill, arrow keys to navigate
            </p>
          </div>
          <Button
            variant="outline"
            onClick={toggleDirection}
            className="capitalize"
          >
            Direction: {direction}
          </Button>
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Grid */}
          <div className="lg:col-span-2 flex flex-col items-center justify-center space-y-4">
            <CrosswordGrid
              cells={cells}
              rows={3}
              cols={3}
              selectedCell={selectedCell}
              direction={direction}
              isCellHighlighted={isCellHighlighted}
              getCellValue={getCellValue}
              onCellClick={selectCell}
              onKeyPress={handleKeyPress}
              cellSize={80}
            />

            {/* Active clue display */}
            {activeClue && (
              <div className="w-full max-w-md p-4 bg-card border rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">
                  {activeClue.direction.toUpperCase()}
                </div>
                <div className="font-semibold">
                  {activeClue.number}. {activeClue.clue}
                </div>
              </div>
            )}
          </div>

          {/* Clues */}
          <div className="lg:col-span-1">
            <Tabs defaultValue="across" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="across">Across</TabsTrigger>
                <TabsTrigger value="down">Down</TabsTrigger>
              </TabsList>
              
              <TabsContent value="across" className="mt-4">
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">Across Clues</h3>
                  <ClueList
                    clues={EXAMPLE_CLUES}
                    direction="across"
                    activeClueNumber={activeClue?.direction === 'across' ? activeClue.number : undefined}
                    onClueClick={handleClueClick}
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="down" className="mt-4">
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">Down Clues</h3>
                  <ClueList
                    clues={EXAMPLE_CLUES}
                    direction="down"
                    activeClueNumber={activeClue?.direction === 'down' ? activeClue.number : undefined}
                    onClueClick={handleClueClick}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-muted p-4 rounded-lg">
          <h3 className="font-semibold mb-2">How to use:</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li><strong>Click</strong> a cell to select it</li>
            <li><strong>Type</strong> letters to fill in answers</li>
            <li><strong>Arrow keys</strong> to navigate between cells</li>
            <li><strong>Space</strong> to toggle between across/down</li>
            <li><strong>Backspace</strong> to delete letters</li>
            <li><strong>Click clues</strong> to jump to that word</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
