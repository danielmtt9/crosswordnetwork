# Puzzle Area Customization Guide

## Overview
The puzzle area displays the interactive crossword grid inside an iframe with custom theming, responsive sizing, and communication bridges for multiplayer features.

---

## 🎯 What is Currently Displayed

### 1. **Interactive Crossword Grid (Inside Iframe)**
- **Grid cells** - Individual puzzle cells with letters
- **Cell states**: Normal, Selected, Error, Cheated
- **Cell numbers** - For clue references
- **Answer input box** - Popup when clicking a word
- **Current word clue** - Shows clue for selected word
- **Input field** - For typing answers
- **Action buttons**: OK, Cancel, Solve (cheat)
- **Check puzzle button** - Validates current answers
- **Copyright notice** - EclipseCrossword attribution

### 2. **Puzzle Area Container (Outside Iframe)**
Located at: `src/components/puzzle/PuzzleArea.tsx`
- **Wrapper div** - Responsive container
- **Iframe element** - Sandboxed puzzle content
- **Loading state** - During puzzle initialization
- **Height management** - Dynamic based on grid size

### 3. **Room Page Layout**
Located at: `src/app/room/[roomCode]/page.tsx`
- **Spectator mode banner** - "👁️ Spectator mode - View only" (if not a player)
- **Connection status** - Badge showing Connected/Disconnected
- **Room header** - Room name and code
- **Save indicator** - Auto-save status
- **Host controls** - End Session button (host only)
- **Leave button** - Exit room

---

## 🏗️ Implementation Architecture

### Iframe Structure
```typescript
<iframe
  ref={iframeRef}
  srcDoc={puzzleContent}  // Or src={puzzleUrl}
  className="w-full h-full border-0"
  title="Crossword Puzzle"
  sandbox="allow-scripts allow-same-origin"
  style={{ overflow: 'hidden', display: 'block' }}
/>
```

### Communication Bridge
**File**: `src/lib/puzzleBridge/injectBridgeScript.ts`

The iframe communicates with the parent page via:
- **postMessage API** - Cell updates, cursor movements
- **Custom events** - iframe-ready, dimensions
- **Direct function calls** - `__applyRemoteCellUpdate()` for multiplayer

### Styling System
**Files**: 
- `src/lib/puzzleBridge/cssInjectionManager.ts` - Dynamic CSS injection
- `src/lib/puzzleRenderers/styles/eclipsecrossword-theme.css` - Theme styles

---

## 🎨 Customization Options

### 1. **Visual Appearance**

#### Cell Colors (Light Mode)
```typescript
// In cssInjectionManager.ts
getLightThemeVariables(): {
  '--cw-cell-bg': 'hsl(0 0% 100%)',           // White background
  '--cw-cell-text': 'hsl(222.2 84% 4.9%)',     // Dark text
  '--cw-highlight-across': 'hsl(142.1 70.6% 95.3%)', // Light green
  '--cw-highlight-down': 'hsl(210 40% 96.1%)', // Light blue
  '--cw-correct': 'hsl(142.1 76.2% 36.3%)',    // Green
  '--cw-incorrect': 'hsl(0 84.2% 60.2%)',      // Red
}
```

#### Cell Colors (Dark Mode)
```typescript
getDarkThemeVariables(): {
  '--cw-cell-bg': 'hsl(222.2 84% 4.9%)',       // Dark background
  '--cw-cell-text': 'hsl(210 40% 98%)',        // Light text
  '--cw-highlight-across': 'hsl(142.1 70.6% 15.3%)', // Dark green
  '--cw-highlight-down': 'hsl(217.2 32.6% 17.5%)',   // Dark blue
}
```

#### Cell Sizing
```typescript
// Dynamic sizing based on container
'--cw-cell-size': '32px',      // Default 32px
'--cw-cell-font-size': '18px', // Font size ~56% of cell
'--cw-grid-gap': '1px',        // Space between cells

// Responsive sizing (mobile)
@media (max-width: 768px) {
  height: calc(var(--ecw-cell-size) * 0.8)  // 80% size on mobile
}
```

### 2. **Height & Sizing**

#### PuzzleArea Props
```typescript
<PuzzleArea
  height={600}           // Fixed height (optional)
  minHeight={400}        // Minimum height (default: 400)
  maxHeight={800}        // Maximum height (default: 800)
  className="custom-class"
/>
```

#### Dynamic Height Calculation
```typescript
// Automatically adjusts based on puzzle content
// Listens for 'dimensions' message from iframe:
const handleMessage = (event) => {
  if (event.data.type === 'dimensions') {
    const clampedHeight = Math.min(
      Math.max(height, minHeight), 
      maxHeight
    );
    setIframeHeight(clampedHeight);
  }
};
```

