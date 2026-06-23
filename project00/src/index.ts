/*
	index.js
*/

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

function main()
{
	//config = readFileAsJSON("./config.json");
	console.log("Project title: ", config.projectTitle);
	let tags:string[];
	tags = readFileAsArray("./tags.txt");
	for (let i:number = 0; i<tags.length; i++) {
		console.log("Tag", i, "holds", tags[i]);
	}
}

main();