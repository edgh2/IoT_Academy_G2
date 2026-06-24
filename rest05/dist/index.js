/*
    index.js
*/
import * as fs from 'fs';
import * as path from 'path';
import * as pg from 'pg';
import express from 'express';
const filesPath = path.dirname(import.meta.filename) + "/../";
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
    app.use(express.static(path.join(filesPath, 'public')));
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
    const apiRouter2 = express.Router();
    apiRouter2.use((req, res, next) => {
        console.log("apiRouter2 specific middleware!");
        next();
    });
    apiRouter2.get('/filter', async (req, res) => {
        let metric = req.query.metric?.toString() ?? "";
        let device = req.query.device?.toString() ?? "";
        let db = req.query.db?.toString() ?? "g2";
        let from_ts = req.query.from?.toString() ?? "";
        let to_ts = req.query.to?.toString() ?? "";
        let limit = convertDataToInteger(req.query?.limit, 100);
        let from = new Date(from_ts);
        let to = new Date(to_ts);
        if (isNaN(from.getTime())) {
            console.log("Bad start date");
            return;
        }
        if (isNaN(to.getTime())) {
            console.log("Bad start date");
            return;
        }
        let sql_command = "";
        let dbconfig = config.sql;
        if (db === "g2") {
            dbconfig.database = config.g2dbname;
            sql_command = `SELECT "timestamp", deviceid, metric, value
								FROM public.telemetry
								where metric = '${metric}' and deviceid= '${device}'
									and timestamp between '${from.toISOString()}' and '${to.toISOString()}'
								order by timestamp desc
								limit ${limit};`;
        }
        else {
            dbconfig.database = config.g1dbname;
            sql_command = `SELECT tag, CASE WHEN position('Rob' in tag) = 0 THEn 'cell'
									else substring(tag, position('Rob' in tag), 4) end as "device",
									datestamp "timestamp", value
								FROM public."tb_OPC_TagLogs" t
									inner join public."tb_OPC_TagSetup" s on "tagSetupUID" = s.uid
								where tag = '${metric}' and datestamp between '${from.toISOString()}' and '${to.toISOString()}'
								order by datestamp desc
								limit ${limit};`;
        }
        console.log(sql_command);
        const dbclient = new pg.Client(dbconfig);
        let jsonString = "";
        try {
            dbclient.connect();
            const result = await dbclient.query(sql_command);
            jsonString = JSON.stringify(result.rows);
        }
        catch (err) {
            console.log(err);
        }
        finally {
            dbclient.end();
        }
        //let tableoutput:string[] = generateTimesTable ();
        res.json(jsonString);
    });
    app.use(apiRouter2);
    const apiStat = express.Router();
    apiStat.use((req, res, next) => {
        console.log("apiStat specific middleware!");
        next();
    });
    apiStat.get('/diag', async (req, res) => {
        console.log("In test apiStat API");
        //let metric = req.query.metric?.toString()?? "";
        //let device = req.query.device?.toString()?? "";
        let db = req.query.db?.toString() ?? "g2";
        let from_ts = req.query.from?.toString() ?? "";
        let to_ts = req.query.to?.toString() ?? "";
        let from = new Date(from_ts);
        let to = new Date(to_ts);
        if (isNaN(from.getTime())) {
            console.log("Bad start date");
            return;
        }
        if (isNaN(to.getTime())) {
            console.log("Bad start date");
            return;
        }
        let sql_command = "";
        let dbconfig = config.sql;
        if (db === "g2") {
            dbconfig.database = config.g2dbname;
            sql_command = `select deviceid, metric, min(timestamp) "from", max(timestamp) "to", count(1) "count"
						,sum (duration)
				from
				(
					SELECT "timestamp", deviceid, metric, value
						,
						COALESCE(timestamp - lag(timestamp) over (partition by deviceid, metric order by timestamp), '0 seconds'::interval) duration
					FROM public.telemetry
						
					where lower(metric) like '%torque%' 
						--and datestamp between '${from.toISOString()}' and '${to.toISOString()}'
					and abs(cast(value as float)) > 20
				)
				group by deviceid, metric`;
        }
        else {
            dbconfig.database = config.g1dbname;
            sql_command = `select tag "metric", min(datestamp) "from", max(datestamp) "to", count(1) "count"
								,sum (duration)
							from
							(
								SELECT tag, CASE WHEN position('Rob' in tag) = 0 THEn 'cell'
									else substring(tag, position('Rob' in tag), 4) end as "device",
									datestamp, value
									--, datestamp - lag(datestamp) over (partition by tag order by datestamp) xx
									,COALESCE(datestamp - lag(datestamp) over (partition by tag order by datestamp), '0 seconds'::interval) duration
								FROM public."tb_OPC_TagLogs" t
									inner join public."tb_OPC_TagSetup" s on "tagSetupUID" = s.uid
								where lower(tag) like '%torque%' 
									and datestamp between '${from.toISOString()}' and '${to.toISOString()}'
							) tbl
							where abs(cast(value as float)) > 20
							group by tag;`;
        }
        console.log(sql_command);
        const dbclient = new pg.Client(config.sql);
        let jsonString = "";
        try {
            dbclient.connect();
            const result = await dbclient.query(sql_command);
            const dbrows = result.rows;
            jsonString = JSON.stringify(dbrows);
        }
        catch (err) {
            console.log(err);
        }
        finally {
            dbclient.end();
        }
        //let tableoutput:string[] = generateTimesTable ();
        res.json(jsonString);
    });
    app.use(apiStat);
    const getStatus = express.Router();
    getStatus.use((req, res, next) => {
        console.log("getStatus specific middleware!");
        next();
    });
    getStatus.get('/status', async (req, res) => {
        console.log("In test getStatus API");
        //let metric = req.query.metric?.toString()?? "";
        let device = req.query.device?.toString() ?? "";
        let db = req.query.db?.toString() ?? "g2";
        let sql_command = "";
        let dbconfig = config.sql;
        if (db === "g2") {
            dbconfig.database = config.g2dbname;
            sql_command = `SELECT "timestamp", 
								deviceid ||  CASE WHEN status = 'true' then ' is ' else ' is not ' end
								|| status_name "statusText"
							FROM public.equipment_status
							where lower(deviceid)=lower('${device}')
							order by "timestamp" desc
							limit 1;`;
        }
        else {
            dbconfig.database = config.g1dbname;
            sql_command = "";
        }
        const dbclient = new pg.Client(config.sql);
        let jsonString = "";
        try {
            dbclient.connect();
            const result = await dbclient.query(sql_command);
            const dbrows = result.rows;
            jsonString = JSON.stringify(dbrows);
        }
        catch (err) {
            console.log(err);
        }
        finally {
            dbclient.end();
        }
        //let tableoutput:string[] = generateTimesTable ();
        res.json(jsonString);
    });
    app.use(getStatus);
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