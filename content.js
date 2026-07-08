/**
 * content.js — Crash Auto Collector Content Script
 *
 * This script is injected into the target crash game tab and is responsible
 * for observing DOM changes, capturing game state, and forwarding events to
 * the background service worker.
 *
 * =========================================================================
 * HOW TO ADAPT SELECTORS FOR YOUR CRASH GAME
 * =========================================================================
 *
 * All selectors are defined in the SELECTORS object below.
 * Open DevTools on your target crash game, inspect the live multiplier
 * element, round history rows, countdown timer, etc., then update the
 * corresponding selector strings.
 *
 * Tips:
 *  - Prefer data-* attributes or unique class names over positional selectors
 *  - Use `document.querySelector(selector)` in DevTools console to test
 *  - If the site uses a canvas-only UI, DOM scraping won't work; consider
 *    WebSocket injection (enable WS_INJECTION_ENABLED in background.js)
 *
 * Example (Aviator-style layout):
 *   MULTIPLIER:      '.pf-cashout__coefficient'
 *   HISTORY_ITEMS:   '.history-item__coefficient'
 *   ROUND_STATE:     '.game-state-label'
 *   TIMER:           '.waiting-countdown'
 *   BET_BUTTON:      '[data-testid="bet-button"]'
 * =========================================================================
 */

'use strict';

// ---------------------------------------------------------------------------
// ★ SELECTOR CONFIGURATION — update these for your target crash game ★
// ---------------------------------------------------------------------------
const SELECTORS = {
  // The live multiplier display (e.g. "2.34x")
  // Update this to match the element showing the current multiplier in flight
  MULTIPLIER: [
    '.crash-game__counter', // 1xbet specific
    '.c-crash-game__counter',
    '.crash-game__coef',
    '.c-crash-game__coef',
    '[class*="multiplier"]',
    '[class*="coef"]',
    '[class*="coefficient"]',
    '[class*="odds"]',
    '[data-testid*="multiplier"]',
    '.cashout-multiplier',
    '.bet-multiplier',
    '.current-odd',
    '.crash-value',
    '.game-multiplier',
  ],

  // History list rows — items showing past round results
  // Each element's text should contain a multiplier like "3.21x"
  HISTORY_ITEMS: [
    '.crash-game__history-item', // 1xbet specific
    '.c-crash-game__history-item',
    '.c-crash-history__item',
    '[class*="history"] [class*="item"]',
    '[class*="history"] [class*="coef"]',
    '[class*="history"] [class*="odd"]',
    '[class*="history"] [class*="result"]',
    '[class*="round"] [class*="result"]',
    '.history-item',
    '.round-result',
    '.previous-multiplier',
    'li[class*="history"]',
  ],

  // History container (to watch for new rows being added)
  HISTORY_CONTAINER: [
    '.crash-game__history', // 1xbet specific
    '.c-crash-game__history',
    '[class*="history"]',
    '[class*="results"]',
    '[class*="previous-rounds"]',
    '.rounds-history',
    '.crash-history',
    '.game-history',
  ],

  // Countdown / round timer display
  TIMER: [
    '[class*="timer"]',
    '[class*="countdown"]',
    '[class*="waiting"]',
    '[class*="next-round"]',
    '.round-timer',
    '.countdown',
  ],

  // Round state label (e.g. "Flying", "Crashed", "Waiting")
  ROUND_STATE: [
    '.crash-game__status', // 1xbet specific
    '.c-crash-game__status',
    '[class*="state"]',
    '[class*="status"]',
    '[class*="phase"]',
    '[class*="game-state"]',
    '.round-state',
    '.game-phase',
  ],

  // Bet amount input / display
  BET_AMOUNT: [
    '[class*="bet"] input',
    '[class*="bet-amount"]',
    'input[class*="stake"]',
    'input[placeholder*="bet"]',
    'input[placeholder*="amount"]',
    '.bet-input',
  ],

  // Cashout / auto-cashout text
  CASHOUT: [
    '[class*="cashout"]',
    '[class*="cash-out"]',
    '[class*="autocashout"]',
    '[class*="auto-cashout"]',
    '.cashout-value',
  ],

  // Generic button labels in the game area
  BUTTONS: [
    'button[class*="bet"]',
    'button[class*="cashout"]',
    'button[class*="play"]',
    '[role="button"][class*="bet"]',
  ],

  // Root game area container — used as MutationObserver root
  // Update to the outermost element wrapping the entire game
  GAME_ROOT: [
    '[class*="game"]',
    '[class*="crash"]',
    '[class*="aviator"]',
    '#game',
    '#crash',
    '.game-container',
    '.crash-game',
    'main',
    'body',
  ],
};

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------
const cState = {
  active:         false,
  debug:          false,
  wsEnabled:      false,
  observer:       null,
  flushTimer:     null,
  retryTimer:     null,
  buffer:         [],
  lastMultiplier: null,
  lastMultiplierTime: 0,
  crashDetectorTimer: null,
  lastTimer:      null,
  lastRoundState: null,
  lastHistoryLen: 0,
  roundIndex:     0,
  seenHistory:    new Set(),
  roundLocked:    false,
  roundLockTimer:  null,
};

