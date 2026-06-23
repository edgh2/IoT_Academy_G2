/*
	index.js
*/

import * as fs from 'fs';
//import * as path from 'path';

const config:any = readFileAsJSON("./config.json");;


class URL{
    protocol:string = "";
    ip:string = "";
    port:string = "";
    resource:string = "";
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

async function myFetch(url:string)
{
    let fetchType = "json"; // use "json" for a JSON web source, use "text" for non-JSON web source
    let json;
    let text;

    try {
        let response = await fetch(url);

        if (fetchType == "json") {
            json = await (response.json());
        } else {
            text = await (response.text());
        }

        console.log ("json: ", json);
        console.log ("text: ", text);
    } catch (err) {
        console.log ("error: ", err);
    }
}

async function main()
{
	let url:string = config.protocol + config.ip + ":" + config.port + config.resource;
	await myFetch(url);
}

main();