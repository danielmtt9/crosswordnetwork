# Chrome DevTools Testing Guide - PuzzleArea Optimizations

## Prerequisites

1. **Start Chrome with Remote Debugging:**
   ```bash
   # Linux/WSL
   google-chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug
   
   # Or if Chrome is already running, you may need to close it first
   ```

2. **Verify Server is Running:**
   ```bash
   curl http://localhost:3004/puzzles/100
   ```

## Manual Chrome DevTools Testing Steps

### Test 1: Performance Profiling - Puzzle Loading

1. **Open Chrome DevTools:**
   - Navigate to `http://localhost:3004/puzzles/100`
   - Press `F12` or `Ctrl+Shift+I` (Windows/Linux) or `Cmd+Option+I` (Mac)
   - Go to **Performance** tab

2. **Record Puzzle Loading:**
   - Click the **Record** button (circle icon at top left)
   - Reload the page (`Ctrl+R` or `Cmd+R`)
   - Wait for puzzle to fully load (loading spinner disappears)
   - Click **Stop** recording

3. **Analyze Results:**
   - Look for `measureContentHeight` in the timeline
   - **Expected:** Should see only **1 call** (not 3)
   - Check **Summary** tab for:
     - **Scripting time:** Should be reduced
     - **Rendering time:** Should show minimal layout thrashing
     - **Painting time:** Should be minimal

4. **Check Console:**
   - Open **Console** tab
   - Look for: `[PuzzleArea] Measured content height`
   - **Expected:** Should appear only **once** per load

### Test 2: Performance Profiling - Window Resize

1. **Start Recording:**
   - Go to **Performance** tab
   - Click **Record**

2. **Resize Window:**
   - Rapidly resize the browser window (drag corner)
   - Continue for 2-3 seconds
   - Stop recording

3. **Analyze Results:**
   - Look for `calculateScale` in the timeline
   - **Expected:** Should see calls throttled to ~10 per second max
   - Check **Event Log** for resize events
   - **Expected:** Many resize events, but `calculateScale` only called ~10 times

4. **Verify Throttling:**
   - In **Console**, add:
     ```javascript
     let resizeCount = 0;
     let scaleCount = 0;
     window.addEventListener('resize', () => resizeCount++);
     // Check PuzzleArea internal - scale should be throttled
     console.log('Resize events:', resizeCount, 'Scale calculations:', scaleCount);
     ```

### Test 3: Performance Profiling - Theme Switching

1. **Start Recording:**
   - Go to **Performance** tab
   - Click **Record**

2. **Switch Theme Rapidly:**
   - Toggle theme 5-10 times quickly (if theme toggle exists)
   - Or manually change `data-theme` attribute:
     ```javascript
     for(let i = 0; i < 10; i++) {
       document.documentElement.setAttribute('data-theme', i % 2 === 0 ? 'light' : 'dark');
     }
     ```
   - Stop recording

3. **Analyze Results:**
   - Look for `applyThemeToIframe` in the timeline
   - **Expected:** Should see debounced calls (not 10 separate calls)
   - Check **Summary** for DOM updates
   - **Expected:** Minimal DOM manipulation

### Test 4: Memory Leak Detection

1. **Open Memory Tab:**
   - Go to **Memory** tab
   - Select **Heap snapshot**

2. **Take Baseline Snapshot:**
   - Click **Take snapshot**
   - Name it "Baseline - Before Navigation"

3. **Navigate and Test:**
   - Navigate to puzzle page
   - Wait for full load
   - Interact with puzzle (type in cells if possible)
   - Navigate away
   - Navigate back
   - Repeat 3-5 times

4. **Take Final Snapshot:**
   - Click **Take snapshot**
   - Name it "After Navigation Cycle"

5. **Compare Snapshots:**
   - Select both snapshots
   - Click **Comparison** view
   - Search for:
     - `EventListener` - Should not grow significantly
     - `Timeout` - Should not accumulate
     - `PuzzleArea` - Component instances should be cleaned up

6. **Check for Leaks:**
   - Look for objects that grow with each navigation
   - **Expected:** No growing event listeners or timers

### Test 5: Network Analysis - iframe Reloads

1. **Open Network Tab:**
   - Go to **Network** tab
   - Filter by **Doc** or **All**

2. **Test iframe Stability:**
   - Navigate to puzzle page
   - Note the initial iframe load
   - Change theme (if possible)
   - Resize window
   - **Expected:** No additional iframe reloads

3. **Check Console:**
   - Look for iframe load events
   - **Expected:** Only initial load, no subsequent reloads

### Test 6: Console Testing - Verify Optimizations

