"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
// Removed collapsible import - using simple state instead
import {
  ArrowLeft,
  Clock,
  Star,
  Users,
  Lock,
  Lightbulb,
  Save,
  Share2,
  Trophy,
  Zap,
  CheckCircle,
  X,
  Loader2,
  Puzzle,
  Target,
  ChevronDown,
  HelpCircle,
  ArrowRight,
  ArrowDown,
  TrendingUp,
  Award
} from "lucide-react";
import { usePuzzleStore } from "@/lib/stores/puzzleStore";
import { useAutoSave } from "@/hooks/useAutoSave";
import { SaveIndicator } from "@/components/SaveIndicator";
import { CompletionModal } from "@/components/CompletionModal";
import { HintLimitBanner } from "@/components/HintLimitBanner";
import { PuzzleRenderer } from "@/components/PuzzleRenderer";
import { SmartHintSystem } from "@/components/SmartHintSystem";
import { ProgressData, CompletionData } from "@/lib/puzzleRenderers/types";
import { LayoutProvider, useLayout } from "@/contexts/LayoutContext";
import { isMultiplayerOnly } from "@/lib/puzzleTags";
import { useRouter } from "next/navigation";

interface PuzzleData {
  id: number;
  title: string;
  description: string | null;
  filename: string;
  original_filename: string;
  file_path: string;
  tier: string | null;
  category: string | null;
  difficulty: string | null;
  play_count: number | null;
  completion_rate: number | null;
  estimated_solve_time: number | null;
  avg_solve_time: number | null;
  best_score: number | null;
  upload_date: string;
  is_active: boolean;
  grid_width: number | null;
  grid_height: number | null;
  tags: string | null;
}

// HTML content is now just a string
type PuzzleContent = string;

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
  timesPlayed?: number;      // NEW
  bestTime?: number | null;  // NEW
  totalAccuracy?: number;    // NEW
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

