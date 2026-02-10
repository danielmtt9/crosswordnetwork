/**
 * Server-side clue extraction from puzzle HTML
 * Uses JSDOM for DOM parsing on the server
 */

import { JSDOM } from 'jsdom';

export interface Clue {
  number: number;
  text: string;
  direction: 'across' | 'down';
  answer?: string;
  length?: number;
  cells?: Array<{ row: number; col: number }>;
}

export interface CluesByDirection {
  across: Clue[];
  down: Clue[];
}

/**
 * Extract clues from puzzle HTML content (server-side)
 */
export function extractCluesFromHTML(htmlContent: string): CluesByDirection {
  try {
    const dom = new JSDOM(htmlContent);
    const document = dom.window.document;

    // Try multiple extraction strategies
    const clues = 
      extractFromEclipseCrosswordFormat(document) ||
      extractFromStructuredHTML(document) ||
      extractFromJavaScriptArrays(htmlContent);

    return clues || { across: [], down: [] };
  } catch (error) {
    console.error('[ServerClueExtraction] Failed to extract clues:', error);
    return { across: [], down: [] };
  }
}

/**
 * Extract clues from EclipseCrossword format (JavaScript arrays)
 */
function extractFromEclipseCrosswordFormat(document: Document): CluesByDirection | null {
  try {
    const scripts = document.querySelectorAll('script');
    let cluesData: CluesByDirection = { across: [], down: [] };

    for (const script of scripts) {
      const scriptContent = script.textContent || '';
      
      // Look for Word, Clue, and position arrays
      const wordMatch = scriptContent.match(/Word\s*=\s*new\s+Array\(([\s\S]*?)\);/);
      const clueMatch = scriptContent.match(/Clue\s*=\s*new\s+Array\(([\s\S]*?)\);/);
      const wordXMatch = scriptContent.match(/WordX\s*=\s*new\s+Array\(([\s\S]*?)\);/);
      const wordYMatch = scriptContent.match(/WordY\s*=\s*new\s+Array\(([\s\S]*?)\);/);
      const lastHorizontalMatch = scriptContent.match(/LastHorizontalWord\s*=\s*(\d+)/);

      if (!wordMatch || !clueMatch) continue;

      // Parse words array
      const wordsString = wordMatch[1];
      const words = wordsString
        .split(/,\s*(?=")/) // Split on commas followed by quotes
        .map(s => s.trim().replace(/^["']|["']$/g, ''))
        .filter(s => s.length > 0);

      // Parse clues array  
      const cluesString = clueMatch[1];
      const clues = cluesString
        .split(/",\s*\n?\s*"/) // Split on quote-comma-quote pattern
        .map(s => s.trim().replace(/^["']|["']$/g, ''))
        .filter(s => s.length > 0);

      // Parse position arrays if available
      let wordXs: number[] = [];
      let wordYs: number[] = [];
      
      if (wordXMatch && wordYMatch) {
        const wordXString = wordXMatch[1];
        wordXs = wordXString.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
        
        const wordYString = wordYMatch[1];
        wordYs = wordYString.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
      }

      // In EclipseCrossword, `LastHorizontalWord` is the *index* of the last across word.
      // Across words are indices `0..LastHorizontalWord` (inclusive).
      const lastHorizontal = lastHorizontalMatch
        ? parseInt(lastHorizontalMatch[1], 10)
        : Math.max(0, words.length - 1);

      console.log(`[ExtractFromEclipse] Found ${words.length} words, ${clues.length} clues, split at ${lastHorizontal}`);

      // Helper to generate cell coordinates
      const generateCells = (startX: number, startY: number, length: number, isAcross: boolean): Array<{ row: number; col: number }> => {
        const cells: Array<{ row: number; col: number }> = [];
        for (let offset = 0; offset < length; offset++) {
          cells.push({
            row: startY + (isAcross ? 0 : offset),
            col: startX + (isAcross ? offset : 0),
          });
        }
        return cells;
      };

      // Build clue number mapping (same as client-side)
      const gridStarts = new Map<string, number>();
      const clueNumbers: number[] = new Array(words.length);
      
      if (wordXs.length === words.length && wordYs.length === words.length) {
        // Collect word start positions
        const startPositions: Array<{ x: number; y: number; wordIndex: number }> = [];
        for (let i = 0; i < words.length; i++) {
          startPositions.push({ x: wordXs[i], y: wordYs[i], wordIndex: i });
        }
        
        // Sort by position to assign numbers
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
      }

      // Split into across and down based on LastHorizontalWord
      for (let i = 0; i < words.length && i < clues.length; i++) {
        const word = words[i];
        const clueText = clues[i];
        
        if (!word || !clueText) continue;

        const isAcross = i <= lastHorizontal;
        const direction = isAcross ? 'across' : 'down';
        const number = clueNumbers[i] || (isAcross ? i + 1 : i - lastHorizontal + 1);

        // Generate cell coordinates if we have position data
        let cells: Array<{ row: number; col: number }> | undefined = undefined;
        if (wordXs[i] !== undefined && wordYs[i] !== undefined) {
          cells = generateCells(wordXs[i], wordYs[i], word.length, isAcross);
        }

        cluesData[direction].push({
          number,
          text: clueText,
          direction,
          length: word.length,
          cells,
        });
      }
    }

    if (cluesData.across.length > 0 || cluesData.down.length > 0) {
      console.log(`[ExtractFromEclipse] Extracted ${cluesData.across.length} across, ${cluesData.down.length} down`);
      return cluesData;
    }
  } catch (error) {
    console.error('[ExtractFromEclipse] Error:', error);
  }

  return null;
}

/**
 * Extract clues from structured HTML (lists, divs with clue class)
 */
function extractFromStructuredHTML(document: Document): CluesByDirection | null {
  try {
    const across: Clue[] = [];
    const down: Clue[] = [];

    // Look for sections with "across" or "down" in class/id
    const acrossSection = document.querySelector('[class*="across" i], [id*="across" i]');
    const downSection = document.querySelector('[class*="down" i], [id*="down" i]');

    const parseSection = (section: Element | null, direction: 'across' | 'down'): Clue[] => {
      if (!section) return [];
      
      const clues: Clue[] = [];
      const items = section.querySelectorAll('li, div[class*="clue"], p[class*="clue"]');
      
      items.forEach(item => {
        const text = item.textContent?.trim();
        if (!text) return;
        
        // Try to extract number from start of text (e.g., "1. Clue text")
        const match = text.match(/^(\d+)\.\s*(.+)/);
        if (match) {
          clues.push({
            number: parseInt(match[1]),
            text: match[2],
            direction,
          });
        }
      });
      
      return clues;
    };

    across.push(...parseSection(acrossSection, 'across'));
    down.push(...parseSection(downSection, 'down'));

    if (across.length > 0 || down.length > 0) {
      return { across, down };
    }
  } catch (error) {
    console.error('[ExtractFromStructured] Error:', error);
  }

  return null;
}

/**
 * Extract clues directly from JavaScript arrays in HTML
 */
function extractFromJavaScriptArrays(htmlContent: string): CluesByDirection | null {
  try {
    const across: Clue[] = [];
    const down: Clue[] = [];

    // Look for clue data in script content
    const cluePattern = /(?:var\s+)?(?:across|down)Clues\s*=\s*(\[[\s\S]*?\]);/gi;
    const matches = htmlContent.matchAll(cluePattern);

    for (const match of matches) {
      try {
        const direction = match[0].toLowerCase().includes('across') ? 'across' : 'down';
        const cluesArray = JSON.parse(match[1]);
        
        cluesArray.forEach((clue: any) => {
          if (clue.number && clue.text) {
            (direction === 'across' ? across : down).push({
              number: clue.number,
              text: clue.text,
              direction,
              answer: clue.answer,
              length: clue.length,
            });
          }
        });
      } catch (e) {
        // Skip invalid JSON
      }
    }

    if (across.length > 0 || down.length > 0) {
      return { across, down };
    }
  } catch (error) {
    console.error('[ExtractFromJS] Error:', error);
  }

  return null;
}

/**
 * Format clues for storage in database
 */
export function formatCluesForStorage(clues: CluesByDirection): string {
  return JSON.stringify({
    across: clues.across.map(c => ({
      number: c.number,
      text: c.text,
      length: c.length,
      cells: c.cells, // Include cell coordinates
    })),
    down: clues.down.map(c => ({
      number: c.number,
      text: c.text,
      length: c.length,
      cells: c.cells, // Include cell coordinates
    })),
  });
}

/**
 * Parse clues from database storage
 */
export function parseCluesFromStorage(cluesJson: string | null): CluesByDirection {
  if (!cluesJson) {
    return { across: [], down: [] };
  }

  try {
    const parsed = JSON.parse(cluesJson);
    return {
      across: parsed.across || [],
      down: parsed.down || [],
    };
  } catch (error) {
    console.error('[ParseClues] Failed to parse clues from storage:', error);
    return { across: [], down: [] };
  }
}
