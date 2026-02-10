import { useEffect, useRef, useCallback, useState } from 'react';
import {
  BridgeMessage,
  IframeToParentMessage,
  ParentToIframeMessage,
  ChannelId,
  createChannelId,
  createBaseMessage,
  isValidOrigin,
  isIframeToParentMessage,
  MessageHandler,
  PROTOCOL_VERSION,
} from './types';

/**
 * Hook options
 */
export interface UseIframeBridgeOptions {
  iframeRef: React.RefObject<HTMLIFrameElement>;
  channelId?: string;
  debug?: boolean;
  onReady?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Hook return type
 */
export interface IframeBridge {
  isReady: boolean;
  send: <T extends ParentToIframeMessage>(message: Omit<T, keyof typeof createBaseMessage>) => void;
  on: <T extends IframeToParentMessage>(
    type: T['type'],
    handler: MessageHandler<T>
  ) => () => void;
  channelId: ChannelId;
}

/**
 * Message queue item
 */
interface QueuedMessage {
  message: ParentToIframeMessage;
  timestamp: number;
}

/**
 * React hook for iframe bridge communication (parent side)
 * 
 * Features:
 * - Queues messages until iframe is ready
 * - Type-safe message sending and receiving
 * - Origin validation
 * - Automatic cleanup
 * - Debug logging
 * 
 * @example
 * ```tsx
 * const iframeRef = useRef<HTMLIFrameElement>(null);
 * const bridge = useIframeBridge({
 *   iframeRef,
 *   debug: true,
 *   onReady: () => console.log('Iframe ready!'),
 * });
 * 
 * // Send a message
 * bridge.send({
 *   type: 'SET_THEME',
 *   payload: { theme: 'dark', variables: {} }
 * });
 * 
 * // Listen for messages
 * useEffect(() => {
 *   return bridge.on('PROGRESS_UPDATE', (msg) => {
 *     console.log('Progress:', msg.payload.percentComplete);
 *   });
 * }, [bridge]);
 * ```
 */
export function useIframeBridge(options: UseIframeBridgeOptions): IframeBridge {
  const { iframeRef, channelId: providedChannelId, debug = false, onReady, onError } = options;

  // Initialize channel ID
  const channelId = useRef<ChannelId>(
    createChannelId(providedChannelId || `bridge-${Date.now()}`)
  );

  // Track ready state
  const [isReady, setIsReady] = useState(false);

  // Message queue for messages sent before iframe is ready
  const messageQueue = useRef<QueuedMessage[]>([]);

  // Event handlers registry
  const handlers = useRef<Map<string, Set<MessageHandler<any>>>>(new Map());

  /**
   * Log debug messages
   */
  const log = useCallback(
    (message: string, ...args: any[]) => {
      if (debug) {
        console.log(`[IframeBridge:${channelId.current}]`, message, ...args);
      }
    },
    [debug]
  );

  /**
   * Log errors
   */
  const logError = useCallback(
    (message: string, error?: any) => {
      console.error(`[IframeBridge:${channelId.current}] ERROR:`, message, error);
      if (onError && error instanceof Error) {
        onError(error);
      }
    },
    [onError]
  );

  /**
   * Send a message to the iframe
   */
  const send = useCallback(
    <T extends ParentToIframeMessage>(
      messageData: Omit<T, 'channelId' | 'version' | 'timestamp'>
    ) => {
      const iframe = iframeRef.current;
      if (!iframe?.contentWindow) {
        logError('Cannot send message: iframe not available');
        return;
      }

      // Create full message with base fields
      const message: ParentToIframeMessage = {
        ...createBaseMessage(channelId.current),
        ...messageData,
      } as ParentToIframeMessage;

      // Queue message if not ready, unless it's a critical setup message
      if (!isReady && message.type !== 'SET_PUZZLE_ID') {
        log('Queueing message (iframe not ready):', message.type);
        messageQueue.current.push({
          message,
          timestamp: Date.now(),
        });
        return;
      }

      try {
        // If the iframe is using `srcDoc`, browsers may set iframe.src to `about:srcdoc`
        // and the iframe's origin is effectively "null". In that case, using a strict
        // targetOrigin will drop the message. Using '*' is safe here because we're
        // posting to a specific window (not broadcasting), and we also scope messages
        // by channelId + protocol version.
        let targetOrigin = '*';
        try {
          const attrSrc = iframe.getAttribute('src');
          const src = attrSrc || iframe.src;
          if (src && !src.startsWith('about:')) {
            targetOrigin = new URL(src, window.location.href).origin;
          }
        } catch {
          targetOrigin = '*';
        }
        log('Sending message:', message.type, message.payload);
        iframe.contentWindow.postMessage(message, targetOrigin);
      } catch (error) {
        logError('Failed to send message', error);
      }
    },
    [iframeRef, isReady, channelId, log, logError]
  );

  /**
   * Register a message handler
   */
  const on = useCallback(
    <T extends IframeToParentMessage>(
      type: T['type'],
      handler: MessageHandler<T>
    ): (() => void) => {
      if (!handlers.current.has(type)) {
        handlers.current.set(type, new Set());
      }
      handlers.current.get(type)!.add(handler);

      log('Registered handler for:', type);

      // Return cleanup function
      return () => {
        const typeHandlers = handlers.current.get(type);
        if (typeHandlers) {
          typeHandlers.delete(handler);
          if (typeHandlers.size === 0) {
            handlers.current.delete(type);
          }
        }
        log('Unregistered handler for:', type);
      };
    },
    [log]
  );

  /**
   * Process queued messages after iframe becomes ready
   */
  const processQueue = useCallback(() => {
    if (messageQueue.current.length === 0) return;

    log('Processing queued messages:', messageQueue.current.length);
    const queue = [...messageQueue.current];
    messageQueue.current = [];

    queue.forEach(({ message }) => {
      send(message as any);
    });
  }, [send, log]);

  // Stable refs for callbacks to prevent re-renders
  const onReadyRef = useRef(onReady);
  const processQueueRef = useRef(processQueue);
  
  // Update refs when callbacks change (use layout effect to update before render)
  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);
  
