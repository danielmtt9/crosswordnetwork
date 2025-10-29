"use client";

import { useState, useEffect, use, useCallback, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Save,
  Share2,
  Loader2,
  X,
} from "lucide-react";
import { usePuzzleStore } from "@/lib/stores/puzzleStore";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useIframeMessage } from "@/hooks/useIframeMessage";
import { AdaptiveLayout } from "@/components/layouts/AdaptiveLayout";
import { SaveIndicator } from "@/components/puzzle/SaveIndicator";
import { PuzzleArea } from "@/components/puzzle/PuzzleArea";
import { HintsMenu } from "@/components/puzzle/HintsMenu";
import { CluesPanel } from "@/components/puzzle/CluesPanel";
import { ProgressBar } from "@/components/puzzle/ProgressBar";
import { extractCluesWithRetry, formatCluesForDisplay } from "@/lib/clueExtraction";
import { isMultiplayerOnly } from "@/lib/puzzleTags";
import { useRouter } from "next/navigation";
import { useDeviceType } from "@/hooks/useDeviceType";

interface PuzzleData {
  id: number;
  title: string;
  description: string | null;
  filename: string;
  file_path: string;
  tier: string | null;
  difficulty: string | null;
  grid_width: number | null;
  grid_height: number | null;
}

interface UserProgress {
  id: string;
  userId: string;
  puzzleId: number;
  completedCells: string | null;
  hintsUsed: number;
  isCompleted: boolean;
  lastPlayedAt: string;
  completedAt: string | null;
  completionTimeSeconds: number | null;
  score: number;
  startedAt: string;
}

interface ProgressResponse {
  progress: UserProgress | null;
  userRole: string;
  subscriptionStatus: string;
  isPremium: boolean;
  hintLimit: number;
  hintsUsed: number;
  remainingHints: number;
}

const difficultyColors = {
  easy: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  hard: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
};

const accessLevelColors = {
  free: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  premium: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
};

interface PuzzlePageProps {
  params: {
    id: string;
  };
}

