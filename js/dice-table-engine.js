
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.181.0/build/three.module.js';
import RAPIER from 'https://esm.sh/@dimforge/rapier3d-compat@0.17.3';
import {preset,TRIGRAMS,setIChingColors,ICHING_INKS} from './dice-presets.js?v=0725';

const diceDOM={
 getElementById(id){return window.document.getElementById('dice-'+id)},
 querySelectorAll(selector){return window.document.querySelectorAll(selector.replace(/#([\w-]+)/g,(_,id)=>'#dice-'+id))}
};
const felt=diceDOM.getElementById('felt');
const button=diceDOM.getElementById('roll');
const collectButton=diceDOM.getElementById('collect');
const mixButton=diceDOM.getElementById('mix');
const status=diceDOM.getElementById('status');
const values=diceDOM.getElementById('values');
const total=diceDOM.getElementById('total');
const failure=diceDOM.getElementById('failure');
const forceSlider=diceDOM.getElementById('force');
const forceValue=diceDOM.getElementById('forceValue');
// A continuous, slightly progressive curve: low values allow precision,
// while the far end has substantially greater launch and spin energy.
function forceMultiplier(value){return .43+3.27*Math.pow(value/100,1.34)}
function currentForce(){return forceMultiplier(Number(forceSlider.value))}
function updateForceLabel(){
 const value=Number(forceSlider.value);
 forceValue.textContent=value+' / 100';
 forceSlider.style.background='linear-gradient(90deg,#cdb17b '+value+'%,#41594c '+value+'%)';
}
forceSlider.addEventListener('input',updateForceLabel);
forceSlider.addEventListener('change',()=>emitDice());
updateForceLabel();
let world,scene,camera,renderer,ground,objects=[],rolling=false,frame=0;
let width=10,depth=6.6,lastTime=0,accumulator=0,rollTime=0,stableTime=0,ready=false,held=false,mixing=false,mixCount=0,mixTime=0;
const DICE_SIZE=1.05,HALF=DICE_SIZE/2,FIXED_STEP=1/60;
const up=new THREE.Vector3(0,1,0);
const faceNormals=[
 new THREE.Vector3(1,0,0),new THREE.Vector3(-1,0,0),
 new THREE.Vector3(0,1,0),new THREE.Vector3(0,-1,0),
 new THREE.Vector3(0,0,1),new THREE.Vector3(0,0,-1)
];
const faceValues=[3,4,1,6,2,5]; // Three.js box material ordering: +X -X +Y -Y +Z -Z
const pipGrid={
 1:[[0,0]],2:[[-1,-1],[1,1]],3:[[-1,-1],[0,0],[1,1]],
 4:[[-1,-1],[-1,1],[1,-1],[1,1]],
 5:[[-1,-1],[-1,1],[0,0],[1,-1],[1,1]],
 6:[[-1,-1],[-1,0],[-1,1],[1,-1],[1,0],[1,1]]
};
// Eight trigrams in the conventional numerical ordering:
 // 1 Qian, 2 Dui, 3 Li, 4 Zhen, 5 Xun, 6 Kan, 7 Gen, 8 Kun.
const trigramNames=TRIGRAMS;
let current=preset('normal');
let diceSettings=current.dice;
let ichingColorScheme='blackUpper';
let astroDiceColors=null; // Preserve colors during mode switching.
// King Wen numbers indexed [upper trigram][lower trigram] in order
// 乾、兌、離、震、巽、坎、艮、坤.
const kingWen=[
 [1,10,13,25,44,6,33,12],
 [43,58,49,17,28,47,31,45],
 [14,38,30,21,50,64,56,35],
 [34,54,55,51,32,40,62,16],
 [9,61,37,42,57,59,53,20],
 [5,60,63,3,48,29,39,8],
 [26,41,22,27,18,4,52,23],
 [11,19,36,24,46,7,15,2]
];
const bottomToTopTrigrams=[
 [1,1,1],[1,1,0],[1,0,1],[1,0,0],
 [0,1,1],[0,1,0],[0,0,1],[0,0,0]
];
function trigramIndex(lines){
 return bottomToTopTrigrams.findIndex(t=>t.every((v,i)=>v===lines[i]));
}
function hexagramSummary(upper,lower,line){
 const lines=[...bottomToTopTrigrams[lower-1],...bottomToTopTrigrams[upper-1]];
 const changed=lines.slice();changed[line-1]=1-changed[line-1];
 const nextLower=trigramIndex(changed.slice(0,3));
 const nextUpper=trigramIndex(changed.slice(3,6));
 return {primary:kingWen[upper-1][lower-1],changed:kingWen[nextUpper][nextLower],nextUpper,nextLower};
}
// Results are separate, colour-linked tiles instead of a string of
// numeric die indices. The D-label denotes the number of faces, and the
// large numeral is the outcome. Duplicate die types remain distinguishable
// by order and their corresponding coloured dots.
let recordedResults=null;
function showResults(results=null){
 recordedResults=Array.isArray(results)?results.slice():null;
 values.replaceChildren();
 const symbolic=current.result!=='sum';
 diceDOM.getElementById('result-tiles').classList.toggle('astro-results',symbolic);
 diceSettings.forEach((d,i)=>{
  const tile=document.createElement('div');tile.className='result-die';
  const kind=document.createElement('span');kind.className='result-kind';
  const dot=document.createElement('span');dot.className='result-swatch';dot.style.background=d.ink||d.color;
  const label=document.createElement('span');label.textContent=d.label;kind.append(dot,label);
  const symbol=document.createElement('span');symbol.className='result-number';
  const face=results?d.faces?.[results[i]-1]:null;
  symbol.textContent=results?(face?.glyph===undefined?String(results[i]):current.id==='astro'&&i===1?face.glyph+'\uFE0E':face.glyph):'—';
  tile.append(kind,symbol);
  if(symbolic){const desc=document.createElement('span');desc.className='astro-name';desc.textContent=face?.name||'未投擲';tile.append(desc);}
  values.append(tile);
 });
 total.hidden=symbolic;
 if(!symbolic){total.replaceChildren();const t=document.createElement('span');t.textContent='合計';const sum=document.createElement('strong');sum.textContent=results?String(results.reduce((a,b)=>a+b,0)):'—';total.append(t,sum);}
 const reading=diceDOM.getElementById('hexagram-reading');reading.hidden=current.result!=='hexagram';
 if(current.result==='hexagram'&&results){
  const h=hexagramSummary(...results);
  reading.textContent='本卦 '+String.fromCodePoint(0x4dc0+h.primary-1)+' 第'+h.primary+'卦（'+trigramNames[results[0]-1]+'上'+trigramNames[results[1]-1]+'下） · '+diceSettings[2].faces[results[2]-1].name+' → 之卦 '+String.fromCodePoint(0x4dc0+h.changed-1)+' 第'+h.changed+'卦';
 }else reading.textContent='本卦 —　·　動爻 —　·　之卦 —';
}
function lockSettings(locked){diceDOM.getElementById('preset').disabled=locked;if(!locked&&current.id==='normal'){diceDOM.getElementById('iching-color-scheme').disabled=false;renderSettings();return;}diceDOM.getElementById('iching-color-scheme').disabled=locked;
 diceDOM.querySelectorAll('#astro-colors input').forEach(input=>input.disabled=locked);
 diceDOM.querySelectorAll('#dice-settings input,#dice-settings select,#dice-settings button').forEach(el=>el.disabled=locked);}
const NORMAL_DICE_MAX=8;
function rebuildNormalDice(){
 if(!ready)return;
 objects.forEach(destroyDie);objects=[];
 createDice();syncMeshes();showResults();
 held=false;mixing=false;mixCount=0;
 collectButton.disabled=false;mixButton.disabled=true;button.disabled=true;
 status.textContent='READY TO COLLECT';
}
function renderSettings(){
 const host=diceDOM.getElementById('dice-settings');host.replaceChildren();
 const panel=diceDOM.getElementById('normal-dice-panel');panel.hidden=current.id!=='normal';
 host.hidden=current.id!=='normal';if(host.hidden)return;
 const toolbar=document.createElement('div');toolbar.className='dice-config-toolbar';
 const count=document.createElement('span');count.textContent='使用数：'+diceSettings.length+'個';
 const add=document.createElement('button');add.type='button';add.textContent='＋ ダイスを追加';
 add.disabled=diceSettings.length>=NORMAL_DICE_MAX;
 add.addEventListener('click',()=>{
  if(!ready||rolling||mixing||diceSettings.length>=NORMAL_DICE_MAX)return;
  diceSettings.push({sides:6,color:'#c7b48d',surface:'ring',markings:'number',label:'D6'});
  rebuildNormalDice();renderSettings();emitDice();
 });
 toolbar.append(count,add);host.append(toolbar);
 diceSettings.forEach((d,i)=>{
  const row=document.createElement('div');row.className='die-setting';
  const label=document.createElement('label');label.textContent='ダイス'+(i+1);
  const sides=document.createElement('select');sides.setAttribute('aria-label','ダイス'+(i+1)+'の面数');
  for(const n of [6,8,10,12,20])sides.add(new Option('D'+n,String(n)));sides.value=String(d.sides);
  const material=document.createElement('select');material.className='material';material.setAttribute('aria-label','ダイス'+(i+1)+'の仕上げ');
  for(const [key,name] of [['standard','標準'],['ivory','象牙'],['ring','環状刻印']])material.add(new Option(name,key));material.value=d.surface;
  const color=document.createElement('input');color.type='color';color.value=d.color;color.setAttribute('aria-label','ダイス'+(i+1)+'の色');
  const remove=document.createElement('button');remove.type='button';remove.className='dice-remove';remove.textContent='×';remove.setAttribute('aria-label','ダイス'+(i+1)+'を削除');remove.disabled=diceSettings.length===1;
  function refresh(){
   for(const option of material.options)option.disabled=Number(sides.value)!==6&&option.value==='ivory';
   if(material.selectedOptions[0]?.disabled)material.value='standard';
  }
  function update(){
   if(!ready||rolling||mixing)return;
   d.sides=Number(sides.value);d.surface=material.value;d.color=color.value;d.label='D'+d.sides;
   const visible=!held;destroyDie(objects[i]);objects[i]=makeDie(i);objects[i].mesh.visible=visible;
   syncMeshes();showResults();
  }
  sides.addEventListener('change',()=>{refresh();update();});
  material.addEventListener('change',()=>{const defaults={ivory:'#ead9ae',ring:'#c7b48d'};if(defaults[material.value])color.value=defaults[material.value];update();});
  color.addEventListener('change',update);
  remove.addEventListener('click',()=>{
   if(!ready||rolling||mixing||diceSettings.length===1)return;
   diceSettings.splice(i,1);rebuildNormalDice();renderSettings();
  });
  refresh();row.append(label,sides,material,color,remove);host.append(row);
 });
}
function renderAstroColors(){
 const host=diceDOM.getElementById('astro-colors');host.replaceChildren();
 diceDOM.getElementById('astro-dice-panel').hidden=current.id!=='astro';
 host.hidden=current.id!=='astro';if(host.hidden)return;
 const heading=document.createElement('span');heading.textContent='ダイスの色';heading.className='astro-colors-heading';host.append(heading);
 diceSettings.forEach((die,i)=>{
  const label=document.createElement('label');label.className='astro-color-control';
  const text=document.createElement('span');text.textContent=die.label;
  const input=document.createElement('input');input.type='color';input.value=die.color;
  input.setAttribute('aria-label',die.label+'の色');
  input.addEventListener('input',()=>{
   if(!ready||rolling||mixing)return;
   const color=input.value;
   if(die.color===color)return;
   die.color=color;astroDiceColors=diceSettings.map(d=>d.color);
   const wasVisible=objects[i].mesh.visible;
   destroyDie(objects[i]);objects[i]=makeDie(i);objects[i].mesh.visible=wasVisible;
   syncMeshes();showResults();
   status.textContent=held?'IN HAND — 色を変更しました':'READY TO COLLECT';emitDice();
  });
  label.append(text,input);host.append(label);
 });
}
function updateIChingColors(scheme){
 if(current.id!=='iching'||!ready||rolling||mixing)return;
 setIChingColors(diceSettings,scheme);ichingColorScheme=scheme;
 for(let i=0;i<2;i++){
  const visible=objects[i].mesh.visible;
  destroyDie(objects[i]);objects[i]=makeDie(i);objects[i].mesh.visible=visible;
 }
 syncMeshes();showResults();
 status.textContent=held?'IN HAND — 配色を変更しました':'READY TO COLLECT';emitDice();
}
function switchPreset(id){
 if(!ready||rolling||mixing){diceDOM.getElementById('preset').value=current.id;return;}
 objects.forEach(destroyDie);objects=[];current=preset(id);diceSettings=current.dice;
 if(id==='iching')setIChingColors(diceSettings,ichingColorScheme);
 if(id==='astro'){
  if(astroDiceColors)diceSettings.forEach((d,i)=>{d.color=astroDiceColors[i]});
  else astroDiceColors=diceSettings.map(d=>d.color);
 }
 const colorSettings=diceDOM.getElementById('iching-colors');colorSettings.hidden=id!=='iching';
 diceDOM.getElementById('iching-dice-panel').hidden=id!=='iching';
 diceDOM.getElementById('iching-color-scheme').value=ichingColorScheme;
 held=false;mixing=false;mixCount=0;
 diceDOM.getElementById('title').textContent=current.title;
 diceDOM.getElementById('subtitle').textContent=current.subtitle;
 diceDOM.getElementById('description').textContent=current.description;
 diceDOM.getElementById('table-corner-top').textContent='TABULA · '+(id==='normal'?'DICE':id==='astro'?'ASTRO':'I CHING');
 diceDOM.getElementById('table-corner-bottom').textContent=id==='normal'?'RIGID BODY EXPERIMENT':id==='astro'?'ASTROLOGICAL DICE':'THE BOOK OF CHANGES';
 renderSettings();renderAstroColors();createDice();syncMeshes();showResults();
 collectButton.disabled=false;mixButton.disabled=true;button.disabled=true;status.textContent='READY TO COLLECT';
}
let pendingParentMode=null;

function captureDice(){
 if(!ready)return null;
 return {schema:1,mode:current.id,
  settings:diceSettings.map(d=>({sides:d.sides,color:d.color,surface:d.surface,label:d.label})),
  scheme:ichingColorScheme,colors:astroDiceColors?.slice()||null,
  poses:objects.map(({body,mesh})=>{const p=body.translation(),q=body.rotation();return {
   p:{x:p.x,y:p.y,z:p.z},q:{x:q.x,y:q.y,z:q.z,w:q.w},visible:mesh.visible
  }}),held,results:recordedResults?.slice()||null,force:Number(forceSlider.value)};
}
let pendingRestore=null;
function restoreDice(saved,id){
 if(!ready){pendingRestore={saved,id};return}
 if(rolling||mixing)return;
 const valid=saved&&saved.schema===1&&saved.mode===id&&Array.isArray(saved.settings);
 switchPreset(id);
 if(valid){
  if(id==='normal'&&saved.settings.length>=1&&saved.settings.length<=8){
   diceSettings=saved.settings.map(d=>({sides:[6,8,10,12,20].includes(d.sides)?d.sides:6,
    color:/^#[0-9a-f]{6}$/i.test(d.color)?d.color:'#c7b48d',
    surface:['standard','ring','ivory'].includes(d.surface)?d.surface:'standard',
    markings:'number',label:'D'+d.sides}));
  }
  if(id==='astro'&&Array.isArray(saved.colors)&&saved.colors.length===3){
   astroDiceColors=saved.colors.slice();diceSettings.forEach((d,i)=>{if(/^#[0-9a-f]{6}$/i.test(astroDiceColors[i]))d.color=astroDiceColors[i]});
  }
  if(id==='iching'&&['blackUpper','redUpper'].includes(saved.scheme)){
   ichingColorScheme=saved.scheme;setIChingColors(diceSettings,ichingColorScheme);
   diceDOM.getElementById('iching-color-scheme').value=ichingColorScheme;
  }
  objects.forEach(destroyDie);objects=[];createDice();
  if(Array.isArray(saved.poses)&&saved.poses.length===objects.length){
   objects.forEach(({body,mesh},i)=>{
    const {p,q,visible}=saved.poses[i]||{};
    if(p&&q&&[p.x,p.y,p.z,q.x,q.y,q.z,q.w].every(Number.isFinite)){
     body.setTranslation(p,true);body.setRotation(q,true);
     body.setLinvel({x:0,y:0,z:0},true);body.setAngvel({x:0,y:0,z:0},true);
    }
    mesh.visible=visible!==false;
   });
  }
  held=!!saved.held;rolling=false;mixing=false;
  if(held)objects.forEach(({mesh})=>mesh.visible=false);
  collectButton.disabled=held;mixButton.disabled=!held;button.disabled=!held;
  forceSlider.value=String(Number.isFinite(saved.force)?Math.max(0,Math.min(100,saved.force)):30);
  updateForceLabel();
  showResults(Array.isArray(saved.results)&&saved.results.length===objects.length?saved.results:null);
  status.textContent=held?'IN HAND — 投げる準備ができました':'READY TO COLLECT';
  renderSettings();renderAstroColors();
 }else{
  recordedResults=null;held=false;rolling=false;mixing=false;
  collectButton.disabled=false;mixButton.disabled=true;button.disabled=true;
 }
 syncMeshes();updateDimensions();
}
function emitDice(){const v=captureDice();if(v)window.TabulaTableTools?.saveDice(v)}

window.TabulaDiceTable={
 snapshot:captureDice,
 restore:restoreDice,
 reset(id){restoreDice(null,id)},
 busy(){return rolling||mixing},
 setMode(id){
  if(!['normal','astro','iching'].includes(id))return;
  pendingParentMode=id;
  if(ready&&!rolling&&!mixing&&current.id!==id){
   diceDOM.getElementById('preset').value=id;
   switchPreset(id);
  }
 },
 resize(){if(renderer&&felt.clientWidth>0&&felt.clientHeight>0)updateDimensions()},
 getMode(){return current.id}
};
window.addEventListener('message',event=>{
 if(event.source!==window.parent||event.origin!==location.origin)return;
 if(event.data?.type!=='tabula:dice:mode')return;
 const id=event.data.mode;if(!['normal','astro','iching'].includes(id))return;
 pendingParentMode=id;
 if(ready&&!rolling&&!mixing&&current.id!==id){diceDOM.getElementById('preset').value=id;switchPreset(id)}
});
diceDOM.getElementById('preset').addEventListener('change',e=>switchPreset(e.target.value));
diceDOM.getElementById('iching-color-scheme').addEventListener('change',event=>updateIChingColors(event.target.value));
renderSettings();renderAstroColors();showResults();
function faceTexture(value,color){
 const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
 const c=canvas.getContext('2d');c.fillStyle=color;c.fillRect(0,0,256,256);
 const shade=c.createLinearGradient(0,0,256,256);shade.addColorStop(0,'#ffffff50');shade.addColorStop(.65,'#ffffff00');shade.addColorStop(1,'#0000003c');c.fillStyle=shade;c.fillRect(0,0,256,256);
 c.strokeStyle='#171a1990';c.lineWidth=6;c.strokeRect(7,7,242,242);
 let col=0;const hex=color.slice(1),rgb=parseInt(hex,16),r=rgb>>16&255,g=rgb>>8&255,b=rgb&255;
 col=r*.299+g*.587+b*.114;
 c.fillStyle=col<140?'#f8eed6':'#25221f';
 for(const [x,y] of pipGrid[value]){
  c.beginPath();c.arc(128+x*68,128+y*68,16,0,Math.PI*2);c.fill();
 }
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
 return texture;
}

// Deterministic procedural face painting. The materials are illustrative
// historic-inspired finishes, not photographic scans of ancient objects.
function seededRandom(seed){
 let v=(seed>>>0)||1;
 return ()=>{v=(Math.imul(1664525,v)+1013904223)>>>0;return v/4294967296};
}
function finishTexture(value,color,material,dieIndex){
 const n=384,canvas=document.createElement('canvas');canvas.width=n;canvas.height=n;
 const c=canvas.getContext('2d'),img=c.createImageData(n,n);
 const raw=parseInt(color.slice(1),16),r=raw>>16&255,g=raw>>8&255,b=raw&255;
 const random=seededRandom(1097+value*13+dieIndex*419+(material==='wood'?7001:material==='archaic'?11091:material==='ring'?17777:0));
 const offsets=Array.from({length:8},()=>({a:random()*6.28,w:2+random()*5,p:random()*6.28}));
 for(let y=0;y<n;y++){
  for(let x=0;x<n;x++){
   const i=(y*n+x)*4,xx=x/n,yy=y/n;
   const grain=material==='wood'
    ? Math.sin(yy*22+5.0*Math.sin(xx*6)+1.7*Math.sin(yy*13+xx*4))*21
      +Math.sin(yy*53+Math.sin(xx*9+yy*6)*3)*9
      +Math.sin(yy*113+xx*17)*3.7
    : Math.sin(xx*14+yy*3)*4.5+Math.sin(xx*39+yy*9)*2.2;
   let patina=0;
   for(const a of offsets){
    patina+=Math.sin(xx*a.w*6+yy*a.w*2+a.p)*.65;
   }
   const wear= Math.max(0,1-Math.min(xx,yy,1-xx,1-yy)*15);
   const pore=(random()-.5)*(material==='wood'?17:material==='archaic'||material==='ring'?30:12);
   const variation=grain+patina*(material==='wood'?1.7:1.05)+pore
     +(material==='wood'?-22:material==='archaic'||material==='ring'?-31:-18)*wear;
   img.data[i]=Math.min(255,Math.max(0,r+variation));
   img.data[i+1]=Math.min(255,Math.max(0,g+variation*(material==='wood'?.78:1)));
   img.data[i+2]=Math.min(255,Math.max(0,b+variation*(material==='wood'?.55:.93)));
   img.data[i+3]=255;
  }
 }
 c.putImageData(img,0,0);
 // Fine directional fibres and a handful of irregular tool marks.
 c.lineCap='round';
 for(let k=0;k<(material==='wood'?240:90);k++){
  const x=random()*n,y=random()*n;
  c.strokeStyle=material==='wood'?'rgba(43,26,16,'+(.055+random()*.075)+')':'rgba(111,83,52,'+(.035+random()*.05)+')';
  c.lineWidth=.45+random()*2;
  c.beginPath();c.moveTo(x,y);
  if(material==='wood')c.bezierCurveTo(x+random()*6,y+12,x-3+random()*8,y+23,x+random()*4,y+30+random()*110);
  else c.lineTo(x+random()*13-6,y+random()*3-1.5);
  c.stroke();
 }
 const sideShade=c.createRadialGradient(170,140,85,192,192,266);
 sideShade.addColorStop(0,'rgba(255,244,218,0)');
 sideShade.addColorStop(1,material==='wood'?'rgba(43,21,12,.23)':'rgba(82,65,39,.13)');
 c.fillStyle=sideShade;c.fillRect(0,0,n,n);
 // Large, contrasting carved markings must remain legible at table size.
 // The two historic-inspired patterns are intentionally distinct:
 // concentric ring-and-dot (archaeological motif) versus bold recessed
 // numerals (an openly imaginative archaic style).
 if(material==='archaic'){
  c.save();
  c.translate(n/2,n/2);
  // A very slight individual tilt suggests hand-cut rather than printed.
  c.rotate((random()-.5)*.12);
  c.textAlign='center';c.textBaseline='middle';
  c.font='900 205px Georgia,serif';
  c.lineJoin='round';
  c.strokeStyle='rgba(251,216,153,.7)';c.lineWidth=16;
  c.strokeText(String(value),5,10,280);
  c.strokeStyle='rgba(43,27,22,.72)';c.lineWidth=9;
  c.strokeText(String(value),-2,-2,280);
  c.fillStyle='#2c241f';c.fillText(String(value),0,2,280);
  c.restore();
  // Time-worn pigment surrounding the carved number.
  for(let k=0;k<140;k++){
   const x=25+random()*(n-50),y=25+random()*(n-50);
   c.fillStyle='rgba(36,23,17,'+(.018+random()*.075)+')';
   c.beginPath();c.ellipse(x,y,.5+random()*3,.4+random()*2,random()*6.28,0,Math.PI*2);c.fill();
  }
 }else{
  const ring=material==='ring';
  const wood=material==='wood';
  // The reference die uses essentially the SAME ring stamp for 1–6.
  // The previous large single pip was incorrect. Enlarge all circles
  // uniformly while tightening the oversized decorative halo.
  // Ring radius 54 at ±112 leaves 24px from the face edges;
  // even the six's three rows remain distinct and legible.
  const pipR=ring?54:wood?25:24;
  // A consistent inset margin makes the ring stamps read as a group,
  // not as four ornaments trapped in the die's corners.
  // For D6, the middle row shares the same large rings: keep full
  // vertical separation to prevent adjacent circles overlapping, but
  // bring both columns closer to the centre.
  const spacingX=ring?(value===6?82:86):101;
  const spacingY=ring?(value===6?112:86):101;
  for(const [px,py] of pipGrid[value]){
   const x=n/2+px*spacingX,y=n/2+py*spacingY;
   if(ring){
    // Strong ring-and-dot stamp; kept to a compact 56px outer radius
    // so neighboring stamps do not collide on faces 5 or 6.
    c.beginPath();c.arc(x+1,y+1,pipR+2,0,Math.PI*2);
    c.fillStyle='rgba(56,41,26,.47)';c.fill();
    c.beginPath();c.arc(x-1,y-2,pipR-1,0,Math.PI*2);
    c.strokeStyle='#d8c398';c.lineWidth=6;c.stroke();
    c.beginPath();c.arc(x,y,pipR-7,0,Math.PI*2);
    c.strokeStyle='#403326';c.lineWidth=8;c.stroke();
    c.beginPath();c.arc(x,y,pipR-16,0,Math.PI*2);
    c.fillStyle='#b69a6c';c.fill();
    c.beginPath();c.arc(x,y,pipR-20,0,Math.PI*2);
    c.strokeStyle='rgba(62,44,27,.64)';c.lineWidth=3;c.stroke();
    c.beginPath();c.arc(x,y,12,0,Math.PI*2);
    c.fillStyle='#372a21';c.fill();
   }else{
    c.beginPath();c.arc(x+2,y+3,pipR+12,0,Math.PI*2);
    c.fillStyle=wood?'rgba(24,12,7,.8)':'rgba(52,39,23,.47)';c.fill();
    c.beginPath();c.arc(x-1,y-2,pipR+9,0,Math.PI*2);
    c.strokeStyle=wood?'#c89661':'#e4cf9e';c.lineWidth=7;c.stroke();
    c.beginPath();c.arc(x,y,pipR+5,0,Math.PI*2);
    c.strokeStyle=wood?'#26190f':'#41352b';c.lineWidth=7;c.stroke();
    const dark=wood?'#24150d':'#514431';
    const indent=c.createRadialGradient(x-7,y-8,1,x,y,pipR+4);
    indent.addColorStop(0,dark);
    indent.addColorStop(.7,wood?'#432818':'#6b5840');
    indent.addColorStop(1,wood?'#674222':'#8b795c');
    c.fillStyle=indent;c.beginPath();c.arc(x,y,pipR,0,Math.PI*2);c.fill();
    c.fillStyle='rgba(12,10,7,.42)';c.beginPath();c.arc(x-2,y-1,8,0,Math.PI*2);c.fill();
   }
  }
 }
 const texture=new THREE.CanvasTexture(canvas);
 texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;
 return texture;
}
function updateDimensions(){
 const w=felt.clientWidth,h=felt.clientHeight;
  // The card tool hides the dice overlay. Never rebuild physics walls with
  // zero dimensions while that overlay is not laid out.
  if(w<80||h<80)return;
 width=10;depth=10*h/w;
 // Avoid a tall, narrow table causing dice to be too small on mobile.
 if(depth>14){width=8;depth=8*h/w}
 renderer.setSize(w,h,false);
 renderer.setPixelRatio(Math.min(2,window.devicePixelRatio||1));
 camera.left=-width*.53;camera.right=width*.53;
 camera.top=depth*.53;camera.bottom=-depth*.53;
 camera.position.set(0,13,3.3);
 camera.lookAt(0,0,0);
 camera.updateProjectionMatrix();
 // PlaneGeometry lies in local XY. After rotation.x=-PI/2, local Y
 // becomes the tabletop's world-Z axis. Scaling local Z only changed
 // the normal, leaving a narrow shadow-receiving strip in world space.
 ground.scale.set(width,depth,1);
 // Walls are rebuilt when the aspect ratio changes, without disturbing dice.
 if(world)buildWalls();
}
let wallColliders=[];
function buildWalls(){
 for(const col of wallColliders){world.removeCollider(col,true)}
 wallColliders=[];
 // Invisible high retaining walls: strong throws must not vault out of bounds.
 const wallHeight=6.5;
 const segments=[
 {x:0,z:depth/2+.19,hx:width/2+.3,hz:.22},
 {x:0,z:-depth/2-.19,hx:width/2+.3,hz:.22},
 {x:width/2+.19,z:0,hx:.22,hz:depth/2+.3},
 {x:-width/2-.19,z:0,hx:.22,hz:depth/2+.3}
 ];
 for(const o of segments){
  wallColliders.push(world.createCollider(
   RAPIER.ColliderDesc.cuboid(o.hx,wallHeight,o.hz)
    .setTranslation(o.x,wallHeight-.1,o.z).setRestitution(.28).setFriction(.8)
  ));
 }
}
// Build a true solid polyhedron, one face and one real material map per
// numbered face. Collision uses the identical 3D vertices as the renderer.
function normaliseSolid(geometry){
 const a=geometry.getAttribute('position');
 const vertices=[], triangles=[],indexByKey=new Map();
 for(let i=0;i<a.count;i++){
  const p=[a.getX(i),a.getY(i),a.getZ(i)];
  const key=p.map(v=>v.toFixed(5)).join(',');
  if(!indexByKey.has(key)){indexByKey.set(key,vertices.length);vertices.push(p)}
 }
 const radius=Math.max(...vertices.map(v=>Math.hypot(...v)));
 const scale=.64/radius;
 vertices.forEach(v=>{v[0]*=scale;v[1]*=scale;v[2]*=scale});
 for(let i=0;i<a.count;i+=3){
  const tri=[];
  for(let k=0;k<3;k++){
   const p=[a.getX(i+k),a.getY(i+k),a.getZ(i+k)];
   tri.push(indexByKey.get(p.map(v=>v.toFixed(5)).join(',')));
  }
  triangles.push(tri);
 }
 geometry.dispose();
 return {vertices,triangles};
}
function createTenGeometry(){
 // Pentagonal trapezohedron: 10 planar kite faces, two poles and a
 // staggered equatorial ring. The exact ratio makes each kite coplanar.
 const c=Math.cos(Math.PI/5),h=(1-c)/(1+c);
 const vertices=[[0,1,0],[0,-1,0]];
 for(let i=0;i<10;i++){
  const a=i*Math.PI/5;
  vertices.push([Math.cos(a),i%2===0?-h:h,Math.sin(a)]);
 }
 const radius=Math.max(...vertices.map(v=>Math.hypot(...v)));
 vertices.forEach(v=>{v[0]*=.64/radius;v[1]*=.64/radius;v[2]*=.64/radius});
 const faces=[];
 for(let i=0;i<10;i+=2)faces.push([0,2+((i+9)%10),2+i,2+((i+1)%10)]);
 for(let i=1;i<10;i+=2)faces.push([1,2+((i+9)%10),2+i,2+((i+1)%10)]);
 return {vertices,faces};
}
function vectorFrom(v){return new THREE.Vector3(v[0],v[1],v[2])}
function facePlane(vertices,indices){
 const a=vectorFrom(vertices[indices[0]]),b=vectorFrom(vertices[indices[1]]),c=vectorFrom(vertices[indices[2]]);
 const n=b.clone().sub(a).cross(c.clone().sub(a)).normalize();
 const centre=new THREE.Vector3();
 indices.forEach(k=>centre.add(vectorFrom(vertices[k])));centre.multiplyScalar(1/indices.length);
 if(n.dot(centre)<0)n.negate();
 return {normal:n,centre};
}
function solidFaces(sides){
 if(sides===10){
  const g=createTenGeometry();
  return {vertices:g.vertices,faces:g.faces};
 }
 const makers={4:THREE.TetrahedronGeometry,8:THREE.OctahedronGeometry,12:THREE.DodecahedronGeometry,20:THREE.IcosahedronGeometry};
 const g=normaliseSolid(new makers[sides](1,0));
 const planes=[];
 for(const tri of g.triangles){
  const {normal,centre}=facePlane(g.vertices,tri),offset=normal.dot(centre);
  let face=planes.find(f=>f.normal.dot(normal)>.999&&Math.abs(f.offset-offset)<.003);
  if(!face){face={normal,offset,indices:new Set()};planes.push(face)}
  tri.forEach(k=>face.indices.add(k));
 }
 const faces=planes.map(f=>{
  const ids=[...f.indices];
  const centre=new THREE.Vector3();ids.forEach(i=>centre.add(vectorFrom(g.vertices[i])));centre.multiplyScalar(1/ids.length);
  const u=vectorFrom(g.vertices[ids[0]]).sub(centre).normalize(),v=f.normal.clone().cross(u).normalize();
  ids.sort((a,b)=>{
   const A=vectorFrom(g.vertices[a]).sub(centre),B=vectorFrom(g.vertices[b]).sub(centre);
   return Math.atan2(A.dot(v),A.dot(u))-Math.atan2(B.dot(v),B.dot(u));
  });
  return ids;
 });
 if(faces.length!==sides)throw Error('D'+sides+' face count: '+faces.length);
 return {vertices:g.vertices,faces};
}
const solids=new Map();
function getSolid(sides){if(!solids.has(sides))solids.set(sides,solidFaces(sides));return solids.get(sides)}
function ringNumberTexture(value,color,sides,ringRadius,faceIndex){
 const n=512,canvas=document.createElement('canvas');canvas.width=n;canvas.height=n;
 const c=canvas.getContext('2d'),img=c.createImageData(n,n);
 const rgb=parseInt(color.slice(1),16),r=rgb>>16&255,g=rgb>>8&255,b=rgb&255;
 const random=seededRandom(9001+sides*151+faceIndex*97);
 // A warm, worn mineral/bone-like base with subtle grain, matching D6.
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const i=(y*n+x)*4;
  const striation=Math.sin(x*.065+y*.016)*4+Math.sin(x*.18+y*.035)*2;
  const pores=(random()-.5)*21,edge=Math.max(0,1-Math.min(x,y,n-1-x,n-1-y)/64);
  const noise=striation+pores-edge*18;
  img.data[i]=Math.max(0,Math.min(255,r+noise));
  img.data[i+1]=Math.max(0,Math.min(255,g+noise*.96));
  img.data[i+2]=Math.max(0,Math.min(255,b+noise*.91));
  img.data[i+3]=255;
 }
 c.putImageData(img,0,0);
 // The mark must fit inside the actual polygon rather than the square
 // texture. Triangular D8/D20 faces use a narrower etched ring.
 const rad=Math.max(8,Math.min(190,ringRadius*(sides===8?.92:1)));
 const cx=256,cy=256;
 c.beginPath();c.arc(cx+2,cy+3,rad+4,0,Math.PI*2);
 c.fillStyle='rgba(55,39,24,.5)';c.fill();
 c.beginPath();c.arc(cx-2,cy-3,rad,0,Math.PI*2);
 c.strokeStyle='#e2ce9e';c.lineWidth=Math.max(3,rad*.12);c.stroke();
 // Keep the ring as a framing device rather than competing with
 // the numeral. A quiet pale centre gives the carved black digit contrast.
 c.beginPath();c.arc(cx,cy,rad*.80,0,Math.PI*2);
 c.strokeStyle='#423325';c.lineWidth=Math.max(3,rad*.095);c.stroke();
 c.beginPath();c.arc(cx,cy,rad*.68,0,Math.PI*2);
 c.fillStyle='#d5bd8f';c.fill();
 c.beginPath();c.arc(cx,cy,rad*.67,0,Math.PI*2);
 c.strokeStyle='rgba(72,50,32,.35)';c.lineWidth=Math.max(1.5,rad*.025);c.stroke();
 // Previous glyphs used only 0.74–0.92 of the ring radius in font
 // size and vanished at actual tabletop scale. Give the digit most of
 // the central field, including 10, 11 and 12 on D12.
 const twoDigits=value>=10;
 const fontSize=rad*(twoDigits?(sides===20?1.32:1.14):(sides===20?1.68:1.56));
 const maxWidth=rad*(twoDigits?(sides===20?1.53:1.36):1.00);
 c.textAlign='center';c.textBaseline='middle';c.lineJoin='round';
 c.font='900 '+fontSize+'px Georgia,serif';
 c.strokeStyle='rgba(247,224,177,.88)';
 c.lineWidth=Math.max(2,rad*.085);
 c.strokeText(String(value),cx+1,cy+2,maxWidth);
 c.fillStyle='#211a14';c.fillText(String(value),cx,cy,maxWidth);
 if(value===6||value===9){
  const w=rad*.31;
  c.fillRect(cx-w/2,cy+fontSize*.34,w,Math.max(2,rad*.06));
 }
 const texture=new THREE.CanvasTexture(canvas);
 texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;
 return texture;
}
function numberTexture(value,color,sides){
 const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
 const c=canvas.getContext('2d');
 c.fillStyle=color;c.fillRect(0,0,256,256);
 const shade=c.createLinearGradient(0,0,256,256);
 shade.addColorStop(0,'#ffffff45');shade.addColorStop(.7,'#ffffff00');shade.addColorStop(1,'#00000039');
 c.fillStyle=shade;c.fillRect(0,0,256,256);
 const rgb=parseInt(color.slice(1),16),lum=(rgb>>16&255)*.299+(rgb>>8&255)*.587+(rgb&255)*.114;
 c.textAlign='center';c.textBaseline='middle';c.fillStyle=lum<140?'#fff1d8':'#24231e';
 const fontSize=sides===10?(value>=10?59:72):sides===20?(value>=10?76:98):(value>=10?86:112);
 c.font='bold '+fontSize+'px Georgia,serif';c.fillText(String(value),128,128,112);
 if(value===6||value===9){
  const w=Math.min(42,fontSize*.33);
  c.fillRect(128-w/2,128+fontSize*.43,w,Math.max(3,fontSize*.045));
 }
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 return texture;
}
// Visual and physical scale are derived from the same vertex set.
// Calibrated by the visual size of the face numerals, not equal
// circumscribed diameters. A many-sided die needs a larger body so
// its smaller triangular faces can carry comparably legible numerals.
// The D6's finished ring-and-dot design retains its established size.
function polyScale(sides){return ({8:1.17,10:1.24,12:1.14,20:1.50})[sides]||1}
// For this twelve-sided set, opposing faces carry complementary
// indices 1+12, 2+11, ... 6+7 = 13. This is checked geometrically.
function complementaryFaceValues(normals){
 const values=Array(normals.length).fill(0);let next=1;
 for(let i=0;i<normals.length;i++){
  if(values[i])continue;
  let other=-1,best=Infinity;
  for(let j=0;j<normals.length;j++){
   if(j===i||values[j])continue;
   const dot=normals[i].dot(normals[j]);
   if(dot<best){best=dot;other=j}
  }
  if(other<0||best>-.985)throw Error('Opposite-face match failed');
  values[i]=next;values[other]=13-next;next++;
 }
 if(next!==7)throw Error('Incorrect opposite pairs');
 return values;
}
// Reference-inspired design: an ivory body with large engraved Chinese
// characters, without the ring motif of the normal/polyhedral dice.
// Face glyphs and result values use the exact same semantic index.
function ichingTexture(face,dieIndex,ink,ringRadius=null){
 const n=512,canvas=document.createElement('canvas');canvas.width=n;canvas.height=n;
 const c=canvas.getContext('2d'),img=c.createImageData(n,n);
 const random=seededRandom(71507+dieIndex*157+face.glyph.codePointAt(0));
 const base=[226,215,175];
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const p=(y*n+x)*4;
  const grain=Math.sin(x*.028+y*.011)*2.7+(random()-.5)*8;
  const wear=Math.max(0,1-Math.min(x,y,n-x,n-y)/75)*10;
  for(let k=0;k<3;k++)img.data[p+k]=Math.max(0,Math.min(255,base[k]+grain-wear));
  img.data[p+3]=255;
 }
 c.putImageData(img,0,0);
 // D8 triangular faces are smaller, but Chinese characters should fill
 // most of the available inscribed area without splitting across edges.
 const isCube=dieIndex===2;
 const r=isCube?173:Math.max(44,Math.min(170,ringRadius*1.05));
 const font=isCube?265:r*2.03;
 const maxWidth=isCube?326:r*1.85;
 c.font='900 '+font+'px "Yu Mincho","Hiragino Mincho ProN","Noto Serif CJK JP","Noto Serif JP","MS Mincho",serif';
 c.textAlign='center';c.textBaseline='middle';c.lineJoin='round';c.lineCap='round';
 // Simulate a carved, ink-filled recess: the lower-right wall of the
 // engraving is lit, the upper-left wall is dark, then pigment sits below
 // the ivory face. Keep the edge fine enough for small triangular faces.
 // On the moving-line die, only 初 is vermilion; 二・三・四・五・上
 // are black. The two trigram dice keep their respective red/black inks.
 const effectiveInk=face.ink||ink;
 const vermilion=effectiveInk===ICHING_INKS.red;
 const dark=vermilion?'#69151b':'#141319';
 const pigment=effectiveInk;
 c.save();
 c.shadowColor='rgba(38,28,19,.68)';
 c.shadowBlur=Math.max(3,font*.032);
 c.shadowOffsetX=-Math.max(2,font*.025);
 c.shadowOffsetY=-Math.max(2,font*.028);
 c.strokeStyle='rgba(92,72,47,.65)';
 c.lineWidth=Math.max(3,font*.065);
 c.strokeText(face.glyph,256,256,maxWidth);
 c.restore();
 // Fine exposed ivory rim catches light just below the cut.
 c.strokeStyle='rgba(255,250,218,.95)';
 c.lineWidth=Math.max(3,font*.041);
 c.strokeText(face.glyph,256+Math.max(2,font*.019),256+Math.max(2,font*.022),maxWidth);
 // The dark inside rim makes the incision read as below the surface.
 c.strokeStyle=dark;
 c.lineWidth=Math.max(3,font*.032);
 c.strokeText(face.glyph,256-Math.max(1,font*.008),256-Math.max(1,font*.01),maxWidth);
 c.fillStyle=pigment;
 c.fillText(face.glyph,256,256,maxWidth);
 // Minute gloss on the pigment, not a raised letter outline.
 c.save();c.globalAlpha=.20;
 c.fillStyle=vermilion?'#e8b2a4':'#aaa2a2';c.fillText(face.glyph,256+1,256+1,maxWidth);
 c.restore();
 const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=8;
 return tex;
}
function astroTexture(face,dieIndex,color,ringRadius){
 const n=512,canvas=document.createElement('canvas');canvas.width=n;canvas.height=n;
 const c=canvas.getContext('2d'),img=c.createImageData(n,n);
 const rgb=parseInt(color.slice(1),16),base=[rgb>>16&255,rgb>>8&255,rgb&255];
 const rng=seededRandom(71413+dieIndex*79+face.glyph.codePointAt(0));
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  const at=(y*n+x)*4,grain=Math.sin(x*.063+y*.014)*4+Math.sin(x*.17+y*.031)*2+(rng()-.5)*16;
  const edge=Math.max(0,1-Math.min(x,y,n-1-x,n-1-y)/72);
  for(let k=0;k<3;k++)img.data[at+k]=Math.max(0,Math.min(255,base[k]+grain-edge*16));
  img.data[at+3]=255;
 }
 c.putImageData(img,0,0);
 const r=Math.min(182,Math.max(12,ringRadius*.99)),x=256,y=256;
 c.beginPath();c.arc(x+2,y+3,r+3,0,Math.PI*2);c.fillStyle='rgba(27,22,17,.43)';c.fill();
 c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.strokeStyle='#ebd2a0';c.lineWidth=Math.max(3,r*.1);c.stroke();
 c.beginPath();c.arc(x,y,r*.84,0,Math.PI*2);c.strokeStyle='#453528';c.lineWidth=Math.max(4,r*.13);c.stroke();
 c.beginPath();c.arc(x,y,r*.70,0,Math.PI*2);c.fillStyle='#d7bc8f';c.fill();
 c.textAlign='center';c.textBaseline='middle';c.lineJoin='round';
 const house=dieIndex===2,double=house&&face.glyph.length===2;
 const font=r*(double?1.12:house?1.45:1.78);
 c.font=(house?'bold ':'bold ')+font+'px '+(house?'Georgia,serif':'"Segoe UI Symbol","DejaVu Sans","Noto Sans Symbols 2",serif');
 const glyph=dieIndex===1?face.glyph+'\uFE0E':face.glyph;
 c.strokeStyle='#f7deb0';c.lineWidth=Math.max(3,r*.12);
 c.strokeText(glyph,x,y+2,r*1.58);
 c.fillStyle='#271f18';c.fillText(glyph,x,y,r*1.58);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;return texture;
}
function numberedMesh(sides,color,material='standard',astroDieIndex=0){
 const source=getSolid(sides),scale=polyScale(sides);
 const solid={vertices:source.vertices.map(v=>v.map(x=>x*scale)),faces:source.faces};
 const {vertices,faces}=solid;
 const positions=[],uvs=[],groups=[],faceNormals=[],rings=[];
 faces.forEach((faceIds,index)=>{
  // Keep the rendered front face winding outward, including the upper
  // five kites of D10, whose authored ordering is clockwise from outside.
  const ids=[...faceIds];
  const a0=vectorFrom(vertices[ids[0]]),b0=vectorFrom(vertices[ids[1]]),c0=vectorFrom(vertices[ids[2]]);
  const raw=b0.clone().sub(a0).cross(c0.clone().sub(a0));
  const centroid=new THREE.Vector3();
  ids.forEach(k=>centroid.add(vectorFrom(vertices[k])));
  centroid.multiplyScalar(1/ids.length);
  if(raw.dot(centroid)<0)ids.reverse();
  const {normal,centre}=facePlane(vertices,ids);
  faceNormals.push(normal);
  const a=vectorFrom(vertices[ids[0]]).sub(centre).normalize();
  const b=normal.clone().cross(a).normalize();
  const maxR=Math.max(...ids.map(k=>vectorFrom(vertices[k]).sub(centre).length()));
  // Estimate the radius of the largest circle wholly inside each face.
  // This handles triangular D8/D20, narrow D10 kites and D12 pentagons.
  let inRadius=Infinity;
  for(let j=0;j<ids.length;j++){
   const p=vectorFrom(vertices[ids[j]]).sub(centre),q=vectorFrom(vertices[ids[(j+1)%ids.length]]).sub(centre);
   const px=p.dot(a),py=p.dot(b),qx=q.dot(a),qy=q.dot(b);
   const dist=Math.abs(px*qy-py*qx)/Math.hypot(qx-px,qy-py);
   inRadius=Math.min(inRadius,dist);
  }
  // UVs span 0..1 over 2.2*maxR; texture uses 512px for the ring.
  // D20 previously used .78 × .92 of the inscribed circle. Raise to
  // .90 × 1.00, a ~25% larger ring while leaving a rim at every edge.
  // All other dice retain their previously approved dimensions.
  rings.push(Math.max(0,inRadius/(maxR*2.2)*512*(sides===20?.90:.78)));
  const coords=ids.map(k=>{
   const d=vectorFrom(vertices[k]).sub(centre);
   return [.5+d.dot(a)/(maxR*2.2),.5+d.dot(b)/(maxR*2.2)];
  });
  const start=positions.length/3;
  for(let i=1;i<ids.length-1;i++){
   for(const j of [0,i,i+1]){
    positions.push(...vertices[ids[j]]);
    uvs.push(...coords[j]);
   }
  }
  groups.push({start,count:positions.length/3-start,materialIndex:index});
 });
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
 groups.forEach(g=>geometry.addGroup(g.start,g.count,g.materialIndex));
 geometry.computeVertexNormals();
 const die=diceSettings[astroDieIndex],mappedValues=die.opposites==='sum13'?complementaryFaceValues(faceNormals):faces.map((_,i)=>i+1);
 const isRing=die.surface==='ring'&&[8,10,12,20].includes(sides);
 const materials=faces.map((_,i)=>new THREE.MeshStandardMaterial({
  map:die.markings==='astro'?astroTexture(die.faces[mappedValues[i]-1],astroDieIndex,die.color,rings[i]):
      die.markings==='engraved'?ichingTexture(die.faces[mappedValues[i]-1],astroDieIndex,die.ink,rings[i]):
      isRing?ringNumberTexture(mappedValues[i],color,sides,rings[i],i):numberTexture(mappedValues[i],color,sides),
  roughness:die.markings==='engraved'?.42:die.markings==='astro'?.84:isRing?.88:.49,metalness:0,side:THREE.DoubleSide
 }));
 const mesh=new THREE.Mesh(geometry,materials);
 return {mesh,solid,normals:faceNormals,values:mappedValues};
}
// RoundedBoxGeometry-style vertex shaping using the standard Three.js
// face groups and UV maps. This avoids a new dependency and keeps the
// numbers on their own cube faces. The collision cuboid stays unchanged.
function wornCubeGeometry(material){
 const segments=6;
 const geometry=new THREE.BoxGeometry(DICE_SIZE,DICE_SIZE,DICE_SIZE,segments,segments,segments);
 const pos=geometry.getAttribute('position'),half=DICE_SIZE/2;
 const radius=DICE_SIZE*(material==='wood'?.057:material==='standard'?.0:.09),inner=half-radius;
 for(let i=0;i<pos.count;i++){
  const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);
  const cx=Math.max(-inner,Math.min(inner,x));
  const cy=Math.max(-inner,Math.min(inner,y));
  const cz=Math.max(-inner,Math.min(inner,z));
  let dx=x-cx,dy=y-cy,dz=z-cz;
  const len=Math.hypot(dx,dy,dz)||1;
  pos.setXYZ(i,cx+radius*dx/len,cy+radius*dy/len,cz+radius*dz/len);
 }
 pos.needsUpdate=true;
 geometry.computeVertexNormals();
 return geometry;
}
function makeDie(i){
 const settings=diceSettings[i],sides=settings.sides;
 let mesh,solid=null,normals,faceNumbers;
 if(sides===6){
  const geometry=settings.surface==='standard'?new THREE.BoxGeometry(DICE_SIZE,DICE_SIZE,DICE_SIZE):wornCubeGeometry(settings.surface);
  const materials=faceValues.map(n=>new THREE.MeshStandardMaterial({
   map:settings.markings==='engraved'?ichingTexture(settings.faces[n-1],i,settings.ink):settings.markings==='astro'?astroTexture(settings.faces[n-1],i,settings.color,160):settings.surface==='standard'?faceTexture(n,settings.color):finishTexture(n,settings.color,settings.surface,i),
   roughness:settings.markings==='engraved'?.42:settings.surface==='wood'?.94:settings.surface==='standard'?.47:.88,metalness:0
  }));
  mesh=new THREE.Mesh(geometry,materials);normals=faceNormals;faceNumbers=faceValues;
 }else{
  const poly=numberedMesh(sides,settings.color,settings.surface,i);
  mesh=poly.mesh;solid=poly.solid;normals=poly.normals;faceNumbers=poly.values;
 }
 mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);
 const body=world.createRigidBody(RAPIER.RigidBodyDesc.dynamic()
  .setTranslation((i-(diceSettings.length-1)/2)*1.65,Math.max(1.15,HALF+.4),0)
  .setLinearDamping(.13).setAngularDamping(.23).setCanSleep(true).setCcdEnabled(true));
 const collider=sides===6?
  RAPIER.ColliderDesc.cuboid(HALF,HALF,HALF):
  RAPIER.ColliderDesc.convexHull(new Float32Array(solid.vertices.flat()));
 if(!collider)throw Error('Convex collider failed for D'+sides);
 world.createCollider(collider.setRestitution(.38).setFriction(.76).setDensity(1),body);
 // max radial extent, including cube vertices, for wall clearance.
 const radius=sides===6?Math.sqrt(3)*HALF:
  Math.max(...solid.vertices.map(v=>Math.hypot(...v)));
 // Present the five dice on the cloth before the first throw.
 // Rapier is paused until rolling starts, so the initial pose should
 // place each solid exactly on the surface instead of floating.
 const lowest=sides===6?-HALF:Math.min(...solid.vertices.map(v=>v[1]));
 const columns=Math.min(4,diceSettings.length),col=i%columns,row=Math.floor(i/columns),rows=Math.ceil(diceSettings.length/columns);
  body.setTranslation({x:(col-(columns-1)/2)*1.65,y:-lowest+.02,z:(row-(rows-1)/2)*1.65},true);
 return {mesh,body,normals,faceNumbers,sides,radius};
}
function destroyDie(obj){
 if(!obj)return;
 world.removeRigidBody(obj.body);
 scene.remove(obj.mesh);
 obj.mesh.geometry.dispose();
 const materials=Array.isArray(obj.mesh.material)?obj.mesh.material:[obj.mesh.material];
 for(const m of materials){m.map?.dispose();m.dispose()}
}
function createDice(){
 for(let i=0;i<diceSettings.length;i++)objects.push(makeDie(i));
}
function syncMeshes(){
 for(const {mesh,body} of objects){
  const p=body.translation(),q=body.rotation();
  mesh.position.set(p.x,p.y,p.z);mesh.quaternion.set(q.x,q.y,q.z,q.w);
 }
}
function topFace(object){
 const q=object.mesh.quaternion;let best=-Infinity,index=0;
 for(let i=0;i<object.normals.length;i++){
  const score=object.normals[i].clone().applyQuaternion(q).dot(up);
  if(score>best){best=score;index=i}
 }
 return object.faceNumbers[index];
}
function random(min,max){return min+Math.random()*(max-min)}
function collectDice(){
 if(!ready||rolling||held)return;
 // Leave physical dice untouched until the next throw; merely remove
 // them from the visible table. This preserves genuine physics on release.
 held=true;
 objects.forEach(({mesh})=>{mesh.visible=false});
 collectButton.disabled=true;
 mixButton.disabled=false;
 button.disabled=false;
 mixCount=0;
 mixButton.textContent='⟳　混ぜ始める';
 mixButton.setAttribute('aria-pressed','false');
 showResults();
 status.textContent='IN HAND — 投げる準備ができました';
 emitDice();
}
// Mix the very same 3D meshes used for the physical throw, at full size.
// Rapier is not stepped while the dice are held; these are visual poses only.
// A free-running, user-controlled in-hand mixing action.
// The full-size meshes represent dice tossed upward from an unseen palm;
// Rapier is deliberately paused, and the final numbers are determined on throw.
function mixDice(){
 if(!ready||rolling||!held)return;
 if(mixing){
  mixing=false;
  objects.forEach(({mesh})=>{mesh.visible=false;mesh.castShadow=true});
  mixButton.textContent='⟳　もう一度混ぜる';
  mixButton.setAttribute('aria-pressed','false');
  button.disabled=false;
  status.textContent='IN HAND — 混ぜ終わりました（'+mixCount+'回）';
  emitDice();return;
 }
 mixing=true;mixCount++;mixTime=0;
 button.disabled=true;
 mixButton.textContent='■　混ぜるのを止める';
 mixButton.setAttribute('aria-pressed','true');
 objects.forEach(({mesh})=>{mesh.visible=true;mesh.castShadow=false});
 status.textContent='MIXING… — 好きなタイミングで止められます';
}
function animateMix(dt){
 mixTime+=dt;
 const t=mixTime;
 // A vertical toss roughly every 0.9 seconds: lift, apex, catch,
 // then another toss. Each die has a distinct lateral position and
 // slightly staggered flight, so they never fuse.
 const period=.92;
 objects.forEach(({mesh},i)=>{
  const phase=((t+i*.075)%period)/period;
  const tossHeight=4*phase*(1-phase); // a smooth rise and fall, 0 at catches
  const orbit=t*2.7+i*2*Math.PI/objects.length;
  const r=1.10+Math.sin(t*4.4+i)*.10;
  const x=Math.cos(orbit)*r;
  const z=Math.sin(orbit)*r*.77;
  mesh.position.set(x,1.15+2.35*tossHeight,z);
  // The upward throw has real visible somersaults. Faces remain attached
  // to the actual 3D cubes, as during a Rapier throw.
  mesh.rotation.set(t*9+i*2.1,t*7+i*2.4,t*8+i*1.9);
 });
}
function releaseDice(options={}){
 if(!ready||rolling||!held||mixing)return;
 held=false;
 rolling=true;rollTime=0;stableTime=0;accumulator=0;
 lockSettings(true);
 button.disabled=true;mixButton.disabled=true;showResults();
 status.textContent='ROLLING…';
 const dir=options.direction||{x:0,y:-1};
 const length=Math.hypot(dir.x,dir.y)||1;
 const dx=dir.x/length,dz=dir.y/length;
 const power=currentForce()*(options.gestureBoost??1);
 // The launch is beyond the near/opposite table edge, then enters toward its centre.
 // In 3D, the edge is a low wall; spawn just inside the tabletop and above it,
 // with horizontal momentum aimed in the dragged direction.
 const tx=-dz,tz=dx;
 objects.forEach(({body,mesh,radius},i)=>{
  const maxRadius=Math.max(...objects.map(d=>d.radius));
  const lateralCapacity=Math.max(.35,Math.min(width,depth)/2-maxRadius-.37);
  const spacing=objects.length>1?Math.min(1.43,2*lateralCapacity/(objects.length-1)):0;
   const offset=(i-(objects.length-1)/2)*spacing;
  // Compute EACH launch position separately. The old shared edge origin
  // could put the outer die beyond a side wall on diagonal throws.
  const ox=tx*offset,oz=tz*offset;
  const limitX=width/2-radius-.28,limitZ=depth/2-radius-.28;
  let reach=Infinity;
  if(dx>1e-4)reach=Math.min(reach,(limitX+ox)/dx);
  if(dx< -1e-4)reach=Math.min(reach,(limitX-ox)/-dx);
  if(dz>1e-4)reach=Math.min(reach,(limitZ+oz)/dz);
  if(dz< -1e-4)reach=Math.min(reach,(limitZ-oz)/-dz);
  reach=Math.max(.35,Math.min(reach,Math.max(width,depth)));
  const x=ox-dx*reach,z=oz-dz*reach;
  body.wakeUp();
  body.setTranslation({x,y:random(2.3,3.1)+Math.min(.4,power*.18),z},true);
  const orientation=new THREE.Quaternion().setFromEuler(new THREE.Euler(random(-3,3),random(-3,3),random(-3,3)));
  body.setRotation({x:orientation.x,y:orientation.y,z:orientation.z,w:orientation.w},true);
  body.setLinvel({x:dx*random(3.8,5.2)*power+random(-.6,.6),
    y:random(-1.7,-.5)*Math.max(.65,power),z:dz*random(3.8,5.2)*power+random(-.6,.6)},true);
  body.setAngvel({x:random(-12,12)*power,y:random(-11,11)*power,z:random(-12,12)*power},true);
  mesh.visible=true;
 });
}
function render(time){
 frame=requestAnimationFrame(render);
 if(!document.body.classList.contains('tabula-dice-mode'))return;
 const dt=Math.min(.05,lastTime?(time-lastTime)/1000:0);lastTime=time;
 if(ready&&mixing)animateMix(dt);
 if(ready&&rolling){
  accumulator=Math.min(.12,accumulator+dt);
  while(accumulator>=FIXED_STEP){world.step();accumulator-=FIXED_STEP}
  syncMeshes();
  if(rolling){
   rollTime+=dt;
   const stopped=objects.every(({body})=>body.isSleeping()||(
    body.linvel().x**2+body.linvel().y**2+body.linvel().z**2<.008
    &&body.angvel().x**2+body.angvel().y**2+body.angvel().z**2<.02
   ));
   stableTime=stopped?stableTime+dt:0;
   if(stableTime>.50||rollTime>12){
    rolling=false;button.disabled=true;collectButton.disabled=false;mixButton.disabled=true;
    lockSettings(false);
    const results=objects.map(topFace);
    showResults(results);
    status.textContent='THE DICE HAVE FALLEN';emitDice();
   }
  }
 }
 renderer.render(scene,camera);
}
async function init(){
 try{
  await RAPIER.init();
  world=new RAPIER.World({x:0,y:-15,z:0});
  world.timestep=FIXED_STEP;
  world.createCollider(RAPIER.ColliderDesc.cuboid(100,.2,100).setTranslation(0,-.2,0).setFriction(.86).setRestitution(.28));
  scene=new THREE.Scene();
  camera=new THREE.OrthographicCamera(-5,5,3,-3,.1,100);
  renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});
  renderer.setClearColor(0,0);
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  felt.prepend(renderer.domElement);
  scene.add(new THREE.HemisphereLight(0xe1efe8,0x1a3427,2.3));
  const key=new THREE.DirectionalLight(0xffe9c5,2.8);key.position.set(-4,17,-6);
  key.castShadow=true;key.shadow.mapSize.set(1024,1024);
  key.shadow.camera.left=-10;key.shadow.camera.right=10;key.shadow.camera.top=10;key.shadow.camera.bottom=-10;
  key.shadow.normalBias=.018;key.shadow.bias=-.0002;key.shadow.radius=3;scene.add(key);
  ground=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.ShadowMaterial({opacity:.24}));
  ground.rotation.x=-Math.PI/2;ground.position.y=.007;ground.receiveShadow=true;scene.add(ground);
  updateDimensions();
  createDice();syncMeshes();
  ready=true;collectButton.disabled=false;mixButton.disabled=true;button.disabled=true;status.textContent='READY TO COLLECT';
  frame=requestAnimationFrame(render);
  if(pendingParentMode&&current.id!==pendingParentMode){diceDOM.getElementById('preset').value=pendingParentMode;switchPreset(pendingParentMode)}
  new ResizeObserver(updateDimensions).observe(felt);
  if(pendingRestore){const request=pendingRestore;pendingRestore=null;restoreDice(request.saved,request.id)}
 }catch(error){
  console.error(error);
  status.textContent='読み込みに失敗しました';
  failure.hidden=false;
  failure.textContent='3D描画または物理エンジンを読み込めませんでした。通信環境・WebGL対応を確認してください。'+(error?.message||'');
 }
}
collectButton.addEventListener('click',collectDice);
mixButton.addEventListener('click',mixDice);
button.addEventListener('click',()=>releaseDice());
const guide=diceDOM.getElementById('throwGuide'),startPoint=diceDOM.getElementById('startPoint'),line=diceDOM.getElementById('throwLine'),arrow=diceDOM.getElementById('throwArrow');
let gesture=null,suppressClick=false;
function local(event){const r=felt.getBoundingClientRect();return{x:event.clientX-r.left,y:event.clientY-r.top}}
function drawGuide(x,y,dx,dy){
 const size=Math.hypot(dx,dy),scale=Math.min(1,170/(size||1));
 const X=x+dx*scale,Y=y+dy*scale;
 guide.style.display='block';guide.setAttribute('viewBox','0 0 '+felt.clientWidth+' '+felt.clientHeight);
 startPoint.setAttribute('cx',x);startPoint.setAttribute('cy',y);
 for(const [attribute,value] of [['x1',x],['y1',y],['x2',X],['y2',Y]])line.setAttribute(attribute,value);
 arrow.setAttribute('transform','translate('+X+' '+Y+') rotate('+(Math.atan2(dy,dx)*180/Math.PI)+')');
}
felt.addEventListener('pointerdown',event=>{
 if(!ready||rolling||!held||mixing||!event.isPrimary||event.button!==0)return;
 const p=local(event);gesture={id:event.pointerId,x:event.clientX,y:event.clientY,localX:p.x,localY:p.y,time:performance.now()};
 felt.setPointerCapture(event.pointerId);drawGuide(p.x,p.y,0,0);
});
felt.addEventListener('pointermove',event=>{
 if(!gesture||gesture.id!==event.pointerId)return;
 drawGuide(gesture.localX,gesture.localY,event.clientX-gesture.x,event.clientY-gesture.y);
});
felt.addEventListener('pointerup',event=>{
 if(!gesture||gesture.id!==event.pointerId)return;
 const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;
 const distance=Math.hypot(dx,dy),elapsed=Math.max(1,performance.now()-gesture.time);
 gesture=null;guide.style.display='none';
 if(distance<25)return;
 // Gesture direction and speed still matter, but the analogue slider
 // remains the primary strength control rather than being overridden.
 const gestureBoost=Math.max(.72,Math.min(1.25,.8+distance/650+(distance/elapsed)*.08));
 suppressClick=true;releaseDice({direction:{x:dx/distance,y:dy/distance},gestureBoost});
});
felt.addEventListener('pointercancel',()=>{gesture=null;guide.style.display='none'});
felt.addEventListener('click',()=>{if(suppressClick){suppressClick=false;return}if(held)releaseDice();else collectDice()});
felt.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();if(held)releaseDice();else collectDice()}});
init();
