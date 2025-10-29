'use client';

import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SaveStatus = 'saving' | 'saved' | 'error' | 'idle';

export interface SaveIndicatorProps {
  status: SaveStatus;
  lastSavedAt?: Date;
  className?: string;
}

/**
 * SaveIndicator component displays the current auto-save status.
 * Features:
 * - Visual indicators for saving, saved, and error states
 * - Last saved timestamp
 * - Animated loading state
 */
export function SaveIndicator({
  status,
  lastSavedAt,
  className,
}: SaveIndicatorProps) {
  if (status === 'idle') {
    return null;
  }

  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 10) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <div
      className={cn(
        'flex items-center gap-2 text-sm transition-opacity',
        className
      )}
    >
      {status === 'saving' && (
        <>
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          <span className="text-muted-foreground">Saving...</span>
        </>
      )}

      {status === 'saved' && (
        <>
          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-500" />
          <span className="text-muted-foreground">
            {lastSavedAt ? `Saved ${getTimeAgo(lastSavedAt)}` : 'Saved'}
          </span>
        </>
      )}

      {status === 'error' && (
        <>
          <AlertCircle className="h-4 w-4 text-destructive" />
          <span className="text-destructive">Failed to save</span>
        </>
      )}
    </div>
  );
}
