# Crash Auto Collector — Chrome Extension

> **⚠️ DISCLAIMER**: This extension is a **data collection and analytics tool only**.
> It captures on-screen / page-level data for research purposes.
> **It does not predict future game outcomes** and should not be used for gambling decisions.
> Use responsibly and in compliance with applicable laws and the target site's Terms of Service.

---

## Overview

**Crash Auto Collector** is a Manifest V3 Chrome Extension that automatically captures
crash-game data from the active tab and exports it as a structured JSON file — ready
for analytics, visualisation, or ML model training.

---

## Install Steps

### Load as an unpacked extension in Chrome

1. **Download / clone** this repository into a local folder.
2. Open Chrome and navigate to `chrome://extensions`.
3. Enable **Developer Mode** (toggle in the top-right corner).
4. Click **Load unpacked**.
5. Select the folder containing `manifest.json` (the root of this repository).
6. The **📡 Crash Auto Collector** icon will appear in your Chrome toolbar.

> **Tip**: Pin the extension by clicking the puzzle-piece icon and then the pin next to the extension name.

---

## Quick Start

1. Navigate to a crash game tab in Chrome.
2. Click the **📡** extension icon to open the popup.
3. Click **▶ Start Auto Capture**.
4. The extension automatically injects a content script and begins watching the page.
5. Watch the **Live Feed** fill with captured events.
6. When done, click **■ Stop Capture**.
7. Click **⬇ Export JSON** to download all collected data.

---

## How Data is Captured

```
┌──────────────────────────────────────────────────────────────────────┐
│  POPUP (popup.js)                                                    │
│   • User presses "Start Auto Capture"                                │
│   • Sends START_CAPTURE message → background.js                      │
└──────────────────────────────────┬───────────────────────────────────┘
                                   │ chrome.runtime.sendMessage
                                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│  BACKGROUND SERVICE WORKER (background.js)                           │
│   • Receives START_CAPTURE                                           │
│   • Calls chrome.scripting.executeScript → injects content.js        │
│   • Sends START_COLLECTION to content script                         │
│   • Maintains an in-memory event buffer                              │
│   • Auto-flushes buffer every 5 s or 20 events to storage            │
│   • Deduplicates events via a stable fingerprint                     │
│   • Drives badge count and popup live feed                           │
└──────────────────────────────────┬───────────────────────────────────┘
                                   │ chrome.tabs.sendMessage
                                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│  CONTENT SCRIPT (content.js)                                         │
│   • Attaches a MutationObserver to the game root element             │
│   • Detects changes in:                                              │
│       - Multiplier text                                              │
│       - History row additions                                        │
│       - Round state labels (waiting / flying / crashed)              │
│       - Countdown timer                                              │
│       - Bet / cashout labels                                         │
│   • Builds structured event objects (see Data Schema below)          │
│   • Batches events and sends them to background every 3 s            │
│                                                                      │
│  OPTIONAL: inject.js (page context, disabled by default)             │
│   • Wraps native WebSocket to capture raw socket messages            │
│   • Forwards payloads to content.js via window.postMessage           │
└──────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────────┐
│  STORAGE (chrome.storage.local)                                      │
│   • Events stored under key "cac_events" (rolling window: 5 000)    │
│   • Round summaries derived and stored under "cac_summaries"         │
└──────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼  (on Export click)
┌──────────────────────────────────────────────────────────────────────┐
│  EXPORTER (exporter.js)                                              │
│   • Reads all events from storage                                    │
│   • Derives round summaries (grouping by roundIndex)                 │
│   • Assembles one JSON blob using chunked string building            │
│   • Triggers chrome.downloads.download with filename:                │
│     crash-auto-collector-YYYY-MM-DD-HH-mm-ss.json                   │
└──────────────────────────────────────────────────────────────────────┘
```

