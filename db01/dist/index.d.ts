/**
 * @file MQTT → PostgreSQL subscriber microservice. Subscribes to the DR#1 topic
 * tree on the MQTT broker, validates each incoming payload, and persists it to
 * the appropriate PostgreSQL table (telemetry or equipment_status). Uses a
 * connection pool so high message throughput doesn't exhaust connections.
 * @module db01
 * @author Team 2 — Cohort 7, Group 2
 * @version 1.0.0
 */
export {};
//# sourceMappingURL=index.d.ts.map