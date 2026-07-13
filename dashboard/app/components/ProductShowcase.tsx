/**
 * Marketing product mockups — high-fidelity dashboard previews for the landing page.
 * Pure CSS/HTML (no real screenshots required); looks like in-product UI.
 */

const frames = [
  {
    id: 'signals',
    label: 'Live AI Signals',
    badge: 'Core',
    caption: 'Safe / Swing targets, confidence, and SKIP protection in one glance.',
  },
  {
    id: 'targets',
    label: 'Targets Hub',
    badge: 'Math',
    caption: 'Hit rates, EV, and percentile cashouts up to 35x — pick with data.',
  },
  {
    id: 'patterns',
    label: 'Patterns Hub',
    badge: 'Analytics',
    caption: 'Live streaks, Markov next-state, and active risk pattern alerts.',
  },
] as const;

function BrowserChrome({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="ps-frame">
      <div className="ps-chrome">
        <div className="ps-dots">
          <span /><span /><span />
        </div>
        <div className="ps-url">
          <span className="ps-lock">🔒</span>
          crashtracker.space/app
          <span className="ps-url-path">/{title.toLowerCase().replace(/\s+/g, '-')}</span>
        </div>
      </div>
      <div className="ps-screen">{children}</div>
    </div>
  );
}

function MockSignals() {
  return (
    <div className="ps-ui">
      <div className="ps-top">
        <div className="ps-brand">CrashTracker</div>
        <div className="ps-pill live">● LIVE</div>
      </div>
      <div className="ps-hero">
        <div className="ps-hero-left">
          <div className="ps-tag buy">BUY · 62% conf</div>
          <div className="ps-target">1.50<span>x</span></div>
          <div className="ps-sub">Safe cashout · hist hit ~68%</div>
          <div className="ps-row">
            <div className="ps-chip">Swing 2.20x</div>
            <div className="ps-chip dim">Moon 2.50x</div>
          </div>
        </div>
        <div className="ps-hero-right">
          <div className="ps-meter-label">Risk</div>
          <div className="ps-meter"><i style={{ width: '42%' }} /></div>
          <div className="ps-stat-grid">
            <div><b>42</b><s>Risk</s></div>
            <div><b>LOW</b><s>Regime</s></div>
            <div><b>HOT</b><s>Form</s></div>
          </div>
        </div>
      </div>
      <div className="ps-cards">
        <div className="ps-mini"><span>≥1.5x</span><b>61%</b></div>
        <div className="ps-mini"><span>≥2x</span><b>44%</b></div>
        <div className="ps-mini warn"><span>Instant</span><b>8.2%</b></div>
        <div className="ps-mini"><span>EV/bet</span><b className="ok">+0.12</b></div>
      </div>
    </div>
  );
}

