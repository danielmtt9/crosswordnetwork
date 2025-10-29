/**
 * Enhanced Iframe Communication System
 * 
 * Provides type-safe messaging between parent window and EclipseCrossword iframe.
 * Includes message validation, origin checking, and acknowledgment support.
 */

// Message types from iframe to parent
export interface ProgressEvent {
  type: 'progress';
  completed: number;
  total: number;
  timestamp: number;
}

export interface CompletionEvent {
  type: 'complete';
  timestamp: number;
  timeElapsed?: number;
}

export interface ValidationEvent {
  type: 'letter_validated';
  correct: boolean;
  cellIndex: number;
  timestamp: number;
}

export interface HintUsedEvent {
  type: 'hint_used';
  hintType: 'letter' | 'word' | 'check';
  timestamp: number;
}

export interface SuggestHintEvent {
  type: 'suggest_hint';
  reason: string;
  timestamp: number;
}

export interface DimensionsEvent {
  type: 'dimensions';
  width: number;
  height: number;
  timestamp: number;
}

export interface WordListEvent {
  type: 'wordlist';
  across: Array<{ number: number; text: string; answer?: string }>;
  down: Array<{ number: number; text: string; answer?: string }>;
  timestamp: number;
}

export interface WordRevealedEvent {
  type: 'word_revealed';
  direction: 'across' | 'down';
  number: number;
  answer: string;
  timestamp: number;
}

export interface StateLoadedEvent {
  type: 'STATE_LOADED';
  success: boolean;
  timestamp: number;
}

export interface ErrorEvent {
  type: 'error';
  message: string;
  code?: string;
  timestamp: number;
}

// Union type of all events from iframe
export type IframeToParentMessage =
  | ProgressEvent
  | CompletionEvent
  | ValidationEvent
  | HintUsedEvent
  | SuggestHintEvent
  | DimensionsEvent
  | WordListEvent
  | WordRevealedEvent
  | StateLoadedEvent
  | ErrorEvent;

// Message types from parent to iframe
export interface GetStateCommand {
  type: 'GET_STATE';
  requestId?: string;
}

export interface LoadStateCommand {
  type: 'LOAD_STATE';
  state: string;
  requestId?: string;
}

export interface SetPuzzleIdCommand {
  type: 'SET_PUZZLE_ID';
  puzzleId: string;
  requestId?: string;
}

export interface RevealLetterCommand {
  type: 'reveal_letter';
  cellIndex?: number;
  requestId?: string;
}

export interface RevealWordCommand {
  type: 'reveal_word';
  direction: 'across' | 'down';
  number: number;
  requestId?: string;
}

export interface CheckPuzzleCommand {
  type: 'check_puzzle';
  requestId?: string;
}

// Union type of all commands from parent
export type ParentToIframeMessage =
  | GetStateCommand
  | LoadStateCommand
  | SetPuzzleIdCommand
  | RevealLetterCommand
  | RevealWordCommand
  | CheckPuzzleCommand;

// Message wrapper for acknowledgment
export interface MessageEnvelope<T = IframeToParentMessage | ParentToIframeMessage> {
  payload: T;
  messageId: string;
  timestamp: number;
  requiresAck?: boolean;
}

// Acknowledgment message
export interface AcknowledgmentMessage {
  type: 'ACK';
  messageId: string;
  timestamp: number;
}

/**
 * Type guard to check if a message is from iframe to parent
 */
export function isIframeToParentMessage(data: any): data is IframeToParentMessage {
  if (!data || typeof data !== 'object' || !data.type) {
    return false;
  }

  const validTypes = [
    'progress',
    'complete',
    'letter_validated',
    'hint_used',
    'suggest_hint',
    'dimensions',
    'wordlist',
    'word_revealed',
    'STATE_LOADED',
    'error',
  ];

  return validTypes.includes(data.type);
}

/**
 * Type guard to check if a message is from parent to iframe
 */
export function isParentToIframeMessage(data: any): data is ParentToIframeMessage {
  if (!data || typeof data !== 'object' || !data.type) {
    return false;
  }

  const validTypes = [
    'GET_STATE',
    'LOAD_STATE',
    'SET_PUZZLE_ID',
    'reveal_letter',
    'reveal_word',
    'check_puzzle',
  ];

  return validTypes.includes(data.type);
}

/**
 * Type guard to check if data is an acknowledgment
 */
export function isAcknowledgment(data: any): data is AcknowledgmentMessage {
  return data && data.type === 'ACK' && typeof data.messageId === 'string';
}

/**
 * Validate message origin
 */
export function isValidOrigin(origin: string, allowedOrigins: string[]): boolean {
  // Allow same origin
  if (origin === window.location.origin) {
    return true;
  }

  // Check against allowed origins
  return allowedOrigins.some((allowed) => {
    if (allowed === '*') return true;
    if (allowed.endsWith('*')) {
      const prefix = allowed.slice(0, -1);
      return origin.startsWith(prefix);
    }
    return origin === allowed;
  });
}

/**
 * Generate unique message ID
 */
export function generateMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a message envelope
 */
export function createEnvelope<T>(
  payload: T,
  requiresAck = false
): MessageEnvelope<T> {
  return {
    payload,
    messageId: generateMessageId(),
    timestamp: Date.now(),
    requiresAck,
  };
}

/**
 * Create an acknowledgment message
 */
export function createAcknowledgment(messageId: string): AcknowledgmentMessage {
  return {
    type: 'ACK',
    messageId,
    timestamp: Date.now(),
  };
}

/**
 * Message validation with detailed error reporting
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateMessage(data: any): ValidationResult {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Message is not an object' };
  }

  if (!data.type || typeof data.type !== 'string') {
    return { valid: false, error: 'Message missing type field' };
  }

  // Validate specific message types
  if (data.type === 'progress') {
    if (typeof data.completed !== 'number' || typeof data.total !== 'number') {
      return { valid: false, error: 'Progress event missing completed/total' };
    }
  }

  if (data.type === 'dimensions') {
    if (typeof data.width !== 'number' || typeof data.height !== 'number') {
      return { valid: false, error: 'Dimensions event missing width/height' };
    }
  }

  return { valid: true };
}

/**
 * Debug logging helper (conditional)
 */
export function logMessage(
  direction: 'sent' | 'received',
  message: any,
  debug = false
) {
  if (debug && typeof window !== 'undefined') {
    console.log(`[IframeMessaging] ${direction}:`, message);
  }
}
