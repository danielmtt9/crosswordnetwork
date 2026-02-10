'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { 
  fetchThemeCSS, 
  injectCSS, 
  getDefaultThemeVariables,
  getLightThemeVariables,
  getDarkThemeVariables, 
  setupHotReload,
  injectHighlightStyles,
  type ThemeVariables,
} from '@/lib/puzzleBridge';
import { injectBridgeScriptSmart } from '@/lib/puzzleBridge/injectBridgeScript';

/**
 * Props for the PuzzleArea component
 */
export interface PuzzleAreaProps {
  /** URL to load puzzle from */
  puzzleUrl?: string;
  /** Direct HTML content for puzzle */
  puzzleContent?: string;
  /** Fixed height for iframe (optional) */
  height?: number;
  /** External ref to access iframe element */
  iframeRef?: React.RefObject<HTMLIFrameElement>;
  /** Callback when iframe dimensions change */
  onDimensionsUpdate?: (width: number, height: number) => void;
  /** Callback when puzzle is fully loaded */
  onLoad?: () => void;
  /** Callback when loading fails */
  onError?: (error: Error) => void;
  /** Additional CSS classes */
  className?: string;
  /** Minimum iframe height in pixels */
  minHeight?: number;
  /** Maximum iframe height in pixels */
  maxHeight?: number;
  /** Enable responsive scaling */
  scaleToFit?: boolean;
  /** Percentage of container to fill (default 90) */
  targetWidthPercent?: number;
  /** Show loading indicator */
  showLoading?: boolean;
}

/**
 * Loading state for puzzle
 */
type LoadingState = 'idle' | 'loading' | 'loaded' | 'error';

/**
 * PuzzleArea component - displays crossword puzzle in iframe with theme integration
 * 
 * Features:
 * - Dynamic height adjustment based on puzzle content
 * - Automatic theme synchronization with parent page
 * - Responsive scaling support
 * - TypeScript-safe error handling
 * - Loading states
 */
