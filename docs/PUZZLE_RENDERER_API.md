# Puzzle Renderer API Documentation

This document explains how to create custom puzzle renderers for the Crossword.Network platform.

## Overview

The puzzle renderer system uses a plugin architecture that allows different puzzle formats to be rendered using specialized components. Each renderer is responsible for:

- Detecting if it can handle a specific puzzle format
- Rendering the puzzle with appropriate interactivity
- Communicating progress and completion events to the parent application

## Core Interfaces

### PuzzleRenderer

```typescript
interface PuzzleRenderer {
  type: 'iframe' | 'component';
  name: string;
  canHandle: (content: string) => boolean;
  render: (props: PuzzleRenderProps) => React.ReactNode;
}
```

### PuzzleRenderProps

```typescript
interface PuzzleRenderProps {
  puzzleId: number;
  content: string;
  onProgress?: (data: ProgressData) => void;
  onComplete?: (data: CompletionData) => void;
}
```

### ProgressData

```typescript
interface ProgressData {
  type: 'progress' | 'completion' | 'hint_used';
  puzzleId: number;
  data: any;
  timestamp: number;
}
```

### CompletionData

```typescript
interface CompletionData {
  puzzleId: number;
  completionTime: number;
  score: number;
  hintsUsed: number;
  timestamp: number;
}
```

## Creating a Custom Renderer

### Step 1: Create the Renderer Object

```typescript
// src/lib/puzzleRenderers/MyCustomRenderer.tsx
import { PuzzleRenderer, PuzzleRenderProps } from './types';

export const MyCustomRenderer: PuzzleRenderer = {
  type: 'component', // or 'iframe'
  name: 'MyCustomPuzzle',
  
  canHandle: (content: string): boolean => {
    // Check for specific markers in the content
    return content.includes('MY_CUSTOM_MARKER');
  },
  
  render: (props: PuzzleRenderProps): React.ReactNode => {
    return <MyCustomComponent {...props} />;
  }
};
```

### Step 2: Implement the Component

```typescript
function MyCustomComponent({ 
  puzzleId, 
  content, 
  onProgress, 
  onComplete 
}: PuzzleRenderProps) {
  // Parse the content
  const puzzleData = parseMyCustomFormat(content);
  
  // Handle user interactions
  const handleCellChange = (cellId: string, value: string) => {
    // Update puzzle state
    updatePuzzleState(cellId, value);
    
    // Notify parent of progress
    if (onProgress) {
      onProgress({
        type: 'progress',
        puzzleId,
        data: { cellId, value, gridState: getCurrentState() },
        timestamp: Date.now()
      });
    }
    
    // Check for completion
    if (isPuzzleComplete()) {
      if (onComplete) {
        onComplete({
          puzzleId,
          completionTime: getCompletionTime(),
          score: calculateScore(),
          hintsUsed: getHintsUsed(),
          timestamp: Date.now()
        });
      }
    }
  };
  
  return (
    <div className="my-custom-puzzle">
      {/* Render your puzzle UI */}
    </div>
  );
}
```

### Step 3: Register the Renderer

```typescript
// src/lib/puzzleRenderers/index.ts
import { MyCustomRenderer } from './MyCustomRenderer';

const renderers: PuzzleRenderer[] = [
  EclipseCrosswordRenderer,
  MyCustomRenderer, // Add your renderer here
];
```

## Renderer Types

### Component Renderer

Use this type when you want to render the puzzle directly in React:

```typescript
export const MyRenderer: PuzzleRenderer = {
  type: 'component',
  name: 'MyPuzzle',
  canHandle: (content) => content.includes('MY_FORMAT'),
  render: (props) => <MyComponent {...props} />
};
```

**Pros:**
- Direct integration with React
- Better performance
- Full control over styling
- Easy state management

**Cons:**
- Need to reimplement puzzle logic
- More complex to implement
- Security considerations for user input

### Iframe Renderer

Use this type when you want to isolate the puzzle in a sandboxed iframe:

```typescript
export const MyIframeRenderer: PuzzleRenderer = {
  type: 'iframe',
  name: 'MyIframePuzzle',
  canHandle: (content) => content.includes('MY_IFRAME_FORMAT'),
  render: (props) => <MyIframeComponent {...props} />
};
```

**Pros:**
- Security isolation
- Preserve existing puzzle functionality
- No need to rewrite puzzle logic
- Support for complex third-party formats

**Cons:**
- Communication complexity via postMessage
- Styling integration challenges
- Performance overhead
- Limited control over puzzle behavior

## Communication Patterns

### Component Renderer Communication

For component renderers, communication is direct:

```typescript
const handleProgress = (data: ProgressData) => {
  // Direct function call
  onProgress?.(data);
};
```

### Iframe Renderer Communication

For iframe renderers, use postMessage:

```typescript
// In the iframe (injected script)
window.parent.postMessage({
  type: 'PROGRESS_UPDATE',
  data: { /* progress data */ },
  puzzleId: window.puzzleId,
  timestamp: Date.now()
}, '*');

// In the parent component
useEffect(() => {
  const handleMessage = (event: MessageEvent) => {
    if (event.origin !== window.location.origin) return;
    
    const { type, data } = event.data;
    if (type === 'PROGRESS_UPDATE') {
      onProgress?.({
        type: 'progress',
        puzzleId,
        data,
        timestamp: Date.now()
      });
    }
  };
  
  window.addEventListener('message', handleMessage);
  return () => window.removeEventListener('message', handleMessage);
}, [puzzleId, onProgress]);
```

