# Database Scripts

This directory contains utility scripts for database maintenance and migrations.

## Available Scripts

### `backfill-clue-cells.ts`

Adds cell coordinate data to existing puzzle clues in the database. This enables the clue hover highlight feature to work properly.

#### Purpose

When clues are extracted from puzzle HTML files, they now include `cells` arrays that specify the exact grid positions (row, col) for each letter in the word. This data is essential for:
- Clue hover highlights (highlighting cells when hovering over clues)
- Cell-to-clue reverse mapping
- Validation and checking features

Older puzzles in the database may not have this cell coordinate data. This script backfills that information.

#### Usage

**Dry run** (preview changes without modifying database):
```bash
npx tsx scripts/backfill-clue-cells.ts --dry-run
```

**Dry run with limit** (test on first 5 puzzles):
```bash
npx tsx scripts/backfill-clue-cells.ts --dry-run --limit=5
```

**Live run** (actually update database):
```bash
npx tsx scripts/backfill-clue-cells.ts
```

**Live run with limit** (update first 10 puzzles only):
```bash
npx tsx scripts/backfill-clue-cells.ts --limit=10
```

#### What It Does

1. **Fetches all puzzles** from the database
2. **Checks** if clues already have cell coordinates
3. **Skips** puzzles that already have the data
4. **Reads** puzzle HTML files from disk
5. **Extracts** clues with cell coordinates using server-side parsing
6. **Updates** puzzle records in database with enhanced clue data
7. **Reports** statistics on success/failures

#### Output

```
============================================================
Backfill Clue Cell Coordinates
============================================================
Mode: DRY RUN
============================================================

Found 15 puzzles to process

[1] Processing: Daily Puzzle #1
[1] Extracting clues from HTML...
[1] Extracted 23 across, 25 down clues
[1] ✓ Cell coordinates extracted (sample: 8 cells)
[1] [DRY RUN] Would update clues in database

[2] Processing: Sunday Challenge
[2] ✓ Already has cell coordinates, skipping

Progress: 15/15 (100.0%)

============================================================
Backfill Complete
============================================================
Total puzzles:    15
Processed:        15
Updated:          12
Skipped:          2
Errors:           1
============================================================

⚠️  DRY RUN MODE - No changes were made to the database
Run without --dry-run to apply changes
```

#### Safety Features

- **Dry run mode**: Always test with `--dry-run` first
- **Skip existing**: Won't overwrite puzzles that already have cell data
- **Limit option**: Test on a small subset before full run
- **Detailed logging**: See exactly what happens for each puzzle
- **Error handling**: Continues processing even if individual puzzles fail

#### When to Run

- After initial puzzle uploads (for new puzzles without cell coordinates)
- After updating the clue extraction logic
- When migrating from an older system
- To fix puzzles with malformed clue data

#### Prerequisites

- Node.js and TypeScript (tsx) installed
- Database connection configured in `.env`
- Puzzle HTML files exist in `public/` directory
- Prisma client generated (`npx prisma generate`)

#### Troubleshooting

**"File not found" errors**:
- Verify puzzle files exist at paths stored in database
- Check `file_path` values in `Puzzle` table
- Ensure paths are relative to `public/` directory

**"No clues extracted" errors**:
- Puzzle may be in unsupported format
- Check puzzle HTML structure
- May need to update extraction logic for specific puzzle generator

**"Invalid clues JSON" warnings**:
- Existing clue data is malformed
- Script will re-extract and fix the data

## Adding New Scripts

When adding new scripts to this directory:

1. **Use TypeScript** with `.ts` extension
2. **Add JSDoc comments** explaining purpose and usage
3. **Support `--dry-run`** mode for safety
4. **Provide detailed logging** with prefixes like `[ScriptName]`
5. **Handle errors gracefully** with try/catch
6. **Clean up resources** (database connections, file handles)
7. **Update this README** with usage instructions

## Script Template

```typescript
/**
 * Script Name: Description
 * 
 * Usage:
 *   npx tsx scripts/script-name.ts [--dry-run]
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('[ScriptName] Starting...');
    
    // Your logic here
    
    console.log('[ScriptName] Complete');
  } catch (error) {
    console.error('[ScriptName] Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
```
