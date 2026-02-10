# ClueProvider Migration Guide

## Overview

This guide explains how to migrate puzzle pages from **direct iframe clue extraction** to the **database-first ClueProvider** system for improved performance, reliability, and caching.

---

## Benefits of ClueProvider

- **Database-first caching**: Clues are parsed once and stored in PostgreSQL
- **Instant loading**: Clues load from DB without waiting for iframe
- **Automatic fallback**: Falls back to iframe parsing if DB cache is unavailable
- **Version tracking**: File hashing ensures cache invalidation on puzzle updates
- **Background sync**: Periodic cache refresh in production
- **Centralized management**: Admin tools for monitoring and cache control

---

## Migration Steps

### Step 1: Wrap Your Page with ClueProvider

**Before:**
```tsx path=null start=null
export default function PuzzlePage({ params }: PuzzlePageProps) {
  const [clues, setClues] = useState<{ across: any[]; down: any[] }>({ 
    across: [], 
    down: [] 
  });
  
  // ... rest of component
}
```

**After:**
```tsx path=null start=null
import { ClueProvider } from '@/contexts/ClueProvider';

export default function PuzzlePage({ params }: PuzzlePageProps) {
  const puzzleId = parseInt(params.id, 10);
  
  return (
    <ClueProvider puzzleId={puzzleId}>
      <PuzzlePageContent params={params} />
    </ClueProvider>
  );
}

function PuzzlePageContent({ params }: PuzzlePageProps) {
  // Component logic here
}
```

---

### Step 2: Replace Direct Clue Extraction with useClueProvider

**Before:**
```tsx path=null start=null
import { extractCluesWithRetry, formatCluesForDisplay } from '@/lib/clueExtraction';

// In component:
useEffect(() => {
  if (!puzzleContent || !iframeRef.current) return;

  const timer = setTimeout(async () => {
    const extractedClues = await extractCluesWithRetry(iframeRef.current);
    const formatted = formatCluesForDisplay(extractedClues);
    setClues(formatted);
  }, 1000);

  return () => clearTimeout(timer);
}, [puzzleContent]);
```

**After:**
```tsx path=null start=null
import { useClueProvider } from '@/hooks/useClueProvider';

// In component:
const { clues, loading, error, refresh } = useClueProvider();

// No manual extraction needed - clues are loaded automatically
```

---

### Step 3: Update Component to Use Hook Data

**Before:**
```tsx path=null start=null
const [clues, setClues] = useState<{ across: any[]; down: any[] }>({ 
  across: [], 
  down: [] 
});

// Later in JSX:
<CluesPanel
  acrossClues={clues.across}
  downClues={clues.down}
/>
```

**After:**
```tsx path=null start=null
const { clues, loading, error } = useClueProvider();

// Later in JSX:
{loading && <div>Loading clues...</div>}
{error && <div>Error loading clues: {error}</div>}

<CluesPanel
  acrossClues={clues.across}
  downClues={clues.down}
/>
```

---

### Step 4: Pass iframe Ref for Fallback Support

The ClueProvider needs the iframe ref for fallback parsing:

```tsx path=null start=null
const iframeRef = useRef<HTMLIFrameElement>(null);

return (
  <ClueProvider puzzleId={puzzleId} iframeRef={iframeRef}>
    <PuzzlePageContent iframeRef={iframeRef} />
  </ClueProvider>
);
```

---

## Complete Example: SinglePlayer Page Migration

### Before (Direct Extraction)

```tsx path=null start=null
"use client";

import { useState, useEffect, useRef } from "react";
import { extractCluesWithRetry, formatCluesForDisplay } from "@/lib/clueExtraction";
import { CluesPanel } from "@/components/puzzle/CluesPanel";
import { PuzzleArea } from "@/components/puzzle/PuzzleArea";

export default function PuzzlePage({ params }: PuzzlePageProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [puzzle, setPuzzle] = useState<PuzzleData | null>(null);
  const [puzzleContent, setPuzzleContent] = useState<string | null>(null);
  const [clues, setClues] = useState<{ across: any[]; down: any[] }>({ 
    across: [], 
    down: [] 
  });

  // Fetch puzzle
  useEffect(() => {
    const fetchPuzzle = async () => {
      const response = await fetch(`/api/puzzles/${params.id}`);
      const data = await response.json();
      setPuzzle(data);
      
      const contentResponse = await fetch(`/api/puzzles/${params.id}/content`);
      const contentData = await contentResponse.json();
      setPuzzleContent(contentData.content);
    };
    
    fetchPuzzle();
  }, [params.id]);

  // Extract clues from iframe
  useEffect(() => {
    if (!puzzleContent || !iframeRef.current) return;

    const timer = setTimeout(async () => {
      const extractedClues = await extractCluesWithRetry(iframeRef.current);
      const formatted = formatCluesForDisplay(extractedClues);
      setClues(formatted);
    }, 1000);

    return () => clearTimeout(timer);
  }, [puzzleContent]);

  return (
    <div>
      <PuzzleArea 
        puzzleContent={puzzleContent} 
        iframeRef={iframeRef} 
      />
      <CluesPanel 
        acrossClues={clues.across} 
        downClues={clues.down} 
      />
    </div>
  );
}
```

### After (ClueProvider)