// ---------------------------------------------------------------------------
// Debug logging
// ---------------------------------------------------------------------------
function log(...args) {
  if (cState.debug) console.log('[CAC Content]', ...args);
}

function warn(...args) {
  console.warn('[CAC Content]', ...args);
}

// ---------------------------------------------------------------------------
// Selector helpers
// ---------------------------------------------------------------------------

/**
 * Try each selector in the array and return the first matching element.
 * Logs which selector succeeded so you can narrow it down.
 */
function queryFirst(selectors, root = document) {
  for (const sel of selectors) {
    try {
      const el = root.querySelector(sel);
      if (el) {
        log(`Selector matched: "${sel}"`);
        return el;
      }
    } catch (_) { /* invalid selector — skip */ }
  }
  return null;
}

/**
 * Try each selector in the array and return all matching elements.
 */
function queryAll(selectors, root = document) {
  for (const sel of selectors) {
    try {
      const els = root.querySelectorAll(sel);
      if (els.length > 0) {
        log(`Selector matched ${els.length} items: "${sel}"`);
        return Array.from(els);
      }
    } catch (_) { /* invalid selector — skip */ }
  }
  return [];
}

/**
 * Get a short DOM path for an element (for the domPath field).
 */
function getDomPath(el) {
  if (!el || !el.tagName) return '';
  const parts = [];
  let cur = el;
  while (cur && cur !== document.body && parts.length < 5) {
    let segment = cur.tagName.toLowerCase();
    if (cur.id) {
      segment += `#${cur.id}`;
    } else if (cur.className && typeof cur.className === 'string') {
      const cls = cur.className.trim().split(/\s+/).slice(0, 2).join('.');
      if (cls) segment += `.${cls}`;
    }
    parts.unshift(segment);
    cur = cur.parentElement;
  }
  return parts.join(' > ');
}

// ---------------------------------------------------------------------------
// Data extraction
// ---------------------------------------------------------------------------

/**
 * Read text from the first matching element.
 */
function readText(selectors, root = document) {
  const el = queryFirst(selectors, root);
  return el ? (el.textContent || el.innerText || '').trim() : null;
}

/**
 * Read all text values from matching elements.
 */
function readAllText(selectors, root = document) {
  return queryAll(selectors, root)
    .map(el => (el.textContent || el.innerText || '').trim())
    .filter(t => t.length > 0);
}

/**
 * Parse a multiplier value from raw text like "2.34x" → 2.34
 */
function parseMultiplier(text) {
  if (!text) return null;
  const match = String(text).match(/(\d+\.?\d*)/);
  return match ? parseFloat(match[1]) : null;
}

/**
 * Take a raw text snapshot from the game area (first 300 chars).
 */
function getRawTextSample() {
  const root = queryFirst(SELECTORS.GAME_ROOT);
  if (!root) return (document.body.textContent || '').trim().slice(0, 300);
  return (root.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 300);
}

// ---------------------------------------------------------------------------
// Event factories
// ---------------------------------------------------------------------------

function makeBaseEvent(overrides = {}) {
  return {
    capturedAt:      new Date().toISOString(),
    pageUrl:         location.href,
    pageTitle:       document.title,
    source:          'dom',
    eventType:       'unknown',
    roundIndex:      cState.roundIndex,
    multiplier:      null,
    multiplierText:  null,
    historyValues:   null,
    currentTimer:    null,
    roundState:      null,
    betAmountText:   null,
    cashoutText:     null,
    autoCashoutText: null,
    buttonLabels:    null,
    visibleLabels:   null,
    rawTextSample:   null,
    rawPayload:      null,
    domPath:         null,
    ...overrides,
  };
}

