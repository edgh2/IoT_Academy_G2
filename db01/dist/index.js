/*
    index.js
*/
import * as fs from 'fs';
import * as path from 'path';
import * as mqtt from 'mqtt';
import * as pg from 'pg';
import { is_iMQTTPayload } from "./interface.js";
import { json } from 'stream/consumers';
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
    const components = t.split('/');
    let deviceId = components[6] ?? "device";
    let metric = components[7] ?? "metric";
    let ts = payload.timestamp;
    let sql_command = "";
    if (t.includes("status")) {
        let status_name = components.pop()?.split("_").pop() ?? "";
        let value = (payload.value.toLowerCase() === "true");
        sql_command =
            "INSERT INTO equipment_status (timestamp,deviceid,status_name,status,payload) " +
                `VALUES('${ts}', '${deviceId}', '${status_name}', ${value}, '${JSON.stringify(payload)}')`;
    }
    else {
        let value = parseFloat(payload.value);
        sql_command =
            "INSERT INTO telemetry(timestamp,deviceid,metric,value, payload) " +
                `VALUES('${ts}', '${deviceId}', '${metric}', ${value}, '${JSON.stringify(payload)}')`;
    }
    await executeQuery(sql_command);
    /*
    let csvdata:string = `"${payload.timestamp}","${t}",${payload.value}\n`;
    
    try {
        fs.appendFileSync (logfilename, csvdata);

        //await fs.writeFile(logfilename, csvdata, { flag: 'a+' }, err => {});
    } catch (err) {
        console.log(err);
    }
    */
}
const pool = new pg.Pool(config.sql);
pool.options.max = 10;
async function executeQuery(sql_command) {
    //const dbclient = new pg.Client (config.sql);
    //let dbclient = await pool.connect()	
    try {
        pool.query(sql_command);
    }
    catch (err) {
        console.log(err);
    }
    //finally{
    //dbclient.release();
    //}
}
async function main() {
    console.log("Project title:", config.projectTitle);
    try {
        // Error handling for postgres pooling
        pool.on('error', (err, client) => {
            console.error('Unexpected error on idle client', err);
            process.exit(-1);
        });
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
        //+ "/" + "HMI_GVL.M.Rob1.ROBOTPOS.X";
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
            await pool.end();
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