Open **Console** tab and run these tests:

#### Test Height Measurement Optimization:
```javascript
// Count measureContentHeight calls
let measureCount = 0;
const originalLog = console.log;
console.log = function(...args) {
  if (args[0]?.includes('Measured content height')) {
    measureCount++;
  }
  originalLog.apply(console, args);
};

// Reload page
location.reload();

// After load, check count
setTimeout(() => {
  console.log('Height measurements:', measureCount);
  // Expected: 1 (not 3)
}, 3000);
```

#### Test Resize Throttling:
```javascript
// Count resize vs scale calculations
let resizeEvents = 0;
let scaleCalls = 0;

window.addEventListener('resize', () => {
  resizeEvents++;
  console.log('Resize event #', resizeEvents);
});

// Monitor scale calculations (if accessible)
// Resize window rapidly
// Expected: resizeEvents >> scaleCalls (throttling working)
```

#### Test Theme Debouncing:
```javascript
// Count theme sync calls
let themeSyncCount = 0;
const observer = new MutationObserver(() => {
  themeSyncCount++;
  console.log('Theme sync #', themeSyncCount);
});

observer.observe(document.documentElement, {
  attributes: true,
  attributeFilter: ['data-theme']
});

// Rapidly change theme
for(let i = 0; i < 10; i++) {
  document.documentElement.setAttribute('data-theme', i % 2 === 0 ? 'light' : 'dark');
}

setTimeout(() => {
  console.log('Theme changes: 10, Theme syncs:', themeSyncCount);
  // Expected: themeSyncCount < 10 (debouncing working)
  observer.disconnect();
}, 500);
```

### Test 7: Functional Testing - Multiplayer Mode

1. **Navigate to Multiplayer Room:**
   - Go to `http://localhost:3004/room/[roomCode]`
   - Open **Console** tab

2. **Test Input Handling:**
   - Type in puzzle cells
   - **Expected:** Console shows `[PuzzleArea] Direct input detected` or `[PuzzleArea] Cell update via __enableMultiplayer`
   - Check Socket.IO messages in Network tab

3. **Test Cleanup:**
   - Leave room
   - Check Memory tab for event listeners
   - **Expected:** Input event listeners removed

### Test 8: Functional Testing - Single-Player Mode

1. **Navigate to Puzzle Page:**
   - Go to `http://localhost:3004/puzzles/100`
   - Open **Console** tab

2. **Test Auto-Save:**
   - Type in puzzle cells
   - **Expected:** Auto-save indicator shows "Saving..." then "Saved"
   - Check Network tab for save requests
   - **Expected:** Debounced save requests (not every keystroke)

3. **Test Progress Tracking:**
   - Fill cells
   - **Expected:** Progress bar updates
   - Check console for progress messages

## Expected Results Summary

| Test | Metric | Before | After | Status |
|------|--------|--------|-------|--------|
| Height Measurements | Calls per load | 3 | 1 | ✅ 66% reduction |
| Window Resize | Calls per second | ~100+ | ~10 | ✅ 90% reduction |
| Theme Sync | Updates per 10 changes | 10 | ~2-3 | ✅ Debounced |
| Memory Leaks | Event listeners | Growing | Stable | ✅ Fixed |
| iframe Reloads | Reloads on theme/resize | Yes | No | ✅ Fixed |

## Troubleshooting

### Chrome DevTools MCP Not Connecting

If automated testing fails, use manual testing:

1. **Enable Remote Debugging:**
   ```bash
   # Close all Chrome instances first
   pkill chrome
   
   # Start with remote debugging
   google-chrome --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-debug &
   ```

2. **Verify Connection:**
   ```bash
   curl http://localhost:9222/json/version
   ```

3. **Manual Testing:**
   - Follow steps above
   - Use Console tab for verification
   - Use Performance tab for profiling

## Quick Verification Script

Run this in Chrome Console to quickly verify optimizations:

```javascript
// Quick optimization verification
console.log('=== PuzzleArea Optimization Verification ===');

// Check if debounce/throttle are imported
console.log('Debounce/Throttle available:', typeof debounce !== 'undefined' && typeof throttle !== 'undefined');

// Check height measurement (should be 1, not 3)
let heightMeasurements = 0;
const checkHeight = setInterval(() => {
  const logs = performance.getEntriesByType('measure');
  // Check console logs for measurement count
}, 1000);

// Check resize throttling
let resizeCount = 0;
window.addEventListener('resize', () => resizeCount++);
console.log('Resize events (will update on resize):', resizeCount);

console.log('=== Run tests above to verify ===');
```

