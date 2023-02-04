const got = require("got");


(async function(){
const a = await got.get("https://www.extrememusic.com/env");
//console.log(a)
const token = await JSON.parse(a.body);
console.log(token.token)})()