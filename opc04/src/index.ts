/*
	index.js
*/

import * as fs from 'fs';
import * as path from 'path';
import * as opcua from 'node-opcua-client';
import * as mqtt from 'mqtt';

const config:any = readFileAsJSON("./config.json");;

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

async function readOPCTags(tags:string[])
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
			setupTagSubscriptions (subscription, tags[i] ?? "", mqttclient);
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
	console.log(`TS: ${d.toISOString()} -- ${tagname} = ${dataValue.value.value}`);

	let nodeID:string = "";
	//let topic:string = config.mqtt.baseTopic + tagname;
	let topic:string = config.topic.organization
							+ "/" + config.topic.division
							+ "/" + config.topic.plant
							+ "/" + config.topic.area
							+ "/" + config.topic.line
							+ "/" + config.topic.workstation
							+ "/" + config.topic.type 
							+ tagname;

	let payload = {
		"timestamp": d.toISOString(),
		"value": dataValue.value.value.toString()
	}

	await mqttclient.publishAsync(topic, JSON.stringify(payload));

	console.log("published: ", topic, " with payload: ", JSON.stringify(payload));
	
	try {
		await fs.writeFile(filename, `${d.toISOString()},${dataValue.value.value}\n`, { flag: 'a+' }, err => {});
	} catch (err) {
		console.log(err);
	}
}


function setupTagSubscriptions (subscription:opcua.ClientSubscription, 
	tag:string, mqttclient:mqtt.MqttClient)
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

	monitoredItem.on("changed", (dataValue:opcua.DataValue) =>{
		let tagname:string = monitoredItem.itemToMonitor.nodeId.value.toString();
		//console.log(`${tagname} = ${dataValue.value.value}`)
		handleDataReceived(tagname, dataValue, mqttclient)
	})
}

async function main()
{
	//config = readFileAsJSON("./config.json");
	console.log("endpoint:", config.opc.endpoint);
	console.log("Project title: ", config.projectTitle);
	let tags:string[];
	tags = readFileAsArray("./tags.txt");
	for (let i:number = 0; i<tags.length; i++) {
		console.log("Tag", i, "holds", tags[i]);
	}

	await readOPCTags(tags);
}

main()	;