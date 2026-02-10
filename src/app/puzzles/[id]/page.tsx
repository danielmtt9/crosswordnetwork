"use client";

import { useState, useEffect, use, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Save,
  Share2,
  Loader2,
  X,
  HelpCircle,
  Sun,
  Moon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { usePuzzleStore } from "@/lib/stores/puzzleStore";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useIframeBridge, useClueHighlight, useAnimationManager, usePrefersReducedMotion, createPuzzleId, getNextClue, getPreviousClue } from "@/lib/puzzleBridge";
import { AdaptiveLayout } from "@/components/layouts/AdaptiveLayout";
import { SaveIndicator } from "@/components/SaveIndicator";
import { PuzzleArea } from "@/components/puzzle/PuzzleArea";
import { PuzzleControls } from "@/components/puzzle/PuzzleControls";
import { ExternalAnswerBox, type SelectedWord } from "@/components/puzzle/ExternalAnswerBox";
import { NativeCrosswordRenderer } from "@/components/puzzle/native/NativeCrosswordRenderer";
import { useExternalInputBridge } from "@/hooks/useExternalInputBridge";
import { ClueProvider, useClues } from "@/contexts/ClueProvider";
import { useRouter, useSearchParams } from "next/navigation";
import { useDeviceType } from "@/hooks/useDeviceType";
import { CompletionModal } from "@/components/CompletionModal";
import { KeyboardShortcutsModal } from "@/components/puzzle/KeyboardShortcutsModal";
import { useToast, ToastContainer } from "@/components/Toast";

interface PuzzleData {
  id: number;
  title: string;
  description: string | null;
  filename: string;
  file_path: string;
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
  hintsUsed: number;
}

const difficultyColors = {
  easy: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  hard: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
};

interface PuzzlePageProps {
  params: {
    id: string;
  };
}

export default function PuzzlePage({ params }: PuzzlePageProps) {
  const resolvedParams = use(params);
  const puzzleId = parseInt(resolvedParams.id, 10);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  return (
    <ClueProvider puzzleId={puzzleId}>
      <PuzzlePageContent params={params} iframeRef={iframeRef} />
    </ClueProvider>
  );
}

