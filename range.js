const got = require("got");
const fs = require("fs");

const min = 66032;
const max = 66036;

got.get("https://www.extrememusic.com/env").then(a=>{
	console.log("got token")
	const token = JSON.parse(a.body);
	fs.mkdirSync("./range", {recursive: true});
	for(let i=min; i<=max; i++){
		console.log(i, "started");
		try{
			const b = got.get("https://napi.extrememusic.com/tracks/"+i, {headers:{"X-API-Auth":token.token}}).then(b=>{
				const data = JSON.parse(b.body);
				if(!data.track) return;
				if(fs.existsSync("./range/"+data.track.track_no+".json")) return;
				fs.writeFileSync("./range/"+data.track.track_no+".json", b.body);
				console.log(i, data.track.track_no, "done");
			});
		}
		catch{}
		syncSleep(50);
	}
	
});


function syncSleep(millis) {
  const d=Date.now();
  let cD;
  do{
    cD=Date.now();
  }while(cD-d<millis);
}