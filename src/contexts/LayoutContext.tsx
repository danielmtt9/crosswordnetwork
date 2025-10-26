"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface LayoutState {
  puzzleDimensions: {
    width: number;
    height: number;
    cellSize: number;
    gridWidth: number;
    gridHeight: number;
  } | null;
  viewportDimensions: {
    width: number;
    height: number;
  };
  compactLayout: {
    headerHeight: number; // Fixed compact header height
    sidebarWidth: number; // Fixed sidebar width
    contentPadding: number; // Minimal padding
  };
}

interface LayoutContextType {
  layoutState: LayoutState;
  updatePuzzleDimensions: (dimensions: LayoutState['puzzleDimensions']) => void;
  updateViewportDimensions: (dimensions: LayoutState['viewportDimensions']) => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export function LayoutProvider({ children }: { children: ReactNode }) {
  const [layoutState, setLayoutState] = useState<LayoutState>({
    puzzleDimensions: null,
    viewportDimensions: { width: 0, height: 0 },
    compactLayout: {
      headerHeight: 32, // Fixed compact header - reduced from 40px
      sidebarWidth: 160, // Fixed sidebar width - reduced from 200px
      contentPadding: 8, // Minimal padding
    },
  });

  // Update viewport dimensions on mount and resize
  useEffect(() => {
    const updateViewport = () => {
      setLayoutState(prev => ({
        ...prev,
        viewportDimensions: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
      }));
    };

    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  // No complex calculations needed - use fixed compact layout

  const updatePuzzleDimensions = (dimensions: LayoutState['puzzleDimensions']) => {
    setLayoutState(prev => ({ ...prev, puzzleDimensions: dimensions }));
  };

  const updateViewportDimensions = (dimensions: LayoutState['viewportDimensions']) => {
    setLayoutState(prev => ({ ...prev, viewportDimensions: dimensions }));
  };

  return (
    <LayoutContext.Provider value={{
      layoutState,
      updatePuzzleDimensions,
      updateViewportDimensions,
    }}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() {
  const context = useContext(LayoutContext);
  if (context === undefined) {
    throw new Error('useLayout must be used within a LayoutProvider');
  }
  return context;
}