#### Responsive Cell Sizing Algorithm
```typescript
// src/lib/puzzleBridge/cssInjectionManager.ts
calculateCellSize(
  containerWidth: number,
  containerHeight: number,
  gridRows: number,
  gridCols: number
): number {
  // Factors in:
  // - Available space
  // - Grid dimensions
  // - Device pixel ratio
  // - Min/max constraints (24-48px)
  
  return Math.max(24, Math.min(48, calculatedSize));
}
```

### 3. **Content Customization**

#### What Can Be Hidden/Shown

**Already Implemented:**
```typescript
// Spectator mode banner
{!canEdit && (
  <div className="mb-2 p-2 bg-muted rounded text-sm">
    👁️ Spectator mode - View only
  </div>
)}
```

**Inside Iframe (via CSS injection):**
```css
/* Hide answer box (disable word entry) */
.ecw-answerbox { display: none !important; }

/* Hide welcome message */
#welcomemessage { display: none !important; }

/* Hide check button */
#checkbutton { display: none !important; }

/* Hide cheat/solve button */
#cheatbutton { display: none !important; }

/* Hide copyright */
.ecw-copyright { display: none !important; }
```

#### Example: Custom Overlay
```typescript
// Add custom elements over the puzzle
<div className="relative">
  <PuzzleArea {...props} />
  
  {/* Custom overlay */}
  <div className="absolute top-4 right-4 z-10">
    <Badge>Custom Info</Badge>
  </div>
  
  {/* Timer overlay */}
  <div className="absolute bottom-4 left-4 z-10">
    <span className="text-lg font-mono">
      {formatTime(elapsedTime)}
    </span>
  </div>
</div>
```

### 4. **Behavior Customization**

#### Disable User Input (Read-Only Mode)
```typescript
// Add to PuzzleArea after iframe loads
useEffect(() => {
  if (iframeRef.current?.contentDocument) {
    const doc = iframeRef.current.contentDocument;
    
    // Disable all inputs
    doc.querySelectorAll('.ecw-box').forEach(cell => {
      cell.style.pointerEvents = 'none';
    });
    
    // Hide input controls
    const answerBox = doc.getElementById('answerbox');
    if (answerBox) answerBox.style.display = 'none';
  }
}, [puzzleContent]);
```

#### Custom Click Handlers
```typescript
// Intercept cell clicks
useEffect(() => {
  const handleCellClick = (event: MessageEvent) => {
    if (event.data.type === 'cell_clicked') {
      const { cellId, wordNumber, direction } = event.data;
      
      // Custom behavior
      console.log(`Cell ${cellId} clicked`);
      
      // Optionally prevent default
      event.preventDefault();
    }
  };
  
  window.addEventListener('message', handleCellClick);
  return () => window.removeEventListener('message', handleCellClick);
}, []);
```

### 5. **Animation Customization**

#### Available Animation Classes
```css
/* Defined in eclipsecrossword-theme.css */

.ecw-animate-fadeIn     /* Fade in on mount */
.ecw-animate-correct    /* Pulse green (correct letter) */
.ecw-animate-incorrect  /* Shake red (wrong letter) */
.ecw-animate-glow       /* Glowing border (active cell) */
.ecw-animate-celebrate  /* Celebration bounce */
.ecw-animate-hint       /* Blue pulse (hint revealed) */
```

#### Custom Animation Example
```typescript
// Add custom animation class via CSS injection
const customCSS = `
  @keyframes custom-pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
  }
  
  .ecw-box.custom-highlight {
    animation: custom-pulse 0.5s ease-in-out;
    background-color: var(--ecw-accent) !important;
  }
`;

// Inject via cssInjectionManager
injectCSS(doc, customCSS);
```

### 6. **Theme System**

#### Switching Themes
```typescript
import { applyTheme, getLightThemeVariables, getDarkThemeVariables } from '@/lib/puzzleBridge';

// In component
const switchTheme = (theme: 'light' | 'dark') => {
  if (iframeRef.current?.contentDocument) {
    const variables = theme === 'light' 
      ? getLightThemeVariables() 
      : getDarkThemeVariables();
    
    applyTheme(iframeRef.current.contentDocument, theme, variables);
  }
};
```

#### Custom Theme Colors
```typescript
// Create custom theme
const customTheme: ThemeVariables = {
  '--cw-cell-bg': 'hsl(220 13% 91%)',      // Custom gray
  '--cw-cell-text': 'hsl(220 9% 46%)',     
  '--cw-highlight-across': 'hsl(280 60% 90%)', // Purple accent
  '--cw-highlight-down': 'hsl(45 93% 85%)',    // Yellow accent
  '--cw-correct': 'hsl(160 84% 39%)',      // Teal
  '--cw-incorrect': 'hsl(0 72% 51%)',      // Bright red
  '--cw-cell-size': '36px',                // Larger cells
};

// Apply custom theme
updateCSSVariables(doc, customTheme);
```

---

## 🔧 Practical Customization Examples

