'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export interface Clue {
  number: number;
  text: string;
  answer?: string;
}

export interface CluesPanelProps {
  acrossClues: Clue[];
  downClues: Clue[];
  selectedClue?: { direction: 'across' | 'down'; number: number };
  onClueClick?: (direction: 'across' | 'down', number: number) => void;
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
  onClueClick,
  className,
}: CluesPanelProps) {
  const [acrossExpanded, setAcrossExpanded] = useState(true);
  const [downExpanded, setDownExpanded] = useState(true);

  return (
    <Card className={cn('h-full', className)}>
      <CardHeader className="pb-3">
        <CardTitle>Clues</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-12rem)]">
          <div className="space-y-2 px-4 pb-4">
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
                  {acrossClues.length}
                </span>
              </button>
              {acrossExpanded && (
                <div className="space-y-1 pl-2">
                  {acrossClues.map((clue) => (
                    <button
                      key={`across-${clue.number}`}
                      onClick={() => onClueClick?.('across', clue.number)}
                      className={cn(
                        'w-full text-left px-3 py-2 rounded-md text-sm transition-colors',
                        'hover:bg-accent hover:text-accent-foreground',
                        selectedClue?.direction === 'across' &&
                          selectedClue?.number === clue.number &&
                          'bg-primary/10 border-l-2 border-primary font-medium'
                      )}
                    >
                      <span className="font-semibold text-primary">
                        {clue.number}.
                      </span>{' '}
                      <span>{clue.text}</span>
                    </button>
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
                  {downClues.length}
                </span>
              </button>
              {downExpanded && (
                <div className="space-y-1 pl-2">
                  {downClues.map((clue) => (
                    <button
                      key={`down-${clue.number}`}
                      onClick={() => onClueClick?.('down', clue.number)}
                      className={cn(
                        'w-full text-left px-3 py-2 rounded-md text-sm transition-colors',
                        'hover:bg-accent hover:text-accent-foreground',
                        selectedClue?.direction === 'down' &&
                          selectedClue?.number === clue.number &&
                          'bg-primary/10 border-l-2 border-primary font-medium'
                      )}
                    >
                      <span className="font-semibold text-primary">
                        {clue.number}.
                      </span>{' '}
                      <span>{clue.text}</span>
                    </button>
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
