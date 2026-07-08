/**
 * content.js — Crash Auto Collector Content Script
 *
 * This script is injected into the target crash game tab and is responsible
 * for observing DOM changes, capturing game state, and forwarding events to
 * the background service worker.
 */

'use strict';

// ---------------------------------------------------------------------------
// ★ SELECTOR CONFIGURATION ★
// ---------------------------------------------------------------------------
const SELECTORS = {
  // The live multiplier display (e.g. "2.34x")
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
    '[class*="crash"]',
    '[class*="state"]',
    '[class*="status"]',
  ],

  // History list rows — items showing past round results
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
    '[class*="history"]',
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
    '[class*="crash"]',
    '[class*="coef"]',
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
  
  // State machine fields
  currentRoundId: null,
  roundActive: false,
  latestLiveMultiplier: null,
  latestHistoryTopValue: null,
  lastSavedRoundId: null,
  lastSavedMultiplier: null,
  pendingFinalizeTimer: null,

  // Backward compatibility fields
  lastMultiplier: null,
  lastMultiplierTime: 0,
  crashDetectorTimer: null,
  lastTimer:      null,
  lastRoundState: null,
  lastHistoryLen: 0,
  roundIndex:     0,
  seenHistory:    new Set(),
};

let pendingFinalize = null;

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
 * Logs which selector succeeded if debug mode is active.
 */
function queryFirst(selectors, root = document, label = 'element') {
  for (const sel of selectors) {
    try {
      const el = root.querySelector(sel);
      if (el) {
        if (cState.debug) {
          console.log(`[CAC Content] [Selector Match] ${label} resolved using: "${sel}"`);
        }
        return el;
      }
    } catch (_) { /* invalid selector — skip */ }
  }
  return null;
}

/**
 * Try each selector in the array and return all matching elements.
 */
