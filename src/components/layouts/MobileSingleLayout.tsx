'use client';

import { ReactNode, useEffect, useMemo, useState } from 'react';
import { BookOpen, ChevronDown } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogOverlay } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export interface MobileSingleLayoutProps {
  acrossClues: ReactNode;
  downClues: ReactNode;
  puzzleArea: ReactNode;
  className?: string;
}

/**
 * MobileSingleLayout displays a grid-first solver layout with a bottom clues drawer.
 */
export function MobileSingleLayout({
  acrossClues,
  downClues,
  puzzleArea,
  className,
}: MobileSingleLayoutProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const onClueClicked = () => setDrawerOpen(false);
    window.addEventListener('cw:clue-clicked', onClueClicked as EventListener);
    return () => window.removeEventListener('cw:clue-clicked', onClueClicked as EventListener);
  }, []);

  const heightStyle = useMemo(
    () => ({
      height: 'calc(100dvh - var(--puzzle-header-h, 72px))',
    }),
    []
  );

  return (
    <div
      className={cn(
        'relative w-full overflow-hidden rounded-3xl bg-card/80 dark:bg-card/90 backdrop-blur-sm ring-1 ring-border shadow-lg',
        className
      )}
      style={heightStyle}
      data-testid="mobile-solver"
    >
      {/* Grid-first puzzle area */}
      <div className="h-full w-full overflow-hidden p-4">
        {puzzleArea}
      </div>

      {/* Floating Clues button */}
      <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
        <div className="pointer-events-auto">
          <Button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="gap-2 rounded-full shadow-lg"
            variant="default"
            data-testid="open-clues"
          >
            <BookOpen className="h-4 w-4" />
            Clues
            <ChevronDown className="h-4 w-4 opacity-80" />
          </Button>
        </div>
      </div>

      <Dialog open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DialogOverlay className="bg-black/50 backdrop-blur-sm" />
        <DialogContent
          className={cn(
            'fixed bottom-0 left-0 right-0 top-auto z-50 w-full max-w-none translate-x-0 translate-y-0 rounded-t-2xl border bg-background p-0 shadow-2xl',
            'data-[state=open]:slide-in-from-bottom-4 data-[state=closed]:slide-out-to-bottom-4'
          )}
        >
          <div className="flex items-center justify-center py-2">
            <div className="h-1.5 w-12 rounded-full bg-muted-foreground/30" />
          </div>
          <div className="px-4 pb-4">
            <Tabs defaultValue="across" className="h-[70dvh] overflow-hidden">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="across">Across</TabsTrigger>
                <TabsTrigger value="down">Down</TabsTrigger>
              </TabsList>
              <TabsContent value="across" className="h-[calc(70dvh-3rem)] overflow-hidden">
                {acrossClues}
              </TabsContent>
              <TabsContent value="down" className="h-[calc(70dvh-3rem)] overflow-hidden">
                {downClues}
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
