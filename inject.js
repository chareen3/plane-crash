/**
 * inject.js — Page-context WebSocket observer (OPTIONAL / DISABLED BY DEFAULT)
 *
 * This script is injected into the PAGE context (not the extension context)
 * so it can intercept native WebSocket messages that are otherwise invisible
 * to content scripts.
 *
 * IMPORTANT:
 *  - This feature is DISABLED by default (WS_INJECTION_ENABLED = false in background.js)
 *  - Enable only if the target site already sends WebSocket data that contains
 *    round results you want to capture.
 *  - Enabling this may violate some sites' Terms of Service. Use responsibly.
 *  - This does NOT decode encrypted traffic; it only reads data the site
 *    already receives in readable form in the browser.
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
   * Wrapped WebSocket constructor — intercepts all socket connections
   * opened by the page.
   */
  class WrappedWebSocket extends OriginalWebSocket {
    constructor(url, protocols) {
      super(url, protocols);

      // Only capture WS connections that look game-related.
      // Adjust this URL filter to match your target site's WebSocket endpoint.
      // Examples:
      //   /game/, /crash/, /aviator/, /ws/, /socket/
      const urlStr = String(url);
      const isRelevant = /game|crash|aviator|ws|socket|bet/i.test(urlStr);

      if (!isRelevant) return;

      postCapture({ type: 'ws_connected', url: urlStr });

      this.addEventListener('message', (evt) => {
        let data = evt.data;

        // Attempt JSON parse for readable payloads
        let parsed = null;
        if (typeof data === 'string') {
          try {
            parsed = JSON.parse(data);
          } catch (_) {
            parsed = data.slice(0, 500); // truncate raw string
          }
        } else if (data instanceof ArrayBuffer) {
          // Binary frame — convert to base64 snippet
          const view = new Uint8Array(data);
          parsed = { type: 'binary', bytes: Array.from(view.slice(0, 64)) };
        } else if (data instanceof Blob) {
          // Blob — read first portion asynchronously
          data.slice(0, 200).text().then(text => {
            postCapture({
              type:      'ws_message',
              url:       urlStr,
              payload:   text.slice(0, 500),
              ts:        Date.now(),
            });
          }).catch(() => {});
          return;
        }

        postCapture({
          type:    'ws_message',
          url:     urlStr,
          payload: parsed,
          ts:      Date.now(),
        });
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
  window.WebSocket.prototype = OriginalWebSocket.prototype;

  console.log('[CAC Inject] WebSocket observer active');
})();
