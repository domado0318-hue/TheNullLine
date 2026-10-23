// Offline asset authoring only. No runtime/game settings are changed.
// node scripts/generate-sfx.cjs          generate deterministic PCM WAV assets
// node scripts/generate-sfx.cjs --check  validate existing files without writing
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'public/assets/audio');
const REVIEW = path.join(ROOT, 'docs/audio');
const SR = 48000;
const TAU = 2 * Math.PI;
// ID, basename, maximum authored duration (seconds), peak ceiling (dBFS).
const SPECS = [
  ['U01','ui_focus',.09,-15], ['U02','ui_confirm',.23,-10],
  ['U03','ui_page',.22,-15], ['U04','level_up',.95,-9],
  ['U05','xp_pickup',.13,-16], ['U06','player_hit',.24,-7],
  ['U07','shield_gain',.42,-11], ['U08','shield_hit',.18,-10],
  ['U09','shield_break',.32,-9], ['U10','heal',.48,-12],
  ['U11','magnet_collect',.58,-12], ['U12','charge_ready',.23,-13],
  ['W01','mechanic_cutter',.45,-10], ['W02','mechanic_strong',.36,-7],
  ['W03','signal_discharge',.25,-9], ['W04','signal_chain',.09,-15],
  ['W05','carrier_place',.22,-12], ['W06','carrier_arm',.09,-17],
  ['W07','carrier_blast',.49,-8], ['W08','carrier_blast_charged',.62,-7],
  ['A01','weld_spark',.23,-12], ['A02','pressure_pulse',.36,-10],
  ['A03','saw_throw',.36,-11], ['A04','heat_zone_start',.48,-15],
  ['A05','electric_pulse',.34,-11], ['A06','spark_shot',.18,-12],
  ['A07','beacon_start',.48,-13], ['A08','capacitor_blast',.39,-10],
  ['A09','scrap_scatter',.31,-12], ['A10','leak_start',.46,-15],
  ['A11','waste_shot',.24,-11],
  ['E01','enemy_hit_soft',.15,-13], ['E02','enemy_hit_metal',.17,-13],
  ['E03','enemy_guard',.22,-11], ['E04','enemy_defeat',.35,-13],
  ['E05','enemy_melee',.24,-13], ['E06','paper_shot',.14,-14],
  ['E07','ground_warning',.26,-8], ['E08','wet_impact',.41,-11],
  ['E09','charge_warning',.42,-8], ['E10','charge_release',.33,-10],
  ['E11','explosion_warning',.43,-8], ['E12','packet_burst',.33,-10],
  ['E13','summon_open',.59,-11], ['E14','hook_warning',.36,-8],
  ['E15','hook_release',.41,-10], ['E16','beam_warning',.52,-8],
  ['E17','beam_release',.47,-9], ['E18','enemy_shield',.47,-12],
  ['E19','boss_stamp',.52,-7], ['E20','boss_command',.62,-9],
  ['T01','wave_start',.44,-12], ['T02','boss_enter',1.3,-8],
  ['T03','boss_phase',.72,-9], ['T04','boss_defeat',1.6,-7],
  ['M09','cue_victory_still_alive',2.4,-10],
  ['M10','cue_defeat_record_closed',1.5,-10],
];

