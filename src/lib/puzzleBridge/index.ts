/**
 * Puzzle Bridge Module
 * 
 * Type-safe communication layer between parent page and puzzle iframe.
 * 
 * @example
 * ```tsx
 * import { useIframeBridge, createPuzzleId } from '@/lib/puzzleBridge';
 * 
 * function PuzzleComponent() {
 *   const iframeRef = useRef<HTMLIFrameElement>(null);
 *   const bridge = useIframeBridge({
 *     iframeRef,
 *     debug: process.env.NODE_ENV === 'development',
 *     onReady: () => {
 *       bridge.send({
 *         type: 'SET_PUZZLE_ID',
 *         payload: { puzzleId: createPuzzleId(123) }
 *       });
 *     }
 *   });
 *   
 *   // ... rest of component
 * }
 * ```
 */

// Export types
export type {
  ChannelId,
  PuzzleId,
  BaseMessage,
  CellCoordinate,
  Clue,
  GridDimensions,
  ThemeVariables,
  IframeToParentMessage,
  ParentToIframeMessage,
  BridgeMessage,
  MessageHandler,
} from './types';

export {
  PROTOCOL_VERSION,
  VALID_ORIGINS,
  isIframeToParentMessage,
  isParentToIframeMessage,
  createChannelId,
  createPuzzleId,
  isValidOrigin,
  createBaseMessage,
} from './types';

// Export hook and related types
export type {
  UseIframeBridgeOptions,
  IframeBridge,
} from './useIframeBridge';

export {
  useIframeBridge,
  useIframeBridgeSender,
  useIframeBridgeListener,
} from './useIframeBridge';

// Export CSS injection manager
export {
  fetchThemeCSS,
  injectCSS,
  injectThemeCSS,
  injectOverrideCSS,
  removeThemeCSS,
  removeOverrideCSS,
  updateCSSVariables,
  applyTheme,
  getDefaultThemeVariables,
  getLightThemeVariables,
  getDarkThemeVariables,
  calculateCellSize,
  generateResponsiveCSSVariables,
  removeAllStyles,
  setupHotReload,
} from './cssInjectionManager';

// Export responsive puzzle hook
export type {
  UseResponsivePuzzleOptions,
  ResponsivePuzzleState,
} from './useResponsivePuzzle';

export { useResponsivePuzzle } from './useResponsivePuzzle';

// Export cell-clue mapping utilities
export type { ClueMap, CellMap } from './cellClueMapping';
export {
  cellKey,
  parseCellKey,
  buildClueMaps,
  buildCellMap,
  getClue,
  getCellsForClue,
  getCluesForCell,
  cellBelongsToClue,
  getIntersectingCells,
  normalizeClue,
  normalizeClues,
  sortClues,
  getNextClue,
  getPreviousClue,
  debounce,
  throttle,
} from './cellClueMapping';

// Export validation manager
export type {
  ValidationCell,
  ValidationResult,
  ValidationCache,
  ValidationManagerOptions,
} from './validationManager';

export {
  ValidationManager,
  useValidationManager,
} from './validationManager';

// Export highlight handler
export type {
  HighlightOptions,
} from './iframeHighlightHandler';

export {
  initializeHighlightHandler,
  injectHighlightStyles,
} from './iframeHighlightHandler';

// Export clue highlight hook
export type {
  UseClueHighlightOptions,
  UseClueHighlightResult,
} from './useClueHighlight';

export {
  useClueHighlight,
} from './useClueHighlight';

// Export bridge script injection
export {
  injectBridgeScript,
  injectInlineBridgeScript,
  injectBridgeScriptSmart,
  injectEclipseCrosswordBridge,
} from './injectBridgeScript';

// Export animation manager
export type {
  AnimationOptions,
  UseAnimationManagerOptions,
  AnimationManager,
} from './useAnimationManager';

export {
  useAnimationManager,
  usePrefersReducedMotion,
} from './useAnimationManager';