function PuzzlePageContent({ params }: PuzzlePageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { layoutState, updatePuzzleDimensions } = useLayout();
  const [puzzle, setPuzzle] = useState<PuzzleData | null>(null);
  const [dbGridDimensions, setDbGridDimensions] = useState<{width: number | null, height: number | null} | null>(null);
  const [puzzleContent, setPuzzleContent] = useState<PuzzleContent | null>(null);
  const [puzzleMetadata, setPuzzleMetadata] = useState<any>(null);
  const [progressData, setProgressData] = useState<ProgressResponse | null>(null);
  const [showHintModal, setShowHintModal] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hintMessage, setHintMessage] = useState<string | null>(null);
  const [isMobileInfoOpen, setIsMobileInfoOpen] = useState(false);
  const [wordList, setWordList] = useState<{ index:number; direction:string; answer:string; clue:string; x:number; y:number; length:number; }[]>([]);
  const [progressPercent, setProgressPercent] = useState(0);
  const [wordsCompleted, setWordsCompleted] = useState(0);
  const [totalWords, setTotalWords] = useState(0);
  const [recentProgress, setRecentProgress] = useState<number[]>([]);

  // Letter validation tracking
  const [accuracy, setAccuracy] = useState<number>(100);
  const [showHintSuggestion, setShowHintSuggestion] = useState<boolean>(false);
  const [strugglingWord, setStrugglingWord] = useState<number | null>(null);

  // Zustand store
  const {
    puzzleId,
    gridState,
    hintsUsed,
    startTime,
    isDirty,
    isCompleted,
    completionTime,
    score,
    setPuzzle: setPuzzleStore,
    updateCell,
    setGridState,
    incrementHints,
    setHintsUsed,
    markStarted,
    markSaved,
    markDirty,
    markCompleted,
  } = usePuzzleStore();

  // Auto-save functionality
  const { saveStatus, lastSaved, error: saveError, forceSave } = useAutoSave({
    saveFunction: async () => {
      if (!puzzle || !isDirty) return;
      
      const response = await fetch(`/api/puzzles/${puzzle.id}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          completedCells: JSON.stringify(gridState),
          gridState: gridState, // Also send as gridState for EclipseCrossword compatibility
          hintsUsed,
          isCompleted,
          startedAt: startTime,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save progress');
      }

      markSaved();
    },
    isDirty,
    source: 'iframe', // Use faster debounce for iframe communication
  });

  useEffect(() => {
    const fetchPuzzle = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/puzzles/${resolvedParams.id}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError("Puzzle not found");
          } else {
            throw new Error("Failed to fetch puzzle");
          }
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

        // Use database grid dimensions for pre-calculation if available
        if (puzzleData.grid_width && puzzleData.grid_height) {
          setDbGridDimensions({ width: puzzleData.grid_width, height: puzzleData.grid_height });
          // Pre-calculate layout with database dimensions
          const cellSize = 16; // Minimum cell size
          const bottomPanelHeight = 107; // Fixed bottom panel height
          const totalHeight = puzzleData.grid_height * cellSize + bottomPanelHeight;
          
          updatePuzzleDimensions({
            width: puzzleData.grid_width * cellSize,
            height: totalHeight,
            cellSize: cellSize,
            gridWidth: puzzleData.grid_width,
            gridHeight: puzzleData.grid_height,
          });
        }

        // Load puzzle content
        const contentResponse = await fetch(`/api/puzzles/${resolvedParams.id}/content`);
        if (contentResponse.ok) {
          const contentData = await contentResponse.json();
          setPuzzleContent(contentData.content);
          if (contentData.metadata) {
            setPuzzleMetadata(contentData.metadata);
          }
        }

        // Fetch user progress with role information
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
            // Mark as started if no existing progress
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
  }, [resolvedParams.id, setPuzzleStore, setHintsUsed, setGridState, markStarted, markCompleted]);

  // Handle hint usage
  const handleUseHint = async (hintType: 'letter' | 'word' | 'definition') => {
    if (!puzzle) return;

    try {
      const response = await fetch(`/api/puzzles/${puzzle.id}/hint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          hintType,  // NEW: Send hint type to backend
          currentWord: (window as any).__currentWordData  // NEW: Send current word context
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 403) {
          setHintMessage(errorData.message);
          setShowHintModal(true);
          return;
        }
        throw new Error(errorData.error || 'Failed to use hint');
      }

      const hintData = await response.json();
      
      // Handle different hint types
      if (hintData.type === 'letter_reveal') {
        // Reveal one letter
        (window as any).__ecwRevealLetterMap?.[puzzle.id]?.();
        setHintMessage(hintData.message);
      } else if (hintData.type === 'word_reveal') {
        // Reveal entire word
        (window as any).__ecwRevealWordMap?.[puzzle.id]?.(hintData.wordIndex);
        setHintMessage(hintData.message);
      } else if (hintData.type === 'clue_hint') {
        // Show enhanced clue
        setHintMessage(hintData.enhancedClue);
      }
      
      // Update UI based on hint cost
      incrementHints(hintData.cost || 1);
      setShowHintModal(true);

      // Refresh progress data
      const progressResponse = await fetch(`/api/puzzles/${puzzle.id}/progress`);
      if (progressResponse.ok) {
        const progressResponseData: ProgressResponse = await progressResponse.json();
        setProgressData(progressResponseData);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to use hint");
    }
  };

  // Handle puzzle completion
  const handlePuzzleComplete = () => {
    if (!puzzle || !startTime) return;

    const completionTimeSeconds = Math.floor((Date.now() - startTime) / 1000);
    markCompleted(completionTimeSeconds, 1000); // Base score, will be calculated by API
    setShowCompletionModal(true);
  };

  // Handle progress updates from puzzle renderer
  // Debug logging for container dimensions
  useEffect(() => {
    const isDebugMode = typeof window !== 'undefined' && window.location.search.includes('debug=1');
    if (!isDebugMode) return;
    
    const logContainerDimensions = () => {
      try {
        const puzzleCard = document.querySelector('[data-puzzle-card]') as HTMLElement;
        const puzzleContent = document.querySelector('[data-puzzle-content]') as HTMLElement;
        if (puzzleCard && puzzleContent) {
          console.log('[PUZZLE PAGE DEBUG]', {
            cardHeight: puzzleCard.clientHeight,
            cardOffsetHeight: puzzleCard.offsetHeight,
            contentHeight: puzzleContent.clientHeight,
            contentOffsetHeight: puzzleContent.offsetHeight,
            viewportHeight: window.innerHeight,
            headerHeight: document.querySelector('header')?.clientHeight || 0
          });
        }
      } catch (e) {
        console.error('Debug logging error:', e);
      }
    };
    
    // Log on mount and resize
    logContainerDimensions();
    window.addEventListener('resize', logContainerDimensions);
    
    return () => window.removeEventListener('resize', logContainerDimensions);
  }, []);

  const handleProgressUpdate = (data: ProgressData) => {
    if ((data as any).type === 'wordlist') {
      const words = (data as any).data?.words || [];
      setWordList(words);
      return;
    } else if (data.type === 'dimensions') {
      // Update layout context with puzzle dimensions
      const dimensions = (data as any).data;
      if (dimensions) {
        updatePuzzleDimensions({
          width: dimensions.totalWidth || 0,
          height: dimensions.totalHeight || 0,
          cellSize: dimensions.cellSize || 0,
          gridWidth: dimensions.gridWidth || 0,
          gridHeight: dimensions.gridHeight || 0,
        });
      }
      return;
    } else if (data.type === 'progress') {
      const progress = data.data.progress || 0;
      setProgressPercent(progress);
      
      // Track progress history for sparkline
      setRecentProgress(prev => [...prev.slice(-20), progress]);
      
      // Update grid state
      if (data.data.gridState) {
        setGridState(data.data.gridState);
        markDirty();
      }
    } else if (data.type === 'hint_used') {
      setHintsUsed(data.data.hintsUsed || 0);
      markDirty();
    } else if (data.type === 'letter_validated') {
      // Update accuracy display
      if (data.data.accuracy) {
        setAccuracy(parseFloat(data.data.accuracy));
      }
      
      // Show encouragement based on accuracy
      if (data.data.isCorrect) {
        // Could show a subtle toast notification
        console.log('✅ Correct!');
      } else {
        // Track struggling words
        if (data.data.errorCount >= 3) {
          setStrugglingWord(data.data.wordIndex);
          setShowHintSuggestion(true);
          
          // Auto-hide suggestion after 5 seconds
          setTimeout(() => setShowHintSuggestion(false), 5000);
        }
      }
    } else if (data.type === 'suggest_hint') {
      // Show hint suggestion UI
      setStrugglingWord(data.data.wordIndex);
      setShowHintSuggestion(true);
    }
  };

  // Handle completion from puzzle renderer
  const handlePuzzleCompleteFromRenderer = (data: CompletionData) => {
    markCompleted(data.completionTime, data.score);
    setHintsUsed(data.hintsUsed);
    setShowCompletionModal(true);
  };

  // Mock cell update for demonstration
  const handleCellUpdate = (cellId: string, value: string) => {
    updateCell(cellId, value);
    
    // Check for completion (mock logic)
    const totalCells = 25; // 5x5 grid
    const filledCells = Object.keys(gridState).length + (value ? 1 : 0);
    if (filledCells >= totalCells * 0.8) { // 80% completion
      handlePuzzleComplete();
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl/Cmd + S: Save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        forceSave();
      }
      // Ctrl/Cmd + H: Hint
      if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
        e.preventDefault();
        handleUseHint();
      }
      // Escape: Close modals
      if (e.key === 'Escape') {
        setShowHintModal(false);
        setShowCompletionModal(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [forceSave, handleUseHint]);

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
  const hintText = isPremium ? "Unlimited hints" : `${hintLimit - currentHintsUsed} hints remaining`;

  // Simple, puzzle-first calculation
  const headerHeight = layoutState.compactLayout.headerHeight;
  const contentPadding = layoutState.compactLayout.contentPadding;
  
  // Fallback to window dimensions if viewport dimensions aren't set yet
  const viewportHeight = layoutState.viewportDimensions.height || (typeof window !== 'undefined' ? window.innerHeight : 800);
  const viewportWidth = layoutState.viewportDimensions.width || (typeof window !== 'undefined' ? window.innerWidth : 1200);
  
  const availableHeight = viewportHeight - headerHeight - contentPadding;
  
  // Desktop grid: 240px sidebar + 16px gap + rest for puzzle
  const sidebarWidth = layoutState.compactLayout.sidebarWidth;
  const gridGap = 8;
  const puzzleWidth = viewportWidth - sidebarWidth - gridGap - contentPadding;


  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header 
        className="border-b bg-card/50 backdrop-blur-xl flex-shrink-0 z-50"
        style={{ height: '32px' }}
      >
        <div className="container mx-auto max-w-7xl px-2 py-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/puzzles">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Puzzles
                </Link>
              </Button>
              
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold">{puzzle.title}</h1>
                {puzzle.difficulty && (
                  <Badge className={difficultyColors[puzzle.difficulty as keyof typeof difficultyColors]}>
                    {puzzle.difficulty.charAt(0).toUpperCase() + puzzle.difficulty.slice(1)}
                  </Badge>
                )}
                {puzzle.tier && (
                  <Badge className={accessLevelColors[puzzle.tier as keyof typeof accessLevelColors]}>
                    {puzzle.tier.charAt(0).toUpperCase() + puzzle.tier.slice(1)}
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
                     <Button variant="outline" size="sm" onClick={forceSave}>
                       <Save className="h-4 w-4 mr-2" />
                       Save Now
                     </Button>
                     <Button variant="outline" size="sm">
                       <Share2 className="h-4 w-4 mr-2" />
                       Share
                     </Button>
                   </div>
          </div>
        </div>
      </header>

             <div 
               className="container mx-auto max-w-7xl px-2 py-1 flex-1"
               style={{ minHeight: 'calc(100vh - 32px)' }}
             >
               {/* Hint Limit Banner */}
               {progressData && (
                 <HintLimitBanner
                   hintsUsed={hintsUsed}
                   hintLimit={hintLimit}
                   isPremium={isPremium}
                 />
               )}

               {/* Mobile Layout */}
               <div className="lg:hidden space-y-4">
                 {/* Collapsible Info Section */}
                 <Card>
                   <button 
                     className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                     onClick={() => setIsMobileInfoOpen(!isMobileInfoOpen)}
                   >
                     <div className="flex items-center gap-3">
                       <Puzzle className="h-5 w-5 text-primary" />
                       <div className="text-left">
                         <div className="font-semibold">{puzzle.title}</div>
                         <div className="text-sm text-muted-foreground">{puzzle.difficulty}</div>
                       </div>
                     </div>
                     <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isMobileInfoOpen ? 'rotate-180' : ''}`} />
                   </button>
                   {isMobileInfoOpen && (
                     <div className="px-4 pb-4 space-y-4">
                       {/* Mobile puzzle info content */}
                       <div className="space-y-4">
                         {/* Enhanced Puzzle Stats */}
                         <div className="space-y-2">
                           <div className="flex items-center gap-2 mb-2">
                             <Puzzle className="h-4 w-4 text-green-600" />
                             <span className="text-xs font-semibold">Puzzle Info</span>
                           </div>
                           
                           {/* Word counts - vertical stacked */}
                           {puzzleMetadata && puzzleMetadata.wordCount && (
                             <div className="space-y-1.5">
                               <div className="flex justify-between items-center">
                                 <span className="text-[10px] text-muted-foreground">Total Words</span>
                                 <span className="text-sm font-bold text-green-600">{puzzleMetadata.wordCount}</span>
                               </div>
                               <div className="flex justify-between items-center">
                                 <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                   <ArrowRight className="h-2.5 w-2.5" />Across
                                 </span>
                                 <span className="text-xs font-medium">{puzzleMetadata.acrossCount}</span>
                               </div>
                               <div className="flex justify-between items-center">
                                 <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                   <ArrowDown className="h-2.5 w-2.5" />Down
                                 </span>
                                 <span className="text-xs font-medium">{puzzleMetadata.downCount}</span>
                               </div>
                               <div className="h-px bg-green-200 dark:bg-green-800 my-1.5"></div>
                               <div className="flex justify-between items-center">
                                 <span className="text-[10px] text-muted-foreground">Grid Size</span>
                                 <span className="text-xs font-medium">{puzzle?.grid_width || '?'}×{puzzle?.grid_height || '?'}</span>
                               </div>
                             </div>
                           )}
                         </div>

                         {/* Enhanced Progress */}
                         <div className="space-y-2">
                           {/* Compact progress display */}
                           <div className="flex items-center justify-between">
                             <span className="text-xs font-medium flex items-center gap-1">
                               <Target className="h-3 w-3 text-green-600" />
                               Progress
                             </span>
                             <span className="text-sm font-bold text-green-600">
                               {progressPercent}%
                             </span>
                           </div>
                           
                           {/* Progress bar */}
                           <div className="w-full bg-green-100 dark:bg-green-900/30 rounded-full h-1.5">
                             <motion.div 
                               className="bg-green-500 h-full rounded-full"
                               initial={{ width: 0 }}
                               animate={{ width: `${progressPercent}%` }}
                               transition={{ duration: 0.5 }}
                             />
                           </div>
                           
                           {/* Cells filled - compact */}
                           <div className="flex justify-between text-[10px] text-muted-foreground">
                             <span>Cells</span>
                             <span>{Object.keys(gridState).length}/{puzzleMetadata?.width * puzzleMetadata?.height}</span>
                           </div>
                           
                           {/* Show only CURRENT milestone badge */}
                           {progressPercent >= 75 ? (
                             <Badge className="text-[10px] w-full justify-center">
                               <Star className="h-2.5 w-2.5 mr-1" />75%
                             </Badge>
                           ) : progressPercent >= 50 ? (
                             <Badge className="text-[10px] w-full justify-center">
                               <Trophy className="h-2.5 w-2.5 mr-1" />50%
                             </Badge>
                           ) : progressPercent >= 25 ? (
                             <Badge className="text-[10px] w-full justify-center">
                               <Zap className="h-2.5 w-2.5 mr-1" />25%
                             </Badge>
                           ) : null}
                           
                           {isCompleted && (
                             <motion.div 
                               className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 rounded-md px-2 py-1.5"
                               initial={{ opacity: 0, scale: 0.9 }}
                               animate={{ opacity: 1, scale: 1 }}
                               transition={{ duration: 0.3 }}
                             >
                               <CheckCircle className="h-3.5 w-3.5" />
                               <span className="font-medium">Puzzle completed!</span>
                             </motion.div>
                           )}
                         </div>

                         {/* Smart Hint System */}
                         <div className="space-y-3">
                           <h4 className="font-medium text-sm flex items-center gap-2">
                             <Lightbulb className="h-4 w-4 text-green-600" />
                             Smart Hints
                           </h4>
                           <SmartHintSystem
                             onUseHint={handleUseHint}
                             canUseHint={canUseHint}
                             hintsUsed={hintsUsed}
                             userRole={session?.role}
                             subscriptionStatus={session?.subscriptionStatus}
                             className="text-sm"
                           />
                         </div>

                         {/* Time & Statistics */}
                         <div className="space-y-2">
                           <div className="flex items-center gap-2 mb-2">
                             <Clock className="h-4 w-4 text-green-600" />
                             <span className="text-xs font-semibold">Time Stats</span>
                           </div>
                           
                           <div className="space-y-1.5">
                             {/* Estimated solve time */}
                             {puzzle?.estimated_solve_time && (
                               <div className="flex justify-between items-center">
                                 <span className="text-[10px] text-muted-foreground">Est. Time</span>
                                 <span className="text-xs font-medium">{puzzle.estimated_solve_time} min</span>
                               </div>
                             )}
                             
                             {/* Average solve time */}
                             {puzzle?.avg_solve_time && Number(puzzle.avg_solve_time) > 0 && (
                               <div className="flex justify-between items-center">
                                 <span className="text-[10px] text-muted-foreground">Avg Time</span>
                                 <span className="text-xs font-medium">{Number(puzzle.avg_solve_time).toFixed(0)} min</span>
                               </div>
                             )}
                             
                             {/* Personal best time from progressData */}
                             {progressData?.bestTime && (
                               <div className="flex justify-between items-center">
                                 <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                   <Award className="h-2.5 w-2.5 text-amber-500" />Best
                                 </span>
                                 <span className="text-xs font-bold text-amber-600">
                                   {Math.floor(progressData.bestTime / 60)}:{(progressData.bestTime % 60).toString().padStart(2, '0')}
                                 </span>
                               </div>
                             )}
                           </div>
                         </div>

                         {/* User Statistics */}
                         <div className="space-y-2">
                           <div className="flex items-center gap-2 mb-2">
                             <TrendingUp className="h-4 w-4 text-green-600" />
                             <span className="text-xs font-semibold">Your Stats</span>
                           </div>
                           
                           <div className="space-y-1.5">
                             {/* Times played (from progressData) */}
                             {progressData?.timesPlayed && progressData.timesPlayed > 0 && (
                               <div className="flex justify-between items-center">
                                 <span className="text-[10px] text-muted-foreground">Attempts</span>
                                 <span className="text-xs font-medium">{progressData.timesPlayed}</span>
                               </div>
                             )}
                             
                             {/* Completion status */}
                             {progressData?.progress?.isCompleted && (
                               <div className="flex justify-between items-center">
                                 <span className="text-[10px] text-muted-foreground">Status</span>
                                 <Badge className="text-[9px] bg-green-600">✓ Done</Badge>
                               </div>
                             )}
                             
                             {/* Current accuracy from validation */}
                             <div className="flex justify-between items-center">
                               <span className="text-[10px] text-muted-foreground">Accuracy</span>
                               <span className={`text-xs font-bold ${accuracy >= 90 ? 'text-green-600' : accuracy >= 70 ? 'text-yellow-600' : 'text-orange-600'}`}>
                                 {accuracy.toFixed(0)}%
                               </span>
                             </div>
                           </div>
                         </div>

                       </div>
                     </div>
                   )}
                 </Card>
                 
                 {/* Full-width Puzzle */}
                 <Card 
                   className="flex flex-col" 
                   data-puzzle-card
                   style={{ minHeight: '400px' }}
                 >
                   <CardHeader className="flex-shrink-0 pb-2">
                     <CardTitle className="text-base">{puzzle.title}</CardTitle>
                     <CardDescription className="text-xs">{puzzle.description || "No description available."}</CardDescription>
                   </CardHeader>
                   <CardContent className="flex-1 flex flex-col" data-puzzle-content>
                     {isLoading ? (
                       <div className="flex items-center justify-center flex-1">
                         <div className="text-center">
                           <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600 mx-auto mb-4"></div>
                           <p className="text-muted-foreground text-sm">Loading puzzle...</p>
                         </div>
                       </div>
                     ) : (
                       <div className="flex-1 flex flex-col">
                         {/* Puzzle Content */}
                         <div className="flex-1 bg-gradient-to-br from-green-50/50 to-emerald-50/50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-lg p-3 relative">
                           {puzzleContent ? (
                             <PuzzleRenderer
                               puzzleId={puzzle.id}
                               content={puzzleContent}
                               onProgress={handleProgressUpdate}
                               onComplete={handlePuzzleCompleteFromRenderer}
                               className="h-full w-full"
                             />
                           ) : (
                             <div className="flex items-center justify-center h-full">
                               <div className="text-center">
                                 <div className="text-muted-foreground mb-4">
                                   <Puzzle className="h-10 w-10 mx-auto mb-2 text-green-600" />
                                   <p className="text-sm">Loading puzzle content...</p>
                                 </div>
                               </div>
                             </div>
                           )}
                         </div>

                         {/* Completion Message */}
                         {isCompleted && (
                           <motion.div
                             className="absolute inset-0 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-800 rounded-xl p-4 text-center flex items-center justify-center z-10"
                             initial={{ opacity: 0, scale: 0.9, y: 20 }}
                             animate={{ opacity: 1, scale: 1, y: 0 }}
                             transition={{ duration: 0.6, type: "spring" }}
                           >
                             <motion.div
                               initial={{ scale: 0 }}
                               animate={{ scale: 1 }}
                               transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                             >
                               <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                             </motion.div>
                             <h3 className="text-2xl font-bold text-green-800 dark:text-green-200 mb-2">
                               Congratulations!
                             </h3>
                             <p className="text-green-700 dark:text-green-300 mb-4">
                               You've completed "{puzzle.title}"!
                             </p>
                             <div className="flex gap-3 justify-center">
                               <Button size="sm" variant="outline" asChild>
                                 <Link href="/puzzles">
                                   More Puzzles
                                 </Link>
                               </Button>
                               <Button size="sm">
                                 <Share2 className="h-4 w-4 mr-2" />
                                 Share Achievement
                               </Button>
                             </div>
                           </motion.div>
                         )}
                       </div>
                     )}
                   </CardContent>
                 </Card>
                 
                 {/* Bottom Action Bar - Fixed */}
                 <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border p-4 z-40">
                   <div className="flex gap-2">
                     <Button 
                       variant="outline" 
                       size="sm" 
                       className="flex-1 h-10"
                       disabled={!canUseHint}
                       onClick={handleUseHint}
                     >
                       <HelpCircle className="h-4 w-4 mr-1" />
                       Hint
                     </Button>
                     <Button 
                       variant="outline" 
                       size="sm" 
                       className="flex-1 h-10"
                       onClick={forceSave}
                     >
                       <Save className="h-4 w-4 mr-1" />
                       Save
                     </Button>
                     <Button 
                       size="sm" 
                       className="flex-1 h-10"
                     >
                       <CheckCircle className="h-4 w-4 mr-1" />
                       Check
                     </Button>
                   </div>
                 </div>
               </div>

               {/* Desktop Layout */}
               <div 
                 className="hidden lg:flex gap-2"
               >
                 {/* Puzzle Info Sidebar */}
                 <div className="flex-shrink-0" style={{ width: `${sidebarWidth}px` }}>
                   <div className="space-y-2">
              {/* Enhanced Puzzle Info Card */}
              <Card className="border-green-200 dark:border-green-800">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Puzzle className="h-4 w-4 text-green-600" />
                    <span className="text-xs font-semibold">Puzzle Info</span>
                  </div>
                  
                  {/* Word counts - vertical stacked */}
                  {puzzleMetadata && puzzleMetadata.wordCount && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-muted-foreground">Total Words</span>
                        <span className="text-sm font-bold text-green-600">{puzzleMetadata.wordCount}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <ArrowRight className="h-2.5 w-2.5" />Across
                        </span>
                        <span className="text-xs font-medium">{puzzleMetadata.acrossCount}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <ArrowDown className="h-2.5 w-2.5" />Down
                        </span>
                        <span className="text-xs font-medium">{puzzleMetadata.downCount}</span>
                      </div>
                      <div className="h-px bg-green-200 dark:bg-green-800 my-1.5"></div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-muted-foreground">Grid Size</span>
                        <span className="text-xs font-medium">{puzzle?.grid_width || '?'}×{puzzle?.grid_height || '?'}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Enhanced Progress Card */}
              <Card className="border-green-200 dark:border-green-800">
                <CardContent className="p-3 space-y-2">
                  {/* Compact progress display */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium flex items-center gap-1">
                      <Target className="h-3 w-3 text-green-600" />
                      Progress
                    </span>
                    <span className="text-sm font-bold text-green-600">
                      {progressPercent}%
                    </span>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="w-full bg-green-100 dark:bg-green-900/30 rounded-full h-1.5">
                    <motion.div 
                      className="bg-green-500 h-full rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercent}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  
                  {/* Cells filled - compact */}
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Cells</span>
                    <span>{Object.keys(gridState).length}/{puzzleMetadata?.width * puzzleMetadata?.height}</span>
                  </div>
                  
                  {/* Show only CURRENT milestone badge */}
                  {progressPercent >= 75 ? (
                    <Badge className="text-[10px] w-full justify-center">
                      <Star className="h-2.5 w-2.5 mr-1" />75%
                    </Badge>
                  ) : progressPercent >= 50 ? (
                    <Badge className="text-[10px] w-full justify-center">
                      <Trophy className="h-2.5 w-2.5 mr-1" />50%
                    </Badge>
                  ) : progressPercent >= 25 ? (
                    <Badge className="text-[10px] w-full justify-center">
                      <Zap className="h-2.5 w-2.5 mr-1" />25%
                    </Badge>
                  ) : null}
                </CardContent>
              </Card>

              {/* Time & Statistics Card */}
              <Card className="border-green-200 dark:border-green-800">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-green-600" />
                    <span className="text-xs font-semibold">Time Stats</span>
                  </div>
                  
                  <div className="space-y-1.5">
                    {/* Estimated solve time */}
                    {puzzle?.estimated_solve_time && (
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-muted-foreground">Est. Time</span>
                        <span className="text-xs font-medium">{puzzle.estimated_solve_time} min</span>
                      </div>
                    )}
                    
                    {/* Average solve time */}
                    {puzzle?.avg_solve_time && Number(puzzle.avg_solve_time) > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-muted-foreground">Avg Time</span>
                        <span className="text-xs font-medium">{Number(puzzle.avg_solve_time).toFixed(0)} min</span>
                      </div>
                    )}
                    
                    {/* Personal best time from progressData */}
                    {progressData?.bestTime && (
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Award className="h-2.5 w-2.5 text-amber-500" />Best
                        </span>
                        <span className="text-xs font-bold text-amber-600">
                          {Math.floor(progressData.bestTime / 60)}:{(progressData.bestTime % 60).toString().padStart(2, '0')}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Smart Hint System */}
              <SmartHintSystem
                onUseHint={handleUseHint}
                canUseHint={canUseHint}
                hintsUsed={hintsUsed}
                hintLimit={hintLimit}
                isPremium={isPremium}
              />

              {/* User Statistics Card */}
              <Card className="border-green-200 dark:border-green-800">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="text-xs font-semibold">Your Stats</span>
                  </div>
                  
                  <div className="space-y-1.5">
                    {/* Times played (from progressData) */}
                    {progressData?.timesPlayed && progressData.timesPlayed > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-muted-foreground">Attempts</span>
                        <span className="text-xs font-medium">{progressData.timesPlayed}</span>
                      </div>
                    )}
                    
                    {/* Completion status */}
                    {progressData?.progress?.isCompleted && (
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-muted-foreground">Status</span>
                        <Badge className="text-[9px] bg-green-600">✓ Done</Badge>
                      </div>
                    )}
                    
                    {/* Current accuracy from validation */}
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-muted-foreground">Accuracy</span>
                      <span className={`text-xs font-bold ${accuracy >= 90 ? 'text-green-600' : accuracy >= 70 ? 'text-yellow-600' : 'text-orange-600'}`}>
                        {accuracy.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

            </div>
          </div>

          {/* Main Puzzle Area */}
          <div className="flex-1">
            <Card 
              className="flex flex-col" 
              data-puzzle-card
              style={{ minHeight: 'calc(100vh - 48px)' }}
            >
              <CardHeader className="flex-shrink-0 pb-2">
                <CardTitle className="text-base">{puzzle.title}</CardTitle>
                <CardDescription className="text-xs">{puzzle.description || "No description available."}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col" data-puzzle-content>
                {isLoading ? (
                  <div className="flex items-center justify-center flex-1">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
                      <p className="text-muted-foreground">Loading puzzle...</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col">
                    {/* Puzzle Content */}
                    <div className="flex-1 bg-gradient-to-br from-green-50/50 to-emerald-50/50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-lg p-4 relative">
                      {puzzleContent ? (
                        <PuzzleRenderer
                          puzzleId={puzzle.id}
                          content={puzzleContent}
                          onProgress={handleProgressUpdate}
                          onComplete={handlePuzzleCompleteFromRenderer}
                          className="h-full w-full"
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center">
                            <div className="text-muted-foreground mb-4">
                              <Puzzle className="h-12 w-12 mx-auto mb-2 text-green-600" />
                              <p>Loading puzzle content...</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>


                           {/* Completion Message */}
                           {isCompleted && (
                             <motion.div
                               className="absolute inset-0 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-800 rounded-xl p-6 text-center flex items-center justify-center z-10"
                               initial={{ opacity: 0, scale: 0.9, y: 20 }}
                               animate={{ opacity: 1, scale: 1, y: 0 }}
                               transition={{ duration: 0.6, type: "spring" }}
                             >
                               <motion.div
                                 initial={{ scale: 0 }}
                                 animate={{ scale: 1 }}
                                 transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                               >
                                 <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                               </motion.div>
                               <h3 className="text-2xl font-bold text-green-800 dark:text-green-200 mb-2">
                                 Congratulations!
                               </h3>
                               <p className="text-green-700 dark:text-green-300 mb-4">
                                 You've completed "{puzzle.title}"!
                               </p>
                               <div className="flex gap-3 justify-center">
                                 <Button size="sm" variant="outline" asChild>
                                   <Link href="/puzzles">
                                     More Puzzles
                                   </Link>
                                 </Button>
                                 <Button size="sm">
                                   <Share2 className="h-4 w-4 mr-2" />
                                   Share Achievement
                                 </Button>
                               </div>
                             </motion.div>
                           )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

             {/* Hint Modal */}
             {showHintModal && (
               <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                 <motion.div
                   className="bg-background rounded-lg p-6 max-w-md w-full"
                   initial={{ opacity: 0, scale: 0.9 }}
                   animate={{ opacity: 1, scale: 1 }}
                   transition={{ duration: 0.2 }}
                 >
                   <h3 className="text-lg font-bold mb-4">Hint</h3>
                   <p className="text-muted-foreground mb-6">
                     {hintMessage || "This is a sample hint for the puzzle. In the real implementation, hints would reveal specific letters or provide clues."}
                   </p>
                   <div className="flex gap-2 justify-end">
                     <Button variant="outline" onClick={() => setShowHintModal(false)}>
                       Close
                     </Button>
                     <Button onClick={() => setShowHintModal(false)}>
                       Got it!
                     </Button>
                   </div>
                 </motion.div>
               </div>
             )}

             {/* Completion Modal */}
             {showCompletionModal && puzzle && (
               <CompletionModal
                 isOpen={showCompletionModal}
                 onClose={() => setShowCompletionModal(false)}
                 puzzleTitle={puzzle.title}
                 completionTime={completionTime || 0}
                 score={score}
                 hintsUsed={hintsUsed}
                 difficulty={puzzle.difficulty || "medium"}
                 onPlayAgain={() => {
                   setShowCompletionModal(false);
                   // Reset puzzle state
                   setPuzzleStore(puzzle.id);
                   markStarted();
                 }}
                 onShare={() => {
                   // Share functionality
                   navigator.clipboard.writeText(`I just completed "${puzzle.title}" in ${Math.floor((completionTime || 0) / 60)}:${((completionTime || 0) % 60).toString().padStart(2, '0')} with a score of ${score}!`);
                 }}
               />
             )}

             {/* Hint Suggestion Toast */}
             {showHintSuggestion && (
               <motion.div
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: 20 }}
                 className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50"
               >
                 <Card className="border-yellow-300 bg-yellow-50 dark:bg-yellow-950/30">
                   <CardContent className="p-3 flex items-center gap-2">
                     <Lightbulb className="h-4 w-4 text-yellow-600" />
                     <span className="text-sm text-yellow-900 dark:text-yellow-100">
                       Having trouble? Try a hint!
                     </span>
                     <Button 
                       size="sm" 
                       variant="outline"
                       className="ml-2"
                       onClick={() => {
                         handleUseHint();
                         setShowHintSuggestion(false);
                       }}
                     >
                       Get Hint
                     </Button>
                   </CardContent>
                 </Card>
               </motion.div>
             )}
    </div>
  );
}

export default function PuzzlePage({ params }: PuzzlePageProps) {
  return (
    <LayoutProvider>
      <PuzzlePageContent params={params} />
    </LayoutProvider>
  );
}
