/**
 * Clue extraction utilities for crossword puzzles
 */

export interface Clue {
  number: number;
  text: string;
  direction: 'across' | 'down';
  answer?: string;
  length?: number;
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
      clue: clue.text,
      length: clue.length,
    })).sort((a, b) => a.number - b.number);
  };

  return {
    across: format(clues.across),
    down: format(clues.down),
  };
}
