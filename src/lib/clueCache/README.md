# Clue Caching System

Database-first clue loading with hash-based versioning and iframe fallback for crossword puzzles.

## Overview

The clue caching system provides efficient, consistent clue delivery by:

1. **Database-first**: Always try to fetch from cached clues
2. **Hash-based versioning**: Automatically detect puzzle file changes
3. **Iframe fallback**: Parse HTML if cache miss or stale data
4. **Automatic caching**: Save parsed clues asynchronously
5. **Comprehensive logging**: Track cache performance and issues

## Architecture

```
┌─────────────────────────────────────────┐
│         Request Clues (puzzleId)        │
└─────────────────┬───────────────────────┘
                  │
          ┌───────▼────────┐
          │ ClueRepository │
          └───────┬────────┘
                  │
         ┌────────▼─────────┐
         │ Generate FileHash│
         └────────┬─────────┘
                  │
         ┌────────▼─────────┐
         │  Check Database  │
         │  (puzzleId +     │
         │   fileHash)      │
         └────────┬─────────┘
                  │
         ┌────────▼────────┐
         │  Cache Exists?  │
         └────────┬────────┘
                  │
         ┌────────┴────────┐
         │                 │
     ✅ HIT              ❌ MISS
         │                 │
    ┌────▼─────┐     ┌────▼──────────┐
    │ Return   │     │ Parse Iframe  │
    │ Cached   │     │ HTML File     │
    │ Clues    │     └────┬──────────┘
    └──────────┘          │
                     ┌────▼──────────┐
                     │ Save to DB    │
                     │ (async)       │
                     └────┬──────────┘
                          │
                     ┌────▼──────────┐
                     │ Return Clues  │
                     └───────────────┘
```

## Components

### 1. **ClueRepository** (`clueRepository.ts`)

Central service implementing the hybrid loading strategy.

**Key Methods:**
- `getClues(puzzleId)` - Main method with database-first logic
- `refreshClues(puzzleId)` - Force refresh from iframe
- `invalidateCache(puzzleId)` - Mark cache as invalid
- `getCacheStats()` - Get cache performance metrics
- `bulkRefresh(puzzleIds[])` - Refresh multiple puzzles

**Example:**
```typescript
import { clueRepository } from '@/lib/clueCache/clueRepository';

const result = await clueRepository.getClues(123);

if (result.clues) {
  console.log('Clues loaded from:', result.sourceInfo.source);
  console.log('Across clues:', result.clues.across.length);
  console.log('Down clues:', result.clues.down.length);
}
```

### 2. **ClueParser** (`clueParser.ts`)

Extracts and normalizes clues from EclipseCrossword HTML files.

**Key Functions:**
- `parseCluesFromHTML(html)` - Parse from HTML string
- `parseCluesFromFile(path)` - Parse from file path
- `validateClues(clues)` - Validate parsed clues
- `serializeClues(clues)` - Convert to JSON for storage
- `deserializeClues(json)` - Convert from JSON

**Example:**
```typescript
import { parseCluesFromFile } from '@/lib/clueCache/clueParser';

const result = await parseCluesFromFile('/path/to/puzzle.html');

if (result.success) {
  console.log(`Parsed in ${result.parseTimeMs}ms`);
  console.log(`Found ${result.clues?.across.length} across clues`);
}
```

### 3. **File Hash Utility** (`fileHash.ts`)

Generates SHA-256 hashes for version tracking.

**Key Functions:**
- `generateFileHash(path)` - Hash entire file
- `generateWordlistHash(html)` - Hash only wordlist data
- `generatePuzzleWordlistHash(puzzle)` - Helper for puzzle records
- `verifyFileHash(path, expected)` - Verify integrity

**Example:**
```typescript
import { generatePuzzleWordlistHash } from '@/lib/clueCache/fileHash';

const hash = await generatePuzzleWordlistHash(puzzle);
// Returns: "a3f2b9c1..."
```

### 4. **ClueProvider Context** (`ClueProvider.tsx`)

React context for consuming clues in components.

**Hooks:**
- `useClues()` - Get all clues and state
- `useClue(number, direction)` - Get specific clue
- `useAcrossClues()` - Get all across clues
- `useDownClues()` - Get all down clues
- `useClueMetadata()` - Get puzzle metadata

**Example:**
```tsx
import { ClueProvider, useClues } from '@/contexts/ClueProvider';

function PuzzlePage() {
  return (
    <ClueProvider puzzleId={123}>
      <PuzzleContent />
    </ClueProvider>
  );
}

function PuzzleContent() {
  const { clues, isLoading, error, sourceInfo } = useClues();

  if (isLoading) return <div>Loading clues...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <p>Clues loaded from: {sourceInfo?.source}</p>
      <p>Across: {clues?.across.length}</p>
      <p>Down: {clues?.down.length}</p>
    </div>
  );
}
```