### What is captured
| Field | Source | Description |
|---|---|---|
| `multiplierText` | DOM | Live multiplier as displayed ("2.34x") |
| `historyValues` | DOM | New history row values added this tick |
| `currentTimer` | DOM | Countdown text ("Next round in 3s") |
| `roundState` | DOM | Normalised state: `waiting`, `flying`, `crashed` |
| `betAmountText` | DOM | Text in the bet amount input |
| `cashoutText` | DOM | Cashout button / label text |
| `buttonLabels` | DOM | All visible game button texts |
| `rawTextSample` | DOM | First 300 chars of game area text |
| `rawPayload` | WebSocket | Raw WS frame (optional, off by default) |

---

## How to Adapt Selectors

All DOM selectors are defined in a single `SELECTORS` object at the top of
[`content.js`](content.js) (around line 40). To adapt for a new crash game:

### Step 1 — Identify the elements

Open the target crash game in Chrome and press **F12** to open DevTools.
Switch to the **Elements** tab and inspect:

- The live multiplier display (the big "x" number during flight)
- The history list (past round results)
- The round state indicator (e.g. "Waiting for next round")
- The countdown timer

### Step 2 — Find stable selectors

In the DevTools **Console**, test selectors with:

```javascript
document.querySelector('[class*="multiplier"]')
document.querySelectorAll('[class*="history"] [class*="item"]')
```

### Step 3 — Update the SELECTORS object

In `content.js`, update the relevant arrays:

```javascript
const SELECTORS = {
  // The live multiplier (big number during flight)
  MULTIPLIER: [
    '.your-exact-multiplier-class',   // ← Add your selector first
    '[data-testid="multiplier"]',
    // ... fallbacks below
  ],

  // History row items
  HISTORY_ITEMS: [
    '.your-history-item-class',       // ← Your selector
    // ... fallbacks
  ],

  // Game root container (outer wrapper)
  GAME_ROOT: [
    '#your-game-root-id',            // ← Outermost game element
    // ...
  ],

  // Add / modify other selectors as needed
};
```

### Step 4 — Test

Reload the extension at `chrome://extensions` (click the ↻ refresh icon),
then open the game tab and start capture. Check the **Live Feed** — you should
see events appearing within a few seconds.

Enable **Debug mode** (click the "Debug" button in the popup footer) to see
detailed selector match logs in the DevTools console of the game tab.

---

## Data Schema

### Event object
```json
{
  "id":              "3f7a9c1d2e8b0a5f",
  "capturedAt":      "2024-01-15T14:32:01.123Z",
  "pageUrl":         "https://example-crash-game.com/game",
  "pageTitle":       "Crash Game",
  "source":          "observer",
  "eventType":       "round_result",
  "roundIndex":      42,
  "multiplier":      2.34,
  "multiplierText":  "2.34x",
  "historyValues":   ["2.34x", "1.12x", "5.67x"],
  "currentTimer":    null,
  "roundState":      "crashed",
  "betAmountText":   "10.00",
  "cashoutText":     "Cash Out",
  "autoCashoutText": "2.00x",
  "buttonLabels":    ["Bet", "Cash Out"],
  "visibleLabels":   null,
  "rawTextSample":   "2.34x Crashed! History: 2.34x 1.12x 5.67x",
  "rawPayload":      null,
  "domPath":         "div.game-container > div.multiplier",
  "fingerprint":     "1705329121|2.34|crashed|observer|round_result"
}
```

### Round summary (derived)
```json
{
  "roundId":              "round_42",
  "roundIndex":           42,
  "startedAt":            "2024-01-15T14:31:55.000Z",
  "endedAt":              "2024-01-15T14:32:01.123Z",
  "finalMultiplier":      2.34,
  "finalMultiplierText":  "2.34x",
  "durationMs":           6123,
  "eventCount":           14,
  "historySnapshot":      ["2.34x", "1.12x", "5.67x"],
  "notes":                "round_result captured"
}
```

---

## Sample JSON Export

Below are 5 example records from a real export session:

