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
import fs from 'node:fs';
class jsonTest {
    value = 0;
    timestamp = "";
    constructor(val, ts) {
        this.value = val;
        this.timestamp = ts;
    }
}
class URL {
    protocol = "";
    ip = "";
    port = "";
    resource = "";
}
function saveJSON(filename, theObject) {
    fs.writeFile(filename, JSON.stringify(theObject), err => {
        if (err) {
            console.error(err);
        }
        else {
            console.log(JSON.stringify(theObject));
        }
    });
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
const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};
async function main() {
    fs.readFile('test.txt', 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            return;
        }
        console.log(data);
    });
    let row = "";
    let innercount = 5;
    let outtercount = 10;
    for (let j = 0; j < outtercount; j++) {
        for (let i = 0; i < innercount; i++) {
            row += Math.random().toString();
            if (i < innercount - 1) {
                row += ',';
            }
            else {
                row += '\r\n';
            }
        }
    }
    fs.writeFile('test.csv', row, err => {
        if (err) {
            console.error(err);
        }
        else {
            //console.log(row)
        }
    });
    //const now:Date = new Date();
    //let dataReading = new jsonTest(Math.random() * 100, now.toString());
    let dataReading = readFileAsJSON('test.json');
    //let dataReading = JSON.parse(dat);
    console.log(`Value: ${dataReading.value} and Timestamp: ${dataReading.timestamp}`);
    //saveJSON('mydata.json', dataReading);
    let urlData = readFileAsJSON('config.json');
    console.log(urlData.protocol + urlData.ip + ":" + urlData.port + urlData.resource);
    while (true) {
        dataReading = readFileAsJSON('C:/jsondata/HMI_GVL.M.Rob3.MACTTORQUE[1].json');
        console.log(`Value: ${dataReading.value} and Timestamp: ${dataReading.timestamp}`);
        await sleep(1000);
    }
}
main();
//# sourceMappingURL=index.js.map