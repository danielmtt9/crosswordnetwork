# UI Component Inventory - Web Application

## Overview
The UI is built with React (Next.js), Tailwind CSS, and Radix UI primitives.

## Component Categories

### UI Primitives (`src/components/ui`)
Reusable base components (likely Shadcn UI or similar):
- Buttons, Inputs, Dialogs, Dropdowns, Avatars, Progress bars, etc.

### Layouts (`src/components/layouts`)
- Application shells, wrappers, and structural components.

### Puzzle Gameplay (`src/components/puzzle`)
- **Grid**: The crossword grid.
- **ClueList**: Display of across/down clues.
- **Keyboard**: Virtual keyboard (if applicable).
- **Timer**: Game timer.
- **Controls**: Game controls (Check, Reveal, Reset).

### Multiplayer (`src/components/puzzle` or `src/app/rooms`)
- **RoomLobby**: Waiting area.
- **Chat**: Room chat.
- **PlayerList**: List of participants.

### Social & Engagement
- **Achievements** (`src/components/achievements`): Achievement cards, lists, toasts.
- **Leaderboards** (`src/components/leaderboards`): Ranking tables.
- **Social** (`src/components/social`): Friend lists, invites.
- **Rewards** (`src/components/rewards`): Reward displays.

### Admin (`src/components/admin`)
- **Dashboard**: Admin overview.
- **UserManagement**: User tables and edit forms.
- **PuzzleManagement**: Puzzle upload and edit tools.
- **Analytics**: Charts and data visualization.

### Analytics (`src/components/analytics`)
- Visualizations for user and system stats.
