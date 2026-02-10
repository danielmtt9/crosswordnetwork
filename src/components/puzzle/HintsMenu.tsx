'use client';

import { Lightbulb, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useDeviceType } from '@/hooks/useDeviceType';
import { cn } from '@/lib/utils';

export interface HintsMenuProps {
  onRevealLetter?: () => void;
  onRevealWord?: () => void;
  onCheckPuzzle?: () => void;
  disabled?: boolean;
  className?: string;
}

/**
 * HintsMenu component provides hint options for the crossword puzzle.
 * Features:
 * - Desktop: Dropdown menu
 * - Mobile: Floating Action Button (FAB)
 * - Hint actions: Reveal letter, Reveal word, Check puzzle
 */
export function HintsMenu({
  onRevealLetter,
  onRevealWord,
  onCheckPuzzle,
  disabled = false,
  className,
}: HintsMenuProps) {
  const deviceType = useDeviceType();
  const isMobile = deviceType === 'mobile' || deviceType === 'tablet';

  const menuItems = (
    <>
      <DropdownMenuLabel>Hints</DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onClick={onRevealLetter}
        disabled={disabled}
        className="cursor-pointer"
      >
        <Eye className="mr-2 h-4 w-4" />
        <span>Reveal Letter</span>
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={onRevealWord}
        disabled={disabled}
        className="cursor-pointer"
      >
        <EyeOff className="mr-2 h-4 w-4" />
        <span>Reveal Word</span>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onClick={onCheckPuzzle}
        disabled={disabled}
        className="cursor-pointer"
      >
        <Lightbulb className="mr-2 h-4 w-4" />
        <span>Check Puzzle</span>
      </DropdownMenuItem>
    </>
  );

  if (isMobile) {
    // Mobile: Floating Action Button
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon"
            className={cn(
              'fixed bottom-20 right-4 z-50 h-14 w-14 rounded-full shadow-lg',
              className
            )}
            disabled={disabled}
            aria-label="Hints menu"
            data-testid="hints-menu"
          >
            <Lightbulb className="h-6 w-6" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {menuItems}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Desktop: Regular dropdown button
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn('gap-2', className)}
          disabled={disabled}
          data-testid="hints-menu"
        >
          <Lightbulb className="h-4 w-4" />
          <span>Hints</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {menuItems}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
