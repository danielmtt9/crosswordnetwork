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
  
  // Multiplayer mode detection - moved to global scope for proper access
  let isMultiplayerMode = false;
  let multiplayerCallback = null;

  window.__enableMultiplayer = function(callback) {
    isMultiplayerMode = true;
    multiplayerCallback = callback;
    console.log('[ECW Bridge] Multiplayer mode enabled with callback');
  };

  // External input mode detection
  let externalInputEnabled = false;
  let externalInputSourceId = null;
  let integratedGridInputEnabled = false;
  let overlayInputEl = null;
  let overlayContainerEl = null;
  const bridgeId = `bridge-${Date.now()}`;

  // Send EC_IFRAME_READY on load
  function notifyBridgeReady() {
    sendMessage('EC_IFRAME_READY', {
      bridgeId: bridgeId,
      version: '1.0'
    });
  }

  // Hide internal answer box visually but keep it functional
  function hideInternalAnswerBox() {
    // Check if style already exists to avoid duplicates
    if (document.getElementById('external-input-hide-style')) {
      return; // Already hidden
    }
    
    const style = document.createElement('style');
    style.id = 'external-input-hide-style';
    style.textContent = `
      #answerbox,
      #wordentry {
        position: absolute !important;
        left: -9999px !important;
        width: 1px !important;
        height: 1px !important;
        opacity: 0 !important;
        pointer-events: none !important;
        clip-path: inset(50%) !important;
        overflow: hidden !important;
      }
      /* Cells are display-only in EclipseCrossword - input happens via answer box */
    `;
    document.head.appendChild(style);
    
    // NOTE: EclipseCrossword cells are NOT directly editable
    // Input happens via the answer box (wordentry), not direct cell editing
    // The answer box should remain visible and functional
    console.log('[ECW Bridge] Internal answer box hidden (cells use answer box for input)');
  }
  
  // Re-enable internal answer box (for fallback scenarios)
  function showInternalAnswerBox() {
    const style = document.getElementById('external-input-hide-style');
    if (style) {
      style.remove();
      console.log('[ECW Bridge] Internal answer box re-enabled');
    }
  }

  // --- Integrated grid input overlay (type directly in grid cells) ---
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
        if (typeof window.DeselectCurrentWord === 'function') {
          window.DeselectCurrentWord();
        }
        hideOverlayInput();
        return;
      }
      if (e.key === 'Backspace') {
        e.preventDefault();
        handleExternalBackspace();
        const len = (WordLength[CurrentWord] || 0);
        let currentFill = '';
        if (typeof CurrentWord !== 'undefined' && CurrentWord >= 0) {
          const wordIndex = CurrentWord;
          const x = WordX[wordIndex] || 0;
          const y = WordY[wordIndex] || 0;
          const direction = wordIndex <= LastHorizontalWord ? 'across' : 'down';
          for (let i = 0; i < len; i++) {
            const cellX = direction === 'across' ? x + i : x;
            const cellY = direction === 'across' ? y : y + i;
            const cellId = 'c' + padNumber(cellX) + padNumber(cellY);
            const cell = document.getElementById(cellId);
            currentFill += cell && cell.textContent ? cell.textContent.trim() : '';
          }
        }
        this.value = currentFill;
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        return;
      }
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
    console.log('[ECW Bridge] Integrated grid overlay input created');
  }

  function positionOverlayInput() {
    if (!overlayInputEl || !integratedGridInputEnabled) return;
    if (typeof CurrentWord === 'undefined' || CurrentWord < 0) {
      hideOverlayInput();
      return;
    }
    const wordIndex = CurrentWord;
    const x = WordX[wordIndex] || 0;
    const y = WordY[wordIndex] || 0;
    const direction = wordIndex <= LastHorizontalWord ? 'across' : 'down';
    const cellId = 'c' + padNumber(x) + padNumber(y);
    const cell = document.getElementById(cellId);
    if (!cell) {
      overlayInputEl.style.visibility = 'hidden';
      return;
    }
    const rect = cell.getBoundingClientRect();
    overlayInputEl.style.top = rect.top + 'px';
    overlayInputEl.style.left = rect.left + 'px';
    overlayInputEl.style.width = rect.width + 'px';
    overlayInputEl.style.height = rect.height + 'px';
    overlayInputEl.style.visibility = 'visible';
    
    let currentFill = '';
    const length = WordLength[wordIndex] || 0;
    for (let i = 0; i < length; i++) {
      const cellX = direction === 'across' ? x + i : x;
      const cellY = direction === 'across' ? y : y + i;
      const cid = 'c' + padNumber(cellX) + padNumber(cellY);
      const c = document.getElementById(cid);
      currentFill += c && c.textContent ? c.textContent.trim() : '';
    }
    overlayInputEl.value = currentFill;
    overlayInputEl.maxLength = length;
    
    try {
      overlayInputEl.focus();
    } catch (_) {}
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
    if (overlayContainerEl) {
      overlayContainerEl.style.pointerEvents = 'none';
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
    
    // Hook into OKClick to track progress and capture cell updates for multiplayer
    // This is the CORRECT way - EclipseCrossword fills cells via innerHTML in OKClick()
    window.OKClick = function() {
      // Call original first to fill cells via innerHTML (EclipseCrossword's way)
      const result = originalOKClick.call(this);
      
      // After cells are filled, capture updates for multiplayer
      if (isMultiplayerMode && typeof multiplayerCallback === 'function') {
        // Get the word that was just filled (CurrentWord is set by SelectThisWord)
        if (typeof CurrentWord !== 'undefined' && CurrentWord >= 0) {
          const x = WordX[CurrentWord];
          const y = WordY[CurrentWord];
          const wordLength = WordLength[CurrentWord];
          const isHorizontal = CurrentWord <= LastHorizontalWord;
          
          // Broadcast each cell update in the word
          for (let i = 0; i < wordLength; i++) {
            const cellX = isHorizontal ? x + i : x;
            const cellY = isHorizontal ? y : y + i;
            const cellId = 'c' + padNumber(cellX) + padNumber(cellY);
            const cell = document.getElementById(cellId);
            
            if (cell) {
              // Get value from innerHTML (how EclipseCrossword stores it)
              const value = cell.innerHTML.trim();
              // Clean up: remove &nbsp; and empty strings
              const cleanValue = (value === '&nbsp;' || value === '' || value === ' ') ? '' : value;
              
              console.log('[ECW Bridge] OKClick: Broadcasting cell update:', cellId, cleanValue);
              multiplayerCallback({
                type: 'cell_update',
                cellId: cellId,
                value: cleanValue,
                timestamp: Date.now()
              });
            }
          }
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
      
      // Setup cell validation listeners
      setTimeout(() => {
        setupCellValidation();
        setupExternalInputTracking();
      }, 500);
      
      // Notify parent that bridge is ready
      setTimeout(notifyBridgeReady, 100);
    } catch (e) {
      // no-op
    }
  }

  // Setup external input tracking
  function setupExternalInputTracking() {
    // Track word selection changes
    const originalSelect = window.SelectThisWord;
    if (originalSelect) {
      window.SelectThisWord = function(event) {
        const result = originalSelect.call(this, event);
        
        if (externalInputEnabled && typeof CurrentWord !== 'undefined' && CurrentWord >= 0) {
          notifyWordSelected();
        } else if (integratedGridInputEnabled && (typeof CurrentWord === 'undefined' || CurrentWord < 0)) {
          hideOverlayInput();
        }
        
        return result;
      };
    }
    
    // Hide overlay when word is deselected
    const originalDeselect = window.DeselectCurrentWord;
    if (originalDeselect) {
      window.DeselectCurrentWord = function() {
        const result = originalDeselect.call(this);
        if (integratedGridInputEnabled) {
          hideOverlayInput();
        }
        return result;
      };
    }
    
    console.log('[ECW Bridge] External input tracking setup complete');
  }

  // Notify parent of word selection
  function notifyWordSelected() {
    try {
      if (typeof CurrentWord === 'undefined' || CurrentWord < 0) return;
      
      const wordIndex = CurrentWord;
      const word = Word[wordIndex] || '';
      const clue = Clue[wordIndex] || '';
      const length = WordLength[wordIndex] || 0;
      const number = wordIndex + 1; // Convert to 1-based
      const direction = wordIndex <= LastHorizontalWord ? 'across' : 'down';
      const x = WordX[wordIndex] || 0;
      const y = WordY[wordIndex] || 0;
      
      // Get current fill
      let currentFill = '';
      for (let i = 0; i < length; i++) {
        const cellX = direction === 'across' ? x + i : x;
        const cellY = direction === 'across' ? y : y + i;
        const cellId = 'c' + padNumber(cellX) + padNumber(cellY);
        const cell = document.getElementById(cellId);
        const value = cell ? (cell.textContent || '').trim() : '';
        currentFill += value || '_';
      }
      
      sendMessage('EC_WORD_SELECTED', {
        word: {
          id: `w-${number}-${direction}`,
          number: number,
          direction: direction,
          clue: clue,
          length: length,
          start: { row: y, col: x },
          currentFill: currentFill,
          indexInWord: 0
        }
      });
      
      if (integratedGridInputEnabled && overlayInputEl) {
        showOverlayInput();
      }
    } catch (e) {
      console.error('[ECW Bridge] Error notifying word selected:', e);
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
      
      // Handler for cell input
      const handleCellInput = function(event) {
        const target = event.target;
        if (!target.id || !target.id.startsWith('c')) return;
        
        const inputLetter = target.textContent?.trim() || '';
        
        // Multiplayer: emit per-keystroke cell update (even for empty cells)
        if (isMultiplayerMode && typeof multiplayerCallback === 'function') {
          console.log('[ECW Bridge] Emitting cell_update:', target.id, inputLetter);
          multiplayerCallback({
            type: 'cell_update',
            cellId: target.id,
            value: inputLetter,
            timestamp: Date.now()
          });
        }
        
        // Skip validation for empty input
        if (!inputLetter) return;
        
        // Validate the letter
        const validation = validateLetter(target.id, inputLetter);
        if (!validation) return;
        
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
      };
      
      // NOTE: EclipseCrossword does NOT use directly editable cells
      // Cells are filled via innerHTML in OKClick(), not through direct input events
      // We hook into OKClick() to capture updates for multiplayer (see initBridge)
      // Direct input event listeners are NOT needed and won't work correctly
      
      console.log('[ECW Bridge] Cell validation setup complete (using OKClick hook for multiplayer)');
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

        case 'EC_ENABLE_EXTERNAL_INPUT':
          if (event.data.data && event.data.data.hideInternal) {
            externalInputEnabled = true;
            externalInputSourceId = event.data.data.sourceId;
            integratedGridInputEnabled = !!(event.data.data.integratedGridInput);
            
            if (integratedGridInputEnabled) {
              createOverlayInput();
              hideInternalAnswerBox();
              console.log('[ECW Bridge] Integrated grid input enabled - overlay created');
            }
            
            if (!integratedGridInputEnabled && typeof window.parent !== 'undefined') {
              setTimeout(() => {
                console.log('[ECW Bridge] External input enabled, sourceId:', externalInputSourceId);
                if (event.data.data.forceHide && event.data.data.verified) {
                  hideInternalAnswerBox();
                  console.log('[ECW Bridge] Answer box hidden after verification');
                }
              }, 1000);
            } else if (!integratedGridInputEnabled) {
              console.warn('[ECW Bridge] External input requested but parent window not available');
            }
          }
          break;

        case 'EC_APPLY_INPUT':
          if (externalInputEnabled && event.data.data) {
            applyExternalInput(event.data.data.value || '', event.data.sourceId);
          }
          break;

        case 'check_puzzle':
          if (typeof window.CheckClick === 'function') {
            window.CheckClick();
          } else if (typeof originalCheckClick === 'function') {
            originalCheckClick.call(window);
          }
          break;

        case 'EC_CLEAR_WORD':
          if (externalInputEnabled) {
            clearCurrentWord();
          }
          break;

        case 'EC_BACKSPACE':
          if (externalInputEnabled) {
            handleExternalBackspace();
          }
          break;

        case 'EC_DISABLE_EXTERNAL_INPUT':
          // Re-enable internal answer box (fallback scenario)
          if (event.data.data && event.data.data.showInternal) {
            externalInputEnabled = false;
            externalInputSourceId = null;
            showInternalAnswerBox();
            console.log('[ECW Bridge] External input disabled, internal answer box restored');
          }
          break;
      }
    }
  });

  // Apply external input to current word
  function applyExternalInput(value, sourceId) {
    try {
      if (typeof CurrentWord === 'undefined' || CurrentWord < 0) return;
      
      const wordIndex = CurrentWord;
      const length = WordLength[wordIndex] || 0;
      const x = WordX[wordIndex] || 0;
      const y = WordY[wordIndex] || 0;
      const direction = wordIndex <= LastHorizontalWord ? 'across' : 'down';
      
      // Fill cells with the value.
      // Do NOT blank trailing cells when `value` is shorter than the word; those cells
      // may hold intersecting letters from other words.
      for (let i = 0; i < length; i++) {
        const cellX = direction === 'across' ? x + i : x;
        const cellY = direction === 'across' ? y : y + i;
        const cellId = 'c' + padNumber(cellX) + padNumber(cellY);
        const cell = document.getElementById(cellId);
        
        if (cell) {
          if (i < value.length) {
            const letter = value[i] || '';
            cell.textContent = letter;
            // Trigger input event for autosave/multiplayer hooks
            const inputEvent = new Event('input', { bubbles: true });
            cell.dispatchEvent(inputEvent);
          }
        }
      }
      
      // Sync wordentry for ECW compatibility (OKClick, CheckClick, etc.)
      const wordEntry = document.getElementById('wordentry');
      if (wordEntry) {
        wordEntry.value = value;
      }
      
      // Update grid state
      updateGridState();
      
      // Notify parent of update
      sendMessage('EC_GRID_UPDATED', {
        sourceId: sourceId,
        updates: value.split('').map((letter, i) => ({
          index: i,
          value: letter
        }))
      });
      
      console.log('[ECW Bridge] Applied external input:', value);
    } catch (e) {
      console.error('[ECW Bridge] Error applying external input:', e);
    }
  }

  // Clear current word
  function clearCurrentWord() {
    try {
      if (typeof CurrentWord === 'undefined' || CurrentWord < 0) return;
      
      const wordIndex = CurrentWord;
      const length = WordLength[wordIndex] || 0;
      const x = WordX[wordIndex] || 0;
      const y = WordY[wordIndex] || 0;
      const direction = wordIndex <= LastHorizontalWord ? 'across' : 'down';
      
      for (let i = 0; i < length; i++) {
        const cellX = direction === 'across' ? x + i : x;
        const cellY = direction === 'across' ? y : y + i;
        const cellId = 'c' + padNumber(cellX) + padNumber(cellY);
        const cell = document.getElementById(cellId);
        
        if (cell) {
          cell.textContent = '';
        }
      }
      
      updateGridState();
      console.log('[ECW Bridge] Cleared current word');
    } catch (e) {
      console.error('[ECW Bridge] Error clearing word:', e);
    }
  }

  // Handle external backspace
  function handleExternalBackspace() {
    try {
      if (typeof CurrentWord === 'undefined' || CurrentWord < 0) return;
      
      const wordIndex = CurrentWord;
      const length = WordLength[wordIndex] || 0;
      const x = WordX[wordIndex] || 0;
      const y = WordY[wordIndex] || 0;
      const direction = wordIndex <= LastHorizontalWord ? 'across' : 'down';
      
      // Find last filled cell and clear it
      for (let i = length - 1; i >= 0; i--) {
        const cellX = direction === 'across' ? x + i : x;
        const cellY = direction === 'across' ? y : y + i;
        const cellId = 'c' + padNumber(cellX) + padNumber(cellY);
        const cell = document.getElementById(cellId);
        
        if (cell && cell.textContent.trim()) {
          cell.textContent = '';
          updateGridState();
          break;
        }
      }
      
      console.log('[ECW Bridge] Handled external backspace');
    } catch (e) {
      console.error('[ECW Bridge] Error handling backspace:', e);
    }
  }
  
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
      cell.style.backgroundColor = 'rgba(59, 130, 246, 0.2)';
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
  // NOTE: Cells are NOT directly editable - input happens via answer box
  // We hook into OKClick() to capture updates for multiplayer
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      initBridge();
      setTimeout(() => {
        calculateOptimalCellSize();
      }, 100);
      observeBottomPanel();
      syncAnswerBoxToGrid();
    });
  } else {
    initBridge();
    setTimeout(() => {
      calculateOptimalCellSize();
    }, 100);
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

  // Disable Solve button by overriding handler
  window.CheatClick = function() { /* no-op */ };

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
          puzzleState.hintsUsed = (puzzleState.hintsUsed || 0) + 1;
          sendMessage('hint_used',{wordIndex:idx,position:i,letter:correct});
          break;
        }
      }
    }catch(e){console.error('revealOneLetter error',e);}
  }

  // Reveal entire word (for word hints)
  function revealWord(wordIndex) {
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
      
      let revealedCount = 0;
      
      // Fill all cells in the word
      for (let i = 0; i < word.length; i++) {
        const cellX = isHorizontal ? wordX + i : wordX;
        const cellY = isHorizontal ? wordY : wordY + i;
        const cellId = 'c' + padNumber(cellX) + padNumber(cellY);
        const cell = document.getElementById(cellId);
        
        if (cell && cell.textContent.trim() === '') {
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
      
      if (revealedCount > 0) {
        puzzleState.hintsUsed = (puzzleState.hintsUsed || 0) + 1;
      }

      sendMessage('word_revealed', {
        wordIndex,
        word: word,
        revealedCount: revealedCount,
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
  window.__ecwRevealLetterMap[puzzleId] = revealOneLetter;

  window.__ecwRevealWordMap = window.__ecwRevealWordMap || {};
  window.__ecwRevealWordMap[puzzleId] = revealWord;
  
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
      if (data.type === 'reveal_letter') {
        revealOneLetter(typeof data.wordIndex === 'number' ? data.wordIndex : undefined);
      } else if (data.type === 'reveal_word') {
        revealWord(typeof data.wordIndex === 'number' ? data.wordIndex : undefined);
      }
    } catch (e) {
      console.error('message handler error', e);
    }
  });
  
})();
