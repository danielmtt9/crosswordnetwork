import { useState, useEffect, useCallback, useRef } from 'react';
import type { SelectedWord } from '@/components/puzzle/ExternalAnswerBox';

interface BridgeMessage {
  type: string;
  bridgeId?: string;
  sourceId?: string;
  data?: unknown;
}

interface GridUpdateData {
  sourceId?: string;
  updates?: Array<{ index: number; value: string }>;
}

interface WordSelectedData {
  word?: {
    id?: string;
    number: number;
    direction: 'across' | 'down';
    clue: string;
    length: number;
    currentFill?: string;
    indexInWord?: number;
  };
}

interface CaretMovedData {
  indexInWord?: number;
}

interface UseExternalInputBridgeOptions {
  iframeRef: React.RefObject<HTMLIFrameElement>;
  enabled?: boolean;
  /** When true, use in-iframe overlay input instead of ExternalAnswerBox */
  integratedGridInput?: boolean;
  onReady?: () => void;
  onWordSelected?: (word: SelectedWord) => void;
  onGridUpdated?: (data: GridUpdateData) => void;
}

/**
 * Hook to manage external input bridge communication with iframe
 */
export function useExternalInputBridge({
  iframeRef,
  enabled = true,
  integratedGridInput = true,
  onReady,
  onWordSelected,
  onGridUpdated,
}: UseExternalInputBridgeOptions) {
  const [isReady, setIsReady] = useState(false);
  const [selectedWord, setSelectedWord] = useState<SelectedWord | null>(null);
  const sourceIdRef = useRef<string>(`parent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const bridgeIdRef = useRef<string | null>(null);

  // Send message to iframe
  const sendToIframe = useCallback((type: string, data?: any) => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) {
      console.warn('[ExternalInputBridge] Cannot send message - iframe not ready');
      return;
    }

    const message: BridgeMessage = {
      type,
      bridgeId: bridgeIdRef.current || undefined,
      sourceId: sourceIdRef.current,
      data,
    };

    console.log('[ExternalInputBridge] Sending:', message);
    iframe.contentWindow.postMessage(message, '*');
  }, [iframeRef]);

  // Enable external input mode
  const enableExternal = useCallback(() => {
    // Only enable if bridge is ready and we have a valid iframe
    if (!isReady || !iframeRef.current?.contentWindow) {
      console.warn('[ExternalInputBridge] Cannot enable external input - bridge not ready');
      return;
    }
    console.log('[ExternalInputBridge] Enabling external input mode', { integratedGridInput });
    sendToIframe('EC_ENABLE_EXTERNAL_INPUT', {
      hideInternal: true,
      forceHide: true,
      verified: true,
      sourceId: sourceIdRef.current,
      integratedGridInput,
    });
  }, [sendToIframe, isReady, iframeRef, integratedGridInput]);

  // Apply input value
  const applyInput = useCallback((value: string, wordId?: string) => {
    sendToIframe('EC_APPLY_INPUT', {
      wordId: wordId || selectedWord?.id,
      value,
      mode: 'replace',
    });
  }, [sendToIframe, selectedWord]);

  // Backspace
  const backspace = useCallback((wordId?: string) => {
    sendToIframe('EC_BACKSPACE', {
      wordId: wordId || selectedWord?.id,
    });
  }, [sendToIframe, selectedWord]);

  // Clear word
  const clearWord = useCallback((wordId?: string) => {
    sendToIframe('EC_CLEAR_WORD', {
      wordId: wordId || selectedWord?.id,
    });
  }, [sendToIframe, selectedWord]);

  // Move caret
  const moveCaret = useCallback((delta: number) => {
    sendToIframe('EC_MOVE_CARET', {
      delta,
    });
  }, [sendToIframe]);

  // Select word
  const selectWord = useCallback((wordId: string) => {
    sendToIframe('EC_SELECT_WORD', {
      wordId,
    });
  }, [sendToIframe]);

  // Handle messages from iframe
  useEffect(() => {
    if (!enabled) return;

    const handleMessage = (event: MessageEvent) => {
      const iframe = iframeRef.current;
      if (!iframe || event.source !== iframe.contentWindow) return;

      const message = event.data as BridgeMessage;
      if (!message || !message.type) return;

      console.log('[ExternalInputBridge] Received:', message);

      // Ignore our own echoed messages
      if (message.sourceId === sourceIdRef.current) {
        return;
      }

      switch (message.type) {
        case 'EC_IFRAME_READY':
          bridgeIdRef.current = message.bridgeId || null;
          console.log('[ExternalInputBridge] Bridge ready, ID:', bridgeIdRef.current);
          setIsReady(true);
          onReady?.();
          // Auto-enable external input only if explicitly enabled and iframe is ready
          if (enabled && iframeRef.current?.contentWindow) {
            // Delay slightly to ensure bridge is fully initialized
            // Use a ref check instead of state since state might not be updated in setTimeout
            const iframeWindow = iframeRef.current.contentWindow;
            setTimeout(() => {
              // Check if iframe is still available and bridge is ready
              if (iframeRef.current?.contentWindow === iframeWindow && bridgeIdRef.current) {
                enableExternal();
              } else {
                console.warn('[ExternalInputBridge] Cannot enable external input - iframe or bridge not available');
              }
            }, 200);
          }
          break;

        case 'EC_WORD_SELECTED': {
          const wordData = message.data as WordSelectedData;
          if (wordData?.word) {
            const word: SelectedWord = {
              id: wordData.word.id || `${wordData.word.number}-${wordData.word.direction}`,
              number: wordData.word.number,
              direction: wordData.word.direction,
              clue: wordData.word.clue,
              length: wordData.word.length,
              currentFill: wordData.word.currentFill || '',
              indexInWord: wordData.word.indexInWord || 0,
            };
            setSelectedWord(word);
            onWordSelected?.(word);
          }
          break;
        }

        case 'EC_GRID_UPDATED': {
          const gridData = message.data as GridUpdateData;
          onGridUpdated?.(gridData);
          break;
        }

        case 'EC_INTERNAL_INPUT':
          // Handle internal input events if needed
          console.log('[ExternalInputBridge] Internal input:', message.data);
          break;

        case 'EC_CARET_MOVED': {
          // Update caret position if needed
          const caretData = message.data as CaretMovedData;
          if (selectedWord && caretData?.indexInWord !== undefined) {
            setSelectedWord({
              ...selectedWord,
              indexInWord: caretData.indexInWord,
            });
          }
          break;
        }
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [enabled, iframeRef, onReady, onWordSelected, onGridUpdated, selectedWord, enableExternal]);

  return {
    isReady,
    selectedWord,
    integratedGridInput,
    enableExternal,
    applyInput,
    backspace,
    clearWord,
    moveCaret,
    selectWord,
  };
}
