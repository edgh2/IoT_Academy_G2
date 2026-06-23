/*
    index.js
*/
import * as fs from 'fs';
import * as path from 'path';
import { createLogger, format, transports } from 'winston';
const winstonConfig = {
    level: 'info',
    format: format.combine(format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
    }), format.errors({ stack: true }), format.splat()),
    defaultMeta: { service: 'logger01' },
    transports: [
        new transports.File({
            filename: 'logs/error.log', level: 'error',
            format: format.json()
        }),
        new transports.File({
            filename: 'logs/all.log',
            format: format.json()
        })
    ]
};
var logger;
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
function main() {
    /*
    //config = readFileAsJSON("./config.json");
    console.log("Project title: ", config.projectTitle);
    let tags:string[];
    tags = readFileAsArray("./tags.txt");
    for (let i:number = 0; i<tags.length; i++) {
        console.log("Tag", i, "holds", tags[i]);
    }*/
    logger = createLogger(winstonConfig);
    logger.add(new transports.Console({
        format: format.combine(format.colorize(), format.simple())
    }));
    logger.log({ level: 'info', message: 'hello winston' });
    logger.log({ level: 'error', message: 'sample error' });
}
main();
//# sourceMappingURL=index.js.map