/**
 * background.js — Crash Auto Collector Service Worker
 *
 * Responsibilities:
 *  - Orchestrate capture sessions across tabs
 *  - Inject / manage content scripts
 *  - Aggregate events from content scripts
 *  - Flush in-memory buffer to chrome.storage.local
 *  - Drive badge updates
 *  - Respond to popup requests
 *  - Trigger JSON export via chrome.downloads
 */

'use strict';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const CONFIG = {
  /** Auto-flush buffer every N ms */
  FLUSH_INTERVAL_MS: 5000,
  /** Also flush when buffer reaches this size */
  FLUSH_BATCH_SIZE: 20,
  /** Max events kept in storage (rolling window) */
  MAX_STORED_EVENTS: 5000,
  /** Enable WebSocket injection feature (disabled by default) */
  WS_INJECTION_ENABLED: false,
  /** Storage key prefix */
  KEY_PREFIX: 'cac_',
};

const STORAGE_KEYS = {
  EVENTS:        'cac_events',
  SUMMARIES:     'cac_summaries',
  CAPTURE_STATE: 'cac_capture_state',
  SESSION_START: 'cac_session_start',
  DEBUG_MODE:    'cac_debug_mode',
  STATS:         'cac_stats',
};

// ---------------------------------------------------------------------------
// In-memory state
// ---------------------------------------------------------------------------

const state = {
  capturing: false,
  tabId: null,
  tabUrl: null,
  sessionStart: null,
  buffer: [],          // unsaved events
  seenFingerprints: new Set(),
  debugMode: false,
  stats: {
    rounds: 0,
    lastMultiplier: '—',
    totalEvents: 0,
    storedBytes: 0,
  },
};

let flushTimer = null;

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------

function log(...args) {
  if (state.debugMode) console.log('[CAC BG]', ...args);
}

function warn(...args) {
  console.warn('[CAC BG]', ...args);
}

// ---------------------------------------------------------------------------
// Fingerprint helpers
// ---------------------------------------------------------------------------

function buildFingerprint(data) {
  const tsBucket = data.capturedAt
    ? Math.floor(new Date(data.capturedAt).getTime() / 2000)
    : 0;
  const multiplier = String(data.multiplier || data.multiplierText || '')
    .replace(/[^0-9.]/g, '');
  return [
    tsBucket,
    multiplier,
    (data.roundState || '').toLowerCase().trim(),
    (data.source || '').toLowerCase().trim(),
    (data.eventType || '').toLowerCase().trim(),
  ].join('|');
}

