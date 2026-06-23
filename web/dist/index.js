/*
    index.js
*/
import * as fs from 'fs';
//import * as path from 'path';
const config = readFileAsJSON("./config.json");
;
class URL {
    protocol = "";
    ip = "";
    port = "";
    resource = "";
}
function readFileAsArray(fname) {
    try {
        let textlines = fs.readFileSync(fname).toString().split("\r\n");
        return textlines;
    }
    catch (err) {
        console.log(err);
        return [];
    }
}
function readFileAsJSON(fname) {
    try {
        let data = fs.readFileSync(fname).toString();
        return JSON.parse(data);
    }
    catch (err) {
        console.log(err);
        return [];
    }
}
async function myFetch(url) {
    let fetchType = "json"; // use "json" for a JSON web source, use "text" for non-JSON web source
    let json;
    let text;
    try {
        let response = await fetch(url);
        if (fetchType == "json") {
            json = await (response.json());
        }
        else {
            text = await (response.text());
        }
        console.log("json: ", json);
        console.log("text: ", text);
    }
    catch (err) {
        console.log("error: ", err);
    }
}
async function main() {
    let url = config.protocol + config.ip + ":" + config.port + config.resource;
    await myFetch(url);
}
main();
//# sourceMappingURL=index.js.map