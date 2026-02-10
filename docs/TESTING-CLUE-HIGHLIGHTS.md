# Testing Guide: Clue Hover Highlights

## Overview

The clue hover highlight system is now fully integrated into both single-player and multiplayer puzzle pages. This guide helps you test and verify the implementation.

## What Was Implemented

### ✅ Completed Components

1. **Enhanced CluesPanel** - Hover events with throttling
2. **useClueHighlight Hook** - Bridges hover events to iframe messages
3. **Iframe Highlight Handler** - Manages visual highlights in puzzle grid
4. **Bridge Script** - Standalone JavaScript for puzzle iframes
5. **Script Injection** - Auto-injects bridge into puzzle documents
6. **Page Integration** - Both single and multiplayer pages

### 🎨 Visual Features

- **Across clues**: Blue highlight (`rgba(59, 130, 246, 0.15)`)
- **Down clues**: Purple highlight (`rgba(168, 85, 247, 0.15)`)
- **Smooth transitions**: 200ms ease-in-out
- **Performance**: Uses `requestAnimationFrame`
- **Accessibility**: Respects `prefers-reduced-motion`

## Testing Checklist

### Prerequisites

1. ✅ Development server running on port 3004
2. ✅ At least one puzzle uploaded with clues in database
3. ✅ Browser DevTools open (F12)

### Test 1: Single Player Hover Highlights

**URL**: `/puzzles/[id]` (replace [id] with a valid puzzle ID)

**Steps**:
1. Navigate to a puzzle page
2. Wait for puzzle to load
3. Check console for: `[PuzzleArea] Bridge script, CSS, and highlight styles injected`
4. Check console for: `[PuzzlePage] Iframe bridge ready`
5. Hover over an "Across" clue
6. **Expected**: Corresponding cells highlight in blue
7. Move mouse away from clue
8. **Expected**: Highlights clear with smooth fade
9. Hover over a "Down" clue
10. **Expected**: Corresponding cells highlight in purple
11. Rapidly hover over multiple clues
12. **Expected**: Smooth transitions, no lag or flicker

**Console Messages to Look For**:
```
[PuzzleArea] Iframe loaded
[PuzzleArea] Bridge script, CSS, and highlight styles injected
[IframeBridge] Initializing...
[IframeBridge] Initialized
[PuzzlePage] Iframe bridge ready
[useClueHighlight] Highlighting clue <number> <direction> cells: <count>
```

### Test 2: Multiplayer Room Hover Highlights

**URL**: `/room/[roomCode]` (create a room first)

**Steps**:
1. Create or join a multiplayer room
2. Wait for puzzle to load
3. Check console for initialization messages
4. Hover over clues in the CluesPanel
5. **Expected**: Same highlight behavior as single player
6. Verify highlights work for spectators (read-only mode)

**Console Messages**:
```
[RoomPage] Puzzle content loaded
[PuzzleArea] Bridge script, CSS, and highlight styles injected
[RoomPage] Iframe bridge ready
```

### Test 3: Click to Focus

