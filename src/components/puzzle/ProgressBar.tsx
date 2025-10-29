'use client';

import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

export interface ProgressBarProps {
  completed: number;
  total: number;
  className?: string;
  showPercentage?: boolean;
}

/**
 * ProgressBar component shows puzzle completion progress.
 */
export function ProgressBar({
  completed,
  total,
  className,
  showPercentage = true,
}: ProgressBarProps) {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className={cn('space-y-2', className)}>
      {showPercentage && (
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Progress</span>
          <span>{percentage}%</span>
        </div>
      )}
      <Progress value={percentage} className="h-2" />
    </div>
  );
}
