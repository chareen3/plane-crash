/**
 * dashboard-bridge.js
 * Injected into the local dashboard (http://localhost:3000/*)
 * Listens for background events from the extension and forwards them
 * to the React app via window.postMessage for zero-latency updates.
 */

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg) return;

  if (msg.type === 'NEW_CRASH') {
    // Legacy mapping support
    window.postMessage({
      type: 'EXTENSION_CRASH_LIVE',
      round: msg.round
    }, '*');
  } else if (msg.type === 'EXTENSION_CRASH_LIVE' || msg.type === 'EXTENSION_BET_CHANGE') {
    // Forward the rich prediction and bet events directly to the React application
    window.postMessage(msg, '*');
  }
});
