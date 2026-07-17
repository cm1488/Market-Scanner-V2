# PETP Scanner — free phone app (no accounts, no subscriptions)

A trade-setup scanner for Pacifica perpetual markets. Runs 100% on your phone,
pulls free public market data (Pacifica API, Binance fallback), and shows free
TradingView charts. It never places trades, never asks for keys or money, and
sends nothing anywhere.

## Put it online free (one time, ~10 minutes)

You need a free GitHub account (github.com — sign up is free).

1. Log in to GitHub and click the "+" (top right) → **New repository**.
2. Name it `petp-scanner`, leave it **Public**, click **Create repository**.
3. On the new repo page click **uploading an existing file**.
4. Drag ALL files from this folder in (index.html, manifest.webmanifest,
   sw.js, icon-192.png, icon-512.png) and click **Commit changes**.
5. Go to **Settings → Pages** (left sidebar). Under "Branch" choose
   `main` and `/ (root)`, click **Save**.
6. Wait ~2 minutes. Your app is live at:
   `https://YOUR-USERNAME.github.io/petp-scanner/`

Send that link to anyone — it's your app now.

## Install on the phone (you and your uncle)

**iPhone (Safari):** open the link → tap the Share button (square with arrow)
→ **Add to Home Screen** → Add. A PETP icon appears like a normal app.

**Android (Chrome):** open the link → tap ⋮ menu → **Add to Home screen**
(or "Install app") → Add.

## Using it

- **Scan** checks the top Pacifica markets for PETP setups (pullbacks,
  breakouts, mean reversion) and scores confluence 0–100.
- Switch **Scalp / Day / Swing** and **Consv / Balanced / Aggr** at the top.
- Tap a signal row: entry / stop / target, position size at your risk %,
  a pass/fail checklist of every condition, Pacifica orderbook balance,
  and a TradingView chart with RSI + MACD.
- Tap 🔕 to turn on alerts (beep + vibration when a new strong setup
  appears). This also turns on auto-rescan every 5 minutes.
- "Replay" (e.g. 3-1) = how often this same setup hit target vs stop over
  recent history. Small sample — a hint, not a promise.

## Honest limitations

- Alerts only fire **while the app is open** (background push needs a paid
  server — this app has none, on purpose).
- TradingView charts show the nearest listed market (e.g. Binance for
  crypto) — the entry/stop/target numbers in the app are Pacifica prices.
- Signals are information, not financial advice. Leveraged trading can
  lose more than your stake. Never trade money you can't afford to lose.

## Updating the app later

Just upload new files to the same GitHub repository (replace the old ones).
Everyone's installed app picks up the new version automatically the next
time they open it with internet — no reinstall needed.
