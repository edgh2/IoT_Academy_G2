/*
    index.js
*/
import * as fs from 'fs';
import * as path from 'path';
import express from 'express';
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
function convertDataToInteger(data, def) {
    let n = def;
    if (data != undefined) {
        n = parseInt(data.toString(), 10);
        if (Number.isNaN(n)) {
            n = def;
        }
    }
    return n;
}
function generateTimesTable(ttable, start, end) {
    let output = [];
    let p = 0;
    let x = 0;
    for (x = start; x <= end; x++) {
        p = x * ttable;
        output.push(`${x} x ${ttable} = ${p}`);
    }
    return output;
}
function main() {
    //config = readFileAsJSON("./config.json");
    console.log("Project title: ", config.projectTitle);
    const app = express();
    app.use((req, res, next) => {
        console.log(`${req.method} ${req.path}`);
        next();
    });
    app.get('/', (req, res) => {
        res.send("Welcom  to our first TypeScript REST API App!");
    });
    const apiRouter = express.Router();
    apiRouter.use((req, res, next) => {
        console.log("apiRouter specific middleware!");
        next();
    });
    apiRouter.get('/timetable/:table', (req, res) => {
        console.log("In test apiRouter API");
        console.log("table: ", req.params.table); // parameterized data
        console.log("query: ", req.query); // query data
        console.log("start: ", req.query.start); // query data
        console.log("end: ", req.query.end); // query data
        let ttable = convertDataToInteger(req.params.table, 1);
        let start = convertDataToInteger(req.query.start, 1);
        let end = convertDataToInteger(req.query.end, 10);
        console.log(`ttable: ${ttable} start: ${start} end: ${end}`);
        let tableoutput = generateTimesTable(ttable, start, end);
        res.json(tableoutput);
    });
    app.use(apiRouter);
    app.listen(config.port, () => {
        console.log(`Hello Cambridge, I'm listening! (on port ${config.port})`);
    });
    let tags;
    tags = readFileAsArray("./tags.txt");
    for (let i = 0; i < tags.length; i++) {
        console.log("Tag", i, "holds", tags[i]);
    }
}
main();
//# sourceMappingURL=index.js.map