function generateId() {
  return Array.from(crypto.getRandomValues(new Uint8Array(8)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function fileTimestamp() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return [
    d.getFullYear(),
    pad(d.getMonth() + 1),
    pad(d.getDate()),
  ].join('-') + '-' + [
    pad(d.getHours()),
    pad(d.getMinutes()),
    pad(d.getSeconds()),
  ].join('-');
}

function formatBytes(bytes) {
  if (!bytes) return 0;
  return bytes;
}

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------

async function loadEvents() {
  const data = await chrome.storage.local.get(STORAGE_KEYS.EVENTS);
  return data[STORAGE_KEYS.EVENTS] || [];
}

async function saveEvents(events) {
  await chrome.storage.local.set({ [STORAGE_KEYS.EVENTS]: events });
}

async function loadSummaries() {
  const data = await chrome.storage.local.get(STORAGE_KEYS.SUMMARIES);
  return data[STORAGE_KEYS.SUMMARIES] || [];
}

async function saveSummaries(summaries) {
  await chrome.storage.local.set({ [STORAGE_KEYS.SUMMARIES]: summaries });
}

async function updateStoredStats() {
  const events = await loadEvents();
  const raw = JSON.stringify(events);
  state.stats.totalEvents = events.length;
  state.stats.storedBytes = new TextEncoder().encode(raw).length;
  await chrome.storage.local.set({ [STORAGE_KEYS.STATS]: state.stats });
}

// ---------------------------------------------------------------------------
// Badge
// ---------------------------------------------------------------------------

function updateBadge(count) {
  const label = count > 999 ? '999+' : String(count);
  chrome.action.setBadgeText({ text: label });
  chrome.action.setBadgeBackgroundColor({ color: '#4f8ef7' });
}

// ---------------------------------------------------------------------------
// Buffer & flush
// ---------------------------------------------------------------------------

function startFlushTimer() {
  stopFlushTimer();
  flushTimer = setInterval(flushBuffer, CONFIG.FLUSH_INTERVAL_MS);
}

function stopFlushTimer() {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
}

async function flushBuffer() {
  if (state.buffer.length === 0) return;

  const toSave = state.buffer.splice(0, state.buffer.length);
  log(`Flushing ${toSave.length} events to storage`);

  try {
    let events = await loadEvents();
    events = events.concat(toSave);

    // Rolling window — drop oldest if over limit
    if (events.length > CONFIG.MAX_STORED_EVENTS) {
      events = events.slice(events.length - CONFIG.MAX_STORED_EVENTS);
    }

    await saveEvents(events);
    await updateStoredStats();
    updateBadge(events.length);

    // Broadcast stats to any open popups
    broadcastToPopup({ type: 'STATS_UPDATE', stats: state.stats });

    // --- NEW: Post to Dashboard API ---
    await postToDashboard(toSave);

  } catch (e) {
    warn('flushBuffer error:', e);
    // Put events back
    state.buffer.unshift(...toSave);
  }
}

async function postToDashboard(events) {
  try {
    // Only post actual round results (final crash points) to the dashboard
    const completedRounds = events.filter(e => e.eventType === 'round_result' && typeof e.multiplier === 'number');
    if (completedRounds.length === 0) return;

    const payload = completedRounds.map(e => ({
      id: e.roundIndex !== null ? String(e.roundIndex) : e.id, // Use roundIndex if available, otherwise id
      crashPoint: e.multiplier,
      crashTime: e.capturedAt
    }));

    await fetch('http://localhost:3000/api/rounds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    log(`Posted ${payload.length} rounds to dashboard`);
  } catch (err) {
    warn('Dashboard POST failed:', err);
  }
}

// ---------------------------------------------------------------------------
// Event ingestion
// ---------------------------------------------------------------------------

function ingestEvent(rawEvent) {
  if (!state.capturing) return;

  const event = {
    id:             generateId(),
    capturedAt:     rawEvent.capturedAt || new Date().toISOString(),
    pageUrl:        rawEvent.pageUrl    || state.tabUrl || '',
    pageTitle:      rawEvent.pageTitle  || '',
    source:         rawEvent.source     || 'dom',
    eventType:      rawEvent.eventType  || 'unknown',
    roundIndex:     rawEvent.roundIndex ?? null,
    multiplier:     rawEvent.multiplier ?? null,
    multiplierText: rawEvent.multiplierText || null,
    historyValues:  rawEvent.historyValues  || null,
    currentTimer:   rawEvent.currentTimer   || null,
    roundState:     rawEvent.roundState     || null,
    betAmountText:  rawEvent.betAmountText  || null,
    cashoutText:    rawEvent.cashoutText    || null,
    autoCashoutText:rawEvent.autoCashoutText|| null,
    buttonLabels:   rawEvent.buttonLabels   || null,
    visibleLabels:  rawEvent.visibleLabels  || null,
    rawTextSample:  rawEvent.rawTextSample  || null,
    rawPayload:     rawEvent.rawPayload     || null,
    domPath:        rawEvent.domPath        || null,
    fingerprint:    null,
    roundSummary:   rawEvent.roundSummary   || null,
  };

  // Build fingerprint and dedup
  const fp = buildFingerprint(event);
  event.fingerprint = fp;

  if (state.seenFingerprints.has(fp)) {
    log('Duplicate event suppressed:', fp);
    return;
  }
  state.seenFingerprints.add(fp);

  // Trim fingerprint set to avoid unbounded growth
  if (state.seenFingerprints.size > 10000) {
    const iter = state.seenFingerprints.values();
    for (let i = 0; i < 2000; i++) {
      state.seenFingerprints.delete(iter.next().value);
    }
  }

  // Update live stats
  state.stats.totalEvents++;
  if (event.eventType === 'round_result' || event.eventType === 'history_item') {
    state.stats.rounds++;
  }
  if (event.multiplierText) {
    state.stats.lastMultiplier = event.multiplierText;
  } else if (event.multiplier !== null) {
    state.stats.lastMultiplier = `${event.multiplier}x`;
  }

  state.buffer.push(event);
  log('Event ingested:', event.eventType, event.fingerprint);

  // Broadcast to popup
  broadcastToPopup({ type: 'NEW_EVENT', event, stats: { ...state.stats } });

  // Auto-flush if batch size reached
  if (state.buffer.length >= CONFIG.FLUSH_BATCH_SIZE) {
    flushBuffer();
  }
}

// ---------------------------------------------------------------------------
// Popup communication
// ---------------------------------------------------------------------------

function broadcastToPopup(msg) {
  chrome.runtime.sendMessage(msg).catch(() => {
    // Popup may not be open — that's fine
  });
}

// ---------------------------------------------------------------------------
// Content script management
// ---------------------------------------------------------------------------

async function injectContentScript(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      files: ['content.js'],
    });
    log('Content script injected into tab (all frames)', tabId);

    // Brief delay to let content script initialise
    await delay(300);

    // Tell content script to start
    await chrome.tabs.sendMessage(tabId, {
      type: 'START_COLLECTION',
      config: {
        wsEnabled: CONFIG.WS_INJECTION_ENABLED,
        debug: state.debugMode,
      },
    });
  } catch (e) {
    warn('Failed to inject content script:', e.message);
  }
}

