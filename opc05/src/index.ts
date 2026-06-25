/**
 * @file OPC-UA → MQTT publisher microservice for DR#1. Connects to the Beckhoff
 * PLC's OPC-UA server, subscribes to the configured tags, and publishes each
 * value change to the MQTT broker under the Magna namespace. This is the head of
 * the pipeline — every downstream service depends on this feed.
 * @module opc05
 * @author Team 2 — Cohort 7, Group 2
 * @version 1.0.0
 */

import * as fs from 'fs';
import * as path from 'path';
import * as opcua from 'node-opcua-client';
import * as mqtt from 'mqtt';
import type { iMQTTPaylod } from './interface.ts';

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
 * Global configuration object loaded at startup. Holds OPC-UA connection/endpoint
 * settings, MQTT broker URL/port, and the MQTT topic namespace components.
 * @constant {object}
 */
const config:any = readFileAsJSON(configFileName);

/**
 * Builds an absolute path to a configuration file in the package root.
 *
 * @param {string} fname - The configuration file name (e.g. "config.json").
 * @returns {string} the absolute path to that file.
 *
 * @example
 * const cfg = setConfigurationFilename("config.json");
 */
function setConfigurationFilename (fname:string): string
{
	let fn:string = path.dirname(import.meta.filename) + "/../" + fname;
	return fn;
}

/**
 * Reads a text file and returns its non-empty, non-comment lines. Lines that are
 * blank or start with "//" are filtered out.
 *
 * @param {string} fname - The path to the file (absolute or relative).
 * @returns {string[]} the filtered lines, or an empty array on error.
 *
 * @throws {Error} If the file cannot be read (caught internally; an empty array
 * is returned instead).
 *
 * @example
 * const tags = readFileAsArray('./tags.txt');
 */