function MockTargets() {
  const rows = [
    { t: '1.20x', h: 82, s: 'SAFE' },
    { t: '1.50x', h: 68, s: 'OK' },
    { t: '2.00x', h: 48, s: 'OK' },
    { t: '3.00x', h: 31, s: 'RISKY' },
    { t: '10x', h: 9, s: 'RARE' },
    { t: '30x', h: 3, s: 'RARE' },
    { t: '35x', h: 2, s: 'RARE' },
  ];
  return (
    <div className="ps-ui">
      <div className="ps-top">
        <div className="ps-brand">Targets Hub</div>
        <div className="ps-pill">50 rounds</div>
      </div>
      <div className="ps-rec">
        <div className="ps-rec-card g"><s>Safe</s><b>1.50x</b><i>68% hit</i></div>
        <div className="ps-rec-card y"><s>Swing</s><b>2.20x</b><i>EV +0.08</i></div>
        <div className="ps-rec-card p"><s>Moon</s><b>2.50x</b><i>info only</i></div>
      </div>
      <div className="ps-table">
        {rows.map(r => (
          <div key={r.t} className="ps-tr">
            <span className="ps-mult">{r.t}</span>
            <div className="ps-bar"><i style={{ width: `${r.h}%` }} /></div>
            <span className="ps-pct">{r.h}%</span>
            <span className={`ps-sig ${r.s.toLowerCase()}`}>{r.s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MockPatterns() {
  return (
    <div className="ps-ui">
      <div className="ps-top">
        <div className="ps-brand">Patterns Hub</div>
        <div className="ps-pill warn">2 ACTIVE</div>
      </div>
      <div className="ps-pat-grid">
        <div className="ps-pat on"><b>Hot Run</b><s>4 high ≥2x</s></div>
        <div className="ps-pat"><b>Cold Lock</b><s>quiet</s></div>
        <div className="ps-pat on alt"><b>Mega Cluster</b><s>1× in last 10</s></div>
        <div className="ps-pat"><b>Oscillation</b><s>38% flips</s></div>
      </div>
      <div className="ps-markov">
        <div className="ps-markov-title">Markov next</div>
        {[
          { k: 'INSTANT', p: 12, c: '#ff3366' },
          { k: 'LOW', p: 38, c: '#ffd000' },
          { k: 'MED', p: 34, c: '#00e5a0' },
          { k: 'HIGH', p: 16, c: '#a78bfa' },
        ].map(m => (
          <div key={m.k} className="ps-mk-row">
            <span style={{ color: m.c }}>{m.k}</span>
            <div className="ps-bar"><i style={{ width: `${m.p}%`, background: m.c }} /></div>
            <b>{m.p}%</b>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProductShowcase() {
  return (
    <section id="product" className="relative z-10 py-20 border-y border-white/[0.04]">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-14">
          <div className="inline-block px-3 py-1 rounded-full border border-cyan-500/20 bg-cyan-500/[0.05] text-cyan-400 text-xs font-bold tracking-widest uppercase mb-4">
            Product Tour
          </div>
          <h2 className="text-3xl md:text-5xl font-black text-[#e8eeff] mb-4">
            See the dashboard <span className="text-cyan-400">before you buy</span>
          </h2>
          <p className="text-sm md:text-base text-[#5a6a8a] max-w-2xl mx-auto">
            Real product screens — live signals, target math, and pattern alerts. Built for disciplined cashouts, not hype multipliers.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {frames.map((f, i) => (
            <div key={f.id} className="ps-card-wrap">
              <BrowserChrome title={f.id}>
                {i === 0 ? <MockSignals /> : i === 1 ? <MockTargets /> : <MockPatterns />}
              </BrowserChrome>
              <div className="mt-4 flex items-start justify-between gap-3 px-1">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-bold text-[#e8eeff]">{f.label}</h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-cyan-500/25 bg-cyan-500/10 text-cyan-400 uppercase tracking-wider">
                      {f.badge}
                    </span>
                  </div>
                  <p className="text-xs text-[#5a6a8a] leading-relaxed">{f.caption}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Wide hero mock */}
        <div className="mt-10 ps-wide">
          <BrowserChrome title="dashboard">
            <div className="ps-wide-ui">
              <aside className="ps-side">
                {['Dashboard', 'Live', 'Targets', 'Patterns', 'History'].map((n, i) => (
                  <div key={n} className={`ps-side-item ${i === 0 ? 'on' : ''}`}>{n}</div>
                ))}
              </aside>
              <main className="ps-main">
                <div className="ps-wide-top">
                  <span>Performance · 24H</span>
                  <span className="ps-pill live">● SYNCED</span>
                </div>
                <div className="ps-wide-stats">
                  <div><s>Cashout hit</s><b>71%</b></div>
                  <div><s>Skip saves</s><b>58%</b></div>
                  <div><s>BET / SKIP</s><b>42% / 58%</b></div>
                  <div><s>Avg target</s><b>1.48x</b></div>
                </div>
                <div className="ps-wide-body">
                  <div className="ps-wide-signal">
                    <div className="ps-tag buy">CONSERVATIVE</div>
                    <div className="ps-target sm">1.50<span>x</span></div>
                    <p>Regime NORMAL · Ensemble 64 · Risk 38/100</p>
                  </div>
                  <div className="ps-wide-feed">
                    {[2.14, 1.32, 3.05, 1.08, 1.87, 2.40, 1.55, 4.12].map((v, i) => (
                      <div key={i} className={`ps-feed-row ${v < 1.15 ? 'bad' : v >= 2 ? 'good' : ''}`}>
                        <span>#{48210 - i}</span>
                        <b>{v.toFixed(2)}x</b>
                      </div>
                    ))}
                  </div>
                </div>
              </main>
            </div>
          </BrowserChrome>
          <p className="text-center text-xs text-[#5a6a8a] mt-4">
            Full workspace: signals, performance strip, live feed, and risk context — same UI you get after signup.
          </p>
        </div>
      </div>

      <style>{`
        .ps-frame {
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.08);
          background: #0a0f1c;
          box-shadow: 0 24px 60px rgba(0,0,0,0.45), 0 0 0 1px rgba(0,255,213,0.04);
        }
        .ps-chrome {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          background: linear-gradient(180deg, #141a2c, #0e1322);
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .ps-dots { display: flex; gap: 5px; }
        .ps-dots span {
          width: 8px; height: 8px; border-radius: 50%;
          background: #3a4158;
        }
        .ps-dots span:nth-child(1) { background: #ff5f57; }
        .ps-dots span:nth-child(2) { background: #febc2e; }
        .ps-dots span:nth-child(3) { background: #28c840; }
        .ps-url {
          flex: 1;
          font-size: 10px;
          color: #6b7594;
          background: rgba(0,0,0,0.35);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 8px;
          padding: 5px 10px;
          font-family: ui-monospace, monospace;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }
        .ps-url-path { color: #00d4ff; }
        .ps-screen { min-height: 280px; }
        .ps-ui { padding: 14px; font-family: Inter, system-ui, sans-serif; }
        .ps-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .ps-brand { font-size: 12px; font-weight: 800; color: #e8eeff; letter-spacing: 0.3px; }
        .ps-pill {
          font-size: 9px; font-weight: 800; letter-spacing: 0.6px;
          padding: 3px 8px; border-radius: 999px;
          background: rgba(255,255,255,0.05); color: #8b95b0; border: 1px solid rgba(255,255,255,0.08);
        }
        .ps-pill.live { color: #00e5a0; background: rgba(0,229,160,0.1); border-color: rgba(0,229,160,0.25); }
        .ps-pill.warn { color: #ffd000; background: rgba(255,208,0,0.1); border-color: rgba(255,208,0,0.25); }
        .ps-hero {
          display: grid; grid-template-columns: 1.2fr 1fr; gap: 12px;
          background: linear-gradient(145deg, rgba(0,255,213,0.08), rgba(0,136,255,0.04));
          border: 1px solid rgba(0,255,213,0.15); border-radius: 14px; padding: 14px; margin-bottom: 10px;
        }
        .ps-tag {
          display: inline-block; font-size: 9px; font-weight: 800; letter-spacing: 0.5px;
          padding: 3px 8px; border-radius: 999px; margin-bottom: 6px;
        }
        .ps-tag.buy { background: rgba(0,229,160,0.15); color: #00e5a0; }
        .ps-target { font-size: 36px; font-weight: 900; color: #fff; line-height: 1; font-family: Rajdhani, sans-serif; }
        .ps-target span { font-size: 18px; color: #00ffd5; margin-left: 2px; }
        .ps-target.sm { font-size: 28px; }
        .ps-sub { font-size: 10px; color: #7a849f; margin-top: 4px; }
        .ps-row { display: flex; gap: 6px; margin-top: 10px; flex-wrap: wrap; }
        .ps-chip {
          font-size: 10px; font-weight: 700; padding: 4px 8px; border-radius: 8px;
          background: rgba(255,208,0,0.12); color: #ffd000; border: 1px solid rgba(255,208,0,0.2);
        }
        .ps-chip.dim { background: rgba(167,139,250,0.12); color: #a78bfa; border-color: rgba(167,139,250,0.2); }
        .ps-meter-label { font-size: 9px; color: #6b7594; margin-bottom: 4px; text-transform: uppercase; font-weight: 700; }
        .ps-meter, .ps-bar {
          height: 6px; border-radius: 4px; background: rgba(255,255,255,0.06); overflow: hidden;
        }
        .ps-meter i, .ps-bar i {
          display: block; height: 100%; border-radius: 4px;
          background: linear-gradient(90deg, #00d4ff, #00e5a0);
        }
        .ps-stat-grid {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-top: 10px;
        }
        .ps-stat-grid div {
          background: rgba(0,0,0,0.25); border-radius: 8px; padding: 6px; text-align: center;
        }
        .ps-stat-grid b { display: block; font-size: 12px; color: #fff; }
        .ps-stat-grid s { display: block; font-size: 8px; color: #6b7594; text-decoration: none; }
        .ps-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
        .ps-mini {
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
          border-radius: 10px; padding: 8px 6px; text-align: center;
        }
        .ps-mini span { display: block; font-size: 8px; color: #6b7594; text-transform: uppercase; font-weight: 700; }
        .ps-mini b { font-size: 13px; color: #e8eeff; }
        .ps-mini.warn b { color: #ff6b8a; }
        .ps-mini .ok { color: #00e5a0; }
        .ps-rec { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 12px; }
        .ps-rec-card {
          border-radius: 12px; padding: 10px; border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.03);
        }
        .ps-rec-card s { display: block; font-size: 9px; color: #7a849f; text-decoration: none; text-transform: uppercase; font-weight: 700; }
        .ps-rec-card b { display: block; font-size: 18px; color: #fff; font-family: Rajdhani, sans-serif; }
        .ps-rec-card i { font-size: 10px; color: #8b95b0; font-style: normal; }
        .ps-rec-card.g { border-color: rgba(0,229,160,0.25); }
        .ps-rec-card.y { border-color: rgba(255,208,0,0.25); }
        .ps-rec-card.p { border-color: rgba(167,139,250,0.25); }
        .ps-table { display: flex; flex-direction: column; gap: 5px; }
        .ps-tr { display: grid; grid-template-columns: 42px 1fr 34px 48px; gap: 6px; align-items: center; font-size: 10px; }
        .ps-mult { font-weight: 800; color: #e8eeff; font-family: ui-monospace, monospace; }
        .ps-pct { color: #aab4d0; text-align: right; font-weight: 700; }
        .ps-sig { font-size: 8px; font-weight: 800; text-align: center; padding: 2px 4px; border-radius: 4px; }
        .ps-sig.safe { background: rgba(0,229,160,0.12); color: #00e5a0; }
        .ps-sig.ok { background: rgba(167,139,250,0.12); color: #a78bfa; }
        .ps-sig.risky { background: rgba(255,208,0,0.12); color: #ffd000; }
        .ps-sig.rare { background: rgba(255,51,102,0.12); color: #ff6b8a; }
        .ps-pat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; }
        .ps-pat {
          padding: 10px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.06);
          background: rgba(255,255,255,0.02); opacity: 0.55;
        }
        .ps-pat.on { opacity: 1; border-color: rgba(0,229,160,0.3); background: rgba(0,229,160,0.08); }
        .ps-pat.on.alt { border-color: rgba(167,139,250,0.35); background: rgba(167,139,250,0.1); }
        .ps-pat b { display: block; font-size: 12px; color: #fff; }
        .ps-pat s { font-size: 10px; color: #7a849f; text-decoration: none; }
        .ps-markov { background: rgba(0,0,0,0.25); border-radius: 12px; padding: 10px; border: 1px solid rgba(255,255,255,0.05); }
        .ps-markov-title { font-size: 9px; font-weight: 800; color: #6b7594; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.6px; }
        .ps-mk-row { display: grid; grid-template-columns: 58px 1fr 28px; gap: 6px; align-items: center; margin-bottom: 5px; font-size: 10px; }
        .ps-mk-row b { text-align: right; color: #e8eeff; }
        .ps-wide .ps-screen { min-height: 320px; }
        .ps-wide-ui { display: grid; grid-template-columns: 140px 1fr; min-height: 320px; }
        .ps-side {
          background: rgba(8,12,24,0.95); border-right: 1px solid rgba(255,255,255,0.06);
          padding: 12px 8px; display: flex; flex-direction: column; gap: 4px;
        }
        .ps-side-item {
          font-size: 11px; font-weight: 600; color: #6b7594; padding: 8px 10px; border-radius: 10px;
        }
        .ps-side-item.on {
          color: #00ffd5; background: linear-gradient(135deg, rgba(0,255,213,0.12), rgba(0,136,255,0.08));
          border: 1px solid rgba(0,255,213,0.2);
        }
        .ps-main { padding: 14px; }
        .ps-wide-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; font-size: 11px; color: #8b95b0; font-weight: 700; }
        .ps-wide-stats {
          display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 12px;
        }
        .ps-wide-stats div {
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
          border-radius: 12px; padding: 10px;
        }
        .ps-wide-stats s { display: block; font-size: 9px; color: #6b7594; text-decoration: none; text-transform: uppercase; font-weight: 700; }
        .ps-wide-stats b { font-size: 16px; color: #e8eeff; font-family: Rajdhani, sans-serif; }
        .ps-wide-body { display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 10px; }
        .ps-wide-signal {
          background: linear-gradient(145deg, rgba(0,255,213,0.08), transparent);
          border: 1px solid rgba(0,255,213,0.15); border-radius: 14px; padding: 14px;
        }
        .ps-wide-signal p { font-size: 11px; color: #7a849f; margin-top: 8px; }
        .ps-wide-feed {
          background: rgba(0,0,0,0.25); border-radius: 14px; padding: 8px; border: 1px solid rgba(255,255,255,0.05);
          max-height: 180px; overflow: hidden;
        }
        .ps-feed-row {
          display: flex; justify-content: space-between; padding: 6px 8px; font-size: 11px;
          border-bottom: 1px solid rgba(255,255,255,0.04); color: #8b95b0;
        }
        .ps-feed-row b { color: #e8eeff; font-family: ui-monospace, monospace; }
        .ps-feed-row.good b { color: #00e5a0; }
        .ps-feed-row.bad b { color: #ff6b8a; }
        .ps-card-wrap { transition: transform 0.25s ease; }
        .ps-card-wrap:hover { transform: translateY(-4px); }
        @media (max-width: 900px) {
          .ps-hero { grid-template-columns: 1fr; }
          .ps-cards { grid-template-columns: repeat(2, 1fr); }
          .ps-wide-ui { grid-template-columns: 1fr; }
          .ps-side { display: none; }
          .ps-wide-body { grid-template-columns: 1fr; }
          .ps-wide-stats { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>
    </section>
  );
}
