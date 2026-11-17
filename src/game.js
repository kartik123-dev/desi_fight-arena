
(() => {
"use strict";
const canvas = document.getElementById("arena");
const ctx = canvas.getContext("2d");
const W = canvas.width, H = canvas.height, FLOOR = 465;
const $ = id => document.getElementById(id);
const keys = new Set();
let running = false, mode = "cpu", soundOn = true, last = 0, timeLeft = 60;
let particles = [], shake = 0, roundEnded = false, audioCtx = null;

const fighterData = {
  volt: {name:"VOLT", color:"#24cbd0", trim:"#a7ffff", accent:"#ffb45d"},
  blaze:{name:"BLAZE", color:"#d94d3f", trim:"#ffc07d", accent:"#ffdf9a"}
};

function fighter(x, type, facing) {
  const d = fighterData[type];
  return {
    x,y:FLOOR,vx:0,vy:0,hp:100,energy:0,type,
    name:d.name,color:d.color,trim:d.trim,facing,
    onGround:true,blocking:false,action:"idle",
    actionTime:0,cooldown:0,flash:0,aiThink:0
  };
}

let p1, p2;

function beep(freq=180,dur=.06,type="square",vol=.035){
  if(!soundOn)return;
  try{
    audioCtx ||= new (window.AudioContext||window.webkitAudioContext)();
    const o=audioCtx.createOscillator(),g=audioCtx.createGain();
    o.type=type;o.frequency.value=freq;
    g.gain.value=vol;o.connect(g);g.connect(audioCtx.destination);
    o.start();
    g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+dur);
    o.stop(audioCtx.currentTime+dur);
  }catch(e){}
}

function say(text,ms=1100){
  const el=$("message");
  el.textContent=text;
  el.classList.add("show");
  clearTimeout(say.t);
  say.t=setTimeout(()=>el.classList.remove("show"),ms);
}

function start(){
  mode=$("modeSelect").value;
  const chosen=$("fighterSelect").value;
  p1=fighter(310,chosen,1);
  p2=fighter(690,chosen==="volt"?"blaze":"volt",-1);
  p2.name=mode==="cpu"?"CPU • "+p2.name:p2.name;
  timeLeft=60;
  roundEnded=false;
  particles=[];
  running=true;
  last=performance.now();

  $("name1").textContent=p1.name;
  $("name2").textContent=p2.name;
  $("menu").classList.add("hidden");
  $("game").classList.remove("hidden");
  $("status").textContent="FIGHT!";
  say("FIGHT!",800);
  beep(520,.12,"sawtooth");
  requestAnimationFrame(loop);
}

function attack(f,kind){
  if(!running||f.cooldown>0||roundEnded)return;

  if(kind==="special"&&f.energy<35){
    say("NOT ENOUGH ENERGY",600);
    return;
  }

  f.action=kind;
  f.actionTime=kind==="special"?.42:.22;
  f.cooldown=kind==="special"?.75:kind==="kick"?.48:.32;

  if(kind==="special"){
    f.energy-=35;
    beep(90,.22,"sawtooth",.06);
  }else{
    beep(kind==="kick"?120:220,.07);
  }

  const reach=kind==="special"?185:kind==="kick"?112:88;
  const damage=kind==="special"?22:kind==="kick"?12:8;
  const target=f===p1?p2:p1;
  const distance=Math.abs(target.x-f.x);

  if(distance<reach&&Math.abs(target.y-f.y)<105&&target.hp>0){
    const blocked=target.blocking&&target.facing===-f.facing;
    const dealt=blocked?Math.max(1,Math.floor(damage*.18)):damage;

    target.hp=Math.max(0,target.hp-dealt);
    target.energy=Math.min(100,target.energy+(blocked?4:10));
    f.energy=Math.min(100,f.energy+5);
    target.vx=blocked?f.facing*2.5:f.facing*(kind==="special"?10:6);
    target.vy=blocked?-2:-5;
    target.flash=.13;

    burst(target.x,target.y-65,kind==="special"?"#70efff":"#ffd18a",blocked?5:12);
    shake=kind==="special"?12:6;
    beep(blocked?330:kind==="special"?70:145,.12,"triangle",.05);

    if(target.hp<=0)finish(f);
  }else if(kind==="special"){
    for(let i=0;i<16;i++){
      particles.push({
        x:f.x+f.facing*45,y:f.y-75,
        vx:f.facing*(3+Math.random()*5),
        vy:(Math.random()-.5)*5,
        life:.45,color:"#64f4ff",r:4
      });
    }
  }
}

function burst(x,y,color,n){
  for(let i=0;i<n;i++){
    const a=Math.random()*Math.PI*2,s=1+Math.random()*5;
    particles.push({
      x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-1,
      life:.3+Math.random()*.3,color,r:2+Math.random()*3
    });
  }
}

function finish(winner){
  roundEnded=true;
  $("status").textContent="ROUND OVER";
  say(winner.name+" WINS!",2400);
  beep(440,.25,"triangle",.05);

  setTimeout(()=>{
    if(!running)return;
    $("status").textContent="REMATCH?";
    say("PRESS ENTER TO REMATCH",5000);
  },2500);
}

function controls(f,left,right,jump,block,punch,kick,special){
  f.blocking=keys.has(block);

  if(keys.has(left)){f.vx-=.75;f.facing=-1;}
  if(keys.has(right)){f.vx+=.75;f.facing=1;}

  if(keys.has(jump)&&f.onGround){
    f.vy=-13;
    f.onGround=false;
    beep(300,.04,"sine",.018);
  }

  if(keys.has(punch))attack(f,"punch");
  if(keys.has(kick))attack(f,"kick");
  if(keys.has(special))attack(f,"special");
}

function update(dt){
  if(roundEnded)return;

  timeLeft-=dt;
  if(timeLeft<=0){
    timeLeft=0;
    finish(p1.hp>=p2.hp?p1:p2);
    return;
  }

  controls(p1,"a","d","w","s","f","g","h");

  if(mode==="local"){
    controls(p2,"arrowleft","arrowright","arrowup","arrowdown","k","l",";");
  }else{
    p2.aiThink-=dt;

    if(p2.aiThink<=0){
      p2.aiThink=.12+Math.random()*.18;
      const dist=Math.abs(p1.x-p2.x);
      p2.facing=p1.x<p2.x?-1:1;

      if(dist>105){
        p2.vx+=p2.facing*1.1;
        p2.blocking=false;
      }else if(p1.action==="punch"||p1.action==="kick"){
        p2.blocking=Math.random()<.48;
      }else if(Math.random()<.45){
        attack(p2,Math.random()<.28&&p2.energy>=35?"special":Math.random()<.5?"kick":"punch");
      }

      if(Math.random()<.08&&p2.onGround){
        p2.vy=-12;
        p2.onGround=false;
      }
    }
  }

  for(const f of [p1,p2]){
    f.cooldown=Math.max(0,f.cooldown-dt);
    f.actionTime=Math.max(0,f.actionTime-dt);
    f.flash=Math.max(0,f.flash-dt);

    if(f.actionTime===0)f.action="idle";

    f.vy+=.65;
    f.x+=f.vx;
    f.y+=f.vy;
    f.vx*=.82;

    if(f.y>=FLOOR){
      f.y=FLOOR;
      f.vy=0;
      f.onGround=true;
    }

    f.x=Math.max(75,Math.min(W-75,f.x));

    if(f.energy<100)f.energy=Math.min(100,f.energy+dt*1.8);
  }

  if(Math.abs(p1.x-p2.x)<65&&Math.abs(p1.y-p2.y)<90){
    const mid=(p1.x+p2.x)/2;
    p1.x=mid-33;
    p2.x=mid+33;
  }

  particles=particles.filter(p=>p.life>0);
  for(const p of particles){
    p.x+=p.vx;
    p.y+=p.vy;
    p.vy+=.12;
    p.life-=dt;
  }

  shake=Math.max(0,shake-dt*30);
}

function drawBackground(){
  const g=ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,"#222b4a");
  g.addColorStop(.62,"#34314a");
  g.addColorStop(1,"#111725");
  ctx.fillStyle=g;
  ctx.fillRect(0,0,W,H);

  ctx.fillStyle="#ff9366";
  ctx.beginPath();
  ctx.arc(500,170,105,0,Math.PI*2);
  ctx.fill();

  ctx.globalAlpha=.22;
  ctx.fillStyle="#090e1b";

  for(let i=0;i<11;i++){
    let x=i*105-20,h=70+(i*37%115);
    ctx.fillRect(x,310-h,65,h);
  }

  ctx.globalAlpha=1;
  ctx.fillStyle="#171d2d";
  ctx.fillRect(0,FLOOR,W,H-FLOOR);

  ctx.strokeStyle="#65718b55";
  ctx.lineWidth=1;

  for(let x=-300;x<W+300;x+=55){
    ctx.beginPath();
    ctx.moveTo(500,FLOOR);
    ctx.lineTo(x,H);
    ctx.stroke();
  }

  for(let y=FLOOR+15;y<H;y+=25){
    ctx.beginPath();
    ctx.moveTo(0,y);
    ctx.lineTo(W,y);
    ctx.stroke();
  }

  ctx.fillStyle="#ff8d66";
  ctx.fillRect(0,FLOOR-4,W,4);
}

