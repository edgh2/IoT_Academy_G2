/**
 * @file REST API microservice for DR#1 telemetry. Serves filtered telemetry,
 * torque diagnostics, and equipment status from PostgreSQL behind HTTP
 * endpoints, supporting both this team's (g2) and the other team's (g1)
 * database schemas. Static dashboard files are served from the public/ folder.
 * @module rest05
 * @author Team 2 — Cohort 7, Group 2
 * @version 1.0.0
 */

import * as fs from 'fs';
import * as path from 'path';
import * as pg from 'pg';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';

/**
 * Absolute path to the package root (one level above the compiled source
 * directory). Used to locate the public/ folder for static file serving.
 *
 * @constant {string}
 */
const filesPath = path.dirname(import.meta.filename) + "/../";

/**
 * Global configuration object, loaded once at startup from config.json. Holds
 * the project title, listening port, SQL connection settings (config.sql), and
 * the per-team database names (g1dbname / g2dbname).
 *
 * @constant {object}
 */
const config:any = readFileAsJSON("./config.json");;

/**
 * A single telemetry/status row returned by the database queries.
 *
 * @typedef {Object} IoTRow
 * @property {string} tag - the metric/tag identifier for the reading
 * @property {string} device - the device the reading belongs to (e.g. Rob1, cell)
 * @property {Date} timestamp - the time the reading was recorded
 * @property {number} value - the numeric value of the reading
 */
interface IoTRow {
  tag: string;
  device:string,
  timestamp: Date;
  value: number;
}

/**
 * PostgreSQL connection settings, as held under config.sql. The database name
 * is set per-request to either config.g1dbname or config.g2dbname depending on
 * which team's schema is being queried.
 *
 * @typedef {Object} DbConfig
 * @property {string} host - PostgreSQL host
 * @property {number} port - PostgreSQL port
 * @property {string} database - database name (set per request to g1/g2)
 * @property {string} user - database user
 * @property {string} password - database password
 */

/**
 * Reads a text file and splits it into an array of lines.
 *
 * @param {string} fname - The path to the file (absolute or relative).
 * @returns {string[]} one element per line of the file, or an empty array on error.
 *
 * @throws {Error} If the file cannot be read (caught internally; an empty array
 * is returned instead of propagating the error).
 *
 * @example
 * const tags = readFileAsArray('./tags.txt');
 */
function readFileAsArray(fname:string) : string[]
{
	try {
		let textlines:string[] = fs.readFileSync(fname).toString().split("\r\n");
		return textlines;
	} catch (err) {
		console.log(err);
		return [];
	}
}

/**
 * Reads a text file and parses its contents into a JSON object (data type any).
 *
 * @param {string} fname - The path to the file (absolute or relative).
 * @returns {*} the parsed result of the file contents.
 *
 * @throws {Error} If the file does not exist, cannot be read, or contains
 * invalid JSON (caught internally; an empty array is returned on failure).
 *
 * @example
 * const config = readFileAsJSON('config.json');
 * console.log(config.projectTitle);
 */
function readFileAsJSON (fname:string) : any
{
	try {
		let data:string = fs.readFileSync(fname).toString();
		return JSON.parse(data);
	} catch (err) {
		console.log(err);
		return [];
	}
}

/**
 * Converts an incoming value of unknown type to a base-10 integer, falling back
 * to a default when the value is missing or cannot be parsed as a number.
 *
 * @param {*} data - The raw value to convert (e.g. a URL query parameter).
 * @param {number} def - The default to return when data is undefined or NaN.
 * @returns {number} the parsed integer, or def if conversion fails.
 *
 * @example
 * const limit = convertDataToInteger(req.query.limit, 100);
 */
function convertDataToInteger (data:any, def:number): number
{
	let n:number = def;
	if (data != undefined) {
		n = parseInt (data.toString(), 10);
		if (Number.isNaN(n)) {
			n = def;
		}
	}
	return n;
}

