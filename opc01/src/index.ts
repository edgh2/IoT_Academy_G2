/*
	index.js
*/

import * as fs from 'fs';
import * as opcua from 'node-opcua-client';

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
		const opcClient = opcua.OPCUAClient.create(config.opc.connection);

		await opcClient.connect (config.opc.endpoint);
		console.log("Connected to OPC UA server at: ", config.opc.endpoint);

		let session:opcua.ClientSession = await opcClient.createSession();
		console.log('Session created');

		for (let i:number = 0; i < tags.length; i++) {

			let nodeID:string = "ns=1;s=" + tags[i];
			let data:opcua.DataValue = await session.read ({
				nodeId: nodeID,
				attributeId: opcua.AttributeIds.Value
			});

			console.log (`tag data for ${tags[i]} is ${data.value.value}`);
		}

		await opcClient.disconnect();
	} catch (err) {
		console.log("Error: ", err);
	}
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