## Security Considerations

### Component Renderers

- Sanitize all user input
- Validate puzzle data before rendering
- Use React's built-in XSS protection
- Implement proper error boundaries

### Iframe Renderers

- Validate postMessage origin
- Sanitize data received from iframe
- Use Content Security Policy headers
- Implement proper sandbox attributes

## Testing Your Renderer

### Unit Tests

```typescript
// src/lib/puzzleRenderers/__tests__/MyRenderer.test.tsx
import { MyCustomRenderer } from '../MyCustomRenderer';

describe('MyCustomRenderer', () => {
  it('should detect supported format', () => {
    const content = 'MY_CUSTOM_MARKER: puzzle data';
    expect(MyCustomRenderer.canHandle(content)).toBe(true);
  });
  
  it('should reject unsupported format', () => {
    const content = 'Some other format';
    expect(MyCustomRenderer.canHandle(content)).toBe(false);
  });
});
```

### Integration Tests

```typescript
// Test with actual puzzle content
const mockContent = 'MY_CUSTOM_MARKER: test puzzle';
const mockProps = {
  puzzleId: 1,
  content: mockContent,
  onProgress: jest.fn(),
  onComplete: jest.fn()
};

const component = MyCustomRenderer.render(mockProps);
// Test component behavior
```

## Performance Considerations

### Component Renderers

- Use React.memo for expensive components
- Implement proper key props for lists
- Optimize re-renders with useCallback/useMemo
- Consider virtualization for large puzzles

### Iframe Renderers

- Implement lazy loading
- Use proper caching strategies
- Minimize postMessage frequency
- Consider preloading for better UX

## Example: Simple Crossword Renderer

```typescript
// src/lib/puzzleRenderers/SimpleCrosswordRenderer.tsx
import { PuzzleRenderer, PuzzleRenderProps } from './types';

interface SimpleCrosswordData {
  grid: string[][];
  clues: { across: string[]; down: string[] };
}

export const SimpleCrosswordRenderer: PuzzleRenderer = {
  type: 'component',
  name: 'SimpleCrossword',
  
  canHandle: (content: string): boolean => {
    try {
      const data = JSON.parse(content);
      return data.type === 'simple-crossword' && 
             Array.isArray(data.grid) && 
             data.clues;
    } catch {
      return false;
    }
  },
  
  render: (props: PuzzleRenderProps) => {
    return <SimpleCrosswordComponent {...props} />;
  }
};

function SimpleCrosswordComponent({ puzzleId, content, onProgress, onComplete }: PuzzleRenderProps) {
  const [grid, setGrid] = useState<string[][]>([]);
  const [clues] = useState<{ across: string[]; down: string[] }>({ across: [], down: [] });
  
  useEffect(() => {
    const data: SimpleCrosswordData = JSON.parse(content);
    setGrid(data.grid);
    setClues(data.clues);
  }, [content]);
  
  const handleCellChange = (row: number, col: number, value: string) => {
    const newGrid = [...grid];
    newGrid[row][col] = value.toUpperCase();
    setGrid(newGrid);
    
    onProgress?.({
      type: 'progress',
      puzzleId,
      data: { grid: newGrid },
      timestamp: Date.now()
    });
    
    // Check completion
    if (isComplete(newGrid)) {
      onComplete?.({
        puzzleId,
        completionTime: Date.now() - startTime,
        score: calculateScore(newGrid),
        hintsUsed: 0,
        timestamp: Date.now()
      });
    }
  };
  
  return (
    <div className="simple-crossword">
      <div className="grid">
        {grid.map((row, rowIndex) => (
          <div key={rowIndex} className="row">
            {row.map((cell, colIndex) => (
              <input
                key={`${rowIndex}-${colIndex}`}
                type="text"
                maxLength={1}
                value={cell}
                onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                className="cell"
              />
            ))}
          </div>
        ))}
      </div>
      <div className="clues">
        <div className="across">
          <h3>Across</h3>
          {clues.across.map((clue, index) => (
            <div key={index}>{index + 1}. {clue}</div>
          ))}
        </div>
        <div className="down">
          <h3>Down</h3>
          {clues.down.map((clue, index) => (
            <div key={index}>{index + 1}. {clue}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

## Best Practices

1. **Error Handling**: Always implement proper error boundaries and fallbacks
2. **Accessibility**: Ensure your renderer is accessible to screen readers
3. **Responsive Design**: Make sure puzzles work on mobile devices
4. **Performance**: Optimize for large puzzles and slow connections
5. **Security**: Validate all inputs and sanitize outputs
6. **Documentation**: Document your renderer's format and requirements
7. **Testing**: Write comprehensive tests for your renderer
8. **Versioning**: Consider versioning your puzzle format for future compatibility

## Getting Help

If you need assistance creating a custom renderer:

1. Check the existing EclipseCrossword renderer for reference
2. Review the test files for examples
3. Consult the React documentation for component patterns
4. Contact the development team for support

## Future Enhancements

The renderer system is designed to be extensible. Future enhancements may include:

- Plugin loading from external sources
- Runtime renderer registration
- Advanced communication protocols
- Shared component libraries
- Performance monitoring and analytics
