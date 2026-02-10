"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDeviceType } from "@/hooks/useDeviceType";
import { useGameMode } from "@/hooks/useGameMode";
import { getLayoutType, LayoutType } from "@/lib/layoutDetection";
import { CluesPanel, Clue } from "@/components/puzzle/CluesPanel";
import { PuzzleArea } from "@/components/puzzle/PuzzleArea";
import { HintsMenu } from "@/components/puzzle/HintsMenu";
import { SaveIndicator, SaveStatus } from "@/components/puzzle/SaveIndicator";
import { ProgressBar } from "@/components/puzzle/ProgressBar";
import { DesktopSingleLayout } from "@/components/layouts/DesktopSingleLayout";
import { MobileSingleLayout } from "@/components/layouts/MobileSingleLayout";

export interface AdaptiveLayoutProps {
  // Component nodes (new API - takes precedence)
  puzzleArea?: React.ReactNode;
  cluesPanel?: React.ReactNode;
  hintsMenu?: React.ReactNode;
  progressBar?: React.ReactNode;
  saveIndicator?: React.ReactNode;
  participantsList?: React.ReactNode;
  
  // Device/Layout detection
  participantCount?: number;
  device?: 'desktop' | 'mobile' | 'tablet';
  
  // Legacy props (for backward compatibility)
  puzzleUrl?: string;
  acrossClues?: Clue[];
  downClues?: Clue[];
  selectedClue?: { direction: "across" | "down"; number: number };
  revealedClues?: Set<string>;
  onClueClick?: (direction: "across" | "down", number: number) => void;
  onClueHover?: (clue: (Clue & { direction: 'across' | 'down' }) | null) => void;
  onNavigateClue?: (direction: 'next' | 'prev') => void;
  canNavigateNext?: boolean;
  canNavigatePrev?: boolean;
  onRevealLetter?: () => void;
  onRevealWord?: () => void;
  onCheckPuzzle?: () => void;
  progressCompleted?: number;
  progressTotal?: number;
  saveStatus?: SaveStatus;
  lastSavedAt?: Date;
  roomCode?: string | null;
}

export function AdaptiveLayout(props: AdaptiveLayoutProps) {
  const deviceType = props.device || useDeviceType();
  const gameMode = useGameMode({
    participantCount: props.participantCount ?? 0,
    roomCode: props.roomCode ?? null,
  });

  const layoutType: LayoutType = useMemo(
    () => getLayoutType(deviceType, gameMode),
    [deviceType, gameMode]
  );

  // Use new component node API if provided, otherwise fallback to legacy
  const sharedPuzzleArea = props.puzzleArea || (
    <div className="flex w-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <ProgressBar
          completed={props.progressCompleted ?? 0}
          total={props.progressTotal ?? 0}
        />
        <div className="flex items-center gap-2">
          <SaveIndicator status={props.saveStatus ?? 'idle'} lastSavedAt={props.lastSavedAt} />
          <HintsMenu
            onRevealLetter={props.onRevealLetter}
            onRevealWord={props.onRevealWord}
            onCheckPuzzle={props.onCheckPuzzle}
          />
        </div>
      </div>
      <PuzzleArea puzzleUrl={props.puzzleUrl ?? ''} />
    </div>
  );

  // Debug: Log what props we're receiving
  console.log('[AdaptiveLayout] Props:', {
    hasCluesPanel: !!props.cluesPanel,
    acrossCluesLength: props.acrossClues?.length || 0,
    downCluesLength: props.downClues?.length || 0,
    acrossClues: props.acrossClues,
    downClues: props.downClues,
  });
  
  const handleClueClick = useMemo(() => {
    if (!props.onClueClick) return undefined;
    return (clue: Clue & { direction: "across" | "down" }) =>
      props.onClueClick?.(clue.direction, clue.number);
  }, [props.onClueClick]);

  const cluesPanel = props.cluesPanel || useMemo(() => {
    console.log('[AdaptiveLayout] Creating fallback CluesPanel with:', {
      acrossLength: props.acrossClues?.length || 0,
      downLength: props.downClues?.length || 0,
    });
    return (
      <CluesPanel
        acrossClues={props.acrossClues ?? []}
        downClues={props.downClues ?? []}
        selectedClue={props.selectedClue}
        revealedClues={props.revealedClues}
        onClueClick={handleClueClick}
        onClueHover={props.onClueHover}
        onNavigateClue={props.onNavigateClue}
        canNavigateNext={props.canNavigateNext}
        canNavigatePrev={props.canNavigatePrev}
      />
    );
  }, [props.acrossClues, props.downClues, props.selectedClue, props.revealedClues, props.onNavigateClue, props.canNavigateNext, props.canNavigatePrev, handleClueClick, props.onClueHover]);

  const acrossOnly = useMemo(() => (
    <CluesPanel
      acrossClues={props.acrossClues ?? []}
      downClues={[]}
      selectedClue={props.selectedClue}
      revealedClues={props.revealedClues}
      onClueClick={handleClueClick}
      onClueHover={props.onClueHover}
      onNavigateClue={props.onNavigateClue}
      canNavigateNext={props.canNavigateNext}
      canNavigatePrev={props.canNavigatePrev}
    />
  ), [props.acrossClues, props.selectedClue, props.revealedClues, props.onNavigateClue, props.canNavigateNext, props.canNavigatePrev, handleClueClick, props.onClueHover]);

  const downOnly = useMemo(() => (
    <CluesPanel
      acrossClues={[]}
      downClues={props.downClues ?? []}
      selectedClue={props.selectedClue}
      revealedClues={props.revealedClues}
      onClueClick={handleClueClick}
      onClueHover={props.onClueHover}
      onNavigateClue={props.onNavigateClue}
      canNavigateNext={props.canNavigateNext}
      canNavigatePrev={props.canNavigatePrev}
    />
  ), [props.downClues, props.selectedClue, props.revealedClues, props.onNavigateClue, props.canNavigateNext, props.canNavigatePrev, handleClueClick, props.onClueHover]);

  const variants = {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
  };

  console.log('[AdaptiveLayout] Using layout type:', layoutType);
  
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={layoutType}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.15, ease: "easeOut" }}
        variants={variants}
        data-testid={`adaptive-${layoutType}`}
      >
        {layoutType === "desktop-single" && (
          <DesktopSingleLayout cluesPanel={cluesPanel} puzzleArea={sharedPuzzleArea} />
        )}

        {layoutType === "mobile-single" && (
          <MobileSingleLayout
            acrossClues={acrossOnly}
            downClues={downOnly}
            puzzleArea={sharedPuzzleArea}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}