function drawFighter(f){
  ctx.save();
  ctx.translate(f.x,f.y);
  ctx.scale(f.facing,1);

  const c=f.color,trim=f.trim;
  const bob=f.onGround?Math.sin(performance.now()/110)*2:0;

  if(f.flash>0)ctx.globalAlpha=.55;

  ctx.globalAlpha=.25;
  ctx.fillStyle="#000";
  ctx.beginPath();
  ctx.ellipse(0,2,43,9,0,0,Math.PI*2);
  ctx.fill();
  ctx.globalAlpha=f.flash>0?.6:1;

  ctx.strokeStyle="#182338";
  ctx.lineWidth=17;
  ctx.lineCap="round";

  ctx.beginPath();
  ctx.moveTo(-12,-52+bob);
  ctx.lineTo(-19,-12);
  ctx.lineTo(-23,0);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(13,-52+bob);
  ctx.lineTo(22,-18);
  ctx.lineTo(28,0);
  ctx.stroke();

  ctx.strokeStyle=trim;
  ctx.lineWidth=5;
  ctx.beginPath();
  ctx.moveTo(-23,-3);
  ctx.lineTo(-8,-3);
  ctx.moveTo(21,-3);
  ctx.lineTo(36,-3);
  ctx.stroke();

  ctx.fillStyle=c;
  ctx.beginPath();
  ctx.moveTo(-25,-132+bob);
  ctx.lineTo(25,-132+bob);
  ctx.lineTo(31,-58);
  ctx.lineTo(-29,-58);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle=trim;
  ctx.lineWidth=5;
  ctx.beginPath();
  ctx.moveTo(-20,-120+bob);
  ctx.lineTo(20,-120+bob);
  ctx.stroke();

  ctx.fillStyle="#bd8b70";
  ctx.beginPath();
  ctx.arc(0,-151+bob,21,0,Math.PI*2);
  ctx.fill();

  ctx.fillStyle="#182338";
  ctx.fillRect(-21,-168+bob,42,10);

  ctx.fillStyle="#fff";
  ctx.fillRect(7,-155+bob,5,3);

  ctx.lineWidth=15;
  ctx.strokeStyle="#bd8b70";

  let armX=f.action==="punch"?58:f.action==="special"?75:34;
  let armY=f.action==="kick"?-105:-111;

  ctx.beginPath();
  ctx.moveTo(20,-119+bob);
  ctx.lineTo(armX,armY+bob);
  ctx.stroke();

  ctx.fillStyle=trim;
  ctx.beginPath();
  ctx.arc(armX,armY+bob,10,0,Math.PI*2);
  ctx.fill();

  ctx.strokeStyle="#bd8b70";
  ctx.lineWidth=14;
  ctx.beginPath();
  ctx.moveTo(-20,-117+bob);
  ctx.lineTo(-34,-88+bob);
  ctx.stroke();

  if(f.blocking){
    ctx.strokeStyle="#8cf7ff";
    ctx.lineWidth=5;
    ctx.beginPath();
    ctx.arc(0,-90,52,-1.8,-.1);
    ctx.stroke();
  }

  if(f.action==="special"){
    ctx.globalAlpha=.45;
    ctx.fillStyle="#6ef4ff";
    ctx.beginPath();
    ctx.arc(0,-90,75+Math.random()*8,0,Math.PI*2);
    ctx.fill();
  }

  ctx.restore();

  ctx.fillStyle="#fff";
  ctx.font="bold 12px Inter";
  ctx.textAlign="center";
  ctx.fillText(f.name,f.x,f.y-195);
}