async function stopContentScript(tabId) {
  if (!tabId) return;
  try {
    await chrome.tabs.sendMessage(tabId, { type: 'STOP_COLLECTION' });
  } catch (_) { /* tab may be closed */ }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Capture session control
// ---------------------------------------------------------------------------

async function startCapture(tabId, tabUrl) {
  if (state.capturing) {
    await stopCapture();
  }

  state.capturing  = true;
  state.tabId      = tabId;
  state.tabUrl     = tabUrl;
  state.sessionStart = Date.now();
  state.buffer     = [];
  // Don't reset seenFingerprints to avoid re-ingesting on reconnect

  await chrome.storage.local.set({
    [STORAGE_KEYS.CAPTURE_STATE]: true,
    [STORAGE_KEYS.SESSION_START]: state.sessionStart,
  });

  startFlushTimer();
  await injectContentScript(tabId);

  log('Capture started for tab', tabId, tabUrl);
  return { success: true, sessionStart: state.sessionStart };
}

async function stopCapture() {
  state.capturing = false;
  stopFlushTimer();
  await flushBuffer(); // final flush

  if (state.tabId) {
    await stopContentScript(state.tabId);
    state.tabId = null;
  }

  await chrome.storage.local.set({ [STORAGE_KEYS.CAPTURE_STATE]: false });
  log('Capture stopped');
  return { success: true };
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

async function exportData() {
  try {
    // Final flush first
    await flushBuffer();

    const events    = await loadEvents();
    const summaries = await loadSummaries();

    if (events.length === 0) {
      return { success: false, error: 'No data to export.' };
    }

    const exportObj = {
      exportedAt:    new Date().toISOString(),
      version:       '1.0.0',
      totalEvents:   events.length,
      totalSummaries:summaries.length,
      disclaimer:    'This data was collected for analytics/research only. It does not predict future game outcomes.',
      events,
      roundSummaries: summaries,
    };

    const json     = JSON.stringify(exportObj, null, 2);
    const blob     = new Blob([json], { type: 'application/json' });
    const url      = URL.createObjectURL(blob);
    const filename = `crash-auto-collector-${fileTimestamp()}.json`;

    await chrome.downloads.download({
      url,
      filename,
      saveAs: false,
    });

    log('Exported', events.length, 'events to', filename);
    return { success: true, filename, count: events.length };
  } catch (e) {
    warn('Export error:', e);
    return { success: false, error: e.message };
  }
}

// ---------------------------------------------------------------------------
// Clear
// ---------------------------------------------------------------------------

async function clearData() {
  state.buffer = [];
  state.seenFingerprints.clear();
  state.stats = { rounds: 0, lastMultiplier: '—', totalEvents: 0, storedBytes: 0 };

  await chrome.storage.local.remove([
    STORAGE_KEYS.EVENTS,
    STORAGE_KEYS.SUMMARIES,
    STORAGE_KEYS.STATS,
  ]);

  updateBadge(0);
  log('Data cleared');
  return { success: true };
}

// ---------------------------------------------------------------------------
// Message router
// ---------------------------------------------------------------------------

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || !msg.type) return;

  const tabId = sender.tab?.id;

  // Handle async via a wrapper
  (async () => {
    switch (msg.type) {

      // ---- Popup → Background ----
      case 'START_CAPTURE':
        return startCapture(msg.tabId, msg.tabUrl);

      case 'STOP_CAPTURE':
        return stopCapture();

      case 'EXPORT_DATA':
        return exportData();

      case 'CLEAR_DATA':
        return clearData();

      case 'GET_STATUS':
        return {
          capturing:    state.capturing,
          sessionStart: state.sessionStart,
          stats:        { ...state.stats },
        };

      case 'SET_DEBUG':
        state.debugMode = !!msg.debug;
        await chrome.storage.local.set({ [STORAGE_KEYS.DEBUG_MODE]: state.debugMode });
        // Propagate to content script
        if (state.tabId) {
           chrome.tabs.sendMessage(state.tabId, { type: 'SET_DEBUG', debug: state.debugMode }).catch(() => {});
        }
        return { success: true };




      // ---- Content → Background ----
      case 'CAPTURE_EVENT':
        ingestEvent(msg.event || msg);
        return { received: true };

      case 'BATCH_EVENTS':
        if (Array.isArray(msg.events)) {
          msg.events.forEach(e => ingestEvent(e));
        }
        return { received: true };

      case 'CONTENT_READY':
        log('Content script ready in tab', tabId);
        return { capturing: state.capturing };

      case 'CONTENT_RECONNECT':
        // Content script reloaded — resend START if we're capturing
        if (state.capturing && tabId === state.tabId) {
          chrome.tabs.sendMessage(tabId, {
            type: 'START_COLLECTION',
            config: { wsEnabled: CONFIG.WS_INJECTION_ENABLED, debug: state.debugMode },
          }).catch(() => {});
        }
        return { capturing: state.capturing };

      default:
        return null;
    }
  })().then(sendResponse).catch(e => {
    warn('Message handler error:', e);
    sendResponse({ error: e.message });
  });

  return true; // Keep channel open for async response
});

