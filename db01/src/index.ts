/**
 * @file MQTT → PostgreSQL subscriber microservice. Subscribes to the DR#1 topic
 * tree on the MQTT broker, validates each incoming payload, and persists it to
 * the appropriate PostgreSQL table (telemetry or equipment_status). Uses a
 * connection pool so high message throughput doesn't exhaust connections.
 * @module db01
 * @author Team 2 — Cohort 7, Group 2
 * @version 1.0.0
 */

import * as fs from 'fs';
import * as path from 'path';
import * as mqtt from 'mqtt';
import * as pg from 'pg';

import type { iMQTTPaylod } from "./interface.js";
import { is_iMQTTPayload } from "./interface.js";
import { json } from 'stream/consumers';

/**
 * Absolute path to the package root (one level above the compiled source
 * directory), used to locate config.json and tags.txt.
 * @constant {string}
 */
const configPath = path.dirname(import.meta.filename) + "/../";

/** @constant {string} Absolute path to the configuration file. */
const configFileName:string = setConfigurationFilename("config.json");

/** @constant {string} Absolute path to the tag list file. */
const tagsFileName:string = `${configPath}/tags.txt`;

/**
 * Global configuration object loaded at startup. Holds MQTT broker URL/port, the
 * topic namespace components, and the PostgreSQL connection settings (config.sql).
 * @constant {object}
 */
const config:any = readFileAsJSON(configFileName);

/** @constant {string} Path to the optional CSV log file (CSV logging currently disabled). */
const logfilename:string = configPath + "\\data.csv";

/**
 * Builds an absolute path to a configuration file in the package root.
 *
 * @param {string} fname - The configuration file name (e.g. "config.json").
 * @returns {string} the absolute path to that file.
 */
function setConfigurationFilename (fname:string): string
{
	let fn:string = path.dirname(import.meta.filename) + "/../" + fname;
	return fn;
}


/**
 * Reads a text file and splits it into an array of lines.
 *
 * @param {string} fname - The path to the file (absolute or relative).
 * @returns {string[]} one element per line, or an empty array on error.
 *
 * @throws {Error} If the file cannot be read (caught internally).
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
 * Reads a text file and parses its contents into a JSON object.
 *
 * @param {string} fname - The path to the file (absolute or relative).
 * @returns {any} the parsed result of the file contents.
 *
 * @throws {Error} If the file does not exist, cannot be read, or contains invalid
 * JSON (caught internally; an empty array is returned on failure).
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
 * Handles an incoming MQTT message: parses and validates the payload, derives the
 * device and metric from the topic path, and inserts the reading into the correct
 * table. Status topics (containing "status") go to equipment_status as a boolean;
 * all other topics go to telemetry as a numeric value. Malformed payloads are
 * rejected and logged rather than persisted.
 *
 * @async
 * @param {string} t - the MQTT topic the message arrived on.
 * @param {Buffer} p - the raw message payload buffer.
 * @returns {Promise<void>}
 */
async function processMessageReceived (t:string, p:Buffer)
{
	console.log (`Recv: ${p.toString()} on topic: ${t}`);

	let payload:iMQTTPaylod = JSON.parse (p.toString());
	if (!is_iMQTTPayload(payload)) {
		console.error("Invalid payload structure");
		return; // exit function if faulty payload
	}

	const components:string[] = t.split('/');
	let deviceId:string = components[6]??"device";
	let metric:string = components[7]??"metric";
	let ts:string = payload.timestamp;
	

	let sql_command:string = "";
	if (t.includes("status"))
	{
		let status_name:string = components.pop()?.split("_").pop() ?? "";
		let value:boolean = (payload.value.toLowerCase() === "true"); 
		sql_command =
			"INSERT INTO equipment_status (timestamp,deviceid,status_name,status,payload) " +
			`VALUES('${ts}', '${metric}', '${status_name}', ${value}, '${JSON.stringify(payload)}')`;

	}
	else{
		let value:number = parseFloat(payload.value);
		sql_command =
			"INSERT INTO telemetry(timestamp,deviceid,metric,value, payload) " +
			`VALUES('${ts}', '${deviceId}', '${metric}', ${value}, '${JSON.stringify(payload)}')`;
	}

	await executeQuery(sql_command);


	/*
	let csvdata:string = `"${payload.timestamp}","${t}",${payload.value}\n`;
	
	try {
		fs.appendFileSync (logfilename, csvdata);

		//await fs.writeFile(logfilename, csvdata, { flag: 'a+' }, err => {});
	} catch (err) {
		console.log(err);
	}
	*/
}

/**
 * Shared PostgreSQL connection pool, configured from config.sql with a maximum of
 * 10 connections. Pooling avoids a connect/disconnect per message under the high
 * throughput of the subscriber.
 * @constant {pg.Pool}
 */
const pool = new pg.Pool(config.sql);
pool.options.max = 10;

/**
 * Executes a SQL command against the connection pool.
 *
 * @async
 * @param {string} sql_command - the SQL statement to run.
 * @returns {Promise<void>}
 *
 * @throws {Error} Query errors are caught and logged internally.
 */
async function executeQuery(sql_command:string)
{
	//const dbclient = new pg.Client (config.sql);
	//let dbclient = await pool.connect()	
	try
	{
		pool.query(sql_command);	
	}catch (err){
		console.log(err)
	}
	//finally{
		//dbclient.release();
	//}
}

/**
 * Application entry point. Connects to the MQTT broker, subscribes to the DR#1
 * topic tree (wildcard under the configured namespace), routes every message to
 * {@link processMessageReceived}, and installs pool error handling plus
 * SIGINT/SIGTERM handlers that close the MQTT client and the pool on shutdown.
 *
 * @async
 * @returns {Promise<void>}
 */
async function main()
{
	console.log ("Project title:", config.projectTitle); 
	try {

		// Error handling for postgres pooling
		pool.on('error', (err, client) => {
			console.error('Unexpected error on idle client', err)
			process.exit(-1)
		})


		let mqttUrl:string = config.mqtt.brokerUrl + ":" + 
		config.mqtt.mqttPort;
		console.log ("URL: ", mqttUrl);
		const mqttclient:mqtt.MqttClient = 
		await mqtt.connectAsync(mqttUrl);
		console.log ("now mqtt is connected!");
		// set up asynchronous disconnection support via signals
		//let topic:string = "ACADEMY99/HMI_GVL.M.Rob1.ROBOTPOS.X";
		let topic:string = config.topic.organization
						+ "/" + config.topic.division
						+ "/" + config.topic.plant
						+ "/" + config.topic.area
						+ "/" + config.topic.line
						+ "/" + config.topic.workstation
						//+ "/" + config.topic.type
						+ "/#";
						//+ "/" + "HMI_GVL.M.Rob1.ROBOTPOS.X";


		/*mqttclient.on('message', (topic, payload) => {
			console.log (`Recv: ${payload.toString()} on topic: ${topic}`);
			// TODO: add in additional processing for the received message
		});*/

		mqttclient.on ('message', (topic,payload) => 
				processMessageReceived(topic, payload));

		await mqttclient.subscribeAsync (topic);
		console.log ("subscription established!");

		const shutdown = async() => {
		console.log ("disconnecting our services now");
			await mqttclient.endAsync();
			await pool.end();
				
			process.exit();
		}
		process.on ('SIGINT', shutdown);
		process.on ('SIGTERM', shutdown);
	} catch (err) {
		console.log ("Error: ", err);
	}
}

main();