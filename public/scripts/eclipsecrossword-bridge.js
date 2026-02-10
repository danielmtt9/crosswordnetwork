/**
 * EclipseCrossword Communication Bridge
 * 
 * This script is injected into EclipseCrossword HTML files to enable
 * communication with the parent application via postMessage.
 */

(function() {
  'use strict';
  
  // Store original functions to hook into
  let originalCheckClick = null;
  let originalOKClick = null;
  let originalCheatClick = null;
  let originalSelectThisWord = null;
  
  // External input (ExternalAnswerBox or integrated grid overlay)
  let externalInputEnabled = false;
  let externalInputSourceId = null;
  let integratedGridInputEnabled = false;
  let overlayInputEl = null;
  let overlayContainerEl = null;
  const bridgeId = 'bridge-' + Date.now();

  // Track state
  let puzzleState = {
    gridState: {},
    currentWord: -1,
    completedWords: [],
    hintsUsed: 0,
    startTime: Date.now(),
    totalCells: 0,
    filledCells: 0
  };

  // Lightweight highlight handling (fallback when the typed iframe bridge isn't ready).
  // Stronger opacity (0.32) and border for clearer visibility across themes.
  const highlightState = {
    highlighted: new Set(),
    direction: null,
    colors: {
      across: 'rgba(217, 119, 6, 0.32)',
      down: 'rgba(234, 88, 12, 0.32)',
    },
  };

  function clearHighlights() {
    try {
      highlightState.highlighted.forEach((cellId) => {
        const el = document.getElementById(cellId);
        if (!el) return;
        const origBg = el.dataset.cwOrigBg || '';
        const origShadow = el.dataset.cwOrigShadow || '';
        el.style.backgroundColor = origBg;
        el.style.boxShadow = origShadow;
        delete el.dataset.cwOrigBg;
        delete el.dataset.cwOrigShadow;
      });
      highlightState.highlighted.clear();
      highlightState.direction = null;
    } catch {
      // no-op
    }
  }

  function highlightCells(cells, direction) {
    if (!Array.isArray(cells) || cells.length === 0) return;

    // If direction changes, reset to avoid mixed colors.
    if (highlightState.direction && highlightState.direction !== direction) {
      clearHighlights();
    }
    highlightState.direction = direction;

    const color = highlightState.colors[direction] || 'rgba(217, 119, 6, 0.32)';

    // Apply highlight.
    const next = new Set();
    for (const cell of cells) {
      if (!cell || typeof cell.col !== 'number' || typeof cell.row !== 'number') continue;
      const cellId = 'c' + padNumber(cell.col) + padNumber(cell.row);
      next.add(cellId);
      const el = document.getElementById(cellId);
      if (!el) continue;

      if (el.dataset.cwOrigBg === undefined) el.dataset.cwOrigBg = el.style.backgroundColor || '';
      if (el.dataset.cwOrigShadow === undefined) el.dataset.cwOrigShadow = el.style.boxShadow || '';

      // Box shadow survives ECW class flips better than background alone.
      // Thicker border (3px) for clearer visibility when clue is selected.
      el.style.backgroundColor = color;
      el.style.boxShadow = `inset 0 0 0 3px ${direction === 'down' ? 'rgba(234, 88, 12, 0.75)' : 'rgba(217, 119, 6, 0.75)'}`;
    }

    // Remove highlight from cells no longer included.
    highlightState.highlighted.forEach((cellId) => {
      if (next.has(cellId)) return;
      const el = document.getElementById(cellId);
      if (!el) return;
      const origBg = el.dataset.cwOrigBg || '';
      const origShadow = el.dataset.cwOrigShadow || '';
      el.style.backgroundColor = origBg;
      el.style.boxShadow = origShadow;
      delete el.dataset.cwOrigBg;
      delete el.dataset.cwOrigShadow;
    });

    highlightState.highlighted = next;
  }

  /**
   * Get cells for a clue from WordX/WordY (EclipseCrossword globals).
   * Returns array of { row, col } for highlightCells.
   * Used as fallback when parent sends FOCUS_CLUE without HIGHLIGHT_CELLS (e.g. clues lack cells).
   */
  function getCellsForClueFromWordData(clueNumber, direction) {
    try {
      if (
        typeof window.WordX === 'undefined' ||
        typeof window.WordY === 'undefined' ||
        typeof window.LastHorizontalWord === 'undefined'
      ) {
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
        if (numbers[i] === clueNumber) {
          targetIndex = i;
          break;
        }
      }

      if (targetIndex < 0) return [];

      const x0 = window.WordX[targetIndex];
      const y0 = window.WordY[targetIndex];
      const cells = [];
      if (wantAcross) {
        for (let c = x0; ; c++) {
          const el = document.getElementById('c' + padNumber(c) + padNumber(y0));
          if (!el) break;
          cells.push({ row: y0, col: c });
        }
      } else {
        for (let r = y0; ; r++) {
          const el = document.getElementById('c' + padNumber(x0) + padNumber(r));
          if (!el) break;
          cells.push({ row: r, col: x0 });
        }
      }
      return cells;
    } catch {
      return [];
    }
  }

  function focusClue(clueNumber, direction) {
    try {
      if (
        typeof window.WordX === 'undefined' ||
        typeof window.WordY === 'undefined' ||
        typeof window.LastHorizontalWord === 'undefined'
      ) {
        return;
      }
      const wordCount = Math.min(window.WordX.length, window.WordY.length);
      const lastHoriz = Number(window.LastHorizontalWord);

      // Same clue numbering scheme as extraction: numbers assigned by sorted unique start coords.
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
        if (numbers[i] === clueNumber) {
          targetIndex = i;
          break;
        }
      }

      if (targetIndex >= 0) {
        // Highlight first (in case parent sent FOCUS_CLUE without HIGHLIGHT_CELLS)
        const fallbackCells = getCellsForClueFromWordData(clueNumber, direction);
        if (fallbackCells.length > 0) {
          highlightCells(fallbackCells, direction);
        }
        const x0 = window.WordX[targetIndex];
        const y0 = window.WordY[targetIndex];
        const firstCellId = 'c' + padNumber(x0) + padNumber(y0);
        const el = document.getElementById(firstCellId);
        if (el) {
          el.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
          el.click?.();
        }
      }
    } catch {
      // no-op
    }
  }
  
  // Initialize bridge
  function initBridge() {
    // Debug flag from URL (?debug=1) or window flag
    try {
      const sp = new URLSearchParams(window.location.search);
      window.__ecwDebug = sp.get('debug') === '1' || window.__ecwDebug === true;
    } catch {}
    // Wait for EclipseCrossword to be fully loaded
    if (typeof CheckClick === 'undefined' || typeof OKClick === 'undefined') {
      setTimeout(initBridge, 100);
      return;
    }
    
    // Multiplayer mode detection
    let isMultiplayerMode = false;
    let multiplayerCallback = null;

    window.__enableMultiplayer = function(callback) {
      isMultiplayerMode = true;
      multiplayerCallback = callback;
      console.log('[ECW Bridge] Multiplayer mode enabled');
    };

    // Store original functions
    originalCheckClick = window.CheckClick;
    originalOKClick = window.OKClick;
    originalCheatClick = window.CheatClick;
    originalSelectThisWord = window.SelectThisWord;
    
    // Hook into CheckClick to detect completion
    window.CheckClick = function() {
      const startCheckTime = Date.now();
      const result = originalCheckClick.call(this);
      
      // Check if puzzle is completed
      if (typeof CrosswordFinished !== 'undefined' && CrosswordFinished) {
        const completionTime = Math.floor((Date.now() - puzzleState.startTime) / 1000);
        const hintsUsed = puzzleState.hintsUsed || 0;
        const score = calculateScore();
        
        sendMessage('complete', {
          completionTime: completionTime,
          score: score,
          hintsUsed: hintsUsed,
          timestamp: Date.now()
        });
      }
      
      return result;
    };
    
    // Hook into OKClick to track progress
    window.OKClick = function() {
      const result = originalOKClick.call(this);
      
      if (isMultiplayerMode && multiplayerCallback) {
        // Send cell update to server
        const focusedCell = document.activeElement;
        if (focusedCell && focusedCell.id && focusedCell.id.startsWith('c')) {
          multiplayerCallback({
            type: 'cell_update',
            cellId: focusedCell.id,
            value: focusedCell.textContent || '',
            timestamp: Date.now()
          });
        }
      }
      
      // Update grid state
      updateGridState();
      const progressPercent = Math.round((puzzleState.filledCells / puzzleState.totalCells) * 100);
      
      sendMessage('progress', {
        gridState: puzzleState.gridState,
        progress: progressPercent,
        filledCells: puzzleState.filledCells,
        totalCells: puzzleState.totalCells,
        hintsUsed: puzzleState.hintsUsed || 0,
        timestamp: Date.now()
      });
      
      return result;
    };
    
    // Hook into CheatClick to track hints
    window.CheatClick = function() {
      if (!window.hintsUsedCount) window.hintsUsedCount = 0;
      window.hintsUsedCount++;
      puzzleState.hintsUsed = window.hintsUsedCount;
      
      const result = originalCheatClick.call(this);
      
      sendMessage('hint_used', {
        hintsUsed: window.hintsUsedCount,
        currentWord: puzzleState.currentWord,
        timestamp: Date.now()
      });
      
      // Also send progress update after hint
      updateGridState();
      const progressPercent = Math.round((puzzleState.filledCells / puzzleState.totalCells) * 100);
      sendMessage('progress', {
        gridState: puzzleState.gridState,
        progress: progressPercent,
        filledCells: puzzleState.filledCells,
        totalCells: puzzleState.totalCells,
        hintsUsed: window.hintsUsedCount,
        timestamp: Date.now()
      });
      
      return result;
    };
    
    // Hook into SelectThisWord to track current word
    window.SelectThisWord = function(event) {
      const result = originalSelectThisWord.call(this, event);
      
      // Extract current word from the event
      if (event && event.target) {
        const cellId = event.target.id;
        if (cellId && cellId.startsWith('c')) {
          const coords = parseCellId(cellId);
          puzzleState.currentWord = getWordFromCoords(coords.x, coords.y);
        }
      }
      
      return result;
    };
    
    // Initialize grid state
    initializeGridState();
    
    // Initialize puzzle start time
    if (!window.puzzleStartTime) {
      window.puzzleStartTime = Date.now();
      puzzleState.startTime = window.puzzleStartTime;
    }
    
    // Send initial state
    sendMessage('progress', {
      gridState: puzzleState.gridState,
      progress: 0,
      filledCells: puzzleState.filledCells,
      totalCells: puzzleState.totalCells,
      hintsUsed: 0,
      timestamp: Date.now()
    });

    // After initialization, send the word list and relocate right pane to side
    try {
      sendWordList();
      relocateRightPaneToSide();
      setTimeout(calculateOptimalCellSize, 50);
      
      // Setup cell validation listeners and external input tracking
      setTimeout(() => {
        setupCellValidation();
        setupExternalInputTracking();
      }, 500);
      
      setTimeout(notifyBridgeReady, 100);
    } catch (e) {
      // no-op
    }
  }
  
  // Initialize grid state by counting total cells
  function initializeGridState() {
    if (typeof CrosswordWidth === 'undefined' || typeof CrosswordHeight === 'undefined') {
      return;
    }
    
    puzzleState.totalCells = 0;
    puzzleState.filledCells = 0;
    
    for (let y = 0; y < CrosswordHeight; y++) {
      for (let x = 0; x < CrosswordWidth; x++) {
        const cellId = 'c' + padNumber(x) + padNumber(y);
        const cell = document.getElementById(cellId);
        
        if (cell) {
          puzzleState.totalCells++;
          const content = cell.innerHTML.trim();
          if (content && content !== '&nbsp;' && content !== '') {
            puzzleState.filledCells++;
            puzzleState.gridState[cellId] = content;
          }
        }
      }
    }
  }
  
  // Send full word list (answer + clue + coords + direction) to parent
  function sendWordList() {
    try {
      const total = typeof Words !== 'undefined' ? Words : 0;
      const list = [];
      for (let i = 0; i < total; i++) {
        list.push({
          index: i,
          direction: i <= LastHorizontalWord ? 'across' : 'down',
          answer: (Word[i] || '').toUpperCase(),
          clue: Clue[i] || '',
          x: WordX[i],
          y: WordY[i],
          length: WordLength[i]
        });
      }
      sendMessage('wordlist', { words: list });
    } catch (e) {
      console.error('sendWordList error', e);
    }
  }

  // Hide clue panels inside iframe since parent displays them
  function relocateRightPaneToSide() {
    try {
      const table = document.querySelector('table');
      if (!table) return;

      const rightTd = table.querySelector('td[valign="top"]') || table.querySelector('td:nth-child(2)');
      
      // Hide the right panel completely (clues displayed in parent)
      if (rightTd) {
        rightTd.style.display = 'none';
      }
      
      // Keep only the answer box and messages in bottom panel
      const gridArea = table.querySelector('.ecw-crosswordarea')?.parentElement || table;
      const bottomHost = document.createElement('div');
      bottomHost.id = 'ecw-bottom-panel';
      bottomHost.style.marginTop = '12px';

      // Only keep welcome message, answer box, and congratulations
      // Hide clue lists since they're in parent
      ['welcomemessage','answerbox','congratulations']
        .map(id => document.getElementById(id))
        .filter(Boolean)
        .forEach(el => bottomHost.appendChild(el));

      if (gridArea && gridArea.parentElement) {
        gridArea.parentElement.insertBefore(bottomHost, gridArea.nextSibling);
      }
      
      // Hide clue-related elements that might still be visible
      const hideElements = ['clueacross', 'cluedown', 'acrossclues', 'downclues'];
      hideElements.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
      });
    } catch (e) {
      console.error('relocateRightPaneToSide error', e);
    }
  }

  // Update grid state by scanning current cells
  function updateGridState() {
    puzzleState.filledCells = 0;
    puzzleState.gridState = {};
    
    for (let y = 0; y < CrosswordHeight; y++) {
      for (let x = 0; x < CrosswordWidth; x++) {
        const cellId = 'c' + padNumber(x) + padNumber(y);
        const cell = document.getElementById(cellId);
        
        if (cell) {
          const content = cell.innerHTML.trim();
          if (content && content !== '&nbsp;' && content !== '') {
            puzzleState.filledCells++;
            puzzleState.gridState[cellId] = content;
          }
        }
      }
    }
  }

  // Track validation statistics
  let validationStats = {
    totalAttempts: 0,
    correctAttempts: 0,
    incorrectAttempts: 0,
    wordErrors: {} // Track errors per word
  };

  // Listen for cell input changes
  function setupCellValidation() {
    try {
      const crosswordTable = document.getElementById('crossword');
      if (!crosswordTable) return;
      
      // Add input event listener to all cells
      crosswordTable.addEventListener('input', function(event) {
        const target = event.target;
        if (!target.id || !target.id.startsWith('c')) return;
        
        const inputLetter = target.textContent?.trim() || '';
        if (!inputLetter) return;
        
        // Validate the letter
        const validation = validateLetter(target.id, inputLetter);
        if (!validation) return;
        
        // Multiplayer: emit per-keystroke cell update
        try {
          console.log('[ECW Bridge] Keystroke validation result:', validation);
          console.log('[ECW Bridge] Multiplayer state:', { isMultiplayerMode, callbackType: typeof multiplayerCallback });
          
          if (isMultiplayerMode && typeof multiplayerCallback === 'function') {
            console.log('[ECW Bridge] Emitting cell_update:', target.id, inputLetter);
            multiplayerCallback({
              type: 'cell_update',
              cellId: target.id,
              value: inputLetter,
              timestamp: Date.now()
            });
            console.log('[ECW Bridge] Cell update emitted successfully');
          } else {
            console.log('[ECW Bridge] Not emitting cell_update - multiplayerMode:', isMultiplayerMode, 'callback:', typeof multiplayerCallback);
          }
        } catch (e) {
          console.error('[ECW Bridge] Error emitting cell update:', e);
        }
        
        // Update stats
        validationStats.totalAttempts++;
        
        if (validation.isCorrect) {
          validationStats.correctAttempts++;
          
          // Apply correct animation
          target.classList.remove('ecw-letter-incorrect');
          target.classList.add('ecw-letter-correct');
          setTimeout(() => target.classList.remove('ecw-letter-correct'), 600);
          
          // Send validation message
          sendMessage('letter_validated', {
            cellId: validation.cellId,
            isCorrect: true,
            wordIndex: validation.wordIndex,
            accuracy: (validationStats.correctAttempts / validationStats.totalAttempts * 100).toFixed(1)
          });
          
          // Auto-advance to next cell
          autoAdvanceToNextCell(target.id, validation.wordIndex);
          
        } else {
          validationStats.incorrectAttempts++;
          
          // Track errors per word
          if (!validationStats.wordErrors[validation.wordIndex]) {
            validationStats.wordErrors[validation.wordIndex] = 0;
          }
          validationStats.wordErrors[validation.wordIndex]++;
          
          // Apply incorrect animation
          target.classList.remove('ecw-letter-correct');
          target.classList.add('ecw-letter-incorrect');
          setTimeout(() => target.classList.remove('ecw-letter-incorrect'), 400);
          
          // Send validation message
          sendMessage('letter_validated', {
            cellId: validation.cellId,
            isCorrect: false,
            wordIndex: validation.wordIndex,
            errorCount: validationStats.wordErrors[validation.wordIndex],
            accuracy: (validationStats.correctAttempts / validationStats.totalAttempts * 100).toFixed(1)
          });
          
          // Offer hint after 3 errors on same word
          if (validationStats.wordErrors[validation.wordIndex] >= 3) {
            sendMessage('suggest_hint', {
              wordIndex: validation.wordIndex,
              errorCount: validationStats.wordErrors[validation.wordIndex]
            });
          }
        }
      });
    } catch (e) {
      console.error('setupCellValidation error', e);
    }
  }
  
  // Parse cell ID to get coordinates
  function parseCellId(cellId) {
    if (!cellId || !cellId.startsWith('c') || cellId.length !== 7) {
      return { x: -1, y: -1 };
    }
    
    const x = parseInt(cellId.substring(1, 4), 10);
    const y = parseInt(cellId.substring(4, 7), 10);
    
    return { x, y };
  }
  
  // Get word number from coordinates
  function getWordFromCoords(x, y) {
    if (typeof TableAcrossWord === 'undefined' || typeof TableDownWord === 'undefined') {
      return -1;
    }
    
    // Check across word first
    if (TableAcrossWord[x] && TableAcrossWord[x][y] >= 0) {
      return TableAcrossWord[x][y];
    }
    
    // Check down word
    if (TableDownWord[x] && TableDownWord[x][y] >= 0) {
      return TableDownWord[x][y];
    }
    
    return -1;
  }
  
  // Validate letter input against correct answer
  function validateLetter(cellId, inputLetter) {
    try {
      const { x, y } = parseCellId(cellId);
      if (x < 0 || y < 0) return null;
      
      // Get the word this cell belongs to
      const wordIndex = getWordFromCoords(x, y);
      if (wordIndex < 0) return null;
      
      // Get correct answer for this word
      const correctWord = (Word[wordIndex] || '').toUpperCase();
      const wordX = WordX[wordIndex];
      const wordY = WordY[wordIndex];
      const isHorizontal = wordIndex <= LastHorizontalWord;
      
      // Calculate position in word
      const positionInWord = isHorizontal ? (x - wordX) : (y - wordY);
      const correctLetter = correctWord[positionInWord] || '';
      
      // Compare input with correct letter
      const isCorrect = inputLetter.toUpperCase() === correctLetter;
      
      return {
        isCorrect,
        correctLetter,
        wordIndex,
        positionInWord,
        cellId
      };
    } catch (e) {
      console.error('validateLetter error', e);
      return null;
    }
  }

  // Auto-advance to next cell in word
  function autoAdvanceToNextCell(currentCellId, wordIndex) {
    try {
      const { x, y } = parseCellId(currentCellId);
      const isHorizontal = wordIndex <= LastHorizontalWord;
      
      // Calculate next cell coordinates
      const nextX = isHorizontal ? x + 1 : x;
      const nextY = isHorizontal ? y : y + 1;
      
      // Check if next cell exists and is part of puzzle
      if (nextX >= CrosswordWidth || nextY >= CrosswordHeight) return;
      
      const nextCellId = 'c' + padNumber(nextX) + padNumber(nextY);
      const nextCell = document.getElementById(nextCellId);
      
      if (nextCell && nextCell.offsetParent !== null) {
        // Focus next cell
        nextCell.focus();
        // Select all text in case there's already content
        if (window.getSelection && document.createRange) {
          const range = document.createRange();
          range.selectNodeContents(nextCell);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
        }
      }
    } catch (e) {
      console.error('autoAdvanceToNextCell error', e);
    }
  }

  // Calculate score based on completion and hints used
  function calculateScore() {
    const baseScore = 1000;
    const completionBonus = (puzzleState.filledCells / puzzleState.totalCells) * 500;
    const hintPenalty = puzzleState.hintsUsed * 50;
    
    return Math.max(0, baseScore + completionBonus - hintPenalty);
  }
  
  // Send message to parent window
  function sendMessage(type, data) {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({
        source: 'eclipsecrossword-iframe',
        type: type,
        data: data,
        puzzleId: window.puzzleId || null,
        timestamp: Date.now()
      }, '*');
    }
  }

  // Debug helpers
  function dbgLog(...args) {
    if (window.__ecwDebug) {
      try { console.log('[ECW DEBUG]', ...args); } catch {}
    }
  }
  function ensureDebugOverlay() {
    if (!window.__ecwDebug) return null;
    let el = document.getElementById('ecw-debug-overlay');
    if (!el) {
      el = document.createElement('div');
      el.id = 'ecw-debug-overlay';
      el.style.position = 'fixed';
      el.style.right = '8px';
      el.style.bottom = '8px';
      el.style.zIndex = '99999';
      el.style.background = 'rgba(0,0,0,0.6)';
      el.style.color = '#0f0';
      el.style.font = '12px/1.2 monospace';
      el.style.padding = '6px 8px';
      el.style.borderRadius = '6px';
      el.style.maxWidth = '50vw';
      document.body.appendChild(el);
    }
    return el;
  }
  
  // Listen for messages from parent
  window.addEventListener('message', function(event) {
    if (event.data && event.data.type) {
      switch (event.data.type) {
        case 'GET_STATE':
          updateGridState();
          const progressPercent = Math.round((puzzleState.filledCells / puzzleState.totalCells) * 100);
          sendMessage('progress', {
            gridState: puzzleState.gridState,
            progress: progressPercent,
            filledCells: puzzleState.filledCells,
            totalCells: puzzleState.totalCells,
            hintsUsed: puzzleState.hintsUsed || 0,
            timestamp: Date.now()
          });
          break;
          
        case 'LOAD_STATE':
          if (event.data.data && event.data.data.gridState) {
            loadGridState(event.data.data.gridState);
          }
          break;

        // Fallback highlight/focus commands (used when typed bridge isn't ready yet).
        case 'HIGHLIGHT_CELLS': {
          const cells = event.data.data?.cells || event.data.cells;
          const direction = event.data.data?.direction || event.data.direction;
          highlightCells(cells, direction);
          break;
        }
        case 'CLEAR_HIGHLIGHT':
          clearHighlights();
          break;
        case 'FOCUS_CLUE': {
          const clueNumber = event.data.data?.clueNumber ?? event.data.clueNumber;
          const direction = event.data.data?.direction ?? event.data.direction;
          if (typeof clueNumber === 'number' && (direction === 'across' || direction === 'down')) {
            focusClue(clueNumber, direction);
          }
          break;
        }
        case 'EC_ENABLE_EXTERNAL_INPUT':
          if (event.data.data && event.data.data.hideInternal) {
            externalInputEnabled = true;
            externalInputSourceId = event.data.data.sourceId;
            integratedGridInputEnabled = !!(event.data.data.integratedGridInput);
            if (integratedGridInputEnabled) {
              createOverlayInput();
              hideInternalAnswerBox();
            } else if (event.data.data.forceHide && event.data.data.verified) {
              setTimeout(function() { hideInternalAnswerBox(); }, 1000);
            }
          }
          break;
        case 'EC_APPLY_INPUT':
          if (externalInputEnabled && event.data.data) {
            applyExternalInput(event.data.data.value || '', event.data.sourceId);
          }
          break;
        case 'EC_CLEAR_WORD':
          if (externalInputEnabled) clearCurrentWord();
          break;
        case 'EC_BACKSPACE':
          if (externalInputEnabled) handleExternalBackspace();
          break;
        case 'EC_DISABLE_EXTERNAL_INPUT':
          if (event.data.data && event.data.data.showInternal) {
            externalInputEnabled = false;
            externalInputSourceId = null;
            integratedGridInputEnabled = false;
            showInternalAnswerBox();
            hideOverlayInput();
          }
          break;
      }
    }
  });
  
  // Load grid state from parent
  function loadGridState(gridState) {
    console.log('[ECW Bridge] Loading grid state:', gridState);
    let loadedCount = 0;
    const totalCells = Object.keys(gridState).length;
    
    for (const [cellId, value] of Object.entries(gridState)) {
      const cell = document.getElementById(cellId);
      if (cell && value) {
        cell.innerHTML = value;
        loadedCount++;
        console.log(`[ECW Bridge] Loaded cell ${cellId}: ${value}`);
      } else {
        console.warn(`[ECW Bridge] Could not load cell ${cellId}:`, { cell: !!cell, value });
      }
    }
    
    console.log(`[ECW Bridge] Loaded ${loadedCount}/${totalCells} cells`);
    
    // Update our state
    updateGridState();
    
    // Send confirmation back to parent
    try {
      window.parent.postMessage({
        source: 'iframe',
        type: 'STATE_LOADED',
        loadedCount,
        totalCells,
        timestamp: Date.now()
      }, window.location.origin);
      console.log('[ECW Bridge] Sent state loaded confirmation to parent');
    } catch (error) {
      console.error('[ECW Bridge] Error sending state loaded confirmation:', error);
    }
  }
  
  // Utility function to pad numbers (EclipseCrossword uses this)
  function padNumber(number) {
    if (number < 10) {
      return "00" + number;
    } else if (number < 100) {
      return "0" + number;
    } else {
      return "" + number;
    }
  }

  function hideInternalAnswerBox() {
    if (document.getElementById('external-input-hide-style')) return;
    const style = document.createElement('style');
    style.id = 'external-input-hide-style';
    style.textContent = '#answerbox,#wordentry{position:absolute!important;left:-9999px!important;width:1px!important;height:1px!important;opacity:0!important;pointer-events:none!important;clip-path:inset(50%)!important;overflow:hidden!important;}';
    document.head.appendChild(style);
  }

  function showInternalAnswerBox() {
    const style = document.getElementById('external-input-hide-style');
    if (style) style.remove();
  }

  function createOverlayInput() {
    if (overlayContainerEl) return;
    overlayContainerEl = document.createElement('div');
    overlayContainerEl.id = 'ecw-integrated-input-container';
    overlayContainerEl.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;';
    overlayInputEl = document.createElement('input');
    overlayInputEl.id = 'ecw-integrated-input';
    overlayInputEl.type = 'text';
    overlayInputEl.autocomplete = 'off';
    overlayInputEl.setAttribute('aria-label', 'Crossword answer input');
    overlayInputEl.style.cssText = 'position:fixed;opacity:0;pointer-events:auto;border:none;outline:none;margin:0;padding:0;font:inherit;background:transparent;';
    overlayInputEl.addEventListener('input', function() {
      if (!integratedGridInputEnabled || typeof CurrentWord === 'undefined' || CurrentWord < 0) return;
      const maxLen = WordLength[CurrentWord] || 0;
      let val = this.value.toUpperCase().replace(/[^A-Z]/g, '');
      if (val.length > maxLen) val = val.slice(0, maxLen);
      this.value = val;
      applyExternalInput(val, externalInputSourceId);
    });
    overlayInputEl.addEventListener('keydown', function(e) {
      if (!integratedGridInputEnabled) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        if (typeof window.DeselectCurrentWord === 'function') window.DeselectCurrentWord();
        hideOverlayInput();
        return;
      }
      if (e.key === 'Backspace') {
        e.preventDefault();
        handleExternalBackspace();
        const len = WordLength[CurrentWord] || 0;
        let currentFill = '';
        if (typeof CurrentWord !== 'undefined' && CurrentWord >= 0) {
          const wi = CurrentWord;
          const x = WordX[wi] || 0;
          const y = WordY[wi] || 0;
          const dir = wi <= LastHorizontalWord ? 'across' : 'down';
          for (let i = 0; i < len; i++) {
            const cx = dir === 'across' ? x + i : x;
            const cy = dir === 'across' ? y : y + i;
            const c = document.getElementById('c' + padNumber(cx) + padNumber(cy));
            currentFill += c && c.textContent ? c.textContent.trim() : '';
          }
        }
        this.value = currentFill;
        return;
      }
      if (e.key === 'Enter') { e.preventDefault(); return; }
      if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
        const maxLen = WordLength[CurrentWord] || 0;
        let val = this.value.toUpperCase().replace(/[^A-Z]/g, '') + e.key.toUpperCase();
        if (val.length > maxLen) val = val.slice(0, maxLen);
        e.preventDefault();
        this.value = val;
        applyExternalInput(val, externalInputSourceId);
      }
    });
    overlayContainerEl.appendChild(overlayInputEl);
    document.body.appendChild(overlayContainerEl);
  }

  function positionOverlayInput() {
    if (!overlayInputEl || !integratedGridInputEnabled) return;
    if (typeof CurrentWord === 'undefined' || CurrentWord < 0) { hideOverlayInput(); return; }
    const wi = CurrentWord;
    const x = WordX[wi] || 0;
    const y = WordY[wi] || 0;
    const dir = wi <= LastHorizontalWord ? 'across' : 'down';
    const cellId = 'c' + padNumber(x) + padNumber(y);
    const cell = document.getElementById(cellId);
    if (!cell) { overlayInputEl.style.visibility = 'hidden'; return; }
    const rect = cell.getBoundingClientRect();
    overlayInputEl.style.top = rect.top + 'px';
    overlayInputEl.style.left = rect.left + 'px';
    overlayInputEl.style.width = rect.width + 'px';
    overlayInputEl.style.height = rect.height + 'px';
    overlayInputEl.style.visibility = 'visible';
    let currentFill = '';
    const length = WordLength[wi] || 0;
    for (let i = 0; i < length; i++) {
      const cx = dir === 'across' ? x + i : x;
      const cy = dir === 'across' ? y : y + i;
      const c = document.getElementById('c' + padNumber(cx) + padNumber(cy));
      currentFill += c && c.textContent ? c.textContent.trim() : '';
    }
    overlayInputEl.value = currentFill;
    overlayInputEl.maxLength = length;
    try { overlayInputEl.focus(); } catch (_) {}
  }

  function showOverlayInput() {
    if (!overlayInputEl) return;
    overlayContainerEl.style.pointerEvents = 'auto';
    positionOverlayInput();
  }

  function hideOverlayInput() {
    if (overlayInputEl) {
      overlayInputEl.value = '';
      overlayInputEl.style.visibility = 'hidden';
      overlayInputEl.style.top = '-9999px';
      overlayInputEl.style.left = '-9999px';
      try { overlayInputEl.blur(); } catch (_) {}
    }
    if (overlayContainerEl) overlayContainerEl.style.pointerEvents = 'none';
  }

  function applyExternalInput(value, sourceId) {
    try {
      if (typeof CurrentWord === 'undefined' || CurrentWord < 0) return;
      const wi = CurrentWord;
      const length = WordLength[wi] || 0;
      const x = WordX[wi] || 0;
      const y = WordY[wi] || 0;
      const dir = wi <= LastHorizontalWord ? 'across' : 'down';
      for (let i = 0; i < length; i++) {
        const cx = dir === 'across' ? x + i : x;
        const cy = dir === 'across' ? y : y + i;
        const cell = document.getElementById('c' + padNumber(cx) + padNumber(cy));
        if (cell) {
          // Important: do NOT blank trailing cells when `value` is shorter than the word.
          // Those cells may already contain intersecting letters from other words.
          if (i < value.length) {
            cell.textContent = value[i] || '';
            cell.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }
      }
      const we = document.getElementById('wordentry');
      if (we) we.value = value;
      updateGridState();
      sendMessage('EC_GRID_UPDATED', { sourceId: sourceId, updates: value.split('').map(function(l, i) { return { index: i, value: l }; }) });
      var pct = Math.round((puzzleState.filledCells / puzzleState.totalCells) * 100);
      sendMessage('progress', { gridState: puzzleState.gridState, progress: pct, filledCells: puzzleState.filledCells, totalCells: puzzleState.totalCells, hintsUsed: puzzleState.hintsUsed || 0, timestamp: Date.now() });
    } catch (e) { console.error('[ECW Bridge] Error applying external input:', e); }
  }

  function clearCurrentWord() {
    try {
      if (typeof CurrentWord === 'undefined' || CurrentWord < 0) return;
      const wi = CurrentWord;
      const length = WordLength[wi] || 0;
      const x = WordX[wi] || 0;
      const y = WordY[wi] || 0;
      const dir = wi <= LastHorizontalWord ? 'across' : 'down';
      for (let i = 0; i < length; i++) {
        const cx = dir === 'across' ? x + i : x;
        const cy = dir === 'across' ? y : y + i;
        const cell = document.getElementById('c' + padNumber(cx) + padNumber(cy));
        if (cell) cell.textContent = '';
      }
      updateGridState();
      var pct = Math.round((puzzleState.filledCells / puzzleState.totalCells) * 100);
      sendMessage('progress', { gridState: puzzleState.gridState, progress: pct, filledCells: puzzleState.filledCells, totalCells: puzzleState.totalCells, hintsUsed: puzzleState.hintsUsed || 0, timestamp: Date.now() });
    } catch (e) { console.error('[ECW Bridge] Error clearing word:', e); }
  }

  function handleExternalBackspace() {
    try {
      if (typeof CurrentWord === 'undefined' || CurrentWord < 0) return;
      const wi = CurrentWord;
      const length = WordLength[wi] || 0;
      const x = WordX[wi] || 0;
      const y = WordY[wi] || 0;
      const dir = wi <= LastHorizontalWord ? 'across' : 'down';
      for (let i = length - 1; i >= 0; i--) {
        const cx = dir === 'across' ? x + i : x;
        const cy = dir === 'across' ? y : y + i;
        const cell = document.getElementById('c' + padNumber(cx) + padNumber(cy));
        if (cell && cell.textContent.trim()) {
          cell.textContent = '';
          updateGridState();
          var pct = Math.round((puzzleState.filledCells / puzzleState.totalCells) * 100);
          sendMessage('progress', { gridState: puzzleState.gridState, progress: pct, filledCells: puzzleState.filledCells, totalCells: puzzleState.totalCells, hintsUsed: puzzleState.hintsUsed || 0, timestamp: Date.now() });
          break;
        }
      }
    } catch (e) { console.error('[ECW Bridge] Error handling backspace:', e); }
  }

  function notifyWordSelected() {
    try {
      if (typeof CurrentWord === 'undefined' || CurrentWord < 0) return;
      const wi = CurrentWord;
      const clue = Clue[wi] || '';
      const length = WordLength[wi] || 0;
      const number = wi + 1;
      const dir = wi <= LastHorizontalWord ? 'across' : 'down';
      const x = WordX[wi] || 0;
      const y = WordY[wi] || 0;
      let currentFill = '';
      for (let i = 0; i < length; i++) {
        const cx = dir === 'across' ? x + i : x;
        const cy = dir === 'across' ? y : y + i;
        const c = document.getElementById('c' + padNumber(cx) + padNumber(cy));
        currentFill += c && c.textContent ? c.textContent.trim() : '_';
      }
      sendMessage('EC_WORD_SELECTED', { word: { id: 'w-' + number + '-' + dir, number: number, direction: dir, clue: clue, length: length, start: { row: y, col: x }, currentFill: currentFill, indexInWord: 0 } });
      if (integratedGridInputEnabled && overlayInputEl) showOverlayInput();
    } catch (e) { console.error('[ECW Bridge] Error notifying word selected:', e); }
  }

  function setupExternalInputTracking() {
    const origSelect = window.SelectThisWord;
    if (origSelect) {
      window.SelectThisWord = function(event) {
        const result = origSelect.call(this, event);
        if (externalInputEnabled && typeof CurrentWord !== 'undefined' && CurrentWord >= 0) notifyWordSelected();
        else if (integratedGridInputEnabled && (typeof CurrentWord === 'undefined' || CurrentWord < 0)) hideOverlayInput();
        return result;
      };
    }
    const origDeselect = window.DeselectCurrentWord;
    if (origDeselect) {
      window.DeselectCurrentWord = function() {
        const result = origDeselect.call(this);
        if (integratedGridInputEnabled) hideOverlayInput();
        return result;
      };
    }
  }

  function notifyBridgeReady() {
    sendMessage('EC_IFRAME_READY', { bridgeId: bridgeId, version: '1.0' });
  }
  
  // Set puzzle ID if provided
  if (window.puzzleId) {
    puzzleState.puzzleId = window.puzzleId;
  }
  
  // Apply remote cell update
  window.__applyRemoteCellUpdate = function(cellId, value) {
    const cell = document.getElementById(cellId);
    if (cell) {
      cell.textContent = value;
      
      // Flash animation
      cell.style.transition = 'background-color 0.3s';
      cell.style.backgroundColor = 'rgba(217, 119, 6, 0.2)';
      setTimeout(() => {
        cell.style.backgroundColor = '';
      }, 300);
    }
  };
  
  // Auto-sizing logic to fit puzzle in viewport
function calculateOptimalCellSize() {
  try {
    const crosswordTable = document.getElementById('crossword');
    if (!crosswordTable) return;
    
    const container = crosswordTable.parentElement;
    if (!container) return;
    
    // Get grid dimensions from the global variables
    const gridWidth = typeof CrosswordWidth !== 'undefined' ? CrosswordWidth : 15;
    const gridHeight = typeof CrosswordHeight !== 'undefined' ? CrosswordHeight : 15;
    
    // Calculate available space with proper padding
    const paddingAllowance = 32; // Increased for safety
    const bottomPanel = document.getElementById('ecw-bottom-panel');
    const rightPanel = document.querySelector('td[valign="top"]:last-child');
    const isMobile = window.innerWidth < 768;
    
    // Measure actual container elements for more accurate calculations
    const crosswordArea = document.querySelector('.ecw-crosswordarea');
    const containerPadding = crosswordArea ? 
      (parseInt(getComputedStyle(crosswordArea).paddingTop) || 0) + 
      (parseInt(getComputedStyle(crosswordArea).paddingBottom) || 0) : 0;
    
    const bottomH = bottomPanel ? bottomPanel.clientHeight : 0;
    const rightPanelWidth = (!isMobile && rightPanel) ? 300 : 0; // Fixed right panel width on desktop
    const availableWidth = window.innerWidth - rightPanelWidth - paddingAllowance;
    const availableHeight = window.innerHeight - bottomH - paddingAllowance - containerPadding;
    
    // Calculate maximum cell size that fits both dimensions
    const maxCellWidth = Math.floor(availableWidth / gridWidth);
    const maxCellHeight = Math.floor(availableHeight / gridHeight);
    const optimalCellSize = Math.min(maxCellWidth, maxCellHeight, 48); // Cap at 48px
    const minCellSize = 16; // Lower minimum to fit tight viewports
    
    // Use the optimal size, but not smaller than minimum
    const cellSize = Math.max(optimalCellSize, minCellSize);
    const fontSize = Math.max(Math.floor(cellSize * 0.6), 12);
    
    // Calculate actual grid dimensions
    const actualGridWidth = gridWidth * cellSize;
    const actualGridHeight = gridHeight * cellSize;
    
    // Apply the calculated sizes
    document.documentElement.style.setProperty('--ecw-cell-size', cellSize + 'px');
    document.documentElement.style.setProperty('--ecw-cell-font-size', fontSize + 'px');
    
    // After applying cell sizes, measure the ACTUAL rendered height
    // Use setTimeout to allow DOM to update with new styles
    setTimeout(() => {
      // Measure the actual table height after rendering
      const actualTableHeight = crosswordTable.offsetHeight || crosswordTable.clientHeight;
      const bottomPanel = document.getElementById('ecw-bottom-panel');
      const bottomH = bottomPanel ? bottomPanel.clientHeight : 0;
      
      // Get container padding from computed styles
      const container = crosswordTable.parentElement;
      const containerStyle = container ? window.getComputedStyle(container) : null;
      const containerPadding = containerStyle ? 
        parseFloat(containerStyle.paddingTop) + parseFloat(containerStyle.paddingBottom) : 0;
      
      // Add generous padding buffer (100px) to ensure no truncation
      const paddingBuffer = 100;
      const totalHeight = actualTableHeight + bottomH + containerPadding + paddingBuffer;
      const totalWidth = actualGridWidth + rightPanelWidth + 20; // Small buffer for width
      
      // Send measured dimensions to parent
      sendMessage('dimensions', {
        gridWidth: gridWidth,
        gridHeight: gridHeight,
        cellSize: cellSize,
        totalWidth: totalWidth,
        totalHeight: totalHeight,
        actualTableHeight: actualTableHeight,
        bottomPanelHeight: bottomH,
        containerPadding: containerPadding,
        paddingBuffer: paddingBuffer
      });
      
      // Debug logging
      dbgLog('measured-height', {
        actualTableHeight,
        bottomH,
        containerPadding,
        paddingBuffer,
        totalHeight
      });
      
      const overlay = ensureDebugOverlay();
      if (overlay) {
        overlay.textContent = `actualH:${actualTableHeight} bottomH:${bottomH} containerP:${containerPadding} buffer:${paddingBuffer} total:${totalHeight}`;
      }
    }, 50);
  } catch (error) {
    console.error('Error calculating cell size:', error);
  }
}

  // Debounce helper
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Sync answer box input to grid cells
  function syncAnswerBoxToGrid() {
    const wordEntry = document.getElementById('wordentry');
    if (!wordEntry) return;
    
    wordEntry.addEventListener('input', function(e) {
      const currentValue = this.value.toUpperCase();
      const currentWordIndex = window.CurrentWord;
      
      if (currentWordIndex < 0) return;
      
      // Get word coordinates
      const x = window.WordX[currentWordIndex];
      const y = window.WordY[currentWordIndex];
      const wordLength = window.WordLength[currentWordIndex];
      const isHorizontal = currentWordIndex <= window.LastHorizontalWord;
      
      // Update grid cells to match input value
      for (let i = 0; i < wordLength; i++) {
        const cellX = isHorizontal ? x + i : x;
        const cellY = isHorizontal ? y : y + i;
        const cellId = 'c' + padNumber(cellX) + padNumber(cellY);
        const cell = document.getElementById(cellId);
        
        if (cell) {
          const letter = currentValue[i];
          cell.innerHTML = letter ? letter : '&nbsp;';
        }
      }
      
      updateGridState();
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      initBridge();
      setTimeout(calculateOptimalCellSize, 100);
      observeBottomPanel();
      syncAnswerBoxToGrid();
    });
  } else {
    initBridge();
    setTimeout(calculateOptimalCellSize, 100);
    observeBottomPanel();
    syncAnswerBoxToGrid();
  }

  // Run sizing on resize
  window.addEventListener('resize', debounce(calculateOptimalCellSize, 250));

  // Recalculate when bottom panel content changes (clue text, answer box visibility)
  function observeBottomPanel() {
    const panel = document.getElementById('ecw-bottom-panel');
    if (!panel || typeof MutationObserver === 'undefined') return;
    const obs = new MutationObserver(() => setTimeout(calculateOptimalCellSize, 30));
    obs.observe(panel, { childList: true, subtree: true, attributes: true, characterData: true });
  }

  // Disable Solve/Check buttons by overriding handlers
  window.CheatClick = function() { /* no-op */ };
  window.CheckClick = function() { /* no-op */ };

  // Live correctness highlighting while typing
  (function liveCorrectness() {
    const CORRECT_CLASS = 'ecw-letter-correct';
    const INCORRECT_CLASS = 'ecw-letter-incorrect';

    const style = document.createElement('style');
    style.textContent = `
      .ecw-box.${CORRECT_CLASS}{background-color:rgba(16,185,129,.15)!important;border-color:rgb(16,185,129)!important}
      .ecw-box.${INCORRECT_CLASS}{background-color:rgba(239,68,68,.12)!important;border-color:rgb(239,68,68)!important}
    `;
    document.head.appendChild(style);

    function pad(n){return(n<10?'00':n<100?'0':'')+n}
    function cellAt(x,y){return document.getElementById('c'+pad(x)+pad(y))}
    function clearWordFeedback(wordIndex){
      if (wordIndex<0) return;
      const x0=WordX[wordIndex], y0=WordY[wordIndex], len=WordLength[wordIndex], horiz=wordIndex<=LastHorizontalWord;
      for(let i=0;i<len;i++){
        const td=horiz?cellAt(x0+i,y0):cellAt(x0,y0+i);
        if(!td)continue; td.classList.remove(CORRECT_CLASS,INCORRECT_CLASS);
      }
    }
    function applyLiveFeedback(){
      if (typeof CurrentWord!=='number'||CurrentWord<0) return;
      const entry=(document.getElementById('wordentry')?.value||'').toUpperCase();
      const answer=(Word[CurrentWord]||'').toUpperCase();
      const x0=WordX[CurrentWord], y0=WordY[CurrentWord], len=WordLength[CurrentWord], horiz=CurrentWord<=LastHorizontalWord;
      for(let i=0;i<len;i++){
        const td=horiz?cellAt(x0+i,y0):cellAt(x0,y0+i);
        if(!td)continue;
        const ch=entry[i]||'';
        if(ch) td.textContent=ch;
        td.classList.remove(CORRECT_CLASS,INCORRECT_CLASS);
        if(ch){ (answer[i]===ch?td.classList.add(CORRECT_CLASS):td.classList.add(INCORRECT_CLASS)); }
      }
    }
    function bind(){
      const input=document.getElementById('wordentry');
      if(!input) return;
      input.removeEventListener('input',applyLiveFeedback);
      input.addEventListener('input',applyLiveFeedback);

      const oldSelect=window.SelectThisWord;
      window.SelectThisWord=function(evt){ dbgLog('recalc:Select'); clearWordFeedback(typeof CurrentWord==='number'?CurrentWord:-1); const r=oldSelect?oldSelect(evt):undefined; setTimeout(calculateOptimalCellSize,50); return r; };

      const oldOK=window.OKClick;
      window.OKClick=function(){ dbgLog('recalc:OK'); clearWordFeedback(typeof CurrentWord==='number'?CurrentWord:-1); const r=oldOK?oldOK():undefined; setTimeout(calculateOptimalCellSize,50); return r; };

      const oldCancel=window.DeselectCurrentWord;
      window.DeselectCurrentWord=function(){ dbgLog('recalc:Deselect'); clearWordFeedback(typeof CurrentWord==='number'?CurrentWord:-1); const r=oldCancel?oldCancel():undefined; setTimeout(calculateOptimalCellSize,50); return r; };
    }
    if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',bind);} else {bind();}
  })();

  // Reveal-a-letter support and parent command listener
  function revealOneLetter(targetIndex){
    try{
      const idx=(typeof targetIndex==='number')?targetIndex:(typeof CurrentWord==='number'?CurrentWord:-1);
      if(idx<0) return;
      const ans=(Word[idx]||'').toUpperCase();
      const x0=WordX[idx], y0=WordY[idx], len=WordLength[idx], horiz=idx<=LastHorizontalWord;
      for(let i=0;i<len;i++){
        const td=(horiz?document.getElementById('c'+padNumber(x0+i)+padNumber(y0)):document.getElementById('c'+padNumber(x0)+padNumber(y0+i)));
        if(!td)continue;
        const current=(td.textContent||'').toUpperCase();
        const correct=ans[i]||'';
        if(current!==correct){
          td.textContent=correct;
          td.classList.add('ecw-letter-correct');
          setTimeout(()=>td.classList.remove('ecw-letter-correct'),600);
          sendMessage('hint_used',{wordIndex:idx,position:i,letter:correct});
          break;
        }
      }
    }catch(e){console.error('revealOneLetter error',e);}
  }

  // Reveal entire word (for word hints)
  // clueInfo: optional { direction, number } for parent to track revealed clues
  function revealWord(wordIndex, clueInfo) {
    try {
      if (wordIndex === undefined || wordIndex === null) {
        // No word index provided, use current word
        wordIndex = (typeof CurrentWord === 'number') ? CurrentWord : -1;
      }
      
      if (wordIndex < 0 || wordIndex >= Word.length) {
        console.error('Invalid word index:', wordIndex);
        return;
      }
      
      const word = (Word[wordIndex] || '').toUpperCase();
      const wordX = WordX[wordIndex];
      const wordY = WordY[wordIndex];
      const isHorizontal = wordIndex <= LastHorizontalWord;
      const direction = (clueInfo && (clueInfo.direction === 'across' || clueInfo.direction === 'down'))
        ? clueInfo.direction
        : (isHorizontal ? 'across' : 'down');
      const clueNumber = (clueInfo && typeof clueInfo.number === 'number') ? clueInfo.number : null;
      
      let revealedCount = 0;
      
      // Fill all cells in the word (overwrite incorrect letters too)
      for (let i = 0; i < word.length; i++) {
        const cellX = isHorizontal ? wordX + i : wordX;
        const cellY = isHorizontal ? wordY : wordY + i;
        const cellId = 'c' + padNumber(cellX) + padNumber(cellY);
        const cell = document.getElementById(cellId);
        
        if (cell) {
          const current = (cell.textContent || '').trim().toUpperCase();
          if (current !== word[i]) {
            cell.textContent = word[i];
            revealedCount++;
          
            // Add highlight animation
            cell.style.backgroundColor = '#FFD700';  // Gold color for word reveal
            cell.style.transition = 'background-color 0.8s ease-out';
            setTimeout(() => {
              cell.style.backgroundColor = '';
            }, 800);
          }
        }
      }
      
      sendMessage('word_revealed', {
        wordIndex,
        word: word,
        revealedCount: revealedCount,
        clueNumber: clueNumber,
        direction: direction,
        timestamp: Date.now()
      });
      
      // Update grid state
      updateGridState();
      const progressPercent = Math.round((puzzleState.filledCells / puzzleState.totalCells) * 100);
      sendMessage('progress', {
        gridState: puzzleState.gridState,
        progress: progressPercent,
        filledCells: puzzleState.filledCells,
        totalCells: puzzleState.totalCells,
        timestamp: Date.now()
      });
      
    } catch (e) {
      console.error('revealWord error', e);
    }
  }

  // Track current word for hint context
  window.__currentWordData = null;

  // Update existing SelectThisWord hook to track current word for hints
  const existingSelectThisWord = window.SelectThisWord;
  window.SelectThisWord = function(wordIndex) {
    const result = existingSelectThisWord ? existingSelectThisWord.call(this, wordIndex) : undefined;
    
    puzzleState.currentWord = wordIndex;
    
    // Store current word data for hint API
    if (wordIndex >= 0 && wordIndex < Word.length) {
      window.__currentWordData = {
        index: wordIndex,
        clue: Clue[wordIndex],
        word: Word[wordIndex],
        isHorizontal: wordIndex <= LastHorizontalWord
      };
    }
    
    return result;
  };

  // Expose reveal functions to parent window
  window.__ecwRevealLetterMap = window.__ecwRevealLetterMap || {};
  {
    // `puzzleId` was previously referenced here but not defined in this script
    // (causing a ReferenceError and breaking the entire bridge).
    // Use the best available identifier.
    const pid = puzzleState.puzzleId || window.puzzleId || 'unknown';
    window.__ecwRevealLetterMap[pid] = revealOneLetter;

    window.__ecwRevealWordMap = window.__ecwRevealWordMap || {};
    window.__ecwRevealWordMap[pid] = revealWord;
  }
  
  // Expose function to apply remote cell updates
  window.__applyRemoteCellUpdate = window.__applyRemoteCellUpdate || function(cellId, value) {
    try {
      console.log('[ECW Bridge] Applying remote cell update:', cellId, value);
      const cell = document.getElementById(cellId);
      if (cell) {
        cell.innerHTML = value;
        cell.style.backgroundColor = '#e0f2fe'; // Light blue to show it's a remote update
        setTimeout(() => {
          cell.style.backgroundColor = '';
        }, 1000);
        console.log('[ECW Bridge] Remote cell update applied successfully');
        return true;
      } else {
        console.warn('[ECW Bridge] Cell not found for remote update:', cellId);
        return false;
      }
    } catch (error) {
      console.error('[ECW Bridge] Error applying remote cell update:', error);
      return false;
    }
  };

  // Expose function to get all clues
  window.__ecwGetClues = window.__ecwGetClues || function() {
    try {
      console.log('[ECW Bridge] Extracting clues...');
      console.log('[ECW Bridge] AcrossClues type:', typeof AcrossClues, 'DownClues type:', typeof DownClues);
      
      const clues = {
        across: [],
        down: []
      };
      
      // Extract across clues
      if (typeof AcrossClues !== 'undefined' && AcrossClues && Array.isArray(AcrossClues)) {
        console.log('[ECW Bridge] Processing across clues, count:', AcrossClues.length);
        for (let i = 0; i < AcrossClues.length; i++) {
          if (AcrossClues[i] && typeof AcrossClues[i] === 'string' && AcrossClues[i].trim()) {
            clues.across.push({
              num: i + 1,
              clue: AcrossClues[i].trim()
            });
          }
        }
      } else {
        console.log('[ECW Bridge] AcrossClues not available or not array');
      }
      
      // Extract down clues
      if (typeof DownClues !== 'undefined' && DownClues && Array.isArray(DownClues)) {
        console.log('[ECW Bridge] Processing down clues, count:', DownClues.length);
        for (let i = 0; i < DownClues.length; i++) {
          if (DownClues[i] && typeof DownClues[i] === 'string' && DownClues[i].trim()) {
            clues.down.push({
              num: i + 1,
              clue: DownClues[i].trim()
            });
          }
        }
      } else {
        console.log('[ECW Bridge] DownClues not available or not array');
      }
      
      console.log('[ECW Bridge] Extracted clues:', clues);
      console.log('[ECW Bridge] Across count:', clues.across.length, 'Down count:', clues.down.length);
      return clues;
    } catch (error) {
      console.error('[ECW Bridge] Error extracting clues:', error);
      return { across: [], down: [] };
    }
  };

  window.addEventListener('message', (event) => {
    try {
      if (event.origin !== window.location.origin) return;
      const data = event.data || {};
      if (data.source !== 'parent') return;
      if (data.puzzleId == null) return;

      // Map (direction, clueNumber) -> EclipseCrossword wordIndex so hints can work
      // without relying on CurrentWord being set by a click.
      // This matches the numbering scheme used by our clue extraction:
      // numbers are assigned by sorted unique word start positions (x,y).
      let clueNumbersByWordIndex = null;
      function getClueNumbersByWordIndex() {
        if (clueNumbersByWordIndex) return clueNumbersByWordIndex;
        try {
          if (typeof WordX === 'undefined' || typeof WordY === 'undefined' || !Array.isArray(WordX) || !Array.isArray(WordY)) {
            return null;
          }
          const wordCount = Math.min(WordX.length, WordY.length);
          const starts = [];
          for (let i = 0; i < wordCount; i++) {
            starts.push({ x: WordX[i], y: WordY[i], i });
          }
          starts.sort((a, b) => (a.y - b.y) || (a.x - b.x));

          const keyToNumber = new Map();
          const numbers = new Array(wordCount);
          let nextNumber = 1;
          for (const s of starts) {
            const key = s.x + ',' + s.y;
            if (!keyToNumber.has(key)) {
              keyToNumber.set(key, nextNumber++);
            }
            numbers[s.i] = keyToNumber.get(key);
          }
          clueNumbersByWordIndex = numbers;
          return clueNumbersByWordIndex;
        } catch (e) {
          return null;
        }
      }

      function wordIndexFromClue(direction, clueNumber) {
        const numbers = getClueNumbersByWordIndex();
        if (!numbers) return -1;
        if (typeof LastHorizontalWord !== 'number') return -1;
        const wantAcross = direction === 'across';
        for (let i = 0; i < numbers.length; i++) {
          const isAcross = i <= LastHorizontalWord;
          if (isAcross !== wantAcross) continue;
          if (numbers[i] === clueNumber) return i;
        }
        return -1;
      }

      function resolveWordIndex(payload) {
        if (typeof payload.wordIndex === 'number') return payload.wordIndex;
        const dir = payload.direction;
        const num = payload.number;
        if ((dir === 'across' || dir === 'down') && typeof num === 'number') {
          const idx = wordIndexFromClue(dir, num);
          return idx >= 0 ? idx : undefined;
        }
        return undefined;
      }

      if (data.type === 'reveal_letter') {
        const idx = resolveWordIndex(data);
        revealOneLetter(idx);
      } else if (data.type === 'reveal_word') {
        const idx = resolveWordIndex(data);
        revealWord(idx, { direction: data.direction, number: data.number });
      }
    } catch (e) {
      console.error('message handler error', e);
    }
  });
  
})();
