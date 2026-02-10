import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface GridState {
  [cellId: string]: string; // cellId -> value
}

interface PuzzleState {
  // Current puzzle
  puzzleId: number | null;
  
  // Grid state
  gridState: GridState;
  
  // Progress tracking
  hintsUsed: number;
  startTime: number | null; // timestamp when puzzle started
  lastSaveTime: number | null; // timestamp of last save
  isDirty: boolean; // has unsaved changes
  
  // Completion
  isCompleted: boolean;
  completionTime: number | null; // seconds taken to complete
  score: number;
  
  // Actions
  setPuzzle: (puzzleId: number) => void;
  updateCell: (cellId: string, value: string) => void;
  setGridState: (gridState: GridState) => void;
  incrementHints: () => void;
  setHintsUsed: (count: number) => void;
  markStarted: () => void;
  markSaved: () => void;
  markDirty: () => void;
  markCompleted: (completionTime: number, score: number) => void;
  reset: () => void;
}

export const usePuzzleStore = create<PuzzleState>()(
  persist(
    (set, get) => ({
      // Initial state
      puzzleId: null,
      gridState: {},
      hintsUsed: 0,
      startTime: null,
      lastSaveTime: null,
      isDirty: false,
      isCompleted: false,
      completionTime: null,
      score: 0,

      // Actions
      setPuzzle: (puzzleId: number) => {
        const currentPuzzleId = get().puzzleId;
        if (currentPuzzleId !== puzzleId) {
          set({
            puzzleId,
            gridState: {},
            hintsUsed: 0,
            startTime: null,
            lastSaveTime: null,
            isDirty: false,
            isCompleted: false,
            completionTime: null,
            score: 0,
          });
        }
      },

      updateCell: (cellId: string, value: string) => {
        set((state) => ({
          gridState: {
            ...state.gridState,
            [cellId]: value,
          },
          isDirty: true,
        }));
      },

      setGridState: (gridState: GridState) => {
        set({ gridState, isDirty: true });
      },

      incrementHints: () => {
        set((state) => ({
          hintsUsed: state.hintsUsed + 1,
          isDirty: true,
        }));
      },

      setHintsUsed: (count: number) => {
        set({ hintsUsed: count });
      },

      markStarted: () => {
        set({ startTime: Date.now() });
      },

      markSaved: () => {
        set({ 
          lastSaveTime: Date.now(),
          isDirty: false,
        });
      },

      markDirty: () => {
        set({ isDirty: true });
      },

      markCompleted: (completionTime: number, score: number) => {
        set({
          isCompleted: true,
          completionTime,
          score,
          isDirty: true, // Need to save completion
        });
      },

      reset: () => {
        set({
          puzzleId: null,
          gridState: {},
          hintsUsed: 0,
          startTime: null,
          lastSaveTime: null,
          isDirty: false,
          isCompleted: false,
          completionTime: null,
          score: 0,
        });
      },
    }),
    {
      name: 'puzzle-store',
      // Only persist certain fields, not everything
      partialize: (state) => ({
        puzzleId: state.puzzleId,
        gridState: state.gridState,
        hintsUsed: state.hintsUsed,
        startTime: state.startTime,
        isCompleted: state.isCompleted,
        completionTime: state.completionTime,
        score: state.score,
      }),
    }
  )
);