function fireCrashResult(multiplier, source) {
  if (cState.roundLocked) return; // already fired for this round
  cState.roundLocked = true;

  cState.roundIndex++;
  const event = makeBaseEvent({
    eventType: 'round_result',
    source,
    multiplierText: String(multiplier) + 'x',
    multiplier: parseFloat(multiplier),
  });
  enqueueEvent(event);

  // Unlock after 6s (safe gap between rounds)
  clearTimeout(cState.roundLockTimer);
  cState.roundLockTimer = setTimeout(() => {
    cState.roundLocked = false;
  }, 6000);
}


// ---------------------------------------------------------------------------
// Snapshot helpers — capture current visible state
// ---------------------------------------------------------------------------

function captureMultiplierTick() {
  const text = readText(SELECTORS.MULTIPLIER);
  if (!text) return null;
  if (text === cState.lastMultiplier) return null; // unchanged

  const numVal = parseMultiplier(text);
  const prevNum = parseMultiplier(cState.lastMultiplier);
  
  cState.lastMultiplier = text;
  cState.lastMultiplierTime = Date.now(); // Mark time of change
  const mEl = queryFirst(SELECTORS.MULTIPLIER);

  // If the new multiplier is smaller than the previous one, the previous round just ended!
  if (numVal !== null && prevNum !== null && numVal < prevNum) {
    fireCrashResult(prevNum, 'observer');
    return null;
  }

  return makeBaseEvent({
    eventType:      'multiplier_tick',
    source:         'observer',
    multiplierText: text,
    multiplier:     numVal,
    domPath:        getDomPath(mEl),
  });
}

function captureTimerChange() {
  const text = readText(SELECTORS.TIMER);
  if (!text) return null;
  if (text === cState.lastTimer) return null;

  cState.lastTimer = text;
  return makeBaseEvent({
    eventType:    'timer_change',
    source:       'observer',
    currentTimer: text,
  });
}

function captureRoundStateChange() {
  const text = readText(SELECTORS.ROUND_STATE);
  if (!text) return null;
  if (text === cState.lastRoundState) return null;

  cState.lastRoundState = text;
  const lower = text.toLowerCase();
  let normalisedState = text;
  if (lower.includes('wait') || lower.includes('next'))     normalisedState = 'waiting';
  else if (lower.includes('fly') || lower.includes('crash')) normalisedState = lower.includes('crash') ? 'crashed' : 'flying';

  const isResult = normalisedState === 'crashed';
  const mult     = cState.lastMultiplier;
  const multVal  = parseMultiplier(mult);

  if (isResult) {
    // The user requested a 2-second delay after the crash class is detected
    // to allow the UI to fully settle and the final multiplier to stop moving.
    setTimeout(() => {
      // Re-read the multiplier to get the absolute final frozen value
      const finalMultText = readText(SELECTORS.MULTIPLIER) || mult;
      const finalMultVal = parseMultiplier(finalMultText) || multVal;
      
      fireCrashResult(finalMultVal || 1.0, 'observer_delayed');
    }, 2000);

    // Immediately return just the state change, not the crash result yet
    return makeBaseEvent({
      eventType:      'state_change',
      source:         'observer',
      roundState:     'crashed',
      multiplierText: mult,
      multiplier:     multVal,
    });
  }


  const event = makeBaseEvent({
    eventType:      'state_change',
    source:         'observer',
    roundState:     normalisedState,
    multiplierText: mult,
    multiplier:     multVal,
  });

  return event;
}

function captureHistoryItems() {
  const items = readAllText(SELECTORS.HISTORY_ITEMS);
  if (!items.length) return null;
  if (items.length === cState.lastHistoryLen) return null;

  // Find newly added items
  const newItems = items.filter(t => !cState.seenHistory.has(t));
  if (!newItems.length) return null;

  newItems.forEach(t => cState.seenHistory.add(t));
  cState.lastHistoryLen = items.length;

  return makeBaseEvent({
    eventType:    'history_item',
    source:       'observer',
    historyValues:newItems,
    rawTextSample:newItems.join(', ').slice(0, 200),
  });
}

