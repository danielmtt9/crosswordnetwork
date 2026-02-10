import { DeviceType } from '@/hooks/useDeviceType';
import { GameMode } from '@/hooks/useGameMode';

export type LayoutType = 
  | 'desktop-single'
  | 'mobile-single';

/**
 * Determines the appropriate layout based on device type and game mode.
 * 
 * @param deviceType - Current device type (mobile, tablet, desktop)
 * @param gameMode - Current game mode (single)
 * @returns The layout type to use
 */
export function getLayoutType(deviceType: DeviceType, _gameMode: GameMode): LayoutType {
  // Tablet uses same layouts as mobile for simplicity
  if (deviceType === 'desktop') {
    return 'desktop-single';
  }
  return 'mobile-single';
}

/**
 * Checks if the current layout should use tabs for clues.
 * Mobile layouts use tabs, desktop layouts use side panels.
 * 
 * @param layoutType - Current layout type
 * @returns True if tabs should be used for clues
 */
export function shouldUseTabbedClues(layoutType: LayoutType): boolean {
  return layoutType === 'mobile-single';
}

/**
 * Gets the recommended grid column template for the layout.
 * 
 * @param layoutType - Current layout type
 * @returns CSS grid template columns string
 */
export function getGridTemplate(layoutType: LayoutType): string {
  switch (layoutType) {
    case 'desktop-single':
      // Clues (30%) | Puzzle (70%)
      return '3fr 7fr';
    
    case 'mobile-single':
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
    case 'desktop-single':
      return '1000px';
    
    case 'mobile-single':
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
  return ['puzzle', 'clues'];
}
