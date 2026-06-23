/*
    index.js
*/
import * as fs from 'fs';
import * as path from 'path';
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
//Author: Edward
function time_table(number = 1) {
    for (let i = 1; i <= 10; i++) {
        console.log(number + " x " + i + " = " + number * i);
    }
}
function main() {
    let s = "hello project01";
    console.log(s);
    let x = 5;
    console.log(`x: ${x}`);
    for (let i = 1; i <= 12; i++) {
        time_table(i);
    }
}
main();
//# sourceMappingURL=index.js.map