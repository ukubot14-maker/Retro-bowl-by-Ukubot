(() => {
"use strict";
const $ = id => document.getElementById(id);
const canvas = $("fieldCanvas"), ctx = canvas.getContext("2d");
const TEAMS = [
  {name:"River City Rivets",abbr:"RIV",color:"#ff9c55"},
  {name:"Metro Bolts",abbr:"BOL",color:"#7bd8ff"},
  {name:"Canyon Coyotes",abbr:"COY",color:"#d9b7ff"},
  {name:"Harbor Hounds",abbr:"HND",color:"#ff7d91"},
  {name:"Pinewood Peaks",abbr:"PEK",color:"#c7f36b"},
  {name:"Desert Scorpions",abbr:"SCO",color:"#ffd166"}
];
const STORAGE = "gridiron-pocket-save-v1";
let save = loadSave();
let game = null, keys = new Set(), lastTick = 0, raf = 0, soundOn = true, audio = null;
const rand = (a,b) => a + Math.random()*(b-a);
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
function loadSave(){try{const s=JSON.parse(localStorage.getItem(STORAGE));if(s&&s.season)return s;}catch(e){}return {season:null};}
function persist(){try{localStorage.setItem(STORAGE,JSON.stringify(save));}catch(e){}}
function showScreen(name){["homeScreen","gameScreen","seasonScreen"].forEach(id=>$(id).classList.toggle("hidden",id!==name));}
function message(s){$("gameMessage").textContent=s;}
function beep(freq=440,duration=.07){if(!soundOn)return;try{audio=audio||new (window.AudioContext||window.webkitAudioContext)();const o=audio.createOscillator(),g=audio.createGain();o.connect(g);g.connect(audio.destination);o.frequency.value=freq;g.gain.value=.035;o.start();g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.stop(audio.currentTime+duration);}catch(e){}}
function makeSchedule(){const opponents=[1,2,3,4,5,2,4,1];return opponents.map((t,i)=>({week:i+1,opponent:t,played:false,win:null,score:0,oppScore:0}));}
function startSeason(){if(!save.season)save.season={team:0,week:0,wins:0,losses:0,champion:false,schedule:makeSchedule(),standings:TEAMS.map((t,i)=>({team:i,w:0,l:0,pf:0,pa:0}))};persist();renderSeason();showScreen("seasonScreen");}
function resetSeason(){if(!confirm("Reset your season and erase its results?"))return;save.season=null;persist();startSeason();}
function renderSeason(){
 const s=save.season;if(!s)return;
 $("seasonRecord").textContent=`${s.wins}–${s.losses}`;$("seasonTeamName").textContent=TEAMS[s.team].name.toUpperCase();
 const standings=[...s.standings].sort((a,b)=>b.w-a.w||a.l-b.l||b.pf-a.pf);
 $("standings").innerHTML='<div class="table-row header"><span>TEAM</span><span>W</span><span>L</span><span>PF</span></div>'+standings.map(r=>`<div class="table-row ${r.team===s.team?'mine':''}"><span>${TEAMS[r.team].name}</span><b>${r.w}</b><b>${r.l}</b><b>${r.pf}</b></div>`).join("");
 $("schedule").innerHTML=s.schedule.map((g,i)=>`<div class="schedule-row ${g.played?'done':''}"><span>WK ${g.week}</span><b>${TEAMS[g.opponent].name}</b><span>${g.played?`${g.score}–${g.oppScore}`:(i===s.week?'NEXT':'UPCOMING')}</span></div>`).join("");
 $("playNextBtn").textContent=s.week>=s.schedule.length?(s.champion?"🏆 SEASON CHAMPIONS":"SEASON COMPLETE"):"PLAY WEEK "+s.schedule[s.week].week+" →";
 $("playNextBtn").disabled=s.week>=s.schedule.length;$("playNextBtn").style.opacity=s.week>=s.schedule.length?".5":"1";
}
function initGame(mode,opponent=null){
 const s=mode==="season"?save.season:null;
 game={mode,home:TEAMS[s?s.team:0],away:TEAMS[opponent??Math.floor(rand(1,TEAMS.length))],homeScore:0,awayScore:0,quarter:1,time:120,down:1,toGo:10,spot:25,plays:0,phase:"call",playType:null,player:{x:120,y:220,vx:0,vy:0},receivers:[],defenders:[],ball:null,driveStart:25,turnover:false,gameOver:false,seasonIndex:s?s.week:null};
 $("gameModeTitle").textContent=mode==="season"?`WEEK ${s.week+1} · REGULAR SEASON`:"QUICK MATCH";
 $("homeAbbr").textContent=game.home.abbr;$("awayAbbr").textContent=game.away.abbr;
 $("homeScore").textContent="0";$("awayScore").textContent="0";$("postGame").classList.add("hidden");
 $("runBtn").disabled=false;$("passBtn").disabled=false;
 updateHUD();message("Choose RUN or PASS to begin.");$("fieldHint").textContent="CHOOSE A PLAY TO START";
 $("playTitle").textContent="What's the call?";$("playDescription").textContent="Pick a play, then move the ball carrier or throw to a receiver.";
 showScreen("gameScreen");draw();cancelAnimationFrame(raf);lastTick=0;raf=requestAnimationFrame(loop);
}
function updateHUD(){
 if(!game)return;
 $("quarterPill").textContent=`Q${game.quarter} · ${Math.floor(game.time/60)}:${String(game.time%60).padStart(2,"0")}`;
 $("downDistance").textContent=game.down>4?"TURNOVER":`${ordinal(game.down)} & ${game.toGo}`;
 $("fieldPosition").textContent=game.spot>=50?`OPP ${100-game.spot}`:`OWN ${game.spot}`;
 $("homeScore").textContent=game.homeScore;$("awayScore").textContent=game.awayScore;
}
function ordinal(n){return ["","1ST","2ND","3RD","4TH"][n]||"4TH";}
function startPlay(type){
 if(!game||game.gameOver||game.phase!=="call")return;
 game.playType=type;game.phase=type==="run"?"run":"pass";game.plays++;
 game.player={x:90+game.spot*6.6,y:220,vx:0,vy:0};
 game.receivers=[{x:game.player.x+150,y:95,vx:1.1,vy:.15},{x:game.player.x+195,y:220,vx:1.25,vy:0},{x:game.player.x+140,y:345,vx:.95,vy:-.1}];
 game.defenders=Array.from({length:6},(_,i)=>({x:game.player.x+rand(95,260),y:60+i*62+rand(-12,12),speed:rand(35,54),color:i%2?"#f4f2e9":"#ffdc72"}));
 game.ball=null;game.driveStart=game.spot;
 $("playTitle").textContent=type==="run"?"POWER RUN":"DROP BACK & READ";
 $("playDescription").textContent=type==="run"?"Move forward and cut around defenders. Reach the end zone to score.":"Tap a numbered receiver or press 1–3. Throw before a defender reaches you.";
 $("fieldHint").textContent=type==="run"?"RUN! MOVE RIGHT TO GAIN YARDS":"PASS PLAY · TAP A RECEIVER";
 message(type==="run"?"Find a lane! Move with WASD, arrows, or the touch pad.":"Choose a receiver on the field or press 1, 2, or 3 to throw.");
 beep(type==="run"?280:520);draw();
}
function move(dir){
 if(!game||game.gameOver)return;
 if(game.phase==="run"){
 const p=game.player;const step=dir==="sprint"?9:5;
 if(dir==="up")p.y-=step;if(dir==="down")p.y+=step;if(dir==="left")p.x-=step;if(dir==="right")p.x+=step;
 p.y=clamp(p.y,35,405);p.x=clamp(p.x,50,850);
 }else if(game.phase==="pass"&&["up","down","left","right"].includes(dir)){
 const p=game.player,step=5;if(dir==="up")p.y-=step;if(dir==="down")p.y+=step;if(dir==="left")p.x-=step;if(dir==="right")p.x+=step;p.y=clamp(p.y,35,405);p.x=clamp(p.x,50,850);
 } else if(dir==="sprint"&&game.phase==="run"){game.player.x=Math.min(850,game.player.x+12);}
 draw();
}
function throwBall(index){
 if(!game||game.phase!=="pass"||game.ball||game.gameOver)return;
 const r=game.receivers[index];if(!r)return;
 game.ball={x:game.player.x,y:game.player.y-8,tx:r.x,ty:r.y,receiver:index,t:0,intercepted:false};
 message(`Ball away to ${["LEFT","MIDDLE","RIGHT"][index]}! Can your receiver get there?`);$("fieldHint").textContent="BALL IN THE AIR";beep(700);draw();
}
function loop(now){
 if(!game)return;
 const dt=Math.min(.04,(now-(lastTick||now))/1000);lastTick=now;
 if(!game.gameOver&&game.phase!=="call"){
 game.time-=dt;if(game.time<=0){game.time=0;endQuarter();}
 if(game.phase==="run")tickRun(dt);
 if(game.phase==="pass")tickPass(dt);
 updateHUD();
 }
 draw();raf=requestAnimationFrame(loop);
}
function tickRun(dt){
 const g=game,p=g.player;
 // Defensive pursuit.
 g.defenders.forEach(d=>{const dx=p.x-d.x,dy=p.y-d.y,dist=Math.hypot(dx,dy)||1;d.x+=dx/dist*d.speed*dt;d.y+=dy/dist*d.speed*dt;});
 const tackler=g.defenders.find(d=>Math.hypot(d.x-p.x,d.y-p.y)<22);
 if(tackler){finishPlay(Math.max(0,Math.round((p.x-(90+g.driveStart*6.6))/6.6)),"TACKLED!");return;}
 const yard=Math.max(0,Math.floor((p.x-90)/6.6));const target=100-g.spot;
 if(yard>=target){g.homeScore+=6;updateHUD();message("TOUCHDOWN! Six points on the board.");beep(880,.2);afterScore();return;}
 if(yard>=g.toGo){finishPlay(Math.max(1,yard),"FIRST DOWN!");return;}
 if(p.x>850){finishPlay(Math.max(1,yard),"BIG GAIN!");return;}
}
function tickPass(dt){
 const g=game;
 g.receivers.forEach((r,i)=>{r.x+=r.vx*dt*24;r.y+=Math.sin(performance.now()/300+i)*dt*12;r.x=Math.min(845,r.x);});
 g.defenders.forEach(d=>{const target=g.ball?g.ball:{x:g.player.x,y:g.player.y};const dx=target.x-d.x,dy=target.y-d.y,dist=Math.hypot(dx,dy)||1;d.x+=dx/dist*d.speed*dt;d.y+=dy/dist*d.speed*dt;});
 if(!g.ball){if(g.defenders.some(d=>Math.hypot(d.x-g.player.x,d.y-g.player.y)<22))finishPlay(0,"SACKED!");return;}
 const b=g.ball;b.t+=dt*1.7;b.x+=(b.tx-b.x)*Math.min(1,dt*3.2);b.y+=(b.ty-b.y)*Math.min(1,dt*3.2);
 const r=g.receivers[b.receiver];
 if(g.defenders.some(d=>Math.hypot(d.x-b.x,d.y-b.y)<16)&&b.t>.15){finishPlay(0,"INTERCEPTED! Turnover.");return;}
 if(Math.hypot(b.x-r.x,b.y-r.y)<22||b.t>1.1){
  if(Math.random()<.76){const yards=Math.max(3,Math.floor((r.x-g.player.x)/6.6)+Math.floor(rand(0,8)));finishPlay(yards, yards>=g.toGo?"COMPLETE! FIRST DOWN!":"PASS COMPLETE!");}
  else finishPlay(0,"INCOMPLETE. The pass falls away.");
 }
}
function finishPlay(yards,text){
 const g=game;if(g.gameOver)return;
 g.ball=null;g.spot=Math.min(100,g.spot+yards);
 if(g.spot>=100){g.homeScore+=6;message("TOUCHDOWN! Great drive.");afterScore();return;}
 if(text.includes("INTERCEPTED")){g.down=1;g.toGo=10;g.spot=Math.max(5,g.spot-15);g.phase="call";message(text+" Your defense gets a chance next drive.");}
 else if(text.includes("INCOMPLETE")){g.down++;message(text);if(g.down>4)turnoverDowns();else g.phase="call";}
 else if(yards>=g.toGo){g.down=1;g.toGo=10;g.phase="call";message(`${text} Gained ${yards} yards. First down!`);}
 else{g.down++;g.toGo=Math.max(1,g.toGo-yards);g.phase="call";message(`${text} Gained ${yards} yards. ${g.down<=4?`${ordinal(g.down)} & ${g.toGo}.`:""}`);if(g.down>4)turnoverDowns();}
 g.player={x:90+g.spot*6.6,y:220,vx:0,vy:0};g.receivers=[];g.defenders=[];g.ball=null;$("fieldHint").textContent="CHOOSE YOUR NEXT PLAY";updateHUD();beep(390);draw();
}
function turnoverDowns(){game.down=1;game.toGo=10;game.spot=Math.max(5,game.spot-12);game.phase="call";message("TURNOVER ON DOWNS! The defense holds.");}
function afterScore(){game.phase="call";game.down=1;game.toGo=10;game.spot=25;game.player={x:255,y:220,vx:0,vy:0};game.receivers=[];game.defenders=[];game.ball=null;$("fieldHint").textContent="TOUCHDOWN! NEXT DRIVE";$("playTitle").textContent="Score! Keep it going.";updateHUD();setTimeout(()=>{if(game&&!game.gameOver)message("Choose RUN or PASS for the next drive.");},700);}
function endQuarter(){
 if(game.quarter<4){game.quarter++;game.time=120;message(`End of quarter. Welcome to Q${game.quarter}!`);beep(300,.18);updateHUD();}
 else endGame();
}
function endGame(){
 if(!game||game.gameOver)return;game.gameOver=true;cancelAnimationFrame(raf);
 // A small simulated opponent score makes the quick-match/season loop complete.
 if(game.awayScore===0)game.awayScore=Math.random()<.48?3:7;
 updateHUD();
 const win=game.homeScore>=game.awayScore;
 $("postTitle").textContent=win?"W! VICTORY!":game.homeScore===game.awayScore?"OVERTIME? TIE GAME":"FINAL WHISTLE";
 $("postText").textContent=`${game.home.name} ${game.homeScore} — ${game.awayScore} ${game.away.name}. ${win?"The crowd is on its feet.": "Every game is a chance to bounce back."}`;
 $("postGame").classList.remove("hidden");$("continueBtn").textContent=game.mode==="season"?"BACK TO SEASON":"BACK TO MENU";
 if(game.mode==="season")recordSeason(win,game.homeScore,game.awayScore);
}
function recordSeason(win,score,oppScore){
 const s=save.season;if(!s)return;const fixture=s.schedule[s.week];fixture.played=true;fixture.win=win;fixture.score=score;fixture.oppScore=oppScore;
 s.wins+=win?1:0;s.losses+=win?0:1;s.week++;
 const mine=s.standings.find(x=>x.team===s.team),opp=s.standings.find(x=>x.team===fixture.opponent);
 mine[win?"w":"l"]++;mine.pf+=score;mine.pa+=oppScore;opp[win?"l":"w"]++;opp.pf+=oppScore;opp.pa+=score;
 if(s.week>=s.schedule.length){s.champion=s.wins>=5;}
 persist();
}
function draw(){
 if(!game)return;const w=canvas.width,h=canvas.height;
 ctx.clearRect(0,0,w,h);ctx.fillStyle="#236e4a";ctx.fillRect(0,0,w,h);
 for(let y=0;y<h;y+=80){ctx.fillStyle=y%160===0?"#2a7b52":"#26734e";ctx.fillRect(0,y,w,80);}
 ctx.strokeStyle="rgba(242,255,226,.6)";ctx.lineWidth=3;
 for(let x=0;x<=w;x+=90){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}
 // End zones and hash marks
 ctx.fillStyle="#174e39";ctx.fillRect(0,0,45,h);ctx.fillRect(w-45,0,45,h);
 ctx.fillStyle="#e4f0cf";ctx.font="bold 17px monospace";ctx.save();ctx.translate(26,h/2);ctx.rotate(-Math.PI/2);ctx.fillText(game.home.abbr,0,0);ctx.restore();ctx.save();ctx.translate(w-25,h/2);ctx.rotate(Math.PI/2);ctx.fillText(game.away.abbr,0,0);ctx.restore();
 ctx.strokeStyle="rgba(255,255,255,.45)";ctx.lineWidth=2;
 for(let x=45;x<w-45;x+=45){for(let y=18;y<h;y+=24){ctx.beginPath();ctx.moveTo(x-5,y);ctx.lineTo(x+5,y);ctx.stroke();}}
 // Yard labels
 ctx.fillStyle="rgba(255,255,255,.65)";ctx.font="bold 16px monospace";
 for(let x=90;x<w-60;x+=90){let yard=Math.round(x/w*100);ctx.fillText(String(yard),x-9,25);ctx.fillText(String(yard),x-9,h-12);}
 if(game.phase==="call"){drawSprite(120,220,"#ff9c55",true);ctx.fillStyle="#f4f2e9";ctx.font="bold 14px monospace";ctx.fillText("PICK RUN OR PASS",w/2-80, h/2-70);}
 else{
  game.receivers.forEach((r,i)=>{drawSprite(r.x,r.y,"#7bd8ff",false);ctx.fillStyle="#102033";ctx.fillRect(r.x-9,r.y-31,18,18);ctx.fillStyle="#fff";ctx.font="bold 12px monospace";ctx.fillText(String(i+1),r.x-4,r.y-18);});
  game.defenders.forEach(d=>drawSprite(d.x,d.y,d.color,false,true));
  drawSprite(game.player.x,game.player.y,"#ff9c55",true);
  if(game.ball){ctx.fillStyle="#9c542a";ctx.fillRect(game.ball.x-8,game.ball.y-4,16,8);ctx.strokeStyle="#f4d9a4";ctx.strokeRect(game.ball.x-8,game.ball.y-4,16,8);}
  if(game.phase==="pass"&&!game.ball){ctx.strokeStyle="rgba(199,243,107,.7)";ctx.setLineDash([7,7]);game.receivers.forEach(r=>{ctx.beginPath();ctx.moveTo(game.player.x,game.player.y);ctx.lineTo(r.x,r.y);ctx.stroke();});ctx.setLineDash([]);}
 }
}
function drawSprite(x,y,color,player=false,defender=false){
 x=clamp(x,10,890);y=clamp(y,10,430);ctx.save();ctx.translate(Math.round(x),Math.round(y));
 // shadow
 ctx.fillStyle="rgba(0,0,0,.23)";ctx.fillRect(-15,12,30,6);
 // legs
 ctx.fillStyle=defender?"#192b55":"#18283c";ctx.fillRect(-9,2,7,15);ctx.fillRect(3,2,7,15);
 ctx.fillStyle=color;ctx.fillRect(-12,-13,24,20);ctx.fillStyle="#f4f2e9";ctx.fillRect(-8,-9,16,4);
 ctx.fillStyle=defender?"#d7d9e0":"#d4e6e8";ctx.fillRect(-11,-27,22,15);
 ctx.fillStyle=color;ctx.fillRect(-13,-29,26,9);ctx.fillStyle="#152438";ctx.fillRect(-7,-23,15,4);
 ctx.fillStyle=color;ctx.fillRect(player?10:-17,-9,7,18);ctx.fillRect(player?-17:10,-9,7,18);
 if(player){ctx.fillStyle="#9c542a";ctx.fillRect(9,-25,12,7);ctx.fillStyle="#f4d9a4";ctx.fillRect(14,-25,2,7);}
 ctx.restore();
}
function clickField(e){
 if(!game||game.phase!=="pass"||game.ball)return;const rect=canvas.getBoundingClientRect();const x=(e.clientX-rect.left)/rect.width*canvas.width,y=(e.clientY-rect.top)/rect.height*canvas.height;
 let nearest=-1,dist=Infinity;game.receivers.forEach((r,i)=>{const d=Math.hypot(r.x-x,r.y-y);if(d<dist){dist=d;nearest=i;}});if(dist<75)throwBall(nearest);
}
$("quickBtn").addEventListener("click",()=>initGame("quick"));
$("seasonBtn").addEventListener("click",()=>{if(!save.season)startSeason();else{renderSeason();showScreen("seasonScreen");}});
$("backBtn").addEventListener("click",()=>{cancelAnimationFrame(raf);showScreen("homeScreen");refreshHome();});
$("seasonBackBtn").addEventListener("click",()=>{showScreen("homeScreen");refreshHome();});
$("runBtn").addEventListener("click",()=>startPlay("run"));$("passBtn").addEventListener("click",()=>startPlay("pass"));
$("throwBtn").addEventListener("click",()=>throwBall(1));$("sprintBtn").addEventListener("click",()=>move("sprint"));
document.querySelectorAll("[data-move]").forEach(b=>{b.addEventListener("pointerdown",e=>{e.preventDefault();move(b.dataset.move);});});
canvas.addEventListener("pointerdown",clickField);
$("continueBtn").addEventListener("click",()=>{cancelAnimationFrame(raf);if(game.mode==="season"){renderSeason();showScreen("seasonScreen");}else{showScreen("homeScreen");refreshHome();}});
$("playNextBtn").addEventListener("click",()=>{const s=save.season;if(s&&s.week<s.schedule.length)initGame("season",s.schedule[s.week].opponent);});
$("resetSeasonBtn").addEventListener("click",resetSeason);
$("soundBtn").addEventListener("click",()=>{soundOn=!soundOn;$("soundBtn").textContent=soundOn?"♪ SOUND ON":"♪ SOUND OFF";if(soundOn)beep();});
window.addEventListener("keydown",e=>{
 const k=e.key.toLowerCase();if(["arrowup","arrowdown","arrowleft","arrowright"," "].includes(k))e.preventDefault();
 if(k==="w"||k==="arrowup")move("up");if(k==="s"||k==="arrowdown")move("down");if(k==="a"||k==="arrowleft")move("left");if(k==="d"||k==="arrowright")move("right");
 if(k===" "){move("sprint");}if(k==="1")throwBall(0);if(k==="2")throwBall(1);if(k==="3")throwBall(2);
});
function refreshHome(){if(save.season){$("saveSummary").textContent=`SAVED FRANCHISE · ${TEAMS[save.season.team].name} · ${save.season.wins}–${save.season.losses} · WEEK ${Math.min(save.season.week+1,save.season.schedule.length)}`;}else $("saveSummary").textContent="No season in progress. Start one to build your franchise.";}
refreshHome();
})();