// ---------------------------------------------------------------------------
// Tab events — detect navigation/reload of captured tab
// ---------------------------------------------------------------------------

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (!state.capturing || tabId !== state.tabId) return;

  if (changeInfo.status === 'complete') {
    log('Captured tab navigated/reloaded, re-injecting content script');
    await delay(800); // Wait for page to stabilise
    await injectContentScript(tabId);
    state.tabUrl = tab.url;
  }
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  if (state.capturing && tabId === state.tabId) {
    log('Captured tab closed — stopping capture');
    await stopCapture();
    broadcastToPopup({ type: 'CAPTURE_STOPPED' });
  }
});

// ---------------------------------------------------------------------------
// Service Worker activation — restore state
// ---------------------------------------------------------------------------

self.addEventListener('activate', async () => {
  const data = await chrome.storage.local.get([
    STORAGE_KEYS.CAPTURE_STATE,
    STORAGE_KEYS.SESSION_START,
    STORAGE_KEYS.DEBUG_MODE,
    STORAGE_KEYS.STATS,
  ]);

  state.debugMode    = !!data[STORAGE_KEYS.DEBUG_MODE];
  state.capturing    = !!data[STORAGE_KEYS.CAPTURE_STATE];
  state.sessionStart = data[STORAGE_KEYS.SESSION_START] || null;

  if (data[STORAGE_KEYS.STATS]) {
    Object.assign(state.stats, data[STORAGE_KEYS.STATS]);
  }

  if (state.capturing) {
    log('Service worker reactivated — resuming flush timer');
    startFlushTimer();
  }

  // Restore badge
  updateBadge(state.stats.totalEvents || 0);
});

// Initial badge update on install/load
chrome.storage.local.get(STORAGE_KEYS.STATS).then(data => {
  const stats = data[STORAGE_KEYS.STATS];
  if (stats) {
    Object.assign(state.stats, stats);
    updateBadge(stats.totalEvents || 0);
  }
});

// ---------------------------------------------------------------------------
// Inject Draggable Widget on Extension Icon Click
// ---------------------------------------------------------------------------
chrome.action.onClicked.addListener(async (tab) => {
  if (tab && tab.id) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['widget.js']
      });
      log('Injected widget.js into tab', tab.id);
    } catch (e) {
      warn('Failed to inject widget.js:', e);
    }
  }
});

log('Background service worker initialised');
