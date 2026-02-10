/**
 * Backfill script to extract and store clues for existing puzzles
 * Run with: npx ts-node scripts/backfill-puzzle-clues.ts
 */

import { PrismaClient } from '@prisma/client';
import { promises as fs } from 'fs';
import path from 'path';
import { extractCluesFromHTML, formatCluesForStorage } from '../src/lib/serverClueExtraction';

const prisma = new PrismaClient();

async function backfillClues() {
  console.log('[BackfillClues] Starting clue extraction for existing puzzles...\n');
  
  try {
    // Get all puzzles without clues (only valid 2025 puzzles)
    const puzzles = await prisma.puzzle.findMany({
      where: {
        AND: [
          {
            OR: [
              { clues: null },
              { clues: '' }
            ]
          },
          { file_path: { contains: '2025' } }
        ]
      },
      select: {
        id: true,
        title: true,
        file_path: true,
      }
    });

    console.log(`[BackfillClues] Found ${puzzles.length} puzzles without clues\n`);

    if (puzzles.length === 0) {
      console.log('[BackfillClues] No puzzles need backfilling. Exiting.');
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const puzzle of puzzles) {
      try {
        console.log(`[BackfillClues] Processing puzzle #${puzzle.id}: ${puzzle.title}`);
        
        // Normalize path (handle Windows-style backslashes)
        let normalizedPath = puzzle.file_path.replace(/\\/g, '/');
        
        // Remove leading 'public/' if present
        if (normalizedPath.startsWith('public/')) {
          normalizedPath = normalizedPath.substring(7);
        }
        
        // Remove leading '/' if present
        if (normalizedPath.startsWith('/')) {
          normalizedPath = normalizedPath.substring(1);
        }
        
        // Read puzzle HTML file
        const filePath = path.join(process.cwd(), 'public', normalizedPath);
        console.log(`  Reading file: ${filePath}`);
        const htmlContent = await fs.readFile(filePath, 'utf-8');
        
        // Extract clues
        const extractedClues = extractCluesFromHTML(htmlContent);
        const cluesJson = formatCluesForStorage(extractedClues);
        
        // Update database
        await prisma.puzzle.update({
          where: { id: puzzle.id },
          data: { clues: cluesJson }
        });

        console.log(`  ✓ Extracted ${extractedClues.across.length} across and ${extractedClues.down.length} down clues\n`);
        successCount++;
        
      } catch (error) {
        console.error(`  ✗ Failed to process puzzle #${puzzle.id}:`, error);
        console.error(`    File path: ${puzzle.file_path}\n`);
        failCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('[BackfillClues] Backfill complete!');
    console.log(`  Success: ${successCount}/${puzzles.length}`);
    console.log(`  Failed:  ${failCount}/${puzzles.length}`);
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('[BackfillClues] Fatal error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
backfillClues()
  .then(() => {
    console.log('\n[BackfillClues] Script finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n[BackfillClues] Script failed:', error);
    process.exit(1);
  });
