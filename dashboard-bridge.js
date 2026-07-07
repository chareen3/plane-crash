/**
 * dashboard-bridge.js
 * Injected into the local dashboard (http://localhost:3000/*)
 * Listens for background events from the extension and forwards them
 * to the React app via window.postMessage for zero-latency updates.
 */

window.addEventListener('message', (evt) => {
  if (evt.data?.type === 'PING') {
    try {
      chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
        if (chrome.runtime.lastError) return;
        if (response?.capturing) {
          window.postMessage({ type: 'PONG', timestamp: evt.data.timestamp }, '*');
        }
      });
    } catch (e) {
      // Ignore errors if context is invalidated
    }
  }
});

// Broadcast connection right away when injected
window.postMessage({ type: 'EXTENSION_CONNECTED' }, '*');

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
