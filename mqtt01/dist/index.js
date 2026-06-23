/*
    index.js
*/
import * as fs from 'fs';
import * as path from 'path';
import * as mqtt from 'mqtt';
import { is_iMQTTPayload } from "./interface.js";
const configPath = path.dirname(import.meta.filename) + "/../";
const configFileName = setConfigurationFilename("config.json");
const tagsFileName = `${configPath}/tags.txt`;
const config = readFileAsJSON(configFileName);
const logfilename = configPath + "\\data.csv";
function setConfigurationFilename(fname) {
    let fn = path.dirname(import.meta.filename) + "/../" + fname;
    return fn;
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
async function processMessageReceived(t, p) {
    console.log(`Recv: ${p.toString()} on topic: ${t}`);
    let payload = JSON.parse(p.toString());
    if (!is_iMQTTPayload(payload)) {
        console.error("Invalid payload structure");
        return; // exit function if faulty payload
    }
    let csvdata = `"${payload.timestamp}","${t}",${payload.value}\n`;
    try {
        fs.appendFileSync(logfilename, csvdata);
        //await fs.writeFile(logfilename, csvdata, { flag: 'a+' }, err => {});
    }
    catch (err) {
        console.log(err);
    }
}
async function main() {
    console.log("Project title:", config.projectTitle);
    try {
        let mqttUrl = config.mqtt.brokerUrl + ":" +
            config.mqtt.mqttPort;
        console.log("URL: ", mqttUrl);
        const mqttclient = await mqtt.connectAsync(mqttUrl);
        console.log("now mqtt is connected!");
        // set up asynchronous disconnection support via signals
        //let topic:string = "ACADEMY99/HMI_GVL.M.Rob1.ROBOTPOS.X";
        let topic = config.topic.organization
            + "/" + config.topic.division
            + "/" + config.topic.plant
            + "/" + config.topic.area
            + "/" + config.topic.line
            + "/" + config.topic.workstation
            //+ "/" + config.topic.type
            + "/#";
        //+ "HMI_GVL.M.Rob1.ROBOTPOS.X";
        /*mqttclient.on('message', (topic, payload) => {
            console.log (`Recv: ${payload.toString()} on topic: ${topic}`);
            // TODO: add in additional processing for the received message
        });*/
        mqttclient.on('message', (topic, payload) => processMessageReceived(topic, payload));
        await mqttclient.subscribeAsync(topic);
        console.log("subscription established!");
        const shutdown = async () => {
            console.log("disconnecting our services now");
            await mqttclient.endAsync();
            // TODO: add in other requests to disconnect from services
            process.exit();
        };
        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);
    }
    catch (err) {
        console.log("Error: ", err);
    }
}
main();
//# sourceMappingURL=index.js.map