/**
	THIS IS USED TO CREATE A VERSION OF GENRES_CLASSIFIED.JSON WITHOUT ID3 GENRE ID'S FOR MANUAL CLASSIFICATION
	also, misses some of them so idk
*/


const got = require("got");
const fs = require("fs");

const manual_parents = JSON.parse(fs.readFileSync("manual_parents.json"));

(async function(){
const a = await got.get("https://www.extrememusic.com/env");
//console.log(a)
const token = await JSON.parse(a.body);
delete a;

const b = await got.get("https://napi.extrememusic.com/search/tracks?blank=1&facets=1&field=&isLyricsSearch=false&mode=filter&order_by=default&range=0%2C0", {headers:{"X-API-Auth":token.token}});
const data = await JSON.parse(b.body);
delete b;
let c = {};
let d = {};
await data.meta.filter_facets.gen.forEach(a=>c[a.id] = {label: a.label, subs: {}, id3:""});

Object.keys(manual_parents).forEach(a=>{
	const b = manual_parents[a];
	c[b.parent].subs[a]={label: b.label, subs:{}, id3:""};
	d[a] = b.parent;
});

await data.meta.filter_facets.subgen.forEach(a=>{c[a.parent_id].subs[a.id] = {label: a.label, subs:{}, id3:""}; d[a.id]=a.parent_id});
data.meta.filter_facets.subsubgen.forEach(a=>{
	if(d[a.parent_id]){
		c[d[a.parent_id]].subs[a.parent_id].subs[a.id] = {label: a.label, id3:""};
	}else {
		console.log(a);
		if(!c.orphans)c.orphans={};
		if(!c.orphans[a.parent_id])c.orphans[a.parent_id]={};
		c.orphans[a.parent_id][a.id]=a.label;
	}
});
//manually investegate orphans - for some reason they don't all have parents properly
fs.writeFileSync("./genres.json", JSON.stringify(c));


})();