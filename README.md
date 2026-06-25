# IoT Academy Capstone — DR#1 Robot Monitoring System

**Team 2 · Cohort 7, Group 2**
Evan Lumbers · Mamatha Thalari · Edward Gharibian · Luca Munekata · Thomas Reininger

An end-to-end IoT data pipeline for monitoring **Delta Robot #1 (DR#1)** in a
robotic waste-sorting work cell. The system reads live robot data from a Beckhoff
PLC, moves it through an MQTT messaging layer into a PostgreSQL time-series store,
exposes it through a REST API, and visualizes it for two distinct audiences — plant
floor operators and process engineers.

Built for the Magna COSMA IoT Academy capstone (Project CAPSTONE-722).

---

## Architecture

The solution is a set of loosely coupled microservices communicating over
standardized protocols (OPC-UA, MQTT, REST):

```text
┌──────────────┐  OPC-UA   ┌──────────┐   MQTT    ┌──────────────┐
│ Beckhoff PLC │ ────────► │  Opc     │ ────────► │     MQTT     │
│  DR#1 source │           │ Publisher│           │  Subscriber  │
└──────────────┘           └──────────┘           └──────┬───────┘
                                                         │
                                                         ▼
┌──────────────┐   HTTP    ┌──────────┐         ┌──────────────┐
│  Dashboards  │ ◄──────── │ REST API │ ◄───────│  PostgreSQL  │
│ Grafana, Web │           │ Service  │         │ telemetry,   │
└──────────────┘           └──────────┘         │ status       │
      ▲                                         └───────┬──────┘
      │                                                 │
      │                                                 │
      │_________________________________________________|
```

Data flows in one direction: the PLC is read over OPC-UA by **Opc Publisher**, published to
the MQTT broker, consumed by **Postgres Service1** and written to PostgreSQL, then served over
HTTP by **REST API Service** to the dashboards.

| Stage | Service | Protocol in → out | Role |
|-------|---------|-------------------|------|
| 1 | **Opc Publisher** | OPC-UA → MQTT | Reads DR#1 status/position/torque tags, publishes under the Magna namespace |
| 2 | **Postgres Service1** | MQTT → PostgreSQL | Subscribes, validates payloads, persists telemetry and equipment status |
| 3 | **REST API Service** | PostgreSQL → HTTP | Serves stored + computed data so dashboards never touch the database directly |
| 4 | **Dashboards** | MQTT / HTTP / SQL | Grafana and web visualizations for floor operators and engineers |

| Stage | Service | Role |
|-------|---------|------|
| 1 | **Opc Publisher** | Reads DR#1 status/position/torque tags via OPC-UA, publishes to the MQTT broker under the Magna namespace |
| 2 | **Postgres Service1** | Subscribes to MQTT, validates payloads, persists to PostgreSQL (telemetry + equipment_status) |
| 3 | **REST API Service** | Serves stored data over HTTP so dashboards never touch the database directly |
| 4 | **dashboard** | Web-based and Grafana visualizations consuming the REST API, MQTT, and database |

---

## Repository structure

| Path | Contents |
|------|----------|
| `Opc Publisher/` | OPC-UA → MQTT publisher microservice (TypeScript) |
| `Postgres Service1/` | MQTT → PostgreSQL subscriber microservice (TypeScript) |
| `REST API Service/` | REST API microservice + served web dashboards (TypeScript / Express) |
| `dashboard/` | Grafana dashboard definition (JSON export) — importable into Grafana to recreate the work-cell visualizations |
| `index.html` | Documentation hub — links to each service's generated JSDoc site |
| `docs-theme.css` | Shared styling applied to the generated documentation |
| `inject-theme.js` | Post-generation script that applies the theme across all doc sites |

Each microservice folder contains its own `src/`, `config.json`, `tags.txt`,
`package.json`, and a generated `docs/` site.

---

## The data

DR#1 (and the wider work cell) expose three categories of data:

- **Status** — cell and per-robot state: running, paused, initialized, workspace
  violation, safety enable (stored in `equipment_status`)
- **Position** — robot EOAT X/Y/Z coordinates (stored in `telemetry`)
- **Torque** — per-motor actual torque, used to approximate motor wear (stored in
  `telemetry`)

The pipeline also ingests data from a second robot cell, and `REST API Service` supports
querying both this team's schema and the partner team's schema.

---

## Visualization

The `dashboard/` folder contains a **Grafana dashboard exported as JSON**. Import
it into a Grafana instance (Dashboards → New → Import → upload the JSON) to
recreate the work-cell panels without rebuilding them by hand.

The dashboard reads from the PostgreSQL data source and presents:

- **Cell and robot status** — running, paused, initialized, workspace violation,
  colour-coded for at-a-glance reading
- **EOAT position** — live X/Y/Z trace per robot
- **Motor torque & wear** — per-motor torque with redline thresholds for spotting
  premature wear

> The dashboard JSON includes a data-source reference. On import, select your own
> PostgreSQL data source from the dropdown so the panels bind to the correct
> connection.

---

## Key features

- **Read-only PLC access** — the system only monitors; it never writes to the PLC
  (safety requirement, SRS 2.4.6)
- **Payload validation** — malformed MQTT messages are rejected before reaching
  the database
- **Connection pooling** — the subscriber uses a PostgreSQL pool to handle message
  throughput
- **Computed analytics** — the REST API derives a torque "redline" wear
  approximation, not just raw rows
- **Audience-driven dashboards** — an operational view (glanceable status, live
  position) for the floor, and an analytical view (torque trends, wear) for
  engineers, mapped to the user groups in SRS 2.3
- **Generated documentation** — every microservice is documented with JSDoc

---

## Running a microservice

Each service follows the same pattern. From its folder:

```bash
npm install
npm run build      # compile TypeScript → dist/
npm start          # run the compiled service
```

Configuration (connection endpoints, credentials, topic namespace) is read from
each service's `config.json`. Tag lists are read from `tags.txt`.

---

## Documentation

Each microservice has a generated JSDoc site under its `docs/` folder. Open the
top-level **`index.html`** in a browser for the documentation hub, which links into
all three.

To regenerate documentation for a service:

```bash
npm run build
npx jsdoc dist -d docs -R README.md
```

Then apply the shared theme across all generated sites:

```bash
node inject-theme.js
```

---

## Technology

TypeScript · Node.js · Express · node-opcua-client · MQTT · PostgreSQL (pg) ·
Grafana · JSDoc · GitHub Projects

---

## Project management

Requirements, use cases, and user stories are tracked in **GitHub Projects**,
organized by the four pipeline epics (Publisher, Subscriber, REST API,
Visualization) and traced back to the SRS. See the project board for the full
breakdown.

## Documentation artifacts

- **Project Charter** — scope, deliverables, milestones (CAPSTONE-722)
- **Agile SRS** — use cases, actors, constraints, failure modes
- **GitHub Projects board** — epics, user stories, acceptance criteria
- **Generated JSDoc** — per-service API documentation
