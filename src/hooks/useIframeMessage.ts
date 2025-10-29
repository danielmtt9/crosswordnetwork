'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import {
  IframeToParentMessage,
  ParentToIframeMessage,
  isIframeToParentMessage,
  isValidOrigin,
  validateMessage,
  logMessage,
  ProgressEvent,
  CompletionEvent,
  ValidationEvent,
  HintUsedEvent,
  SuggestHintEvent,
  DimensionsEvent,
  WordListEvent,
  WordRevealedEvent,
  StateLoadedEvent,
  ErrorEvent,
} from '@/lib/iframeMessaging';

export interface UseIframeMessageOptions {
  iframeRef: React.RefObject<HTMLIFrameElement>;
  allowedOrigins?: string[];
  debug?: boolean;
  
  // Event handlers
  onProgress?: (event: ProgressEvent) => void;
  onComplete?: (event: CompletionEvent) => void;
  onValidation?: (event: ValidationEvent) => void;
  onHintUsed?: (event: HintUsedEvent) => void;
  onSuggestHint?: (event: SuggestHintEvent) => void;
  onDimensions?: (event: DimensionsEvent) => void;
  onWordList?: (event: WordListEvent) => void;
  onWordRevealed?: (event: WordRevealedEvent) => void;
  onStateLoaded?: (event: StateLoadedEvent) => void;
  onError?: (event: ErrorEvent) => void;
}

export interface UseIframeMessageReturn {
  // Send commands to iframe
  getState: () => void;
  loadState: (state: string) => void;
  setPuzzleId: (puzzleId: string) => void;
  revealLetter: (cellIndex?: number) => void;
  revealWord: (direction: 'across' | 'down', number: number) => void;
  checkPuzzle: () => void;
  
  // Status
  isConnected: boolean;
  lastMessageTime: number | null;
}

/**
 * Hook to handle postMessage communication with EclipseCrossword iframe.
 * 
 * Provides type-safe message sending/receiving with validation and error handling.
 */
export function useIframeMessage({
  iframeRef,
  allowedOrigins = ['*'],
  debug = false,
  onProgress,
  onComplete,
  onValidation,
  onHintUsed,
  onSuggestHint,
  onDimensions,
  onWordList,
  onWordRevealed,
  onStateLoaded,
  onError,
}: UseIframeMessageOptions): UseIframeMessageReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessageTime, setLastMessageTime] = useState<number | null>(null);
  const handlersRef = useRef({
    onProgress,
    onComplete,
    onValidation,
    onHintUsed,
    onSuggestHint,
    onDimensions,
    onWordList,
    onWordRevealed,
    onStateLoaded,
    onError,
  });

  // Update handlers ref when they change
  useEffect(() => {
    handlersRef.current = {
      onProgress,
      onComplete,
      onValidation,
      onHintUsed,
      onSuggestHint,
      onDimensions,
      onWordList,
      onWordRevealed,
      onStateLoaded,
      onError,
    };
  }, [
    onProgress,
    onComplete,
    onValidation,
    onHintUsed,
    onSuggestHint,
    onDimensions,
    onWordList,
    onWordRevealed,
    onStateLoaded,
    onError,
  ]);

  // Send message to iframe
  const sendMessage = useCallback(
    (message: ParentToIframeMessage) => {
      if (!iframeRef.current?.contentWindow) {
        console.warn('[useIframeMessage] Iframe not ready');
        return;
      }

      logMessage('sent', message, debug);
      iframeRef.current.contentWindow.postMessage(message, '*');
    },
    [iframeRef, debug]
  );

  // Command functions
  const getState = useCallback(() => {
    sendMessage({ type: 'GET_STATE' });
  }, [sendMessage]);

  const loadState = useCallback(
    (state: string) => {
      sendMessage({ type: 'LOAD_STATE', state });
    },
    [sendMessage]
  );

  const setPuzzleId = useCallback(
    (puzzleId: string) => {
      sendMessage({ type: 'SET_PUZZLE_ID', puzzleId });
    },
    [sendMessage]
  );

  const revealLetter = useCallback(
    (cellIndex?: number) => {
      sendMessage({ type: 'reveal_letter', cellIndex });
    },
    [sendMessage]
  );

  const revealWord = useCallback(
    (direction: 'across' | 'down', number: number) => {
      sendMessage({ type: 'reveal_word', direction, number });
    },
    [sendMessage]
  );

  const checkPuzzle = useCallback(() => {
    sendMessage({ type: 'check_puzzle' });
  }, [sendMessage]);

  // Handle incoming messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Validate origin
      if (!isValidOrigin(event.origin, allowedOrigins)) {
        if (debug) {
          console.warn('[useIframeMessage] Invalid origin:', event.origin);
        }
        return;
      }

      // Check if message is from our iframe
      if (iframeRef.current && event.source !== iframeRef.current.contentWindow) {
        return;
      }

      // Validate message structure
      const validation = validateMessage(event.data);
      if (!validation.valid) {
        if (debug) {
          console.warn('[useIframeMessage] Invalid message:', validation.error);
        }
        return;
      }

      // Type check
      if (!isIframeToParentMessage(event.data)) {
        return;
      }

      const message = event.data as IframeToParentMessage;
      logMessage('received', message, debug);

      setLastMessageTime(Date.now());
      setIsConnected(true);

      // Route to appropriate handler
      const handlers = handlersRef.current;
      
      switch (message.type) {
        case 'progress':
          handlers.onProgress?.(message);
          break;
        case 'complete':
          handlers.onComplete?.(message);
          break;
        case 'letter_validated':
          handlers.onValidation?.(message);
          break;
        case 'hint_used':
          handlers.onHintUsed?.(message);
          break;
        case 'suggest_hint':
          handlers.onSuggestHint?.(message);
          break;
        case 'dimensions':
          handlers.onDimensions?.(message);
          break;
        case 'wordlist':
          handlers.onWordList?.(message);
          break;
        case 'word_revealed':
          handlers.onWordRevealed?.(message);
          break;
        case 'STATE_LOADED':
          handlers.onStateLoaded?.(message);
          break;
        case 'error':
          handlers.onError?.(message);
          break;
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [iframeRef, allowedOrigins, debug]);

  return {
    getState,
    loadState,
    setPuzzleId,
    revealLetter,
    revealWord,
    checkPuzzle,
    isConnected,
    lastMessageTime,
  };
}
