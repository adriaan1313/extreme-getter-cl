const ID3 = require("node-id3");
const got = require("got");
const fs = require("fs");
const childProc= require("child_process");
const cArgs = require('command-line-args');
const process = require("node:process");
const optionDefinitions = [
	{name: "track", alias: "t", type: Number, defaultOption: true}
];
const options = cArgs(optionDefinitions);

if(!options.track) {
	console.log("please specify a track");
	process.exit(1);
}



const track_id = options.track.toString();
let runningDownloads=0;
(async function(){
const a = await got.get("https://www.extrememusic.com/env");
//console.log(a)
const token = await JSON.parse(a.body);
delete a;

const b = await got.get("https://napi.extrememusic.com/tracks/"+track_id, {headers:{"X-API-Auth":token.token}});
console.log(b.body);
process.exit();
})()