## API Endpoints

### GET `/api/puzzles/[puzzleId]/clues`

Fetch clues with database-first strategy.

**Response:**
```json
{
  "clues": {
    "across": [...],
    "down": [...],
    "metadata": {...}
  },
  "sourceInfo": {
    "source": "cache",
    "cacheHit": true,
    "parseTimeMs": 150,
    "cachedAt": "2025-10-31T12:00:00.000Z"
  }
}
```

### POST `/api/puzzles/[puzzleId]/clues/refresh`

Force refresh clues from iframe.

**Response:**
```json
{
  "clues": {...},
  "sourceInfo": {
    "source": "iframe",
    "cacheHit": false,
    "parseTimeMs": 180
  },
  "message": "Clues refreshed successfully"
}
```

### GET `/api/admin/clue-cache` 🔒 Admin Only

Get cache statistics.

**Response:**
```json
{
  "stats": {
    "totalCached": 150,
    "validCached": 145,
    "invalidCached": 5,
    "avgParseTime": 175.5
  },
  "timestamp": "2025-10-31T12:00:00.000Z"
}
```

### POST `/api/admin/clue-cache/bulk-refresh` 🔒 Admin Only

Bulk refresh multiple puzzles.

**Request:**
```json
{
  "puzzleIds": [1, 2, 3, 4, 5]
}
```

**Response:**
```json
{
  "message": "Refreshed 4 puzzles, 1 failed",
  "successes": 4,
  "failures": 1,
  "errors": [
    {"puzzleId": 3, "error": "File not found"}
  ]
}
```

### DELETE `/api/admin/clue-cache` 🔒 Admin Only

Clear all cached clues.

## Database Schema

### `puzzle_clue_cache`

Stores cached clue data with version tracking.

| Column | Type | Description |
|--------|------|-------------|
| `id` | VARCHAR(191) | Primary key |
| `puzzleId` | INT | Foreign key to puzzles |
| `fileHash` | VARCHAR(64) | SHA-256 hash of wordlist |
| `version` | INT | Cache version number |
| `acrossClues` | LONGTEXT | JSON array of across clues |
| `downClues` | LONGTEXT | JSON array of down clues |
| `metadata` | LONGTEXT | JSON puzzle metadata |
| `sourceType` | VARCHAR(20) | Source: "iframe" |
| `parseTimeMs` | INT | Parse duration |
| `isValid` | BOOLEAN | Cache validity flag |
| `validatedAt` | DATETIME | Last validation time |
| `createdAt` | DATETIME | Created timestamp |
| `updatedAt` | DATETIME | Updated timestamp |

**Indexes:**
- `(puzzleId, fileHash)` - UNIQUE for version tracking
- `puzzleId` - Fast puzzle lookups
- `fileHash` - Hash-based queries
- `isValid` - Filter valid caches
- `createdAt` - Chronological sorting

### `clue_cache_stats`

Daily statistics for monitoring.

| Column | Type | Description |
|--------|------|-------------|
| `id` | VARCHAR(191) | Primary key |
| `date` | DATE | Statistics date (UNIQUE) |
| `cacheHits` | INT | Number of cache hits |
| `cacheMisses` | INT | Number of cache misses |
| `iframeParses` | INT | Number of iframe parses |
| `avgParseTimeMs` | DECIMAL(10,2) | Average parse time |
| `totalRefreshes` | INT | Manual refreshes |
| `errors` | INT | Error count |

### `clue_parse_log`

Detailed logging for debugging.

| Column | Type | Description |
|--------|------|-------------|
| `id` | VARCHAR(191) | Primary key |
| `puzzleId` | INT | Puzzle identifier |
| `action` | VARCHAR(50) | Action type |
| `source` | VARCHAR(20) | Data source |
| `success` | BOOLEAN | Operation success |
| `durationMs` | INT | Duration in milliseconds |
| `errorMessage` | TEXT | Error details if failed |
| `createdAt` | DATETIME | Log timestamp |

## Performance

### Cache Hit Rates

Expected performance based on usage patterns:

| Scenario | Cache Hit Rate | Avg Response Time |
|----------|----------------|-------------------|
| **First load** | 0% | ~180ms (parse + save) |
| **Subsequent loads** | 95%+ | ~10ms (DB query) |
| **After file change** | 0% → 95% | ~180ms → ~10ms |
| **Multiplayer** | 99%+ | ~10ms (shared cache) |

### Optimization Tips

1. **Pre-warm cache** on puzzle upload:
   ```typescript
   await clueRepository.refreshClues(newPuzzleId);
   ```

2. **Monitor cache stats** daily:
   ```typescript
   const stats = await clueRepository.getCacheStats();
   console.log(`Hit rate: ${stats.validCached / stats.totalCached * 100}%`);
   ```