```tsx path=null start=null
"use client";

import { useState, useEffect, useRef } from "react";
import { ClueProvider } from "@/contexts/ClueProvider";
import { useClueProvider } from "@/hooks/useClueProvider";
import { CluesPanel } from "@/components/puzzle/CluesPanel";
import { PuzzleArea } from "@/components/puzzle/PuzzleArea";

export default function PuzzlePage({ params }: PuzzlePageProps) {
  const puzzleId = parseInt(params.id, 10);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  return (
    <ClueProvider puzzleId={puzzleId} iframeRef={iframeRef}>
      <PuzzlePageContent params={params} iframeRef={iframeRef} />
    </ClueProvider>
  );
}

function PuzzlePageContent({ 
  params, 
  iframeRef 
}: { 
  params: any; 
  iframeRef: React.RefObject<HTMLIFrameElement>; 
}) {
  const [puzzle, setPuzzle] = useState<PuzzleData | null>(null);
  const [puzzleContent, setPuzzleContent] = useState<string | null>(null);
  
  // Clues are now provided by the context
  const { clues, loading: cluesLoading, error: cluesError } = useClueProvider();

  // Fetch puzzle (same as before)
  useEffect(() => {
    const fetchPuzzle = async () => {
      const response = await fetch(`/api/puzzles/${params.id}`);
      const data = await response.json();
      setPuzzle(data);
      
      const contentResponse = await fetch(`/api/puzzles/${params.id}/content`);
      const contentData = await contentResponse.json();
      setPuzzleContent(contentData.content);
    };
    
    fetchPuzzle();
  }, [params.id]);

  return (
    <div>
      <PuzzleArea 
        puzzleContent={puzzleContent} 
        iframeRef={iframeRef} 
      />
      
      {cluesLoading && <div>Loading clues...</div>}
      {cluesError && <div>Error: {cluesError}</div>}
      
      <CluesPanel 
        acrossClues={clues.across} 
        downClues={clues.down} 
      />
    </div>
  );
}
```

---

## Key Differences

| Aspect | Before (Direct Extraction) | After (ClueProvider) |
|--------|---------------------------|----------------------|
| **Clue Loading** | `extractCluesWithRetry(iframe)` | `useClueProvider()` hook |
| **State Management** | Local `useState` for clues | Context-provided clues |
| **Caching** | No caching, extracted on every load | Database-first with automatic caching |
| **Fallback** | Manual iframe extraction only | Automatic iframe fallback if DB unavailable |
| **Performance** | Slower, waits for iframe | Instant from DB, iframe as fallback |
| **Version Control** | No cache invalidation | Automatic via file hash tracking |

---

## Handling Loading & Error States

The ClueProvider provides `loading` and `error` states for proper UI feedback:

```tsx path=null start=null
const { clues, loading, error, refresh } = useClueProvider();

// Show loading state
if (loading) {
  return (
    <div className="flex items-center justify-center p-4">
      <Loader2 className="h-6 w-6 animate-spin" />
      <span className="ml-2">Loading clues...</span>
    </div>
  );
}

// Show error state with retry
if (error) {
  return (
    <div className="p-4 border border-red-500 rounded">
      <p className="text-red-600">Failed to load clues: {error}</p>
      <button onClick={refresh} className="mt-2 px-4 py-2 bg-blue-500 text-white rounded">
        Retry
      </button>
    </div>
  );
}

// Render clues normally
return <CluesPanel acrossClues={clues.across} downClues={clues.down} />;
```

---

## Manual Refresh

To manually refresh clues (e.g., after puzzle content updates):

```tsx path=null start=null
const { refresh } = useClueProvider();

// Trigger refresh
const handleRefresh = async () => {
  await refresh();
};

return (
  <button onClick={handleRefresh}>
    Refresh Clues
  </button>
);
```

---

## Multiplayer Page Migration

For multiplayer pages, the pattern is identical:

```tsx path=null start=null
export default function MultiplayerPage({ params }: MultiplayerPageProps) {
  const { roomCode } = params;
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  // Get puzzle ID from room data
  const [puzzleId, setPuzzleId] = useState<number | null>(null);
  
  useEffect(() => {
    const fetchRoom = async () => {
      const response = await fetch(`/api/room/${roomCode}`);
      const room = await response.json();
      setPuzzleId(room.puzzleId);
    };
    
    fetchRoom();
  }, [roomCode]);
  
  if (!puzzleId) return <div>Loading...</div>;
  
  return (
    <ClueProvider puzzleId={puzzleId} iframeRef={iframeRef}>
      <MultiplayerContent roomCode={roomCode} iframeRef={iframeRef} />
    </ClueProvider>
  );
}

function MultiplayerContent({ roomCode, iframeRef }) {
  const { clues, loading, error } = useClueProvider();
  
  // Use clues here...
}
```

---

## Testing the Migration

After migration, verify:

1. **Clues load instantly** from database on first load
2. **Fallback works** when DB is unavailable (check console logs)
3. **Cache invalidates** when puzzle file changes
4. **Loading states** display correctly during clue fetch
5. **Error states** handle network failures gracefully

---

## Rollback Strategy

If issues occur, you can temporarily revert by:

1. Removing `ClueProvider` wrapper
2. Re-adding direct extraction logic
3. Restoring local clue state

The database cache remains unaffected and will continue working once migration is complete.

---

## Additional Resources

- **ClueProvider Source**: `src/contexts/ClueProvider.tsx`
- **useClueProvider Hook**: `src/hooks/useClueProvider.ts`
- **Clue Repository**: `src/lib/clueCache/ClueRepository.ts`
- **API Endpoints**: `src/app/api/puzzles/[id]/clues/route.ts`
- **Clue Caching System Docs**: `src/lib/clueCache/README.md`

---

## Summary

Migrating to ClueProvider is straightforward:

1. Wrap your page with `<ClueProvider puzzleId={id} iframeRef={ref}>`
2. Replace direct extraction with `useClueProvider()` hook
3. Remove manual clue state management
4. Handle loading/error states from the hook

**Result**: Faster clue loading, database caching, automatic fallback, and centralized management.
