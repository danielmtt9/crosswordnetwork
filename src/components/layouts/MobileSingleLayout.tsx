'use client';

import { ReactNode } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

export interface MobileSingleLayoutProps {
  acrossClues: ReactNode;
  downClues: ReactNode;
  puzzleArea: ReactNode;
  className?: string;
}

/**
 * MobileSingleLayout displays a stacked layout with tabs for single-player on mobile.
 * Layout: Puzzle (top) | Tabs (Across | Down)
 */
export function MobileSingleLayout({
  acrossClues,
  downClues,
  puzzleArea,
  className,
}: MobileSingleLayoutProps) {
  return (
    <div className={cn('flex h-full w-full flex-col gap-4 p-4', className)}>
      {/* Top: Puzzle Area */}
      <div className="flex items-center justify-center overflow-hidden">
        {puzzleArea}
      </div>

      {/* Bottom: Tabbed Clues */}
      <Tabs defaultValue="across" className="flex-1 overflow-hidden">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="across">Across</TabsTrigger>
          <TabsTrigger value="down">Down</TabsTrigger>
        </TabsList>
        <TabsContent value="across" className="h-[calc(100%-3rem)] overflow-hidden">
          {acrossClues}
        </TabsContent>
        <TabsContent value="down" className="h-[calc(100%-3rem)] overflow-hidden">
          {downClues}
        </TabsContent>
      </Tabs>
    </div>
  );
}
