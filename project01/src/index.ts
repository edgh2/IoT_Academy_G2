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

//Author: Edward

function time_table(number:number = 1)
{
    for (let i:number = 1; i <= 10; i++)
    {
        console.log(number + " x " + i + " = " + number*i);
    }
}


function main()
{
	let s:string = "hello project01";
	console.log(s);
	
	let x:number = 5;
	console.log(`x: ${x}`);
	
	for (let i:number=1; i<=12; i++)
    {
        time_table(i);
    }	
}

main();