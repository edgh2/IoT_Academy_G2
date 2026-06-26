/*
 * index.ts
 */
var config = readFileAsJSON("./config.json");
import * as fs from 'fs';
import * as path from 'path';
import express from 'express';
import * as pg from 'pg';
const pool = new pg.Pool({
    host: config.sql.host,
    port: config.sql.port,
    database: config.sql.database,
    user: process.env.POSTGRESUSER,
    password: process.env.POSTGRESPW
});
const PORT = 5000;
function readFileAsArray(fname) {
    try {
        let tag = fs.readFileSync(fname, "utf8")
            .split(/\r?\n/)
            .map(line => (line.split("//")[0] ?? "").trim())
            .map(line => (line.split("#")[0] ?? "").trim())
            .filter(line => line.length > 0);
        console.log(tag);
        return tag;
    }
    catch (err) {
        console.log(err);
        return [];
    }
}
function readFileAsJSON(fname) {
    try {
        let data = fs.readFileSync(fname).toString();
        return JSON.parse(data);
    }
    catch (err) {
        console.log(err);
        return {};
    }
}
async function torque_query(from, until, limit = 5000) {
    const query = `
        SELECT
            s.tag,
            (t.datestamp - INTERVAL '4 hours') AS datestamp,
            ABS(t.value::numeric) AS value
        FROM public."tb_OPC_TagLogs" t
        INNER JOIN public."tb_OPC_TagSetup" s
            ON t."tagSetupUID" = s.uid
        WHERE s.tag ILIKE '%torque%'
        AND ($1::timestamp IS NULL OR t.datestamp >= $1)
        AND ($2::timestamp IS NULL OR t.datestamp <= $2)
        ORDER BY t.datestamp ASC
        LIMIT $3
    `;
    const result = await pool.query(query, [
        from || null,
        until || null,
        limit
    ]);
    return result.rows;
}
async function position_query() {
    const query = `
        SELECT DISTINCT ON (s.tag)
            s.tag,
            (t.datestamp - INTERVAL '4 hours') AS datestamp,
            t.value::numeric AS value
        FROM public."tb_OPC_TagLogs" t
        INNER JOIN public."tb_OPC_TagSetup" s
            ON t."tagSetupUID" = s.uid
        WHERE s.tag ILIKE '%ROBOTPOS%'
        ORDER BY s.tag, t.datestamp DESC
    `;
    const result = await pool.query(query);
    return result.rows;
}
async function redline_query(from, until, limit = 100) {
    const query = `
        WITH torque_data AS (
            SELECT
                s.tag,
                t.datestamp,
                t.value::numeric AS torque
            FROM public."tb_OPC_TagLogs" t
            INNER JOIN public."tb_OPC_TagSetup" s
                ON t."tagSetupUID" = s.uid
            WHERE s.tag ILIKE '%torque%'
              AND ($1::timestamp IS NULL OR t.datestamp >= $1)
              AND ($2::timestamp IS NULL OR t.datestamp <= $2)
        ),
        limits AS (
            SELECT
                tag,
                GREATEST(
                    MAX(torque),
                    ABS(MIN(torque))
                ) AS max_torque
            FROM torque_data
            GROUP BY tag
        ),
        latest AS (
            SELECT DISTINCT ON (tag)
                tag,
                torque AS latest_torque,
                datestamp
            FROM torque_data
            ORDER BY tag, datestamp DESC
        )
        SELECT
            l.tag,
            latest.latest_torque,
            ROUND((l.max_torque * 0.8)::numeric, 2) AS redline_limit,
            ABS(latest.latest_torque) >= l.max_torque * 0.8
                AS is_redline,
            COUNT(*) FILTER (
                WHERE ABS(td.torque) >= l.max_torque * 0.8
            ) AS redline_readings,
            COUNT(*) AS total_readings
        FROM limits l
        JOIN latest
            ON latest.tag = l.tag
        JOIN (
            SELECT *
            FROM torque_data
            ORDER BY datestamp DESC
            LIMIT $3
        ) td
            ON td.tag = l.tag
        GROUP BY
            l.tag,
            l.max_torque,
            latest.latest_torque
        ORDER BY l.tag;
    `;
    const result = await pool.query(query, [
        from || null,
        until || null,
        limit
    ]);
    return result.rows;
}
async function torque_redline_query() {
    const query = `
        SELECT
            s.tag,
            (MAX(ABS(t.value::numeric)) * 0.8)::numeric AS redline
        FROM public."tb_OPC_TagLogs" t
        INNER JOIN public."tb_OPC_TagSetup" s
            ON t."tagSetupUID" = s.uid
        WHERE s.tag ILIKE '%torque%'
          AND t.datestamp >= NOW() - INTERVAL '1 hour'
        GROUP BY s.tag
    `;
    const result = await pool.query(query);
    return result.rows;
}
async function status_query(from, until) {
    const query = `
        SELECT
            "tagSetupUID",
            tag,
            datestamp,
            value
        FROM (
            SELECT
                t."tagSetupUID",
                s.tag,
                (t.datestamp - INTERVAL '4 hours') AS datestamp,
                t.value,
                ROW_NUMBER() OVER (
                    PARTITION BY t."tagSetupUID"
                    ORDER BY t.datestamp DESC
                ) AS rn
            FROM public."tb_OPC_TagLogs" t
            INNER JOIN public."tb_OPC_TagSetup" s
                ON t."tagSetupUID" = s.uid
            WHERE ($1::timestamp IS NULL OR t.datestamp >= $1)
              AND ($2::timestamp IS NULL OR t.datestamp <= $2)
              AND t."tagSetupUID" < 26
        ) ranked
        WHERE rn = 1
        ORDER BY "tagSetupUID" ASC
    `;
    const result = await pool.query(query, [
        from || null,
        until || null,
    ]);
    return result.rows;
}
async function sql_query(from, until, limit = 100) {
    const query = `
        SELECT
            tag,
            "deviceID",
            CASE
                WHEN position('Rob' in tag) = 0 THEN 'cell'
                ELSE substring(tag, position('Rob' in tag), 4)
            END AS device,
            datestamp,
            value
        FROM public."tb_OPC_TagLogs" t
        INNER JOIN public."tb_OPC_TagSetup" s
            ON "tagSetupUID" = s.uid
        WHERE ($1::timestamp IS NULL OR datestamp >= $1)
          AND ($2::timestamp IS NULL OR datestamp <= $2)
        ORDER BY datestamp DESC
        LIMIT $3
    `;
    const result = await pool.query(query, [
        from || null,
        until || null,
        limit
    ]);
    return result.rows;
}
function main() {
    const app = express();
    app.use(express.static(path.join(path.dirname(import.meta.filename), "../public")));
    app.use((req, res, next) => {
        console.log(`${req.method} ${req.path}`);
        next();
    });
    const apiRouter = express.Router();
    apiRouter.use((req, res, next) => {
        console.log("apiRouter specific middleware!");
        next();
    });
    apiRouter.get('/filter', async (req, res) => {
        try {
            const limit = parseInt(req.query.limit) || 100;
            const from = req.query.from;
            const until = req.query.until;
            const rows = await sql_query(from, until, limit);
            res.json(rows);
        }
        catch (err) {
            console.error(err);
            res.status(500).json({
                error: 'Database query failed'
            });
        }
    });
    apiRouter.get('/redline', async (req, res) => {
        try {
            const limit = parseInt(req.query.limit) || 100;
            const from = req.query.from;
            const until = req.query.until;
            const rows = await redline_query(from, until, limit);
            res.json(rows);
        }
        catch (err) {
            console.error(err);
            res.status(500).json({
                error: 'Redline query failed'
            });
        }
    });
    apiRouter.get('/status', async (req, res) => {
        try {
            const from = req.query.from;
            const until = req.query.until;
            const rows = await status_query(from, until);
            res.json(rows);
        }
        catch (err) {
            console.error(err);
            res.status(500).json({
                error: 'Status query failed'
            });
        }
    });
    apiRouter.get('/torque', async (req, res) => {
        try {
            const limit = parseInt(req.query.limit) || 5000;
            const from = req.query.from;
            const until = req.query.until;
            const rows = await torque_query(from, until, limit);
            res.json(rows);
        }
        catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Torque query failed' });
        }
    });
    apiRouter.get('/torque/redline', async (req, res) => {
        try {
            const rows = await torque_redline_query();
            res.json(rows);
        }
        catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Torque redline query failed' });
        }
    });
    apiRouter.get('/position', async (req, res) => {
        try {
            const rows = await position_query();
            res.json(rows);
        }
        catch (err) {
            console.error(err);
            res.status(500).json({ error: 'Position query failed' });
        }
    });
    app.use(apiRouter);
    app.get('/', (req, res) => {
        res.send("Welcome to our first TypeScript REST API App!");
    });
    app.listen(PORT, () => {
        console.log(`Hello Seattle, I’m listening! (on port ${PORT})`);
    });
}
main();
//# sourceMappingURL=index.js.map