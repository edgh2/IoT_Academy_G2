/*
	index.js
*/

import * as fs from 'fs';
import * as path from 'path';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';


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

function generateTimesTable (ttable:number, start:number, end:number): string[]
{
	let output:string[] = [];
	let p:number = 0;
	let x:number = 0;
	for (x = start; x <= end; x++) {
		p = x * ttable;
		output.push(`${x} x ${ttable} = ${p}`);
	}
	return output;
}

function main()
{
	//config = readFileAsJSON("./config.json");
	console.log("Project title: ", config.projectTitle);

	const app:express.Application = express();
	app.use((req:Request, res:Response, next:NextFunction) => {
		console.log(`${req.method} ${req.path}`)
		next();
	});

	app.get('/', (req:Request, res:Response) => {
		res.send ("Welcom  to our first TypeScript REST API App!")
	});

	const apiRouter:express.Router = express.Router();
	apiRouter.use( (req:Request, res:Response, next:NextFunction) => {
		console.log("apiRouter specific middleware!");
		next();
	})

	apiRouter.get( '/timetable/:table', (req:Request, res:Response) => {
		console.log("In test apiRouter API");

		console.log ("table: ", req.params.table); // parameterized data
		console.log ("query: ", req.query); // query data
		console.log ("start: ", req.query.start); // query data
		console.log ("end: ", req.query.end); // query data

		let ttable:number = convertDataToInteger(req.params.table, 1);
		let start:number = convertDataToInteger(req.query.start, 1);
		let end:number = convertDataToInteger(req.query.end, 10);

		console.log (`ttable: ${ttable} start: ${start} end: ${end}`);

		let tableoutput:string[] = generateTimesTable (ttable, start, end);
		res.json(tableoutput);
	});

	app.use(apiRouter);
	app.listen (config.port, () => {
		console.log (`Hello Cambridge, I'm listening! (on port ${config.port})`);
	});



	let tags:string[];
	tags = readFileAsArray("./tags.txt");
	for (let i:number = 0; i<tags.length; i++) {
		console.log("Tag", i, "holds", tags[i]);
	}
}

main();