### Example 1: Larger Cells for Accessibility
```typescript
<PuzzleArea
  puzzleContent={puzzleContent}
  minHeight={500}
  maxHeight={900}
  iframeRef={iframeRef}
/>

// After load, increase cell size
useEffect(() => {
  if (iframeRef.current?.contentDocument) {
    updateCSSVariables(iframeRef.current.contentDocument, {
      '--cw-cell-size': '44px',
      '--cw-cell-font-size': '24px',
    });
  }
}, [puzzleContent]);
```

### Example 2: Hide Answer Entry (Display Only)
```typescript
useEffect(() => {
  const doc = iframeRef.current?.contentDocument;
  if (!doc) return;
  
  const hideElements = `
    #answerbox { display: none !important; }
    #welcomemessage { display: none !important; }
    #checkbutton { display: none !important; }
    .ecw-box { cursor: default !important; }
  `;
  
  injectCSS(doc, hideElements);
}, [puzzleContent]);
```

### Example 3: Custom Timer Overlay
```typescript
const [elapsedTime, setElapsedTime] = useState(0);

<div className="relative">
  <PuzzleArea {...props} />
  
  <div className="absolute top-4 right-4 bg-card/90 backdrop-blur px-4 py-2 rounded-lg shadow-lg z-10">
    <div className="text-sm text-muted-foreground">Time Elapsed</div>
    <div className="text-2xl font-mono font-bold">
      {formatTime(elapsedTime)}
    </div>
  </div>
</div>
```

### Example 4: Multiplayer Cursor Indicators
```typescript
// Show other players' cursors
const renderPlayerCursors = (participants: Participant[]) => {
  return participants.map(p => (
    <div
      key={p.userId}
      className="absolute"
      style={{
        left: `${p.cursorX}px`,
        top: `${p.cursorY}px`,
        pointerEvents: 'none',
        zIndex: 100,
      }}
    >
      <div className="bg-primary text-primary-foreground px-2 py-1 rounded text-xs">
        {p.userName}
      </div>
    </div>
  ));
};
```

### Example 5: Progress Indicator Overlay
```typescript
<div className="relative">
  <PuzzleArea {...props} />
  
  {progressPercent < 100 && (
    <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted">
      <div 
        className="h-full bg-primary transition-all"
        style={{ width: `${progressPercent}%` }}
      />
    </div>
  )}
</div>
```

---

## 📝 Configuration Summary

### PuzzleArea Component Props
```typescript
interface PuzzleAreaProps {
  puzzleUrl?: string;              // URL to puzzle file
  puzzleContent?: string;          // Inline HTML content (preferred)
  height?: number;                 // Fixed height
  iframeRef?: RefObject;           // External ref
  onDimensionsUpdate?: Function;   // Callback on resize
  className?: string;              // Custom classes
  minHeight?: number;              // Min height (default: 400)
  maxHeight?: number;              // Max height (default: 800)
}
```

### CSS Variables (All Customizable)
```typescript
// Colors
'--cw-cell-bg'            // Cell background
'--cw-cell-text'          // Cell text color
'--cw-highlight-across'   // Across word highlight
'--cw-highlight-down'     // Down word highlight
'--cw-correct'            // Correct answer color
'--cw-incorrect'          // Incorrect answer color

// Sizing
'--cw-cell-size'          // Cell width/height
'--cw-cell-font-size'     // Letter font size
'--cw-grid-gap'           // Space between cells

// Extended (in eclipsecrossword-theme.css)
'--ecw-background'        // Page background
'--ecw-foreground'        // Text color
'--ecw-border'            // Border colors
'--ecw-primary'           // Primary accent
'--ecw-border-radius'     // Corner radius
```

---

## 🎯 Recommended Customization Workflow

1. **Start with CSS Variables** - Change colors and sizes
2. **Use CSS injection** - Hide/show elements
3. **Add overlays** - Custom UI elements outside iframe
4. **Intercept messages** - Custom behavior on events
5. **Test responsiveness** - Mobile, tablet, desktop

---

## ⚠️ Important Notes

- **Sandbox restrictions**: `allow-scripts allow-same-origin` needed for bridge
- **CORS considerations**: Puzzle content must be same-origin or use `srcdoc`
- **Performance**: CSS injection happens once on load
- **Accessibility**: Always maintain keyboard navigation
- **Hot reload**: CSS changes auto-apply in development mode

---

## 📚 Related Files

- **PuzzleArea**: `src/components/puzzle/PuzzleArea.tsx`
- **Room Page**: `src/app/room/[roomCode]/page.tsx`
- **CSS Manager**: `src/lib/puzzleBridge/cssInjectionManager.ts`
- **Theme CSS**: `src/lib/puzzleRenderers/styles/eclipsecrossword-theme.css`
- **Bridge Script**: `src/lib/puzzleBridge/injectBridgeScript.ts`
- **Types**: `src/lib/puzzleBridge/types.ts`

---

Need help implementing a specific customization? Check the examples above or modify the CSS variables in `cssInjectionManager.ts`!