```json
{
  "exportedAt": "2024-01-15T14:40:00.000Z",
  "version": "1.0.0",
  "disclaimer": "This data was collected for analytics and research purposes only. It does not predict future crash game outcomes.",
  "totalEvents": 5,
  "totalRounds": 2,
  "events": [
    {
      "id": "a1b2c3d4e5f6g7h8",
      "capturedAt": "2024-01-15T14:30:00.123Z",
      "pageUrl": "https://example-crash-game.com/game",
      "pageTitle": "Crash Game",
      "source": "dom",
      "eventType": "manual-snapshot",
      "roundIndex": 0,
      "multiplier": null,
      "multiplierText": null,
      "historyValues": ["1.12x", "3.40x", "1.01x"],
      "currentTimer": "Next round in 5s",
      "roundState": "waiting",
      "betAmountText": "5.00",
      "cashoutText": null,
      "autoCashoutText": null,
      "buttonLabels": ["Place Bet"],
      "visibleLabels": null,
      "rawTextSample": "Next round in 5s  History: 1.12x 3.40x 1.01x",
      "rawPayload": null,
      "domPath": "div.game-container",
      "fingerprint": "1705329000|0.00|waiting|dom|manual-snapshot"
    },
    {
      "id": "b2c3d4e5f6g7h8i9",
      "capturedAt": "2024-01-15T14:30:06.450Z",
      "pageUrl": "https://example-crash-game.com/game",
      "pageTitle": "Crash Game",
      "source": "observer",
      "eventType": "multiplier_tick",
      "roundIndex": 0,
      "multiplier": 1.35,
      "multiplierText": "1.35x",
      "historyValues": null,
      "currentTimer": null,
      "roundState": null,
      "betAmountText": null,
      "cashoutText": "Cash Out 1.35x",
      "autoCashoutText": "2.00x",
      "buttonLabels": null,
      "visibleLabels": null,
      "rawTextSample": "1.35x",
      "rawPayload": null,
      "domPath": "div.game-container > span.multiplier",
      "fingerprint": "1705329003|1.35||observer|multiplier_tick"
    },
    {
      "id": "c3d4e5f6g7h8i9j0",
      "capturedAt": "2024-01-15T14:30:09.210Z",
      "pageUrl": "https://example-crash-game.com/game",
      "pageTitle": "Crash Game",
      "source": "observer",
      "eventType": "round_result",
      "roundIndex": 0,
      "multiplier": 1.87,
      "multiplierText": "1.87x",
      "historyValues": ["1.87x", "1.12x", "3.40x", "1.01x"],
      "currentTimer": null,
      "roundState": "crashed",
      "betAmountText": null,
      "cashoutText": null,
      "autoCashoutText": null,
      "buttonLabels": null,
      "visibleLabels": null,
      "rawTextSample": "CRASHED at 1.87x  History: 1.87x 1.12x 3.40x 1.01x",
      "rawPayload": null,
      "domPath": "div.game-container > div.state",
      "fingerprint": "1705329004|1.87|crashed|observer|round_result"
    },
    {
      "id": "d4e5f6g7h8i9j0k1",
      "capturedAt": "2024-01-15T14:30:15.000Z",
      "pageUrl": "https://example-crash-game.com/game",
      "pageTitle": "Crash Game",
      "source": "observer",
      "eventType": "timer_change",
      "roundIndex": 1,
      "multiplier": null,
      "multiplierText": null,
      "historyValues": null,
      "currentTimer": "Next round in 3s",
      "roundState": "waiting",
      "betAmountText": "5.00",
      "cashoutText": null,
      "autoCashoutText": null,
      "buttonLabels": ["Place Bet"],
      "visibleLabels": null,
      "rawTextSample": "Next round in 3s",
      "rawPayload": null,
      "domPath": "div.game-container > span.timer",
      "fingerprint": "1705329007|0.00|waiting|observer|timer_change"
    },
    {
      "id": "e5f6g7h8i9j0k1l2",
      "capturedAt": "2024-01-15T14:30:28.750Z",
      "pageUrl": "https://example-crash-game.com/game",
      "pageTitle": "Crash Game",
      "source": "observer",
      "eventType": "history_item",
      "roundIndex": 1,
      "multiplier": 5.24,
      "multiplierText": "5.24x",
      "historyValues": ["5.24x"],
      "currentTimer": null,
      "roundState": "crashed",
      "betAmountText": null,
      "cashoutText": null,
      "autoCashoutText": null,
      "buttonLabels": null,
      "visibleLabels": null,
      "rawTextSample": "5.24x added to history",
      "rawPayload": null,
      "domPath": "ul.history > li.history-item",
      "fingerprint": "1705329014|5.24|crashed|observer|history_item"
    }
  ],
  "roundSummaries": [
    {
      "roundId": "round_0",
      "roundIndex": 0,
      "startedAt": "2024-01-15T14:30:00.123Z",
      "endedAt": "2024-01-15T14:30:09.210Z",
      "finalMultiplier": 1.87,
      "finalMultiplierText": "1.87x",
      "durationMs": 9087,
      "eventCount": 3,
      "historySnapshot": ["1.87x", "1.12x", "3.40x", "1.01x"],
      "notes": "round_result captured"
    },
    {
      "roundId": "round_1",
      "roundIndex": 1,
      "startedAt": "2024-01-15T14:30:15.000Z",
      "endedAt": "2024-01-15T14:30:28.750Z",
      "finalMultiplier": 5.24,
      "finalMultiplierText": "5.24x",
      "durationMs": 13750,
      "eventCount": 2,
      "historySnapshot": ["5.24x"],
      "notes": "inferred from events"
    }
  ]
}
```