  useEffect(() => {
    processQueueRef.current = processQueue;
  }, [processQueue]);
  
  // Stable channelId ref to avoid dependency issues
  // channelId is already a ref, so we can use it directly
  // No need for another ref wrapper

  /**
   * Handle incoming messages from iframe
   */
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Only accept messages coming from our iframe window. This is the strongest
      // filter we have and also lets us relax origin checks for sandboxed iframes
      // which may report origin as "null".
      const iframeWin = iframeRef.current?.contentWindow;
      if (!iframeWin || event.source !== iframeWin) {
        return;
      }

      // Validate origin
      // Sandboxed iframes can report `origin === "null"` even with allow-same-origin.
      // Since we already verified the message source window, allow "null" here.
      if (event.origin !== 'null' && !isValidOrigin(event.origin)) {
        logError('Invalid origin:', event.origin);
        return;
      }

      const message = event.data as BridgeMessage;

      // Validate message structure
      if (!message?.type || !message?.channelId || !message?.version) {
        return; // Ignore non-bridge messages
      }

      // Validate channel ID
      if (message.channelId !== channelId.current) {
        return; // Ignore messages from other channels
      }

      // Validate protocol version
      if (message.version !== PROTOCOL_VERSION) {
        logError(`Protocol version mismatch: ${message.version} !== ${PROTOCOL_VERSION}`);
        return;
      }

      // Only process iframe-to-parent messages
      if (!isIframeToParentMessage(message)) {
        return;
      }

      log('Received message:', message.type, message.payload);

      // Handle IFRAME_READY specially
      if (message.type === 'IFRAME_READY') {
        log('Iframe is ready');
        setIsReady(true);
        if (onReadyRef.current) {
          onReadyRef.current();
        }
        // Process queued messages after a small delay to ensure iframe is fully initialized
        setTimeout(() => processQueueRef.current(), 50);
      }

      // Call registered handlers
      const typeHandlers = handlers.current.get(message.type);
      if (typeHandlers && typeHandlers.size > 0) {
        typeHandlers.forEach((handler) => {
          try {
            handler(message);
          } catch (error) {
            logError(`Handler error for ${message.type}:`, error);
          }
        });
      }
    };

    window.addEventListener('message', handleMessage);
    log('Message listener attached');

    return () => {
      window.removeEventListener('message', handleMessage);
      log('Message listener detached');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // Dependencies: log and logError are stable callbacks, channelId is in ref
    // onReady and processQueue are in refs to prevent re-renders
  }, [log, logError]); // Stable dependencies only - callbacks use refs

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      // Clear message queue
      messageQueue.current = [];
      // Clear handlers
      handlers.current.clear();
      log('Bridge cleaned up');
    };
  }, [log]);

  return {
    isReady,
    send,
    on,
    channelId: channelId.current,
  };
}

/**
 * Helper hook to send a single message type with convenience
 */
export function useIframeBridgeSender<T extends ParentToIframeMessage>(
  bridge: IframeBridge,
  type: T['type']
) {
  return useCallback(
    (payload: T['payload']) => {
      bridge.send({ type, payload } as any);
    },
    [bridge, type]
  );
}

/**
 * Helper hook to listen to a single message type
 */
export function useIframeBridgeListener<T extends IframeToParentMessage>(
  bridge: IframeBridge,
  type: T['type'],
  handler: MessageHandler<T>,
  deps: React.DependencyList = []
) {
  useEffect(() => {
    return bridge.on(type, handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bridge, type, ...deps]);
}
