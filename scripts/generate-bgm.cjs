// Temporary original instrumental loops for in-game pacing and transition review.
// Requires ffmpeg on PATH; no network or third-party samples.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {execFileSync}=require('node:child_process');
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(ROOT,'public/assets/audio/bgm');
const SR=32000,TAU=Math.PI*2;
const tracks=[
 ['title','bgm_title_null_line',72,0],
 ['combat1','bgm_combat_01_collection',100,1],
 ['combat2','bgm_combat_02_sorting',112,2],
 ['combat3','bgm_combat_03_boundary',124,3],
 ['boss1','bgm_boss_01_lost_property',108,4],
 ['boss2','bgm_boss_02_closed_counter',116,5],
 ['boss3','bgm_boss_03_erasure',132,6],
];
fs.mkdirSync(OUT,{recursive:true});
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'null-line-bgm-'));
const report=[];
const hz=m=>440*2**((m-69)/12);
try {
for(const [id,file,bpm,style] of tracks){
 const beat=60/bpm,seconds=beat*64,n=Math.round(seconds*SR);
 const left=new Float64Array(n),right=new Float64Array(n);
 let seed=23177+style*1807;
 const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 function note(at,dur,midi,amp,timbre='bell',pan=0){
  const f=hz(midi),start=Math.round(at*SR),count=Math.round(dur*SR);
  for(let i=0;i<count;i++){
   const t=i/SR,u=i/count,p=TAU*f*t;
   let env,s;
   if(timbre==='pad') {env=Math.sin(Math.PI*u)**1.6;s=Math.sin(p)+.24*Math.sin(p*2)+.08*Math.sin(p*3);}
   else if(timbre==='bass'){env=Math.min(1,t/.008)*Math.exp(-5*u)*Math.min(1,(dur-t)/.035);s=Math.sin(p)+.28*Math.sin(p*2)+.1*Math.sin(p*3);}
   else {env=Math.min(1,t/.003)*Math.exp(-6*u)*Math.min(1,(dur-t)/.025);s=Math.sin(p+.12*Math.sin(p*2))+.13*Math.sin(p*2.76)*Math.exp(-12*u);}
   const j=(start+i)%n,v=s*env*amp;
   left[j]+=v*Math.sqrt((1-pan)/2);right[j]+=v*Math.sqrt((1+pan)/2);
  }
 }
 function drum(at,type,amp,pan=0){
  const dur=type==='kick'?.28:type==='snare'?.14:.05,count=Math.round(dur*SR),start=Math.round(at*SR);
  let phase=0,low=0;
  for(let i=0;i<count;i++){
   const t=i/SR,u=i/count,white=rand()*2-1;low+=.22*(white-low);
   phase+=TAU*(type==='kick'?48+85*Math.exp(-t*45):185)/SR;
   const noise=type==='hat'?(white-low)*.35:low;
   let s=type==='kick'?Math.sin(phase)+noise*.12:type==='snare'?noise*.8+Math.sin(phase)*.22:noise;
   s*=amp*Math.exp(-u*(type==='hat'?7:9))*Math.min(1,t/.0008)*Math.min(1,(dur-t)/.005);
   const j=(start+i)%n;left[j]+=s*Math.sqrt((1-pan)/2);right[j]+=s*Math.sqrt((1+pan)/2);
  }
 }
 // D minor -> Bb -> G minor -> A suspended: shared harmonic language, different rhythms.
 const roots=[38,34,31,33], thirds=[3,4,3,5];
 for(let bar=0;bar<16;bar++){
  const section=Math.floor(bar/4),root=roots[section],at=bar*4*beat;
  for(const [j,offset]of [0,thirds[section],7].entries())note(at,beat*5,root+12+offset,style===0?.065:.04,'pad',(j-1)*.38);
  const bassSteps=style===0?[0]:style===4?[0,2.5]:style>=3?[0,.75,1.5,2,2.75,3.5]:[0,1.5,2,3];
  bassSteps.forEach((step,i)=>note(at+step*beat,beat*.65,root+(i%3===2?12:0),style===0?.09:.15,'bass'));
  if(style!==0){
   const kicks=style===4?[0,2.5]:style===2||style===5?[0,1.75,2.5]:[0,2];
   kicks.forEach(step=>drum(at+step*beat,'kick',.25));
   (style===4?[2]:[1,3]).forEach(step=>drum(at+step*beat,'snare',.095));
   const div=style>=3?8:4;
   for(let k=0;k<div;k++)drum(at+k*4/div*beat,'hat',k%2?.045:.025,k%2?.23:-.23);
   if(style===5) {note(at+beat*.5,.12,68,.045,'bell',-.25);note(at+beat*2.75,.1,71,.04,'bell',.25);}
  }
  if(bar%2===0){
   const motif=style===4?[root+12,root+15,root+14]:[root+24,root+27,root+26];
   motif.forEach((m,i)=>note(at+(style===0?i*1.5:i*.75+.5)*beat,beat*(style===0?2.5:1.2),m,style===0?.105:.065,'bell',i===1?.25:-.16));
  }
  if(style===6&&bar%2===1)for(let k=0;k<4;k++)note(at+k*beat,beat*.45,root+12+[0,7,3,7][k],.065,'bass',.1);
 }
 // Circular stereo echoes preserve tails across the exact loop boundary.
 const dryL=left.slice(),dryR=right.slice();
 for(const [delay,gain] of [[.193,.14],[.347,.1],[.521,.065]]){
  const offset=Math.round(delay*SR);
  for(let i=0;i<n;i++){const j=(i+offset)%n;left[j]+=dryR[i]*gain;right[j]+=dryL[i]*gain;}
 }
 // Circular low-pass warmed up for one loop, then DC removal and shared level matching.
 for(const data of [left,right]){
  let v=0;const a=1-Math.exp(-TAU*4800/SR);
  for(let i=0;i<n;i++)v+=a*(data[i]-v);
  for(let i=0;i<n;i++){v+=a*(data[i]-v);data[i]=v;}
  const mean=data.reduce((a,b)=>a+b,0)/n;for(let i=0;i<n;i++)data[i]-=mean;
 }
 let peak=0,squares=0;
 for(let i=0;i<n;i++){peak=Math.max(peak,Math.abs(left[i]),Math.abs(right[i]));squares+=left[i]**2+right[i]**2;}
 const rms=Math.sqrt(squares/(2*n)),gain=Math.min(10**(-25/20)/rms,10**(-6/20)/peak);
 const b=Buffer.alloc(44+n*4);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);
 b.writeUInt16LE(1,20);b.writeUInt16LE(2,22);b.writeUInt32LE(SR,24);b.writeUInt32LE(SR*4,28);b.writeUInt16LE(4,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(n*4,40);
 for(let i=0;i<n;i++){b.writeInt16LE(Math.round(left[i]*gain*32767),44+i*4);b.writeInt16LE(Math.round(right[i]*gain*32767),46+i*4);}
 const wav=path.join(temp,file+'.wav'),ogg=path.join(OUT,file+'.ogg');fs.writeFileSync(wav,b);
 execFileSync('ffmpeg',['-nostdin','-v','error','-y','-i',wav,'-c:a','libvorbis','-q:a','5',ogg]);
 report.push({id,file:path.relative(ROOT,ogg).replaceAll('\\','/'),bpm,bars:16,seconds:n/SR,peakDbfs:20*Math.log10(peak*gain),rmsDbfs:20*Math.log10(rms*gain),boundaryDifference:Math.max(Math.abs(left[0]-left[n-1]),Math.abs(right[0]-right[n-1]))*gain});
}
fs.mkdirSync(path.join(ROOT,'docs/audio'),{recursive:true});
fs.writeFileSync(path.join(ROOT,'docs/audio/bgm-manifest.json'),JSON.stringify({purpose:'Temporary original procedural BGM for transition review',sourceScript:'scripts/generate-bgm.cjs',tracks:report},null,2)+'\n');
console.log(JSON.stringify({generated:report.length,tracks:report},null,2));
} finally {
 fs.rmSync(temp,{recursive:true,force:true});
}

