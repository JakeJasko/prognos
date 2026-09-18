# 🌌 Prognos Local

> **prog·nos** */ˈprɒɡ.nɒs/* (Ancient Greek: **πρόγνωσις**, from *πρό* "before" + *γνῶσις* "knowledge")  
> *noun*: Foreknowledge; knowing beforehand; a calculated forecast of the course of future events based on empirical observation and calibrated probability.

A dedicated, zero-maintenance personal forecasting ledger and calibration instrument for you and your household on a local network.

![Forecasting Principles](/telescope_future_1200_white.png)

---

## Why build a habit of forecasting?

1. **Make better decisions**: Get a clearer view of consequences by thinking through the important questions.
2. **Communicate more clearly**: Write down your prediction as a probability. *"Probably"* is ambiguous; *"80%"* is precise.
3. **Build your track record**: Resolve your predictions as **YES**, **NO**, or **AMBIGUOUS** to create an empowering feedback loop.

---

## Key Features

- **⚡ Blazing Fast & Zero-Config**: Starts in ~300ms, consumes ~35MB RAM. Runs on any PC, home server, NAS, or Raspberry Pi.
- **💾 Embedded SQLite**: Stored locally in `data/predictions.db`. Zero PostgreSQL, Docker, or database services required.
- **📱 Home Network (LAN) Ready**: Automatically binds to `0.0.0.0:3000` and displays your Wi-Fi network address (e.g. `http://192.168.1.150:3000`) so you can make predictions from your phone or tablet on the couch.
- **👥 Household Profiles**: Switch between local family or team profiles in 1 click—no passwords, emails, or OAuth configuration.
- **🎯 Calibrated Probability Slider**: Fluid probability slider with quick presets ($50\%, 60\%, 70\%, 80\%, 90\%, 95\%, 99\%$) and plain-English probability interpretations.
- **📈 Calibration Curve (Reliability Diagram)**: Interactive diagram plotting your empirical win rate against the diagonal $y = x$ line of perfect calibration.
- **🏆 Brier Score Tracking**: Automatically evaluates your predictive accuracy ($BS = \frac{1}{N} \sum (f_i - o_i)^2$) with superforecaster benchmarks.
- **📦 1-Click Backup & Portability**: Export and import full JSON backups directly from the user interface.

---

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Start Prognos Local
```bash
npm run dev
```

The console will display:
```
  ╔══════════════════════════════════════════════════════════════╗
  ║                 🌌  PROGNOS LOCAL  🌌                        ║
  ║       Personal & Home Network Forecasting Platform           ║
  ╠══════════════════════════════════════════════════════════════╣
  ║  ➜ Local:   http://localhost:3000                           ║
  ║  ➜ Network: http://192.168.1.150:3000                      ║
  ║                                                              ║
  ║  Tip: Open the Network URL on your phone or tablet on Wi-Fi! ║
  ╚══════════════════════════════════════════════════════════════╝
```

Open `http://localhost:3000` on your desktop, or the Network URL on your phone.

---

## Architecture

- **Frontend**: React 18, Vite, Vanilla CSS (custom midnight starlight design system).
- **Backend**: Express REST API, Node.js.
- **Database**: Embedded SQLite via native Node `node:sqlite`.
- **Port**: Single unified port `3000` for both the web app and REST API.

---

## License
MIT