function seedOf(s) { return crypto.createHash('sha256').update(s).digest().readUInt32LE(0); }
function synth(spec) {
  const [id, name, duration, peakDb] = spec;
  const data = new Float64Array(Math.round(duration * SR));
  let seed = seedOf(name);
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  function layer(start, seconds, amplitude, source, options = {}) {
    const {attack = .001, decay = 5, swell = false, release = .014} = options;
    const count = Math.round(seconds * SR), offset = Math.round(start * SR);
    for (let i = 0; i < count && offset + i < data.length; i++) {
      const t = i / SR, u = i / Math.max(1, count - 1);
      const rise = Math.min(1, t / Math.max(1 / SR, attack));
      const fall = Math.min(1, Math.max(0, (seconds - t - 1 / SR) / release));
      const envelope = rise * fall * (swell ? .2 + .8 * Math.sin(Math.PI * u / 2) : Math.exp(-decay * u));
      data[offset + i] += amplitude * source(t, u) * envelope;
    }
  }
  function tone(start, seconds, f0, f1, amp, options = {}) {
    let phase = 0;
    const {fm = 0, ratio = 1.7, rough = 0} = options;
    layer(start, seconds, amp, (t,u) => {
      const f = f0 * (f1 / f0) ** u;
      phase += TAU * f / SR;
      return Math.sin(phase + fm * Math.exp(-2*u) * Math.sin(phase * ratio))
        + rough * (.45 * Math.sin(phase * 2.01) + .25 * Math.sin(phase * 3.02));
    }, options);
  }
  function noise(start, seconds, lo, hi, amp, options = {}) {
    let high = 0, low = 0, smooth = 0;
    const a = 1 - Math.exp(-TAU * hi / SR), b = 1 - Math.exp(-TAU * lo / SR);
    const {flutter = 0} = options;
    layer(start, seconds, amp, (t) => {
      high += a * (random() * 2 - 1 - high);
      low += b * (high - low);
      smooth += a * ((high-low) - smooth);
      return smooth * (flutter ? .62 + .38 * Math.sin(TAU * flutter * t) : 1);
    }, options);
  }
  function metal(start, seconds, base, amp) {
    [1,1.483,2.097,2.819,3.947].forEach((ratio,i) =>
      tone(start, seconds * (1-i*.1), base*ratio, base*ratio*.996, amp/(1+i*1.7), {decay:5+i, attack:.0008}));
    noise(start,.018,800,6400,amp*.5,{decay:8});
  }
  function thud(start, seconds, base, amp) {
    tone(start,seconds,base*1.5,base*.7,amp,{decay:7,rough:.15});
    noise(start,seconds*.5,80,1300,amp*.7,{decay:7});
  }
  function cloth(start, seconds, amp, count=8) {
    noise(start,seconds,270,3300,amp*.65,{decay:3,flutter:37});
    for(let i=0;i<count;i++) {
      const at = start + seconds * .72 * (i/count) ** 1.4;
      noise(at,.012+random()*.035,650+random()*400,4200,amp*(.3+random()*.6)*(1-i/count),{decay:5});
    }
  }
  function zap(start, seconds, base, amp) {
    tone(start,seconds,base*1.7,base*.45,amp,{fm:2.3,ratio:2.37,decay:5});
    noise(start,seconds*.8,650,5800,amp*.8,{decay:5,flutter:77});
    tone(start,seconds*.45,base*.3,base*.23,amp*.35,{decay:6});
  }
  function motor(start, seconds, base, amp, down = false) {
    tone(start,seconds,base,down ? base*.45 : base*1.35,amp,{fm:1.1,ratio:3.01,rough:.3,decay:1,attack:.008});
    noise(start,seconds,500,4200,amp*.9,{decay:1.6,attack:.01,flutter:83});
  }
  function chime(notes, gap, seconds, amp) {
    notes.forEach((f,i)=> {
      tone(i*gap,seconds,f,f,amp,{decay:5,attack:.003});
      tone(i*gap,seconds*.65,f*2.76,f*2.76,amp*.13,{decay:7});
    });
  }
  switch (id) {
    case 'U01': metal(0,.08,640,.5); thud(0,.045,190,.3); break;
    case 'U02': metal(0,.06,370,.6); tone(.025,.19,540,590,.5,{decay:5}); break;
    case 'U03': cloth(0,.18,.8,6); metal(.13,.07,410,.18); break;
    case 'U04': chime([440,554.37,659.25],.16,.62,.55); break;
    case 'U05': tone(0,.125,780,1050,.5,{fm:.25,decay:7}); metal(0,.035,460,.12); break;
    case 'U06': thud(0,.22,110,.9); cloth(0,.12,.6,4); break;
    case 'U07': tone(0,.4,170,380,.6,{fm:.5,decay:2,attack:.012}); tone(.03,.32,570,720,.15,{decay:4}); break;
    case 'U08': tone(0,.17,340,270,.7,{fm:1.4,decay:7}); noise(0,.04,700,3200,.3); break;
    case 'U09': zap(0,.19,680,.5); tone(.07,.23,310,100,.4,{fm:.6,decay:4}); break;
    case 'U10': metal(0,.08,360,.35); chime([330,440],.12,.32,.4); break;
    case 'U11': noise(0,.5,200,2800,.5,{swell:true,attack:.02,release:.16,flutter:16}); tone(0,.5,150,420,.4,{decay:1,attack:.02}); metal(.48,.08,510,.3); break;
    case 'U12': metal(0,.055,520,.25); tone(.015,.2,300,480,.5,{decay:4}); break;
    case 'W01': motor(0,.42,170,.65); noise(.09,.31,500,3700,.8,{attack:.06,decay:3,flutter:24}); break;
    case 'W02': metal(0,.33,210,.8); thud(0,.25,85,.8); noise(.005,.09,1400,6400,.4); break;
    case 'W03': zap(0,.24,800,.8); break;
    case 'W04': zap(0,.085,1150,.6); break;
    case 'W05': thud(0,.14,160,.7); metal(.008,.19,380,.4); metal(.08,.08,720,.2); break;
    case 'W06': metal(0,.08,680,.4); noise(0,.015,1200,6000,.25); break;
    case 'W07': thud(0,.37,77,.9); noise(0,.33,90,3600,1.2,{decay:6}); zap(.018,.17,470,.35); metal(.12,.27,530,.15); break;
    case 'W08': thud(0,.5,65,1); noise(0,.45,80,4200,1.2,{decay:5}); zap(.015,.26,650,.5); metal(.11,.45,310,.25); break;
    case 'A01': noise(0,.21,1100,6100,.9,{decay:5,flutter:110}); zap(0,.1,1000,.2); break;
    case 'A02': thud(0,.32,95,.8); noise(0,.34,130,2600,1,{decay:4,attack:.004}); break;
    case 'A03': motor(0,.33,290,.6,true); metal(0,.14,730,.25); break;
    case 'A04': noise(0,.46,1400,5500,.9,{decay:2.5,flutter:67}); cloth(.02,.32,.25,12); break;
    case 'A05': tone(0,.32,190,65,.7,{fm:1.6,decay:4}); noise(0,.2,500,3400,.45); break;
    case 'A06': zap(0,.17,1150,.6); break;
    case 'A07': metal(0,.08,460,.35); tone(.02,.44,145,210,.5,{fm:1,decay:2}); noise(.02,.35,250,1600,.25); break;
    case 'A08': zap(0,.23,510,.6); thud(0,.36,90,.8); noise(0,.29,180,3200,.7); break;
    case 'A09': cloth(0,.28,.7,10); [0,.025,.06,.095,.15].forEach((t,i)=>metal(t,.13,550+i*83,.25/(1+i*.4))); break;
    case 'A10': noise(0,.42,120,2100,.65,{decay:3}); [0,.03,.08,.14,.23].forEach((t,i)=>tone(t,.1,430+i*68,130+i*30,.25,{fm:.4,decay:5})); break;
    case 'A11': thud(0,.19,130,.7); noise(0,.12,400,3300,.6); metal(.02,.19,550,.2); break;
    case 'E01': cloth(0,.14,.8,5); thud(0,.1,190,.35); break;
    case 'E02': metal(0,.16,480,.7); thud(0,.08,150,.3); break;
    case 'E03': metal(0,.21,290,.7); metal(.004,.12,610,.2); break;
    case 'E04': cloth(0,.33,.9,13); thud(.005,.16,130,.4); metal(.11,.18,580,.13); break;
    case 'E05': noise(0,.22,500,3700,.8,{attack:.015,decay:3,flutter:19}); cloth(.04,.16,.35,4); break;
    case 'E06': cloth(0,.13,.8,3); metal(0,.035,920,.15); break;
    case 'E07': tone(0,.25,610,580,.7,{fm:.28,decay:4}); tone(0,.19,305,290,.3,{decay:5}); break;
    case 'E08': thud(0,.24,90,.65); noise(0,.38,180,2900,.8,{decay:4}); [0,.04,.1,.18].forEach((t,i)=>tone(t,.13,380+i*50,120+i*20,.2,{decay:6})); break;
    case 'E09': tone(0,.4,145,290,.55,{fm:.7,swell:true,release:.06}); noise(0,.39,350,2600,.7,{swell:true,flutter:28,release:.07}); metal(0,.07,440,.25); break;
    case 'E10': thud(0,.2,120,.45); noise(0,.31,180,2600,.9,{decay:3}); cloth(.015,.22,.5,4); break;
    case 'E11': cloth(0,.39,.7,9); noise(0,.41,900,4900,.7,{swell:true,flutter:9,release:.08}); tone(0,.4,220,390,.2,{swell:true,release:.08}); break;
    case 'E12': noise(0,.17,250,5800,1.1,{decay:6}); thud(0,.22,140,.6); cloth(.025,.29,.6,12); break;
    case 'E13': cloth(0,.43,.65,9); metal(.09,.2,280,.25); tone(.1,.46,140,110,.35,{fm:.6,decay:4}); break;
    case 'E14': metal(0,.3,380,.45); [0,.05,.1,.145,.185,.22,.25].forEach((t,i)=>metal(t,.06,460+i*25,.28)); noise(0,.34,600,3200,.35,{swell:true,release:.07}); break;
    case 'E15': metal(0,.16,620,.55); noise(.01,.37,550,3300,.65,{decay:2.5,flutter:44}); tone(0,.3,280,150,.2,{fm:.5,decay:3}); break;
    case 'E16': metal(0,.07,440,.3); tone(0,.5,240,720,.5,{fm:1.7,ratio:2.01,swell:true,release:.07}); noise(0,.49,750,3700,.4,{swell:true,flutter:50,release:.08}); break;
    case 'E17': motor(0,.43,230,.6,true); noise(0,.44,900,5400,.7,{decay:2,flutter:61}); metal(0,.12,650,.35); break;
    case 'E18': cloth(0,.18,.5,5); metal(0,.38,420,.35); tone(0,.45,260,290,.3,{fm:1,decay:2}); break;
    case 'E19': thud(0,.47,62,.9); metal(0,.46,175,.7); noise(0,.2,200,2700,.7,{decay:7}); break;
    case 'E20': metal(0,.12,340,.55); metal(.12,.12,410,.5); tone(.22,.38,155,145,.5,{fm:.5,decay:4}); break;
    case 'T01': metal(0,.09,490,.4); metal(.09,.09,590,.3); tone(.12,.29,220,260,.3,{decay:4}); break;
    case 'T02': metal(0,.7,120,.6); thud(0,.65,64,.7); tone(0,1.25,85,62,.45,{fm:.4,decay:3}); tone(.07,1.15,127,116,.18,{decay:3}); noise(0,.8,100,1200,.4,{decay:4}); break;
    case 'T03': metal(0,.3,200,.45); motor(.02,.63,95,.5); tone(0,.65,120,190,.3,{decay:2}); break;
    case 'T04': thud(0,.7,55,.8); metal(0,.85,160,.6); cloth(.02,.85,.6,18); [.08,.2,.36,.56,.8].forEach((t,i)=>metal(t,.35,240+i*97,.25/(1+i*.3))); motor(.1,1.35,100,.2,true); break;
    case 'M09': chime([293.665,349.228,440],.27,1.65,.5); tone(0,2.35,146.832,146.832,.18,{decay:3,attack:.018}); tone(.53,1.8,220,220,.13,{decay:3,attack:.018}); break;
    case 'M10': metal(0,.1,260,.3); chime([220,174.614,146.832],.24,.95,.45); tone(0,1.45,82,65,.22,{decay:3}); break;
    default: throw new Error(`Missing recipe: ${id}`);
  }
  // DC blocking + very gentle saturation, then safety fades and explicit headroom.
  let previous = 0, dc = 0, max = 0;
  for (let i=0;i<data.length;i++) {
    const input = Math.tanh(data[i] * 1.1) / 1.1;
    dc = input - previous + .996 * dc;
    previous = input;
    const fadeIn = Math.min(1, i / (SR*.0007));
    const fadeOut = Math.min(1, (data.length-1-i) / (SR*.008));
    data[i] = dc * fadeIn * fadeOut;
    max = Math.max(max,Math.abs(data[i]));
  }
  assert(max > 0);
  const gain = 10 ** (peakDb/20) / max;
  for(let i=0;i<data.length;i++) data[i] *= gain;
  // Remove inaudible padding instead of delivering long empty tails.
  let last=data.length-1;
  while(last>0 && Math.abs(data[last])<.001) last--;
  const end=Math.min(data.length,last+Math.round(.02*SR)+1);
  const trimmed=data.slice(0,end);
  for(let i=Math.max(0,end-Math.round(.005*SR));i<end;i++) trimmed[i]*=(end-1-i)/(.005*SR);
  return trimmed;
}

