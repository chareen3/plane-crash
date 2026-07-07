/**
 * dashboard-bridge.js
 * Injected into the local dashboard (http://localhost:3000/*)
 * Listens for background events from the extension and forwards them
 * to the React app via window.postMessage for zero-latency updates.
 */

// Broadcast connection right away when injected
window.postMessage({ type: 'EXTENSION_CONNECTED' }, '*');

// Wake up the background service worker so it starts the heartbeat
try {
  chrome.runtime.sendMessage({ type: 'DASHBOARD_OPENED' }).catch(() => {});
} catch (e) {}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg) return;

  if (msg.type === 'NEW_CRASH') {
    // Legacy mapping support
    window.postMessage({
      type: 'EXTENSION_CRASH_LIVE',
      round: msg.round
    }, '*');
  } else if (
    msg.type === 'EXTENSION_CRASH_LIVE' || 
    msg.type === 'EXTENSION_BET_CHANGE' || 
    msg.type === 'EXTENSION_HEARTBEAT'
  ) {
    // Forward the rich prediction and bet events directly to the React application
    window.postMessage(msg, '*');
  }
});

// Listen for connection pings from the React dashboard
window.addEventListener('message', (evt) => {
  if (evt.source !== window) return;

  if (evt.data && evt.data.type === 'DASHBOARD_PING') {
    // Reply immediately to the dashboard page to confirm extension presence
    window.postMessage({ 
      type: 'EXTENSION_CONNECTED', 
      timestamp: evt.data.timestamp || Date.now() 
    }, '*');

    // Wake up/notify the background service worker
    try {
      chrome.runtime.sendMessage({ type: 'DASHBOARD_PING' }).catch(() => {});
    } catch (e) {}
  }
});

