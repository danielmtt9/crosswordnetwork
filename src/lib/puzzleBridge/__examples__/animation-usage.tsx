/**
 * Example: Using the Animation System
 * 
 * This file demonstrates how to integrate the animation system with
 * puzzle validation and user interactions.
 */

import { useRef, useEffect } from 'react';
import {
  useIframeBridge,
  useAnimationManager,
  useValidationManager,
  createChannelId,
  createPuzzleId,
} from '@/lib/puzzleBridge';
import type { ValidationResult } from '@/lib/puzzleBridge';

export function PuzzleWithAnimations() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const channelId = createChannelId('puzzle-channel');
  const puzzleId = 123;

  // Setup iframe bridge
  const bridge = useIframeBridge({
    iframeRef,
    channelId,
    debug: true,
  });

  // Setup animation manager
  const animations = useAnimationManager({
    channelId,
    iframeRef,
    enabled: true,
  });

  // Setup validation manager with animations
  const validationManager = useValidationManager(puzzleId, {
    animationManager: animations,
    enableAnimations: true,
    onValidated: (results: ValidationResult[]) => {
      console.log('Validation results:', results);
      
      // Check if puzzle is complete
      const allCorrect = results.every(r => r.isCorrect);
      if (allCorrect) {
        // Trigger celebration animation
        animations.triggerCelebrate('.ecw-crosswordarea', {
          duration: 500,
        });
      }
    },
  });

  // Handle cell input
  const handleCellInput = (row: number, col: number, letter: string) => {
    // Queue validation (with debounce)
    validationManager.queueValidation({ row, col, letter });
  };

  // Handle hint button click
  const handleHint = (row: number, col: number) => {
    // Trigger hint animation
    animations.triggerHint([{ row, col }], {
      duration: 800,
    });
    
    // Reveal the letter after animation
    setTimeout(() => {
      bridge.send({
        type: 'REVEAL_LETTER',
        payload: { cell: { row, col } },
      });
    }, 400);
  };

  // Handle word check
  const handleCheckWord = async (cells: Array<{ row: number; col: number; letter: string }>) => {
    try {
      const results = await validationManager.validateImmediate(cells);
      
      // Animations are automatically triggered by the validation manager
      console.log('Word check results:', results);
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  // Example: Trigger glow on active cell
  const handleCellFocus = (row: number, col: number) => {
    animations.triggerGlow(`[data-row="${row}"][data-col="${col}"]`, {
      remove: false, // Keep glowing until unfocused
    });
  };

  // Example: Remove glow on blur
  const handleCellBlur = (row: number, col: number) => {
    // Manually remove the glow class
    animations.triggerCustom(
      'fadeOut',
      `[data-row="${row}"][data-col="${col}"]`,
      { duration: 200 }
    );
  };

  return (
    <div className="puzzle-container">
      <div className="puzzle-controls">
        <button onClick={() => handleHint(0, 0)}>
          Show Hint
        </button>
        <button onClick={() => handleCheckWord([
          { row: 0, col: 0, letter: 'A' },
          { row: 0, col: 1, letter: 'B' },
        ])}>
          Check Word
        </button>
      </div>
      
      <iframe
        ref={iframeRef}
        src="/puzzles/eclipse/123.html"
        className="puzzle-iframe"
        title="Crossword Puzzle"
      />
    </div>
  );
}

/**
 * Example: Manual Animation Triggers
 */
export function ManualAnimationExample() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const channelId = createChannelId('manual-animations');

  const animations = useAnimationManager({
    channelId,
    iframeRef,
  });

  return (
    <div>
      <button onClick={() => 
        animations.triggerCorrect([{ row: 0, col: 0 }])
      }>
        Trigger Correct Animation
      </button>
      
      <button onClick={() => 
        animations.triggerIncorrect([{ row: 1, col: 1 }])
      }>
        Trigger Incorrect Animation
      </button>
      
      <button onClick={() => 
        animations.triggerCelebrate('.ecw-box')
      }>
        Celebrate!
      </button>
      
      <button onClick={() => 
        animations.triggerFadeIn('.ecw-answerbox')
      }>
        Fade In Clue Box
      </button>

      <iframe
        ref={iframeRef}
        src="/puzzles/eclipse/123.html"
        className="puzzle-iframe"
      />
    </div>
  );
}

/**
 * Example: Animation with Accessibility
 */
export function AccessibleAnimations() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const channelId = createChannelId('accessible-animations');

  // Check user preference for reduced motion
  const prefersReducedMotion = typeof window !== 'undefined' 
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

  const animations = useAnimationManager({
    channelId,
    iframeRef,
    enabled: !prefersReducedMotion, // Disable if user prefers reduced motion
  });

  useEffect(() => {
    if (prefersReducedMotion) {
      console.log('User prefers reduced motion - animations disabled');
    }
  }, [prefersReducedMotion]);

  return (
    <div>
      {prefersReducedMotion && (
        <div className="accessibility-notice">
          Animations are disabled based on your system preferences
        </div>
      )}
      
      <iframe
        ref={iframeRef}
        src="/puzzles/eclipse/123.html"
        className="puzzle-iframe"
      />
    </div>
  );
}
