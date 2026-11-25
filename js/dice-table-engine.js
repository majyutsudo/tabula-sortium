
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.181.0/build/three.module.js';
import RAPIER from 'https://esm.sh/@dimforge/rapier3d-compat@0.17.3';
import {preset,TRIGRAMS,setIChingColors,ICHING_INKS} from './dice-presets.js?v=0725';

import {faceFigure, faceDetail, hexagramDetail} from './dice-inspector.js?v=0770';

const diceDOM={
 getElementById(id){return window.document.getElementById('dice-'+id)},
 querySelectorAll(selector){return window.document.querySelectorAll(selector.replace(/#([\w-]+)/g,(_,id)=>'#dice-'+id))}
};
const felt=diceDOM.getElementById('felt');
const darkRoom=diceDOM.getElementById('dark-room');
const GLOW_COLORS={
 teal:{label:'青緑',resin:'#99edc5',halo:'119,237,171'},
 blue:{label:'水色',resin:'#a0ddff',halo:'120,203,255'},
 lilac:{label:'薄紫',resin:'#ddc2ff',halo:'196,154,255'},
 amber:{label:'琥珀',resin:'#ffda91',halo:'255,185,96'}
};
let hemisphereLight,keyLight,glowGeometry;
const glowMaterials=new Map();
function glowColorKey(value){return Object.hasOwn(GLOW_COLORS,value)?value:'teal'}
function glowPalette(die){return GLOW_COLORS[glowColorKey(die.glowColor)]}
const POLISHED_COLORS={obsidian:'#24252b',gold:'#ebbe67'};
function resinColor(die){
 if(die.surface==='glow')return glowPalette(die).resin;
 return POLISHED_COLORS[die.surface]??die.color;
}
function glowIntensity(){return darkRoom.checked ? .92:.15}
function updateDarkRoom(){
 felt.closest('.stage').classList.toggle('dice-dark-room',darkRoom.checked);
 if(!hemisphereLight)return;
 hemisphereLight.intensity=darkRoom.checked ? .075:2.3;
 keyLight.intensity=darkRoom.checked ? .12:2.8;
 for(const {mesh,halo} of objects){
  if(halo)for(const material of mesh.material)material.emissiveIntensity=glowIntensity();
 }
}
darkRoom.addEventListener('change',updateDarkRoom);
const floatingLabels=document.createElement('div');
floatingLabels.id='diceFloatingLabels';floatingLabels.setAttribute('aria-hidden','true');
felt.append(floatingLabels);
let diceLabelNodes=[];
function refreshFloatingLabels(){
 floatingLabels.replaceChildren();
 diceLabelNodes=diceSettings.map((d,i)=>{
  const span=document.createElement('span');span.className='dice-floating-label';
  span.textContent='';span.hidden=true;span.dataset.dieIndex=String(i);
  floatingLabels.append(span);return span;
 });
}
function positionFloatingLabels(){
 if(!ready||!camera||!objects.length)return;
 const rect=felt.getBoundingClientRect();
 if(!rect.width||!rect.height)return;
 // Use exactly the same rules as the diagram editor.
 const {mode,position}=globalThis.TabulaDiceLabels.preferences(document);
 const labelDice={mode:current.id,settings:diceSettings};
 objects.forEach(({body,mesh},i)=>{
  const label=diceLabelNodes[i];if(!label)return;
  const text=globalThis.TabulaDiceLabels.labelFor(labelDice,i,mode);
  if(label.textContent!==text)label.textContent=text;
  const show=!!text&&!isHeldDie(i)&&!rolling&&mesh.visible;
  label.hidden=!show;
  if(!show)return;
  const p=body.translation(),projected=new THREE.Vector3(p.x,p.y,p.z).project(camera);
  label.style.left=((projected.x+1)*rect.width/2)+'px';
  label.style.top=((1-projected.y)*rect.height/2+(position==='above'?-32:position==='center'?-8:22))+'px';
 });
}
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
let world,contactEvents,scene,camera,renderer,ground,objects=[],rolling=false,frame=0;
let width=10,depth=6.6,lastTime=0,accumulator=0,rollTime=0,stableTime=0,ready=false,held=false,mixing=false,mixCount=0,mixTime=0;
const BASE_DICE_SCALE=0.56,FIXED_STEP=1/60;
const MIN_DICE_SIZE=100,MAX_DICE_SIZE=200,DEFAULT_DICE_SIZE=160;
const STANDARD_DICE_SCALE=BASE_DICE_SCALE*DEFAULT_DICE_SIZE/100;
let diceScale=STANDARD_DICE_SCALE;
const diceSizePercent=()=>Math.round(diceScale/BASE_DICE_SCALE*100);
const cubeSize=()=>1.05*diceScale;
const up=new THREE.Vector3(0,1,0);
const faceNormals=[
 new THREE.Vector3(1,0,0),new THREE.Vector3(-1,0,0),
 new THREE.Vector3(0,1,0),new THREE.Vector3(0,-1,0),
 new THREE.Vector3(0,0,1),new THREE.Vector3(0,0,-1)
];
const faceValues=[3,4,1,6,2,5]; // Three.js box material ordering: +X -X +Y -Y +Z -Z
const PLAIN_PIP_SPACING=.20;
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
function ichingLines(upper,lower){
 return [...bottomToTopTrigrams[lower-1],...bottomToTopTrigrams[upper-1]];
}
function hexagramSummary(upper,lower,line){
 if(![upper,lower,line].every(Number.isInteger))return null;
 const lines=ichingLines(upper,lower);
 const changed=lines.slice();changed[line-1]=1-changed[line-1];
 const nextLower=trigramIndex(changed.slice(0,3));
 const nextUpper=trigramIndex(changed.slice(3,6));
 return {primary:kingWen[upper-1][lower-1],changed:kingWen[nextUpper][nextLower],nextUpper,nextLower};
}
// Results are separate, colour-linked tiles instead of a string of
// numeric die indices. The D-label denotes the number of faces, and the
// large numeral is the outcome. Duplicate die types remain distinguishable
// by order and their corresponding coloured dots.
let recordedResults=null,heldSelection=null;
let inspectingDice=false;
function syncDiceInspection() {
 const button=document.getElementById('inspectCards');
 if(!button||!document.body.classList.contains('tabula-dice-mode'))return;
 const available=!rolling&&recordedResults?.some(Number.isInteger)===true;
 if(!available)inspectingDice=false;
 button.disabled=!available;
 button.setAttribute('aria-pressed',String(inspectingDice));
 const holder=document.getElementById('diceResultsHolder');
 holder.classList.toggle('dice-inspecting',inspectingDice);
 felt.classList.toggle('dice-inspecting',inspectingDice);
 holder.querySelectorAll('.dice-inspection-target').forEach(target=>{target.tabIndex=inspectingDice?0:-1});
}
function setDiceInspection(enabled) {
 inspectingDice=enabled&&recordedResults?.some(Number.isInteger)===true;
 syncDiceInspection();
}
function resultButton(node, label, open) {
 node.type='button';
 node.classList.add('dice-inspection-target');
 node.setAttribute('aria-label',label+'の解説');
 node.addEventListener('click',()=>{
  if(inspectingDice)window.TabulaTableTools?.openDiceDetail(open(),node);
 });
}
function dieDetail(index) {
 const value=recordedResults[index];
 const hexagram=current.id==='iching'?hexagramSummary(...recordedResults):null;
 const lines=hexagram?ichingLines(...recordedResults):null;
 return faceDetail(current.id,index,value,diceSettings[index],faceFigure(objects[index],value),hexagram?.primary,hexagram?.changed,lines);
}
function showResults(results=null){
 recordedResults=Array.isArray(results)?results.slice():null;
 values.replaceChildren();
 const h=current.id==='iching'&&results?hexagramSummary(...results):null;
 const lines=h?ichingLines(...results):null;
 const symbolic=current.result!=='sum';
 diceDOM.getElementById('result-tiles').classList.toggle('astro-results',symbolic);
 diceSettings.forEach((d,i)=>{
  const result=results?.[i];
  const tile=document.createElement(result==null?'div':'button');tile.className='result-die';
  const kind=document.createElement('span');kind.className='result-kind';
  const dot=document.createElement('span');dot.className='result-swatch';dot.style.background=d.ink||resinColor(d);
  const label=document.createElement('span');
  label.textContent=current.id==='normal'&&d.userLabel?d.userLabel+' · D'+d.sides:d.label;
  kind.append(dot,label);
  const symbol=document.createElement('span');symbol.className='result-number';
  const face=result==null?null:d.faces?.[result-1];
  symbol.textContent=result!=null?(face?.glyph===undefined?String(result):current.id==='astro'&&i===1?face.glyph+'\uFE0E':face.glyph):'—';
  tile.append(kind,symbol);
  if(symbolic){const desc=document.createElement('span');desc.className='astro-name';desc.textContent=face?.name||'未投擲';tile.append(desc);}
  if(result!=null)resultButton(tile,label.textContent+' '+(face?.name||result),()=>dieDetail(i));
  values.append(tile);
 });
 total.hidden=symbolic;
 if(!symbolic){total.replaceChildren();const t=document.createElement('span');t.textContent='合計';const sum=document.createElement('strong');const rolled=results?.filter(Number.isInteger);sum.textContent=rolled?.length?String(rolled.reduce((a,b)=>a+b,0)):'—';total.append(t,sum);}
 const reading=diceDOM.getElementById('hexagram-reading');reading.hidden=current.result!=='hexagram';
 if(h){
  const changing=results[2], moved=diceSettings[2].faces[changing-1].name;
  const changedLines=lines.map((yang,i)=>i+1===changing?1-yang:yang);
  const primary=document.createElement('button'),changed=document.createElement('button');
  const primaryContext=trigramNames[results[0]-1]+'上'+trigramNames[results[1]-1]+'下';
  const changedContext=trigramNames[h.nextUpper]+'上'+trigramNames[h.nextLower]+'下';
  const title=(role,n)=>role+' '+String.fromCodePoint(0x4dc0+n-1)+' 第'+n+'卦';
  primary.textContent=title('本卦',h.primary)+'（'+primaryContext+'）';
  changed.textContent=title('之卦',h.changed);
  resultButton(primary,'本卦',()=>hexagramDetail(h.primary,'本卦',lines,changing,primaryContext+' · '+moved+'が変化'));
  resultButton(changed,'之卦',()=>hexagramDetail(h.changed,'之卦',changedLines,changing,changedContext+' · 本卦の'+moved+'が変化'));
  reading.replaceChildren(primary,' · '+moved+' → ',changed);
 }else reading.textContent='本卦 —　·　動爻 —　·　之卦 —';
 syncDiceInspection();
}
function lockSettings(locked){diceDOM.getElementById('preset').disabled=locked;if(!locked&&current.id==='normal'){diceDOM.getElementById('iching-color-scheme').disabled=false;renderSettings();return;}diceDOM.getElementById('iching-color-scheme').disabled=locked;
 diceDOM.querySelectorAll('#fixed-use-settings input,#astro-colors input').forEach(input=>input.disabled=locked);
 diceDOM.querySelectorAll('#dice-settings input,#dice-settings select,#dice-settings button').forEach(el=>el.disabled=locked);}
const NORMAL_DICE_MAX=8;
function addNormalObject(index){
 const die=makeDie(index);
 const initial=die.body.translation();
 const clearance=die.radius+.1;
 const step=1.7*diceScale;
 const columns=Math.floor((width/2-clearance)/step),rows=Math.floor((depth/2-clearance)/step);
 for(let row=-rows;row<=rows;row++)for(let column=-columns;column<=columns;column++){
  const x=column*step,z=row*step;
  const fits=objects.every(other=>{
   const p=other.body.translation();
   return Math.hypot(p.x-x,p.z-z)>=other.radius+clearance;
  });
  if(fits){die.body.setTranslation({x,y:initial.y,z},true);die.mesh.visible=!held;return die}
 }
 die.mesh.visible=!held;
 return die;
}
function defaultNormalDie(){return {sides:6,color:'#c7b48d',surface:'standard',faceStyle:'ring-pips',markings:'number',label:'D6'}}
function renderSettings(){
 const host=diceDOM.getElementById('dice-settings');
 const panel=diceDOM.getElementById('normal-dice-panel');
 const fixed=diceDOM.getElementById('fixed-use-settings');
 panel.hidden=current.id!=='normal';
 host.hidden=panel.hidden;refreshFloatingLabels();
 fixed.hidden=!host.hidden;
 fixed.replaceChildren();
 if(host.hidden){
  host.replaceChildren();
  diceSettings.forEach(die=>fixed.append(dieUseControl(die,die.label+'を使う',apply=>{
   if(!ready||rolling||mixing)return;
   apply();
   if(held)setHand(activeDiceIndices());
   else syncHeldActions();
   emitDice();
  })));
  return;
 }
 renderNormalEditor(host,diceSettings,(apply,action,index)=>{
  if(!ready||rolling||mixing)return;
  const results=recordedResults?.slice();
  apply();
  if(action==='add'){
   objects.push(addNormalObject(index));results?.push(null);
  }else if(action==='remove'){
   destroyDie(objects[index]);objects.splice(index,1);results?.splice(index,1);
  }else if(action==='shape'||action==='appearance'){
   replaceDieAppearance(index,action==='appearance');
   if(action==='shape'&&results)results[index]=null;
  }
  refreshFloatingLabels();syncMeshes();
  showResults(results?.some(Number.isInteger)?results:null);
  if(held)setHand(activeDiceIndices());
  else syncHeldActions();
  emitDice();
 });
}
function normalSurface(surface){return ['ivory','brass','glow','obsidian','gold'].includes(surface)?surface:'standard'}
function normalFaceStyle(d){
 if(d.faceStyle==='ring-numerals'||d.faceStyle==='ring-pips')return d.sides===6?d.faceStyle:'ring-numerals';
 if(d.surface==='ring')return d.sides===6&&d.faceStyle!=='numerals'?'ring-pips':'ring-numerals';
 return d.faceStyle==='numerals'||d.sides!==6?'numerals':'pips';
}
function dieUseControl(die,name,change){
 const label=document.createElement('label');
 label.className='dice-use-control';
 const input=document.createElement('input');
 input.type='checkbox';input.checked=die.enabled!==false;
 input.setAttribute('aria-label',name);
 input.addEventListener('change',()=>change(()=>{die.enabled=input.checked}));
 label.append(input,document.createTextNode(current.id==='normal'?'使う':name));
 return label;
}
function renderNormalEditor(host,settings,change){
 host.replaceChildren();
 const redraw=()=>renderNormalEditor(host,settings,change);
 const toolbar=document.createElement('div');toolbar.className='dice-config-toolbar';
 const count=document.createElement('span');count.textContent='使用数：'+settings.length+'個';
 const add=document.createElement('button');add.type='button';add.textContent='＋ ダイスを追加';
 add.disabled=settings.length>=NORMAL_DICE_MAX;
 add.addEventListener('click',()=>{
  if(settings.length>=NORMAL_DICE_MAX)return;
  change(()=>settings.push(defaultNormalDie()),'add',settings.length);
  redraw();
 });
 toolbar.append(count,add);host.append(toolbar);
 settings.forEach((d,i)=>{
  const row=document.createElement('div');row.className='die-setting';
  const label=document.createElement('label');label.textContent='ダイス'+(i+1);
  const name=document.createElement('input');name.type='text';name.className='dice-custom-label';
  name.maxLength=36;name.value=d.userLabel||'';name.placeholder='ラベル（例：過去）';
  name.setAttribute('aria-label','ダイス'+(i+1)+'のラベル');
  name.addEventListener('change',()=>change(()=>{d.userLabel=name.value.trim().slice(0,36)},'label'));
  const sides=document.createElement('select');sides.setAttribute('aria-label','ダイス'+(i+1)+'の面数');
  for(const n of [6,8,10,12,20])sides.add(new Option('D'+n,String(n)));sides.value=String(d.sides);
  const material=document.createElement('select');material.className='material';material.setAttribute('aria-label','ダイス'+(i+1)+'の素材');
  for(const [key,name] of [['standard','樹脂'],['ivory','象牙風'],['brass','古真鍮'],['glow','蓄光'],['obsidian','黒曜石'],['gold','磨き金']])material.add(new Option(name,key));material.value=normalSurface(d.surface);
  const faceStyle=document.createElement('select');faceStyle.setAttribute('aria-label','ダイス'+(i+1)+'の目の表記');
  for(const [key,label] of [['numerals','数字（標準）'],['ring-numerals','数字（環状刻印）'],['pips','点'],['ring-pips','点（環状刻印）']])faceStyle.add(new Option(label,key));
  faceStyle.value=normalFaceStyle(d);
  const color=document.createElement('input');color.type='color';color.value=d.color;color.setAttribute('aria-label','ダイス'+(i+1)+'の色');
  const glowColor=document.createElement('select');
  glowColor.setAttribute('aria-label','ダイス'+(i+1)+'の発光色');
  for(const [key,{label}] of Object.entries(GLOW_COLORS))glowColor.add(new Option(label,key));
  glowColor.value=glowColorKey(d.glowColor);
  const remove=document.createElement('button');remove.type='button';remove.className='dice-remove';remove.textContent='×';remove.setAttribute('aria-label','ダイス'+(i+1)+'を削除');remove.disabled=settings.length===1;
  function refresh(){
   const cube=Number(sides.value)===6;
   for(const option of faceStyle.options)option.hidden=option.disabled=!cube&&option.value.endsWith('pips');
   if(!cube&&faceStyle.value==='pips')faceStyle.value='numerals';
   if(!cube&&faceStyle.value==='ring-pips')faceStyle.value='ring-numerals';
  }
  function syncColor(){
   const glowing=material.value==='glow';
   color.hidden=glowing||Object.hasOwn(POLISHED_COLORS,material.value);
   color.value=d.color;
   glowColor.hidden=!glowing;
   glowColor.value=glowColorKey(d.glowColor);
  }
  function update(){
   const nextSides=Number(sides.value);
   change(()=>{
    if(!color.hidden&&material.value!=='glow')d.color=color.value;
    if(material.value==='glow')d.glowColor=glowColor.value;
    d.sides=nextSides;d.surface=material.value;d.label='D'+nextSides;d.faceStyle=faceStyle.value;
   },nextSides!==d.sides?'shape':'appearance',i);
   syncColor();
  }
  sides.addEventListener('change',()=>{refresh();update();});
  material.addEventListener('change',update);
  faceStyle.addEventListener('change',update);
  color.addEventListener('change',update);
  glowColor.addEventListener('change',update);
  remove.addEventListener('click',()=>{
   if(settings.length===1)return;
   change(()=>settings.splice(i,1),'remove',i);
   redraw();
  });
  const use=dieUseControl(d,(d.userLabel||'ダイス'+(i+1))+'を使う',apply=>change(apply,'use',i));
  refresh();syncColor();row.append(label,name,sides,faceStyle,material,color,glowColor,use,remove);host.append(row);
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
   replaceDieAppearance(i);syncMeshes();showResults(recordedResults);
   status.textContent=held?'IN HAND — 色を変更しました':'READY TO COLLECT';emitDice();
  });
  label.append(text,input);host.append(label);
 });
}
function updateIChingColors(scheme){
 if(current.id!=='iching'||!ready||rolling||mixing)return;
 setIChingColors(diceSettings,scheme);ichingColorScheme=scheme;
 for(let i=0;i<2;i++){
  replaceDieAppearance(i);
 }
 syncMeshes();showResults(recordedResults);
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
 held=false;heldSelection=null;mixing=false;mixCount=0;
 diceDOM.getElementById('title').textContent=current.title;
 diceDOM.getElementById('subtitle').textContent=current.subtitle;
 diceDOM.getElementById('description').textContent=current.description;
 diceDOM.getElementById('table-corner-top').textContent='TABULA · '+(id==='normal'?'DICE':id==='astro'?'ASTRO':'I CHING')+(felt.dataset.diceRenderer==='2d'?' · 2D':'');
 diceDOM.getElementById('table-corner-bottom').textContent=id==='normal'?'RIGID BODY EXPERIMENT':id==='astro'?'ASTROLOGICAL DICE':'THE BOOK OF CHANGES';
 renderSettings();renderAstroColors();createDice();syncMeshes();showResults();
 collectButton.disabled=false;mixButton.disabled=true;button.disabled=true;status.textContent='READY TO COLLECT';
}
let pendingParentMode=null;

function captureDice(){
 if(!ready)return null;
 return {schema:1,mode:current.id,scale:diceScale,
  settings:diceSettings.map(d=>({sides:d.sides,color:d.color,surface:d.surface,label:d.label,
   ...(d.enabled===false?{enabled:false}:{}),
   ...(current.id==='normal'?{faceStyle:normalFaceStyle(d)}:{}),
   ...(d.surface==='glow'?{glowColor:glowColorKey(d.glowColor)}:{}),
   userLabel:typeof d.userLabel==='string'?d.userLabel.slice(0,36):''})),
  bounds:{width,depth},displayFaces:recordedResults?diceSettings.map((d,i)=>{
   const face=d.faces?.[recordedResults[i]-1];return face?{glyph:face.glyph,name:face.name}:null;
  }):null,
  scheme:ichingColorScheme,colors:astroDiceColors?.slice()||null,
  poses:objects.map(({body,mesh})=>{const p=body.translation(),q=body.rotation();return {
   p:{x:p.x,y:p.y,z:p.z},q:{x:q.x,y:q.y,z:q.z,w:q.w},visible:mesh.visible
  }}),held,...(heldSelection?{heldIndices:[...heldSelection]}:{}),results:recordedResults?.slice()||null,
  hexagram:current.id==='iching'&&recordedResults?hexagramSummary(...recordedResults):null,
  force:Number(forceSlider.value)};
}
let pendingRestore=null;
function restoreDice(saved,id,sizePercent){
 if(!ready){pendingRestore={saved,id};return}
 if(rolling||mixing)return;
 const valid=saved&&saved.schema===1&&saved.mode===id&&Array.isArray(saved.settings);
 const savedScale=valid&&Number.isFinite(saved.scale)&&saved.scale>0?saved.scale:STANDARD_DICE_SCALE;
 const percent=sizePercent??Math.round(savedScale/BASE_DICE_SCALE*100);
 diceScale=BASE_DICE_SCALE*Math.max(MIN_DICE_SIZE,Math.min(MAX_DICE_SIZE,percent))/100;
 const growing=sizePercent!==undefined&&diceScale>savedScale;
 // Table changes must not leak another table's customized astrological palette.
 astroDiceColors=valid&&id==='astro'&&Array.isArray(saved.colors)?saved.colors.slice():null;
 ichingColorScheme=valid&&id==='iching'&&saved.scheme==='redUpper'?'redUpper':'blackUpper';
 switchPreset(id);
 forceSlider.value=valid&&Number.isFinite(saved.force)?String(Math.max(0,Math.min(100,saved.force))):forceSlider.defaultValue;
 updateForceLabel();
 if(valid){
  if(id==='normal'&&saved.settings.length>=1&&saved.settings.length<=8){
   diceSettings=saved.settings.map(d=>({sides:[6,8,10,12,20].includes(d.sides)?d.sides:6,
    color:/^#[0-9a-f]{6}$/i.test(d.color)?d.color:'#c7b48d',
    surface:normalSurface(d.surface),glowColor:glowColorKey(d.glowColor),
    faceStyle:normalFaceStyle(d),
    markings:'number',label:'D'+d.sides,userLabel:typeof d.userLabel==='string'?d.userLabel.slice(0,36):''}));
  }
  if(id==='astro'&&Array.isArray(saved.colors)&&saved.colors.length===3){
   astroDiceColors=saved.colors.slice();diceSettings.forEach((d,i)=>{if(/^#[0-9a-f]{6}$/i.test(astroDiceColors[i]))d.color=astroDiceColors[i]});
  }
  if(id==='iching'&&['blackUpper','redUpper'].includes(saved.scheme)){
   ichingColorScheme=saved.scheme;setIChingColors(diceSettings,ichingColorScheme);
   diceDOM.getElementById('iching-color-scheme').value=ichingColorScheme;
  }
  diceSettings.forEach((die,i)=>{die.enabled=saved.settings[i]?.enabled!==false});
  objects.forEach(destroyDie);objects=[];createDice();
  if(Array.isArray(saved.poses)&&saved.poses.length===objects.length){
   objects.forEach(({body,mesh},i)=>{
    const {p,q,visible}=saved.poses[i]||{};
    if(p&&q&&[p.x,p.y,p.z,q.x,q.y,q.z,q.w].every(Number.isFinite)){
     const {x,z}=growing?body.translation():p;
     body.setTranslation({x,y:p.y*diceScale/savedScale,z},true);body.setRotation(q,true);
     body.setLinvel({x:0,y:0,z:0},true);body.setAngvel({x:0,y:0,z:0},true);
    }
    mesh.visible=visible!==false;
   });
  }
  held=!!saved.held;rolling=false;mixing=false;
  heldSelection=held?normalizeHeldSelection(saved.heldIndices):null;
  objects.forEach(({mesh},i)=>{if(isHeldDie(i))mesh.visible=false});
  syncHeldActions();
  showResults(Array.isArray(saved.results)&&saved.results.length===objects.length?saved.results:null);
  status.textContent=held?'IN HAND — 投げる準備ができました':'READY TO COLLECT';
  renderSettings();renderAstroColors();
 }else{
  recordedResults=null;held=false;rolling=false;mixing=false;
  collectButton.disabled=false;mixButton.disabled=true;button.disabled=true;
 }
 syncMeshes();updateDimensions();
 window.dispatchEvent(new Event('tabula:dice-size'));
}
function changeDiceSize(delta,reset){
 if(!ready||rolling||mixing||inspectingDice)return;
 const currentSize=diceSizePercent();
 const next=reset?DEFAULT_DICE_SIZE:Math.max(MIN_DICE_SIZE,Math.min(MAX_DICE_SIZE,currentSize+delta));
 if(next===currentSize)return;
 restoreDice(captureDice(),current.id,next);
 status.textContent='ダイスサイズを'+next+'%に変更しました。';
 emitDice();
}
function emitDice(){const v=captureDice();if(v)window.TabulaTableTools?.saveDice(v)}

window.TabulaDiceTable={
 snapshot:captureDice,
 sizePercent:diceSizePercent,
 sizeLimits:{min:MIN_DICE_SIZE,max:MAX_DICE_SIZE,standard:DEFAULT_DICE_SIZE},
 changeSize:changeDiceSize,
 setInspection:setDiceInspection,
 inspectionActive:()=>inspectingDice,
 editNormalDraft(host,settings){renderNormalEditor(host,settings,apply=>apply())},
 defaultNormalDie,
 restore:restoreDice,
 reset(id){
  if(!ready||rolling||mixing||current.id!==id)return false;
  const saved=captureDice();
  setDiceInspection(false);
  restoreDice({...saved,poses:null,results:null,held:false},id);
  emitDice();
  return true;
 },
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
 isReady(){return ready},
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
function faceTexture(value,color,surface){
 const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
 const c=canvas.getContext('2d');c.fillStyle=color;c.fillRect(0,0,256,256);
 const shade=c.createLinearGradient(0,0,256,256);shade.addColorStop(0,'#ffffff50');shade.addColorStop(.65,'#ffffff00');shade.addColorStop(1,'#0000003c');c.fillStyle=shade;c.fillRect(0,0,256,256);
 if(surface==='brass')drawBrassPatina(c,256,value);
 let col=0;const hex=color.slice(1),rgb=parseInt(hex,16),r=rgb>>16&255,g=rgb>>8&255,b=rgb&255;
 col=r*.299+g*.587+b*.114;
 c.fillStyle=col<140?'#f8eed6':'#25221f';
 for(const [x,y] of pipGrid[value]){
  const px=128+x*256*PLAIN_PIP_SPACING,py=128+y*256*PLAIN_PIP_SPACING;
  if(surface==='gold'){
   const recess=c.createLinearGradient(px,py-16,px,py+16);
   recess.addColorStop(0,'#6e471c');
   recess.addColorStop(.58,'#a97532');
   recess.addColorStop(1,'#fff0bd');
   c.fillStyle=recess;
  }else if(surface==='obsidian')c.fillStyle='#f1f0eb';
  c.beginPath();c.arc(px,py,16,0,Math.PI*2);c.fill();
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
function isDarkDiceColor(color){
 const rgb=parseInt(color.slice(1),16);
 return ((rgb>>16&255)*.299+(rgb>>8&255)*.587+(rgb&255)*.114)<140;
}
function ringInk(color,lightness,alpha=1){
 const rgb=parseInt(color.slice(1),16);
 const target=lightness>0?255:0,amount=Math.abs(lightness);
 const channels=[rgb>>16&255,rgb>>8&255,rgb&255].map(value=>Math.round(value+(target-value)*amount));
 return 'rgba('+channels.join(',')+','+alpha+')';
}
function drawCarvedNumeral(c,value,x,y,size,maxWidth,{
 ink='#2c241f',highlight='rgba(251,216,153,.7)',shadow='rgba(43,27,22,.72)',tilt=0
}={}){
 const scale=size/205,text=String(value);
 c.save();
 c.translate(x,y);
 c.rotate(tilt);
 c.textAlign='center';c.textBaseline='middle';
 c.font='900 '+size+'px Georgia,serif';
 c.lineJoin='round';
 c.strokeStyle=highlight;c.lineWidth=16*scale;
 c.strokeText(text,5*scale,10*scale,maxWidth);
 c.strokeStyle=shadow;c.lineWidth=9*scale;
 c.strokeText(text,-2*scale,-2*scale,maxWidth);
 c.fillStyle=ink;c.fillText(text,0,2*scale,maxWidth);
 c.restore();
}
function drawIvoryGrain(c,size,value){
 const random=seededRandom(9307+value*137);
 const glaze=c.createRadialGradient(size*.2,size*.16,0,size*.35,size*.32,size*.85);
 glaze.addColorStop(0,'rgba(255,248,227,.20)');
 glaze.addColorStop(.58,'rgba(255,241,208,.05)');
 glaze.addColorStop(1,'rgba(118,82,48,.14)');
 c.fillStyle=glaze;c.fillRect(0,0,size,size);

 // Slightly curved layers show through the polished surface.
 for(let layer=0;layer<10;layer++){
  const y=(layer*.115-.10)*size;
  const bend=(.13+random()*.08)*size;
  for(const [offset,width,color] of [
   [0,.032,'rgba(255,246,226,.055)'],
   [.014,.005,'rgba(110,76,58,.085)'],
   [.026,.003,'rgba(255,248,229,.08)']
  ]){
   const row=y+offset*size;
   c.beginPath();c.moveTo(-.08*size,row+.17*size);
   c.bezierCurveTo(size*.29,row-bend,size*.68,row-bend,size*1.08,row+.07*size);
   c.lineWidth=size*width;c.strokeStyle=color;c.stroke();
  }
 }
}
function drawBrassPatina(c,size,value){
 const random=seededRandom(18713+value*193);
 const shade=c.createLinearGradient(0,0,size,size);
 shade.addColorStop(0,'#402b1d55');shade.addColorStop(.38,'#edd49b35');
 shade.addColorStop(.56,'#fff0bb55');shade.addColorStop(1,'#372a226b');
 c.fillStyle=shade;c.fillRect(0,0,size,size);
 for(let i=0;i<42;i++){
  const x=random()*size,y=random()*size,r=(.025+random()*.085)*size;
  const spot=c.createRadialGradient(x,y,0,x,y,r);
  spot.addColorStop(0,i%3===0?'#3d56463b':'#33261e35');
  spot.addColorStop(1,'#33261e00');
  c.fillStyle=spot;c.fillRect(x-r,y-r,r*2,r*2);
 }
 for(let i=0;i<110;i++){
  const x=random()*size,y=random()*size;
  c.strokeStyle=i%2?'#fff0ba45':'#37271c38';c.lineWidth=.6+random();
  c.beginPath();c.moveTo(x,y);c.lineTo(x+(2+random()*24)*size/384,y-2);c.stroke();
 }
}
function finishTexture(value,color,material,dieIndex,numbered=false,surface=material){
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
 if(surface==='ivory')drawIvoryGrain(c,n,value);
 if(surface==='brass')drawBrassPatina(c,n,value);
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
 if(material==='archaic'||numbered){
  drawCarvedNumeral(c,value,n/2,n/2,205,280,{tilt:(random()-.5)*.12});
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
  const spacingX=ring?(value===6?82:86):n*PLAIN_PIP_SPACING;
  const spacingY=ring?(value===6?118:86):n*PLAIN_PIP_SPACING;
  for(const [px,py] of pipGrid[value]){
   const x=n/2+px*spacingX,y=n/2+py*spacingY;
   if(ring){
    // Alternate light and dark strokes without covering the face between them.
    for(const [inset,width,tone] of [[0,6,.72],[8,9,-.78],[17,5,.66],[24,5,-.68]]){
     c.beginPath();c.arc(x,y,pipR-inset,0,Math.PI*2);
     c.strokeStyle=ringInk(color,tone,.94);c.lineWidth=width;c.stroke();
    }
    c.beginPath();c.arc(x,y,13,0,Math.PI*2);
    c.fillStyle=ringInk(color,-.91);c.fill();
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
 camera.updateMatrixWorld();
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
function ringNumberTexture(value,color,sides,ringRadius,faceIndex,surface){
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
 if(surface==='ivory')drawIvoryGrain(c,n,value);
 if(surface==='brass')drawBrassPatina(c,n,value);
 // The mark must fit inside the actual polygon rather than the square
 // texture. Triangular D8/D20 faces use a narrower etched ring.
 const rad=Math.max(8,Math.min(190,ringRadius*(sides===8?.92:1)));
 const cx=256,cy=256;
 const ink=isDarkDiceColor(color)?ringInk(color,.78):ringInk(color,-.83);
 // Shade only the carved groove so the face texture remains visible inside it.
 c.beginPath();c.arc(cx,cy,rad*.82,0,Math.PI*2);
 c.strokeStyle=ringInk(color,-.69,.52);c.lineWidth=Math.max(3,rad*.095);c.stroke();
 c.beginPath();c.arc(cx,cy,rad*.86,Math.PI*.08,Math.PI*.92);
 c.strokeStyle=ringInk(color,.5,.68);c.lineWidth=Math.max(1.5,rad*.042);c.stroke();
 // Previous glyphs used only 0.74–0.92 of the ring radius in font
 // size and vanished at actual tabletop scale. Give the digit most of
 // the central field, including 10, 11 and 12 on D12.
 const twoDigits=value>=10;
 const fontSize=rad*(twoDigits?(sides===20?1.32:1.14):(sides===20?1.68:1.56));
 const maxWidth=rad*(twoDigits?(sides===20?1.53:1.36):1.00);
 drawCarvedNumeral(c,value,cx,cy,fontSize,maxWidth,{
  ink,highlight:ringInk(color,-.22,.35),shadow:ringInk(color,-.69,.72)
 });
 c.fillStyle=ink;
 if(value===6||value===9){
  const w=rad*.31;
  c.fillRect(cx-w/2,cy+fontSize*.34,w,Math.max(2,rad*.06));
 }
 const texture=new THREE.CanvasTexture(canvas);
 texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;
 return texture;
}
function numberTexture(value,color,sides,surface){
 const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
 const c=canvas.getContext('2d');
 c.fillStyle=color;c.fillRect(0,0,256,256);
 const shade=c.createLinearGradient(0,0,256,256);
 shade.addColorStop(0,'#ffffff45');shade.addColorStop(.7,'#ffffff00');shade.addColorStop(1,'#00000039');
 c.fillStyle=shade;c.fillRect(0,0,256,256);
 if(surface==='ivory')drawIvoryGrain(c,256,value);
 if(surface==='brass')drawBrassPatina(c,256,value);
 const ink=isDarkDiceColor(color)?'#fff1d8':'#2c241f';
 const fontSize=sides===10?(value>=10?59:72):sides===20?(value>=10?76:98):(value>=10?86:112);
 drawCarvedNumeral(c,value,128,128,fontSize,112,{ink});
 c.fillStyle=ink;
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
function polyScale(sides){return diceScale*(({8:1.17,10:1.24,12:1.14,20:1.50})[sides]||1)}
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
 const isRing=normalFaceStyle(die).startsWith('ring-');
 const materials=faces.map((_,i)=>makeFaceMaterial(die.surface,{
  map:die.markings==='astro'?astroTexture(die.faces[mappedValues[i]-1],astroDieIndex,die.color,rings[i]):
      die.markings==='engraved'?ichingTexture(die.faces[mappedValues[i]-1],astroDieIndex,die.ink,rings[i]):
      isRing?ringNumberTexture(mappedValues[i],color,sides,rings[i],i,die.surface):numberTexture(mappedValues[i],color,sides,die.surface),
  roughness:die.markings==='engraved'?.42:die.markings==='astro'?.84:die.surface==='brass'?.34:die.surface==='ivory'?.31:isRing?.88:.49,metalness:die.surface==='brass'?.5:0,side:THREE.DoubleSide
 }));
 const mesh=new THREE.Mesh(geometry,materials);
 return {mesh,solid,normals:faceNormals,values:mappedValues};
}
// RoundedBoxGeometry-style vertex shaping using the standard Three.js
// face groups and UV maps. This avoids a new dependency and keeps the
// numbers on their own cube faces. The collision cuboid stays unchanged.
function wornCubeGeometry(material){
 const segments=material==='standard'?24:6;
 const size=cubeSize();
 const geometry=new THREE.BoxGeometry(size,size,size,segments,segments,segments);
 const pos=geometry.getAttribute('position'),normals=geometry.getAttribute('normal'),half=size/2;
 const radius=size*(material==='wood'?.057:material==='standard'?.16:.09),inner=half-radius;
 for(let i=0;i<pos.count;i++){
  const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);
  const cx=Math.max(-inner,Math.min(inner,x));
  const cy=Math.max(-inner,Math.min(inner,y));
  const cz=Math.max(-inner,Math.min(inner,z));
  let dx=x-cx,dy=y-cy,dz=z-cz;
  const len=Math.hypot(dx,dy,dz)||1;
  pos.setXYZ(i,cx+radius*dx/len,cy+radius*dy/len,cz+radius*dz/len);
  // Smooth the transition across the separate textured faces.
  if(material==='standard')normals.setXYZ(i,dx/len,dy/len,dz/len);
 }
 pos.needsUpdate=true;
 if(material==='standard')normals.needsUpdate=true;
 else geometry.computeVertexNormals();
 return geometry;
}
function cubeFaceTexture(value,settings,dieIndex){
 const {surface,markings,faces,ink}=settings;
 const color=resinColor(settings);
 if(markings==='engraved')return ichingTexture(faces[value-1],dieIndex,ink);
 if(markings==='astro')return astroTexture(faces[value-1],dieIndex,color,160);
 const style=normalFaceStyle({...settings,sides:6});
 if(style==='ring-numerals')return ringNumberTexture(value,color,6,142,value-1+dieIndex*6,surface);
 if(style==='ring-pips')return finishTexture(value,color,'ring',dieIndex,false,surface);
 if(surface==='ivory')return finishTexture(value,color,surface,dieIndex,style==='numerals');
 if(surface==='brass')return style==='numerals'?numberTexture(value,color,6,surface):faceTexture(value,color,surface);
 return style==='numerals'?numberTexture(value,color,6,surface):faceTexture(value,color,surface);
}
let polishedEnvironment;
function polishedReflection(){
 if(polishedEnvironment)return polishedEnvironment;
 const canvas=document.createElement('canvas');
 canvas.width=256;canvas.height=128;
 const ctx=canvas.getContext('2d');
 const light=ctx.createLinearGradient(0,0,0,128);
 light.addColorStop(0,'#bdb9b2');
 light.addColorStop(.34,'#605f61');
 light.addColorStop(.65,'#29292d');
 light.addColorStop(1,'#141518');
 ctx.fillStyle=light;ctx.fillRect(0,0,256,128);
 ctx.fillStyle='#fffaf0';ctx.fillRect(35,18,72,29);
 ctx.fillStyle='#dce5f2';ctx.fillRect(172,31,21,49);
 polishedEnvironment=new THREE.CanvasTexture(canvas);
 polishedEnvironment.colorSpace=THREE.SRGBColorSpace;
 polishedEnvironment.mapping=THREE.EquirectangularReflectionMapping;
 return polishedEnvironment;
}
function makeFaceMaterial(surface,options){
 if(Object.hasOwn(POLISHED_COLORS,surface)){
  const gold=surface==='gold';
  return new THREE.MeshStandardMaterial({
   ...options,roughness:gold?.19:.15,metalness:gold?.79:0,
   envMap:polishedReflection(),envMapIntensity:gold?1.45:.95
  });
 }
 if(surface!=='glow')return new THREE.MeshStandardMaterial(options);
 return new THREE.MeshStandardMaterial({
  ...options,roughness:.63,emissive:0xffffff,emissiveMap:options.map,emissiveIntensity:glowIntensity()
 });
}
function createGlowHalo(radius,die){
 const key=glowColorKey(die.glowColor);
 if(!glowMaterials.has(key)){
  const {halo}=GLOW_COLORS[key];
  const canvas=document.createElement('canvas');
  canvas.width=canvas.height=128;
  const ctx=canvas.getContext('2d');
  const gradient=ctx.createRadialGradient(64,64,8,64,64,62);
  gradient.addColorStop(0,'rgba('+halo+',.32)');
  gradient.addColorStop(.48,'rgba('+halo+',.12)');
  gradient.addColorStop(1,'rgba('+halo+',0)');
  ctx.fillStyle=gradient;
  ctx.fillRect(0,0,128,128);
  const map=new THREE.CanvasTexture(canvas);
  map.colorSpace=THREE.SRGBColorSpace;
  glowGeometry??=new THREE.PlaneGeometry(1,1);
  glowMaterials.set(key,new THREE.MeshBasicMaterial({map,transparent:true,depthWrite:false,toneMapped:false}));
 }
 const halo=new THREE.Mesh(glowGeometry,glowMaterials.get(key));
 halo.rotation.x=-Math.PI/2;
 halo.scale.setScalar(radius*3.5);
 halo.visible=false;
 scene.add(halo);
 return halo;
}
// Keep the simulated weight contrast modest for mixed-material throws.
function diceDensity(surface){
 if(surface==='gold')return 5.6;
 if(surface==='brass')return 2.8;
 if(surface==='obsidian')return 1.5;
 if(surface==='ivory')return 1.15;
 return 1;
}
function makeDie(i){
 const settings=diceSettings[i],sides=settings.sides;
 const half=cubeSize()/2,dieSpacing=1.65*diceScale;
 let mesh,solid=null,normals,faceNumbers;
 if(sides===6){
  const geometry=wornCubeGeometry(settings.markings==='number'?'standard':settings.surface);
  const materials=faceValues.map(n=>makeFaceMaterial(settings.surface,{
   map:cubeFaceTexture(n,settings,i),
   roughness:settings.markings==='engraved'?.42:settings.surface==='brass'?.34:settings.surface==='ivory'?.31:settings.surface==='wood'?.94:settings.surface==='standard'?.47:.88,metalness:settings.surface==='brass'?.5:0
  }));
  mesh=new THREE.Mesh(geometry,materials);normals=faceNormals;faceNumbers=faceValues;
 }else{
  const poly=numberedMesh(sides,resinColor(settings),settings.surface,i);
  mesh=poly.mesh;solid=poly.solid;normals=poly.normals;faceNumbers=poly.values;
 }
 mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);
 const body=world.createRigidBody(RAPIER.RigidBodyDesc.dynamic()
  .setTranslation((i-(diceSettings.length-1)/2)*dieSpacing,Math.max(1.15,half+.4),0)
  .setLinearDamping(.13).setAngularDamping(.23).setCanSleep(true).setCcdEnabled(true));
 const collider=sides===6?
  RAPIER.ColliderDesc.cuboid(half,half,half):
  RAPIER.ColliderDesc.convexHull(new Float32Array(solid.vertices.flat()));
 if(!collider)throw Error('Convex collider failed for D'+sides);
 world.createCollider(collider.setRestitution(.38).setFriction(.76).setDensity(diceDensity(settings.surface))
  .setActiveEvents(RAPIER.ActiveEvents.CONTACT_FORCE_EVENTS),body);
 // max radial extent, including cube vertices, for wall clearance.
 const radius=sides===6?Math.sqrt(3)*half:
  Math.max(...solid.vertices.map(v=>Math.hypot(...v)));
 // Present the five dice on the cloth before the first throw.
 // Rapier is paused until rolling starts, so the initial pose should
 // place each solid exactly on the surface instead of floating.
 const lowest=sides===6?-half:Math.min(...solid.vertices.map(v=>v[1]));
 const columns=Math.min(4,diceSettings.length),col=i%columns,row=Math.floor(i/columns),rows=Math.ceil(diceSettings.length/columns);
  body.setTranslation({x:(col-(columns-1)/2)*dieSpacing,y:-lowest+.02,z:(row-(rows-1)/2)*dieSpacing},true);
 const halo=settings.surface==='glow'?createGlowHalo(radius,settings):null;
 return {mesh,body,normals,faceNumbers,sides,radius,halo};
}
function replaceDieAppearance(index,keepPose=true){
 const previous=objects[index];
 const position=previous.body.translation(),rotation=previous.body.rotation();
 const visible=previous.mesh.visible;
 destroyDie(previous);
 const next=makeDie(index);
 if(keepPose){
  next.body.setTranslation(position,true);
  next.body.setRotation(rotation,true);
 }else{
  next.body.setTranslation({x:position.x,y:next.body.translation().y,z:position.z},true);
 }
 next.mesh.visible=visible;
 objects[index]=next;
}
function destroyDie(obj){
 if(!obj)return;
 world.removeRigidBody(obj.body);
 scene.remove(obj.mesh);
 if(obj.halo)scene.remove(obj.halo);
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
function normalizeHeldSelection(indices){
 if(!Array.isArray(indices))return null;
 const selected=new Set(indices.filter(i=>Number.isInteger(i)&&objects[i]));
 return selected.size&&selected.size<objects.length?selected:null;
}
function isHeldDie(index){return held&&(!heldSelection||heldSelection.has(index))}
function activeDiceIndices(){
 return diceSettings.flatMap((die,i)=>die.enabled===false?[]:[i]);
}
function syncHeldActions(){
 collectButton.disabled=held||!activeDiceIndices().length;
 mixButton.disabled=!held;button.disabled=!held;
}
function setHand(indices){
 held=indices.length>0;
 heldSelection=normalizeHeldSelection(indices);
 objects.forEach(({mesh},i)=>{mesh.visible=!isHeldDie(i)&&Number.isInteger(recordedResults?.[i])});
 syncHeldActions();
 mixCount=0;
 mixButton.textContent='⟳　混ぜる';
 mixButton.setAttribute('aria-pressed','false');
 status.textContent=held?'IN HAND — '+indices.length+'個を手に取っています':'設定で使うダイスを選んでください';
}
function collectDice(){
 if(inspectingDice||!ready||rolling||mixing||held)return;
 const indices=activeDiceIndices();
 if(!indices.length)return;
 setHand(indices);
 emitDice();
}
// Mix the very same 3D meshes used for the physical throw, at full size.
// Rapier is not stepped while the dice are held; these are visual poses only.
// A free-running, user-controlled in-hand mixing action.
// The full-size meshes represent dice tossed upward from an unseen palm;
// Rapier is deliberately paused, and the final numbers are determined on throw.
function startMix(){
 if(inspectingDice||!ready||rolling||!held||mixing)return;
 mixing=true;mixCount++;mixTime=0;
 button.disabled=true;
 mixButton.textContent='⟳　混ぜる';
 mixButton.setAttribute('aria-pressed','true');
 objects.forEach(({mesh},i)=>{if(isHeldDie(i)){mesh.visible=true;mesh.castShadow=false}});
 status.textContent='MIXING… — 押している間だけ混ぜます';
}
function stopMix(){
 if(!mixing)return;
 mixing=false;
 objects.forEach(({mesh},i)=>{if(isHeldDie(i)){mesh.visible=false;mesh.castShadow=true}});
 mixButton.textContent='⟳　混ぜる';
 mixButton.setAttribute('aria-pressed','false');
 button.disabled=false;
 status.textContent='IN HAND — 混ぜ終わりました（'+mixCount+'回）';
 syncMeshes();
 emitDice();
}
function bindMixHold(control){
 if(!control)return;
 let pointer=null,keyboard=null;
 const endPointer=(event)=>{
  if(pointer===null||event?.pointerId!==pointer)return;
  pointer=null;stopMix();
 };
 control.addEventListener('pointerdown',event=>{
  if(event.button!==0||!event.isPrimary||control.disabled)return;
  event.preventDefault();
  pointer=event.pointerId;
  control.setPointerCapture?.(event.pointerId);
  startMix();
 });
 control.addEventListener('pointerup',endPointer);
 control.addEventListener('pointercancel',endPointer);
 control.addEventListener('lostpointercapture',endPointer);
 control.addEventListener('keydown',event=>{
  if(event.key!==' '&&event.key!=='Enter')return;
  event.preventDefault();
  if(event.repeat||keyboard!==null||control.disabled)return;
  keyboard=event.key;startMix();
 });
 control.addEventListener('keyup',event=>{
  if(keyboard!==event.key)return;
  event.preventDefault();keyboard=null;stopMix();
 });
 control.addEventListener('blur',()=>{pointer=null;keyboard=null;stopMix()});
 // Accessibility-generated click alone cannot be held; it does not start a mix.
 control.addEventListener('click',event=>event.preventDefault());
 window.addEventListener('pointerup',event=>{if(pointer===event.pointerId){pointer=null;stopMix()}});
 window.addEventListener('pointercancel',event=>{if(pointer===event.pointerId){pointer=null;stopMix()}});
 window.addEventListener('blur',()=>{pointer=null;keyboard=null;stopMix()});
 document.addEventListener('visibilitychange',()=>{
  if(document.hidden){pointer=null;keyboard=null;stopMix()}
 });
}
function animateMix(dt){
 mixTime+=dt;
 const t=mixTime;
 // A vertical toss roughly every 0.9 seconds: lift, apex, catch,
 // then another toss. Each die has a distinct lateral position and
 // slightly staggered flight, so they never fuse.
 const period=.92;
 const hand=objects.filter((_,i)=>isHeldDie(i));
 hand.forEach(({mesh},i)=>{
  const phase=((t+i*.075)%period)/period;
  const tossHeight=4*phase*(1-phase); // a smooth rise and fall, 0 at catches
  const orbit=t*2.7+i*2*Math.PI/hand.length;
  const r=1.10+Math.sin(t*4.4+i)*.10;
  const x=Math.cos(orbit)*r;
  const z=Math.sin(orbit)*r*.77;
  mesh.position.set(x,1.15+2.35*tossHeight,z);
  // The upward throw has real visible somersaults. Faces remain attached
  // to the actual 3D cubes, as during a Rapier throw.
  mesh.rotation.set(t*9+i*2.1,t*7+i*2.4,t*8+i*1.9);
 });
}
let rollSelection=null;
function releaseDice(options={}){
 if(inspectingDice||!ready||rolling||mixing||!held)return false;
 rollSelection=heldSelection;
 heldSelection=null;
 window.TabulaTableTools?.prepareDiceSound?.();
 held=false;
 rolling=true;rollTime=0;stableTime=0;accumulator=0;
 lockSettings(true);
 collectButton.disabled=true;button.disabled=true;mixButton.disabled=true;
 syncDiceInspection();
 status.textContent='ROLLING…';
 const dir=options.direction||{x:0,y:-1};
 const length=Math.hypot(dir.x,dir.y)||1;
 const dx=dir.x/length,dz=dir.y/length;
 const power=currentForce()*(options.gestureBoost??1);
 // The launch is beyond the near/opposite table edge, then enters toward its centre.
 // In 3D, the edge is a low wall; spawn just inside the tabletop and above it,
 // with horizontal momentum aimed in the dragged direction.
 const tx=-dz,tz=dx;
 const throwing=objects.filter((_,i)=>!rollSelection||rollSelection.has(i));
 const maxRadius=Math.max(...throwing.map(d=>d.radius));
 if(rollSelection)objects.forEach(({body,mesh},i)=>{
  if(rollSelection.has(i))return;
  mesh.visible=Number.isInteger(recordedResults?.[i]);
  if(mesh.visible)body.setBodyType(RAPIER.RigidBodyType.Fixed,false);
  else body.setEnabled(false);
 });
 throwing.forEach(({body,mesh,radius},i)=>{
  const lateralCapacity=Math.max(.35,Math.min(width,depth)/2-maxRadius-.37);
  const spacing=throwing.length>1?Math.min(1.43,2*lateralCapacity/(throwing.length-1)):0;
  const offset=(i-(throwing.length-1)/2)*spacing;
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
 return true;
}
function stepDicePhysics(){
 let strongest=0;
 while(accumulator>=FIXED_STEP){
  world.step(contactEvents);
  contactEvents.drainContactForceEvents(event=>{
   const first=world.getCollider(event.collider1())?.parent();
   const second=world.getCollider(event.collider2())?.parent();
   const mass=Math.min(first?.isDynamic()?first.mass():Infinity,second?.isDynamic()?second.mass():Infinity);
   const speedChange=event.totalForceMagnitude()*FIXED_STEP/mass;
   // Ignore resting contact and light chatter as a die settles.
   if(Number.isFinite(speedChange)&&speedChange>.65)strongest=Math.max(strongest,speedChange);
  });
  accumulator-=FIXED_STEP;
 }
 if(strongest)window.TabulaTableTools?.playDiceImpact?.(Math.min(1,Math.sqrt((strongest-.32)/5.5)));
}
function render(time){
 frame=requestAnimationFrame(render);
 if(!document.body.classList.contains('tabula-dice-mode'))return;
 const dt=Math.min(.05,lastTime?(time-lastTime)/1000:0);lastTime=time;
 if(ready&&mixing)animateMix(dt);
 if(ready&&rolling){
  accumulator=Math.min(.12,accumulator+dt);
  stepDicePhysics();
  syncMeshes();
  if(rolling){
   rollTime+=dt;
   const stopped=objects.every(({body},i)=>(rollSelection&&!rollSelection.has(i))||body.isSleeping()||(
    body.linvel().x**2+body.linvel().y**2+body.linvel().z**2<.008
    &&body.angvel().x**2+body.angvel().y**2+body.angvel().z**2<.02
   ));
   stableTime=stopped?stableTime+dt:0;
   if(stableTime>.50||rollTime>12){
    rolling=false;syncHeldActions();
    lockSettings(false);
    const results=objects.map((die,i)=>!rollSelection||rollSelection.has(i)?topFace(die):recordedResults?.[i]??null);
    if(rollSelection)objects.forEach(({body,mesh},i)=>{
     if(rollSelection.has(i))return;
     if(mesh.visible)body.setBodyType(RAPIER.RigidBodyType.Dynamic,false);
     else body.setEnabled(true);
    });
    rollSelection=null;
    showResults(results);
    window.TabulaTableTools?.completeDiceRoll?.();
    status.textContent='THE DICE HAVE FALLEN';emitDice();
   }
  }
 }
 positionFloatingLabels();
 for(const {mesh,halo} of objects){
  if(!halo)continue;
  halo.visible=darkRoom.checked&&mesh.visible;
  if(halo.visible)halo.position.set(mesh.position.x,.012,mesh.position.z);
 }
 renderer.render(scene,camera);
}
function createCanvasDiceRenderer(){
 const canvas=document.createElement('canvas');
 const ctx=canvas.getContext('2d');
 if(!ctx)throw new Error('2Dキャンバスを開始できませんでした。');
 let w=0,h=0,ratio=1;
 function resize(){
  canvas.width=Math.round(w*ratio);
  canvas.height=Math.round(h*ratio);
  ctx.setTransform(ratio,0,0,ratio,0,0);
 }
 const projected=new THREE.Vector3();
 const hitAreas=[];
 return {
  domElement:canvas,
  pickDie(x,y){
   ctx.save();ctx.setTransform(1,0,0,1,0,0);
   const hit=hitAreas.findLast(area=>ctx.isPointInPath(area.shape,x*w-area.x,y*h-area.y));
   ctx.restore();
   return hit?.index ?? -1;
  },
  setSize(width,height){w=width;h=height;resize()},
  setPixelRatio(value){if(ratio!==value){ratio=value;resize()}},
  render(_scene,camera){
   ctx.clearRect(0,0,w,h);
   hitAreas.length=0;
   for(const [i,object] of objects.entries()){
    const {mesh,sides,radius,faceNumbers}=object;
    if(!mesh.visible)continue;
    const inMotion=(mixing&&isHeldDie(i))||(rolling&&(!rollSelection||rollSelection.has(i)));
    const value=(inMotion?null:recordedResults?.[i])??topFace(object);
    projected.copy(mesh.position).project(camera);
    const size=radius*w/(camera.right-camera.left)*1.35;
    ctx.save();
    const x=(projected.x+1)*w/2,y=(1-projected.y)*h/2;
    ctx.translate(x,y);
    ctx.shadowColor='#0009';ctx.shadowBlur=7;ctx.shadowOffsetY=4;
    const shape=new Path2D();
    if(sides===6)shape.roundRect(-size/2,-size/2,size,size,size*.12);
    else {
     const corners=sides===8||sides===20?3:sides===12?5:4;
     for(let corner=0;corner<corners;corner++){
      const angle=corner*Math.PI*2/corners-Math.PI/2;
      shape.lineTo(Math.cos(angle)*size*.65,Math.sin(angle)*size*.65);
     }
     shape.closePath();
    }
    hitAreas.push({shape,x,y,index:i});
    const die=diceSettings[i];
    const baseColor=resinColor(die);
    const glowing=die.surface==='glow';
    if(darkRoom.checked&&glowing){
     ctx.shadowColor='rgba('+glowPalette(die).halo+',.6)';ctx.shadowBlur=size*.28;ctx.shadowOffsetY=0;
    }
    if(darkRoom.checked&&!glowing)ctx.filter='brightness(0.25)';
    ctx.fillStyle=baseColor;ctx.fill(shape);
    ctx.shadowColor='transparent';
    const texture=mesh.material[faceNumbers.indexOf(value)]?.map?.image;
    if(sides===6&&texture){
     ctx.clip(shape);ctx.drawImage(texture,-size/2,-size/2,size,size);
    }else{
     ctx.strokeStyle='#0006';ctx.lineWidth=1;ctx.stroke(shape);
     const rgb=parseInt(baseColor.slice(1),16);
     const luminance=(rgb>>16)*.299+(rgb>>8&255)*.587+(rgb&255)*.114;
     ctx.fillStyle=die.ink||(luminance<140?'#fff1d8':'#241d17');
     ctx.font='bold '+Math.max(10,size*.42)+'px Georgia, serif';
     ctx.textAlign='center';ctx.textBaseline='middle';
     ctx.fillText(die.faces?.[value-1]?.glyph??String(value),0,sides===8||sides===20?size*.12:0);
    }
    ctx.restore();
   }
  }
 };
}
function createDiceRenderer(){
 for(const antialias of [true,false]){
  const canvas=document.createElement('canvas');
  const context=canvas.getContext('webgl2',{alpha:true,antialias});
  if(context)return new THREE.WebGLRenderer({canvas,context,alpha:true,antialias});
 }
 throw new Error('WebGL 2 を開始できませんでした。');
}
async function init(){
 let stage='物理エンジン';
 try{
  await RAPIER.init();
  world=new RAPIER.World({x:0,y:-15,z:0});
  world.timestep=FIXED_STEP;
  contactEvents=new RAPIER.EventQueue(true);
  world.createCollider(RAPIER.ColliderDesc.cuboid(100,.2,100).setTranslation(0,-.2,0).setFriction(.86).setRestitution(.28));
  stage='3D描画（WebGL 2）';
  scene=new THREE.Scene();
  camera=new THREE.OrthographicCamera(-5,5,3,-3,.1,100);
  try{
   renderer=createDiceRenderer();
   renderer.setClearColor(0,0);
   renderer.shadowMap.enabled=true;
   renderer.shadowMap.type=THREE.PCFSoftShadowMap;
   renderer.outputColorSpace=THREE.SRGBColorSpace;
  }catch(error){
   console.warn('ダイスの表示を2Dに切り替えました。',error);
   stage='2D描画';
   renderer=createCanvasDiceRenderer();
   diceDOM.getElementById('table-corner-top').append(' · 2D');
   felt.setAttribute('data-dice-renderer','2d');
  }
  felt.prepend(renderer.domElement);
  hemisphereLight=new THREE.HemisphereLight(0xe1efe8,0x1a3427,2.3);
  keyLight=new THREE.DirectionalLight(0xffe9c5,2.8);
  const key=keyLight;key.position.set(-4,17,-6);
  scene.add(hemisphereLight);updateDarkRoom();
  key.castShadow=true;key.shadow.mapSize.set(1024,1024);
  key.shadow.camera.left=-10;key.shadow.camera.right=10;key.shadow.camera.top=10;key.shadow.camera.bottom=-10;
  key.shadow.normalBias=.018;key.shadow.bias=-.0002;key.shadow.radius=3;scene.add(key);
  ground=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.ShadowMaterial({opacity:.24}));
  ground.rotation.x=-Math.PI/2;ground.position.y=.007;ground.receiveShadow=true;scene.add(ground);
  stage='ダイスの生成';
  updateDimensions();
  createDice();syncMeshes();
  ready=true;collectButton.disabled=false;mixButton.disabled=true;button.disabled=true;status.textContent='READY TO COLLECT';
  frame=requestAnimationFrame(render);
  if(pendingParentMode&&current.id!==pendingParentMode){diceDOM.getElementById('preset').value=pendingParentMode;switchPreset(pendingParentMode)}
  new ResizeObserver(updateDimensions).observe(felt);
  if(pendingRestore){const request=pendingRestore;pendingRestore=null;restoreDice(request.saved,request.id)}
 }catch(error){
  console.error(error);
  status.textContent=stage+'の初期化に失敗しました';
  status.title=error?.message||'';
  failure.hidden=false;
  failure.textContent=status.textContent+'。'+status.title;
 }
}
collectButton.addEventListener('click',()=>collectDice());
bindMixHold(mixButton);
bindMixHold(document.getElementById('diceQuickMix'));
button.addEventListener('click',()=>releaseDice());
const guide=diceDOM.getElementById('throwGuide'),startPoint=diceDOM.getElementById('startPoint'),line=diceDOM.getElementById('throwLine'),arrow=diceDOM.getElementById('throwArrow');
let gesture=null,suppressClick=false;
const diceRaycaster=new THREE.Raycaster();
function pickTableDie(event) {
 const rect=renderer.domElement.getBoundingClientRect();
 if(!rect.width||!rect.height)return -1;
 const x=(event.clientX-rect.left)/rect.width,y=(event.clientY-rect.top)/rect.height;
 if(renderer.pickDie)return renderer.pickDie(x,y);
 diceRaycaster.setFromCamera({x:2*x-1,y:1-2*y},camera);
 const meshes=objects.filter(object=>object.mesh.visible).map(object=>object.mesh);
 const hit=diceRaycaster.intersectObjects(meshes,false)[0];
 return hit?objects.findIndex(object=>object.mesh===hit.object):-1;
}
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
 if(event.isPrimary)suppressClick=false;
 if(inspectingDice||!ready||rolling||!held||mixing||!event.isPrimary||event.button!==0)return;
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
felt.addEventListener('click',event=>{
 if(suppressClick){suppressClick=false;return}
 if(inspectingDice){
  const index=pickTableDie(event);
  if(Number.isInteger(recordedResults?.[index]))window.TabulaTableTools?.openDiceDetail(dieDetail(index),felt);
  return;
 }
 if(held)releaseDice();else collectDice();
});
felt.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();if(inspectingDice)return;if(held)releaseDice();else collectDice()}});
init();
