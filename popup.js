/**
 * popup.js — Crash Auto Collector popup controller
 *
 * Responsibilities:
 *  - Render and update the popup UI
 *  - Communicate with background.js via chrome.runtime.sendMessage
 *  - Display a live event feed
 *  - Drive export / clear / debug actions
 */

'use strict';

// ---------------------------------------------------------------------------
// DOM references
// ---------------------------------------------------------------------------
const $ = id => document.getElementById(id);

const els = {
  statusDot:       $('status-dot'),
  statusText:      $('status-text'),
  statusPill:      $('status-pill'),
  sessionTimer:    $('session-timer'),
  statRounds:      $('stat-rounds'),
  statEvents:      $('stat-events'),
  badgeCount:      $('badge-count'),
  heroMultiplier:  $('hero-multiplier'),
  heroTime:        $('hero-time'),
  btnStart:        $('btn-start'),
  btnStop:         $('btn-stop'),
  btnExport:       $('btn-export'),
  btnClear:        $('btn-clear'),
  btnDebug:        $('btn-debug'),
  liveFeed:        $('live-feed'),
  feedCount:       $('feed-count'),
  heroLabel:       $('hero-label'),
};

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let timerInterval = null;
let sessionStartMs = null;
let feedEntries = [];
const MAX_FEED_ENTRIES = 60;
let debugMode = false;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
}

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function sendMessage(msg) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(msg, response => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response);
      }
    });
  });
}

// ---------------------------------------------------------------------------
// Timer
// ---------------------------------------------------------------------------

function startTimer(startMs) {
  sessionStartMs = startMs;
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - sessionStartMs) / 1000);
    els.sessionTimer.textContent = formatDuration(elapsed);
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
  els.sessionTimer.textContent = '00:00:00';
}

// ---------------------------------------------------------------------------
// UI State
// ---------------------------------------------------------------------------

function setCapturing(isCapturing, sessionStart) {
  if (isCapturing) {
    els.statusPill.className = 'status-pill active';
    els.statusText.textContent = 'Live';
    els.btnStart.disabled = true;
    els.btnStop.disabled = false;
    if (sessionStart) startTimer(sessionStart);
  } else {
    els.statusPill.className = 'status-pill idle';
    els.statusText.textContent = 'Idle';
    els.btnStart.disabled = false;
    els.btnStop.disabled = true;
    stopTimer();
  }
}

function updateStats(stats) {
  if (!stats) return;
  els.statRounds.textContent  = stats.rounds ?? 0;
  els.statEvents.textContent  = stats.totalEvents ?? 0;
  els.badgeCount.textContent  = stats.totalEvents ?? 0;

}

// ---------------------------------------------------------------------------
// Live feed
// ---------------------------------------------------------------------------

function addFeedEntry(event) {
  // Remove empty placeholder
  const empty = els.liveFeed.querySelector('.feed-empty');
  if (empty) empty.remove();

  const isResult = event.eventType === 'round_result';
  const entry = document.createElement('div');
  entry.className = `feed-entry${isResult ? ' result' : ''}`;

  const timeStr = new Date(event.capturedAt || Date.now())
    .toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const multVal = event.multiplier ?? null;
  const multDisplay = multVal ? multVal.toFixed(2) + 'x' : (event.multiplierText || '—');

  // Colour code multiplier
  let multClass = '';
  if (multVal !== null) {
    if (multVal < 1.5) multClass = 'low';
    else if (multVal >= 5) multClass = 'high';
  }

  const typeLabel = isResult ? '💥 Crash' : (event.eventType || 'event').replace(/_/g, ' ');

  entry.innerHTML = `
    <span class="entry-multiplier ${multClass}">${isResult ? multDisplay : '·'}</span>
    <div class="entry-info">
      <div class="entry-type">${typeLabel}</div>
      <div class="entry-time">${timeStr}</div>
    </div>
    <span class="entry-dot"></span>
  `;

  // Prepend newest at top
  els.liveFeed.insertBefore(entry, els.liveFeed.firstChild);

  // Trim old entries
  feedEntries.push(entry);
  if (feedEntries.length > MAX_FEED_ENTRIES) {
    const old = feedEntries.shift();
    old.remove();
  }

  els.feedCount.textContent = `${feedEntries.length} events`;
}

// ---------------------------------------------------------------------------
// Init — load persisted state on popup open
// ---------------------------------------------------------------------------

