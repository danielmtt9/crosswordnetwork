# Help Center

Crossword.Network is built around a simple promise: you can start a puzzle, come back later, and keep going without losing your work.

If you are stuck or something feels off, this page explains how solving, saving, continuing, and hints work on crossword.network.

## Getting Started

1. Go to **Puzzles** and pick a puzzle.
2. Click **Start Puzzle** to begin a fresh attempt.
3. Use the clue list to select a clue and the grid will highlight the linked boxes.

## Start Puzzle vs Continue Puzzles

### Start Puzzle

**Start Puzzle** is meant to be a clean slate.

- If you have progress saved for that puzzle, starting fresh should clear it and begin empty.
- We do this so that "Start" never unexpectedly drops you into an old attempt.

### Continue Puzzles

**Continue Puzzles** is a list of puzzles you started but have not finished.

- For signed-in users, this comes from your saved progress in the database.
- For guests, this is stored on your device (browser storage).

### 7-day time limit for unfinished puzzles

Unfinished attempts have a **7-day window**. After that, unfinished progress may expire and stop appearing in Continue.

If you want your progress to follow you across devices, sign in.

## Saving and Persistence

### Autosave (always on)

Autosave is always enabled while you solve.

- It saves while you are playing.
- It also attempts to save when you switch tabs or close the page.

### Save Now

**Save Now** forces a save immediately. Use it when you are about to leave and want confirmation your progress is stored.

### Guests vs signed-in users

- **Guests**: progress is saved on the current device and browser. Clearing browser data, using private browsing, or switching devices can cause progress to disappear.
- **Signed-in**: progress is saved to your account so you can continue on another device.

### Refreshing the page

Refreshing should load your latest saved state:

- For guests: from local browser storage.
- For signed-in users: from the database (plus local fallback if needed).

If refresh always starts a new puzzle for you, see troubleshooting below.

## Hints (Reveal Letter / Reveal Word)

Crossword.Network supports the following hints:

- **Reveal Letter**: reveals the current selected letter.
- **Reveal Word**: reveals the full selected word.

Hints are counted (so you can track how many you used).

## Theme and Solver Modes

### Light/Dark theme

Use the theme toggle on the puzzle page to switch between light and dark modes.

### ECW Classic vs Premium

Some puzzles are rendered using the EclipseCrossword solver inside an iframe.

- **Classic**: the most stable rendering mode.
- **Premium**: improved styling and readability. If the grid ever looks distorted, the site can automatically fall back to Classic.

## Troubleshooting

### The puzzle does not load

Try:

- Refresh the page.
- Disable strict content blockers for crossword.network.
- If your browser blocks iframes or scripts, the grid may not render correctly.

### My progress is not persisting

Common causes:

- You are playing as a guest and your browser is clearing site data.
- You are using private browsing.
- Cookies or storage are disabled for crossword.network.
- Your unfinished attempt expired after 7 days.

If you are signed in and still losing progress, contact support and include the puzzle ID.

### Mobile clue drawer

On mobile, clues may appear in a drawer. Tap **Clues**, pick a clue, and the drawer will close so you can focus on the grid.

## Contact Support

If you need help, contact us and include:

- puzzle ID (from the URL like `/puzzles/123`)
- what you clicked
- device + browser
- screenshot if possible

Contact: support@crossword.network

