'use client';

import { ReactNode } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

export interface MobileMultiplayerLayoutProps {
  cluesPanel: ReactNode;
  puzzleArea: ReactNode;
  chatPanel: ReactNode;
  playersPanel: ReactNode;
  className?: string;
}

/**
 * MobileMultiplayerLayout displays a stacked layout with tabs for multiplayer on mobile.
 * Layout: Puzzle (top) | Tabs (Clues | Chat | Players)
 */
export function MobileMultiplayerLayout({
  cluesPanel,
  puzzleArea,
  chatPanel,
  playersPanel,
  className,
}: MobileMultiplayerLayoutProps) {
  return (
    <div className={cn('flex h-full w-full flex-col gap-4 p-4', className)}>
      {/* Top: Puzzle Area */}
      <div className="flex items-center justify-center overflow-hidden">
        {puzzleArea}
      </div>

      {/* Bottom: Tabbed Content */}
      <Tabs defaultValue="clues" className="flex-1 overflow-hidden">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="clues">Clues</TabsTrigger>
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="players">Players</TabsTrigger>
        </TabsList>
        <TabsContent value="clues" className="h-[calc(100%-3rem)] overflow-hidden">
          {cluesPanel}
        </TabsContent>
        <TabsContent value="chat" className="h-[calc(100%-3rem)] overflow-hidden">
          {chatPanel}
        </TabsContent>
        <TabsContent value="players" className="h-[calc(100%-3rem)] overflow-hidden">
          {playersPanel}
        </TabsContent>
      </Tabs>
    </div>
  );
}
