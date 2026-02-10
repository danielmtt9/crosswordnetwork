/**
 * Utility to inject the iframe bridge script into puzzle documents
 * 
 * This ensures that puzzles can communicate with the parent frame
 * even if they weren't originally designed for it.
 */

/**
 * Inject the iframe bridge script into a document
 */
export function injectBridgeScript(doc: Document): void {
  const scriptId = 'crossword-iframe-bridge';
  
  // Check if script is already injected
  if (doc.getElementById(scriptId)) {
    console.log('[injectBridgeScript] Bridge script already present');
    return;
  }

  // Create script element
  const script = doc.createElement('script');
  script.id = scriptId;
  script.src = '/scripts/iframe-bridge.js';
  script.async = false; // Load synchronously to ensure it runs before other scripts
  
  // Add error handling
  script.onerror = () => {
    console.error('[injectBridgeScript] Failed to load iframe bridge script');
  };
  
  script.onload = () => {
    console.log('[injectBridgeScript] Bridge script loaded successfully');
  };

  // Inject at the beginning of body or head
  if (doc.body) {
    doc.body.insertBefore(script, doc.body.firstChild);
  } else if (doc.head) {
    doc.head.appendChild(script);
  } else {
    console.error('[injectBridgeScript] Cannot inject script: no body or head element');
  }
}

/**
 * Inject inline bridge script (for when external file is not available)
 */
export function injectInlineBridgeScript(doc: Document): void {
  const scriptId = 'crossword-iframe-bridge-inline';
  
  // Check if script is already injected
  if (doc.getElementById(scriptId)) {
    console.log('[injectInlineBridgeScript] Bridge script already present');
    return;
  }

  // Create script element with inline code
  const script = doc.createElement('script');
  script.id = scriptId;
  script.textContent = `
    // Minimal inline bridge for highlight support
    (function() {
      console.log('[IframeBridge] Inline bridge initializing...');
      
      const CONFIG = {
        ACROSS_COLOR: 'rgba(59, 130, 246, 0.15)',
        DOWN_COLOR: 'rgba(168, 85, 247, 0.15)',
        TRANSITION_MS: 200,
      };
      
      let highlightedCells = new Set();
      let channelId = null;
      
      function findCell(row, col) {
        // EclipseCrossword uses ids like c{xxx}{yyy} where x=col, y=row.
        function padNumber(n) {
          if (n < 10) return '00' + n;
          if (n < 100) return '0' + n;
          return '' + n;
        }

        const ecwId = 'c' + padNumber(col) + padNumber(row);
        const ecwEl = document.getElementById(ecwId);
        if (ecwEl) return ecwEl;

        const selectors = [
          \`[data-row="\${row}"][data-col="\${col}"]\`,
          \`[data-cell="\${row}-\${col}"]\`,
          \`#cell-\${row}-\${col}\`,
        ];
        
        for (const sel of selectors) {
          const el = document.querySelector(sel);
          if (el) return el;
        }
        return null;
      }
      
      function highlightCell(el, dir) {
        const color = dir === 'across' ? CONFIG.ACROSS_COLOR : CONFIG.DOWN_COLOR;
        if (!el.dataset.originalBg) {
          el.dataset.originalBg = el.style.backgroundColor || '';
        }
        el.style.transition = \`background-color \${CONFIG.TRANSITION_MS}ms ease\`;
        el.style.backgroundColor = color;
        el.dataset.highlighted = dir;
      }
      
      function unhighlightCell(el) {
        el.style.backgroundColor = el.dataset.originalBg || '';
        delete el.dataset.highlighted;
        setTimeout(() => {
          delete el.dataset.originalBg;
        }, CONFIG.TRANSITION_MS);
      }
      
      function clearAll() {
        highlightedCells.forEach(key => {
          const [r, c] = key.split(',').map(Number);
          const el = findCell(r, c);
          if (el) unhighlightCell(el);
        });
        highlightedCells.clear();
      }
      
      function triggerAnimation(animationType, targetSelector, duration, removeAfter = true) {
        const elements = document.querySelectorAll(targetSelector);
        if (!elements.length) {
          console.warn('[IframeBridge] No elements found for selector:', targetSelector);
          return;
        }
        
        const animationClass = \`ecw-animate-\${animationType}\`;
        
        elements.forEach(el => {
          // Add animation class
          el.classList.add(animationClass);
          
          // Setup removal handler
          const handleAnimationEnd = (event) => {
            if (event.target === el && removeAfter) {
              el.classList.remove(animationClass);
              el.removeEventListener('animationend', handleAnimationEnd);
            }
          };
          
          if (removeAfter) {
            el.addEventListener('animationend', handleAnimationEnd);
            
            // Fallback timeout in case animationend doesn't fire
            const fallbackDuration = duration || 1000;
            setTimeout(() => {
              el.classList.remove(animationClass);
              el.removeEventListener('animationend', handleAnimationEnd);
            }, fallbackDuration + 100);
          }
        });
      }
      
      window.addEventListener('message', (e) => {
        const msg = e.data;
        if (!msg?.type || !msg?.channelId) return;
        
        if (!channelId) channelId = msg.channelId;
        if (msg.channelId !== channelId) return;
        
        if (msg.type === 'HIGHLIGHT_CELLS') {
          requestAnimationFrame(() => {
            clearAll();
            msg.payload.cells.forEach(cell => {
              const key = \`\${cell.row},\${cell.col}\`;
              highlightedCells.add(key);
              const el = findCell(cell.row, cell.col);
              if (el) highlightCell(el, msg.payload.direction);
            });
          });
        } else if (msg.type === 'CLEAR_HIGHLIGHT') {
          requestAnimationFrame(clearAll);
        } else if (msg.type === 'FOCUS_CLUE') {
          // EclipseCrossword: map clueNumber + direction => wordIndex, then click first cell to select it.
          requestAnimationFrame(() => {
            try {
              const clueNumber = msg.payload?.clueNumber;
              const direction = msg.payload?.direction;
              if (typeof clueNumber !== 'number' || (direction !== 'across' && direction !== 'down')) return;

              if (typeof WordX === 'undefined' || typeof WordY === 'undefined' || typeof LastHorizontalWord === 'undefined') return;
              if (!Array.isArray(WordX) || !Array.isArray(WordY)) return;

              const wordCount = Math.min(WordX.length, WordY.length);
              const lastHoriz = Number(LastHorizontalWord);

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
                const x0 = WordX[targetIndex];
                const y0 = WordY[targetIndex];
                const first = findCell(y0, x0);
                if (first) {
                  first.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
                  first.focus?.();
                  first.click?.();
                }
              }
            } catch (err) {
              console.warn('[IframeBridge] FOCUS_CLUE failed:', err);
            }
          });
        } else if (msg.type === 'TRIGGER_ANIMATION') {
          requestAnimationFrame(() => {
            const { animationType, targetSelector, duration, remove } = msg.payload;
            triggerAnimation(animationType, targetSelector, duration, remove !== false);
          });
        }
      });
      
      console.log('[IframeBridge] Inline bridge ready');
    })();
  `;

  // Inject the script
  if (doc.body) {
    doc.body.insertBefore(script, doc.body.firstChild);
  } else if (doc.head) {
    doc.head.appendChild(script);
  }
  
  console.log('[injectInlineBridgeScript] Inline bridge script injected');
}