**Steps**:
1. Click on a clue (don't just hover)
2. **Expected**: 
   - Cells highlight
   - First cell of word receives focus (if implemented in puzzle)
   - Clue panel shows selected state

### Test 4: Edge Cases

#### Empty Clues
1. Load page with no clues yet loaded
2. **Expected**: No errors, graceful degradation
3. Wait for clues to load
4. **Expected**: Highlights start working

#### Rapid Hover
1. Quickly move mouse across multiple clues
2. **Expected**: 
   - Throttled events (max ~20/second)
   - No "flashing" effect
   - Smooth transitions

#### Direction Change
1. Hover across clue → immediately hover down clue
2. **Expected**: 
   - Previous highlights clear
   - New highlights apply
   - Smooth transition between colors

### Test 5: Browser Compatibility

Test in multiple browsers:
- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari (if on Mac)

### Test 6: Accessibility

1. Open DevTools → More Tools → Rendering
2. Enable "Emulate CSS prefers-reduced-motion"
3. Hover over clues
4. **Expected**: Transitions disabled, immediate color change

### Test 7: Mobile/Touch Devices

1. Open DevTools → Toggle device toolbar (Ctrl+Shift+M)
2. Select a mobile device
3. Try hovering/touching clues
4. **Expected**: 
   - Touch events may not trigger hover
   - Click events still work
   - No errors or visual glitches

## Debugging Tools

### Console Commands

Open browser console and try these:

```javascript
// Check if bridge is loaded
window.CrosswordBridge

// Manually trigger highlight
window.CrosswordBridge.highlightCells([
  { row: 0, col: 0 },
  { row: 0, col: 1 },
  { row: 0, col: 2 },
], 'across');

// Clear highlights
window.CrosswordBridge.clearHighlights();

// Check bridge initialization
// Look for iframe elements with data-highlighted attribute
document.querySelectorAll('[data-highlighted]');
```

### Network Tab

Check that `/scripts/iframe-bridge.js` loads:
1. DevTools → Network tab
2. Filter: JS
3. Look for `iframe-bridge.js`
4. **Expected**: Status 200, loaded successfully

If 404: The inline fallback will be used instead (this is OK).

### Console Filters

Use these filters to focus on relevant logs:

- `[IframeBridge]` - Iframe-side logs
- `[PuzzleArea]` - Injection logs
- `[useClueHighlight]` - Hover event logs
- `[PuzzlePage]` or `[RoomPage]` - Page-level logs

## Common Issues & Solutions

### Issue: Highlights Don't Appear

**Possible Causes**:
1. Clues don't have `cells` array
2. Cell selectors don't match puzzle HTML structure
3. Bridge script not loaded

**Solution**:
1. Check console for errors
2. Verify clues have cell coordinates:
   ```javascript
   console.log('Clues:', clues);
   // Should see: { across: [{ number, text, cells: [...] }], down: [...] }
   ```
3. Check if bridge initialized:
   ```javascript
   window.CrosswordBridge
   ```

### Issue: Highlights Lag or Stutter

**Possible Causes**:
1. Too many rapid hover events
2. Heavy DOM manipulations elsewhere

**Solution**:
1. Increase throttle interval in CluesPanel
2. Check for other performance issues on page
3. Reduce transition duration

### Issue: Wrong Colors

**Check**:
1. CSS variables properly set
2. Theme not overriding colors
3. Browser supports `rgba()`

### Issue: Highlights Stick

**If highlights don't clear**:
1. Check `CLEAR_HIGHLIGHT` messages sent
2. Verify `handleMouseLeave` fires
3. Check console for errors in `clearHighlights()`

## Performance Metrics

### Expected Performance

- **Hover event frequency**: Max ~20 events/second (50ms throttle)
- **Message latency**: < 5ms (parent → iframe)
- **Visual update**: 1 frame (16.67ms @ 60fps)
- **Memory**: Minimal (< 1MB for highlight state)

### Measuring Performance

1. DevTools → Performance tab
2. Start recording
3. Hover over multiple clues
4. Stop recording
5. **Look for**:
   - No layout thrashing
   - RequestAnimationFrame callbacks
   - Minimal scripting time

## Success Criteria

✅ **Pass** if ALL of these are true:

1. Hovering clue highlights corresponding cells
2. Colors are distinct (blue for across, purple for down)
3. Transitions are smooth (200ms)
4. No console errors
5. Performance is smooth (no lag)
6. Works in single and multiplayer modes
7. Respects `prefers-reduced-motion`
8. Bridge script loads or fallback works

## Next Steps After Testing

Once testing is complete:

1. ✅ Ensure clues have cell coordinates in database
2. ✅ Test with real puzzle data
3. 🔄 Adjust colors/transitions if needed
4. 🔄 Add reverse lookup (cell → clue highlight)
5. 🔄 Add keyboard navigation
6. 🔄 Add animations for correct/incorrect feedback

## Reporting Issues

If you find bugs, note:
- Browser and version
- Puzzle ID or room code
- Steps to reproduce
- Console errors (if any)
- Screenshots/screen recording

## Related Files

**Implementation**:
- `src/components/puzzle/CluesPanel.tsx`
- `src/lib/puzzleBridge/useClueHighlight.ts`
- `src/lib/puzzleBridge/iframeHighlightHandler.ts`
- `public/scripts/iframe-bridge.js`
- `src/app/puzzles/[id]/page.tsx`
- `src/app/room/[roomCode]/page.tsx`

**Styles**:
- Injected via `injectHighlightStyles()`
- CSS variables in puzzle iframes

**Documentation**:
- `docs/clue-highlight-integration-example.md`
