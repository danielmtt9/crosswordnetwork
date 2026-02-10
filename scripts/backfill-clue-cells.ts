/**
 * Backfill Script: Add Cell Coordinates to Existing Clues
 * 
 * This script reads puzzles from the database, extracts clue data with cell coordinates,
 * and updates the database with the enhanced clue information.
 * 
 * Usage:
 *   npx tsx scripts/backfill-clue-cells.ts [--dry-run] [--limit=N]
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { extractCluesFromHTML } from '../src/lib/serverClueExtraction';

const prisma = new PrismaClient();

interface BackfillOptions {
  dryRun: boolean;
  limit?: number;
}

interface BackfillStats {
  total: number;
  processed: number;
  updated: number;
  skipped: number;
  errors: number;
}

/**
 * Parse command line arguments
 */
function parseArgs(): BackfillOptions {
  const args = process.argv.slice(2);
  const options: BackfillOptions = {
    dryRun: false,
  };

  for (const arg of args) {
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg.startsWith('--limit=')) {
      options.limit = parseInt(arg.split('=')[1]);
    }
  }

  return options;
}

/**
 * Check if clues already have cell coordinates
 */
function cluesHaveCells(clues: any): boolean {
  if (!clues || typeof clues !== 'object') return false;
  
  const checkArray = (arr: any[]) => {
    if (!Array.isArray(arr) || arr.length === 0) return false;
    return arr.some(clue => clue.cells && Array.isArray(clue.cells) && clue.cells.length > 0);
  };

  return checkArray(clues.across) || checkArray(clues.down);
}

/**
 * Backfill cell coordinates for a single puzzle
 */
async function backfillPuzzle(
  puzzle: any,
  options: BackfillOptions
): Promise<'updated' | 'skipped' | 'error'> {
  try {
    console.log(`\n[${puzzle.id}] Processing: ${puzzle.title}`);

    // Check if clues already have cell data
    if (puzzle.clues) {
      try {
        const parsed = JSON.parse(puzzle.clues);
        if (cluesHaveCells(parsed)) {
          console.log(`[${puzzle.id}] ✓ Already has cell coordinates, skipping`);
          return 'skipped';
        }
      } catch (e) {
        console.log(`[${puzzle.id}] ⚠ Invalid clues JSON, will re-extract`);
      }
    }

    // Read puzzle HTML file
    const filePath = path.join(process.cwd(), 'public', puzzle.file_path);
    
    if (!fs.existsSync(filePath)) {
      console.log(`[${puzzle.id}] ✗ File not found: ${filePath}`);
      return 'error';
    }

    const htmlContent = fs.readFileSync(filePath, 'utf-8');

    // Extract clues with cell coordinates
    console.log(`[${puzzle.id}] Extracting clues from HTML...`);
    const clues = extractCluesFromHTML(htmlContent);

    if (!clues || (clues.across.length === 0 && clues.down.length === 0)) {
      console.log(`[${puzzle.id}] ✗ No clues extracted`);
      return 'error';
    }

    console.log(`[${puzzle.id}] Extracted ${clues.across.length} across, ${clues.down.length} down clues`);

    // Check if extracted clues have cells
    if (!cluesHaveCells(clues)) {
      console.log(`[${puzzle.id}] ⚠ Extracted clues don't have cell coordinates (old puzzle format?)`);
      // Still update to standardize format
    } else {
      const sampleClue = clues.across[0] || clues.down[0];
      console.log(`[${puzzle.id}] ✓ Cell coordinates extracted (sample: ${sampleClue?.cells?.length || 0} cells)`);
    }

    // Update database
    if (options.dryRun) {
      console.log(`[${puzzle.id}] [DRY RUN] Would update clues in database`);
      return 'updated';
    }

    await prisma.puzzle.update({
      where: { id: puzzle.id },
      data: {
        clues: JSON.stringify(clues),
      },
    });

    console.log(`[${puzzle.id}] ✓ Updated in database`);
    return 'updated';

  } catch (error) {
    console.error(`[${puzzle.id}] ✗ Error:`, error);
    return 'error';
  }
}

/**
 * Main backfill function
 */
async function backfillAllPuzzles(options: BackfillOptions) {
  const stats: BackfillStats = {
    total: 0,
    processed: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
  };

  console.log('='.repeat(60));
  console.log('Backfill Clue Cell Coordinates');
  console.log('='.repeat(60));
  console.log(`Mode: ${options.dryRun ? 'DRY RUN' : 'LIVE'}`);
  if (options.limit) {
    console.log(`Limit: ${options.limit} puzzles`);
  }
  console.log('='.repeat(60));

  try {
    // Fetch puzzles
    const puzzles = await prisma.puzzle.findMany({
      take: options.limit,
      orderBy: { id: 'asc' },
    });

    stats.total = puzzles.length;
    console.log(`\nFound ${stats.total} puzzles to process\n`);

    // Process each puzzle
    for (const puzzle of puzzles) {
      const result = await backfillPuzzle(puzzle, options);
      stats.processed++;

      switch (result) {
        case 'updated':
          stats.updated++;
          break;
        case 'skipped':
          stats.skipped++;
          break;
        case 'error':
          stats.errors++;
          break;
      }

      // Progress indicator
      const progress = ((stats.processed / stats.total) * 100).toFixed(1);
      process.stdout.write(`\rProgress: ${stats.processed}/${stats.total} (${progress}%)`);
    }

    console.log('\n');
    console.log('='.repeat(60));
    console.log('Backfill Complete');
    console.log('='.repeat(60));
    console.log(`Total puzzles:    ${stats.total}`);
    console.log(`Processed:        ${stats.processed}`);
    console.log(`Updated:          ${stats.updated}`);
    console.log(`Skipped:          ${stats.skipped}`);
    console.log(`Errors:           ${stats.errors}`);
    console.log('='.repeat(60));

    if (options.dryRun) {
      console.log('\n⚠️  DRY RUN MODE - No changes were made to the database');
      console.log('Run without --dry-run to apply changes\n');
    }

  } catch (error) {
    console.error('\n✗ Fatal error during backfill:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
const options = parseArgs();

backfillAllPuzzles(options)
  .then(() => {
    console.log('✓ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('✗ Script failed:', error);
    process.exit(1);
  });
