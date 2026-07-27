// APEX 24/7 heartbeat — runs on GitHub Actions cron.
// 1) snapshots the market into Supabase, 2) resolves pending setups
// (target/stop first-touch) so the system learns even while the app is closed.
// Uses the public anon key (already public in the app) — RLS allows insert/select only.

const SB = 'https://ssytilyswhaeorhaaqjr.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzeXRpbHlzd2hhZW9yaGFhcWpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxNjM0NzEsImV4cCI6MjEwMDczOTQ3MX0.Ony61Ccw-HrPCOQb4YLsu8NNva0IZNytfAB0T0u7-Lg';
const API = 'https://api.pacifica.fi/api/v1';
const TFS = {'1m':60,'3m':180,'5m':300,'15m':900,'30m':1800,'1h':3600,'2h':7200,'4h':14400,'1d':86400};

async function sb(method, path, body, prefer) {
  const h = { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' };
  if (prefer) h.Prefer = prefer;
  const r = await fetch(`${SB}/rest/v1/${path}`, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
  if (!r.ok) throw new Error(`supabase ${r.status}: ${(await r.text()).slice(0,200)}`);
  const t = await r.text();
  return t ? JSON.parse(t) : null;
}

async function pacifica(path) {
  const r = await fetch(API + path, { headers: { Accept: 'application/json' } });
  if (!r.ok) throw new Error(`pacifica ${r.status}`);
  return r.json();
}

async function snapshotMarket() {
  const j = await pacifica('/info/prices');
  if (!j.success || !Array.isArray(j.data)) throw new Error('prices unavailable');
  const now = new Date().toISOString();
  const rows = j.data
    .filter(m => m.symbol && m.mark != null)
    .slice(0, 80)
    .map(m => {
      const y = +m.yesterday_price;
      return {
        symbol: String(m.symbol).replace(/[^A-Za-z0-9_\-]/g, ''),
        ts: now,
        mark: +m.mark,
        chg_pct: y > 0 ? +(((+m.mark - y) / y) * 100).toFixed(3) : null,
        funding: m.funding != null ? +(+m.funding * 24 * 365 * 100).toFixed(2) : null,
        rsi: null, adx: null, atr_pct: null, trend: null,
      };
    });
  if (rows.length) await sb('POST', 'market_snapshots', rows, 'return=minimal');
  return rows.length;
}

function resolveWalk(setup, bars, tsMs) {
  const long = setup.direction === 'long';
  let j0 = -1;
  for (let i = 0; i < bars.length; i++) if (+bars[i].t > tsMs) { j0 = i; break; }
  if (j0 < 0) return null;
  let filled = false;
  for (let k = j0; k < bars.length; k++) {
    const hi = +bars[k].h, lo = +bars[k].l;
    if (!filled) {
      if (long ? hi >= setup.entry : lo <= setup.entry) filled = true;
      else if (k - j0 > 12) return { result: 'x', realized_r: null };
      if (!filled) continue;
    }
    const hitStop = long ? lo <= setup.stop : hi >= setup.stop;
    const hitTarget = long ? hi >= setup.target : lo <= setup.target;
    if (hitStop) return { result: 'l', realized_r: -1 };
    if (hitTarget) {
      const rr = Math.abs(setup.target - setup.entry) / Math.max(1e-9, Math.abs(setup.entry - setup.stop));
      return { result: 'w', realized_r: +rr.toFixed(2) };
    }
  }
  return null; // still playing out
}

async function resolvePending() {
  const pending = await sb('GET',
    'setups?select=setup_id,ts,symbol,setup_type,direction,tf,entry,stop,target,outcomes(setup_id)&outcomes=is.null&order=ts.asc&limit=25');
  let checked = 0, resolved = 0;
  const inserts = [];
  for (const p of pending ?? []) {
    const sec = TFS[p.tf];
    if (!sec) continue;
    checked++;
    const tsMs = Date.parse(p.ts);
    const now = Date.now();
    const start = Math.max(tsMs - sec * 1000, now - 240 * sec * 1000);
    try {
      const j = await pacifica(`/kline?symbol=${encodeURIComponent(p.symbol)}&interval=${p.tf}&start_time=${start}&end_time=${now}`);
      if (!j.success || !Array.isArray(j.data) || j.data.length < 3) continue;
      let bars = j.data.slice().sort((a, b) => +a.t - +b.t);
      if (+bars[bars.length - 1].T > now) bars = bars.slice(0, -1); // drop unfinished bar
      const out = resolveWalk(p, bars, tsMs);
      if (out) { inserts.push({ setup_id: p.setup_id, ...out }); resolved++; }
    } catch (e) { /* symbol unavailable this run — retry next cron */ }
    await new Promise(r => setTimeout(r, 250)); // be polite to the API
  }
  if (inserts.length)
    await sb('POST', 'outcomes?on_conflict=setup_id', inserts, 'resolution=ignore-duplicates,return=minimal');
  return { checked, resolved };
}

const started = Date.now();
let snap = 0, res = { checked: 0, resolved: 0 }, err = null;
try { snap = await snapshotMarket(); } catch (e) { err = 'snapshot: ' + e.message; }
try { res = await resolvePending(); } catch (e) { err = (err ? err + ' | ' : '') + 'resolve: ' + e.message; }
try {
  await sb('POST', 'audit_log', [{
    actor: 'heartbeat', action: 'heartbeat_run',
    details: { snapshots: snap, checked: res.checked, resolved: res.resolved, ms: Date.now() - started, err },
  }], 'return=minimal');
} catch (e) { /* audit best-effort */ }
console.log(JSON.stringify({ snapshots: snap, ...res, err }));
if (err && !snap && !res.checked) process.exit(1);
