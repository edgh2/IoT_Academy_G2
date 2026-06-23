/*
 * testapi.js
 *
 * This is a simple test harness to validate that our API is returning JSON 
 * formatted data correctly.
 *
 * Notice the use of process.argv[] - the argv[] array is a list of all of
 * the command line arguments provided.
 *
 * To execute this, you can simply type the command as shown below (which
 * provides the argv[] mappings we depend upon for this test app)
 *
 * node testapi url
 *  [0]   [1]   [2]
 */



/*
 * async function getTimesTable(url);
 * 
 * This function will make the fetch() request to the desired URL
 * and return the JSON content from the fetch.
 */

async function getTimesTable(url)
{
	// get the times table we are interested in 
	const response = await fetch(url);
	return await response.json(); //extract JSON from the http response
}


/*
 * async function main();
 *
 * This function will check the incoming arguments to set up
 * a URL to test the timestable API against. If no argument provided, it will
 * default to a pre-defined URL.
 *
 * main() will call upon getTimesTable() supplying the desired URL
 * and will fetch the JSON data accordingly. 
 */

async function main()
{
	// get the URL from command line

	let u = process.argv[2];

	// if no URL provided, set up a default

	if (u === undefined)
		u = "http://127.0.0.1:4000/timestable/5";

	// get the times table from our API

	s = await getTimesTable(u);

	console.log(s);
}

// execute main

main();
