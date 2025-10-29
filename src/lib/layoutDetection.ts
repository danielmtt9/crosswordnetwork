import { DeviceType } from '@/hooks/useDeviceType';
import { GameMode } from '@/hooks/useGameMode';

export type LayoutType = 
  | 'desktop-multiplayer'
  | 'desktop-single'
  | 'mobile-multiplayer'
  | 'mobile-single'
  | 'tablet-multiplayer'
  | 'tablet-single';

/**
 * Determines the appropriate layout based on device type and game mode.
 * 
 * @param deviceType - Current device type (mobile, tablet, desktop)
 * @param gameMode - Current game mode (single, multiplayer)
 * @returns The layout type to use
 */
export function getLayoutType(deviceType: DeviceType, gameMode: GameMode): LayoutType {
  // Tablet uses same layouts as mobile for simplicity
  const normalizedDevice = deviceType === 'tablet' ? 'mobile' : deviceType;
  
  return `${normalizedDevice}-${gameMode}` as LayoutType;
}

/**
 * Checks if the current layout should show a multiplayer panel.
 * 
 * @param layoutType - Current layout type
 * @returns True if multiplayer panel should be shown
 */
export function shouldShowMultiplayerPanel(layoutType: LayoutType): boolean {
  return layoutType.includes('multiplayer');
}

/**
 * Checks if the current layout should use tabs for clues.
 * Mobile layouts use tabs, desktop layouts use side panels.
 * 
 * @param layoutType - Current layout type
 * @returns True if tabs should be used for clues
 */
export function shouldUseTabbedClues(layoutType: LayoutType): boolean {
  return layoutType.startsWith('mobile') || layoutType.startsWith('tablet');
}

/**
 * Gets the recommended grid column template for the layout.
 * 
 * @param layoutType - Current layout type
 * @returns CSS grid template columns string
 */
export function getGridTemplate(layoutType: LayoutType): string {
  switch (layoutType) {
    case 'desktop-multiplayer':
      // Clues (25%) | Puzzle (50%) | Multiplayer Panel (25%)
      return '1fr 2fr 1fr';
    
    case 'desktop-single':
      // Clues (30%) | Puzzle (70%)
      return '3fr 7fr';
    
    case 'mobile-multiplayer':
    case 'mobile-single':
    case 'tablet-multiplayer':
    case 'tablet-single':
      // Mobile/tablet uses stacked layout (single column)
      return '1fr';
    
    default:
      return '1fr';
  }
}

/**
 * Determines if the layout should show clues in a sidebar or inline.
 * 
 * @param deviceType - Current device type
 * @returns True if clues should be in a sidebar
 */
export function shouldUseCluesSidebar(deviceType: DeviceType): boolean {
  return deviceType === 'desktop';
}

/**
 * Gets the maximum width for the puzzle container based on layout.
 * 
 * @param layoutType - Current layout type
 * @returns Max width in pixels or 'none'
 */
export function getPuzzleMaxWidth(layoutType: LayoutType): string {
  switch (layoutType) {
    case 'desktop-multiplayer':
      return '800px';
    
    case 'desktop-single':
      return '1000px';
    
    case 'mobile-multiplayer':
    case 'mobile-single':
    case 'tablet-multiplayer':
    case 'tablet-single':
      return '100%';
    
    default:
      return '100%';
  }
}

/**
 * Determines the priority order for displaying components on mobile.
 * 
 * @param gameMode - Current game mode
 * @returns Array of component names in priority order
 */
export function getMobileComponentPriority(gameMode: GameMode): string[] {
  if (gameMode === 'multiplayer') {
    return ['puzzle', 'clues', 'chat', 'players'];
  }
  return ['puzzle', 'clues'];
}