function captureButtonLabels() {
  const labels = readAllText(SELECTORS.BUTTONS);
  return labels.length ? labels : null;
}

function captureBetInfo() {
  const betEl    = queryFirst(SELECTORS.BET_AMOUNT);
  const cashEl   = queryFirst(SELECTORS.CASHOUT);
  const betText  = betEl ? (betEl.value || betEl.textContent || '').trim() : null;
  const cashText = cashEl ? (cashEl.textContent || '').trim() : null;
  return { betAmountText: betText, cashoutText: cashText };
}

// ---------------------------------------------------------------------------
// Full snapshot — triggered on significant DOM change
// ---------------------------------------------------------------------------

function doFullSnapshot(source = 'observer') {
  const multiplierText = readText(SELECTORS.MULTIPLIER);
  const multiplier     = parseMultiplier(multiplierText);
  const currentTimer   = readText(SELECTORS.TIMER);
  const roundState     = readText(SELECTORS.ROUND_STATE);
  const historyValues  = readAllText(SELECTORS.HISTORY_ITEMS);
  const buttonLabels   = captureButtonLabels();
  const { betAmountText, cashoutText } = captureBetInfo();
  const rawTextSample  = getRawTextSample();

  return makeBaseEvent({
    eventType:      'manual-snapshot',
    source,
    multiplierText,
    multiplier,
    currentTimer,
    roundState,
    historyValues,
    buttonLabels,
    betAmountText,
    cashoutText,
    rawTextSample,
  });
}

// ---------------------------------------------------------------------------
// Event buffer & send
// ---------------------------------------------------------------------------

function enqueueEvent(event) {
  if (!event || !cState.active) return;
  cState.buffer.push(event);

  // Flush crash results to background immediately — don't wait for the 3s timer
  if (event.eventType === 'round_result') {
    flushToBackground();
  }
}

function stopObserver() {
  if (cState.observer) {
    cState.observer.disconnect();
    cState.observer = null;
  }
  if (cState.crashDetectorTimer) {
    clearInterval(cState.crashDetectorTimer);
    cState.crashDetectorTimer = null;
  }
}

function clearTimers() {
  if (cState.flushTimer)  { clearTimeout(cState.flushTimer);  cState.flushTimer  = null; }
  if (cState.retryTimer)  { clearTimeout(cState.retryTimer);  cState.retryTimer  = null; }
  if (cState.roundLockTimer) { clearTimeout(cState.roundLockTimer); cState.roundLockTimer = null; }
  cState.buffer = [];
}

function isContextValid() {
  try {
    // This throws immediately if the context is gone
    return !!chrome.runtime?.id;
  } catch (_) {
    return false;
  }
}

function flushToBackground() {
  if (!cState.buffer.length) return;
  if (!isContextValid()) {
    warn('Extension context invalidated (sync). Stopping. Please refresh the page.');
    stopObserver();
    clearTimers();
    cState.active = false;
    return;
  }

  // ✅ Peek — don't splice yet
  const batch = [...cState.buffer];

  try {
    const sendPromise = chrome.runtime.sendMessage({ type: 'BATCH_EVENTS', events: batch });

    if (sendPromise && typeof sendPromise.then === 'function') {
      sendPromise
        .then(() => {
          // ✅ Only remove items AFTER confirmed delivery
          cState.buffer.splice(0, batch.length);
        })
        .catch(e => {
          warn('Failed to send batch (will retry):', e.message);
          if (
            e.message &&
            (e.message.includes('Extension context invalidated') ||
             e.message.includes('Could not establish connection'))
          ) {
            warn('Extension reloaded — this batch is lost. Refresh the page to reconnect fully.');
            stopObserver();
            clearTimers();
            cState.active = false;
          }
        });
    } else {
      // Synchronous path — assume delivered
      cState.buffer.splice(0, batch.length);
    }
  } catch (err) {
    if (err.message && err.message.includes('Extension context invalidated')) {
      warn('Extension context invalidated (sync). Stopping. Please refresh the page.');
      stopObserver();
      clearTimers();
      cState.active = false;
    } else {
      warn('Failed to send batch (sync error, will retry):', err.message);
    }
  }
}

function throttle(fn, limit) {
  let last = 0;
  return function (...args) {
    const now = Date.now();
    if (now - last >= limit) {
      last = now;
      return fn.apply(this, args);
    }
  };
}