function render(){
  ctx.save();

  if(shake>0){
    ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);
  }

  drawBackground();
  drawFighter(p1);
  drawFighter(p2);

  for(const p of particles){
    ctx.globalAlpha=Math.max(0,p.life*2);
    ctx.fillStyle=p.color;
    ctx.beginPath();
    ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
    ctx.fill();
  }

  ctx.globalAlpha=1;
  ctx.restore();

  $("health1").style.width=p1.hp+"%";
  $("health2").style.width=p2.hp+"%";
  $("energy1").style.width=p1.energy+"%";
  $("energy2").style.width=p2.energy+"%";
  $("timer").textContent=Math.ceil(timeLeft);
}

function loop(now){
  if(!running)return;
  const dt=Math.min(.033,(now-last)/1000||.016);
  last=now;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

window.addEventListener("keydown",e=>{
  const k=e.key.toLowerCase();

  if(["arrowleft","arrowright","arrowup","arrowdown"," "].includes(k)){
    e.preventDefault();
  }

  if(k==="enter"&&roundEnded){
    start();
    return;
  }

  keys.add(k);
});

window.addEventListener("keyup",e=>keys.delete(e.key.toLowerCase()));

$("startBtn").addEventListener("click",start);

$("backBtn").addEventListener("click",()=>{
  running=false;
  $("game").classList.add("hidden");
  $("menu").classList.remove("hidden");
});

$("soundBtn").addEventListener("click",()=>{
  soundOn=!soundOn;
  $("soundBtn").textContent="Sound: "+(soundOn?"ON":"OFF");
});

$("fullscreenBtn").addEventListener("click",()=>{
  if(!document.fullscreenElement)
    document.documentElement.requestFullscreen?.();
  else
    document.exitFullscreen?.();
});

document.querySelectorAll("[data-key]").forEach(btn=>{
  const key=btn.dataset.key;

  const down=e=>{
    e.preventDefault();
    keys.add(key);
  };

  const up=e=>{
    e.preventDefault();
    keys.delete(key);
  };

  btn.addEventListener("pointerdown",down);
  btn.addEventListener("pointerup",up);
  btn.addEventListener("pointercancel",up);
  btn.addEventListener("pointerleave",up);
});

})();
    
