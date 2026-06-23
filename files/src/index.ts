/*
	index.js
*/
/*
import * as fs from 'fs';
import * as path from 'path';

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

*/

import fs from 'node:fs'

class jsonTest{
	value:number = 0;
	timestamp:string = "";

	constructor(val:number, ts:string) {
		this.value = val;
		this.timestamp = ts;
	}
}

class URL{
    protocol:string = "";
    ip:string = "";
    port:string = "";
    resource:string = "";
}

function saveJSON(filename:string, theObject:any){
	fs.writeFile(filename, JSON.stringify(theObject), err => {
		if (err){
			console.error(err);
		}
		else{
			console.log(JSON.stringify(theObject));
		}
	});
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

const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

async function main()
{
	fs.readFile('test.txt', 'utf8', (err:any, data:any) => {
		if (err){
			console.error(err);
			return;
		}
		console.log(data)
	});

	let row:string = "";
	let innercount:number = 5;
	let outtercount:number = 10;
	for (let j:number=0; j< outtercount; j++){
		for (let i=0; i<innercount; i++){
			row +=  Math.random().toString();
			if (i < innercount - 1) {
				row += ',';
			}
			else {
				row += '\r\n';
			}
		}
	}
	

	fs.writeFile('test.csv', row, err => {
		if (err){
			console.error(err);
		}
		else{
			//console.log(row)
		}
	});

	//const now:Date = new Date();
	//let dataReading = new jsonTest(Math.random() * 100, now.toString());
	let dataReading = readFileAsJSON('test.json');
	//let dataReading = JSON.parse(dat);
	
	console.log(`Value: ${dataReading.value} and Timestamp: ${dataReading.timestamp}`);

	//saveJSON('mydata.json', dataReading);

	let urlData:URL = readFileAsJSON('config.json');
	console.log(urlData.protocol + urlData.ip + ":" + urlData.port + urlData.resource);

	while (true)
	{
		dataReading = readFileAsJSON('C:/jsondata/HMI_GVL.M.Rob3.MACTTORQUE[1].json');
		console.log(`Value: ${dataReading.value} and Timestamp: ${dataReading.timestamp}`);
		await sleep(1000);
	}

}


main();