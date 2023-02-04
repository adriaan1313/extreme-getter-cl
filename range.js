const got = require("got");
const fs = require("fs");

const min = 44259;
const max = 45395;


got.get("https://www.extrememusic.com/env").then(a=>{
	console.log("got token")
	const token = JSON.parse(a.body);
	fs.mkdirSync("./range", {recursive: true});
	for(let i=min; i<=max; i++){
		console.log(i, "started");
		try{
			const b = got.get("https://napi.extrememusic.com/tracks/"+i, {headers:{"X-API-Auth":token.token}}).then(b=>{
				if(fs.existsSync("./range/"+b.track_sound_no+".json") return;
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