export function PuzzleArea({
  puzzleUrl,
  puzzleContent,
  height,
  iframeRef: externalIframeRef,
  onDimensionsUpdate,
  onLoad,
  onError,
  className,
  minHeight = 400,
  maxHeight = 2000,
  scaleToFit = false,
  targetWidthPercent = 90,
  showLoading = true,
}: PuzzleAreaProps) {
  // Refs
  const internalIframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  
  // State
  const [iframeHeight, setIframeHeight] = useState<number>(height || minHeight);
  const [scaleFactor, setScaleFactor] = useState<number>(1);
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [error, setError] = useState<Error | null>(null);
  
  // Use external ref if provided, otherwise use internal ref
  const iframeRef = externalIframeRef || internalIframeRef;

  /**
   * Sync external ref with internal ref
   */
  useEffect(() => {
    if (externalIframeRef && internalIframeRef.current) {
      (externalIframeRef as React.MutableRefObject<HTMLIFrameElement | null>).current = internalIframeRef.current;
    }
  }, [externalIframeRef]);

  /**
   * Get theme from parent page or system preference
   */
  const getParentTheme = useCallback((): 'light' | 'dark' => {
    const explicitTheme = document.documentElement.getAttribute('data-theme');
    if (explicitTheme === 'light' || explicitTheme === 'dark') {
      return explicitTheme;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }, []);

  /**
   * Apply theme to iframe document
   */
  const applyThemeToIframe = useCallback((doc: Document, theme: 'light' | 'dark') => {
    try {
      doc.documentElement.setAttribute('data-theme', theme);
      doc.documentElement.style.colorScheme = theme;
      
      const themeVariables: ThemeVariables = theme === 'dark' 
        ? getDarkThemeVariables() 
        : getLightThemeVariables();
      
      const root = doc.documentElement;
      Object.entries(themeVariables).forEach(([key, value]) => {
        if (value !== undefined) {
          root.style.setProperty(key, value);
        }
      });
      
      console.log(`[PuzzleArea] Applied ${theme} theme to iframe`);
    } catch (err) {
      console.error('[PuzzleArea] Failed to apply theme:', err);
    }
  }, []);

  /**
   * Handle postMessage events from iframe
   */
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Only accept messages from the iframe origin
      if (iframeRef.current && event.source === iframeRef.current.contentWindow) {
        if (event.data.type === 'dimensions') {
          const { width, height } = event.data;
          const clampedHeight = Math.min(Math.max(height, minHeight), maxHeight);
          setIframeHeight(clampedHeight);
          onDimensionsUpdate?.(width, clampedHeight);
        }
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [minHeight, maxHeight, onDimensionsUpdate, iframeRef]);

  // Measure actual iframe content height after load
  useEffect(() => {
    const measureContentHeight = () => {
      const iframe = iframeRef.current;
      if (!iframe) return;

      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (iframeDoc) {
          // Get the actual content height including all elements
          const body = iframeDoc.body;
          const html = iframeDoc.documentElement;
          
          // Find the crossword container for accurate measurement
          const crosswordArea = iframeDoc.querySelector('.ecw-crosswordarea') as HTMLElement;
          
          let contentHeight = 0;
          if (crosswordArea) {
            // Measure the crossword area with all margins and padding
            const rect = crosswordArea.getBoundingClientRect();
            const computedStyle = window.getComputedStyle(crosswordArea);
            const marginTop = parseInt(computedStyle.marginTop) || 0;
            const marginBottom = parseInt(computedStyle.marginBottom) || 0;
            contentHeight = rect.height + marginTop + marginBottom + rect.top;
          } else {
            // Fallback to body measurements
            contentHeight = Math.max(
              body?.scrollHeight || 0,
              html?.scrollHeight || 0,
              body?.offsetHeight || 0
            );
          }

          if (contentHeight > 0) {
            // Add generous buffer to prevent any edge clipping
            const adjustedHeight = Math.min(
              Math.max(contentHeight + 60, minHeight),
              maxHeight
            );
            setIframeHeight(adjustedHeight);
          }
        }
      } catch (e) {
        console.warn('[PuzzleArea] Could not measure iframe content height:', e);
      }
    };

    // Measure after content is fully rendered
    const timer = setTimeout(measureContentHeight, 800);
    // Also remeasure after a longer delay in case of late-loaded content
    const timer2 = setTimeout(measureContentHeight, 1500);
    return () => {
      clearTimeout(timer);
      clearTimeout(timer2);
    };
  }, [iframeRef, minHeight, maxHeight]);

  // Update height when external height prop changes
  useEffect(() => {
    if (height) {
      setIframeHeight(height);
    }
  }, [height]);

  // Listen for theme changes on parent and sync to iframe
  useEffect(() => {
    const syncThemeToIframe = () => {
      const iframe = iframeRef.current;
      const doc = iframe?.contentDocument;
      if (!doc) return;

      const parentTheme = document.documentElement.getAttribute('data-theme') ||
                         (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      
      doc.documentElement.setAttribute('data-theme', parentTheme);
      doc.documentElement.style.colorScheme = parentTheme;
      
      // Update CSS variables
      const themeVariables = parentTheme === 'dark' ? getDarkThemeVariables() : getLightThemeVariables();
      const root = doc.documentElement;
      Object.entries(themeVariables).forEach(([key, value]) => {
        if (value !== undefined) {
          root.style.setProperty(key, value);
        }
      });
    };

    // Watch for theme changes via mutation observer
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
          syncThemeToIframe();
          break;
        }
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    // Also listen for system color scheme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMediaChange = () => {
      if (!document.documentElement.hasAttribute('data-theme')) {
        syncThemeToIframe();
      }
    };
    mediaQuery.addEventListener('change', handleMediaChange);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', handleMediaChange);
    };
  }, [iframeRef]);

  // Calculate scale factor for responsive sizing
  useEffect(() => {
    if (!scaleToFit || !containerRef.current) return;

    const calculateScale = () => {
      const container = containerRef.current;
      if (!container) return;

      const containerWidth = container.offsetWidth;
      const targetWidth = (containerWidth * targetWidthPercent) / 100;
      
      // Base iframe width is ~300px (typical puzzle width)
      const baseWidth = 300;
      const scale = Math.min(targetWidth / baseWidth, 3); // Cap at 3x
      
      setScaleFactor(scale);
    };

    calculateScale();
    
    // Recalculate on window resize
    window.addEventListener('resize', calculateScale);
    return () => window.removeEventListener('resize', calculateScale);
  }, [scaleToFit, targetWidthPercent]);

  // If puzzle content is provided, use srcdoc instead of src
  const iframeProps = puzzleContent
    ? { srcDoc: puzzleContent }
    : { src: puzzleUrl };

  const handleIframeLoad = async () => {
    console.log('[PuzzleArea] Iframe loaded');
    try {
      const iframe = iframeRef.current;
      const doc = iframe?.contentDocument || iframe?.contentWindow?.document;
      
      if (doc) {
        // Inject bridge script for message handling
        await injectBridgeScriptSmart(doc);
        
        // Get theme from parent page
        const parentTheme = document.documentElement.getAttribute('data-theme') || 
                           (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        
        // Synchronize theme with parent page
        doc.documentElement.setAttribute('data-theme', parentTheme);
        doc.documentElement.style.colorScheme = parentTheme;
        
        // Inject theme CSS
        const cssText = await fetchThemeCSS();
        const themeVariables = parentTheme === 'dark' ? getDarkThemeVariables() : getLightThemeVariables();
        injectCSS(doc, cssText, themeVariables);
        
        // Inject highlight styles for clue hover interactions
        injectHighlightStyles(doc);
        
        // Hide unwanted iframe elements
        const hideElementsCSS = `
          /* Hide internal answer box - we'll use external component */
          #answerbox { display: none !important; }
          #welcomemessage { display: none !important; }
          
          /* Hide internal check button - we'll use external button */
          #checkbutton { display: none !important; }
          
          /* Hide copyright notice */
          .ecw-copyright { display: none !important; }
          
          /* Hide congratulations - we'll handle externally */
          #congratulations { display: none !important; }
          
          /* Ensure cells remain interactive */
          .ecw-box { cursor: pointer !important; }
        `;
        injectCSS(doc, hideElementsCSS);
        
        // Enable hot reload in development
        const cleanup = setupHotReload(doc, () => {
          // Re-apply variables after CSS updates
          injectCSS(doc, cssText, getDefaultThemeVariables());
          // Re-inject highlight styles
          injectHighlightStyles(doc);
          // Re-inject hiding CSS
          injectCSS(doc, hideElementsCSS);
        });
        
        // Clean up hot reload when iframe is unloaded
        iframe?.addEventListener('load', () => cleanup(), { once: true });
        
        console.log('[PuzzleArea] Bridge script, CSS, and element hiding injected');
      }
    } catch (e) {
      console.error('[PuzzleArea] Failed to inject resources:', e);
    }

    // Dispatch custom event when iframe is ready
    const event = new CustomEvent('iframe-ready', { detail: { iframeRef } });
    window.dispatchEvent(event);
  };

  return (
    <div
      ref={containerRef}
      className={cn('relative w-full overflow-visible rounded-lg flex items-center justify-center', className)}
      style={{ height: `${iframeHeight * scaleFactor}px` }}
    >
      <div
        style={{
          transform: `scale(${scaleFactor})`,
          transformOrigin: 'center center',
          width: '100%',
          height: `${iframeHeight}px`,
        }}
      >
        <iframe
          ref={internalIframeRef}
          {...iframeProps}
          className="w-full h-full border-0"
          title="Crossword Puzzle"
          style={{
            overflow: 'visible',
            display: 'block',
          }}
          sandbox="allow-scripts allow-same-origin"
          onLoad={handleIframeLoad}
        />
      </div>
    </div>
  );
}
