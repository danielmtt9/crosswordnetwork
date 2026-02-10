/**
 * Clue Parser Service
 * 
 * Extracts and normalizes clue data from EclipseCrossword HTML files
 */

import fs from 'fs/promises';
import { JSDOM } from 'jsdom';

export interface ParsedClue {
  number: number;
  direction: 'across' | 'down';
  text: string;
  answer: string;
  length: number;
  cells: Array<{ row: number; col: number }>;
}

export interface ParsedClues {
  across: ParsedClue[];
  down: ParsedClue[];
  metadata?: {
    gridWidth?: number;
    gridHeight?: number;
    title?: string;
    author?: string;
    copyright?: string;
  };
}

export interface ParseResult {
  success: boolean;
  clues?: ParsedClues;
  error?: string;
  parseTimeMs: number;
}

/**
 * Parse EclipseCrossword arrays (Clue, Word, etc.)
 */
function parseEclipseCrosswordArrays(win: any): ParsedClues | null {
  try {
    const { Clue, Word, LastHorizontalWord, WordLength, WordX, WordY, CrosswordWidth, CrosswordHeight } = win;
    
    if (!Clue || !Word || typeof LastHorizontalWord !== 'number') {
      return null;
    }
    
    // Build clue number mapping
    const gridStarts = new Map<string, number>();
    const clueNumbers: number[] = new Array(Word.length);
    
    const startPositions: Array<{ x: number; y: number; wordIndex: number }> = [];
    for (let i = 0; i < Word.length; i++) {
      if (WordX && WordY) {
        startPositions.push({ x: WordX[i], y: WordY[i], wordIndex: i });
      }
    }
    
    startPositions.sort((a, b) => {
      if (a.y !== b.y) return a.y - b.y;
      return a.x - b.x;
    });
    
    let nextNumber = 1;
    for (const pos of startPositions) {
      const key = `${pos.x},${pos.y}`;
      if (!gridStarts.has(key)) {
        gridStarts.set(key, nextNumber);
        nextNumber++;
      }
      clueNumbers[pos.wordIndex] = gridStarts.get(key)!;
    }
    
    const across: ParsedClue[] = [];
    const down: ParsedClue[] = [];
    
    const generateCells = (startX: number, startY: number, length: number, isAcross: boolean) => {
      const cells: Array<{ row: number; col: number }> = [];
      for (let offset = 0; offset < length; offset++) {
        cells.push({
          row: startY + (isAcross ? 0 : offset),
          col: startX + (isAcross ? offset : 0),
        });
      }
      return cells;
    };
    
    // In EclipseCrossword, `LastHorizontalWord` is the *index* of the last across word.
    // Across words are indices `0..LastHorizontalWord` (inclusive).
    // Across clues
    for (let i = 0; i <= LastHorizontalWord; i++) {
      if (Clue[i] && Word[i]) {
        const wordLength = WordLength?.[i] || Word[i].length;
        across.push({
          number: clueNumbers[i] || i + 1,
          direction: 'across',
          text: Clue[i],
          answer: Word[i],
          length: wordLength,
          cells: WordX && WordY ? generateCells(WordX[i], WordY[i], wordLength, true) : [],
        });
      }
    }
    
    // Down clues
    for (let i = LastHorizontalWord + 1; i < Clue.length; i++) {
      if (Clue[i] && Word[i]) {
        const wordLength = WordLength?.[i] || Word[i].length;
        down.push({
          number: clueNumbers[i] || i + 1,
          direction: 'down',
          text: Clue[i],
          answer: Word[i],
          length: wordLength,
          cells: WordX && WordY ? generateCells(WordX[i], WordY[i], wordLength, false) : [],
        });
      }
    }
    
    return {
      across,
      down,
      metadata: {
        gridWidth: CrosswordWidth,
        gridHeight: CrosswordHeight,
      },
    };
  } catch (error) {
    console.error('[clueParser] Failed to parse EclipseCrossword arrays:', error);
    return null;
  }
}

/**
 * Parse wordlist data from g_rgWordData array
 */
