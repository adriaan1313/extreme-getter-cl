const got = require("got");
const fs = require("fs");

const min = /**/;
const max = /**/;


got.get("https://www.extrememusic.com/env").then(a=>{
	console.log("got token")
	const token = JSON.parse(a.body);
	fs.mkdirSync("./range", {recursive: true});
	for(let i=min; i<=max; i++){
		console.log(i, "started");
		try{
			const b = got.get("https://napi.extrememusic.com/tracks/"+i, {headers:{"X-API-Auth":token.token}}).then(b=>{
				if(fs.existsSync("./range/"+b.track_sound_no+".json")) return;
				const data = JSON.parse(b.body);
				fs.writeFileSync("./range/"+data.track.track_no+".json", b.body);
				console.log(i, "done");
			});
		}
		catch{}
		//syncSleep(100);
	}
	
});


function syncSleep(millis) {
  const d=Date.now();
  let cD;
  do{
    cD=Date.now();
  }while(cD-d<millis);
}

//"LOGGED_IN" or "LOGGED_OUT"
// at https://napi.extrememusic.com/my/profile


// cookie+ua needed for following 3:
// https://napi.extrememusic.com/my/audio_downloadSize
//removed details for gh, gives estimated size of downloaded file
/**
ask it
{
	"download_request":{
		"download_type":"track",
		"body":{
			"track_sound_formats":[
				{
					"track_sound_id":"",
					"isStem":false,
					"formats":["MP3"]
				},{
					"track_count":1,
					"isMultiSelect":true
				}
			]
		},"sizes_only":true
	}
}
*/
// https://napi.extrememusic.com/my/audio_download
//removed details for gh
/**
ask it
"download_request":{"download_type":"track","body":{"track_sound_formats":[{"track_sound_id":"","isStem":false,"formats":["WAV"]}]},"filename":""}}
*/


// https://napi.extrememusic.com/tracks/64134/customix_session
//removed details for gh
/**
returns
{
  "customix_session": {
    "id": "",
    "created": "",
    "expires": "",
    "client_url": ""
  }
}
*/