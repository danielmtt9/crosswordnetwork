'use client';

import { ReactNode, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Adaptive Layout Component
 * 
 * Provides responsive layouts for puzzle + clues + chat:
 * - Desktop: Side-by-side with resizable panels
 * - Tablet: Stacked with tabs
 * - Mobile: Bottom drawer with sticky toolbar
 */

export interface AdaptiveLayoutProps {
  puzzle: ReactNode;
  clues?: ReactNode;
  toolbar?: ReactNode;
  className?: string;
}

export function AdaptiveLayout({
  puzzle,
  clues,
  toolbar,
  className,
}: AdaptiveLayoutProps) {
  const [activeTab, setActiveTab] = useState<'across' | 'down'>('across');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <>
      {/* Desktop Layout (>= 1024px) */}
      <div className={cn('hidden lg:flex h-full gap-4', className)}>
        {/* Left Panel - Clues */}
        {clues && (
          <aside className="w-80 flex-shrink-0 overflow-y-auto border-r bg-card">
            {clues}
          </aside>
        )}

        {/* Center - Puzzle */}
        <main className="flex-1 flex items-center justify-center overflow-hidden p-4">
          {puzzle}
        </main>

      </div>

      {/* Tablet Layout (768px - 1023px) */}
      <div className="hidden md:flex lg:hidden flex-col h-full">
        {/* Top - Puzzle */}
        <div className="flex-1 flex items-center justify-center overflow-hidden p-4">
          {puzzle}
        </div>

        {/* Bottom - Tabs */}
        <div className="border-t bg-card">
          {/* Tab Headers */}
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('across')}
              className={cn(
                'flex-1 px-4 py-3 text-sm font-medium transition-colors',
                activeTab === 'across'
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent'
              )}
            >
              Across
            </button>
            <button
              onClick={() => setActiveTab('down')}
              className={cn(
                'flex-1 px-4 py-3 text-sm font-medium transition-colors',
                activeTab === 'down'
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent'
              )}
            >
              Down
            </button>
          </div>

          {/* Tab Content */}
          <div className="h-64 overflow-y-auto p-4">
            {activeTab === 'across' && clues}
            {activeTab === 'down' && clues}
          </div>
        </div>
      </div>

      {/* Mobile Layout (< 768px) */}
      <div className="flex md:hidden flex-col h-full">
        {/* Puzzle */}
        <div className="flex-1 overflow-hidden">
          {puzzle}
        </div>

        {/* Sticky Toolbar */}
        {toolbar && (
          <div className="sticky bottom-0 border-t bg-background p-2 safe-area-inset-bottom">
            {toolbar}
          </div>
        )}

        {/* Bottom Drawer Toggle */}
        <button
          onClick={() => setIsDrawerOpen(!isDrawerOpen)}
          className={cn(
            'fixed bottom-20 right-4 z-50 rounded-full bg-primary p-4 text-primary-foreground shadow-lg transition-transform',
            isDrawerOpen && 'translate-y-0'
          )}
          aria-label={isDrawerOpen ? 'Close drawer' : 'Open clues'}
        >
          <svg
            className={cn('h-6 w-6 transition-transform', isDrawerOpen && 'rotate-180')}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 15l7-7 7 7"
            />
          </svg>
        </button>

        {/* Bottom Drawer */}
        {isDrawerOpen && (
          <div
            className={cn(
              'fixed inset-x-0 bottom-0 z-40 max-h-[60vh] overflow-y-auto border-t bg-card shadow-2xl transition-transform',
              isDrawerOpen ? 'translate-y-0' : 'translate-y-full'
            )}
          >
            {/* Drawer Tabs */}
            <div className="flex border-b sticky top-0 bg-card z-10">
              <button
                onClick={() => setActiveTab('across')}
                className={cn(
                  'flex-1 px-4 py-3 text-sm font-medium',
                  activeTab === 'across' && 'border-b-2 border-primary'
                )}
              >
                Across
              </button>
              <button
                onClick={() => setActiveTab('down')}
                className={cn(
                  'flex-1 px-4 py-3 text-sm font-medium',
                  activeTab === 'down' && 'border-b-2 border-primary'
                )}
              >
                Down
              </button>
            </div>

            {/* Drawer Content */}
            <div className="p-4">
              {activeTab === 'across' && clues}
              {activeTab === 'down' && clues}
            </div>
          </div>
        )}

        {/* Drawer Backdrop */}
        {isDrawerOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm"
            onClick={() => setIsDrawerOpen(false)}
          />
        )}
      </div>
    </>
  );
}
