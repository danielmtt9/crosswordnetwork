import { PuzzleRenderer, PuzzleRenderProps } from './types';
import { EclipseCrosswordRenderer } from './EclipseCrosswordRenderer';

// Registry of available puzzle renderers
const renderers: PuzzleRenderer[] = [
  EclipseCrosswordRenderer,
];

/**
 * Get the appropriate renderer for a puzzle's content
 */
export function getPuzzleRenderer(content: string): PuzzleRenderer | null {
  console.log('[PuzzleRenderer] getPuzzleRenderer called with content length:', content?.length);
  
  for (const renderer of renderers) {
    console.log(`[PuzzleRenderer] Testing renderer: ${renderer.name}`);
    if (renderer.canHandle(content)) {
      console.log(`[PuzzleRenderer] Found compatible renderer: ${renderer.name}`);
      return renderer;
    }
  }
  
  console.log('[PuzzleRenderer] No compatible renderer found');
  return null;
}

/**
 * Render a puzzle using the appropriate renderer
 */
export function renderPuzzle(props: PuzzleRenderProps): React.ReactNode {
  const renderer = getPuzzleRenderer(props.content);
  
  if (!renderer) {
    // Fallback to basic HTML rendering - return null and let component handle it
    return null;
  }
  
  return renderer.render(props);
}

/**
 * Check if content is supported by any renderer
 */
export function isContentSupported(content: string): boolean {
  return getPuzzleRenderer(content) !== null;
}

/**
 * Get all available renderer types
 */
export function getAvailableRenderers(): string[] {
  return renderers.map(r => r.name);
}

export { EclipseCrosswordRenderer } from './EclipseCrosswordRenderer';
export * from './types';
