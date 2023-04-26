const ID3 = require("node-id3");
const got = require("got");
const fs = require("fs");
const childProc= require("child_process");
const cArgs = require('command-line-args');
const process = require("node:process");
const optionDefinitions = [
	{name: "album", alias: "a", type: Number, defaultOption: true},
	{name: "mode", alias: "m", type: String},
	{name: "max-process", alias: "p", type: Number},
	{name: "no-alternative-versions-or-stems", alias: "f", type: Boolean},
	{name: "no-tag", alias: "t", type: Boolean},
	{name: "tag-delim", alias: "d", type: String},
	{name: "random-min", alias: "n", type: Number},
	{name: "random-max", alias: "x", type: Number},
	{name: "delay", alias: "s", type: Number},
	{name: "help", alias: "?", type: Boolean}
];
const options = cArgs(optionDefinitions);

if(options.help){
	console.log(`Extreme Getter by Bunny

Usage: node index <album> [options (optional)]
 -m, --mode <json|mp3|m4a|m3u8url|mp3url>   m4a requires ffmpeg installed
 -p, --max-process <number>                 max amount of child processes in m4a mode
 -f, --no-alternative-versions-or-stems     get only full versions
 -t, --no-tag                               do not add metadata to downloaded mp3's/m4a's
 -d, --tag-delim <delimiter>                when multiple values in tag, what delimiter to use, ";" by default
 -n, --random-min <milliseconds>            minimum random delay (max required)
 -x, --random-max <milliseconds>            maximum random delay (min required)
 -s, --delay <milliseconds>                 static delay
 -?, --help                                 show this page`);
 process.exit();
}




if(!options.album) {
	console.log("please specify an album");
	console.log("for help see -?");
	process.exit(1);
}