3. **Bulk refresh** after bulk imports:
   ```typescript
   await clueRepository.bulkRefresh(newPuzzleIds);
   ```

4. **Index maintenance**: Ensure indexes are optimized:
   ```sql
   ANALYZE TABLE puzzle_clue_cache;
   ```

## Monitoring

### Key Metrics

Track these metrics for system health:

1. **Cache Hit Rate**: Target 95%+
2. **Average Parse Time**: Target <200ms
3. **Error Rate**: Target <1%
4. **Cache Size**: Monitor growth
5. **Stale Cache Count**: Should be near zero

### Example Monitoring Query

```typescript
const today = new Date();
today.setHours(0, 0, 0, 0);

const stats = await prisma.clueCacheStats.findUnique({
  where: { date: today },
});

const hitRate = stats.cacheHits / (stats.cacheHits + stats.cacheMisses);
console.log(`Today's cache hit rate: ${(hitRate * 100).toFixed(2)}%`);
```

## Troubleshooting

### Cache Always Missing

**Symptoms**: Every request parses iframe

**Causes**:
- File hash changing unexpectedly
- Cache not being saved
- Invalid cache entries

**Solutions**:
```typescript
// Check if cache exists
const hasCache = await clueRepository.hasValidCache(puzzleId);

// Check file hash stability
const hash1 = await generatePuzzleWordlistHash(puzzle);
const hash2 = await generatePuzzleWordlistHash(puzzle);
console.log('Hash stable?', hash1 === hash2);

// Check cache entries
const cached = await prisma.puzzleClueCache.findMany({
  where: { puzzleId },
});
console.log('Cache entries:', cached.length);
```

### Stale Clues

**Symptoms**: Old clues displayed after file update

**Causes**:
- Cache not invalidated
- File hash collision (very rare)

**Solutions**:
```typescript
// Manually invalidate
await clueRepository.invalidateCache(puzzleId);

// Force refresh
await clueRepository.refreshClues(puzzleId);
```

### Slow Parse Times

**Symptoms**: Parse taking >500ms

**Causes**:
- Large HTML files
- JSDOM overhead
- Disk I/O bottleneck

**Solutions**:
- Use SSD storage for puzzle files
- Enable file system caching
- Consider streaming parser for large files
- Profile with:
  ```typescript
  const start = Date.now();
  const result = await parseCluesFromFile(path);
  console.log(`Parse time: ${Date.now() - start}ms`);
  ```

## Migration

To apply the database schema:

```bash
# Run Prisma migration
npx prisma migrate deploy

# Or apply SQL directly
mysql -u user -p database < prisma/migrations/20251031_add_puzzle_clue_cache/migration.sql
```

## Best Practices

1. **Always use ClueProvider in React components**
   ```tsx
   <ClueProvider puzzleId={id}>
     <YourComponent />
   </ClueProvider>
   ```

2. **Pre-warm cache on upload**
   ```typescript
   // After saving puzzle file
   await clueRepository.refreshClues(puzzleId);
   ```

3. **Monitor and alert on low hit rates**
   ```typescript
   if (hitRate < 0.9) {
     sendAlert('Cache hit rate below 90%');
   }
   ```

4. **Periodic cache validation**
   ```typescript
   // Run daily cron job
   const allPuzzles = await prisma.puzzle.findMany();
   for (const puzzle of allPuzzles) {
     const hash = await generatePuzzleWordlistHash(puzzle);
     const cached = await prisma.puzzleClueCache.findFirst({
       where: { puzzleId: puzzle.id, fileHash: hash },
     });
     
     if (!cached) {
       await clueRepository.refreshClues(puzzle.id);
     }
   }
   ```

5. **Clean up old cache entries**
   ```typescript
   // Delete cache older than 90 days
   await prisma.puzzleClueCache.deleteMany({
     where: {
       createdAt: {
         lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
       },
     },
   });
   ```

## Testing

Example test scenarios:

```typescript
describe('Clue Caching', () => {
  it('should use cache on second load', async () => {
    const result1 = await clueRepository.getClues(123);
    expect(result1.sourceInfo.source).toBe('iframe');
    
    const result2 = await clueRepository.getClues(123);
    expect(result2.sourceInfo.source).toBe('cache');
    expect(result2.sourceInfo.cacheHit).toBe(true);
  });
  
  it('should detect file changes', async () => {
    const result1 = await clueRepository.getClues(123);
    
    // Modify puzzle file
    await modifyPuzzleFile(123);
    
    const result2 = await clueRepository.getClues(123);
    expect(result2.sourceInfo.source).toBe('iframe');
  });
});
```

## Related Documentation

- [Puzzle Bridge System](../puzzleBridge/README.md)
- [Animation System](../puzzleBridge/ANIMATIONS.md)
- [Database Schema](../../prisma/schema.prisma)