// Debounced full snapshot
let snapshotTimer = null;
function debouncedSnapshot(delay = 600) {
  clearTimeout(snapshotTimer);
  snapshotTimer = setTimeout(() => {
    const snap = doFullSnapshot('observer');
    enqueueEvent(snap);
  }, delay);
}

// Throttled version of capturing multiplier changes
const throttledMultiplierCapture = throttle(() => {
  const ev = captureMultiplierTick();
  if (ev) enqueueEvent(ev);
}, 500); // at most once per 500ms

// ---------------------------------------------------------------------------
// MutationObserver setup
// ---------------------------------------------------------------------------

function setupBetListeners() {
  try {
    const inputs = queryAll(SELECTORS.BET_AMOUNT);
    inputs.forEach(input => {
      if (input.dataset.cacListening) return;
      input.dataset.cacListening = 'true';
      const handler = () => {
        const val = input.value || input.textContent || '';
        if (!val.trim()) return;
        chrome.runtime.sendMessage({
          type: 'BET_AMOUNT_CHANGE',
          amount: val.trim()
        }).catch(() => {});
      };
      input.addEventListener('input', handler);
      input.addEventListener('change', handler);
      // Run immediately
      handler();
    });
  } catch (err) {
    warn('Error setting up bet listeners:', err);
  }
}

function setupObserver() {
  if (cState.observer) {
    cState.observer.disconnect();
    cState.observer = null;
  }

  const root = queryFirst(SELECTORS.GAME_ROOT) || document.body;
  log('Attaching MutationObserver to:', getDomPath(root));

  // Initialize listeners
  setupBetListeners();

  cState.observer = new MutationObserver((mutations) => {
    if (!cState.active) return;

    // Refresh bet listeners in case DOM changed
    setupBetListeners();

    let hasHistoryChange = false;
    let hasMultiplierChange = false;
    let hasStateChange = false;

    for (const mutation of mutations) {
      const target = mutation.target;
      const targetText = (target.className || '') + (target.id || '');

      // Detect what kind of element changed
      if (/history|result|round/i.test(targetText) ||
          mutation.addedNodes.length > 0) {
        hasHistoryChange = true;
      }
      if (/mult|coef|odd|crash/i.test(targetText)) {
        hasMultiplierChange = true;
      }
      if (/state|status|phase/i.test(targetText)) {
        hasStateChange = true;
      }
    }

    // Capture specific changes
    if (hasMultiplierChange) {
      throttledMultiplierCapture();
    }

    if (hasHistoryChange) {
      const ev = captureHistoryItems();
      if (ev) enqueueEvent(ev);

      // Check for round state change (crash detection)
      const stateEv = captureRoundStateChange();
      if (stateEv) enqueueEvent(stateEv);
    }

    if (hasStateChange) {
      const ev = captureRoundStateChange();
      if (ev) enqueueEvent(ev);
    }

    // Timer always ticks
    const timerEv = captureTimerChange();
    if (timerEv) enqueueEvent(timerEv);

    // Debounced full snapshot for any big change
    debouncedSnapshot(800);
  });

  cState.observer.observe(root, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['class', 'data-state', 'data-phase', 'aria-label'],
  });

  log('MutationObserver attached');
}

// ---------------------------------------------------------------------------
// Retry logic — wait for DOM elements to appear
// ---------------------------------------------------------------------------

let retryCount = 0;
const MAX_RETRIES = 30;
const RETRY_INTERVAL = 1000; // ms

function tryStartObserver() {
  const root = queryFirst(SELECTORS.GAME_ROOT);
  if (root) {
    retryCount = 0;
    setupObserver();
    // Take initial snapshot
    const snap = doFullSnapshot('dom');
    enqueueEvent(snap);
    return;
  }

  if (retryCount >= MAX_RETRIES) {
    warn('Could not find game root after', MAX_RETRIES, 'retries. Falling back to body.');
    setupObserver(); // Will use document.body as fallback
    return;
  }

  retryCount++;
  log(`Game root not found, retry ${retryCount}/${MAX_RETRIES}`);
  cState.retryTimer = setTimeout(tryStartObserver, RETRY_INTERVAL);
}

// ---------------------------------------------------------------------------
// WebSocket injection (optional, disabled by default)
// ---------------------------------------------------------------------------