/**
 * GET /filter route handler.
 *
 * Returns telemetry rows filtered by metric, device, and time range, newest
 * first, as a JSON-stringified array. Selects between two database schemas via
 * the "db" query key: "g2" (this team's flat telemetry table) or "g1" (the
 * other team's joined TagLogs/TagSetup schema).
 *
 * Supported query keys: metric (string), device (string, g2 only),
 * db ("g2" default | "g1"), from (ISO timestamp, required), to (ISO timestamp,
 * required), limit (number, default 100).
 *
 * @async
 * @param {express.Request} req - the incoming HTTP request (query params drive the filter)
 * @param {express.Response} res - the HTTP response; receives the JSON result
 * @returns {Promise<void>}
 *
 * @example
 * GET /filter?db=g2&device=Rob1&metric=ROBOTPOS.X&from=2026-06-23T00:00:00Z&to=2026-06-24T00:00:00Z&limit=50
 */
async function filterHandler(req:Request, res:Response): Promise<void>
{
	// gather and default the query parameters
	let metric = req.query.metric?.toString()?? "";
	let device = req.query.device?.toString()?? "";
	let db = req.query.db?.toString()?? "g2";
	let from_ts = req.query.from?.toString()?? "";
	let to_ts = req.query.to?.toString()?? "";
	let limit = convertDataToInteger(req.query?.limit, 100);

	// parse the supplied timestamps into Date objects for validation
	let from:Date = new Date(from_ts);
	let to:Date = new Date(to_ts);

	// reject the request if either timestamp is invalid
	if (isNaN(from.getTime())) {
		console.log("Bad start date");
		return;
	}

	if (isNaN(to.getTime())) {
		console.log("Bad start date");   // NOTE: message says "start" but this validates the end (to) date
		return;
	}

	let sql_command:string = "";
	let dbconfig = config.sql;

	// build the query against whichever team's schema was requested
	if (db==="g2")
	{
		// this team's schema: flat telemetry table with deviceid + metric columns
		dbconfig.database = config.g2dbname;
		sql_command = `SELECT "timestamp", deviceid, metric, value
							FROM public.telemetry
							where metric = '${metric}' and deviceid= '${device}'
								and timestamp between '${from.toISOString()}' and '${to.toISOString()}'
							order by timestamp desc
							limit ${limit};`;
	}
	else
	{
		// other team's schema: TagLogs joined to TagSetup, device derived from tag text
		dbconfig.database = config.g1dbname;
		sql_command = `SELECT tag, CASE WHEN position('Rob' in tag) = 0 THEn 'cell'
								else substring(tag, position('Rob' in tag), 4) end as "device",
								datestamp "timestamp", value
							FROM public."tb_OPC_TagLogs" t
								inner join public."tb_OPC_TagSetup" s on "tagSetupUID" = s.uid
							where tag = '${metric}' and datestamp between '${from.toISOString()}' and '${to.toISOString()}'
							order by datestamp desc
							limit ${limit};`;
	}

	// log the built query for diagnostics (paste into psql to verify)
	console.log(sql_command);
		if (db==="g2")
		{
			dbconfig.database = config.g2dbname;
			sql_command = `SELECT "timestamp" at time zone 'utc' at time zone 'america/toronto'
							, deviceid, metric, value
								FROM public.telemetry
								where metric = '${metric}' and deviceid= '${device}'
									and timestamp between '${from.toISOString()}' and '${to.toISOString()}'
								order by timestamp desc
								limit ${limit};`;
		}
		else
		{
			dbconfig.database = config.g1dbname;
			sql_command = `SELECT tag, CASE WHEN position('Rob' in tag) = 0 THEn 'cell'
									else substring(tag, position('Rob' in tag), 4) end as "device",
									datestamp "timestamp", value
								FROM public."tb_OPC_TagLogs" t
									inner join public."tb_OPC_TagSetup" s on "tagSetupUID" = s.uid
								where tag = '${metric}' and datestamp between '${from.toISOString()}' and '${to.toISOString()}'
								order by datestamp desc
								limit ${limit};`;
		}
		
		console.log(sql_command);

	// connect, run the query, capture rows as JSON, always disconnect
	const dbclient = new pg.Client (dbconfig);
	let jsonString: string = "";

	try
	{
		dbclient.connect();
		const result = await dbclient.query<IoTRow>(sql_command);
		jsonString = JSON.stringify(result.rows);

	}catch (err){
		console.log(err)
	}
	finally
	{
		dbclient.end();
	}

	res.json(jsonString);
}

