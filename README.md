# HeliosCore — Supply Dashboard & Simulator

Two-page web app for analyzing semiconductor supply data. Built for the HeliosCore PM case study.

## What's here

- **Data dashboard** (`index.html`) — the analytical view. Demand vs supply, manufacturing performance, supply shortfall, key findings.
- **Simulator** (`simulator.html`) — what-if playground. Six widgets covering performance levers (wafer mix, line × grade yield, station CT) and capacity levers (number of lines, bottleneck CT, best-yield ceiling).

The dashboard is the landing page. A "Try simulator →" button in the top-right of the dashboard's header takes you to the simulator. Each page loads sample data on first paint; you can drag-drop or browse to load your own Excel file.

## Project structure

```
helioscore/
├── index.html              # data dashboard (default landing)
├── simulator.html          # what-if simulator
├── css/
│   ├── tokens.css          # design tokens (colors, fonts, sizing)
│   ├── shared.css          # tiles, upload zone, hover-tip, header
│   ├── dashboard.css       # dashboard-only styles
│   └── simulator.css       # simulator-only styles
├── js/
│   ├── format.js           # number formatting helpers
│   ├── hover-tip.js        # global tooltip system
│   ├── parser.js           # Excel → DATA object
│   ├── sample-data.js      # bundled sample workbook (base64)
│   ├── data-loader.js      # file picker, drag-drop, sample loader
│   ├── dashboard.js        # dashboard rendering
│   └── simulator.js        # simulator rendering + handlers
├── .nojekyll               # tells GitHub Pages to skip Jekyll
└── README.md               # this file
```

## Running locally

Most browsers block `<script src=...>` tags when opened via `file://`. To test locally, run a quick HTTP server in this folder:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000/`.

## Deploying to GitHub Pages

1. Commit this folder to a GitHub repo (the folder contents at the repo root, or put it in a `docs/` folder).
2. In repo settings → Pages, point the source at `main` branch (or `docs/`).
3. Visit `https://<username>.github.io/<repo>/`.

The `.nojekyll` file tells GitHub Pages not to process the site through Jekyll, which would otherwise mangle some assets.

## Excel data format

The dashboard expects three sheets:

| Sheet | Columns |
|-------|---------|
| `Supply_Demand` | `Week`, `Forecasted_Demand`, `Projected_Supply` |
| `Committed_Lead_time` | `Station_ID`, `Committed_LT_Days` |
| `Daily_Lot_Data` | `Lot_ID`, `Date`, `Factory_Line`, `Wafer_Quality_Grade`, `Station_ID`, `Actual_LT_Days`, `Cummulative_Yield_Percentage` |

The parser auto-normalizes yield values: if observed yields are ≤ 1.5, they're assumed to be fractional (e.g. 0.9958) and scaled to percentage (99.58%).

## Dependencies

- [SheetJS](https://sheetjs.com/) v0.18.5 — loaded via cdnjs CDN. Used to parse Excel files.

No build step. No bundler. Plain HTML/CSS/JS.