function wav(data) {
  const b = Buffer.alloc(44 + data.length*2);
  b.write('RIFF'); b.writeUInt32LE(b.length-8,4); b.write('WAVEfmt ',8);
  b.writeUInt32LE(16,16); b.writeUInt16LE(1,20); b.writeUInt16LE(1,22);
  b.writeUInt32LE(SR,24); b.writeUInt32LE(SR*2,28); b.writeUInt16LE(2,32);
  b.writeUInt16LE(16,34); b.write('data',36); b.writeUInt32LE(data.length*2,40);
  data.forEach((x,i)=> { assert(Number.isFinite(x) && Math.abs(x)<1); b.writeInt16LE(Math.round(x*32767),44+i*2); });
  return b;
}
function filename(spec) { return path.join(OUT,spec[0].startsWith('M')?'cues':'sfx',spec[1]+'.wav'); }
function inspect(spec,b) {
  assert.equal(b.toString('ascii',0,4),'RIFF'); assert.equal(b.toString('ascii',8,12),'WAVE');
  assert.equal(b.readUInt16LE(20),1); assert.equal(b.readUInt16LE(22),1);
  assert.equal(b.readUInt32LE(24),SR); assert.equal(b.readUInt16LE(34),16);
  assert(b.length<=44+Math.round(spec[2]*SR)*2 && b.length>44+Math.round(spec[2]*SR*.4)*2,`${spec[0]} duration`);
  assert.equal(b.readUInt32LE(4),b.length-8); assert.equal(b.readUInt32LE(40),b.length-44);
  const n=(b.length-44)/2; let peak=0, squares=0, sum=0, first=-1, last=-1;
  for(let i=0;i<n;i++) {
    const x=b.readInt16LE(44+i*2)/32767;
    peak=Math.max(peak,Math.abs(x)); squares+=x*x; sum+=x;
    if(Math.abs(x)>.001) { if(first<0) first=i; last=i; }
  }
  const rms=Math.sqrt(squares/n), peakDb=20*Math.log10(peak);
  assert(peakDb<=spec[3]+.01 && peakDb>=spec[3]-.01, `${spec[0]} peak`);
  assert(rms>.001 && Math.abs(sum/n)<.003,`${spec[0]} RMS/DC`);
  assert(first>=0 && first/SR<.015,`${spec[0]} leading silence`);
  assert((n-1-last)/SR<.1,`${spec[0]} trailing silence`);
  assert.equal(b.readInt16LE(44),0); assert.equal(b.readInt16LE(b.length-2),0);
  return {id:spec[0],file:path.relative(ROOT,filename(spec)).replaceAll('\\','/'),seconds:n/SR,
    peakDbfs:+peakDb.toFixed(2),rmsDbfs:+(20*Math.log10(rms)).toFixed(2),
    leadingSilenceMs:+(first/SR*1000).toFixed(2),trailingSilenceMs:+((n-1-last)/SR*1000).toFixed(2),
    sha256:crypto.createHash('sha256').update(b).digest('hex')};
}
const check=process.argv.includes('--check');
assert.equal(SPECS.filter(s=>!s[0].startsWith('M')).length,55);
assert.equal(new Set(SPECS.map(s=>s[0])).size,SPECS.length);
const document=fs.readFileSync(path.join(ROOT,'docs/BGM 구성.md'),'utf8');
const documented=[...document.matchAll(/^\| ([UWAET]\d\d) `([^`]+)`/gm)].map(m=>[m[1],m[2]]);
assert.deepEqual(documented,SPECS.filter(s=>!s[0].startsWith('M')).map(s=>s.slice(0,2)), 'Document/SFX inventory mismatch');
if(!check) { fs.mkdirSync(path.join(OUT,'sfx'),{recursive:true}); fs.mkdirSync(path.join(OUT,'cues'),{recursive:true}); fs.mkdirSync(REVIEW,{recursive:true}); }
const report=[];
for(const spec of SPECS) {
  const expected=wav(synth(spec));
  if(check) assert(fs.readFileSync(filename(spec)).equals(expected),`${spec[0]} reproducibility`);
  else fs.writeFileSync(filename(spec),expected);
  report.push(inspect(spec,fs.readFileSync(filename(spec))));
}
assert.equal(new Set(report.map(r=>r.sha256)).size,57,'Duplicate audio');
if(!check) {
  fs.writeFileSync(path.join(REVIEW,'sfx-manifest.json'),JSON.stringify({sampleRate:SR,channels:1,bits:16,method:'Original procedural synthesis; no external recordings',listeningStatus:'Not auditioned in game',assets:report},null,2)+'\n');

}
console.log(JSON.stringify({mode:check?'verified':'generated',sfx:55,cues:2,sampleRate:SR,
  durationRangeSeconds:[Math.min(...report.map(r=>r.seconds)),Math.max(...report.map(r=>r.seconds))],
  checks:['PCM headers','duration','headroom','non-silent','DC offset','onset/tail','zero endpoints','unique audio','document inventory',...(check?['deterministic reproduction']:[])],
  totalBytes:report.reduce((sum,r)=>sum+fs.statSync(path.join(ROOT,r.file)).size,0)},null,2));
