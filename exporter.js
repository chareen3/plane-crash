/**
 * exporter.js — JSON export helper for Crash Auto Collector
 *
 * Handles assembling a complete export payload from chrome.storage.local
 * and triggering a chrome.downloads.download call.
 *
 * This file can be imported as a module or used as a standalone script.
 * In the current architecture it is called directly from background.js,
 * but the logic is extracted here for testability and reuse.
 *
 * Usage (from background.js):
 *   importScripts('exporter.js');
 *   await CACExporter.export();
 */

'use strict';

const CACExporter = (() => {

  // -------------------------------------------------------------------------
  // Config
  // -------------------------------------------------------------------------

  const STORAGE_KEYS = {
    EVENTS:    'cac_events',
    SUMMARIES: 'cac_summaries',
  };

  const DISCLAIMER =
    'This data was collected for analytics and research purposes only. ' +
    'It does not predict future crash game outcomes. ' +
    'Use responsibly and in accordance with applicable laws and the target site's terms of service.';

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

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

  /**
   * Assemble a round-level summary from a list of raw events.
   * Groups events by roundIndex and builds a derived summary object.
   *
   * @param {Array} events
   * @returns {Array} roundSummaries
   */
  function buildRoundSummaries(events) {
    const rounds = new Map(); // roundIndex → {events[]}

    for (const ev of events) {
      const idx = ev.roundIndex ?? -1;
      if (!rounds.has(idx)) rounds.set(idx, []);
      rounds.get(idx).push(ev);
    }

    const summaries = [];

    for (const [idx, roundEvents] of rounds.entries()) {
      if (idx < 0) continue;

      roundEvents.sort((a, b) => new Date(a.capturedAt) - new Date(b.capturedAt));

      const first = roundEvents[0];
      const last  = roundEvents[roundEvents.length - 1];

      // Find the final multiplier (from a round_result event, or the last multiplier_tick)
      const resultEv = roundEvents.find(e => e.eventType === 'round_result');
      const finalMult = resultEv?.multiplier
        ?? last?.multiplier
        ?? null;

      // Collect unique history values seen during this round
      const historySnapshot = Array.from(
        new Set(
          roundEvents
            .filter(e => e.historyValues)
            .flatMap(e => e.historyValues)
        )
      );

      const startedAt  = first.capturedAt;
      const endedAt    = last.capturedAt;
      const durationMs = endedAt && startedAt
        ? new Date(endedAt) - new Date(startedAt)
        : null;

      summaries.push({
        roundId:         `round_${idx}`,
        roundIndex:      idx,
        startedAt,
        endedAt,
        finalMultiplier: finalMult,
        finalMultiplierText: resultEv?.multiplierText ?? last?.multiplierText ?? null,
        durationMs,
        eventCount:      roundEvents.length,
        historySnapshot,
        notes:           resultEv ? 'round_result captured' : 'inferred from events',
      });
    }

    return summaries.sort((a, b) => a.roundIndex - b.roundIndex);
  }

  /**
   * Chunk a large array into pages and reassemble into one JSON string.
   * Avoids building one massive string all at once for very large exports.
   *
   * @param {Array}  arr
   * @param {number} chunkSize
   * @returns {string} JSON array string
   */
  function chunkedJsonArray(arr, chunkSize = 500) {
    if (!arr.length) return '[]';
    const parts = [];
    for (let i = 0; i < arr.length; i += chunkSize) {
      parts.push(JSON.stringify(arr.slice(i, i + chunkSize)).slice(1, -1));
    }
    return '[' + parts.join(',') + ']';
  }

  // -------------------------------------------------------------------------
  // Main export function
  // -------------------------------------------------------------------------

  async function exportToFile() {
    // Load raw events from storage
    const stored  = await chrome.storage.local.get([STORAGE_KEYS.EVENTS, STORAGE_KEYS.SUMMARIES]);
    const events  = stored[STORAGE_KEYS.EVENTS]    || [];
    const storedSummaries = stored[STORAGE_KEYS.SUMMARIES] || [];

    if (events.length === 0) {
      return { success: false, error: 'No events to export. Start capture first.' };
    }

    // Derive round summaries from raw events
    const derivedSummaries = buildRoundSummaries(events);
    // Merge with any separately stored summaries
    const allSummaries = [...storedSummaries, ...derivedSummaries].filter(
      (s, i, arr) => arr.findIndex(x => x.roundId === s.roundId) === i
    );

    const meta = {
      exportedAt:    new Date().toISOString(),
      version:       '1.0.0',
      disclaimer:    DISCLAIMER,
      totalEvents:   events.length,
      totalRounds:   allSummaries.length,
    };

    // Build JSON in chunks to support large datasets
    const eventsJson    = chunkedJsonArray(events, 500);
    const summariesJson = chunkedJsonArray(allSummaries, 200);

    const jsonString = [
      '{',
      `"exportedAt": ${JSON.stringify(meta.exportedAt)},`,
      `"version": ${JSON.stringify(meta.version)},`,
      `"disclaimer": ${JSON.stringify(meta.disclaimer)},`,
      `"totalEvents": ${meta.totalEvents},`,
      `"totalRounds": ${meta.totalRounds},`,
      `"events": ${eventsJson},`,
      `"roundSummaries": ${summariesJson}`,
      '}',
    ].join('\n');

    // Create a Blob and trigger download
    const blob     = new Blob([jsonString], { type: 'application/json' });
    const url      = URL.createObjectURL(blob);
    const filename = `crash-auto-collector-${fileTimestamp()}.json`;

    await chrome.downloads.download({
      url,
      filename,
      saveAs: false,
    });

    // Revoke after a short delay to allow download to start
    setTimeout(() => URL.revokeObjectURL(url), 10000);

    return {
      success:  true,
      filename,
      events:   events.length,
      rounds:   allSummaries.length,
      sizeBytes: new TextEncoder().encode(jsonString).length,
    };
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------
  return {
    export:            exportToFile,
    buildRoundSummaries,
    chunkedJsonArray,
    fileTimestamp,
  };

})();

// Make available to service worker
if (typeof globalThis !== 'undefined') {
  globalThis.CACExporter = CACExporter;
}
