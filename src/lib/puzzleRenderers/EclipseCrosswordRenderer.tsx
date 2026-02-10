"use client";

import React, { useEffect, useRef, useState } from 'react';
import { PuzzleRenderer, PuzzleRenderProps, IframeMessage, ProgressData, CompletionData } from './types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Puzzle, AlertCircle, RefreshCw, ArrowLeft, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

/**
 * EclipseCrossword Renderer
 * 
 * Detects and renders EclipseCrossword HTML puzzles in a sandboxed iframe
 * with postMessage communication for progress tracking.
 */
export const EclipseCrosswordRenderer: PuzzleRenderer = {
  type: 'iframe',
  name: 'EclipseCrossword',
  
  canHandle: (content: string): boolean => {
    if (!content || typeof content !== 'string') {
      console.log('[EclipseCrossword] canHandle: content is null/undefined or not string');
      return false;
    }
    
    // Check for EclipseCrossword-specific markers
    const markers = [
      'CrosswordWidth',
      'CrosswordHeight', 
      'Words =',
      'Word = new Array',
      'Clue = new Array',
      'EclipseCrossword',
      'document.writeln("<table id=\\"crossword\\"'
    ];
    
    const foundMarkers = markers.filter(marker => content.includes(marker));
    const canHandle = foundMarkers.length > 0;
    
    console.log('[EclipseCrossword] canHandle check:', {
      contentLength: content.length,
      contentPreview: content.substring(0, 200) + '...',
      foundMarkers,
      canHandle
    });
    
    return canHandle;
  },
  
  render: (props: PuzzleRenderProps): React.ReactNode => {
    return <EclipseCrosswordComponent {...props} />;
  }
};

interface EclipseCrosswordComponentProps extends PuzzleRenderProps {
  // Additional props specific to EclipseCrossword
}

