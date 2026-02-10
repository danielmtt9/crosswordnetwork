'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const SHORTCUTS = [
  { keys: ['Enter'], description: 'Submit answer' },
  { keys: ['Escape'], description: 'Cancel / close' },
  { keys: ['Backspace'], description: 'Delete last letter' },
  { keys: ['?'], description: 'Show keyboard shortcuts' },
];

export interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

/**
 * Modal that displays puzzle keyboard shortcuts.
 * Opened by pressing ? while on the puzzle page.
 */
export function KeyboardShortcutsModal({
  isOpen,
  onClose,
  className,
}: KeyboardShortcutsModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn('sm:max-w-md', className)}>
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
          <DialogDescription>
            Use these shortcuts while solving the puzzle
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          {SHORTCUTS.map(({ keys, description }) => (
            <div
              key={keys.join('-')}
              className="flex items-center justify-between gap-4"
            >
              <span className="text-sm text-muted-foreground">{description}</span>
              <div className="flex gap-1">
                {keys.map((key) => (
                  <kbd
                    key={key}
                    className="inline-flex h-7 min-w-[28px] items-center justify-center rounded border bg-muted px-2 font-mono text-xs font-medium"
                  >
                    {key}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
