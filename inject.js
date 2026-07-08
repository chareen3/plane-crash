/**
 * inject.js — Page-context WebSocket observer
 *
 * This script is injected into the PAGE context (not the extension context)
 * so it can intercept native WebSocket messages that are otherwise invisible
 * to content scripts.
 *
 * How it works:
 *  1. Wraps the native WebSocket constructor
 *  2. Listens for 'message' events on each socket
 *  3. Posts captured payloads to the content script via window.postMessage
 *     with the source identifier "CAC_INJECT"
 *
 * The content script (content.js) listens for those window messages and
 * forwards them to the background service worker.
 */

(function () {
  'use strict';

  // Guard against double-injection
  if (window.__CAC_WS_INJECTED__) return;
  window.__CAC_WS_INJECTED__ = true;

  const OriginalWebSocket = window.WebSocket;

  /**
   * Post a captured payload back to the content script context.
   */
  function postCapture(payload) {
    window.postMessage(
      {
        source:  'CAC_INJECT',
        payload: payload,
      },
      '*'
    );
  }

  /**
   * Recursively inspect properties of a parsed JSON object to detect
   * round start or round end candidates.
   */
  function inspectPayload(payload) {
    if (!payload) return null;
    
    let roundId = null;
    let crashPoint = null;
    let isCrash = false;
    let isStart = false;
    
    function walk(obj) {
      if (!obj || typeof obj !== 'object') return;
      
      for (const key in obj) {
        if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
        const val = obj[key];
        const keyLower = key.toLowerCase();
        
        // Look for round ID
        if (['round_id', 'roundid', 'game_id', 'gameid', 'round_number', 'roundnumber'].includes(keyLower)) {
          if (val !== null && val !== undefined) {
            roundId = String(val);
          }
        } else if (keyLower === 'id' && (typeof val === 'number' || typeof val === 'string')) {
          if (typeof val === 'string' || val > 1000) {
            roundId = String(val);
          }
        }
        
        // Look for multiplier / crash point
        if (['multiplier', 'crash_point', 'crashpoint', 'point', 'coef', 'coefficient', 'value', 'odds', 'rate'].includes(keyLower)) {
          if (typeof val === 'number') {
            crashPoint = val;
          } else if (typeof val === 'string') {
            const parsed = parseFloat(val);
            if (!isNaN(parsed)) crashPoint = parsed;
          }
        }
        
        // Look for crash event indicator
        if (['state', 'status', 'phase', 'event', 'type', 'target', 'method'].includes(keyLower) && typeof val === 'string') {
          const valLower = val.toLowerCase();
          if (['crash', 'crashed', 'gameover', 'game_over', 'finish', 'finished', 'ended', 'oncrash'].some(kw => valLower.includes(kw))) {
            isCrash = true;
          }
          if (['start', 'started', 'fly', 'flying', 'waiting', 'new_round', 'newround'].some(kw => valLower.includes(kw))) {
            isStart = true;
          }
        }
        
        if (typeof val === 'object') {
          walk(val);
        }
      }
    }
    
    walk(payload);
    
    // Also scan the string representation for keywords
    try {
      const stringified = JSON.stringify(payload).toLowerCase();
      if (stringified.includes('oncrash') || stringified.includes('crashed') || stringified.includes('gameover') || stringified.includes('game_over')) {
        isCrash = true;
      }
      if (stringified.includes('onstart') || stringified.includes('new_round') || stringified.includes('flightstart')) {
        isStart = true;
      }
    } catch (_) {}
    
    return { roundId, crashPoint, isCrash, isStart };
  }

  /**
   * Wrapped WebSocket constructor — intercepts all socket connections
   * opened by the page.
   */
  class WrappedWebSocket extends OriginalWebSocket {
    constructor(url, protocols) {
      super(url, protocols);

      const urlStr = String(url);
      const isRelevant = /game|crash|aviator|ws|socket|bet/i.test(urlStr);

      if (!isRelevant) return;

      postCapture({ type: 'ws_connected', url: urlStr });

      const processPayload = (parsedPayload) => {
        if (parsedPayload && typeof parsedPayload === 'object') {
          const info = inspectPayload(parsedPayload);
          if (info) {
            if (info.isCrash && info.crashPoint !== null) {
              if (window.__CAC_DEBUG__) {
                console.log('[CAC Inject] WebSocket round-end candidate detected:', info);
              }
              postCapture({
                type: 'ws_round_end',
                round_id: info.roundId,
                crash_point: info.crashPoint,
                rawPayload: parsedPayload,
                ts: Date.now()
              });
            } else if (info.isStart) {
              if (window.__CAC_DEBUG__) {
                console.log('[CAC Inject] WebSocket round-start candidate detected:', info);
              }
              postCapture({
                type: 'ws_round_start',
                round_id: info.roundId,
                rawPayload: parsedPayload,
                ts: Date.now()
              });
            }
          }
        }

        postCapture({
          type:    'ws_message',
          url:     urlStr,
          payload: parsedPayload,
          ts:      Date.now(),
        });
      };

      this.addEventListener('message', (evt) => {
        let data = evt.data;

        if (typeof data === 'string') {
          let parsed = null;
          try {
            parsed = JSON.parse(data);
          } catch (_) {
            parsed = data;
          }
          processPayload(parsed);
        } else if (data instanceof ArrayBuffer) {
          try {
            const text = new TextDecoder('utf-8').decode(data);
            let parsed = null;
            try {
              parsed = JSON.parse(text);
            } catch (_) {
              parsed = text;
            }
            processPayload(parsed);
          } catch (_) {
            const view = new Uint8Array(data);
            processPayload({ type: 'binary', bytes: Array.from(view.slice(0, 64)) });
          }
        } else if (data instanceof Blob) {
          data.text().then(text => {
            let parsed = null;
            try {
              parsed = JSON.parse(text);
            } catch (_) {
              parsed = text;
            }
            processPayload(parsed);
          }).catch(() => {});
        }
      });

      this.addEventListener('close', (evt) => {
        postCapture({ type: 'ws_closed', url: urlStr, code: evt.code });
      });

      this.addEventListener('error', () => {
        postCapture({ type: 'ws_error', url: urlStr });
      });
    }
  }

  // Replace global WebSocket with our wrapper
  window.WebSocket = WrappedWebSocket;

  console.log('[CAC Inject] WebSocket observer active');
})();
