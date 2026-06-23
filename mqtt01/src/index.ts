/*
	index.js
*/

import * as fs from 'fs';
import * as path from 'path';
import * as mqtt from 'mqtt';

import type { iMQTTPaylod } from "./interface.js";
import { is_iMQTTPayload } from "./interface.js";

const configPath = path.dirname(import.meta.filename) + "/../";
const configFileName:string = setConfigurationFilename("config.json");
const tagsFileName:string = `${configPath}/tags.txt`;
const config:any = readFileAsJSON(configFileName);
const logfilename:string = configPath + "\\data.csv";


function setConfigurationFilename (fname:string): string
{
	let fn:string = path.dirname(import.meta.filename) + "/../" + fname;
	return fn;
}

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

async function processMessageReceived (t:string, p:Buffer)
{
	console.log (`Recv: ${p.toString()} on topic: ${t}`);

	let payload:iMQTTPaylod = JSON.parse (p.toString());
	if (!is_iMQTTPayload(payload)) {
		console.error("Invalid payload structure");
		return; // exit function if faulty payload
	}

	let csvdata:string = `"${payload.timestamp}","${t}",${payload.value}\n`;
	
	try {
		fs.appendFileSync (logfilename, csvdata);

		//await fs.writeFile(logfilename, csvdata, { flag: 'a+' }, err => {});
	} catch (err) {
		console.log(err);
	}
}

async function main()
{
	console.log ("Project title:", config.projectTitle); 
	try {

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
						+"/#";
						//+ "HMI_GVL.M.Rob1.ROBOTPOS.X";


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
			// TODO: add in other requests to disconnect from services
			process.exit();
		}
		process.on ('SIGINT', shutdown);
		process.on ('SIGTERM', shutdown);
	} catch (err) {
		console.log ("Error: ", err);
	}
}

main();