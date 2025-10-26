export interface ProgressData {
  type: 'progress' | 'hint_used';
  puzzleId: number;
  data: {
    gridState?: Record<string, string>;
    progress?: number;
    filledCells?: number;
    totalCells?: number;
    hintsUsed?: number;
  };
  timestamp: number;
}

export interface CompletionData {
  puzzleId: number;
  completionTime: number;
  score: number;
  hintsUsed: number;
  timestamp: number;
}

export interface PuzzleRenderProps {
  puzzleId: number;
  content: string;
  onProgress?: (data: ProgressData) => void;
  onComplete?: (data: CompletionData) => void;
  // Multiplayer props
  isMultiplayer?: boolean;
  onCellUpdate?: (data: { cellId: string; value: string }) => void;
  onCursorMove?: (data: { cellId: string; x: number; y: number }) => void;
}

export interface PuzzleRenderer {
  type: 'iframe' | 'component';
  name: string;
  canHandle: (content: string) => boolean;
  render: (props: PuzzleRenderProps) => React.ReactNode;
}

export interface IframeMessage {
  source: 'eclipsecrossword-iframe';
  type: 'progress' | 'complete' | 'hint_used' | 'GET_STATE' | 'LOAD_STATE' | 'letter_validated' | 'suggest_hint';
  data?: any;
  puzzleId?: number;
  timestamp?: number;
}

export interface EclipseCrosswordState {
  gridState: Record<string, string>;
  currentWord: number;
  completedWords: number[];
  hintsUsed: number;
  startTime: number;
}