function EclipseCrosswordComponent({ 
  puzzleId, 
  content, 
  onProgress, 
  onComplete,
  isMultiplayer = false,
  onCellUpdate,
  onCursorMove
}: EclipseCrosswordComponentProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastMessageTime, setLastMessageTime] = useState<number>(0);
  const [iframeHeight, setIframeHeight] = useState<number>(600);
  
  // Setup postMessage communication
  useEffect(() => {
    const handleMessage = (event: MessageEvent<IframeMessage>) => {
      // Validate message source and origin for security
      if (event.data?.source !== 'eclipsecrossword-iframe') return;
      if (event.origin !== window.location.origin) return;
      if (event.data.puzzleId !== puzzleId) return;
      
      // Throttle messages to prevent spam
      const now = Date.now();
      if (now - lastMessageTime < 100) {
        return;
      }
      setLastMessageTime(now);
      
      const { type, data, timestamp } = event.data;
      
      if (!type || !data) return;
      
      switch (type) {
        case 'progress':
          if (onProgress) {
            const progressData: ProgressData = {
              type: 'progress',
              puzzleId,
              data: {
                gridState: data.gridState,
                progress: data.progress,
                filledCells: data.filledCells,
                totalCells: data.totalCells,
                hintsUsed: data.hintsUsed || 0
              },
              timestamp: timestamp || Date.now()
            };
            onProgress(progressData);
          }
          break;
        case 'wordlist':
          if (onProgress) {
            onProgress({
              type: 'wordlist',
              puzzleId,
              data,
              timestamp: timestamp || Date.now()
            } as any);
          }
          break;
          
        case 'complete':
          if (onComplete) {
            const completionData: CompletionData = {
              puzzleId,
              completionTime: data.completionTime,
              score: data.score,
              hintsUsed: data.hintsUsed,
              timestamp: timestamp || Date.now()
            };
            onComplete(completionData);
          }
          break;
          
        case 'hint_used':
          if (onProgress) {
            const progressData: ProgressData = {
              type: 'hint_used',
              puzzleId,
              data: {
                hintsUsed: data.hintsUsed,
                currentWord: data.currentWord
              },
              timestamp: timestamp || Date.now()
            };
            onProgress(progressData);
          }
          break;
          
        case 'dimensions':
          // Log dimensions vs container for debug
          try {
            // eslint-disable-next-line no-console
            console.log('[ECW DEBUG parent]', {
              totalHeight: data.totalHeight,
              viewportH: window.innerHeight
            });
          } catch {}
          // Use the total height sent from the iframe, with a minimum
          if (data.totalHeight && typeof data.totalHeight === 'number') {
            const minHeight = 400;
            // Remove maxHeight constraint to allow full puzzle height
            const newHeight = Math.max(minHeight, data.totalHeight);
            setIframeHeight(newHeight);
          }
          break;
      }
    };
    
    window.addEventListener('message', handleMessage);
    
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [puzzleId, onProgress, onComplete, lastMessageTime]);
  
  // Handle iframe load
  const handleIframeLoad = () => {
    setIsLoading(false);
    setError(null);
    
    // Send puzzle ID to iframe
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({
        type: 'SET_PUZZLE_ID',
        puzzleId: puzzleId
      }, '*');
      
      // Enable optional cell update callbacks if specified
      if (isMultiplayer && iframeRef.current.contentWindow.__enableMultiplayer) {
        console.log('[EclipseCrossword] Enabling cell update callback');
        iframeRef.current.contentWindow.__enableMultiplayer((cellData: any) => {
          console.log('[EclipseCrossword] Callback received:', cellData);
          // Call the onCellUpdate callback
          if (onCellUpdate) {
            console.log('[EclipseCrossword] Calling onCellUpdate with:', cellData);
            onCellUpdate(cellData);
          }
        });
      }
    }
  };

  // Expose a window-scoped reveal method for this puzzleId
  useEffect(() => {
    const anyWindow = window as any;
    if (!anyWindow.__ecwRevealLetterMap) anyWindow.__ecwRevealLetterMap = {};
    anyWindow.__ecwRevealLetterMap[puzzleId] = (wordIndex?: number) => {
      try {
        iframeRef.current?.contentWindow?.postMessage(
          { source: 'parent', type: 'reveal_letter', puzzleId, wordIndex },
          window.location.origin
        );
      } catch {}
    };
    return () => {
      try { if (anyWindow.__ecwRevealLetterMap) delete anyWindow.__ecwRevealLetterMap[puzzleId]; } catch {}
    };
  }, [puzzleId]);
  
  // Handle iframe error
  const handleIframeError = () => {
    setIsLoading(false);
    setError('Failed to load puzzle. Please try refreshing the page.');
  };
  
  // Get iframe source URL with debug parameter if enabled
  const isDebugMode = typeof window !== 'undefined' && window.location.search.includes('debug=1');
  const iframeSrc = `/api/puzzles/${puzzleId}/content?mode=iframe${isDebugMode ? '&debug=1' : ''}`;
  
  return (
    <div className="puzzle-wrapper relative">
      {/* Gradient background glow */}
      <div className="absolute -inset-1 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 rounded-2xl opacity-20 blur-lg"></div>
      
      {/* Main container with minimal styling */}
      <div className="relative bg-card border border-green-200 dark:border-green-800 rounded-lg shadow-sm overflow-hidden">
        {/* Iframe container with minimal padding */}
        <div className="relative bg-background p-2">
          {/* Enhanced loading state with green theme */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/98 backdrop-blur-md z-10">
              <div className="text-center space-y-6 p-8">
                <div className="relative mx-auto w-16 h-16">
                  {/* Outer ring */}
                  <div className="absolute inset-0 rounded-full border-4 border-green-200 dark:border-green-800"></div>
                  {/* Spinning ring */}
                  <div className="absolute inset-0 rounded-full border-4 border-green-500 border-t-transparent animate-spin"></div>
                  {/* Inner pulse */}
                  <div className="absolute inset-2 rounded-full bg-green-500/20 animate-pulse"></div>
                </div>
                <div className="space-y-2">
                  <h3 className="font-bold text-lg text-foreground">Loading Puzzle</h3>
                  <p className="text-sm text-muted-foreground">Preparing your crossword experience...</p>
                </div>
                {/* Animated progress bar */}
                <div className="w-64 bg-green-100 dark:bg-green-900/30 rounded-full h-2 mx-auto overflow-hidden">
                  <motion.div 
                    className="bg-gradient-to-r from-green-500 to-emerald-500 h-full rounded-full"
                    animate={{ x: ['-100%', '100%'] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                  />
                </div>
              </div>
            </div>
          )}
          
          {error && (
            <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-6 mx-4 my-4">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-full bg-destructive/10 flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <h3 className="font-semibold text-destructive mb-1">Failed to Load Puzzle</h3>
                    <p className="text-sm text-muted-foreground">{error}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Try Again
                    </Button>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href="/puzzles">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Puzzles
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <iframe
            ref={iframeRef}
            src={iframeSrc}
            className="w-full border-0 rounded-xl"
            sandbox="allow-scripts allow-same-origin allow-forms"
            title={`EclipseCrossword Puzzle ${puzzleId}`}
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            loading="lazy"
            data-puzzle-content
            style={{
              // Use computed pixel height from parent instead of 100%
              height: `${iframeHeight}px`,
              minHeight: '0px',
              maxHeight: 'none',
              backgroundColor: 'transparent',
              overflow: 'hidden', // No scrollbars in iframe
              display: 'block'
            }}
          />
        </div>
      </div>
    </div>
  );
}

// Helper to request a reveal-letter hint in the iframe
export function sendRevealLetter(iframe: HTMLIFrameElement | null, puzzleId: number, wordIndex?: number) {
  try {
    iframe?.contentWindow?.postMessage(
      { source: 'parent', type: 'reveal_letter', puzzleId, wordIndex },
      window.location.origin
    );
  } catch {}
}
