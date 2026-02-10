# Chrome DevTools Testing Guide for Crossword Input

## Step 1: Open the Page

Navigate to either:
- **Single-player**: http://localhost:3004/puzzles/100
- **Multiplayer**: http://localhost:3004/room/US843V

## Step 2: Open Chrome DevTools

Press **F12** or **Ctrl+Shift+I** (Windows/Linux) or **Cmd+Option+I** (Mac)

## Step 3: Run These Tests in Console

### Test 1: Check if Iframe is Accessible

```javascript
// Check iframe presence
const iframe = document.querySelector('iframe');
console.log('✅ Iframe found:', !!iframe);

// Check if we can access iframe content
const iframeDoc = iframe?.contentDocument || iframe?.contentWindow?.document;
console.log('✅ Iframe document accessible:', !!iframeDoc);

// Check for crossword table
const crosswordTable = iframeDoc?.getElementById('crossword');
console.log('✅ Crossword table found:', !!crosswordTable);
```

### Test 2: Check for Input Cells

```javascript
// Find all input cells
const iframe = document.querySelector('iframe');
const iframeDoc = iframe?.contentDocument;
const cells = iframeDoc?.querySelectorAll('[id^="c"]');
console.log('✅ Total cells found:', cells?.length);

// List first 5 cells
if (cells && cells.length > 0) {
  console.log('First 5 cells:');
  Array.from(cells).slice(0, 5).forEach(cell => {
    console.log(`  - ${cell.id}: contentEditable=${cell.contentEditable}, textContent="${cell.textContent}"`);
  });
}
```

### Test 3: Test Manual Input on First Cell

```javascript
// Find first editable cell
const iframe = document.querySelector('iframe');
const iframeDoc = iframe?.contentDocument;
const cells = iframeDoc?.querySelectorAll('[id^="c"]');
const firstCell = cells?.[0];

if (firstCell) {
  console.log('Testing input on cell:', firstCell.id);
  
  // Try to focus it
  firstCell.focus();
  console.log('✅ Cell focused');
  
  // Try to set content
  firstCell.textContent = 'A';
  console.log('✅ Set content to "A"');
  
  // Trigger input event
  const inputEvent = new Event('input', { bubbles: true });
  firstCell.dispatchEvent(inputEvent);
  console.log('✅ Input event dispatched');
  
  console.log('Current value:', firstCell.textContent);
} else {
  console.error('❌ No cells found');
}
```

### Test 4: Check for Event Listeners

```javascript
// Check if input monitoring is set up
const iframe = document.querySelector('iframe');
const iframeDoc = iframe?.contentDocument;
const crosswordTable = iframeDoc?.getElementById('crossword');

if (crosswordTable) {
  console.log('Crossword table found');
  
  // Test if input event fires
  crosswordTable.addEventListener('input', (e) => {
    console.log('🎯 Input event detected on:', e.target.id, 'value:', e.target.textContent);
  }, true);
  
  console.log('✅ Test listener attached. Now try typing in a cell manually.');
} else {
  console.error('❌ Crossword table not found');
}
```

### Test 5: Check Multiplayer Setup (For Room Pages Only)

```javascript
// Check if PuzzleArea has multiplayer enabled
const iframe = document.querySelector('iframe');
const contentWindow = iframe?.contentWindow;

console.log('Checking multiplayer setup:');
console.log('  __enableMultiplayer exists:', typeof contentWindow?.__enableMultiplayer);
console.log('  __applyRemoteCellUpdate exists:', typeof contentWindow?.__applyRemoteCellUpdate);

// Check React component props (if available)
const puzzleArea = document.querySelector('[class*="PuzzleArea"]');
console.log('  PuzzleArea element:', !!puzzleArea);
```

### Test 6: Monitor All Input Events (Live)

```javascript
// Create a comprehensive input monitor
const iframe = document.querySelector('iframe');
const iframeDoc = iframe?.contentDocument;

if (iframeDoc) {
  console.log('🔍 Starting input monitor...');
  
  // Monitor at document level
  iframeDoc.addEventListener('input', (e) => {
    console.log('📝 INPUT:', {
      target: e.target.id || e.target.tagName,
      value: e.target.textContent || e.target.value,
      timestamp: new Date().toLocaleTimeString()
    });
  }, true);
  
  iframeDoc.addEventListener('keydown', (e) => {
    console.log('⌨️ KEYDOWN:', {
      key: e.key,
      target: e.target.id || e.target.tagName,
      timestamp: new Date().toLocaleTimeString()
    });
  }, true);
  
  iframeDoc.addEventListener('click', (e) => {
    console.log('🖱️ CLICK:', {
      target: e.target.id || e.target.tagName,
      timestamp: new Date().toLocaleTimeString()
    });
  }, true);
  
  console.log('✅ Monitor active. Click and type in the puzzle to see events.');
} else {
  console.error('❌ Cannot access iframe document');
}
```