---

## Configuration Reference

### background.js `CONFIG` object

| Key | Default | Description |
|---|---|---|
| `FLUSH_INTERVAL_MS` | `5000` | Auto-flush buffer to storage every N ms |
| `FLUSH_BATCH_SIZE` | `20` | Also flush when buffer reaches this count |
| `MAX_STORED_EVENTS` | `5000` | Rolling storage window (oldest dropped first) |
| `WS_INJECTION_ENABLED` | `false` | Enable WebSocket interception via inject.js |

### Debug mode

Click the **Debug** button in the popup footer to enable verbose logging.
Then open DevTools on the game tab (F12 → Console) to see:
- Which selectors matched
- How many events were captured per tick
- Fingerprint deduplication logs

---

## File Structure

```
crash-auto-collector/
├── manifest.json      ← Extension metadata & permissions
├── popup.html         ← Popup UI markup
├── popup.css          ← Popup styles (dark theme)
├── popup.js           ← Popup controller
├── background.js      ← Service worker (orchestration, storage, export)
├── content.js         ← Content script (DOM observer, event capture)
├── inject.js          ← Page-context WebSocket wrapper (optional)
├── exporter.js        ← JSON assembly & download helper
├── utils.js           ← Shared utilities (fingerprint, formatting, etc.)
├── icons/
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

---

## Permissions

| Permission | Why it's needed |
|---|---|
| `activeTab` | Read the URL/title of the active tab |
| `storage` | Persist events in `chrome.storage.local` |
| `downloads` | Trigger JSON file download |
| `scripting` | Inject content.js into the game tab |
| `tabs` | Watch for tab navigation/reload events |
| `host_permissions: <all_urls>` | Required by scripting API to inject into any crash game domain |

> To restrict to specific domains, replace `<all_urls>` in `manifest.json` with the exact URL pattern, e.g. `"https://example-crash-game.com/*"`.

---

## Disclaimer

This extension is provided **for educational, research, and analytics purposes only**.

- It does **not** predict crash game outcomes.
- It does **not** place bets or interact with the game in any way.
- It **only** reads data already visible on the page.
- Use of this tool may or may not be permitted by the crash game operator's Terms of Service.
- The authors assume no liability for misuse.

Always gamble responsibly. If gambling is causing harm, seek help from a licensed support service.
