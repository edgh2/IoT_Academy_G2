/*
	index.js
*/

import * as fs from 'fs';
import * as path from 'path';
import * as opcua from 'node-opcua-client';
import * as mqtt from 'mqtt';
import type { iMQTTPaylod } from './interface.ts';


const configPath = path.dirname(import.meta.filename) + "/../";
const configFileName:string = setConfigurationFilename("config.json");
const tagsFileName:string = `${configPath}/tags.txt`;
const config:any = readFileAsJSON(configFileName);


function setConfigurationFilename (fname:string): string
{
	let fn:string = path.dirname(import.meta.filename) + "/../" + fname;
	return fn;
}


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


async function handleDataReceived (tagname:string,
	dataValue:opcua.DataValue, mqttclient:mqtt.MqttClient)
{
	let filename:string = "C:\\Users\\iot-group2\\Desktop\\capstone\\opc02\\data.csv";
	let d = new Date();
	//console.log(`TS: ${d.toISOString()} -- ${tagname} = ${dataValue.value.value}`);

	let nodeID:string = "";
	//let topic:string = config.mqtt.baseTopic + tagname;
	if (tagname.includes("STATUS") || tagname.includes("cell"))
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