async function init() {
  try {
    // Load debug mode
    const { cac_debug_mode } = await chrome.storage.local.get('cac_debug_mode');
    debugMode = !!cac_debug_mode;
    if (debugMode) els.btnDebug.classList.add('active');

    // Ask background for current status
    const status = await sendMessage({ type: 'GET_STATUS' });
    if (status) {
      setCapturing(status.capturing, status.sessionStart);
      updateStats(status.stats);
    }

    // Load last few feed entries from storage for continuity
    const { cac_events } = await chrome.storage.local.get('cac_events');
    if (cac_events && cac_events.length) {
      const recent = cac_events.slice(-20);
      // Add in reverse so newest appears on top
      for (let i = recent.length - 1; i >= 0; i--) {
        addFeedEntry(recent[i]);
      }
    }
  } catch (e) {
    console.warn('[CAC Popup] init error:', e);
  }
}

// ---------------------------------------------------------------------------
// Button handlers
// ---------------------------------------------------------------------------

els.btnStart.addEventListener('click', async () => {
  els.btnStart.disabled = true;
  try {
    // Get the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      alert('No active tab found.');
      els.btnStart.disabled = false;
      return;
    }

    const resp = await sendMessage({ type: 'START_CAPTURE', tabId: tab.id, tabUrl: tab.url });
    if (resp && resp.success) {
      setCapturing(true, resp.sessionStart);
    } else {
      alert(resp?.error || 'Failed to start capture.');
      els.btnStart.disabled = false;
    }
  } catch (e) {
    console.error('[CAC Popup] start error:', e);
    alert('Error: ' + e.message);
    els.btnStart.disabled = false;
  }
});

els.btnStop.addEventListener('click', async () => {
  els.btnStop.disabled = true;
  try {
    const resp = await sendMessage({ type: 'STOP_CAPTURE' });
    if (resp && resp.success) {
      setCapturing(false);
    }
  } catch (e) {
    console.error('[CAC Popup] stop error:', e);
  }
  els.btnStop.disabled = false;
});

els.btnExport.addEventListener('click', async () => {
  els.btnExport.disabled = true;
  try {
    const resp = await sendMessage({ type: 'EXPORT_DATA' });
    if (resp && !resp.success) {
      alert(resp.error || 'Export failed.');
    }
  } catch (e) {
    alert('Export error: ' + e.message);
  }
  els.btnExport.disabled = false;
});

els.btnClear.addEventListener('click', async () => {
  if (!confirm('Clear all collected data? This cannot be undone.')) return;
  try {
    const resp = await sendMessage({ type: 'CLEAR_DATA' });
    if (resp && resp.success) {
      feedEntries = [];
      els.liveFeed.innerHTML = `
        <div class="feed-empty">
          <div class="feed-empty-icon">📡</div>
          <p>Start capture to see live events</p>
        </div>`;
      els.feedCount.textContent = '0 events';
      updateStats({ rounds: 0, totalEvents: 0, storedBytes: 0 });
      els.heroMultiplier.textContent = '—';
      els.heroTime.textContent = 'Waiting for crash...';
    }
  } catch (e) {
    console.error('[CAC Popup] clear error:', e);
  }
});

els.btnDebug.addEventListener('click', async () => {
  debugMode = !debugMode;
  els.btnDebug.classList.toggle('active', debugMode);
  await chrome.storage.local.set({ cac_debug_mode: debugMode });
  await sendMessage({ type: 'SET_DEBUG', debug: debugMode });
});

// ---------------------------------------------------------------------------
// Live message listener — receive events pushed from background
// ---------------------------------------------------------------------------

chrome.runtime.onMessage.addListener((msg) => {
  if (!msg) return;

  switch (msg.type) {
    case 'NEW_EVENT':
      addFeedEntry(msg.event);
      updateStats(msg.stats);
      break;

    case 'LIVE_TICK':
      els.heroMultiplier.textContent = msg.multiplierText || '—';
      els.heroTime.textContent = msg.state === 'active' ? 'Flying...' : 'Idle';
      els.heroMultiplier.style.color = '#38bdf8'; // light blue
      if (els.heroLabel) els.heroLabel.textContent = 'Live Round';
      if (els.heroLabel) els.heroLabel.style.color = '#38bdf8';
      break;

    case 'TIMER_TICK':
      els.heroTime.textContent = 'Next round: ' + (msg.timerText || 'waiting');
      if (els.heroLabel && els.heroLabel.textContent !== 'Round Crashed') {
        els.heroLabel.textContent = 'Waiting';
        els.heroLabel.style.color = '#94a3b8';
        els.heroMultiplier.style.color = '#94a3b8';
      }
      break;

    case 'STATS_UPDATE':
      updateStats(msg.stats);
      break;

    case 'CAPTURE_STOPPED':
      setCapturing(false);
      break;
  }
});

// ---------------------------------------------------------------------------
// Poll stats periodically while popup is open
// ---------------------------------------------------------------------------
setInterval(async () => {
  try {
    const status = await sendMessage({ type: 'GET_STATUS' });
    if (status) updateStats(status.stats);
  } catch (_) { /* popup may close */ }
}, 3000);

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', init);
