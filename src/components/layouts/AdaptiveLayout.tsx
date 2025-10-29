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
import { DesktopMultiplayerLayout } from "@/components/layouts/DesktopMultiplayerLayout";
import { DesktopSingleLayout } from "@/components/layouts/DesktopSingleLayout";
import { MobileMultiplayerLayout } from "@/components/layouts/MobileMultiplayerLayout";
import { MobileSingleLayout } from "@/components/layouts/MobileSingleLayout";

export interface AdaptiveLayoutProps {
  // Core data
  puzzleUrl: string;
  acrossClues: Clue[];
  downClues: Clue[];

  // Selection
  selectedClue?: { direction: "across" | "down"; number: number };
  onClueClick?: (direction: "across" | "down", number: number) => void;

  // Hints
  onRevealLetter?: () => void;
  onRevealWord?: () => void;
  onCheckPuzzle?: () => void;

  // Progress & Save
  progressCompleted: number;
  progressTotal: number;
  saveStatus: SaveStatus;
  lastSavedAt?: Date;

  // Multiplayer context
  participantCount?: number;
  roomCode?: string | null;

  // Optional right/bottom panels
  multiplayerPanel?: React.ReactNode;
  chatPanel?: React.ReactNode;
  playersPanel?: React.ReactNode;
}

export function AdaptiveLayout(props: AdaptiveLayoutProps) {
  const deviceType = useDeviceType();
  const gameMode = useGameMode({
    participantCount: props.participantCount ?? 0,
    roomCode: props.roomCode ?? null,
  });

  const layoutType: LayoutType = useMemo(
    () => getLayoutType(deviceType, gameMode),
    [deviceType, gameMode]
  );

  const sharedPuzzleArea = (
    <div className="flex w-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <ProgressBar
          completed={props.progressCompleted}
          total={props.progressTotal}
        />
        <div className="flex items-center gap-2">
          <SaveIndicator status={props.saveStatus} lastSavedAt={props.lastSavedAt} />
          <HintsMenu
            onRevealLetter={props.onRevealLetter}
            onRevealWord={props.onRevealWord}
            onCheckPuzzle={props.onCheckPuzzle}
          />
        </div>
      </div>
      <PuzzleArea puzzleUrl={props.puzzleUrl} />
    </div>
  );

  const cluesPanel = (
    <CluesPanel
      acrossClues={props.acrossClues}
      downClues={props.downClues}
      selectedClue={props.selectedClue}
      onClueClick={props.onClueClick}
    />
  );

  const acrossOnly = (
    <CluesPanel
      acrossClues={props.acrossClues}
      downClues={[]}
      selectedClue={props.selectedClue}
      onClueClick={props.onClueClick}
    />
  );

  const downOnly = (
    <CluesPanel
      acrossClues={[]}
      downClues={props.downClues}
      selectedClue={props.selectedClue}
      onClueClick={props.onClueClick}
    />
  );

  const variants = {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
  };

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
        {layoutType === "desktop-multiplayer" && (
          <DesktopMultiplayerLayout
            cluesPanel={cluesPanel}
            puzzleArea={sharedPuzzleArea}
            multiplayerPanel={props.multiplayerPanel ?? <div />}
          />
        )}

        {layoutType === "desktop-single" && (
          <DesktopSingleLayout cluesPanel={cluesPanel} puzzleArea={sharedPuzzleArea} />
        )}

        {layoutType === "mobile-multiplayer" && (
          <MobileMultiplayerLayout
            cluesPanel={cluesPanel}
            puzzleArea={sharedPuzzleArea}
            chatPanel={props.chatPanel ?? <div />}
            playersPanel={props.playersPanel ?? <div />}
          />
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