/**
 * GET /diag route handler.
 *
 * Returns aggregated torque diagnostics per device/metric: for readings whose
 * absolute torque exceeds 20, reports the time span (from/to), the count, and
 * the summed duration spent in that high-torque state. Duration per reading is
 * computed with a window function (lag) over the previous reading's timestamp.
 * Supports the "g2" and "g1" schemas like /filter.
 *
 * Supported query keys: db ("g2" default | "g1"), from (ISO timestamp,
 * required), to (ISO timestamp, required).
 *
 * @async
 * @param {express.Request} req - the incoming HTTP request
 * @param {express.Response} res - the HTTP response; receives the JSON aggregate result
 * @returns {Promise<void>}
 *
 * @example
 * GET /diag?db=g2&from=2026-06-23T00:00:00Z&to=2026-06-24T00:00:00Z
 */
async function diagHandler(req:Request, res:Response): Promise<void>
{
	console.log("In test apiStat API");

	// gather and default the query parameters (no metric/device: aggregates all)
	let db = req.query.db?.toString()?? "g2";
	let from_ts = req.query.from?.toString()?? "";
	let to_ts = req.query.to?.toString()?? "";

	// parse timestamps for validation
	let from:Date = new Date(from_ts);
	let to:Date = new Date(to_ts);

	if (isNaN(from.getTime())) {
		console.log("Bad start date");
		return;
	}

	if (isNaN(to.getTime())) {
		console.log("Bad start date");   // NOTE: validates the "to" date despite the "start" wording
		return;
	}


	let sql_command:string = ""
	let dbconfig = config.sql;

	// build the aggregate query against the requested schema. the inner subquery
	// computes per-reading duration via lag() over the previous reading's
	// timestamp; the outer query filters to high-torque readings (abs value > 20)
	// and groups per device/metric.
	if (db==="g2")
	{
		dbconfig.database = config.g2dbname;
		sql_command = `select deviceid, metric, min(timestamp) "from", max(timestamp) "to", count(1) "count"
					,sum (duration)
			from
			(
				SELECT "timestamp", deviceid, metric, value
					,
					COALESCE(timestamp - lag(timestamp) over (partition by deviceid, metric order by timestamp), '0 seconds'::interval) duration
				FROM public.telemetry

				where lower(metric) like '%torque%'
					--and datestamp between '${from.toISOString()}' and '${to.toISOString()}'
				and abs(cast(value as float)) > 20
			)
			group by deviceid, metric`;
	}
	else
	{
		dbconfig.database = config.g1dbname;
		sql_command = `select tag "metric", min(datestamp) "from", max(datestamp) "to", count(1) "count"
							,sum (duration)
						from
						(
							SELECT tag, CASE WHEN position('Rob' in tag) = 0 THEn 'cell'
								else substring(tag, position('Rob' in tag), 4) end as "device",
								datestamp, value
								--, datestamp - lag(datestamp) over (partition by tag order by datestamp) xx
								,COALESCE(datestamp - lag(datestamp) over (partition by tag order by datestamp), '0 seconds'::interval) duration
							FROM public."tb_OPC_TagLogs" t
								inner join public."tb_OPC_TagSetup" s on "tagSetupUID" = s.uid
							where lower(tag) like '%torque%'
								and datestamp between '${from.toISOString()}' and '${to.toISOString()}'
						) tbl
						where abs(cast(value as float)) > 20
						group by tag;`;
	}

	console.log(sql_command);

	// NOTE: connects with config.sql directly rather than the dbconfig built
	// above. Works only because dbconfig === config.sql (same reference, mutated
	// in place), but reads as a bug — prefer using dbconfig for clarity.
	const dbclient = new pg.Client (config.sql);
	let jsonString: string = "";

	try
	{
		dbclient.connect();
		const result = await dbclient.query<IoTRow>(sql_command);
		const dbrows = result.rows;
		jsonString = JSON.stringify(dbrows);

	}catch (err){
		console.log(err)
	}
	finally
	{
		dbclient.end();
	}

	res.json(jsonString);
}

