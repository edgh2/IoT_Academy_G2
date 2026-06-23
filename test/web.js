"use strict";
// simple example of HTTP GET request and response processing
async function main() {
    let fetchType = "json"; // use "json" for a JSON web source, use "text" for non-JSON web source
    let url;
    let json;
    let text;
    if (fetchType == "json") {
        url = 'https://jsonplaceholder.typicode.com/todos/1';
    }
    else {
        url = "http://www.conestogac.on.ca";
    }
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
main();
