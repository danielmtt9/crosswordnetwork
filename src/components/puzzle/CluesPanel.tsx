'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { ChevronDown, ChevronRight, ChevronLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { throttle, getNextClue, getPreviousClue } from '@/lib/puzzleBridge';

export interface Clue {
  number: number;
  text: string;
  answer?: string;
  cells?: Array<{ row: number; col: number }>;
}

export interface CluesPanelProps {
  acrossClues: Clue[];
  downClues: Clue[];
  selectedClue?: { direction: 'across' | 'down'; number: number };
  revealedClues?: Set<string>;
  onClueClick?: (clue: Clue & { direction: 'across' | 'down' }) => void;
  onClueHover?: (clue: (Clue & { direction: 'across' | 'down' }) | null) => void;
  onNavigateClue?: (direction: 'next' | 'prev') => void;
  canNavigateNext?: boolean;
  canNavigatePrev?: boolean;
  className?: string;
}

/**
 * CluesPanel component displays crossword clues in collapsible sections.
 * Features:
 * - Sticky headers for Across/Down sections
 * - Hover effects on clue items
 * - Dark mode support
 * - Collapsible sections
 * - Highlighted selected clue
 */
export function CluesPanel({
  acrossClues,
  downClues,
  selectedClue,
  revealedClues,
  onClueClick,
  onClueHover,
  onNavigateClue,
  canNavigateNext = false,
  canNavigatePrev = false,
  className,
}: CluesPanelProps) {
  const [acrossExpanded, setAcrossExpanded] = useState(true);
  const [downExpanded, setDownExpanded] = useState(true);
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);

  // Scroll selected clue into view when it changes
  useEffect(() => {
    if (!selectedClue) return;
    const key = `${selectedClue.direction}-${selectedClue.number}`;
    const el = scrollAreaRef.current?.querySelector(`[data-clue-key="${key}"]`);
    if (el && typeof (el as HTMLElement).scrollIntoView === 'function') {
      (el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedClue]);

  // Throttle hover events to avoid overwhelming the iframe with messages
  const handleClueHover = useCallback(
    throttle((clue: (Clue & { direction: 'across' | 'down' }) | null) => {
      onClueHover?.(clue);
    }, 50),
    [onClueHover]
  );

  const handleMouseEnter = useCallback(
    (clue: Clue, direction: 'across' | 'down') => {
      // If this clue is already selected, don't spam hover highlight messages or
      // accidentally "toggle" visual state. Keep the selected highlight steady.
      if (
        selectedClue &&
        selectedClue.direction === direction &&
        selectedClue.number === clue.number
      ) {
        return;
      }
      handleClueHover({ ...clue, direction });
    },
    [handleClueHover, selectedClue]
  );

  const handlePanelMouseLeave = useCallback(() => {
    // If a clue is selected (clicked), keep the grid highlight pinned to it.
    // Otherwise, clear any hover highlight.
    if (selectedClue) {
      const clue =
        selectedClue.direction === 'across'
          ? (acrossClues || []).find((c) => c.number === selectedClue.number)
          : (downClues || []).find((c) => c.number === selectedClue.number);

      if (clue) {
        handleClueHover({ ...clue, direction: selectedClue.direction });
        return;
      }
    }
    handleClueHover(null);
  }, [selectedClue, acrossClues, downClues, handleClueHover]);

  return (
    <Card className={cn('h-full rounded-2xl ring-1 ring-amber-200/30 dark:ring-amber-800/30', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle>Clues</CardTitle>
          {onNavigateClue && selectedClue && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onNavigateClue('prev')}
                disabled={!canNavigatePrev}
                className="p-1 rounded hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Previous clue"
                data-testid="clue-prev"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onNavigateClue('next')}
                disabled={!canNavigateNext}
                className="p-1 rounded hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Next clue"
                data-testid="clue-next"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea ref={scrollAreaRef} className="h-[calc(100vh-12rem)]">
          <div
            className="space-y-2 px-4 pb-4"
            // Clear highlight only when the user leaves the clues panel entirely.
            // Clearing on each clue button's mouseleave can race with click highlighting
            // and make it look like click highlighting "doesn't work".
            onMouseLeave={handlePanelMouseLeave}
          >
            {/* Across Section */}
            <div className="space-y-1">
              <button
                onClick={() => setAcrossExpanded(!acrossExpanded)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm font-semibold hover:bg-accent transition-colors"
                aria-expanded={acrossExpanded}
              >
                {acrossExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <span>Across</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {acrossClues?.length || 0}
                </span>
              </button>
              {acrossExpanded && (
                <div className="space-y-1 pl-2">
                  {(acrossClues || []).map((clue) => (
                    (() => {
                      const isSelected =
                        selectedClue?.direction === 'across' &&
                        selectedClue?.number === clue.number;
                      const isRevealed = revealedClues?.has(`across-${clue.number}`);
                      return (
                    <button
                      key={`across-${clue.number}`}
                      data-clue-key={`across-${clue.number}`}
                      data-testid={`clue-across-${clue.number}`}
                      onClick={() => {
                        onClueClick?.({ ...clue, direction: 'across' });
                        try {
                          window.dispatchEvent(
                            new CustomEvent('cw:clue-clicked', {
                              detail: { direction: 'across', number: clue.number },
                            })
                          );
                        } catch {
                          // ignore
                        }
                      }}
                      onMouseEnter={() => handleMouseEnter(clue, 'across')}
                      className={cn(
                        'w-full text-left px-3 py-2 rounded-md text-sm transition-colors border-l-4 border-transparent',
                        !isSelected && 'hover:bg-accent hover:text-accent-foreground',
                        isSelected &&
                          // Amber selection: subtle glow + crisp outline.
                          'bg-amber-100/80 dark:bg-amber-900/30 border-primary font-semibold',
                        isRevealed && 'line-through text-muted-foreground'
                      )}
                      style={
                        isSelected
                          ? {
                              boxShadow:
                                '0 0 0 2px rgba(217, 119, 6, 0.75), 0 0 16px rgba(217, 119, 6, 0.25)',
                            }
                          : undefined
                      }
                      aria-pressed={
                        isSelected
                      }
                    >
                      <span className="font-semibold text-primary">
                        {clue.number}.
                      </span>{' '}
                      <span>{clue.text}</span>
                    </button>
                      );
                    })()
                  ))}
                </div>
              )}
            </div>

            {/* Down Section */}
            <div className="space-y-1">
              <button
                onClick={() => setDownExpanded(!downExpanded)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm font-semibold hover:bg-accent transition-colors"
                aria-expanded={downExpanded}
              >
                {downExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <span>Down</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {downClues?.length || 0}
                </span>
              </button>
              {downExpanded && (
                <div className="space-y-1 pl-2">
                  {(downClues || []).map((clue) => (
                    (() => {
                      const isSelected =
                        selectedClue?.direction === 'down' &&
                        selectedClue?.number === clue.number;
                      const isRevealed = revealedClues?.has(`down-${clue.number}`);
                      return (
                    <button
                      key={`down-${clue.number}`}
                      data-clue-key={`down-${clue.number}`}
                      data-testid={`clue-down-${clue.number}`}
                      onClick={() => {
                        onClueClick?.({ ...clue, direction: 'down' });
                        try {
                          window.dispatchEvent(
                            new CustomEvent('cw:clue-clicked', {
                              detail: { direction: 'down', number: clue.number },
                            })
                          );
                        } catch {
                          // ignore
                        }
                      }}
                      onMouseEnter={() => handleMouseEnter(clue, 'down')}
                      className={cn(
                        'w-full text-left px-3 py-2 rounded-md text-sm transition-colors border-l-4 border-transparent',
                        !isSelected && 'hover:bg-accent hover:text-accent-foreground',
                        isSelected &&
                          'bg-amber-100/80 dark:bg-amber-900/30 border-primary font-semibold',
                        isRevealed && 'line-through text-muted-foreground'
                      )}
                      style={
                        isSelected
                          ? {
                              boxShadow:
                                '0 0 0 2px rgba(217, 119, 6, 0.75), 0 0 16px rgba(217, 119, 6, 0.25)',
                            }
                          : undefined
                      }
                      aria-pressed={
                        isSelected
                      }
                    >
                      <span className="font-semibold text-primary">
                        {clue.number}.
                      </span>{' '}
                      <span>{clue.text}</span>
                    </button>
                      );
                    })()
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