function readFileAsArray(fname:string) : string[]
{
	try {
		let textlines:string[] = fs.readFileSync(fname).toString().split("\r\n");
		let tags = textlines.filter(item => !item?.trim().startsWith("//") 
					&& item.trim() !== "");

		//console.log(tags[0]);
		
		return tags;
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
 *
 * @example
 * const config = readFileAsJSON('config.json');
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
 * Establishes the OPC-UA and MQTT connections and registers a subscription for
 * every tag. Connects to the MQTT broker, connects to the OPC-UA server, creates
 * a session and subscription, then wires up a monitored item per tag. Also
 * installs SIGINT/SIGTERM handlers for graceful shutdown of both connections.
 *
 * @async
 * @param {string[][]} tags - array of [tagTitle, tagNodeName] pairs to monitor.
 * @returns {Promise<void>}
 *
 * @throws {Error} Connection or session errors are caught and logged internally.
 */
async function readOPCTags(tags:string[][])
{
	try {

		let mqttUrl:string = config.mqtt.brokerUrl + ":" + config.mqtt.mqttPort;
		console.log ("URL: ", mqttUrl);
		const mqttclient:mqtt.MqttClient = await mqtt.connectAsync(mqttUrl);
		console.log ("mqtt connected!");



		const opcClient = opcua.OPCUAClient.create(config.opc.connection);
		await opcClient.connect (config.opc.endpoint);
		
		let session:opcua.ClientSession = await opcClient.createSession();
		
		
		//setInterval(processreadRequest, 1000, session, tags, mqttclient);


		const subscription:opcua.ClientSubscription = 
			opcua.ClientSubscription.create(session, config.opc.subscription.parameters);
			
		//console.log("subscription created.");
		
		for (let i:number = 0; i < tags.length; i++) {
			setupTagSubscriptions (subscription, tags?.[i]?.[0] ?? "", tags?.[i]?.[1] ?? "", mqttclient);
		}
		
		const shutdown = async () => {
			console.log("Disconnecting from OPCUA");
			await opcClient.disconnect();
			await mqttclient.endAsync();
			process.exit();
		}

		process.on ('SIGINT', shutdown);
		process.on ('SIGTERM', shutdown);

	} catch (err) {
		console.log("Error: ", err);
	}
}

/**
 * Polls a list of tags once via OPC-UA read requests (an alternative to the
 * subscription model). For each tag, reads the current value and forwards it to
 * the publish handler. Currently unused in favour of subscriptions, but retained
 * for interval-based polling.
 *
 * @async
 * @param {opcua.ClientSession} opcsession - the active OPC-UA session.
 * @param {string[]} tags - tag node names to read.
 * @param {mqtt.MqttClient} mqttclient - connected MQTT client for publishing.
 * @returns {Promise<void>}
 */
async function processreadRequest (opcsession:opcua.ClientSession, 
	tags:string[], mqttclient:mqtt.MqttClient)
{
	let nodeID:string = "";
	let data:any;
	
	for (let i:number = 0; i < tags.length; i++) {

		let nodeID:string = "ns=1;s=" + tags[i];
		data = await opcsession.read ({
			nodeId: nodeID,
			attributeId: opcua.AttributeIds.Value
		});
		handleDataReceived(tags[i] ?? "", data, mqttclient);
	}
}

/**
 * Handles a received OPC-UA value by building the MQTT topic and publishing the
 * reading. Status tags are routed under a "status/" sub-path. The topic is
 * assembled from the configured namespace components (organization → workstation)
 * plus the tag name, and the payload carries an ISO timestamp and the value.
 *
 * @async
 * @param {string} tagname - the tag/title used to build the final topic segment.
 * @param {opcua.DataValue} dataValue - the OPC-UA value to publish.
 * @param {mqtt.MqttClient} mqttclient - connected MQTT client for publishing.
 * @returns {Promise<void>}
 */
async function handleDataReceived (tagname:string,
	dataValue:opcua.DataValue, mqttclient:mqtt.MqttClient)
{
	//let filename:string = "C:\\Users\\iot-group2\\Desktop\\capstone\\opc02\\data.csv";
	let d = new Date();
	//console.log(`TS: ${d.toISOString()} -- ${tagname} = ${dataValue.value.value}`);

	let nodeID:string = "";
	//let topic:string = config.mqtt.baseTopic + tagname;
	if (tagname.includes("STATUS"))
	{
		tagname = 'status/' + tagname;
	}
	
	let topic:string = config.topic.organization
							+ "/" + config.topic.division
							+ "/" + config.topic.plant
							+ "/" + config.topic.area
							+ "/" + config.topic.line
							+ "/" + config.topic.workstation
							//+ "/" + config.topic.type 
							+ "/" + tagname;

	let payload:iMQTTPaylod = {
		timestamp: d.toISOString(),
		value: dataValue.value.value.toString()
	};

	await mqttclient.publishAsync(topic, JSON.stringify(payload));

	console.log("published: ", topic, " with payload: ", JSON.stringify(payload));
	
	/*
	try {
		await fs.writeFile(filename, `${d.toISOString()},${dataValue.value.value}\n`, { flag: 'a+' }, err => {});
	} catch (err) {
		console.log(err);
	}
		*/
}

/**
 * Creates an OPC-UA monitored item for a single tag and wires its "changed"
 * event to the publish handler. Derives the device (e.g. Rob1, or "cell" if no
 * Rob segment is present) from the tag name and prefixes the tag title with it,
 * so published topics are grouped by device.
 *
 * @param {opcua.ClientSubscription} subscription - the active OPC-UA subscription.
 * @param {string} tagTitle - friendly title for the tag (used in the topic).
 * @param {string} tag - the OPC-UA node identifier (without the "ns=1;s=" prefix).
 * @param {mqtt.MqttClient} mqttclient - connected MQTT client for publishing.
 * @returns {void}
 */
function setupTagSubscriptions (subscription:opcua.ClientSubscription, 
	tagTitle:string, tag:string, mqttclient:mqtt.MqttClient)
{
	let nodeID:string = "ns=1;s=" + tag;
	let monitoringParameters = {
		"samplingInterval": 500,
		"discardoldest": true,
		"queueSize": 10
	};

	let monitoredItem = opcua.ClientMonitoredItem.create(
		subscription, {
			nodeId: nodeID,
			attributeId: opcua.AttributeIds.Value
		},
		monitoringParameters,
		opcua.TimestampsToReturn.Both
	);

	let tag_name:string[] = tag.split(".");
	let device:string = "cell";
	for (let i=0; i < tag_name.length; i++)
	{
		if (tag_name[i]?.startsWith("Rob"))
		{
			device = tag_name?.[i] ?? "";
			break;
		}
	}
	tagTitle  = `${device}/${tagTitle}`;

	monitoredItem.on("changed", (dataValue:opcua.DataValue) =>{
		//let tagname:string = monitoredItem.itemToMonitor.nodeId.value.toString();
		//console.log(`${tagname} = ${dataValue.value.value}`)
		handleDataReceived(tagTitle, dataValue, mqttclient)
	})
}

/**
 * Application entry point. Logs the configured OPC-UA endpoint and project title,
 * reads the tag list from tags.txt, parses each line into a [title, node] pair,
 * then starts the OPC-UA → MQTT publishing via {@link readOPCTags}.
 *
 * @async
 * @returns {Promise<void>}
 */
async function main()
{
	//config = readFileAsJSON("./config.json");
	

	console.log("endpoint:", config.opc.endpoint);
	console.log("Project title: ", config.projectTitle);
	let tags:string[];
	tags = readFileAsArray(tagsFileName);
	let tagsex:string[][] = tags.map(line => line.split(',').map(i => i.trim()));

	for (let i:number = 0; i<tags.length; i++) {
		console.log(tagsex?.[i]?.[0] ?? " ", " holds ", tagsex?.[i]?.[1] ?? "");
	}

	await readOPCTags(tagsex);
}

main()	;