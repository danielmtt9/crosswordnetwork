/**
 * Branded type for channel identification
 */
export type ChannelId = string & { readonly __brand: 'ChannelId' };

/**
 * Branded type for puzzle identification
 */
export type PuzzleId = string & { readonly __brand: 'PuzzleId' };

/**
 * Protocol version
 */
export const PROTOCOL_VERSION = '1.0.0';

/**
 * Valid origins for message passing
 */
export const VALID_ORIGINS = {
  PARENT: typeof window !== 'undefined' ? window.location.origin : '',
  IFRAME: typeof window !== 'undefined' ? window.location.origin : '',
} as const;

/**
 * Base message structure
 */
export interface BaseMessage {
  channelId: ChannelId;
  version: string;
  timestamp: number;
}

/**
 * Cell coordinates in the grid
 */
export interface CellCoordinate {
  row: number;
  col: number;
}

/**
 * Clue information
 */
export interface Clue {
  number: number;
  direction: 'across' | 'down';
  text: string;
  answer: string;
  length: number;
  cells: CellCoordinate[];
}

/**
 * Grid dimensions
 */
export interface GridDimensions {
  rows: number;
  cols: number;
  padding: number;
  border: number;
}

/**
 * CSS theme variables
 */
export interface ThemeVariables {
  '--cw-cell-bg'?: string;
  '--cw-cell-text'?: string;
  '--cw-highlight-across'?: string;
  '--cw-highlight-down'?: string;
  '--cw-correct'?: string;
  '--cw-incorrect'?: string;
  '--cw-grid-gap'?: string;
  '--cw-cell-size'?: string;
  [key: string]: string | undefined;
}

/**
 * Messages sent from iframe to parent
 */
export type IframeToParentMessage = BaseMessage & (
  | {
      type: 'IFRAME_READY';
      payload: {
        puzzleId: PuzzleId;
        dimensions: GridDimensions;
      };
    }
  | {
      type: 'STATE_LOADED';
      payload: {
        success: boolean;
        cellsFilled: number;
      };
    }
  | {
      type: 'PROGRESS_UPDATE';
      payload: {
        totalCells: number;
        filledCells: number;
        correctCells: number;
        percentComplete: number;
      };
    }
  | {
      type: 'PUZZLE_COMPLETE';
      payload: {
        timeElapsed: number;
        hintsUsed: number;
      };
    }
  | {
      type: 'HINT_USED';
      payload: {
        type: 'letter' | 'word' | 'check';
        cell?: CellCoordinate;
        word?: { clueNumber: number; direction: 'across' | 'down' };
      };
    }
  | {
      type: 'LETTER_VALIDATED';
      payload: {
        cell: CellCoordinate;
        letter: string;
        isCorrect: boolean;
      };
    }
  | {
      type: 'SUGGEST_HINT';
      payload: {
        reason: string;
      };
    }
  | {
      type: 'DIMENSIONS_CHANGED';
      payload: GridDimensions;
    }
  | {
      type: 'WORDLIST_AVAILABLE';
      payload: {
        clues: Clue[];
      };
    }
  | {
      type: 'WORD_REVEALED';
      payload: {
        clueNumber: number;
        direction: 'across' | 'down';
        answer: string;
      };
    }
);

/**
 * Messages sent from parent to iframe
 */
export type ParentToIframeMessage = BaseMessage & (
  | {
      type: 'SET_PUZZLE_ID';
      payload: {
        puzzleId: PuzzleId;
      };
    }
  | {
      type: 'INJECT_CSS';
      payload: {
        cssText: string;
        variables?: ThemeVariables;
      };
    }
  | {
      type: 'SET_THEME';
      payload: {
        theme: 'light' | 'dark';
        variables: ThemeVariables;
      };
    }
  | {
      type: 'GET_STATE';
      payload: Record<string, never>; // Empty payload
    }
  | {
      type: 'LOAD_STATE';
      payload: {
        gridState: Record<string, string>;
        timestamp: number;
      };
    }
  | {
      type: 'REVEAL_LETTER';
      payload: {
        cell: CellCoordinate;
      };
    }
  | {
      type: 'REVEAL_WORD';
      payload: {
        clueNumber: number;
        direction: 'across' | 'down';
      };
    }
  | {
      type: 'FOCUS_CLUE';
      payload: {
        clueNumber: number;
        direction: 'across' | 'down';
      };
    }
  | {
      type: 'HIGHLIGHT_CELLS';
      payload: {
        cells: CellCoordinate[];
        direction: 'across' | 'down';
      };
    }
  | {
      type: 'CLEAR_HIGHLIGHT';
      payload: Record<string, never>; // Empty payload
    }
  | {
      type: 'TRIGGER_ANIMATION';
      payload: {
        animationType: 'correct' | 'incorrect' | 'celebrate' | 'hint' | 'glow' | 'fadeIn';
        targetSelector: string; // CSS selector for target element(s)
        duration?: number; // Override default duration in ms
        remove?: boolean; // Whether to remove animation class after completion
      };
    }
);

/**
 * Union of all possible messages
 */
export type BridgeMessage = IframeToParentMessage | ParentToIframeMessage;

/**
 * Message handler type
 */
export type MessageHandler<T extends BridgeMessage> = (
  message: T
) => void | Promise<void>;

/**
 * Type guard for iframe-to-parent messages
 */
export function isIframeToParentMessage(
  message: BridgeMessage
): message is IframeToParentMessage {
  const iframeTypes = [
    'IFRAME_READY',
    'STATE_LOADED',
    'PROGRESS_UPDATE',
    'PUZZLE_COMPLETE',
    'HINT_USED',
    'LETTER_VALIDATED',
    'SUGGEST_HINT',
    'DIMENSIONS_CHANGED',
    'WORDLIST_AVAILABLE',
    'WORD_REVEALED',
  ];
  return iframeTypes.includes(message.type);
}

/**
 * Type guard for parent-to-iframe messages
 */
export function isParentToIframeMessage(
  message: BridgeMessage
): message is ParentToIframeMessage {
  return !isIframeToParentMessage(message);
}

/**
 * Create a branded ChannelId
 */
export function createChannelId(id: string): ChannelId {
  return id as ChannelId;
}

/**
 * Create a branded PuzzleId
 */
export function createPuzzleId(id: string | number): PuzzleId {
  return String(id) as PuzzleId;
}

/**
 * Validate message origin
 */
export function isValidOrigin(origin: string): boolean {
  return origin === VALID_ORIGINS.PARENT || origin === VALID_ORIGINS.IFRAME;
}

/**
 * Create a base message with timestamp and version
 */
export function createBaseMessage(channelId: ChannelId): BaseMessage {
  return {
    channelId,
    version: PROTOCOL_VERSION,
    timestamp: Date.now(),
  };
}
