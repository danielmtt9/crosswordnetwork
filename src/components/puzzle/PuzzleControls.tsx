'use client';

import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/puzzle/ProgressBar';
import { TimerDisplay } from '@/components/puzzle/TimerDisplay';
import { SaveIndicator, SaveStatus } from '@/components/SaveIndicator';
import { HintsMenu } from '@/components/puzzle/HintsMenu';

export interface PuzzleControlsProps {
  // Progress
  completionPercent: number;
  wordsCompleted: number;
  totalWords: number;
  
  // Timer (optional)
  startTime?: number | null;
  completionTimeSeconds?: number | null;
  isCompleted?: boolean;
  
  // Save status
  saveStatus: SaveStatus;
  lastSaved?: Date | null;
  saveError?: string | null;
  
  // Hints (optional - for single player)
  showHints?: boolean;
  onRevealLetter?: () => void;
  onRevealWord?: () => void;
  
  // Check puzzle
  onCheckPuzzle: () => void;
  
  // Device type
  device?: 'desktop' | 'mobile' | 'tablet';
  
  // Optional styling
  className?: string;
}

/**
 * Unified puzzle controls toolbar that displays:
 * - Progress bar (left)
 * - Save indicator, hints menu, and check button (right)
 */
export function PuzzleControls({
  completionPercent,
  wordsCompleted,
  totalWords,
  startTime,
  completionTimeSeconds,
  isCompleted = false,
  saveStatus,
  lastSaved,
  saveError,
  showHints = true,
  onRevealLetter,
  onRevealWord,
  onCheckPuzzle,
  device = 'desktop',
  className = '',
}: PuzzleControlsProps) {
  return (
    <div className={`flex items-center justify-between px-4 py-3 bg-card/50 rounded-lg border ${className}`}>
      {/* Left: Progress Bar + Timer */}
      <div className="flex flex-1 items-center gap-4 mr-4">
        <div className="flex-1 min-w-0">
          <ProgressBar
            completed={completionPercent}
            total={100}
          />
        </div>
        <TimerDisplay
          startTime={startTime ?? undefined}
          completionTimeSeconds={completionTimeSeconds ?? undefined}
          isCompleted={isCompleted}
        />
      </div>
      
      {/* Right: Controls */}
      <div className="flex items-center gap-2">
        <SaveIndicator 
          status={saveStatus} 
          lastSaved={lastSaved} 
          error={saveError} 
        />
        
        {showHints && onRevealLetter && onRevealWord && (
          <HintsMenu
            onRevealLetter={onRevealLetter}
            onRevealWord={onRevealWord}
            onCheckPuzzle={onCheckPuzzle}
            device={device}
          />
        )}
        
        <Button 
          onClick={onCheckPuzzle} 
          variant="outline" 
          size="sm"
          className="whitespace-nowrap"
        >
          Check Puzzle
        </Button>
      </div>
    </div>
  );
}