/**
 * Smart injection: tries external script first, falls back to inline
 */
export function injectBridgeScriptSmart(doc: Document): Promise<void> {
  return new Promise((resolve) => {
    const scriptId = 'crossword-iframe-bridge';
    
    // Check if already injected
    if (doc.getElementById(scriptId) || doc.getElementById('crossword-iframe-bridge-inline')) {
      resolve();
      return;
    }

    // Try external script first
    const script = doc.createElement('script');
    script.id = scriptId;
    script.src = '/scripts/iframe-bridge.js';
    script.async = false;
    
    let resolved = false;
    
    script.onload = () => {
      if (!resolved) {
        resolved = true;
        console.log('[injectBridgeScriptSmart] External script loaded');
        resolve();
      }
    };
    
    script.onerror = () => {
      if (!resolved) {
        resolved = true;
        console.warn('[injectBridgeScriptSmart] External script failed, using inline fallback');
        script.remove();
        injectInlineBridgeScript(doc);
        resolve();
      }
    };
    
    // Timeout fallback
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        console.warn('[injectBridgeScriptSmart] External script timeout, using inline fallback');
        script.remove();
        injectInlineBridgeScript(doc);
        resolve();
      }
    }, 2000);
    
    // Inject
    if (doc.body) {
      doc.body.insertBefore(script, doc.body.firstChild);
    } else if (doc.head) {
      doc.head.appendChild(script);
    } else {
      resolved = true;
      console.error('[injectBridgeScriptSmart] Cannot inject: no body or head');
      resolve();
    }
  });
}

/**
 * Inject EclipseCrossword bridge script for puzzle input support
 * This provides the __enableMultiplayer callback
 */
export function injectEclipseCrosswordBridge(doc: Document): Promise<void> {
  return new Promise((resolve) => {
    const scriptId = 'eclipsecrossword-bridge';
    
    // Check if already injected
    if (doc.getElementById(scriptId)) {
      console.log('[injectEclipseCrosswordBridge] Bridge script already present');
      resolve();
      return;
    }

    // Try external script first
    const script = doc.createElement('script');
    script.id = scriptId;
    script.src = '/scripts/eclipsecrossword-bridge.js';
    script.async = false;
    
    let resolved = false;
    
    script.onload = () => {
      if (!resolved) {
        resolved = true;
        console.log('[injectEclipseCrosswordBridge] External script loaded');
        // Give bridge time to initialize
        setTimeout(resolve, 100);
      }
    };
    
    script.onerror = () => {
      if (!resolved) {
        resolved = true;
        console.warn('[injectEclipseCrosswordBridge] External script failed, bridge may not be available');
        // Still resolve - fallback will be used
        resolve();
      }
    };
    
    // Timeout fallback
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        console.warn('[injectEclipseCrosswordBridge] External script timeout');
        resolve();
      }
    }, 3000);
    
    // Inject at the beginning of body or head
    if (doc.body) {
      doc.body.insertBefore(script, doc.body.firstChild);
    } else if (doc.head) {
      doc.head.appendChild(script);
    } else {
      resolved = true;
      console.error('[injectEclipseCrosswordBridge] Cannot inject: no body or head');
      resolve();
    }
  });
}
