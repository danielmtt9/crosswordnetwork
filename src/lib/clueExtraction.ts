/**
 * Clue extraction utilities for crossword puzzles
 */

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
 * Extract clues from iframe window (EclipseCrossword)
 */
export function extractCluesFromIframe(iframe: HTMLIFrameElement | null): CluesByDirection | null {
  if (!iframe?.contentWindow) {
    return null;
  }

  try {
    const contentWindow = iframe.contentWindow as any;
    
    // Try EclipseCrossword data arrays
    if (contentWindow.Clue && contentWindow.Word && typeof contentWindow.LastHorizontalWord === 'number') {
      const clues = parseEclipseCrosswordData(contentWindow);
      if (clues && (clues.across.length > 0 || clues.down.length > 0)) {
        return clues;
      }
    }
    
    // Try EclipseCrossword API
    if (contentWindow.__ecwGetClues) {
      const clues = contentWindow.__ecwGetClues();
      if (clues && (clues.across?.length > 0 || clues.down?.length > 0)) {
        return normalizeClues(clues);
      }
    }

    // Fallback: Parse from DOM
    return parseCluesFromDOM(iframe);
  } catch (error) {
    console.error('Failed to extract clues from iframe:', error);
    return null;
  }
}

/**
 * Parse clues from EclipseCrossword data arrays
 */
function parseEclipseCrosswordData(win: any): CluesByDirection | null {
  try {
    const { Clue, Word, LastHorizontalWord, WordLength, WordX, WordY, CrosswordWidth, CrosswordHeight } = win;
    
    if (!Clue || !Word || typeof LastHorizontalWord !== 'number' || !WordX || !WordY) {
      return null;
    }

    // Build a mapping of grid positions to clue numbers
    // In a crossword, each cell that starts a word gets a sequential number from top-left to bottom-right
    const gridStarts = new Map<string, number>();
    const clueNumbers: number[] = new Array(Word.length);
    
    // Collect all word start positions
    const startPositions: Array<{ x: number; y: number; wordIndex: number }> = [];
    for (let i = 0; i < Word.length; i++) {
      startPositions.push({ x: WordX[i], y: WordY[i], wordIndex: i });
    }
    
    // Sort by y (row) first, then x (column) to assign numbers sequentially
    startPositions.sort((a, b) => {
      if (a.y !== b.y) return a.y - b.y;
      return a.x - b.x;
    });
    
    // Assign clue numbers, but don't duplicate for cells that start multiple words
    let nextNumber = 1;
    for (const pos of startPositions) {
      const key = `${pos.x},${pos.y}`;
      if (!gridStarts.has(key)) {
        gridStarts.set(key, nextNumber);
        nextNumber++;
      }
      clueNumbers[pos.wordIndex] = gridStarts.get(key)!;
    }

    const across: Clue[] = [];
    const down: Clue[] = [];

    // Helper to generate cell coordinates for a word
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

    // Words 0 to LastHorizontalWord-1 are across
    for (let i = 0; i < LastHorizontalWord; i++) {
      if (Clue[i] && Word[i]) {
        const wordLength = WordLength?.[i] || Word[i].length;
        across.push({
          number: clueNumbers[i],
          text: Clue[i],
          direction: 'across',
          answer: Word[i],
          length: wordLength,
          cells: generateCells(WordX[i], WordY[i], wordLength, true),
        });
      }
    }

    // Words from LastHorizontalWord onwards are down
    for (let i = LastHorizontalWord; i < Clue.length; i++) {
      if (Clue[i] && Word[i]) {
        const wordLength = WordLength?.[i] || Word[i].length;
        down.push({
          number: clueNumbers[i],
          text: Clue[i],
          direction: 'down',
          answer: Word[i],
          length: wordLength,
          cells: generateCells(WordX[i], WordY[i], wordLength, false),
        });
      }
    }

    return { across, down };
  } catch (error) {
    console.error('Failed to parse EclipseCrossword data:', error);
    return null;
  }
}

/**
 * Normalize clues to consistent format
 */
function normalizeClues(raw: any): CluesByDirection {
  const normalize = (clueList: any[]): Clue[] => {
    return (clueList || []).map(clue => ({
      number: clue.num || clue.number || 0,
      text: clue.clue || clue.text || '',
      direction: clue.direction || 'across',
      answer: clue.answer,
      length: clue.length || clue.answer?.length,
      cells: clue.cells || undefined,
    }));
  };

  return {
    across: normalize(raw.across),
    down: normalize(raw.down),
  };
}

/**
 * Parse clues from iframe DOM (fallback method)
 */
function parseCluesFromDOM(iframe: HTMLIFrameElement): CluesByDirection | null {
  try {
    const doc = iframe.contentDocument;
    if (!doc) return null;

    const across: Clue[] = [];
    const down: Clue[] = [];

    // Look for common clue list patterns
    const acrossSection = doc.querySelector('[class*="across"], [id*="across"]');
    const downSection = doc.querySelector('[class*="down"], [id*="down"]');

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

    return across.length > 0 || down.length > 0 ? { across, down } : null;
  } catch (error) {
    console.error('Failed to parse clues from DOM:', error);
    return null;
  }
}

/**
 * Extract clues with retry mechanism
 */
export async function extractCluesWithRetry(
  iframe: HTMLIFrameElement | null,
  maxAttempts: number = 10,
  delayMs: number = 500
): Promise<CluesByDirection> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const clues = extractCluesFromIframe(iframe);
    
    if (clues && (clues.across.length > 0 || clues.down.length > 0)) {
      console.log(`[ClueExtraction] Successfully extracted clues on attempt ${attempt}`);
      return clues;
    }

    if (attempt < maxAttempts) {
      console.log(`[ClueExtraction] Attempt ${attempt}/${maxAttempts} failed, retrying...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  console.warn(`[ClueExtraction] Failed to extract clues after ${maxAttempts} attempts`);
  return { across: [], down: [] };
}

/**
 * Format clues for display
 */
export function formatCluesForDisplay(clues: CluesByDirection) {
  const format = (clueList: Clue[]) => {
    return clueList.map(clue => ({
      number: clue.number,
      text: clue.text,
      length: clue.length,
      cells: clue.cells, // Include cells for highlight functionality
    })).sort((a, b) => a.number - b.number);
  };

  return {
    across: format(clues.across),
    down: format(clues.down),
  };
}