function parseWordData(wordDataScript: string): ParsedClue[] {
  const clues: ParsedClue[] = [];
  
  try {
    // Extract the array content
    const match = wordDataScript.match(/var\s+g_rgWordData\s*=\s*\[([\s\S]*?)\];/);
    if (!match) {
      throw new Error('Could not find g_rgWordData array');
    }
    
    const arrayContent = match[1];
    
    // Parse each word entry [clueNum, direction, clueText, answer, row, col]
    const entries = arrayContent.match(/\[([^\]]+)\]/g);
    
    if (!entries) {
      throw new Error('Could not parse word entries');
    }
    
    for (const entry of entries) {
      try {
        // Remove brackets and split
        const cleaned = entry.replace(/[\[\]]/g, '');
        const parts = cleaned.split(/,\s*(?=(?:[^"]*"[^"]*")*[^"]*$)/);
        
        if (parts.length < 6) continue;
        
        const clueNum = parseInt(parts[0]);
        const direction = parts[1].trim() === '0' ? 'across' : 'down';
        const clueText = parts[2].replace(/^"(.*)"$/, '$1').trim();
        const answer = parts[3].replace(/^"(.*)"$/, '$1').trim().toUpperCase();
        const startRow = parseInt(parts[4]);
        const startCol = parseInt(parts[5]);
        
        // Calculate cells based on answer length and direction
        const cells: Array<{ row: number; col: number }> = [];
        for (let i = 0; i < answer.length; i++) {
          cells.push({
            row: direction === 'down' ? startRow + i : startRow,
            col: direction === 'across' ? startCol + i : startCol,
          });
        }
        
        clues.push({
          number: clueNum,
          direction,
          text: clueText,
          answer,
          length: answer.length,
          cells,
        });
      } catch (err) {
        console.warn('[clueParser] Failed to parse entry:', entry, err);
        continue;
      }
    }
  } catch (error) {
    console.error('[clueParser] Failed to parse wordlist:', error);
    throw error;
  }
  
  return clues;
}

/**
 * Extract metadata from HTML
 */
function extractMetadata(doc: Document): ParsedClues['metadata'] {
  const metadata: ParsedClues['metadata'] = {};
  
  try {
    // Try to find title
    const titleEl = doc.querySelector('title');
    if (titleEl) {
      metadata.title = titleEl.textContent?.trim();
    }
    
    // Try to find copyright
    const copyrightEl = doc.querySelector('.ecw-copyright');
    if (copyrightEl) {
      metadata.copyright = copyrightEl.textContent?.trim();
    }
    
    // Try to extract grid dimensions from script
    const scripts = Array.from(doc.querySelectorAll('script'));
    for (const script of scripts) {
      const content = script.textContent || '';
      
      const widthMatch = content.match(/g_iGridWidth\s*=\s*(\d+)/);
      if (widthMatch) {
        metadata.gridWidth = parseInt(widthMatch[1]);
      }
      
      const heightMatch = content.match(/g_iGridHeight\s*=\s*(\d+)/);
      if (heightMatch) {
        metadata.gridHeight = parseInt(heightMatch[1]);
      }
    }
  } catch (error) {
    console.warn('[clueParser] Failed to extract metadata:', error);
  }
  
  return metadata;
}

/**
 * Parse clues from HTML content
 */
export async function parseCluesFromHTML(htmlContent: string): Promise<ParseResult> {
  const startTime = Date.now();
  
  try {
    // Parse HTML with JSDOM and execute scripts
    const dom = new JSDOM(htmlContent, { runScripts: 'dangerously', resources: 'usable' });
    const win = dom.window as any;
    
    // Wait for scripts to execute
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Try EclipseCrossword format first (Clue, Word arrays)
    if (win.Clue && win.Word && typeof win.LastHorizontalWord === 'number') {
      const eclipseClues = parseEclipseCrosswordArrays(win);
      if (eclipseClues && (eclipseClues.across.length > 0 || eclipseClues.down.length > 0)) {
        const parseTimeMs = Date.now() - startTime;
        return {
          success: true,
          clues: eclipseClues,
          parseTimeMs,
        };
      }
    }
    
    // Try g_rgWordData format
    const doc = dom.window.document;
    const scripts = Array.from(doc.querySelectorAll('script'));
    const wordDataScript = scripts.find(s => 
      (s.textContent || '').includes('g_rgWordData')
    );
    
    if (wordDataScript && wordDataScript.textContent) {
      const allClues = parseWordData(wordDataScript.textContent);
      const across = allClues.filter(c => c.direction === 'across');
      const down = allClues.filter(c => c.direction === 'down');
      const metadata = extractMetadata(doc);
      
      const parseTimeMs = Date.now() - startTime;
      return {
        success: true,
        clues: { across, down, metadata },
        parseTimeMs,
      };
    }
    
    throw new Error('No supported clue format found');
  } catch (error) {
    const parseTimeMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    console.error('[clueParser] Parse failed:', errorMessage);
    
    return {
      success: false,
      error: errorMessage,
      parseTimeMs,
    };
  }
}

/**
 * Parse clues from file
 */
export async function parseCluesFromFile(filePath: string): Promise<ParseResult> {
  try {
    const htmlContent = await fs.readFile(filePath, 'utf8');
    return parseCluesFromHTML(htmlContent);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return {
      success: false,
      error: `Failed to read file: ${errorMessage}`,
      parseTimeMs: 0,
    };
  }
}

/**
 * Normalize clue text (remove extra whitespace, standardize format)
 */
export function normalizeClueText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\s*([,;:.!?])\s*/g, '$1 ')
    .trim();
}

/**
 * Validate parsed clues
 */
export function validateClues(clues: ParsedClues): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check if we have clues
  if (clues.across.length === 0 && clues.down.length === 0) {
    errors.push('No clues found');
  }
  
  // Check for duplicate numbers in each direction
  const acrossNumbers = new Set<number>();
  const downNumbers = new Set<number>();
  
  for (const clue of clues.across) {
    if (acrossNumbers.has(clue.number)) {
      errors.push(`Duplicate across clue number: ${clue.number}`);
    }
    acrossNumbers.add(clue.number);
    
    if (!clue.text || clue.text.length === 0) {
      errors.push(`Empty clue text for across ${clue.number}`);
    }
    
    if (!clue.answer || clue.answer.length === 0) {
      errors.push(`Empty answer for across ${clue.number}`);
    }
    
    if (clue.length !== clue.answer.length) {
      errors.push(`Length mismatch for across ${clue.number}`);
    }
    
    if (clue.cells.length !== clue.answer.length) {
      errors.push(`Cell count mismatch for across ${clue.number}`);
    }
  }
  
  for (const clue of clues.down) {
    if (downNumbers.has(clue.number)) {
      errors.push(`Duplicate down clue number: ${clue.number}`);
    }
    downNumbers.add(clue.number);
    
    if (!clue.text || clue.text.length === 0) {
      errors.push(`Empty clue text for down ${clue.number}`);
    }
    
    if (!clue.answer || clue.answer.length === 0) {
      errors.push(`Empty answer for down ${clue.number}`);
    }
    
    if (clue.length !== clue.answer.length) {
      errors.push(`Length mismatch for down ${clue.number}`);
    }
    
    if (clue.cells.length !== clue.answer.length) {
      errors.push(`Cell count mismatch for down ${clue.number}`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Format clues for storage (serialize to JSON)
 */
export function serializeClues(clues: ParsedClue[]): string {
  return JSON.stringify(clues);
}

/**
 * Deserialize clues from storage
 */
export function deserializeClues(json: string): ParsedClue[] {
  try {
    return JSON.parse(json);
  } catch (error) {
    console.error('[clueParser] Failed to deserialize clues:', error);
    return [];
  }
}

/**
 * Convert clues to the format expected by the bridge
 */
export function convertToBridgeFormat(clues: ParsedClues): {
  clues: Array<{
    number: number;
    direction: 'across' | 'down';
    text: string;
    answer: string;
    length: number;
    cells: Array<{ row: number; col: number }>;
  }>;
} {
  return {
    clues: [...clues.across, ...clues.down],
  };
}
