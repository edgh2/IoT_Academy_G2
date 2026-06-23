/*
    index.js
*/
import * as fs from 'fs';
import * as opcua from 'node-opcua-client';
const config = readFileAsJSON("./config.json");
;
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
async function readOPCTags(tags) {
    try {
        const opcClient = opcua.OPCUAClient.create(config.opc.connection);
        await opcClient.connect(config.opc.endpoint);
        console.log("Connected to OPC UA server at: ", config.opc.endpoint);
        let session = await opcClient.createSession();
        console.log('Session created');
        //setInterval(processreadRequest, 1000, session, tags);
        const subscription = opcua.ClientSubscription.create(session, config.opc.subscription.parameters);
        console.log("subscription created.");
        for (let i = 0; i < tags.length; i++) {
            setupTagSubscriptions(subscription, tags[i] ?? "");
        }
        const shutdown = async () => {
            console.log("Disconnecting from OPCUA");
            await opcClient.disconnect();
            process.exit();
        };
        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);
    }
    catch (err) {
        console.log("Error: ", err);
    }
}
async function processreadRequest(opcsession, tags) {
    let nodeID = "";
    let data;
    for (let i = 0; i < tags.length; i++) {
        let nodeID = "ns=1;s=" + tags[i];
        data = await opcsession.read({
            nodeId: nodeID,
            attributeId: opcua.AttributeIds.Value
        });
        handleDataReceived(tags[i] ?? "", data);
    }
}
async function handleDataReceived(tagname, dataValue) {
    let filename = "C:\\Users\\iot-group2\\Desktop\\capstone\\opc02\\data.csv";
    let d = new Date();
    console.log(`TS: ${d.toISOString()} -- ${tagname} = ${dataValue.value.value}`);
    try {
        await fs.writeFile(filename, `${d.toISOString()},${dataValue.value.value}\n`, { flag: 'a+' }, err => { });
    }
    catch (err) {
        console.log(err);
    }
}
function setupTagSubscriptions(subscription, tag) {
    let nodeID = "ns=1;s=" + tag;
    let monitoringParameters = {
        "samplingInterval": 500,
        "discardoldest": true,
        "queueSize": 10
    };
    let monitoredItem = opcua.ClientMonitoredItem.create(subscription, {
        nodeId: nodeID,
        attributeId: opcua.AttributeIds.Value
    }, monitoringParameters, opcua.TimestampsToReturn.Both);
    monitoredItem.on("changed", (dataValue) => {
        let tagname = monitoredItem.itemToMonitor.nodeId.value.toString();
        //console.log(`${tagname} = ${dataValue.value.value}`)
        handleDataReceived(tagname, dataValue);
    });
}
async function main() {
    //config = readFileAsJSON("./config.json");
    console.log("endpoint:", config.opc.endpoint);
    console.log("Project title: ", config.projectTitle);
    let tags;
    tags = readFileAsArray("./tags.txt");
    for (let i = 0; i < tags.length; i++) {
        console.log("Tag", i, "holds", tags[i]);
    }
    await readOPCTags(tags);
}
main();
//# sourceMappingURL=index.js.map