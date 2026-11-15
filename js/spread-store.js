/* TABULA SORTIUM — custom spread storage rules. */
(function(root){'use strict';
function validSpread(v){
  return !!(v&&typeof v.id==='string'&&Array.isArray(v.slots)
    &&v.slots.length<=52&&v.slots.every(q=>Number.isFinite(q.x)&&Number.isFinite(q.y)&&Number.isFinite(q.angle)&&(!q.frameRole||['card','pile','tableau','foundation','waste','discard'].includes(q.frameRole))));
}
function fromReading(reading,id,name){
 if(!reading||!Array.isArray(reading.placed))throw Error('占例の配置を読み取れません。');
 const recorded=Array.isArray(reading.slots)&&reading.slots.length?reading.slots:null;
 const fallback=recorded?null:[
  ...reading.placed.map((p,i)=>({...p,_order:i,frameRole:'card'})),
  ...(reading.tablePiles||[]).map((p,i)=>({...p,_order:reading.placed.length+i,frameRole:p.role||'pile'}))
 ].sort((a,b)=>(Number.isInteger(a.slot)?a.slot:1e5)-(Number.isInteger(b.slot)?b.slot:1e5)||a._order-b._order);
 const source=recorded||fallback;
 if(!source?.length||source.length>52)throw Error('登録できる配置位置がありません（上限52位置）。');
 const slots=source.map((p,i)=>{
  const slot={x:p.x,y:p.y,angle:p.angle??0,name:typeof p.name==='string'&&p.name.trim()?p.name:'位置'+(i+1)};
  if(typeof p.detail==='string')slot.detail=p.detail;
  if(typeof p.frameRole==='string'&&p.frameRole!=='card')slot.frameRole=p.frameRole;
  return slot;
 });
 const size=reading.settings?.cardSize;
 const result={id,name,slots,...(typeof size==='number'&&Number.isFinite(size)&&size>=.8&&size<=2.3?{cardSize:size}:{})};
 if(!validSpread(result)||!slots.length||slots.some(s=>typeof s.name!=='string'||s.name.length>200))throw Error('占例の位置情報が不正です。');
 return result;
}
/* Portable single-spread JSON. Does not include cards, readings or table state.
   Also accepts the bare {name,slots,...} format from early shared spreads. */
const PORTABLE_FORMAT='tabula-sortium';
function portableSpread(v){
 if(!v||typeof v!=='object'||Array.isArray(v))throw Error('スプレッド情報がありません。');
 const name=typeof v.name==='string'?v.name.trim():'';
 if(!name||name.length>100)throw Error('スプレッド名が不正です。');
 if(!Array.isArray(v.slots)||v.slots.length<1||v.slots.length>52)throw Error('配置数は1〜52にしてください。');
 const slots=v.slots.map((q,i)=>{
  if(!q||typeof q!=='object'||Array.isArray(q)||![q.x,q.y,q.angle].every(Number.isFinite)
    ||q.x<0||q.x>100||q.y<0||q.y>100||Math.abs(q.angle)>3600)
   throw Error('位置'+(i+1)+'の座標・角度が不正です。');
  if(q.frameRole!==undefined&&!['card','pile','tableau','foundation','waste','discard'].includes(q.frameRole))
   throw Error('位置'+(i+1)+'の種類が不正です。');
  const label=typeof q.name==='string'?q.name.trim():'位置'+(i+1);
  if(!label||label.length>200)throw Error('位置名が不正です。');
  if(q.detail!==undefined&&(typeof q.detail!=='string'||q.detail.length>3000))throw Error('位置の説明が長すぎます。');
  return {x:q.x,y:q.y,angle:q.angle,name:label,
   ...(typeof q.detail==='string'?{detail:q.detail}:{}),
   ...(q.frameRole&&q.frameRole!=='card'?{frameRole:q.frameRole}:{})};
 });
 const meta={};
 for(const field of ['alternate','author','source','overview','method','notes']){
  if(v[field]!==undefined){
   const limit=['alternate','author'].includes(field)?120:field==='source'?500:4000;
   if(typeof v[field]!=='string'||v[field].length>limit)throw Error('解説情報が不正です。');
   meta[field]=v[field];
  }
 }
 if(v.cardSize!==undefined&&(!Number.isFinite(v.cardSize)||v.cardSize<.8||v.cardSize>2.3))
  throw Error('カードサイズが不正です。');
 return {name,slots,...meta,...(v.cardSize===undefined?{}:{cardSize:v.cardSize})};
}
function exportPortable(v){
 return {format:PORTABLE_FORMAT,kind:'spread',version:1,spread:portableSpread(v)};
}
function importPortable(data){
 const wrapped=data&&data.format===PORTABLE_FORMAT&&data.kind==='spread'&&data.version===1;
 if(data&&('format' in Object(data)||'kind' in Object(data))&&!wrapped)
  throw Error('対応していないスプレッドJSONです。');
 return portableSpread(wrapped?data.spread:data);
}
function read(storage,key){
  try{
    const entries=JSON.parse(storage.getItem(key)||'[]');
    return Array.isArray(entries)?entries.filter(validSpread).slice(0,100):[];
  }catch(e){return []}
}
function write(storage,key,items){
  storage.setItem(key,JSON.stringify(items));
}
root.TabulaSpreadStore=Object.freeze({validSpread,fromReading,read,write,portableSpread,exportPortable,importPortable});
})(globalThis);
