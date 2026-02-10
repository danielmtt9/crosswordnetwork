'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  fetchThemeCSS, 
  injectThemeCSS,
  injectOverrideCSS,
  getLightThemeVariables,
  getDarkThemeVariables, 
  setupHotReload,
  injectHighlightStyles,
  type ThemeVariables,
} from '@/lib/puzzleBridge';
import { injectBridgeScriptSmart } from '@/lib/puzzleBridge/injectBridgeScript';
import { debounce, throttle } from '@/lib/puzzleBridge/cellClueMapping';
import { canUsePreferences, getCookie, setCookie } from '@/lib/cookies/siteCookies';

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
 * - Loading states and proper lifecycle management
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
  maxHeight = 5000, // Increased to allow full content display
  scaleToFit = false,
  targetWidthPercent = 90,
  showLoading = true,
}: PuzzleAreaProps) {
  // Refs
  const internalIframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const measureTimersRef = useRef<NodeJS.Timeout[]>([]);
  
  // State
  const [iframeHeight, setIframeHeight] = useState<number>(height || minHeight);
  const [scaleFactor, setScaleFactor] = useState<number>(1);
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [isECW, setIsECW] = useState<boolean>(false);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const ecwSizingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [ecwMode, setEcwMode] = useState<'classic' | 'premium'>(() => {
    if (typeof window === 'undefined') return 'classic';
    try {
      const url = new URL(window.location.href);
      const q = (url.searchParams.get('ecw') || '').toLowerCase();
      if (q === 'classic' || q === 'premium') {
        try {
          window.localStorage.setItem('cw:ecw:mode', q);
        } catch {
          // ignore
        }
        if (canUsePreferences()) {
          setCookie('cw_ecw_mode', q, { maxAgeSeconds: 60 * 60 * 24 * 365, sameSite: 'Lax' });
        }
        return q;
      }
      const stored = (window.localStorage.getItem('cw:ecw:mode') || '').toLowerCase();
      if (stored === 'classic' || stored === 'premium') return stored as 'classic' | 'premium';
      const cookieMode = (getCookie('cw_ecw_mode') || '').toLowerCase();
      if (cookieMode === 'classic' || cookieMode === 'premium') return cookieMode as 'classic' | 'premium';
    } catch {
      // ignore
    }
    const env = (process.env.NEXT_PUBLIC_ECW_MODE || 'classic').toLowerCase();
    return env === 'premium' ? 'premium' : 'classic';
  });
  const ecwModeRef = useRef<'classic' | 'premium'>('classic');
  useEffect(() => {
    ecwModeRef.current = ecwMode;
  }, [ecwMode]);

  const hasReloadedForFallbackRef = useRef(false);
  
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
    if (document.documentElement.classList.contains('dark')) {
      return 'dark';
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

      // Pull real site tokens from the parent so the iframe matches the website exactly.
      const rootCS = window.getComputedStyle(document.documentElement);
      const site = {
        background: rootCS.getPropertyValue('--background').trim(),
        foreground: rootCS.getPropertyValue('--foreground').trim(),
        card: rootCS.getPropertyValue('--card').trim(),
        border: rootCS.getPropertyValue('--border').trim(),
        primary: rootCS.getPropertyValue('--primary').trim(),
        accent: rootCS.getPropertyValue('--accent').trim(),
        muted: rootCS.getPropertyValue('--muted').trim(),
        mutedFg: rootCS.getPropertyValue('--muted-foreground').trim(),
        ring: rootCS.getPropertyValue('--ring').trim(),
      };

      const fallbackVariables: ThemeVariables =
        theme === 'dark' ? getDarkThemeVariables() : getLightThemeVariables();

      const themeVariables: ThemeVariables = {
        ...fallbackVariables,
        // "Site tokens" used by the iframe theme CSS (Phase 2 mapping).
        '--cw-surface': site.background || (theme === 'dark' ? '#0B0F0D' : '#F6F7F5'),
        '--cw-text': site.foreground || (theme === 'dark' ? '#E6ECE8' : '#0E1512'),
        '--cw-card': site.card || '#FFFFFF',
        '--cw-border': site.border || (theme === 'dark' ? '#1A211D' : '#E5E8E2'),
        '--cw-accent': site.primary || '#d97706',
        '--cw-muted': site.muted || (theme === 'dark' ? '#111A14' : '#EEF1ED'),
        '--cw-muted-foreground': site.mutedFg || (theme === 'dark' ? '#9DB0A8' : '#5F6E66'),
        '--cw-focus-ring': site.ring || '#d97706',

        // Highlights tuned to the Cozy Amber palette.
        ...(ecwModeRef.current === 'premium'
          ? {
              '--cw-highlight-across': theme === 'dark' ? 'rgba(217, 119, 6, 0.30)' : 'rgba(217, 119, 6, 0.18)',
              '--cw-highlight-down': theme === 'dark' ? 'rgba(234, 88, 12, 0.28)' : 'rgba(234, 88, 12, 0.16)',
            }
          : {
              '--cw-highlight-across': theme === 'dark' ? 'rgba(217, 119, 6, 0.25)' : 'rgba(217, 119, 6, 0.18)',
              '--cw-highlight-down': theme === 'dark' ? 'rgba(234, 88, 12, 0.25)' : 'rgba(234, 88, 12, 0.16)',
            }),
      };
      
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
   * Measure iframe content height
   */
  const measureContentHeight = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe || loadingState !== 'loaded') return;

    try {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) return;

      const body = iframeDoc.body;
      const html = iframeDoc.documentElement;
      
      // Find the crossword container for accurate measurement
      const crosswordArea = iframeDoc.querySelector('.ecw-crosswordarea') as HTMLElement;
      
      let contentHeight = 0;
      if (crosswordArea) {
        const rect = crosswordArea.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(crosswordArea);
        const marginTop = parseInt(computedStyle.marginTop) || 0;
        const marginBottom = parseInt(computedStyle.marginBottom) || 0;
        contentHeight = rect.height + marginTop + marginBottom + rect.top + 40; // Extra buffer
      } else {
        contentHeight = Math.max(
          body?.scrollHeight || 0,
          html?.scrollHeight || 0,
          body?.offsetHeight || 0
        );
      }

      if (contentHeight > 0) {
        // Use actual content height with buffer, but don't clamp to maxHeight
        // Allow content to determine its own height (with reasonable minimum)
        const adjustedHeight = Math.max(contentHeight + 60, minHeight);
        // Only apply maxHeight if it's reasonable (not too restrictive)
        const finalHeight = maxHeight > 3000 ? adjustedHeight : Math.min(adjustedHeight, maxHeight);
        setIframeHeight(finalHeight);
        console.log(`[PuzzleArea] Measured content height: ${contentHeight}px, adjusted: ${finalHeight}px (max: ${maxHeight}px)`);
      }
    } catch (err) {
      console.warn('[PuzzleArea] Could not measure iframe content height:', err);
    }
  }, [iframeRef, minHeight, maxHeight, loadingState]);

  const applyResponsiveECWSizing = useCallback(() => {
    if (ecwModeRef.current !== 'premium') return;
    const iframe = iframeRef.current;
    const container = containerRef.current;
    const doc = iframe?.contentDocument || iframe?.contentWindow?.document;
    if (!iframe || !container || !doc) return;

    try {
      const view = doc.defaultView;
      if (!view) return;

      const table = doc.getElementById('crossword') as HTMLTableElement | null;
      if (!table) return;
      // ECW flips the table to `display:block` after initialization; that can cause column stretching
      // (rectangular cells). Once visible, force a stable table layout.
      if (table && table.style.display !== 'none') {
        table.style.display = 'table';
        table.style.removeProperty('table-layout');
        table.style.removeProperty('width');
      }

      const rows = doc.querySelectorAll('#crossword tr').length || 0;
      const rowEls = Array.from(doc.querySelectorAll('#crossword tr'));
      const cols =
        rowEls.reduce((max, tr) => Math.max(max, tr.querySelectorAll('td').length), 0) || 0;
      if (!rows || !cols) return;

      const rect = container.getBoundingClientRect();
      const containerWidth = Math.floor(rect.width);

      // Measure real in-iframe padding/gap so the grid fits cleanly without stretching.
      const crosswordArea = doc.querySelector('.ecw-crosswordarea') as HTMLElement | null;
      const areaCS = crosswordArea ? view.getComputedStyle(crosswordArea) : null;
      const areaPadL = areaCS ? parseFloat(areaCS.paddingLeft) || 0 : 0;
      const areaPadR = areaCS ? parseFloat(areaCS.paddingRight) || 0 : 0;

      const tableCS = table ? view.getComputedStyle(table) : null;
      const tablePadL = tableCS ? parseFloat(tableCS.paddingLeft) || 0 : 0;
      const tablePadR = tableCS ? parseFloat(tableCS.paddingRight) || 0 : 0;
      const borderSpacing = tableCS?.borderSpacing || '1px';
      const gap = Math.max(0, Math.floor(parseFloat(borderSpacing.split(' ')[0] || '1') || 1));

      const insets = areaPadL + areaPadR + tablePadL + tablePadR + 16; // small safety gutter
      const rawCell = (containerWidth - insets - (cols - 1) * gap) / cols;
      const minCell = 16;
      const maxCell = 48;
      const cellSize = Math.floor(Math.max(minCell, Math.min(maxCell, rawCell)));
      const fontSize = Math.max(10, Math.min(22, Math.floor(cellSize * 0.55)));

      // Lock the table width to the computed grid width so the browser doesn't compress columns
      // (which would make cells rectangular even if we set height/width on the <td>).
      const gridWidth = cols * cellSize + (cols - 1) * (gap || 1);
      const tableWidth = Math.max(0, Math.floor(gridWidth + tablePadL + tablePadR));
      table.style.tableLayout = 'fixed';
      table.style.width = `${tableWidth}px`;

      const root = doc.documentElement;
      root.style.setProperty('--ecw-cell-size', `${cellSize}px`);
      root.style.setProperty('--ecw-cell-font-size', `${fontSize}px`);
      root.style.setProperty('--ecw-grid-gap', `${gap || 1}px`);

      // Keep cw sizing variables in sync for highlight/accessibility helpers.
      root.style.setProperty('--cw-cell-size', `${cellSize}px`);
      root.style.setProperty('--cw-cell-font-size', `${fontSize}px`);

      // Trigger a re-measure once layout has settled.
      setTimeout(() => {
        requestAnimationFrame(measureContentHeight);
      }, 80);
    } catch {
      // ignore
    }
  }, [iframeRef, measureContentHeight]);

  const detectDistortionAndFallback = useCallback(() => {
    if (ecwModeRef.current !== 'premium') return;
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument || iframe?.contentWindow?.document;
    if (!iframe || !doc) return;

    try {
      const table = doc.getElementById('crossword');
      const cell = doc.querySelector('.ecw-box') as HTMLElement | null;
      if (!table || !cell) return;

      const tableDisplay = doc.defaultView?.getComputedStyle(table).display || '';
      const cellDisplay = doc.defaultView?.getComputedStyle(cell).display || '';
      const r = cell.getBoundingClientRect();
      const ratio = r.width && r.height ? r.width / r.height : 1;

      const distorted =
        tableDisplay === 'block' ||
        (!cellDisplay.includes('table-cell') && cellDisplay !== '') ||
        ratio < 0.97 ||
        ratio > 1.03;

      if (!distorted) return;

      // Switch to classic for stability and reload once.
      window.localStorage.setItem('cw:ecw:mode', 'classic');
      if (canUsePreferences()) {
        setCookie('cw_ecw_mode', 'classic', { maxAgeSeconds: 60 * 60 * 24 * 365, sameSite: 'Lax' });
      }
      setEcwMode('classic');
      if (!hasReloadedForFallbackRef.current) {
        hasReloadedForFallbackRef.current = true;
        window.location.reload();
      }
    } catch {
      // ignore
    }
  }, [iframeRef]);

  /**
   * Handle postMessage events from iframe
   */
  const throttledHandleDimensions = useMemo(
    () => throttle((width: number, height: number) => {
      const clampedHeight = Math.min(Math.max(height, minHeight), maxHeight);
      setIframeHeight(clampedHeight);
      onDimensionsUpdate?.(width, clampedHeight);
    }, 100),
    [minHeight, maxHeight, onDimensionsUpdate]
  );

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) return;

      if (event.data.type === 'dimensions') {
        const { width, height: msgHeight } = event.data;
        throttledHandleDimensions(width, msgHeight);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [iframeRef, throttledHandleDimensions]);

  /**
   * Measure content height after loading
   * Optimized: Single debounced measurement with requestAnimationFrame instead of 3 timers
   */
  useEffect(() => {
    if (loadingState !== 'loaded') return;

    // Clear existing timers
    measureTimersRef.current.forEach(clearTimeout);
    measureTimersRef.current = [];

    // Use debounced measurement with requestAnimationFrame for better performance
    const debouncedMeasure = debounce(() => {
      requestAnimationFrame(measureContentHeight);
    }, 300);

    // Single measurement after a short delay
    const timer = setTimeout(() => {
      debouncedMeasure();
    }, 500);
    
    measureTimersRef.current = [timer];

    return () => {
      measureTimersRef.current.forEach(clearTimeout);
      measureTimersRef.current = [];
    };
  }, [loadingState, measureContentHeight]);

  /**
   * Update height when external height prop changes
   */
  useEffect(() => {
    if (height) {
      setIframeHeight(height);
    }
  }, [height]);

  /**
   * Listen for theme changes on parent and sync to iframe
   * Optimized: Debounced to prevent rapid DOM updates
   */
  const debouncedSyncTheme = useMemo(
    () => debounce(() => {
      const iframe = iframeRef.current;
      const doc = iframe?.contentDocument;
      if (!doc) return;
      const theme = getParentTheme();
      applyThemeToIframe(doc, theme);
    }, 100),
    [iframeRef, getParentTheme, applyThemeToIframe]
  );

  useEffect(() => {
    // Watch for theme changes via mutation observer
    const observer = new MutationObserver(() => {
      debouncedSyncTheme();
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'class'],
    });

    // Also listen for system color scheme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMediaChange = () => {
      if (!document.documentElement.hasAttribute('data-theme')) {
        debouncedSyncTheme();
      }
    };
    
    mediaQuery.addEventListener('change', handleMediaChange);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', handleMediaChange);
    };
  }, [debouncedSyncTheme]);

  /**
   * Calculate scale factor for responsive sizing
   * Optimized: Throttled to prevent excessive DOM queries during resize
   */
  const calculateScale = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const containerWidth = container.offsetWidth;
    if (containerWidth === 0) return; // Container not ready yet
    
    // Use 90-95% of available width for puzzle (permanent fix for responsive sizing)
    const targetWidth = (containerWidth * Math.min(targetWidthPercent, 95)) / 100;
    const baseWidth = 800; // Base puzzle width
    const scale = Math.min(targetWidth / baseWidth, 2); // Max 2x scale to prevent too large
    setScaleFactor(scale);
  }, [targetWidthPercent]);

  const throttledCalculateScale = useMemo(
    () => throttle(calculateScale, 100),
    [calculateScale]
  );

  useEffect(() => {
    if (!scaleToFit || !containerRef.current) return;
    if (isECW) return; // ECW uses variable-driven sizing for crisp rendering.

    throttledCalculateScale();
    window.addEventListener('resize', throttledCalculateScale);
    return () => window.removeEventListener('resize', throttledCalculateScale);
  }, [scaleToFit, throttledCalculateScale]);

  /**
   * Handle iframe load event
   */
  const handleIframeLoad = useCallback(async () => {
    console.log('[PuzzleArea] Iframe load event triggered');
    setLoadingState('loading');

    try {
      const iframe = iframeRef.current;
      const doc = iframe?.contentDocument || iframe?.contentWindow?.document;
      
      if (!doc) {
        throw new Error('Could not access iframe document');
      }

      // Inject bridge script for message handling (for highlights only)
      await injectBridgeScriptSmart(doc);

      // Inject EclipseCrossword-specific bridge to enable hints/progress/external input.
      // Only inject when the document looks like an EclipseCrossword puzzle to avoid
      // a polling loop in non-ECW puzzles.
      const looksLikeECW =
        !!doc.getElementById('crossword') ||
        !!doc.querySelector('.ecw-crosswordarea') ||
        !!doc.getElementById('wordentry') ||
        !!doc.querySelector('script[src*="eclipsecrossword"]');

      // Treat as ECW whenever the document matches ECW markers, regardless of whether the bridge
      // script has already been injected (e.g., hot reload).
      setIsECW(looksLikeECW);

      if (looksLikeECW && !doc.getElementById('crossword-ecw-bridge')) {
        await new Promise<void>((resolve) => {
          const s = doc.createElement('script');
          s.id = 'crossword-ecw-bridge';
          s.src = '/scripts/eclipsecrossword-bridge.js';
          s.async = false;
          s.onload = () => resolve();
          s.onerror = () => {
            console.warn('[PuzzleArea] Failed to load EclipseCrossword bridge script');
            resolve();
          };
          // Timeout fallback so we don't block puzzle load.
          setTimeout(resolve, 1500);
          (doc.head || doc.body || doc.documentElement).appendChild(s);
        });
      }
      
      // Get and apply theme
      const theme = getParentTheme();
      applyThemeToIframe(doc, theme);
      
      if (ecwModeRef.current === 'premium') {
        // Inject theme CSS (non-blocking - don't wait for it)
        const themeVariables = theme === 'dark' ? getDarkThemeVariables() : getLightThemeVariables();

        fetchThemeCSS()
          .then(cssText => {
            injectThemeCSS(doc, cssText, themeVariables);
            // Theme CSS affects padding/gaps; re-apply sizing once styles are present.
            setTimeout(() => {
              requestAnimationFrame(() => {
                applyResponsiveECWSizing();
                detectDistortionAndFallback();
              });
            }, 50);
          })
          .catch(err => {
            console.warn('[PuzzleArea] Failed to load theme CSS, using defaults:', err.message);
            // Continue without custom CSS - puzzle will use its default styles
          });
      }
      
      // Inject highlight styles
      injectHighlightStyles(doc);
      
      // Hide unwanted elements. We visually hide the ECW answer box, but keep it in the DOM
      // so EclipseCrossword logic and our bridge can still read/write `#wordentry`.
      const hideElementsCSS = `
        /* Hide internal UI elements */
        #welcomemessage,
        #checkbutton,
        .ecw-copyright,
        #congratulations {
          display: none !important;
        }

        /* Hide the ECW answer UI, but keep it functional (do not use display:none). */
        #answerbox {
          position: absolute !important;
          left: -10000px !important;
          top: 0 !important;
          width: 1px !important;
          height: 1px !important;
          overflow: hidden !important;
          opacity: 0 !important;
          pointer-events: none !important;
        }

        /* Hide internal clue display so only the left panel shows clues */
        .ecw-cluebox,
        .ecw-wordlabel,
        .ecw-wordinfo {
          display: none !important;
        }
        
        /* Ensure proper overflow */
        html, body {
          overflow: visible !important;
        }
        
        /* Ensure cells are interactive and editable */
        .ecw-box {
          cursor: pointer !important;
        }
      `;
      injectOverrideCSS(doc, hideElementsCSS);

      if (looksLikeECW) {
        if (ecwModeRef.current === 'premium') {
          // Initial sizing, plus observe container resizes.
          applyResponsiveECWSizing();
          if (resizeObserverRef.current) resizeObserverRef.current.disconnect();
          resizeObserverRef.current = new ResizeObserver(() => applyResponsiveECWSizing());
          resizeObserverRef.current.observe(containerRef.current!);

          // ECW mutates the DOM after load; retry sizing until the grid is visible/stable.
          if (ecwSizingIntervalRef.current) clearInterval(ecwSizingIntervalRef.current);
          let tries = 0;
          ecwSizingIntervalRef.current = setInterval(() => {
            tries += 1;
            applyResponsiveECWSizing();
            detectDistortionAndFallback();
            const t = doc.getElementById('crossword') as HTMLTableElement | null;
            const visible = !!t && t.style.display !== 'none' && t.querySelectorAll('tr').length > 0;
            if (visible || tries >= 20) {
              if (ecwSizingIntervalRef.current) clearInterval(ecwSizingIntervalRef.current);
              ecwSizingIntervalRef.current = null;
            }
          }, 100);
        }
      }
      
      // Setup hot reload in development
      if (process.env.NODE_ENV === 'development') {
        const cleanup = setupHotReload(doc, () => {
          console.log('[PuzzleArea] Hot reload triggered');
          injectHighlightStyles(doc);
          injectOverrideCSS(doc, hideElementsCSS);
          // In premium mode, ensure sizing is re-applied after CSS refresh.
          setTimeout(() => {
            requestAnimationFrame(() => {
              applyResponsiveECWSizing();
              detectDistortionAndFallback();
            });
          }, 50);
        });
        
        cleanupRef.current = cleanup;
        iframe?.addEventListener('beforeunload', cleanup, { once: true });
      }
      
      setLoadingState('loaded');
      console.log('[PuzzleArea] Puzzle loaded successfully');
      
      onLoad?.();
      
      // Dispatch custom event
      const event = new CustomEvent('iframe-ready', { detail: { iframeRef } });
      window.dispatchEvent(event);
      
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('[PuzzleArea] Failed to load puzzle:', error);
      setLoadingState('error');
      onError?.(error);
    }
  }, [
    iframeRef,
    getParentTheme,
    applyThemeToIframe,
    applyResponsiveECWSizing,
    detectDistortionAndFallback,
    onLoad,
    onError,
  ]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
      if (ecwSizingIntervalRef.current) {
        clearInterval(ecwSizingIntervalRef.current);
        ecwSizingIntervalRef.current = null;
      }
      measureTimersRef.current.forEach(clearTimeout);
    };
  }, []);

  // Determine iframe props - memoized to prevent unnecessary iframe reloads
  const iframeProps = useMemo(
    () => {
      // Prefer loading via `src` (real URL) to keep a normal origin and reliable postMessage.
      // If a DB path is stored as `public/...`, it is served at `/<rest>` by Next.js.
      if (puzzleUrl) {
        const raw = puzzleUrl.replace(/^\s+|\s+$/g, '');
        const normalized =
          raw.startsWith('public/') ? `/${raw.slice('public/'.length)}` :
          raw.startsWith('/') ? raw :
          `/${raw}`;
        return { src: normalized };
      }

      return puzzleContent ? { srcDoc: puzzleContent } : {};
    },
    [puzzleContent, puzzleUrl]
  );

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative w-full rounded-2xl flex items-center justify-center ring-1 ring-amber-200/50 dark:ring-amber-800/50 shadow-xl overflow-hidden',
        className
      )}
      style={{
        minHeight: `${minHeight}px`,
        height: `${iframeHeight * (scaleToFit && !isECW ? scaleFactor : 1)}px`,
      }}
    >
      {showLoading && loadingState === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-sm text-muted-foreground">Loading puzzle...</p>
          </div>
        </div>
      )}
      
      {loadingState === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-destructive">
            <p className="font-semibold">Failed to load puzzle</p>
            <p className="text-sm text-muted-foreground">Please try refreshing the page</p>
          </div>
        </div>
      )}

      <div
        data-testid="puzzle-iframe-wrapper"
        style={{
          transform: scaleToFit && !isECW ? `scale(${scaleFactor})` : undefined,
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
          onError={() => {
            const error = new Error('Failed to load iframe');
            setLoadingState('error');
            onError?.(error);
          }}
        />
      </div>
    </div>
  );
}
