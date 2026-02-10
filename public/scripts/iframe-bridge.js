/**
 * Crossword Network - Iframe Bridge Script
 * 
 * This script runs inside puzzle iframes to handle messages from the parent.
 * Provides highlight, focus, and theme update functionality.
 * 
 * Usage: Include this script in puzzle HTML files.
 */

(function() {
  'use strict';

  console.log('[IframeBridge] Initializing...');

  // Configuration
  const CONFIG = {
    PROTOCOL_VERSION: '1.0.0',
    HIGHLIGHT_TRANSITION_MS: 200,
    ACROSS_COLOR: 'rgba(59, 130, 246, 0.32)',
    DOWN_COLOR: 'rgba(168, 85, 247, 0.32)',
  };

  // State
  let highlightedCells = new Set();
  let currentDirection = null;
  let channelId = null;
  let domReady = false;
  let readySent = false;

  function maybeSendReady() {
    if (!domReady || readySent || !channelId) return;
    readySent = true;
    sendReadyMessage();
    interceptWordSelection();
  }

  /**
   * Get cell key for tracking
   */
  function getCellKey(row, col) {
    return `${row},${col}`;
  }

  /**
   * Find cell element in the DOM
   */
  function findCellElement(row, col) {
    // EclipseCrossword uses cell ids like: c{xxx}{yyy} where x=col, y=row.
    // Clue extraction stores cells as {row, col} using WordY/WordX from ECW,
    // so this mapping should be consistent.
    function padNumber(n) {
      if (n < 10) return `00${n}`;
      if (n < 100) return `0${n}`;
      return `${n}`;
    }

    const ecwId = `c${padNumber(col)}${padNumber(row)}`;
    const ecwEl = document.getElementById(ecwId);
    if (ecwEl) return ecwEl;

    // Try common selectors used by crossword generators
    const selectors = [
      `[data-row="${row}"][data-col="${col}"]`,
      `[data-cell="${row}-${col}"]`,
      `#cell-${row}-${col}`,
      `.cell[data-position="${row},${col}"]`,
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) return element;
    }

    // Fallback: search through all cells
    const cells = document.querySelectorAll('[data-row], .cell');
    for (const cell of cells) {
      const cellRow = cell.dataset.row || cell.getAttribute('data-row');
      const cellCol = cell.dataset.col || cell.getAttribute('data-col');
      
      if (cellRow === String(row) && cellCol === String(col)) {
        return cell;
      }
    }

    return null;
  }

  /**
   * Apply highlight to a cell
   */
  function highlightCell(element, direction) {
    const color = direction === 'across' 
      ? CONFIG.ACROSS_COLOR 
      : CONFIG.DOWN_COLOR;

    // Store original styles
    if (!element.dataset.originalBg) {
      element.dataset.originalBg = element.style.backgroundColor || '';
      element.dataset.originalTransition = element.style.transition || '';
    }

    // Apply highlight
    element.style.transition = `background-color ${CONFIG.HIGHLIGHT_TRANSITION_MS}ms ease-in-out`;
    element.style.backgroundColor = color;
    element.dataset.highlighted = direction;
  }

  /**
   * Remove highlight from a cell
   */
  function unhighlightCell(element) {
    const originalBg = element.dataset.originalBg || '';
    const originalTransition = element.dataset.originalTransition || '';

    element.style.transition = `background-color ${CONFIG.HIGHLIGHT_TRANSITION_MS}ms ease-in-out`;
    element.style.backgroundColor = originalBg;
    
    delete element.dataset.highlighted;
    
    // Clean up after transition
    setTimeout(() => {
      element.style.transition = originalTransition;
      delete element.dataset.originalBg;
      delete element.dataset.originalTransition;
    }, CONFIG.HIGHLIGHT_TRANSITION_MS);
  }

  /**
   * Handle HIGHLIGHT_CELLS message
   */
  function handleHighlightCells(cells, direction) {
    requestAnimationFrame(() => {
      // Clear previous highlights if direction changed
      if (currentDirection !== direction) {
        clearHighlights();
      }

      currentDirection = direction;
      const newHighlightedCells = new Set();

      // Apply highlights
      cells.forEach((cell) => {
        const key = getCellKey(cell.row, cell.col);
        newHighlightedCells.add(key);

        const element = findCellElement(cell.row, cell.col);
        if (element) {
          highlightCell(element, direction);
        }
      });

      // Remove highlights from cells no longer in the set
      highlightedCells.forEach((key) => {
        if (!newHighlightedCells.has(key)) {
          const [row, col] = key.split(',').map(Number);
          const element = findCellElement(row, col);
          if (element) {
            unhighlightCell(element);
          }
        }
      });

      highlightedCells = newHighlightedCells;
    });
  }

  /**
   * Handle CLEAR_HIGHLIGHT message
   */
  function clearHighlights() {
    requestAnimationFrame(() => {
      highlightedCells.forEach((key) => {
        const [row, col] = key.split(',').map(Number);
        const element = findCellElement(row, col);
        if (element) {
          unhighlightCell(element);
        }
      });

      highlightedCells.clear();
      currentDirection = null;
    });
  }

  /**
   * Get cells for a clue from WordX/WordY (fallback when parent has no cells).
   */
  function getCellsForClueFromWordData(clueNumber, direction) {
    try {
      if (typeof window.WordX === 'undefined' || typeof window.WordY === 'undefined' || typeof window.LastHorizontalWord === 'undefined') {
        return [];
      }
      const wordCount = Math.min(window.WordX.length, window.WordY.length);
      const lastHoriz = Number(window.LastHorizontalWord);
      const starts = [];
      for (let i = 0; i < wordCount; i++) starts.push({ x: window.WordX[i], y: window.WordY[i], i });
      starts.sort((a, b) => (a.y - b.y) || (a.x - b.x));
      const keyToNumber = new Map();
      const numbers = new Array(wordCount);
      let nextNumber = 1;
      for (const s of starts) {
        const key = `${s.x},${s.y}`;
        if (!keyToNumber.has(key)) keyToNumber.set(key, nextNumber++);
        numbers[s.i] = keyToNumber.get(key);
      }
      const wantAcross = direction === 'across';
      let targetIndex = -1;
      for (let i = 0; i < wordCount; i++) {
        const isAcross = i <= lastHoriz;
        if (isAcross !== wantAcross) continue;
        if (numbers[i] === clueNumber) { targetIndex = i; break; }
      }
      if (targetIndex < 0) return [];
      const x0 = window.WordX[targetIndex];
      const y0 = window.WordY[targetIndex];
      const cells = [];
      function pad(n) { if (n < 10) return '00' + n; if (n < 100) return '0' + n; return '' + n; }
      if (wantAcross) {
        for (let c = x0; ; c++) {
          const el = document.getElementById('c' + pad(c) + pad(y0));
          if (!el) break;
          cells.push({ row: y0, col: c });
        }
      } else {
        for (let r = y0; ; r++) {
          const el = document.getElementById('c' + pad(x0) + pad(r));
          if (!el) break;
          cells.push({ row: r, col: x0 });
        }
      }
      return cells;
    } catch { return []; }
  }

  /**
   * Handle FOCUS_CLUE message
   */
  function handleFocusClue(clueNumber, direction) {
    console.log('[IframeBridge] Focusing clue:', clueNumber, direction);

    // EclipseCrossword: map clueNumber + direction => wordIndex, then click first cell to select it.
    try {
      const hasECW =
        typeof window.WordX !== 'undefined' &&
        typeof window.WordY !== 'undefined' &&
        typeof window.WordLength !== 'undefined' &&
        typeof window.LastHorizontalWord !== 'undefined';

      if (hasECW && Array.isArray(window.WordX) && Array.isArray(window.WordY)) {
        const wordCount = Math.min(window.WordX.length, window.WordY.length);
        const lastHoriz = Number(window.LastHorizontalWord);

        // Assign clue numbers by sorted unique start positions (same scheme as server extraction).
        const starts = [];
        for (let i = 0; i < wordCount; i++) {
          starts.push({ x: window.WordX[i], y: window.WordY[i], i });
        }
        starts.sort((a, b) => (a.y - b.y) || (a.x - b.x));

        const keyToNumber = new Map();
        const numbers = new Array(wordCount);
        let nextNumber = 1;
        for (const s of starts) {
          const key = `${s.x},${s.y}`;
          if (!keyToNumber.has(key)) {
            keyToNumber.set(key, nextNumber++);
          }
          numbers[s.i] = keyToNumber.get(key);
        }

        const wantAcross = direction === 'across';
        let targetIndex = -1;
        for (let i = 0; i < wordCount; i++) {
          const isAcross = i <= lastHoriz;
          if (isAcross !== wantAcross) continue;
          if (numbers[i] === clueNumber) {
            targetIndex = i;
            break;
          }
        }

        if (targetIndex >= 0) {
          const fallbackCells = getCellsForClueFromWordData(clueNumber, direction);
          if (fallbackCells.length > 0) {
            handleHighlightCells(fallbackCells, direction);
          }
          const x0 = window.WordX[targetIndex];
          const y0 = window.WordY[targetIndex];
          const first = findCellElement(y0, x0);
          if (first) {
            first.scrollIntoView({ behavior: 'smooth', block: 'center' });
            first.focus?.();
            first.click?.();
            return;
          }
        }
      }
    } catch (e) {
      console.warn('[IframeBridge] ECW focus failed, falling back:', e);
    }

    const firstCell = document.querySelector(`[data-clue-${direction}="${clueNumber}"]`);
    if (firstCell) {
      firstCell.focus?.();
      firstCell.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    }
  }

  /**
   * Send message to parent
   */
  function sendToParent(type, payload) {
    if (!channelId) {
      console.warn('[IframeBridge] No channel ID, cannot send message');
      return;
    }

    const message = {
      type,
      payload,
      channelId,
      version: CONFIG.PROTOCOL_VERSION,
      timestamp: Date.now(),
    };

    window.parent.postMessage(message, '*');
  }

  /**
   * Handle incoming messages from parent
   */
  function handleMessage(event) {
    const message = event.data;

    // Validate message structure
    if (!message?.type || !message?.channelId || !message?.version) {
      return; // Ignore non-bridge messages
    }

    // Set channel ID from first message
    if (!channelId) {
      channelId = message.channelId;
      console.log('[IframeBridge] Channel ID set:', channelId);
      // If DOM is already ready, send the ready handshake now.
      maybeSendReady();
    }

    // Validate channel ID
    if (message.channelId !== channelId) {
      return; // Ignore messages from other channels
    }

    // Validate protocol version
    if (message.version !== CONFIG.PROTOCOL_VERSION) {
      console.error('[IframeBridge] Protocol version mismatch:', message.version);
      return;
    }

    // Handle message types
    switch (message.type) {
      case 'HIGHLIGHT_CELLS':
        handleHighlightCells(message.payload.cells, message.payload.direction);
        break;

      case 'CLEAR_HIGHLIGHT':
        clearHighlights();
        break;

      case 'FOCUS_CLUE':
        handleFocusClue(message.payload.clueNumber, message.payload.direction);
        break;

      case 'SET_THEME':
        // Theme update handled by CSS injection manager
        console.log('[IframeBridge] Theme update received');
        break;

      case 'INJECT_CSS':
        // CSS injection handled by CSS injection manager
        console.log('[IframeBridge] CSS injection received');
        break;

      default:
        console.log('[IframeBridge] Unknown message type:', message.type);
    }
  }

  /**
   * Intercept word selection in EclipseCrossword
   */
  function interceptWordSelection() {
    // Override the SelectThisWord function if it exists
    const originalSelectThisWord = window.SelectThisWord;
    
    if (typeof originalSelectThisWord === 'function') {
      window.SelectThisWord = function(event) {
        // Call original function to get word info
        originalSelectThisWord.call(this, event);
        
        // Extract word information from the DOM
        // EclipseCrossword populates these elements
        const wordLabel = document.getElementById('wordlabel');
        const wordInfo = document.getElementById('wordinfo');
        const wordClue = document.getElementById('wordclue');
        const wordEntry = document.getElementById('wordentry');
        
        if (wordLabel && wordInfo && wordClue) {
          // Parse word info (e.g., "Across, 7 letters.")
          const infoText = wordInfo.textContent || '';
          const direction = infoText.toLowerCase().includes('across') ? 'across' : 'down';
          const lengthMatch = infoText.match(/(\d+)\s+letter/);
          const length = lengthMatch ? parseInt(lengthMatch[1]) : 0;
          
          // Get clue number from label (first number in label)
          const labelText = wordLabel.textContent || '';
          const numberMatch = labelText.match(/^(\d+)/);
          const number = numberMatch ? parseInt(numberMatch[1]) : 0;
          
          // Send word selection to parent
          sendToParent('word_selected', {
            wordInfo: {
              number,
              direction,
              clue: wordClue.textContent || '',
              length,
              currentValue: wordEntry?.value || '',
            },
          });
        }
      };
      
      console.log('[IframeBridge] Word selection intercept installed');
    }
  }

  /**
   * Initialize the bridge
   */
  function initialize() {
    // Listen for messages from parent
    window.addEventListener('message', handleMessage);

    // Send IFRAME_READY after we have a channelId from parent and DOM is loaded.
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        domReady = true;
        maybeSendReady();
      });
    } else {
      domReady = true;
      maybeSendReady();
    }

    console.log('[IframeBridge] Initialized');
  }

  /**
   * Send IFRAME_READY message
   */
  function sendReadyMessage() {
    // Get puzzle dimensions if available
    const grid = document.querySelector('.crossword-grid, [data-grid]');
    const dimensions = {
      rows: parseInt(grid?.dataset?.rows || '15'),
      cols: parseInt(grid?.dataset?.cols || '15'),
      padding: 0,
      border: 1,
    };

    sendToParent('IFRAME_READY', {
      puzzleId: document.body.dataset.puzzleId || 'unknown',
      dimensions,
    });

    console.log('[IframeBridge] Sent IFRAME_READY');
  }

  // Start the bridge
  initialize();

  // Export for external access if needed
  window.CrosswordBridge = {
    highlightCells: handleHighlightCells,
    clearHighlights: clearHighlights,
    focusClue: handleFocusClue,
  };
})();