/**
 * GET /status route handler.
 *
 * Returns the most recent equipment-status row for a given device as a
 * human-readable sentence (e.g. "Rob2 is RUNNING"), JSON-stringified. Currently
 * implemented for the "g2" schema only; the "g1" branch is a stub.
 *
 * Supported query keys: device (string, case-insensitive), db ("g2" default | "g1").
 *
 * @async
 * @param {express.Request} req - the incoming HTTP request
 * @param {express.Response} res - the HTTP response; receives the single-row JSON result
 * @returns {Promise<void>}
 *
 * @example
 * GET /status?db=g2&device=Rob2
 */
async function statusHandler(req:Request, res:Response): Promise<void>
{
	console.log("In test getStatus API");

	// gather and default the query parameters
	//let metric = req.query.metric?.toString()?? "";
	let device = req.query.device?.toString()?? "";
	let db = req.query.db?.toString()?? "g2";

	let sql_command:string = "";
	let dbconfig = config.sql;

	// build the latest-status query; g1 schema not yet implemented
	if (db==="g2")
	{
		dbconfig.database = config.g2dbname;
		sql_command = `SELECT "timestamp",
							deviceid ||  CASE WHEN status = 'true' then ' is ' else ' is not ' end
							|| status_name "statusText"
						FROM public.equipment_status
						where lower(deviceid)=lower('${device}')
						order by "timestamp" desc
						limit 1;`;
	}
	else
	{
		dbconfig.database = config.g1dbname;
		sql_command = "";   // NOTE: g1 status query not implemented; empty SQL will error when run
	}

	// NOTE: like /diag, connects with config.sql rather than the branch dbconfig
	const dbclient = new pg.Client (config.sql);
	let jsonString: string = "";

	try
	{
		dbclient.connect();
		const result = await dbclient.query<IoTRow>(sql_command);
		const dbrows = result.rows;
		jsonString = JSON.stringify(dbrows);

	}catch (err){
		console.log(err)
	}
	finally
	{
		dbclient.end();
	}

	res.json(jsonString);
}

/**
 * Application entry point. Loads configuration, builds the Express application,
 * registers logging middleware and static file serving, mounts the three API
 * routers (/filter, /diag, /status), then begins listening on the configured
 * port. Finally reads and echoes the tag list from tags.txt for verification.
 *
 * @returns {void}
 */
function main()
{
	//config = readFileAsJSON("./config.json");
	console.log("Project title: ", config.projectTitle);

	const app:express.Application = express();

	// application-wide logging middleware: logs method + path of every request
	app.use((req:Request, res:Response, next:NextFunction) => {
		console.log(`${req.method} ${req.path}`)
		next();
	});

	// home route - simple welcome message to confirm the API is reachable
	app.get('/', (req:Request, res:Response) => {
		res.send ("Welcom  to our first TypeScript REST API App!")
	});

	// serve static files (HTML dashboards, etc.) from the public/ folder
	app.use (express.static(path.join(filesPath,'public')));

	// ---- /filter router: filtered telemetry rows ----
	const apiRouter2:express.Router = express.Router();
	apiRouter2.use( (req:Request, res:Response, next:NextFunction) => {
		console.log("apiRouter2 specific middleware!");
		next();
	})
	apiRouter2.get('/filter', filterHandler);
	app.use(apiRouter2);

	// ---- /diag router: aggregated torque diagnostics ----
	const apiStat:express.Router = express.Router();
	apiStat.use( (req:Request, res:Response, next:NextFunction) => {
		console.log("apiStat specific middleware!");
		next();
	})
	apiStat.get('/diag', diagHandler);
	app.use(apiStat);

	// ---- /status router: latest equipment status ----
	const getStatus:express.Router = express.Router();
	getStatus.use( (req:Request, res:Response, next:NextFunction) => {
		console.log("getStatus specific middleware!");
		next();
	})
	getStatus.get('/status', statusHandler);
	app.use(getStatus);

	// start listening on the configured port
	app.listen (config.port, () => {
		console.log (`Hello Cambridge, I'm listening! (on port ${config.port})`);
	});

	// load and echo the tag list on startup for verification
	let tags:string[];
	tags = readFileAsArray("./tags.txt");
	for (let i:number = 0; i<tags.length; i++) {
		console.log("Tag", i, "holds", tags[i]);
	}

}

main();