# opc05 — OPC-UA → MQTT Publisher

Publisher microservice for Delta Robot #1 (DR#1). Connects to the Beckhoff PLC's
OPC-UA server, subscribes to the configured tags, and publishes each value change
to the MQTT broker under the Magna namespace.

This is the **head of the IoT pipeline** — every downstream service (subscriber,
database, dashboards) depends on this feed.

## Pipeline position

[ Beckhoff PLC ] → OPC-UA → **opc05** → MQTT → db01 → PostgreSQL → rest05 → dashboards

## What it does

- Connects to the OPC-UA server and creates a monitored subscription per tag
- On each value change, builds an MQTT topic from the configured namespace
  (organization → division → plant → area → line → workstation → tag)
- Routes status tags under a `status/` sub-path
- Publishes a JSON payload of `{ timestamp, value }` to the broker
- Read-only: never writes back to the PLC

## Key functions

- `readOPCTags` — establishes OPC-UA + MQTT connections, registers subscriptions
- `setupTagSubscriptions` — creates a monitored item per tag, derives the device
- `handleDataReceived` — builds the topic and publishes each reading
- See the **Modules → opc05** link for full per-function documentation

## Running

1. `npm install`
2. `npm run build`
3. `npm start`

Configuration (OPC-UA endpoint, MQTT broker, topic namespace) is read from
`config.json`. The tag list is read from `tags.txt`.

## Team

Team 2 — Cohort 7, Group 2