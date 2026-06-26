# dashboard — DR#1 Robot Monitor Web UI

Browser dashboard that visualises live OPC tag data from the DR#1 cell. Reads
from the rest05 REST API and renders three views: current tag status, recent
torque history per motor with a redline overlay, and current robot X/Y
positions on the cell floor. Served as static files from rest05's `public/`
directory, so no separate web server is needed.

## Pipeline position

[ Beckhoff PLC ] → OPC-UA → opc05 → MQTT → db01 → PostgreSQL → rest05 → **dashboard**

## Views

- **Status** — one card per OPC tag, grouped by robot, with latest value, timestamp, and tag UID. Booleans render as green/grey badges; numeric tags get a dot coloured by zero/non-zero state.
- **Torque** — per-robot SVG line chart of joint torques, one line per motor axis (M1…Mn), with a From/To time window. Defaults to the last 30 seconds. A dashed red threshold line is drawn at the redline value (80% of each tag's recent peak), fetched separately so it survives time-window changes.
- **Position** — top-down X/Y scatter of each robot's most recent `ROBOTPOS` reading. Z is shown below each dot when present.

## Endpoints consumed

- `GET /status` — Status view
- `GET /torque?from=…&until=…` — Torque view samples
- `GET /torque/redline` — Torque view threshold overlay (fetched in parallel with `/torque`)
- `GET /position` — Position view

The API base URL lives in the hidden `#api-url` field in `dashboard.html` (default `http://localhost:5000`).

## Toolbar

- **Tabs** — Status / Torque / Position
- **Robot filter** — all robots, a single Rob*N*, or `Cell` (tags with no robot prefix)
- **From / To** — datetime range, only shown on the Torque tab; editing either field triggers an immediate refetch
- **Auto-refresh** — Off / 1s / 5s / 10s / 30s / 60s (1s default). Skipped on the Torque tab when both From and To are set, so a fixed window isn't overwritten.
- **Refresh** — manual fetch (also runs on the Torque tab even with a fixed window)

The connection dot in the header pulses blue while fetching, turns green on success, and red on error. The most recent error message appears in a red bar above the content area.

## Files

- `dashboard.html` — page structure, toolbar, three tab panels
- `dashboard.css` — light/dark theme via `prefers-color-scheme`, chart styling, colour palette, redline overlay
- `dashboard.js` — fetching, grouping by robot, SVG chart rendering, tab and timer logic

## Running

The dashboard is served by rest05 as a static file. From the rest05 project root:

1. `npm install`
2. `npm run build`
3. `npm start`

Then open `http://localhost:5000/dashboard.html` in a browser.

## Team

Team 2 — Cohort 7, Group 2