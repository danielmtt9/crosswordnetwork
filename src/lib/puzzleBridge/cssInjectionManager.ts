import { ThemeVariables } from './types';

/**
 * CSS Injection Manager
 * 
 * Manages dynamic CSS injection into puzzle iframe with:
 * - Single style tag management (no duplicates)
 * - CSS variable updates
 * - Theme switching support
 * - Hot reload in development
 */

// Legacy style tag (kept for backwards compatibility with older call sites).
const STYLE_TAG_ID = 'crossword-dynamic-styles';

// Layered style tags (preferred): theme + overrides. Highlight styles use their own id.
const THEME_STYLE_TAG_ID = 'crossword-theme-styles';
const OVERRIDES_STYLE_TAG_ID = 'crossword-overrides-styles';
const CSS_THEME_API = '/api/assets/eclipsecrossword-theme';

// Avoid spamming the console when the dev server is restarting or temporarily unreachable.
let lastThemeFetchLogAt = 0;
let consecutiveThemeFetchFailures = 0;

/**
 * Fetch theme CSS from API
 */
export async function fetchThemeCSS(options?: { log?: boolean }): Promise<string> {
  const log = options?.log ?? true;
  try {
    const response = await fetch(CSS_THEME_API, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Failed to fetch theme CSS: ${response.statusText}`);
    }
    consecutiveThemeFetchFailures = 0;
    return await response.text();
  } catch (error) {
    consecutiveThemeFetchFailures++;
    if (log) {
      const now = Date.now();
      // Log at most once every 10 seconds to keep console usable.
      if (now - lastThemeFetchLogAt > 10_000) {
        lastThemeFetchLogAt = now;
        console.warn('[cssInjectionManager] Failed to fetch theme CSS (will continue without it):', error);
      }
    }
    return '';
  }
}

/**
 * Create or get existing style tag in document
 */
function getOrCreateStyleTag(doc: Document, id: string): HTMLStyleElement {
  let styleTag = doc.getElementById(id) as HTMLStyleElement;
  
  if (!styleTag) {
    styleTag = doc.createElement('style');
    styleTag.id = id;
    styleTag.setAttribute('data-crossword-style', 'true');
    doc.head.appendChild(styleTag);
  }
  
  return styleTag;
}

/**
 * Apply CSS variables to document root
 */
function applyCSSVariables(doc: Document, variables: ThemeVariables): void {
  const root = doc.documentElement;
  
  Object.entries(variables).forEach(([key, value]) => {
    if (value !== undefined) {
      root.style.setProperty(key, value);
    }
  });
}

/**
 * Remove CSS variables from document root
 */
function removeCSSVariables(doc: Document, variables: ThemeVariables): void {
  const root = doc.documentElement;
  
  Object.keys(variables).forEach((key) => {
    root.style.removeProperty(key);
  });
}

/**
 * Inject CSS text into iframe document
 * 
 * @param doc - Target document (iframe contentDocument)
 * @param cssText - CSS text to inject
 * @param variables - Optional CSS variables to apply
 */
export function injectCSS(
  doc: Document,
  cssText: string,
  variables?: ThemeVariables
): void {
  const styleTag = getOrCreateStyleTag(doc, STYLE_TAG_ID);
  styleTag.textContent = cssText;
  
  if (variables) {
    applyCSSVariables(doc, variables);
  }
  
  console.log('[cssInjectionManager] CSS injected successfully');
}

/**
 * Inject theme CSS into a dedicated theme style tag (does not clobber overrides).
 */
export function injectThemeCSS(
  doc: Document,
  cssText: string,
  variables?: ThemeVariables
): void {
  const styleTag = getOrCreateStyleTag(doc, THEME_STYLE_TAG_ID);
  styleTag.textContent = cssText;
  if (variables) applyCSSVariables(doc, variables);
  console.log('[cssInjectionManager] Theme CSS injected successfully');
}

/**
 * Inject override CSS into a dedicated overrides style tag (does not clobber theme).
 */
export function injectOverrideCSS(doc: Document, cssText: string): void {
  const styleTag = getOrCreateStyleTag(doc, OVERRIDES_STYLE_TAG_ID);
  styleTag.textContent = cssText;
  console.log('[cssInjectionManager] Override CSS injected successfully');
}

export function removeThemeCSS(doc: Document): void {
  doc.getElementById(THEME_STYLE_TAG_ID)?.remove();
}

export function removeOverrideCSS(doc: Document): void {
  doc.getElementById(OVERRIDES_STYLE_TAG_ID)?.remove();
}

/**
 * Update CSS variables without changing the CSS text
 * 
 * @param doc - Target document
 * @param variables - CSS variables to update
 */
export function updateCSSVariables(
  doc: Document,
  variables: ThemeVariables
): void {
  applyCSSVariables(doc, variables);
  console.log('[cssInjectionManager] CSS variables updated:', Object.keys(variables));
}

/**
 * Apply theme (light/dark) with variables
 * 
 * @param doc - Target document
 * @param theme - Theme name
 * @param variables - Theme-specific variables
 */
export function applyTheme(
  doc: Document,
  theme: 'light' | 'dark',
  variables: ThemeVariables
): void {
  const root = doc.documentElement;
  
  // Set theme attribute
  root.setAttribute('data-theme', theme);
  
  // Apply color scheme
  root.style.colorScheme = theme;
  
  // Apply variables
  applyCSSVariables(doc, variables);
  
  console.log(`[cssInjectionManager] Theme applied: ${theme}`);
}

/**
 * Get default theme variables based on system preference
 */
export function getDefaultThemeVariables(): ThemeVariables {
  const isDark = typeof window !== 'undefined' && 
    window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  return isDark ? getDarkThemeVariables() : getLightThemeVariables();
}

/**
 * Light theme variables
 */
export function getLightThemeVariables(): ThemeVariables {
  return {
    '--cw-cell-bg': 'hsl(0 0% 100%)',
    '--cw-cell-text': 'hsl(222.2 84% 4.9%)',
    '--cw-highlight-across': 'hsl(48 96% 93%)',
    '--cw-highlight-down': 'hsl(32 95% 96%)',
    '--cw-correct': 'hsl(32 95% 44%)',
    '--cw-incorrect': 'hsl(0 84.2% 60.2%)',
    '--cw-grid-gap': '1px',
    '--cw-cell-size': '32px',
  };
}

/**
 * Dark theme variables
 */
export function getDarkThemeVariables(): ThemeVariables {
  return {
    '--cw-cell-bg': 'hsl(222.2 84% 4.9%)',
    '--cw-cell-text': 'hsl(210 40% 98%)',
    '--cw-highlight-across': 'hsl(32 70% 18%)',
    '--cw-highlight-down': 'hsl(32 60% 22%)',
    '--cw-correct': 'hsl(32 95% 50%)',
    '--cw-incorrect': 'hsl(0 62.8% 30.6%)',
    '--cw-grid-gap': '1px',
    '--cw-cell-size': '32px',
  };
}

/**
 * Calculate responsive cell size based on container dimensions
 * 
 * @param containerWidth - Container width in pixels
 * @param containerHeight - Container height in pixels
 * @param gridRows - Number of grid rows
 * @param gridCols - Number of grid columns
 * @param pixelRatio - Device pixel ratio (default: window.devicePixelRatio)
 * @returns Optimal cell size in pixels
 */
export function calculateCellSize(
  containerWidth: number,
  containerHeight: number,
  gridRows: number,
  gridCols: number,
  pixelRatio: number = typeof window !== 'undefined' ? window.devicePixelRatio : 1
): number {
  // Account for padding and borders
  const padding = 32; // 1rem * 2
  const gridGap = 1;
  
  const availableWidth = containerWidth - padding;
  const availableHeight = containerHeight - padding;
  
  // Calculate max cell size based on width
  const maxCellWidth = (availableWidth - (gridCols - 1) * gridGap) / gridCols;
  
  // Calculate max cell size based on height
  const maxCellHeight = (availableHeight - (gridRows - 1) * gridGap) / gridRows;
  
  // Use the smaller of the two to fit the entire grid
  let cellSize = Math.floor(Math.min(maxCellWidth, maxCellHeight));
  
  // Ensure minimum cell size
  cellSize = Math.max(cellSize, 24);
  
  // Ensure maximum cell size
  cellSize = Math.min(cellSize, 48);
  
  // Adjust for high DPI screens
  if (pixelRatio > 1) {
    cellSize = Math.floor(cellSize / pixelRatio) * pixelRatio;
  }
  
  return cellSize;
}

/**
 * Generate responsive CSS variables for grid sizing
 * 
 * @param cellSize - Cell size in pixels
 * @returns CSS variables object
 */
export function generateResponsiveCSSVariables(cellSize: number): ThemeVariables {
  const fontSize = Math.max(12, Math.floor(cellSize * 0.5625)); // 56.25% of cell size
  
  return {
    '--cw-cell-size': `${cellSize}px`,
    '--cw-cell-font-size': `${fontSize}px`,
  };
}

/**
 * Remove all dynamic styles from document
 */
export function removeAllStyles(doc: Document): void {
  doc.getElementById(STYLE_TAG_ID)?.remove();
  doc.getElementById(THEME_STYLE_TAG_ID)?.remove();
  doc.getElementById(OVERRIDES_STYLE_TAG_ID)?.remove();
  
  // Remove all CSS variables
  const root = doc.documentElement;
  const styles = root.style;
  
  for (let i = styles.length - 1; i >= 0; i--) {
    const prop = styles[i];
    if (prop.startsWith('--cw-') || prop.startsWith('--ecw-')) {
      root.style.removeProperty(prop);
    }
  }
  
  console.log('[cssInjectionManager] All styles removed');
}

/**
 * Setup hot reload for theme CSS in development mode
 * Only works in development environment
 */
export function setupHotReload(
  doc: Document,
  onReload?: (cssText: string) => void
): () => void {
  if (process.env.NODE_ENV !== 'development') {
    return () => {}; // No-op in production
  }
  
  let eventSource: EventSource | null = null;
  
  try {
    // Create EventSource for hot reload (would need backend support)
    // For now, we'll poll the CSS file periodically
    let lastContent = '';
    
    let cancelled = false;
    let nextDelayMs = 2000;

    const checkForUpdates = async () => {
      if (cancelled) return;
      try {
        const cssText = await fetchThemeCSS({ log: false });
        if (cssText && cssText !== lastContent) {
          lastContent = cssText;
          // Update theme tag only so overrides remain intact.
          injectThemeCSS(doc, cssText);
          onReload?.(cssText);
          console.log('[cssInjectionManager] Hot reload: Theme CSS updated');
        }
        // Reset delay after any successful fetch (even if content unchanged).
        nextDelayMs = 2000;
      } catch (error) {
        // Should be rare because fetchThemeCSS returns '' on failure, but keep this as a safety net.
        // Back off to avoid tight error loops in development.
        nextDelayMs = Math.min(30_000, Math.floor(nextDelayMs * 1.8));
      }

      setTimeout(checkForUpdates, nextDelayMs);
    };
    
    // Start polling loop.
    setTimeout(checkForUpdates, nextDelayMs);
    
    return () => {
      cancelled = true;
      if (eventSource) {
        eventSource.close();
      }
    };
  } catch (error) {
    console.error('[cssInjectionManager] Failed to setup hot reload:', error);
    return () => {};
  }
}
