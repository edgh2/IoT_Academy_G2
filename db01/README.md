# db01 — MQTT → PostgreSQL Subscriber

Subscriber microservice that persists DR#1 telemetry. Subscribes to the DR#1 topic
tree on the MQTT broker, validates each incoming payload, and writes it to the
appropriate PostgreSQL table.

## Pipeline position
[ Beckhoff PLC ] → OPC-UA → opc05 → MQTT → **db01** → PostgreSQL → rest05 → dashboards

## What it does

- Subscribes to the configured namespace wildcard topic
- Validates each payload against the expected `{ timestamp, value }` shape;
  malformed messages are logged and rejected, not persisted
- Routes **status** topics to `equipment_status` (boolean) and all other topics
  to `telemetry` (numeric value)
- Uses a PostgreSQL connection pool (max 10) to handle message throughput without
  a connect/disconnect per message

## Key functions

- `processMessageReceived` — parses, validates, and routes each MQTT message
- `executeQuery` — runs the INSERT against the connection pool
- `is_iMQTTPayload` — type guard that validates incoming payloads
- See the **Modules → db01** link for full per-function documentation

## Database tables

- `telemetry` — `timestamp, deviceid, metric, value, payload`
- `equipment_status` — `timestamp, deviceid, status_name, status, payload`

## Running

1. `npm install`
2. `npm run build`
3. `npm start`

Configuration (MQTT broker, topic namespace, PostgreSQL connection) is read from
`config.json`.

## Team

Team 2 — Cohort 7, Group 2