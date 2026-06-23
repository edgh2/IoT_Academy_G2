/*
	index.js
*/

import * as fs from 'fs';
import * as path from 'path';
import * as pg from 'pg';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';


const config:any = readFileAsJSON("./config.json");;

interface IoTRow {
  tag: string;
  device:string,
  datestamp: Date;
  value: number;
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

	/*
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

*/


	const apiRouter2:express.Router = express.Router();

	apiRouter2.use( (req:Request, res:Response, next:NextFunction) => {
		console.log("apiRouter2 specific middleware!");
		next();
	})

	apiRouter2.get( '/timetable/filter', async (req:Request, res:Response) => {
		
		let metric = req.query.metric?.toString()?? "";
		let from_ts = req.query.from?.toString()?? "";
		let to_ts = req.query.to?.toString()?? "";
		let limit = convertDataToInteger(req.query?.limit, 100);
		
		let from:Date = new Date(from_ts);
		let to:Date = new Date(to_ts);

		if (isNaN(from.getTime())) {
			console.log("Bad start date");
			return;
		}

		if (isNaN(to.getTime())) {
			console.log("Bad start date");
			return;
		}

		let sql_command = `SELECT tag, CASE WHEN position('Rob' in tag) = 0 THEn 'cell'
								else substring(tag, position('Rob' in tag), 4) end as "device",
								datestamp, value
							FROM public."tb_OPC_TagLogs" t
								inner join public."tb_OPC_TagSetup" s on "tagSetupUID" = s.uid
							where tag = '${metric}' and datestamp between '${from.toISOString()}' and '${to.toISOString()}'
							order by datestamp desc
							limit ${limit};`;
		
		console.log(sql_command);

		const dbclient = new pg.Client (config.sql);
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

		//let tableoutput:string[] = generateTimesTable ();
		res.json(jsonString);
	});

	app.use(apiRouter2);




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