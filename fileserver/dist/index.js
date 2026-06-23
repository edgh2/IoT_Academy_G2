/*
 * index.ts
 *
 * This source file will implement a simple file share of JSON data
 * retured from the Beckhoff work cell
 */
import * as mqtt from 'mqtt';
import * as fs from 'fs';
import * as path from 'path';
var config;
function mylog(msg) {
    console.log(msg);
}
function readFileAsArray(fname) {
    let textlines = fs.readFileSync(fname).toString().split("\r\n");
    return textlines;
}
function readFileAsJSON(fname) {
    let data = fs.readFileSync(fname).toString();
    return JSON.parse(data);
}
function setConfigurationFilename(fname) {
    let fn = path.dirname(import.meta.filename) + "/../" + fname;
    return fn;
}
async function processMessageReceived(t, m) {
    mylog(`topic ${t}`);
    let payload = JSON.parse(m.toString());
    let values = [];
    values = t.split("/");
    let currentTag = values[2] ?? "tag";
    if (currentTag != "consolidated_tags") {
        await writeFiles(values[2] ?? "tag", payload);
    }
}
async function writeFiles(variable, payload) {
    let fname = "";
    fname = config.fileserverfolder + variable + ".json";
    try {
        fs.writeFile(fname, JSON.stringify(payload), (err) => {
            if (err) {
                mylog(fname + " file error");
            }
            else {
                mylog("  1. updated " + fname);
            }
        });
    }
    catch (e) {
        mylog(fname + " file error");
    }
}
/*
 * function main();
 *
 * This is the mainline code for our project. This code will
 * perform the following work:
 *     create connection to MQTT broker and subscribe to
 *     UNS to extract raw Beckhoff TAG data being published
 *     to this broker. Feed the retrieved topics / payloads
 *     to a function that outputs the payloads to a folder
 *     on disk as JSON files.
 */
async function main() {
    mylog("Hello FileServer");
    let configFilename = setConfigurationFilename("config.json");
    config = readFileAsJSON(configFilename);
    try {
        let url = config.mqtt.brokerURL + ":" + config.mqtt.mqttPort;
        mylog("URL: " + url);
        const mqttclient = await mqtt.connectAsync(url);
        mylog("mqtt connected!");
        mqttclient.on('message', (topic, message) => {
            processMessageReceived(topic, message);
        });
        let topic = config.mqtt.baseTopic + "#";
        await mqttclient.subscribeAsync(topic);
        // set up asynchronous disconnection support via signals
        const shutdown = async () => {
            mylog("disconnecting our services now");
            await mqttclient.endAsync();
            process.exit();
        };
        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);
    }
    catch (err) {
        mylog("Error: " + err);
    }
}
main(); // execute main function 
//# sourceMappingURL=index.js.map