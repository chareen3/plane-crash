/**
 * dashboard-bridge.js
 * Injected into the local dashboard (http://localhost:3000/*)
 * Listens for background events from the extension and forwards them
 * to the React app via window.postMessage for zero-latency updates.
 */

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === 'NEW_CRASH') {
    // Forward to the React app
    window.postMessage({
      type: 'EXTENSION_CRASH_LIVE',
      round: msg.round
    }, '*');
  }
});