function queryAll(selectors, root = document, label = 'elements') {
  for (const sel of selectors) {
    try {
      const els = root.querySelectorAll(sel);
      if (els.length > 0) {
        if (cState.debug) {
          console.log(`[CAC Content] [Selector Match] ${label} resolved using: "${sel}" (found ${els.length})`);
        }
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
function readText(selectors, root = document, label = 'element') {
  const el = queryFirst(selectors, root, label);
  return el ? (el.textContent || el.innerText || '').trim() : null;
}

/**
 * Read all text values from matching elements.
 */
function readAllText(selectors, root = document, label = 'elements') {
  return queryAll(selectors, root, label)
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
  const root = queryFirst(SELECTORS.GAME_ROOT, document, 'Game Root');
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

// ---------------------------------------------------------------------------
// State Machine Operations
// ---------------------------------------------------------------------------

function triggerRoundStart(roundId = null) {
  if (cState.roundActive && roundId && cState.currentRoundId === roundId) {
    return;
  }

  console.log('[CAC Content] round start', { roundId, previousRoundId: cState.currentRoundId });
  cState.roundActive = true;
  if (roundId) {
    cState.currentRoundId = roundId;
  }
  cState.latestLiveMultiplier = null;

  if (cState.pendingFinalizeTimer) {
    clearTimeout(cState.pendingFinalizeTimer);
    cState.pendingFinalizeTimer = null;
  }
}

function queueFinalize(source, crashPoint, roundId = null, confidence = 'medium', rawPayload = null) {
  if (roundId !== null && cState.lastSavedRoundId === roundId) {
    console.log(`[CAC Content] finalize skipped due to duplicate round_id: ${roundId}`);
    return;
  }

  if (pendingFinalize) {
    const prevConf = getConfidenceRank(pendingFinalize.confidence);
    const newConf = getConfidenceRank(confidence);
    if (newConf < prevConf) {
      console.log(`[CAC Content] Ignored lower confidence finalize candidate (${confidence}) since a higher one (${pendingFinalize.confidence}) is pending.`);
      return;
    }
  }

  console.log(`[CAC Content] Queueing finalize candidate from ${source} with confidence ${confidence}: ${crashPoint}x`);

  if (cState.pendingFinalizeTimer) {
    clearTimeout(cState.pendingFinalizeTimer);
  }

  pendingFinalize = { source, crashPoint, roundId, confidence, rawPayload };

  // 600ms debounce window
  cState.pendingFinalizeTimer = setTimeout(() => {
    cState.pendingFinalizeTimer = null;
    const item = pendingFinalize;
    pendingFinalize = null;
    if (item) {
      executeFinalize(item.source, item.crashPoint, item.roundId, item.confidence, item.rawPayload);
    }
  }, 600);
}

function getConfidenceRank(conf) {
  if (conf === 'high') return 3;
  if (conf === 'medium') return 2;
  return 1; // 'low'
}

function executeFinalize(source, crashPoint, roundId = null, confidence = 'medium', rawPayload = null) {
  if (crashPoint === null || crashPoint === undefined || isNaN(crashPoint) || crashPoint <= 1.0) {
    console.log('[CAC Content] finalize rejected due to missing valid multiplier');
    return;
  }

  if (roundId !== null && cState.lastSavedRoundId === roundId) {
    console.log(`[CAC Content] finalize skipped due to duplicate round_id: ${roundId}`);
    return;
  }

  const now = Date.now();
  const timeBucket = Math.floor(now / 5000);
  const roundedMult = Math.round(crashPoint * 10);
  const fingerprint = `${roundedMult}|${timeBucket}`;

  if (!roundId && cState.lastSavedMultiplier === crashPoint && (now - cState.lastMultiplierTime < 5000)) {
    console.log(`[CAC Content] finalize skipped due to duplicate stable fingerprint: ${fingerprint}`);
    return;
  }

  console.log(`[CAC Content] finalize accepted: ${crashPoint}x via ${source} (confidence: ${confidence})`);

  cState.roundActive = false;
  cState.lastSavedRoundId = roundId;
  cState.lastSavedMultiplier = crashPoint;
  cState.lastMultiplier = null;
  cState.lastMultiplierTime = 0;

  const event = makeBaseEvent({
    eventType: 'round_result',
    source: source === 'ws' ? 'ws' : (source === 'history' ? 'history' : 'dom-fallback'),
    round_id: roundId || null,
    multiplier: crashPoint,
    multiplierText: crashPoint.toFixed(2) + 'x',
    round_state: 'crashed',
    capture_confidence: confidence,
    raw_payload: rawPayload,
    capturedAt: new Date().toISOString(),
    roundIndex: cState.roundIndex
  });

  enqueueEvent(event);
  cState.roundIndex++;
}

// ---------------------------------------------------------------------------
// Snapshot helpers — capture current visible state
// ---------------------------------------------------------------------------

function captureMultiplierTick() {
  const text = readText(SELECTORS.MULTIPLIER, document, 'Multiplier Display');
  if (!text) return null;
  if (text === cState.lastMultiplier) return null;

  const numVal = parseMultiplier(text);
  const prevNum = parseMultiplier(cState.lastMultiplier);
  
  cState.lastMultiplier = text;
  cState.lastMultiplierTime = Date.now(); // Mark time of change
  const mEl = queryFirst(SELECTORS.MULTIPLIER, document, 'Multiplier Display');

  if (numVal && numVal > 1.00) {
    if (!cState.roundActive) {
      triggerRoundStart();
    }
    cState.latestLiveMultiplier = numVal;
    log(`live tick updates: ${numVal}x`);
  }

  // --- Real-time update for Popup/Sidebar UI ---
  chrome.runtime.sendMessage({
    type: 'LIVE_TICK',
    multiplierText: text,
    multiplier: numVal,
    state: cState.roundActive ? 'active' : 'idle'
  }).catch(() => {});
  // ---------------------------------------------

  // Detect multiplier reset/decrease as a fallback crash signal
  if (numVal !== null && prevNum !== null && numVal < prevNum) {
    console.log(`[CAC Content] Multiplier decrease detected: ${prevNum}x -> ${numVal}x`);
    queueFinalize('dom-fallback', prevNum, null, 'low');
    triggerRoundStart();
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
  const text = readText(SELECTORS.TIMER, document, 'Timer Display');
  if (!text) return null;
  if (text === cState.lastTimer) return null;

  cState.lastTimer = text;
  
  // If the timer starts ticking, we expect the upcoming round
  if (text) {
    triggerRoundStart();
  }

  // --- Real-time update for Popup/Sidebar UI ---
  chrome.runtime.sendMessage({
    type: 'TIMER_TICK',
    timerText: text
  }).catch(() => {});
  // ---------------------------------------------

  return makeBaseEvent({
    eventType:    'timer_change',
    source:       'observer',
    currentTimer: text,
  });
}

function captureRoundStateChange() {
  const text = readText(SELECTORS.ROUND_STATE, document, 'State Container');
  if (!text) return null;
  if (text === cState.lastRoundState) return null;

  cState.lastRoundState = text;
  const lower = text.toLowerCase();
  let normalisedState = text;
  if (lower.includes('wait') || lower.includes('next'))     normalisedState = 'waiting';
  else if (lower.includes('fly') || lower.includes('crash')) normalisedState = lower.includes('crash') ? 'crashed' : 'flying';

  log(`Round state changed: ${normalisedState}`);

  if (normalisedState === 'flying' || normalisedState === 'waiting') {
    triggerRoundStart();
  }

  if (normalisedState === 'crashed') {
    const topHistoryText = readText(SELECTORS.HISTORY_ITEMS, document, 'History List');
    const topHistoryVal = parseMultiplier(topHistoryText);
    const finalVal = topHistoryVal !== null ? topHistoryVal : cState.latestLiveMultiplier;
    
    if (finalVal !== null) {
      queueFinalize('dom-fallback', finalVal, null, 'low');
    }
  }

  return makeBaseEvent({
    eventType:      'state_change',
    source:         'observer',
    roundState:     normalisedState,
    multiplierText: cState.lastMultiplier,
    multiplier:     parseMultiplier(cState.lastMultiplier),
  });
}

function captureHistoryItems() {
  const items = readAllText(SELECTORS.HISTORY_ITEMS, document, 'History List');
  if (!items.length) return null;
  
  const topItemText = items[0];
  const topValue = parseMultiplier(topItemText);
  
  if (topValue !== null && topValue !== cState.latestHistoryTopValue) {
    console.log(`[CAC Content] history top changed: previous=${cState.latestHistoryTopValue}, new=${topValue}`);
    cState.latestHistoryTopValue = topValue;
    
    if (cState.roundActive) {
      queueFinalize('history', topValue, null, 'medium');
    }
  }

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
  const labels = readAllText(SELECTORS.BUTTONS, document, 'Buttons');
  return labels.length ? labels : null;
}

function captureBetInfo() {
  const betEl    = queryFirst(SELECTORS.BET_AMOUNT, document, 'Stake Input');
  const cashEl   = queryFirst(SELECTORS.CASHOUT, document, 'Cashout Button');
  const betText  = betEl ? (betEl.value || betEl.textContent || '').trim() : null;
  const cashText = cashEl ? (cashEl.textContent || '').trim() : null;
  return { betAmountText: betText, cashoutText: cashText };
}

// ---------------------------------------------------------------------------
// Full snapshot — triggered on significant DOM change
// ---------------------------------------------------------------------------

function doFullSnapshot(source = 'observer') {
  const multiplierText = readText(SELECTORS.MULTIPLIER, document, 'Multiplier Display');
  const multiplier     = parseMultiplier(multiplierText);
  const currentTimer   = readText(SELECTORS.TIMER, document, 'Timer Display');
  const roundState     = readText(SELECTORS.ROUND_STATE, document, 'State Container');
  const historyValues  = readAllText(SELECTORS.HISTORY_ITEMS, document, 'History List');
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

function flushToBackground() {
  if (!cState.buffer.length) return;
  const batch = cState.buffer.splice(0, cState.buffer.length);

  chrome.runtime.sendMessage({ type: 'BATCH_EVENTS', events: batch })
    .catch(e => {
      warn('Failed to send batch:', e.message);
      // Re-enqueue if background is not reachable yet
      cState.buffer.unshift(...batch);
    });
}

// Throttled version of capturing multiplier changes
const throttledMultiplierCapture = throttle(() => {
  const ev = captureMultiplierTick();
  if (ev) enqueueEvent(ev);
}, 500); // at most once per 500ms

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

// ---------------------------------------------------------------------------
// MutationObserver setup
// ---------------------------------------------------------------------------

function setupBetListeners() {
  try {
    const inputs = queryAll(SELECTORS.BET_AMOUNT, document, 'Stake Input');
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

  const root = queryFirst(SELECTORS.GAME_ROOT, document, 'Game Root') || document.body;
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
  const root = queryFirst(SELECTORS.GAME_ROOT, document, 'Game Root');
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
// WebSocket injection
// ---------------------------------------------------------------------------

function injectWSListener() {
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

    if (evt.data.type === 'ws_round_start') {
      triggerRoundStart(evt.data.round_id);
    } else if (evt.data.type === 'ws_round_end') {
      console.log(`[CAC Content] websocket finish candidate: round_id=${evt.data.round_id}, crash_point=${evt.data.crash_point}`);
      queueFinalize('ws', evt.data.crash_point, evt.data.round_id, 'high', evt.data.rawPayload);
    }

    const event = makeBaseEvent({
      eventType:  'websocket',
      source:     'websocket',
      rawPayload: evt.data.payload ? JSON.stringify(evt.data.payload).slice(0, 1000) : null,
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
  window.__CAC_DEBUG__ = cState.debug;

  log('Collection started. WS injection:', cState.wsEnabled);

  if (cState.wsEnabled) {
    injectWSListener();
  }

  tryStartObserver();

  // Periodic flush to background
  cState.flushTimer = setInterval(flushToBackground, 3000);

  // Crash staleness detector — if multiplier stops moving for >2000ms, assume crashed
  cState.crashDetectorTimer = setInterval(() => {
    if (!cState.lastMultiplierTime || !cState.lastMultiplier) return;
    
    const numVal = parseMultiplier(cState.lastMultiplier);
    if (numVal && numVal > 1.00 && (Date.now() - cState.lastMultiplierTime > 2000)) {
      console.log(`[CAC Content] Staleness crash detected: ${numVal}`);
      queueFinalize('dom-fallback', numVal, null, 'low');
      
      // Reset so it doesn't fire twice for the same pause
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
      window.__CAC_DEBUG__ = cState.debug;
      sendResponse({ ok: true });
      break;

    case 'PING':
      sendResponse({ alive: true, active: cState.active });
      break;
  }
});

// ── AUTO-START on 1xBet crash page (no popup needed) ──────────────────────
(function autoStart() {
  chrome.runtime.sendMessage({ type: 'CONTENT_READY' }).then(response => {
    if (response && response.capturing) {
      return;
    }
    startCollection({
      wsEnabled: response ? !!response.wsEnabled : true,
      debug: response ? !!response.debug : false,
    });
    console.log('[CrashCollector] ✅ Auto-started on', location.href);
  }).catch(() => {
    startCollection({ wsEnabled: true, debug: false });
  });
})();

log('Content script loaded on', location.href);