function PuzzlePageContent({ 
  params, 
  iframeRef 
}: { 
  params: { id: string }; 
  iframeRef: React.RefObject<HTMLIFrameElement>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const device = useDeviceType();
  const headerRef = useRef<HTMLElement | null>(null);
  const puzzleIdLocal = parseInt(resolvedParams.id, 10);
  const freshStartRequested =
    searchParams.get('fresh') === '1' || searchParams.get('fresh') === 'true';
  const freshStartHandledRef = useRef(false);

  const [puzzle, setPuzzle] = useState<PuzzleData | null>(null);
  const [puzzleContent, setPuzzleContent] = useState<string | null>(null);
  const [progressData, setProgressData] = useState<ProgressResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progressPercent, setProgressPercent] = useState(0);
  const [iframeHeight, setIframeHeight] = useState(600);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const toast = useToast();
  const { theme, setTheme } = useTheme();
  const [selectedClue, setSelectedClue] = useState<{ direction: 'across' | 'down'; number: number } | null>(null);
  const selectedClueRef = useRef<{ direction: 'across' | 'down'; number: number } | null>(null);
  const lastClueClickAtRef = useRef<number>(0);
  const [externalWord, setExternalWord] = useState<SelectedWord | null>(null);
  const [externalValue, setExternalValue] = useState('');
  const [externalInputReady, setExternalInputReady] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [revealedClues, setRevealedClues] = useState<Set<string>>(new Set());
  const [storageScope, setStorageScope] = useState<string>('guest');
  const [canUseNativeRenderer, setCanUseNativeRenderer] = useState(false);
  const localProgressKey = useMemo(
    () => `cw:progress:${puzzleIdLocal}:${storageScope}`,
    [puzzleIdLocal, storageScope]
  );
  const [pendingLoadState, setPendingLoadState] = useState<Record<string, string> | null>(null);
  const initialStateAppliedRef = useRef(false);
  const lastMilestoneRef = useRef(0);
  const pendingGetStateTimerRef = useRef<number | null>(null);

  useEffect(() => {
    // Scope local persistence by user when signed in, so progress is per-user on shared devices.
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/auth/session');
        if (!res.ok) return;
        const session = await res.json();
        const userId = session?.user?.id;
        const role = session?.user?.role;
        if (!cancelled && typeof userId === 'string' && userId.length > 0) {
          // If we already wrote guest progress for this puzzle before we knew the user,
          // migrate it into the user-scoped key so "Continue" stays per-user.
          try {
            const guestKey = `cw:progress:${puzzleIdLocal}:guest`;
            const userKey = `cw:progress:${puzzleIdLocal}:${userId}`;
            const guestRaw = window.localStorage.getItem(guestKey);
            if (guestRaw && !window.localStorage.getItem(userKey)) {
              window.localStorage.setItem(userKey, guestRaw);
              window.localStorage.removeItem(guestKey);
            }
          } catch {
            // ignore
          }
          setStorageScope(userId);
        }
        // Native renderer is hard-disabled while stabilizing the iframe UX.
        // (Keep the code path so we can re-enable later behind a flag.)
        if (!cancelled) {
          setCanUseNativeRenderer(false);
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Expose the puzzle header height as a CSS variable so mobile layouts can size to viewport cleanly.
  useEffect(() => {
    if (device !== 'mobile' && device !== 'tablet') return;
    const el = headerRef.current;
    if (!el) return;

    const apply = () => {
      const h = Math.max(48, Math.floor(el.getBoundingClientRect().height));
      document.documentElement.style.setProperty('--puzzle-header-h', `${h}px`);
    };

    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    window.addEventListener('resize', apply);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', apply);
    };
  }, [device]);

  const loadLocalProgress = useCallback((): { gridState: Record<string, string>; hintsUsed: number; startedAt: string } | null => {
    try {
      const raw = window.localStorage.getItem(localProgressKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      if ((parsed as any).puzzleId !== puzzleIdLocal) return null;
      if ((parsed as any).isCompleted === true) return null;
      const gridState = (parsed as any).gridState;
      if (!gridState || typeof gridState !== 'object') return null;
      const startedAtRaw = String((parsed as any).startedAt || (parsed as any).savedAt || '');
      const startedAtMs = Date.parse(startedAtRaw);
      // Enforce 7-day expiration for local fallback.
      if (!Number.isNaN(startedAtMs) && Date.now() - startedAtMs > 7 * 24 * 60 * 60 * 1000) {
        try {
          window.localStorage.removeItem(localProgressKey);
        } catch {
          // ignore
        }
        return null;
      }
      return {
        gridState: gridState as Record<string, string>,
        hintsUsed: typeof (parsed as any).hintsUsed === 'number' ? (parsed as any).hintsUsed : 0,
        startedAt: startedAtRaw || new Date().toISOString(),
      };
    } catch {
      return null;
    }
  }, [localProgressKey, puzzleIdLocal]);

  const saveLocalProgress = useCallback(
    (grid: Record<string, string>, hints: number, meta?: { title?: string; difficulty?: string | null; category?: string | null }) => {
      try {
        // Preserve the original startedAt if it exists.
        let startedAt = new Date().toISOString();
        try {
          const existingRaw = window.localStorage.getItem(localProgressKey);
          if (existingRaw) {
            const existing = JSON.parse(existingRaw);
            if (existing?.startedAt) startedAt = String(existing.startedAt);
            else if (existing?.savedAt) startedAt = String(existing.savedAt);
          }
        } catch {
          // ignore parse errors
        }

        window.localStorage.setItem(
          localProgressKey,
          JSON.stringify({
            puzzleId: puzzleIdLocal,
            gridState: grid,
            hintsUsed: hints,
            startedAt,
            isCompleted: false,
            puzzleTitle: meta?.title,
            puzzleDifficulty: meta?.difficulty ?? null,
            puzzleCategory: meta?.category ?? null,
            savedAt: new Date().toISOString(),
          })
        );
        window.localStorage.setItem(`cw:lastProgressPuzzleId:${storageScope}`, String(puzzleIdLocal));
        window.localStorage.setItem(`cw:lastProgressSavedAt:${storageScope}`, new Date().toISOString());
      } catch {
        // Best-effort fallback (private mode / quota / etc.)
      }
    },
    [localProgressKey, puzzleIdLocal, storageScope]
  );

  useEffect(() => {
    selectedClueRef.current = selectedClue;
  }, [selectedClue]);
  
  // Get clues from ClueProvider (database-first with iframe fallback)
  const { clues, isLoading: cluesLoading, error: cluesError } = useClues();
  
  // Memoize clue arrays with stable empty array references
  const acrossClues = useMemo(() => clues?.across || [], [clues]);
  const downClues = useMemo(() => clues?.down || [], [clues]);

  // Iframe bridge for clue highlighting
  const bridge = useIframeBridge({
    iframeRef,
    debug: process.env.NODE_ENV === 'development',
    onReady: () => {
      console.log('[PuzzlePage] Iframe bridge ready');
    },
  });

  // Bootstrap the bridge handshake: the iframe bridge script needs to see at least
  // one message with a channelId before it can reply with IFRAME_READY.
  // Important: the bridge script is injected after iframe load, so a single early
  // message can be lost. We retry until the bridge becomes ready.
  const bridgeBootstrappedRef = useRef(false);
  useEffect(() => {
    if (bridge.isReady) {
      bridgeBootstrappedRef.current = true;
      return;
    }

    let cancelled = false;
    let attempts = 0;

    const tick = () => {
      if (cancelled) return;
      if (bridge.isReady) {
        bridgeBootstrappedRef.current = true;
        return;
      }
      if (!iframeRef.current?.contentWindow) {
        // Iframe not mounted yet, keep waiting a bit.
        if (attempts++ < 60) setTimeout(tick, 100);
        return;
      }

      bridge.send({
        type: 'SET_PUZZLE_ID',
        payload: { puzzleId: createPuzzleId(puzzleIdLocal) },
      });

      // Retry for a few seconds. Once injected, the iframe bridge will receive
      // one of these SET_PUZZLE_ID messages, set channelId, then respond with IFRAME_READY.
      if (attempts++ < 40) {
        setTimeout(tick, 250);
      }
    };

    tick();
    return () => {
      cancelled = true;
    };
  }, [bridge, bridge.isReady, iframeRef, puzzleIdLocal]);

  // Clue highlight system
  const { handleClueHover, handleClueClick } = useClueHighlight({
    bridge,
    acrossClues,
    downClues,
    debug: process.env.NODE_ENV === 'development',
  });

  // Animation manager for completion celebration
  const prefersReducedMotion = usePrefersReducedMotion();
  const animations = useAnimationManager({
    channelId: bridge.channelId,
    iframeRef,
    enabled: !prefersReducedMotion && bridge.isReady,
  });

  // Zustand store
  const {
    gridState,
    hintsUsed,
    startTime,
    completionTime,
    isDirty,
    isCompleted,
    setPuzzle: setPuzzleStore,
    setGridState,
    incrementHints,
    setHintsUsed,
    markStarted,
    markSaved,
    markDirty,
    markCompleted,
  } = usePuzzleStore();

  const sendCommand = useCallback(
    (message: Record<string, unknown>) => {
      if (!iframeRef.current?.contentWindow) return;
      const payload = {
        source: 'parent',
        puzzleId: puzzle?.id ?? puzzleIdLocal,
        ...message,
      };
      iframeRef.current.contentWindow.postMessage(payload, '*');
    },
    [iframeRef, puzzle?.id, puzzleIdLocal]
  );

  const pullIframeGridState = useCallback(
    async (timeoutMs: number = 1200): Promise<Record<string, string> | null> => {
      if (!iframeRef.current?.contentWindow) return null;

      return await new Promise((resolve) => {
        let done = false;
        const startedAt = Date.now();

        const cleanup = () => {
          if (done) return;
          done = true;
          window.removeEventListener('message', onMessage);
          resolve(null);
        };

        const onMessage = (event: MessageEvent) => {
          if (event.source !== iframeRef.current?.contentWindow) return;
          const msg = event.data;
          if (!msg || msg.type !== 'progress') return;
          const gs = msg.data?.gridState;
          if (!gs || typeof gs !== 'object') return;

          done = true;
          window.removeEventListener('message', onMessage);
          resolve(gs as Record<string, string>);
        };

        window.addEventListener('message', onMessage);
        sendCommand({ type: 'GET_STATE' });

        const tick = () => {
          if (done) return;
          if (Date.now() - startedAt >= timeoutMs) {
            cleanup();
            return;
          }
          setTimeout(tick, 50);
        };
        tick();
      });
    },
    [iframeRef, sendCommand]
  );

  const externalBridge = useExternalInputBridge({
    iframeRef,
    enabled: true,
    integratedGridInput: true,
    onReady: () => {
      setExternalInputReady(true);
    },
    onWordSelected: (word) => {
      setExternalWord(word);
      setExternalValue(word.currentFill || '');
      setSelectedClue({ number: word.number, direction: word.direction });
    },
    onGridUpdated: () => {
      markDirty();
      // External input updates don't always emit a `progress` message with gridState.
      // Pull state from the iframe shortly after input so saving persists what the
      // user actually typed (no "blank after refresh" races).
      if (pendingGetStateTimerRef.current) {
        window.clearTimeout(pendingGetStateTimerRef.current);
      }
      pendingGetStateTimerRef.current = window.setTimeout(() => {
        sendCommand({ type: 'GET_STATE' });
      }, 50);
    },
  });

  // Auto-save functionality with new API
  const { saveStatus, lastSaved, error: saveError, forceSave } = useAutoSave({
    saveFunction: async ({ force } = {}) => {
      if (!puzzle) return;
      if (!isDirty && !force) return;

      // Ensure we persist what is actually rendered in the iframe even if the
      // React store is a tick behind (common with external iframe input).
      const iframeGridState = await pullIframeGridState();
      const gridToSave = iframeGridState ?? gridState;
      
      const response = await fetch(`/api/puzzles/${puzzle.id}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gridState: gridToSave,
          completedCells: Object.keys(gridToSave).length,
          hintsUsed,
          timeElapsed: startTime ? Math.floor((Date.now() - startTime) / 1000) : 0,
          timestamp: new Date().toISOString(),
          isAutoSave: !force,
        }),
      });

      if (response.status === 401) {
        // Guest mode: still persist progress locally.
        saveLocalProgress(gridToSave, hintsUsed, {
          title: puzzle?.title,
          difficulty: puzzle?.difficulty ?? null,
          category: puzzle?.category ?? null,
        });
        markSaved();
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save progress');
      }

      // Keep a local backup even when server save succeeds.
      saveLocalProgress(gridToSave, hintsUsed, {
        title: puzzle?.title,
        difficulty: puzzle?.difficulty ?? null,
        category: puzzle?.category ?? null,
      });
      markSaved();
    },
    isDirty,
    // Faster + more reliable cadence for iframe-based input.
    debounceDelay: 500,
    timeBasedInterval: 10000,
    onSaveSuccess: (ctx) => {
      if (ctx?.force) toast.success('Progress saved');
    },
    onSaveError: (error, ctx) => {
      console.error('[PuzzlePage] Save failed:', error);
      if (ctx?.force) {
        toast.error('Failed to save progress');
      }
      // For background auto-saves, avoid spamming toasts; SaveIndicator handles status.
    },
  });

  // Flush progress when the tab is hidden or the page is being unloaded.
  useEffect(() => {
    if (!puzzle) return;

    const flush = () => {
      // Best-effort: kick a save. Even if the network request is cancelled on unload,
      // guest mode still writes localStorage immediately.
      void forceSave();
    };

    const onVis = () => {
      if (document.visibilityState === 'hidden') flush();
    };

    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [puzzle, forceSave]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) return;
      const message = event.data;
      if (!message?.type) return;

      switch (message.type) {
        case 'progress': {
          const progress = message.data?.progress || 0;
          setProgressPercent(progress);

          if (message.data?.gridState) {
            const incoming = message.data.gridState as Record<string, string>;
            const current = gridState as Record<string, string>;
            const same =
              incoming === current ||
              (incoming &&
                current &&
                typeof incoming === 'object' &&
                typeof current === 'object' &&
                Object.keys(incoming).length === Object.keys(current).length &&
                Object.keys(incoming).every((k) => incoming[k] === current[k]));

            if (!same) {
              setGridState(incoming);
              markDirty();
            }
          }
          // Start timer when first progress arrives if not already started
          if (startTime === null) {
            markStarted();
          }
          // Progress milestone celebrations at 25%, 50%, 75%
          const milestones = [25, 50, 75];
          const crossed = milestones.find((m) => progress >= m && lastMilestoneRef.current < m);
          if (crossed != null) {
            lastMilestoneRef.current = crossed;
            toast.success(`${crossed}% complete!`);
            if (!prefersReducedMotion && bridge.isReady) {
              animations.triggerCelebrate('.ecw-box', { duration: 500 });
            }
          }
          break;
        }

        case 'dimensions':
          if (message.data?.totalHeight) {
            setIframeHeight(message.data.totalHeight);
          }
          break;

        case 'complete':
          markCompleted(
            message.data?.completionTime || 0,
            message.data?.score || 0
          );
          animations.triggerCelebrate('.ecw-box');
          setShowCompletionModal(true);
          // Mark completed for signed-in users (server) and remove local fallback progress
          // so it no longer appears in "Continue Puzzle".
          try {
            window.localStorage.removeItem(localProgressKey);
            const lastKey = `cw:lastProgressPuzzleId:${storageScope}`;
            if (window.localStorage.getItem(lastKey) === String(puzzleIdLocal)) {
              window.localStorage.removeItem(lastKey);
            }
          } catch {
            // ignore
          }
          void (async () => {
            try {
              const pid = puzzle?.id ?? puzzleIdLocal;
              await fetch(`/api/puzzles/${pid}/progress`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  completedCells: gridState,
                  completionTimeSeconds: message.data?.completionTime || 0,
                  hintsUsed,
                  score: message.data?.score || 0,
                  isCompleted: true,
                  isAutoSave: false,
                }),
              });
            } catch {
              // ignore completion persistence failures
            }
          })();
          break;

        case 'hint_used':
          if (message.data?.hintsUsed !== undefined) {
            setHintsUsed(message.data.hintsUsed);
          } else {
            // No hintsUsed count provided; ignore here to avoid double-counting.
          }
          markDirty();
          break;

        case 'word_revealed':
          if (message.data?.clueNumber != null && message.data?.direction) {
            const key = `${message.data.direction}-${message.data.clueNumber}`;
            setRevealedClues((prev) => new Set(prev).add(key));
          }
          break;

        case 'wordlist':
          console.log('[PuzzlePage] Wordlist message received (handled by ClueProvider)');
          break;

        case 'STATE_LOADED':
          // Sent by `public/scripts/eclipsecrossword-bridge.js` after applying LOAD_STATE.
          // Used to stop retry loop for applying persisted progress.
          initialStateAppliedRef.current = true;
          break;

        // Sent by `public/scripts/iframe-bridge.js` (our typed bridge).
        // Keep this to sync clue list selection when user clicks in the grid.
        case 'word_selected':
          if (message.payload?.wordInfo) {
            const { number, direction } = message.payload.wordInfo;
            if (typeof number === 'number' && (direction === 'across' || direction === 'down')) {
              // If a user just clicked a clue, keep the selection pinned briefly to avoid
              // flicker due to ECW intersection toggles from synthetic focus clicks.
              const lastClickAt = lastClueClickAtRef.current;
              const current = selectedClueRef.current;
              if (
                lastClickAt &&
                Date.now() - lastClickAt < 600 &&
                current &&
                (current.number !== number || current.direction !== direction)
              ) {
                break;
              }
              setSelectedClue({ number, direction });
            }
          }
          break;

        case 'EC_WORD_SELECTED':
          if (message.data?.word) {
            const { number, direction } = message.data.word;
            const lastClickAt = lastClueClickAtRef.current;
            const current = selectedClueRef.current;
            if (
              lastClickAt &&
              Date.now() - lastClickAt < 600 &&
              current &&
              (current.number !== number || current.direction !== direction)
            ) {
              break;
            }
            setSelectedClue({ number, direction });
          }
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [iframeRef, setGridState, gridState, markDirty, markCompleted, setHintsUsed, setIframeHeight, incrementHints, startTime, markStarted, animations, prefersReducedMotion, bridge.isReady, toast]);

  // Keep the store in sync with the iframe even if ECW doesn't emit progress on every keystroke.
  useEffect(() => {
    if (!puzzle) return;
    const id = window.setInterval(() => {
      if (!iframeRef.current?.contentWindow) return;
      sendCommand({ type: 'GET_STATE' });
    }, 5000);
    return () => window.clearInterval(id);
  }, [puzzle, sendCommand, iframeRef]);

  // Apply persisted progress into the ECW iframe.
  useEffect(() => {
    if (!puzzle) return;
    if (initialStateAppliedRef.current) return;
    const state = pendingLoadState;
    if (!state) return;

    let cancelled = false;
    let waitAttempts = 0;
    let sendAttempts = 0;

    const tick = () => {
      if (cancelled) return;
      if (initialStateAppliedRef.current) return;

      // Iframe/bridge may not be ready yet. Keep retrying briefly.
      if (!iframeRef.current?.contentWindow) {
        if (waitAttempts++ < 60) {
          setTimeout(tick, 200);
        }
        return;
      }

      sendAttempts++;
      sendCommand({ type: 'LOAD_STATE', data: { gridState: state } });
      // Ask iframe to emit a progress message so the store matches rendered cells.
      sendCommand({ type: 'GET_STATE' });

      // Keep retrying for a while; ECW generates the grid dynamically and may not have
      // created all cell elements the first time we send LOAD_STATE.
      if (!initialStateAppliedRef.current && sendAttempts < 30) {
        setTimeout(tick, 300);
      }
    };

    setTimeout(tick, 150);
    return () => {
      cancelled = true;
    };
  }, [puzzle, pendingLoadState, sendCommand, iframeRef]);

  // Keyboard shortcut: ? to show shortcuts modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement;
        const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
        if (!isInput) {
          e.preventDefault();
          setShowShortcutsModal(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch puzzle data
  useEffect(() => {
    const fetchPuzzle = async () => {
      const fetchWithTimeout = async (input: RequestInfo | URL, init: RequestInit | undefined, timeoutMs: number) => {
        const controller = new AbortController();
        const id = window.setTimeout(() => controller.abort(), timeoutMs);
        try {
          return await fetch(input, { ...init, signal: controller.signal });
        } finally {
          window.clearTimeout(id);
        }
      };

      try {
        setIsLoading(true);
        const response = await fetchWithTimeout(`/api/puzzles/${resolvedParams.id}`, undefined, 15000);
        if (!response.ok) {
          setError(response.status === 404 ? "Puzzle not found" : "Failed to fetch puzzle");
          return;
        }

        const puzzleData: PuzzleData = await response.json();
        
        // Multiplayer check removed for single-player MVP
        
        setPuzzle(puzzleData);
        setPuzzleStore(puzzleData.id);
        setPendingLoadState(null);
        initialStateAppliedRef.current = false;
        setProgressPercent(0);
        setSelectedClue(null);
        setRevealedClues(new Set());

        const applyLocalIfAvailable = () => {
          const local = loadLocalProgress();
          if (!local) return false;
          setHintsUsed(local.hintsUsed);
          setGridState(local.gridState);
          setPendingLoadState(local.gridState);
          initialStateAppliedRef.current = false;
          return true;
        };

        const clearExistingProgressForFreshStart = async () => {
          // Best-effort: wipe any existing progress (server + local) so Start Puzzle is always a clean slate.
          // Important: we only do this once per mount, and then strip the query param from the URL so refresh
          // doesn't keep wiping progress.
          if (!freshStartRequested || freshStartHandledRef.current) return;
          freshStartHandledRef.current = true;

          try {
            // Clear local keys for both guest and the current scope. Also try the actual userId if available.
            const scopes = new Set<string>(['guest', storageScope]);
            try {
              const sessionRes = await fetch('/api/auth/session');
              if (sessionRes.ok) {
                const session = await sessionRes.json();
                const userId = session?.user?.id;
                if (typeof userId === 'string' && userId.length > 0) scopes.add(userId);
              }
            } catch {
              // ignore
            }

            for (const scope of scopes) {
              try {
                const k = `cw:progress:${puzzleIdLocal}:${scope}`;
                window.localStorage.removeItem(k);

                const lastIdKey = `cw:lastProgressPuzzleId:${scope}`;
                const lastSavedKey = `cw:lastProgressSavedAt:${scope}`;
                if (window.localStorage.getItem(lastIdKey) === String(puzzleIdLocal)) {
                  window.localStorage.removeItem(lastIdKey);
                  window.localStorage.removeItem(lastSavedKey);
                }
              } catch {
                // ignore
              }
            }
          } catch {
            // ignore
          }

          try {
            // Signed-in users: remove server progress too (this deletes both completed and in-progress rows).
            await fetch(`/api/puzzles/in-progress/${puzzleIdLocal}`, { method: 'DELETE' });
          } catch {
            // ignore
          }

          // Reset local UI state right away.
          setGridState({});
          setHintsUsed(0);
          setPendingLoadState(null);
          initialStateAppliedRef.current = false;

          // Strip the `fresh` param so a browser refresh doesn't wipe progress again.
          try {
            window.history.replaceState(null, '', `/puzzles/${puzzleIdLocal}`);
          } catch {
            // ignore
          }
        };

        await clearExistingProgressForFreshStart();

        const persistStartIfMissing = async (canWriteServer: boolean) => {
          // Ensure "Continue" shows immediately on first open, even before the user types.
          try {
            if (!window.localStorage.getItem(localProgressKey)) {
              saveLocalProgress(
                {},
                0,
                { title: puzzleData?.title, difficulty: puzzleData?.difficulty ?? null, category: puzzleData?.category ?? null }
              );
            }
          } catch {
            // ignore
          }

          if (!canWriteServer) return;
          try {
            await fetch(`/api/puzzles/${puzzleData.id}/save`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                gridState: {},
                completedCells: 0,
                hintsUsed: 0,
                timeElapsed: 0,
                timestamp: new Date().toISOString(),
                isAutoSave: true,
              }),
            });
          } catch {
            // ignore
          }
        };

        // Load content + progress with timeouts so the UI never gets stuck on "Loading puzzle...".
        const [contentResult, progressResult] = await Promise.allSettled([
          fetchWithTimeout(`/api/puzzles/${resolvedParams.id}/content`, undefined, 20000),
          fetchWithTimeout(`/api/puzzles/${resolvedParams.id}/progress`, undefined, 15000),
        ]);

        if (contentResult.status === 'fulfilled') {
          try {
            if (contentResult.value.ok) {
              const contentData = await contentResult.value.json();
              setPuzzleContent(contentData.content);
            }
          } catch {
            // ignore content parse errors
          }
        }

        if (progressResult.status === 'fulfilled') {
          if (progressResult.value.ok) {
            const progressResponseData: ProgressResponse = await progressResult.value.json();
            setProgressData(progressResponseData);

            // Update store with existing progress (server).
            if (progressResponseData.progress && !freshStartRequested) {
              const progress = progressResponseData.progress;
              setHintsUsed(progress.hintsUsed);

              if (progress.completedCells) {
                try {
                  const cells = JSON.parse(progress.completedCells);
                  setGridState(cells);
                  setPendingLoadState(cells);
                  initialStateAppliedRef.current = false;
                } catch (e) {
                  console.error('Failed to parse completed cells:', e);
                }
              }

              if (progress.isCompleted) {
                markCompleted(progress.completionTimeSeconds || 0, progress.score || 0);
              }
            } else {
              // Even if server has no progress (or auth/session is flaky), prefer local fallback.
              if (!applyLocalIfAvailable()) {
                markStarted();
                await persistStartIfMissing(true);
              }
            }
          } else {
            // Not signed in or server error: fall back to localStorage persistence.
            if (!applyLocalIfAvailable()) {
              markStarted();
              await persistStartIfMissing(false);
            }
          }
        } else {
          // Timed out/error: fall back to localStorage persistence.
          if (!applyLocalIfAvailable()) {
            markStarted();
            await persistStartIfMissing(false);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch puzzle");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPuzzle();
  }, [resolvedParams.id, setPuzzleStore, setHintsUsed, setGridState, markStarted, markCompleted, router, freshStartRequested, storageScope, localProgressKey, loadLocalProgress, saveLocalProgress]);

  // Clue extraction is now handled by ClueProvider
  // No manual extraction needed - clues load automatically from DB with iframe fallback

  // Handle check puzzle
  const handleCheckPuzzle = () => {
    sendCommand({ type: 'check_puzzle' });
  };

  // Clue navigation (next/previous)
  const handleNavigateClue = useCallback((dir: 'next' | 'prev') => {
    if (!selectedClue) return;
    const clues = selectedClue.direction === 'across' ? acrossClues : downClues;
    const finder = dir === 'next' ? getNextClue : getPreviousClue;
    const next = finder(clues, selectedClue.number, false);
    if (!next) return;
    const clueWithDir = { ...next, direction: selectedClue.direction };
    setSelectedClue({ direction: selectedClue.direction, number: next.number });
    if (bridge.isReady) {
      handleClueClick(clueWithDir);
    }
    if (Array.isArray((next as { cells?: unknown[] }).cells) && (next as { cells: Array<{ row: number; col: number }> }).cells.length > 0) {
      sendCommand({
        type: 'HIGHLIGHT_CELLS',
        data: { cells: (next as { cells: Array<{ row: number; col: number }> }).cells, direction: selectedClue.direction },
      });
    }
    if (!bridge.isReady) {
      sendCommand({ type: 'FOCUS_CLUE', data: { clueNumber: next.number, direction: selectedClue.direction } });
    }
  }, [selectedClue, acrossClues, downClues, handleClueClick, bridge.isReady, sendCommand]);

  const canNavigateNext = selectedClue
    ? getNextClue(selectedClue.direction === 'across' ? acrossClues : downClues, selectedClue.number, false) != null
    : false;
  const canNavigatePrev = selectedClue
    ? getPreviousClue(selectedClue.direction === 'across' ? acrossClues : downClues, selectedClue.number, false) != null
    : false;

  // Handle hint usage
  const handleUseHint = async (hintType: 'letter' | 'word' | 'definition') => {
    try {
      if (!selectedClue) {
        toast.error('Select a clue to use a hint.');
        return;
      }

      const formatRetryAfter = (seconds: number): string => {
        const mins = Math.max(1, Math.ceil(seconds / 60));
        if (mins < 60) return `${mins}m`;
        const hours = Math.ceil(mins / 60);
        return `${hours}h`;
      };

      const enforceHintLimit = async (kind: 'letter' | 'word'): Promise<boolean> => {
        try {
          const res = await fetch('/api/hints/use', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hintType: kind }),
          });

          if (res.status === 429) {
            const data = await res.json().catch(() => ({} as any));
            const retryAfterSeconds =
              typeof data?.retryAfterSeconds === 'number'
                ? data.retryAfterSeconds
                : Number(res.headers.get('Retry-After') || 0) || 60;
            const label = kind === 'word' ? 'Reveal Word' : 'Reveal Letter';
            toast.error(`${label} limit reached. Try again in ${formatRetryAfter(retryAfterSeconds)}.`);
            return false;
          }

          if (!res.ok) {
            toast.error('Hints are temporarily unavailable. Please try again.');
            return false;
          }

          return true;
        } catch (e) {
          console.error('[PuzzlePage] Hint limiter error:', e);
          toast.error('Hints are temporarily unavailable. Please try again.');
          return false;
        }
      };

      const clue = selectedClue.direction === 'across'
        ? acrossClues.find((c) => c.number === selectedClue.number)
        : downClues.find((c) => c.number === selectedClue.number);
      const cells = (clue as { cells?: Array<{ row: number; col: number }> })?.cells;
      if (hintType === 'letter') {
        const ok = await enforceHintLimit('letter');
        if (!ok) return;
        sendCommand({ type: 'reveal_letter', direction: selectedClue.direction, number: selectedClue.number });
        if (cells && cells.length > 0) {
          animations.triggerHint(cells.slice(0, 1), { duration: 600 });
        }
        incrementHints();
        markDirty();
        sendCommand({ type: 'GET_STATE' });
      } else if (hintType === 'word') {
        const ok = await enforceHintLimit('word');
        if (!ok) return;
        sendCommand({ type: 'reveal_word', direction: selectedClue.direction, number: selectedClue.number });
        if (cells && cells.length > 0) {
          animations.triggerHint(cells, { duration: 800 });
        }
        incrementHints();
        markDirty();
        sendCommand({ type: 'GET_STATE' });
      }
      await forceSave();
    } catch (err) {
      console.error('[PuzzlePage] Hint error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to use hint');
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50/30 via-background to-orange-50/30 dark:from-amber-950/10 dark:via-background dark:to-orange-950/10 flex items-center justify-center">
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
      <div className="min-h-screen bg-gradient-to-br from-amber-50/30 via-background to-orange-50/30 dark:from-amber-950/10 dark:via-background dark:to-orange-950/10 flex items-center justify-center">
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


  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-amber-50/30 via-background to-orange-50/30 dark:from-amber-950/10 dark:via-background dark:to-orange-950/10">
      {/* Header */}
      <header
        ref={(node) => {
          headerRef.current = node;
        }}
        className="border-b bg-card/50 backdrop-blur-xl flex-shrink-0 z-50 h-14 sticky top-0"
      >
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
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                aria-label="Toggle theme"
                className="h-8 w-8"
                data-testid="theme-toggle"
              >
                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowShortcutsModal(true)}
                aria-label="Keyboard shortcuts"
                className="h-8 w-8"
                data-testid="keyboard-shortcuts-btn"
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
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

      {/* Puzzle description (optional) */}
      {puzzle.description && puzzle.description.trim().length > 0 && (
        <div className="border-b bg-card/30 backdrop-blur-sm">
          <div className="container mx-auto max-w-7xl px-4 py-3">
            <div className="flex flex-col gap-1">
              <div className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                About this puzzle
              </div>
              <p
                data-testid="puzzle-description"
                className="text-sm leading-relaxed text-muted-foreground line-clamp-2 md:line-clamp-3"
              >
                {puzzle.description}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content with AdaptiveLayout */}
      <div
        className={
          device === 'mobile' || device === 'tablet'
            ? 'flex-1 w-full px-0 py-0'
            : 'flex-1 container mx-auto max-w-7xl px-4 py-4'
        }
      >
        <AdaptiveLayout
          participantCount={1} // Single-player
          device={device}
          
          // Puzzle area
          puzzleArea={
            <div className="flex flex-col gap-3 w-full">
              {/* Unified controls toolbar */}
              <PuzzleControls
                completionPercent={progressPercent}
                wordsCompleted={Object.keys(gridState).length}
                totalWords={acrossClues.length + downClues.length}
                startTime={startTime}
                completionTimeSeconds={isCompleted ? completionTime ?? undefined : undefined}
                isCompleted={isCompleted}
                saveStatus={saveStatus}
                lastSaved={lastSaved}
                saveError={saveError}
                showHints={true}
                onRevealLetter={() => handleUseHint('letter')}
                onRevealWord={() => handleUseHint('word')}
                onCheckPuzzle={handleCheckPuzzle}
                device={device}
              />
              
              {/* Responsive puzzle grid */}
              {canUseNativeRenderer ? (
                <NativeCrosswordRenderer puzzleId={puzzle.id} />
              ) : (
                <PuzzleArea
                  puzzleUrl={puzzle.file_path}
                  puzzleContent={puzzleContent || ''}
                  height={iframeHeight}
                  iframeRef={iframeRef}
                  scaleToFit={true}
                  targetWidthPercent={90}
                />
              )}

              {!externalBridge.integratedGridInput && (
                <ExternalAnswerBox
                  selectedWord={externalWord}
                  value={externalValue}
                  disabled={!externalInputReady}
                  onChange={(value) => {
                    setExternalValue(value);
                    externalBridge.applyInput(value);
                  }}
                  onBackspace={() => {
                    externalBridge.backspace();
                  }}
                  onSubmit={() => {
                    // Word submission handled as the user types
                  }}
                  onMoveCaret={(delta) => {
                    externalBridge.moveCaret(delta);
                  }}
                  onClear={() => {
                    setExternalValue('');
                    externalBridge.clearWord();
                  }}
                  onCancel={() => {
                    setExternalWord(null);
                    setExternalValue('');
                  }}
                />
              )}
            </div>
          }
          
          // Pass clue arrays directly instead of JSX
          acrossClues={acrossClues}
          downClues={downClues}
          selectedClue={selectedClue || undefined}
          revealedClues={revealedClues}
          onClueHover={handleClueHover}
          onNavigateClue={handleNavigateClue}
          canNavigateNext={canNavigateNext}
          canNavigatePrev={canNavigatePrev}
          onClueClick={(direction, number) => {
            const clue = direction === 'across' 
              ? acrossClues.find(c => c.number === number)
              : downClues.find(c => c.number === number);
            if (clue) {
              lastClueClickAtRef.current = Date.now();
              setSelectedClue({ direction, number });
              // Only use the typed bridge when it's already ready.
              // If we call it while not ready, messages queue and may fire later,
              // causing a second synthetic click inside the iframe which can
              // toggle ECW word selection at intersections (looks like flicker).
              if (bridge.isReady) {
                handleClueClick({ ...clue, direction });
              }

              // Always send a fallback highlight/focus to the ECW bridge.
              // This makes click highlight resilient even if the typed iframe bridge
              // handshake is delayed or blocked.
              if (Array.isArray((clue as any).cells) && (clue as any).cells.length > 0) {
                sendCommand({
                  type: 'HIGHLIGHT_CELLS',
                  data: { cells: (clue as any).cells, direction },
                });
              }
              // Only send fallback focus if typed bridge isn't ready, to avoid double-click toggles.
              if (!bridge.isReady) {
                sendCommand({
                  type: 'FOCUS_CLUE',
                  data: { clueNumber: number, direction },
                });
              }
            }
          }}
          
          // Remove these - now integrated in PuzzleControls
          // hintsMenu, progressBar, saveIndicator are in the custom puzzleArea above
        />
      </div>

      {/* Completion Modal */}
      {showCompletionModal && puzzle && (
        <CompletionModal
          isOpen={showCompletionModal}
          onClose={() => setShowCompletionModal(false)}
          puzzleTitle={puzzle.title}
          completionTime={startTime ? Math.floor((Date.now() - startTime) / 1000) : 0}
          score={1000} // Score calculation would come from store
          hintsUsed={hintsUsed}
          difficulty={puzzle.difficulty || "medium"}
          onPlayAgain={() => {
            setShowCompletionModal(false);
            // Reset puzzle state
            setPuzzleStore(puzzle.id);
            markStarted();
            window.location.reload();
          }}
          onShare={() => {
            const time = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
            const minutes = Math.floor(time / 60);
            const seconds = time % 60;
            navigator.clipboard.writeText(
              `I just completed "${puzzle.title}" in ${minutes}:${seconds.toString().padStart(2, '0')}!`
            );
            toast.success('Share text copied to clipboard!');
          }}
        />
      )}

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toast.toasts} onDismiss={toast.dismissToast} />
    </div>
  );
}
