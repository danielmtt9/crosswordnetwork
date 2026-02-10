"use client";

import React from 'react';
import { renderPuzzle, isContentSupported } from '@/lib/puzzleRenderers';
import { PuzzleRenderProps } from '@/lib/puzzleRenderers/types';
import DOMPurify from 'dompurify';

interface PuzzleRendererProps extends PuzzleRenderProps {
  className?: string;
}

/**
 * Main Puzzle Renderer Component
 * 
 * Automatically detects puzzle format and renders using the appropriate renderer.
 * Falls back to basic HTML rendering for unsupported formats.
 */
export function PuzzleRenderer({ 
  puzzleId, 
  content, 
  onProgress, 
  onComplete, 
  isMultiplayer = false,
  onCellUpdate,
  onCursorMove,
  className = "" 
}: PuzzleRendererProps) {
  const isSupported = isContentSupported(content);
  const renderedPuzzle = renderPuzzle({
    puzzleId,
    content,
    onProgress,
    onComplete,
    isMultiplayer,
    onCellUpdate,
    onCursorMove
  });
  
  return (
    <div className={`puzzle-renderer ${className}`}>
      {renderedPuzzle || (
        <div className="puzzle-fallback">
          {!isSupported && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                ⚠️ Puzzle format not supported, displaying as HTML
              </p>
            </div>
          )}
          <div 
            className="puzzle-content"
            dangerouslySetInnerHTML={{ 
              __html: DOMPurify.sanitize(content, {
                ALLOWED_TAGS: ['div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'tr', 'td', 'th', 'input', 'button', 'form', 'label', 'br', 'hr', 'strong', 'em', 'b', 'i', 'u', 'ul', 'ol', 'li', 'a', 'img', 'script', 'style'],
                ALLOWED_ATTR: ['class', 'id', 'style', 'type', 'value', 'placeholder', 'disabled', 'readonly', 'href', 'src', 'alt', 'width', 'height', 'colspan', 'rowspan', 'onclick', 'onkeypress']
              })
            }}
          />
        </div>
      )}
    </div>
  );
}
