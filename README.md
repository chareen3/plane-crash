# ✈️ Crash Signal Tool — 1xBet Crash Game Analytics & Support Dashboard

> **The smart Chrome Extension that reads, tracks, and helps you understand crash game patterns — built for serious players in Sri Lanka 🇱🇰**

---

## 🔥 What Is This?

**Crash Signal Tool** is a free Chrome Extension that acts as your **personal crash game command center**.

While other tools guess blindly, this extension:

- 📊 **Collects & stores live crash game data** round-by-round in real time
- 📈 **Displays a live dashboard** showing patterns, trends, and turning points
- 🧠 **Supports your own analysis** — know WHEN to bet, WHEN to wait, WHEN to cash out
- 💾 **Exports full session data as JSON** for deeper analysis or ML training
- 🔄 **Works across rounds automatically** — set it once, it runs silently in the background

> ⚡ This is NOT just a predictor. It's a **full analytics support tool** — like having a co-pilot that never misses a crash round.

---

## 🎯 Who Is This For?

- 1xBet Crash game players who want **data, not luck**
- Players who are tired of losing because they had **no pattern visibility**
- Anyone who wants to **study crash game behavior** before placing serious bets
- Developers and analysts who want **clean crash game datasets**

---

## 🛠️ Key Features

| Feature | What It Does |
|---|---|
| 🔴 **Live Round Feed** | Watch every round captured in real time |
| 📊 **History Dashboard** | See the last 5,000 rounds at a glance |
| 🎯 **Turning Point Detection** | Spot when patterns are shifting |
| 💡 **Round State Tracking** | Know if a round is: `waiting` / `flying` / `crashed` |
| 📤 **One-Click JSON Export** | Download your full session data instantly |
| 🔇 **Silent Background Mode** | Runs while you play — zero interruption |
| 🐛 **Debug Mode** | Advanced logging for power users |

---

## 📥 Install in 60 Seconds

1. **Download** this repository as a ZIP — click the green **Code** button → **Download ZIP**
2. Unzip the folder on your computer
3. Open Chrome → go to `chrome://extensions`
4. Turn on **Developer Mode** (top right toggle)
5. Click **Load unpacked** → select the unzipped folder
6. 📡 The **Crash Signal** icon appears in your Chrome toolbar — you're ready!

> 💡 **Tip**: Pin the extension by clicking the 🧩 puzzle icon → pin icon next to the extension

---

## ▶️ How To Use

1. Open your crash game tab (1xBet, etc.)
2. Click the 📡 extension icon
3. Click **▶ Start Auto Capture**
4. The dashboard fills with live round data automatically
5. Watch the **Live Feed** — each round is logged with multiplier, state, and timing
6. Click **■ Stop** when done
7. Click **⬇ Export JSON** to save your full session

---

## 📊 What Data Is Collected

Every round captures:

| Data Point | Example |
|---|---|
| Multiplier | `2.34x` |
| Round State | `crashed` |
| Bet & Cashout Labels | `Cash Out 2.34x` |
| History Snapshot | `[2.34x, 1.12x, 5.67x]` |
| Timer Countdown | `Next round in 3s` |
| Round Duration | `6,123ms` |
| Timestamp | `2024-01-15T14:32:01Z` |

---

## 🔒 Privacy & Permissions

| Permission | Why |
|---|---|
| `activeTab` | Read the crash game tab URL/title |
| `storage` | Save rounds locally in your browser |
| `downloads` | Export your data as JSON |
| `scripting` | Inject the observer into the game tab |

> ✅ **Zero data leaves your device.** Everything is stored in your local browser only.

---

## 🌐 Community & Support

- 🇱🇰 **Facebook Group**: [Crash Signal Tool LK — Official](https://facebook.com) *(join for daily signals & tips)*
- 💬 **Telegram**: @CrashSignalLK *(instant round signals)*
- 🐛 **Issues**: [GitHub Issues](https://github.com/chareen3/plane-crash/issues)
- 💡 **Feature Requests**: [GitHub Discussions](https://github.com/chareen3/plane-crash/discussions)

---

## ⚠️ Disclaimer

This extension is a **data collection and analytics support tool only**.

- It reads data **already visible on the page** — it does not alter the game
- It does **not guarantee winnings** or predict future outcomes with certainty
- Use responsibly and in line with the platform's Terms of Service
- The authors assume **no liability** for financial decisions made using this tool

> 🎰 Gamble responsibly. If gambling is causing harm, seek help from a licensed support service.

---

## 📁 File Structure

```
crash-signal-tool/
├── manifest.json      ← Extension config & permissions
├── popup.html         ← Dashboard UI
├── popup.css          ← Dark theme styles
├── popup.js           ← Dashboard controller
├── background.js      ← Service worker (data engine)
├── content.js         ← DOM observer (live data capture)
├── inject.js          ← WebSocket capture (optional)
├── exporter.js        ← JSON export helper
├── utils.js           ← Shared utilities
├── dashboard/         ← Analytics dashboard files
└── icons/             ← Extension icons
```

---

<p align="center">Made with ❤️ in Sri Lanka 🇱🇰 | <a href="https://github.com/chareen3">@chareen3</a></p>