### Test 7: Simulate Cell Update (For Testing Broadcasting)

```javascript
// Simulate typing in a cell
const iframe = document.querySelector('iframe');
const iframeDoc = iframe?.contentDocument;
const testCell = iframeDoc?.getElementById('c001001'); // Adjust cell ID as needed

if (testCell) {
  console.log('Simulating input on:', testCell.id);
  
  testCell.textContent = 'Z';
  const event = new Event('input', { bubbles: true });
  testCell.dispatchEvent(event);
  
  console.log('✅ Simulated input. Check if broadcast was triggered.');
} else {
  console.error('❌ Test cell not found. Try: iframeDoc.querySelector("[id^=c]").id');
  const anyCell = iframeDoc?.querySelector('[id^="c"]');
  if (anyCell) {
    console.log('📍 Try this cell ID instead:', anyCell.id);
  }
}
```

## Expected Results

### Working Single-Player:
```
✅ Iframe found: true
✅ Iframe document accessible: true
✅ Crossword table found: true
✅ Total cells found: 225 (or similar)
📝 INPUT: { target: "c001001", value: "A", timestamp: "11:15:30" }
```

### Working Multiplayer:
```
✅ Iframe found: true
✅ Crossword table found: true
✅ Test listener attached
📝 INPUT: { target: "c001001", value: "A" }
[PuzzleArea] Direct input detected: c001001 A
[RoomPage] Cell update from puzzle: {type: 'cell_update', cellId: 'c001001', value: 'A'}
```

### If Input NOT Working:
```
❌ Crossword table not found
OR
❌ Iframe document not accessible (CORS/Sandbox issue)
OR
No INPUT events firing when typing
```

## Debugging Steps

### If no input events fire:
1. Check if cells have `contentEditable="true"` or are form inputs
2. Check browser console for security errors
3. Verify iframe sandbox attributes allow scripts and same-origin

### If cells are not editable:
```javascript
// Make a cell editable
const cell = iframe.contentDocument.getElementById('c001001');
cell.contentEditable = 'true';
console.log('Made cell editable. Try typing now.');
```

### If you see CORS errors:
The iframe sandbox needs `allow-same-origin` - check PuzzleArea.tsx line 446:
```typescript
sandbox="allow-scripts allow-same-origin"
```

## Quick Diagnostic

Run this all-in-one diagnostic:

```javascript
(function diagnosticTest() {
  console.log('=== CROSSWORD INPUT DIAGNOSTIC ===\n');
  
  const iframe = document.querySelector('iframe');
  const iframeDoc = iframe?.contentDocument;
  const crosswordTable = iframeDoc?.getElementById('crossword');
  const cells = iframeDoc?.querySelectorAll('[id^="c"]');
  const firstCell = cells?.[0];
  
  const results = {
    '1. Iframe exists': !!iframe,
    '2. Iframe accessible': !!iframeDoc,
    '3. Crossword table found': !!crosswordTable,
    '4. Cells found': cells?.length || 0,
    '5. First cell ID': firstCell?.id || 'N/A',
    '6. First cell contentEditable': firstCell?.contentEditable || 'N/A',
    '7. First cell is input': firstCell?.tagName === 'INPUT',
    '8. First cell is div/td': ['DIV', 'TD'].includes(firstCell?.tagName),
  };
  
  console.table(results);
  
  if (firstCell) {
    console.log('\n🔬 Testing first cell...');
    const oldValue = firstCell.textContent;
    firstCell.textContent = 'TEST';
    const newValue = firstCell.textContent;
    console.log(`  Changed "${oldValue}" → "${newValue}"`);
    console.log(`  ✅ Cell is writable: ${newValue === 'TEST'}`);
    firstCell.textContent = oldValue; // Restore
  }
  
  console.log('\n=== END DIAGNOSTIC ===');
})();
```