export default function PuzzlePage({ params }: PuzzlePageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const device = useDeviceType();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [puzzle, setPuzzle] = useState<PuzzleData | null>(null);
  const [puzzleContent, setPuzzleContent] = useState<string | null>(null);
  const [progressData, setProgressData] = useState<ProgressResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clues, setClues] = useState<{ across: any[]; down: any[] }>({ across: [], down: [] });
  const [progressPercent, setProgressPercent] = useState(0);
  const [iframeHeight, setIframeHeight] = useState(600);

  // Zustand store
  const {
    gridState,
    hintsUsed,
    startTime,
    isDirty,
    isCompleted,
    setPuzzle: setPuzzleStore,
    setGridState,
    setHintsUsed,
    markStarted,
    markSaved,
    markDirty,
    markCompleted,
  } = usePuzzleStore();

  // Auto-save functionality with new API
  const { saveStatus, lastSaved, error: saveError, forceSave } = useAutoSave({
    saveFunction: async () => {
      if (!puzzle || !isDirty) return;
      
      const response = await fetch(`/api/puzzles/${puzzle.id}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gridState,
          completedCells: Object.keys(gridState).length,
          hintsUsed,
          timeElapsed: startTime ? Math.floor((Date.now() - startTime) / 1000) : 0,
          timestamp: new Date().toISOString(),
          isAutoSave: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save progress');
      }

      markSaved();
    },
    isDirty,
    onSuccess: () => console.log('[PuzzlePage] Auto-save successful'),
    onError: (error) => console.error('[PuzzlePage] Auto-save failed:', error),
  });

  // Iframe messaging
  const { sendCommand } = useIframeMessage({
    iframeRef,
    onMessage: useCallback((message) => {
      switch (message.type) {
        case 'progress':
          const progress = message.data.progress || 0;
          setProgressPercent(progress);
          
          if (message.data.gridState) {
            setGridState(message.data.gridState);
            markDirty();
          }
          break;

        case 'dimensions':
          if (message.data.totalHeight) {
            setIframeHeight(message.data.totalHeight);
          }
          break;

        case 'complete':
          markCompleted(
            message.data.completionTime || 0,
            message.data.score || 0
          );
          break;

        case 'hint_used':
          if (message.data.hintsUsed !== undefined) {
            setHintsUsed(message.data.hintsUsed);
            markDirty();
          }
          break;

        case 'wordlist':
          // Clues extracted from iframe
          if (message.data.words) {
            const formatted = formatCluesForDisplay({
              across: message.data.words.filter((w: any) => w.direction === 'across'),
              down: message.data.words.filter((w: any) => w.direction === 'down'),
            });
            setClues(formatted);
          }
          break;
      }
    }, [setGridState, markDirty, markCompleted, setHintsUsed]),
  });

  // Fetch puzzle data
  useEffect(() => {
    const fetchPuzzle = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/puzzles/${resolvedParams.id}`);
        if (!response.ok) {
          setError(response.status === 404 ? "Puzzle not found" : "Failed to fetch puzzle");
          return;
        }

        const puzzleData: PuzzleData = await response.json();
        
        // Check if puzzle is multiplayer-only
        if (isMultiplayerOnly(puzzleData)) {
          router.push(`/multiplayer/new?puzzleId=${puzzleData.id}`);
          return;
        }
        
        setPuzzle(puzzleData);
        setPuzzleStore(puzzleData.id);

        // Load puzzle content
        const contentResponse = await fetch(`/api/puzzles/${resolvedParams.id}/content`);
        if (contentResponse.ok) {
          const contentData = await contentResponse.json();
          setPuzzleContent(contentData.content);
        }

        // Fetch user progress
        const progressResponse = await fetch(`/api/puzzles/${resolvedParams.id}/progress`);
        if (progressResponse.ok) {
          const progressResponseData: ProgressResponse = await progressResponse.json();
          setProgressData(progressResponseData);
          
          // Update store with existing progress
          if (progressResponseData.progress) {
            const progress = progressResponseData.progress;
            setHintsUsed(progress.hintsUsed);
            
            if (progress.completedCells) {
              try {
                const cells = JSON.parse(progress.completedCells);
                setGridState(cells);
              } catch (e) {
                console.error('Failed to parse completed cells:', e);
              }
            }
            
            if (progress.isCompleted) {
              markCompleted(
                progress.completionTimeSeconds || 0,
                progress.score || 0
              );
            }
          } else {
            markStarted();
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch puzzle");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPuzzle();
  }, [resolvedParams.id, setPuzzleStore, setHintsUsed, setGridState, markStarted, markCompleted, router]);

  // Extract clues from iframe after content loads
  useEffect(() => {
    if (!puzzleContent || !iframeRef.current) return;

    const timer = setTimeout(async () => {
      const extractedClues = await extractCluesWithRetry(iframeRef.current);
      const formatted = formatCluesForDisplay(extractedClues);
      setClues(formatted);
    }, 1000);

    return () => clearTimeout(timer);
  }, [puzzleContent]);

  // Handle hint usage
  const handleUseHint = async (hintType: 'letter' | 'word' | 'definition') => {
    if (!puzzle) return;

    try {
      const response = await fetch(`/api/puzzles/${puzzle.id}/hint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hintType }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 403) {
          alert(errorData.message);
          return;
        }
        throw new Error(errorData.error || 'Failed to use hint');
      }

      const hintData = await response.json();
      
      // Apply hint to iframe
      if (hintData.type === 'letter_reveal') {
        sendCommand({ type: 'reveal_letter' });
      } else if (hintData.type === 'word_reveal') {
        sendCommand({ type: 'reveal_word', wordIndex: hintData.wordIndex });
      }

      // Refresh progress data
      const progressResponse = await fetch(`/api/puzzles/${puzzle.id}/progress`);
      if (progressResponse.ok) {
        const progressResponseData: ProgressResponse = await progressResponse.json();
        setProgressData(progressResponseData);
      }
    } catch (err) {
      console.error('[PuzzlePage] Hint error:', err);
      alert(err instanceof Error ? err.message : 'Failed to use hint');
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading puzzle...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !puzzle) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <X className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Puzzle not found</h1>
          <p className="text-muted-foreground mb-4">{error || "The puzzle you're looking for doesn't exist."}</p>
          <Button asChild>
            <Link href="/puzzles">Back to Puzzles</Link>
          </Button>
        </div>
      </div>
    );
  }

  const currentHintsUsed = progressData?.hintsUsed || 0;
  const hintLimit = progressData?.hintLimit || 5;
  const isPremium = progressData?.isPremium || false;
  const canUseHint = isPremium || currentHintsUsed < hintLimit;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-xl flex-shrink-0 z-50 h-14">
        <div className="container mx-auto max-w-7xl px-4 py-2 h-full">
          <div className="flex items-center justify-between h-full">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/puzzles">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Link>
              </Button>
              
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold">{puzzle.title}</h1>
                {puzzle.difficulty && (
                  <Badge className={difficultyColors[puzzle.difficulty as keyof typeof difficultyColors]}>
                    {puzzle.difficulty}
                  </Badge>
                )}
                {puzzle.tier && (
                  <Badge className={accessLevelColors[puzzle.tier as keyof typeof accessLevelColors]}>
                    {puzzle.tier}
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <SaveIndicator 
                status={saveStatus} 
                lastSaved={lastSaved} 
                error={saveError} 
              />
              {device === 'desktop' && (
                <>
                  <Button variant="outline" size="sm" onClick={forceSave}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Now
                  </Button>
                  <Button variant="outline" size="sm">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content with AdaptiveLayout */}
      <div className="flex-1 container mx-auto max-w-7xl px-4 py-4">
        <AdaptiveLayout
          participantCount={1} // Single-player
          device={device}
          
          // Puzzle area
          puzzleArea={
            <PuzzleArea
              puzzleUrl={puzzle.file_path}
              puzzleContent={puzzleContent || ''}
              height={iframeHeight}
              iframeRef={iframeRef}
            />
          }
          
          // Clues panel
          cluesPanel={
            <CluesPanel
              acrossClues={clues.across}
              downClues={clues.down}
              onClueClick={(clue) => {
                console.log('[PuzzlePage] Clue clicked:', clue);
                // Could send focus command to iframe
              }}
            />
          }
          
          // Hints menu
          hintsMenu={
            <HintsMenu
              remainingHints={isPremium ? undefined : hintLimit - currentHintsUsed}
              isPremium={isPremium}
              onRevealLetter={() => handleUseHint('letter')}
              onRevealWord={() => handleUseHint('word')}
              onCheckPuzzle={() => {
                sendCommand({ type: 'check_puzzle' });
              }}
              device={device}
            />
          }
          
          // Progress bar
          progressBar={
            <ProgressBar
              completionPercent={progressPercent}
              wordsCompleted={Object.keys(gridState).length}
              totalWords={clues.across.length + clues.down.length}
            />
          }
          
          // Save indicator
          saveIndicator={
            <SaveIndicator 
              status={saveStatus} 
              lastSaved={lastSaved} 
              error={saveError} 
            />
          }
        />
      </div>
    </div>
  );
}
