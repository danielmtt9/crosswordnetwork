# Crossword Input System Documentation

## Overview
A complete TypeScript-based interactive crossword puzzle system with cell selection, keyboard input, and automatic clue highlighting.

## Features ✅
- **Cell Selection**: Click any cell to select it
- **Keyboard Input**: Type letters directly into cells
- **Navigation**: Arrow keys to move between cells
- **Direction Toggle**: Space or button to switch between across/down
- **Clue Highlighting**: Automatic highlighting of active clue in the list
- **Cell Highlighting**: Visual highlighting of all cells in current word
- **Auto-advance**: Automatically moves to next cell after typing
- **Backspace Support**: Intelligent backspace behavior
- **Click to Jump**: Click any clue to jump to that word
- **Type-Safe**: Full TypeScript support with comprehensive types

## Architecture

### 1. Core Hook: `useCrosswordInput`
**Location**: `src/hooks/useCrosswordInput.ts`

The central hook that manages all crossword interaction logic.

#### Types
```typescript
type Direction = 'across' | 'down';

interface CellPosition {
  row: number;
  col: number;
}

interface Clue {
  number: number;
  direction: Direction;
  clue: string;
  answer: string;
  startRow: number;
  startCol: number;
  length: number;
}

interface GridCell {
  row: number;
  col: number;
  number?: number;
  value: string;
  isBlack: boolean;
}

interface SelectedCell extends CellPosition {
  direction: Direction;
  acrossClue?: Clue;
  downClue?: Clue;
}
```

#### Usage
```typescript
const {
  selectedCell,      // Currently selected cell
  direction,         // Current direction (across/down)
  selectCell,        // Function to select a cell
  toggleDirection,   // Toggle between across/down
  handleKeyPress,    // Handle keyboard input
  getCellValue,      // Get value of a cell
  isCellHighlighted, // Check if cell is highlighted
  getActiveClue,     // Get currently active clue
} = useCrosswordInput({
  rows: 15,
  cols: 15,
  clues: puzzleClues,
  cells: gridCells,
  onAnswerChange: (row, col, value) => {
    // Handle answer changes
  },
  onCellSelect: (cell) => {
    // Handle cell selection
  },
});
```

### 2. Grid Component: `CrosswordGrid`
**Location**: `src/components/puzzle/CrosswordGrid.tsx`

Interactive visual grid with cell rendering and keyboard handling.

#### Props
```typescript
interface CrosswordGridProps {
  cells: GridCell[];
  rows: number;
  cols: number;
  selectedCell: { row: number; col: number } | null;
  direction: Direction;
  isCellHighlighted: (row: number, col: number) => boolean;
  getCellValue: (row: number, col: number) => string;
  onCellClick: (row: number, col: number) => void;
  onKeyPress: (key: string) => void;
  cellSize?: number;
  className?: string;
}
```

#### Features
- CSS Grid layout for perfect alignment
- Color-coded highlighting (green for across, blue for down)
- Selected cell has primary color ring
- Cell numbers displayed in top-left corner
- Responsive cell sizing
- Keyboard event handling
- Auto-focus on selection

### 3. Clue List Component: `ClueList`
**Location**: `src/components/puzzle/ClueList.tsx`

Displays clues with highlighting for the active clue.

#### Props
```typescript
interface ClueListProps {
  clues: Clue[];
  direction: Direction;
  activeClueNumber?: number;
  onClueClick?: (clue: Clue) => void;
  className?: string;
}
```

#### Features
- Filters clues by direction
- Sorts clues numerically
- Highlights active clue with colored border
- Click to jump to clue
- Hover effects
- Keyboard accessible

## Keyboard Controls

| Key | Action |
|-----|--------|
| **Letters (A-Z)** | Type into selected cell and move to next |
| **Backspace** | Delete current cell or move back and delete |
| **Delete** | Clear current cell |
| **Arrow Right** | Move to next cell across |
| **Arrow Left** | Move to previous cell across |
| **Arrow Down** | Move to next cell down |
| **Arrow Up** | Move to previous cell up |
| **Space** | Toggle direction (across/down) |

## Color Coding

- **Selected Cell**: Primary color (blue) with ring border
- **Highlighted Across**: Light green background
- **Highlighted Down**: Light blue background
- **Black Cells**: Black background, not selectable
- **Active Clue**: Primary color border on left side

## Integration Example

### Step 1: Define Your Puzzle Data
```typescript
const clues: Clue[] = [
  {
    number: 1,
    direction: 'across',
    clue: 'Your clue text',
    answer: 'ANSWER',
    startRow: 0,
    startCol: 0,
    length: 6,
  },
  // ... more clues
];

const cells: GridCell[] = [
  { row: 0, col: 0, number: 1, value: '', isBlack: false },
  // ... more cells
];
```