function injectWSListener() {
  // This creates a script element in the PAGE context (not extension context)
  // so it can wrap the native WebSocket constructor.
  // Only works if WS_INJECTION_ENABLED = true in background.js
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('inject.js');
  script.onload = () => {
    log('inject.js loaded into page context');
    script.remove();
  };
  (document.head || document.documentElement).appendChild(script);

  // Listen for messages posted by inject.js
  window.addEventListener('message', (evt) => {
    if (!cState.active) return;
    if (evt.source !== window) return;
    if (!evt.data || evt.data.source !== 'CAC_INJECT') return;

    const event = makeBaseEvent({
      eventType:  'websocket',
      source:     'websocket',
      rawPayload: JSON.stringify(evt.data.payload).slice(0, 1000),
    });
    enqueueEvent(event);
  }, false);
}

// ---------------------------------------------------------------------------
// Start / Stop collection
// ---------------------------------------------------------------------------

function startCollection(config = {}) {
  if (cState.active) return;

  cState.active    = true;
  cState.debug     = !!(config.debug);
  cState.wsEnabled = !!(config.wsEnabled);

  log('Collection started. WS injection:', cState.wsEnabled);

  if (cState.wsEnabled) {
    injectWSListener();
  }

  tryStartObserver();

  // Periodic flush to background
  cState.flushTimer = setInterval(flushToBackground, 3000);

  // Crash staleness detector — if multiplier stops moving for >3500ms, assume crashed
  cState.crashDetectorTimer = setInterval(() => {
    if (!cState.lastMultiplierTime || !cState.lastMultiplier) return;
    const numVal = parseMultiplier(cState.lastMultiplier);
    const stale = Date.now() - cState.lastMultiplierTime > 3500;
    const aboveFloor = numVal && numVal >= 1.01; // ignore 1.00x waiting state
    
    if (aboveFloor && stale) {
      fireCrashResult(numVal, 'staleness_detector'); // use the locked guard
      cState.lastMultiplierTime = 0;
      cState.lastMultiplier = null;
    }
  }, 100); // poll every 100ms for fast detection
}

function stopCollection() {
  cState.active = false;
  log('Collection stopped');

  if (cState.observer) {
    cState.observer.disconnect();
    cState.observer = null;
  }
  if (cState.flushTimer) {
    clearInterval(cState.flushTimer);
    cState.flushTimer = null;
  }
  if (cState.crashDetectorTimer) {
    clearInterval(cState.crashDetectorTimer);
    cState.crashDetectorTimer = null;
  }
  if (cState.retryTimer) {
    clearTimeout(cState.retryTimer);
    cState.retryTimer = null;
  }
  cState.buffer = [];
}

// ---------------------------------------------------------------------------
// Message listener from background
// ---------------------------------------------------------------------------

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg) return;

  switch (msg.type) {
    case 'START_COLLECTION':
      startCollection(msg.config || {});
      sendResponse({ started: true });
      break;

    case 'STOP_COLLECTION':
      stopCollection();
      sendResponse({ stopped: true });
      break;

    case 'SET_DEBUG':
      cState.debug = !!msg.debug;
      sendResponse({ ok: true });
      break;

    case 'PING':
      sendResponse({ alive: true, active: cState.active });
      break;
  }
});

// ── AUTO-START on 1xBet crash page (no popup needed) ──────────────────────
(function autoStart() {
  // Notify background SW that content script is live
  chrome.runtime.sendMessage({ type: 'CONTENT_READY' }).then(response => {
    // If a session is already capturing, the background will reply with capturing: true
    if (response && response.capturing) {
      // Already running — don't double-start
      return;
    }
    // Auto-begin collection immediately
    startCollection({
      wsEnabled: true, // set true if you want WebSocket injection
      debug: false,
    });
    console.log('[CrashCollector] ✅ Auto-started on', location.href);
  }).catch(() => {
    // Background not ready yet — start anyway
    startCollection({ wsEnabled: true, debug: false });
  });
})();

log('Content script loaded on', location.href);

// Self-destruct gracefully when extension reloads
try {
  const _port = chrome.runtime.connect({ name: 'content-keepalive' });
  _port.onDisconnect.addListener(() => {
    warn('Background disconnected — context invalidated. Halting.');
    stopObserver();
    clearTimers();
    cState.active = false;
  });
} catch (err) {
  // Ignore error if context was already dead on load
}
