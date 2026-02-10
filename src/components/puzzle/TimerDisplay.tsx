'use client';

import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TimerDisplayProps {
  startTime: number | null;
  completionTimeSeconds?: number | null;
  isCompleted?: boolean;
  className?: string;
}

/**
 * Displays elapsed time during puzzle solving, or completion time when done.
 * Updates every second while the puzzle is in progress.
 */
export function TimerDisplay({
  startTime,
  completionTimeSeconds = null,
  isCompleted = false,
  className,
}: TimerDisplayProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (isCompleted && completionTimeSeconds != null) {
      setElapsed(completionTimeSeconds);
      return;
    }
    if (!startTime) {
      setElapsed(0);
      return;
    }

    const update = () => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startTime, isCompleted, completionTimeSeconds]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      data-testid="timer-display"
      className={cn(
        'flex items-center gap-2 text-sm text-muted-foreground',
        className
      )}
      aria-live="polite"
      aria-label={`Elapsed time: ${formatTime(elapsed)}`}
    >
      <Clock className="h-4 w-4" />
      <span className="font-mono tabular-nums">{formatTime(elapsed)}</span>
    </div>
  );
}
