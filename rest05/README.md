# rest05 — DR#1 Telemetry REST API

REST API microservice serving DR#1 data from PostgreSQL behind HTTP endpoints, so
dashboards consume data through the API rather than touching the database directly
(no DB credentials exposed in web pages). Also serves static dashboard files from
`public/`.

## Pipeline position

[ Beckhoff PLC ] → OPC-UA → opc05 → MQTT → db01 → PostgreSQL → **rest05** → dashboards

## Endpoints

- `GET /filter` — telemetry rows filtered by metric, device, and time range
- `GET /diag` — aggregated torque diagnostics (high-torque count + duration per motor)
- `GET /status` — latest equipment status for a device, as a readable sentence

All endpoints support both this team's schema (`db=g2`, the flat `telemetry`
table) and the other team's schema (`db=g1`, the joined `tb_OPC_TagLogs` /
`tb_OPC_TagSetup` tables).

## Example requests
GET /filter?db=g2&device=Rob1&metric=ROBOTPOS.X&from=2026-06-23T00:00:00Z&to=2026-06-24T00:00:00Z&limit=50

GET /diag?db=g2&from=2026-06-23T00:00:00Z&to=2026-06-24T00:00:00Z

GET /status?db=g2&device=Rob2

See the **Modules → rest05** link for full per-endpoint documentation.

## Running

1. `npm install`
2. `npm run build`
3. `npm start`

Configuration (port, PostgreSQL connection, per-team database names) is read from
`config.json`.

## Team

Team 2 — Cohort 7, Group 2