### Step 2: Set Up State Management
```typescript
const [cells, setCells] = useState<GridCell[]>(initialCells);

const handleAnswerChange = (row: number, col: number, value: string) => {
  setCells(prev => 
    prev.map(cell => 
      cell.row === row && cell.col === col 
        ? { ...cell, value }
        : cell
    )
  );
};
```

### Step 3: Use the Hook
```typescript
const {
  selectedCell,
  direction,
  selectCell,
  handleKeyPress,
  getCellValue,
  isCellHighlighted,
  getActiveClue,
} = useCrosswordInput({
  rows: 15,
  cols: 15,
  clues,
  cells,
  onAnswerChange: handleAnswerChange,
});
```

### Step 4: Render Components
```typescript
return (
  <div>
    {/* Grid */}
    <CrosswordGrid
      cells={cells}
      rows={15}
      cols={15}
      selectedCell={selectedCell}
      direction={direction}
      isCellHighlighted={isCellHighlighted}
      getCellValue={getCellValue}
      onCellClick={selectCell}
      onKeyPress={handleKeyPress}
    />
    
    {/* Clues */}
    <ClueList
      clues={clues}
      direction="across"
      activeClueNumber={activeClue?.number}
      onClueClick={(clue) => selectCell(clue.startRow, clue.startCol)}
    />
  </div>
);
```

## Advanced Features

### Validation
```typescript
const handleAnswerChange = (row: number, col: number, value: string) => {
  // Update cell
  updateCell(row, col, value);
  
  // Check if word is complete
  const word = getCurrentWord();
  if (word.isComplete) {
    validateWord(word);
  }
};
```

### Progress Tracking
```typescript
const getProgress = () => {
  const filledCells = cells.filter(c => !c.isBlack && c.value).length;
  const totalCells = cells.filter(c => !c.isBlack).length;
  return (filledCells / totalCells) * 100;
};
```

### Auto-save
```typescript
useEffect(() => {
  const saveTimeout = setTimeout(() => {
    savePuzzleState(cells);
  }, 1000);
  
  return () => clearTimeout(saveTimeout);
}, [cells]);
```

## Styling

### Tailwind Classes Used
- `bg-primary/30` - Selected cell background
- `bg-green-100 dark:bg-green-900/20` - Across highlight
- `bg-blue-100 dark:bg-blue-900/20` - Down highlight
- `border-primary` - Active clue border
- `ring-2 ring-primary` - Selected cell ring

### Custom Styling
```typescript
// Cell size can be customized
<CrosswordGrid cellSize={60} />

// Custom colors via className
<ClueList className="text-lg" />
```

## Accessibility

- **Keyboard Navigation**: Full keyboard support for navigation
- **ARIA Labels**: Each cell has descriptive aria-label
- **Focus Management**: Automatic focus handling
- **Visual Feedback**: Clear visual indicators for all states
- **Tab Order**: Logical tab order through interface

## Performance Optimizations

- **useCallback**: All handler functions memoized
- **Map Lookup**: O(1) cell lookups using Map
- **Ref Storage**: Grid stored in ref to avoid re-renders
- **Conditional Rendering**: Only re-render when necessary

## Browser Support

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers

## Files Created

1. **`src/hooks/useCrosswordInput.ts`** - Core hook (370 lines)
2. **`src/components/puzzle/ClueList.tsx`** - Clue display (71 lines)
3. **`src/components/puzzle/CrosswordGrid.tsx`** - Grid component (166 lines)
4. **`CROSSWORD_INPUT_EXAMPLE.tsx`** - Complete example (239 lines)

## Testing Recommendations

```typescript
// Test cell selection
selectCell(0, 0);
expect(selectedCell).toEqual({ row: 0, col: 0 });

// Test input
handleKeyPress('A');
expect(getCellValue(0, 0)).toBe('A');

// Test navigation
handleKeyPress('ArrowRight');
expect(selectedCell.col).toBe(1);

// Test direction toggle
toggleDirection();
expect(direction).toBe('down');
```

## Next Steps

1. **Integrate with existing puzzle page**
2. **Add answer validation**
3. **Add progress tracking**
4. **Add timer functionality**
5. **Add multiplayer sync**
6. **Add hint system**
7. **Add undo/redo**

## Support

For questions or issues, refer to:
- TypeScript docs: https://www.typescriptlang.org/docs/
- React hooks: https://react.dev/reference/react
- Component examples: `CROSSWORD_INPUT_EXAMPLE.tsx`
