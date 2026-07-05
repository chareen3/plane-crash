/**
 * utils.js — Shared utility helpers for Crash Auto Collector
 *
 * Includes: fingerprint generation, formatting, throttling,
 * debouncing, ID generation, and storage helpers.
 */

'use strict';

// ---------------------------------------------------------------------------
// ID & Fingerprint
// ---------------------------------------------------------------------------

/**
 * Generate a short random unique ID (16 hex chars).
 */
function generateId() {
  return Array.from(crypto.getRandomValues(new Uint8Array(8)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Build a stable fingerprint from the most reliable identifying fields.
 * Used to deduplicate events that describe the same game moment.
 *
 * @param {Object} data – partial event fields
 * @returns {string} fingerprint string
 */
function buildFingerprint(data) {
  // Bucket timestamp to 2-second windows to tolerate slight timing variance
  const tsBucket = data.capturedAt
    ? Math.floor(new Date(data.capturedAt).getTime() / 2000)
    : 0;

  const parts = [
    tsBucket,
    normaliseMultiplier(data.multiplier || data.multiplierText || ''),
    (data.roundState || '').toLowerCase().trim(),
    (data.source || '').toLowerCase().trim(),
    (data.eventType || '').toLowerCase().trim(),
  ];

  return parts.join('|');
}

/**
 * Normalise a multiplier value to a comparable string.
 * E.g. "2.34x" → "2.34", 2.34 → "2.34"
 */
function normaliseMultiplier(raw) {
  if (raw === null || raw === undefined) return '';
  const s = String(raw).replace(/[^0-9.]/g, '');
  const n = parseFloat(s);
  return isNaN(n) ? '' : n.toFixed(2);
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

/**
 * Format bytes into a human-readable string.
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Format elapsed seconds as HH:MM:SS.
 */
function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
}

/**
 * ISO timestamp for now.
 */
function nowISO() {
  return new Date().toISOString();
}

/**
 * Filename-safe timestamp: YYYY-MM-DD-HH-mm-ss
 */
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

// ---------------------------------------------------------------------------
// Function control helpers
// ---------------------------------------------------------------------------

/**
 * Throttle – call fn at most once per `limit` ms.
 */
function throttle(fn, limit) {
  let lastCall = 0;
  return function (...args) {
    const now = Date.now();
    if (now - lastCall >= limit) {
      lastCall = now;
      return fn.apply(this, args);
    }
  };
}

/**
 * Debounce – call fn only after `delay` ms of silence.
 */
function debounce(fn, delay) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// ---------------------------------------------------------------------------
// Storage key constants
// ---------------------------------------------------------------------------
const STORAGE_KEYS = {
  EVENTS: 'cac_events',
  SUMMARIES: 'cac_summaries',
  CAPTURE_STATE: 'cac_capture_state',
  SESSION_START: 'cac_session_start',
  DEBUG_MODE: 'cac_debug_mode',
  STATS: 'cac_stats',
};

// ---------------------------------------------------------------------------
// Debug logger
// ---------------------------------------------------------------------------

const Logger = {
  _debug: false,

  setDebug(val) {
    this._debug = !!val;
  },

  log(...args) {
    if (this._debug) console.log('[CAC]', ...args);
  },

  warn(...args) {
    console.warn('[CAC]', ...args);
  },

  error(...args) {
    console.error('[CAC]', ...args);
  },
};

// ---------------------------------------------------------------------------
// Exports (used as globals in non-module scripts via window assignment)
// ---------------------------------------------------------------------------

// These are exported as window properties so they work in both content
// scripts (plain JS) and background service workers.
if (typeof window !== 'undefined') {
  window.CACUtils = {
    generateId,
    buildFingerprint,
    normaliseMultiplier,
    formatBytes,
    formatDuration,
    nowISO,
    fileTimestamp,
    throttle,
    debounce,
    STORAGE_KEYS,
    Logger,
  };
}

// Also allow direct usage in service workers via globalThis
if (typeof globalThis !== 'undefined') {
  globalThis.CACUtils = {
    generateId,
    buildFingerprint,
    normaliseMultiplier,
    formatBytes,
    formatDuration,
    nowISO,
    fileTimestamp,
    throttle,
    debounce,
    STORAGE_KEYS,
    Logger,
  };
}