let delayMode = "NONE";
const album_id = options.album.toString();
const delim=options.delim || "/";
const mode=options.mode?.toLowerCase()||"mp3";// m4a REQURES FFMPEG IN PATH; doesn't do all tags
const max_proc=options["max-process"]||10;
const onlyFull=options["no-alternative-versions-or-stems"];
const doTag=!options["no-tag"];
const randomMax = options["random-max"];   //in ms
const randomMin = options["random-min"];   //in ms
const staticDelay = options["delay"];      //in ms
if(!isNaN(randomMin)&&!isNaN(randomMin)){
	delayMode = "RANDOM";
} else if(!isNaN(staticDelay)){
	delayMode = "STATIC";
}
let runningDownloads=0;
(async function(){
const a = await got.get("https://www.extrememusic.com/env");
//console.log(a)
const token = await JSON.parse(a.body);
delete a;

const b = await got.get("https://napi.extrememusic.com/albums/"+album_id, {headers:{"X-API-Auth":token.token}});
if(mode=="json"){
	console.log(b.body);
	process.exit();
}
const data = await JSON.parse(b.body);
delete b;
//console.log(data);
/** oo purple
data has album, tracks and track_sounds
album has album_no, artist, countries, created, description, eras, genres, id, image_background_url, image_detail_url, image_justify, image_large_url, image_small_url, images, keywords, last_embedded, moods, priority_album, read_only, series_id, series_slug, series_title, studio_leak, subgenres, title, track_count, track_ids and video
	album.images has default and background
		album.images.default and background are image[] with height, url, webp, width
	album.video has lores and hires
	tracks is track[] with id, track_no, album_id, title, album_title, description, arrangers, composers, collecting_publishers, original_publishers, codes, genre, subgenre, instruments, moods, eras, keywords, tempo, tempo_value, bpm, bpm_secondary, music_key, music_key_value, customix_avail, stems_avail, lyrics_avail, default_track_sound_id, track_sound_ids, copyright_restrictions, read_only, is_favorite, allow_download, sort_order, image_large_url, image_small_url, image_detail_url, site_filter, alt_mixes_track_ids, original_mix_track_id, studio_leak and release_date
	track_sounds is track sound[] with id, track_id, track_sound_no, title, version_type, duration, volume, mute, stems_avl, assets, is_favorite, notes, allow_download, explicit_lyrics, instruments, moods, eras, keywords, tempo, bpm, bpm_secondary and music_key
**/

data.album.images.default.sort((a,b)=>a.width-b.width);

const c = await got.get(data.album.images.default[data.album.images.default.length-1].url);
const cover = c.rawBody;
try{fs.mkdirSync("./temp");}catch{}
try{fs.mkdirSync("./output");}catch{}
fs.writeFileSync("./temp/cover.jpg", cover);
delete cover;
let count=0;
const mon=["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
let lastStarted = 0;

function delay(){
	if(delayMode == "RANDOM"){
		return Math.random()*(randomMax-randomMin)+randomMin;
	} else if(delayMode == "STATIC"){
		return staticDelay;
	}
	else{
		return 0;
	}
}

data.track_sounds.forEach(async a=>{lastStarted+=delay();setTimeout( async a=>{
	//const url = new URL(a.assets.audio.preview_url);
	//const dir = decodeURIComponent(("."+url.pathname).replace(/\/(\w|_\d|-|%)+\.(\w|_\d)+/, ""));
	//fs.mkdirSync(dir, {recursive:true});

	if(onlyFull && a.track_sound_no.split("_").length!=2) return;
	if(mode.indexOf("url")!=-1||!fs.existsSync("./output/"+a.track_sound_no+"."+mode)){
		const b = trackData(a.track_id, data.tracks);
		const tm= new Date(b.release_date||data.album.created||0);
		const tags={
			TIT2:a.title||b.title||"", 
			TIT3:a.version_type||"",
			APIC:"./temp/cover.jpg",
			TKEY:a.music_key||b.music_key||"",
			TCON:genre(b.genre, b.subgenre, false)||12,
			TPUB:b.original_publishers[0].name||b.collecting_publishers[0].name||"",
			TALB:b.album_title||data.album.title||"",
			TLEN:a.duration*1000||0,
			TCOM:tCOM(b.composers)||"",
			TSRC:fromName("ISRC", b.codes).value||"",
			TMOO:lab(b.moods)||"",
			TRCK:a.track_sound_no.split(data.album.album_no+"_")[1]||0,
			TBPM:a.bpm||b.bpm||a.bpm_secondary||b.bpm_secondary,
			TDAT:tm.getDate()+" "+mon[tm.getMonth()],
			TYER:tm.getFullYear(),
			TPE2:data.album.artist
		};
		
		delete tm;
		delete b;
		if(mode=="mp3")	got.get(a.assets.audio.preview_url).then(d=>{
			if(doTag){
				ID3.write(tags, d.rawBody, (err, buf)=>{
					if(!err){
						fs.writeFile("./output/"+a.track_sound_no+".mp3", buf, er=>{
							if(er)throw er;
							else {
								count++;
								console.log(a.title, a.version_type, count, "of", data.track_sounds.length);
							}
						});
					}
					else throw(err);
				});
			}
			else {
				fs.writeFile("./output/"+a.track_sound_no+".mp3", d.rawBody, er=>{
					if(er)throw er;
					else {
						count++;
						console.log(a.title, a.version_type, count, "of", data.track_sounds.length);
					}
				});
			}
		})
		else if(mode=="m4a"){
			limitProcesses(500,()=>{
				runningDownloads++;
				childProc.exec("ffmpeg -n -i \""+fixHlsURL(a.assets.audio.preview_url_hls)+"\" -c copy "+ createMetadatas(tags)+"\"./output/"+a.track_sound_no+".m4a\"",{windowsHide:true}, (err, stdout, err2)=>{
					if(err) {
						console.log(err);
						fs.rm("./output/"+a.track_sound_no+".m4a", {maxRetries: 3, retryDelay: 500}, e=>{runningDownloads--;});
						count++;
					}
					//else if(err2) throw(new Error("Ffmpeg error: "+ err2+"\nFfmpeg output: "+stdout));
					else {
						//if it dies and leaves behind use (on windows) to kill all instances of ffmpeg if needed: taskkill /im ffmpeg.exe /f
						count++;
						console.log(a.title, a.version_type, count, "of", data.track_sounds.length);
						runningDownloads--;
					}
			});});
		}else if(mode=="m3u8url"){
			console.log(fixHlsURL(a.assets.audio.preview_url_hls));
		}else if(mode=="mp3url"){
			console.log(a.assets.audio.preview_url);
		}else if(mode=="dashurl"){
			console.log(fixDashURL(a.assets.audio.preview_url_dash));//note, doesn't actually work
		}else throw(new Error("This option does not exist"));
		delete d;
		
	}else {
		count++;
		console.log(a.title, a.version_type, count, "of", data.track_sounds.length, "already exists");
	}
	//delete url;
	//delete dir;
	
}, lastStarted,a);


});})();


const gsgssg = JSON.parse(fs.readFileSync("./genre_classified.json"));
function tCOM(com){
	let asd=[];
	com.forEach(bcd=>asd.push(bcd.name));
	return asd.join(delim);
}
function lab(i){
	const a=[];
	i.forEach(b=>a.push(b.label));
	return a.join(delim);
}



function fromName(name, a){
	return a.filter(a=>name=a.name)[0]//should only ever be one
}
function genre(gen, subgen, subsubgen){
	let out="";
	if(          subsubgen)out=gsgssg[gen[0].id]?.subs[subgen[0].id]?.subs[subsubgen[0].id]?.id3;
	if(!out?.length&&subgen)out=gsgssg[gen[0].id]?.subs[subgen[0].id]?.id3;
	if(!out?.length&&   gen)out=gsgssg[gen[0].id]?.id3;
	if(!out?.length        )out=12;
	return out;
}
function trackData(track_id, tracks){
	return tracks.filter(a=>track_id==a.id)[0]//should only ever be one
}

function limitProcesses(time, callback){
	let _a = setInterval(()=>{
		if(runningDownloads<max_proc) {
			clearInterval(_a)
			callback();
			delete _a;
			
		}
	}, time)
}
//	TIT2:a.title||b.title||"", 
//	TIT3:a.version_type||"",
//	APIC:"./temp/cover.jpg",
//	TKEY:a.music_key||b.music_key||"",
//	TCON:genre(b.genre, b.subgenre, false)||12,
//	TPUB:b.original_publishers[0].name||b.collecting_publishers[0].name||"",
//	TALB:b.album_title||data.album.title||"",
//	TLEN:a.duration*1000||0,
//	TCOM:tCOM(b.composers)||"",
//	TSRC:fromName("ISRC", b.codes).value||"",
//	TMOO:lab(b.moods)||"",
//	TRCK:a.track_sound_no.split(data.album.album_no+"_")[1]||0,
//	TBPM:a.bpm||b.bpm||a.bpm_secondary||b.bpm_secondary,
//	TDAT:tm.getDate()+" "+mon[tm.getMonth()],
//	TYER:tm.getFullYear(),
//	TPE2:data.album.artist
function fixHlsURL(e){
	return /^(.*)\.m3u8(\?.*)?$/.test(e)&&(/^(.*)\/HLS\/\d{1,}(_v\d)?\.m3u8(\?.*)?$/.test(e)||(e=e.replace(/^(.*)\.m3u8(\?.*)?$/,"$1/HLS/128_v4.m3u8")));
}
function fixDashURL(e){
	return /^(.*)\.mpd(\?.*)?$/.test(e)&&(/^(.*)\/DASH\.mpd(\?.*)?$/.test(e)||(e=e.replace(/^(.*)\.mpd(\?.*)?$/,"$1/DASH.mpd$2")));
}

function createMetadatas(tags){
	if(!doTag) return "";
	let out="";
	if(tags.TIT3&&tags.TIT2) out+=`-metadata title="${tags.TIT2} - ${tags.TIT3}" `;
	if(!tags.TIT3&&tags.TIT2) out+=`-metadata title="${tags.TIT2}" `;
	if(tags.APIC) out+=`-disposition:v:1 "${tags.APIC}" `;
	if(tags.TCON) out+=`-metadata genre="${tags.TCON}" `;
	if(tags.TALB) out+=`-metadata album="${tags.TALB}" `;
	if(tags.TCOM) out+=`-metadata composer="${tags.TCOM}" `;
	if(tags.TRCK) out+=`-metadata track="${tags.TRCK}" `;
	if(tags.TYER) out+=`-metadata year="${tags.TYER}" `;
	if(tags.TPE2) out+=`-metadata album_artist="${tags.TPE2}" `;
	return out;
}
