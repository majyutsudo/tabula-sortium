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
function read(storage,key){
  try{
    const entries=JSON.parse(storage.getItem(key)||'[]');
    return Array.isArray(entries)?entries.filter(validSpread).slice(0,100):[];
  }catch(e){return []}
}
function write(storage,key,items){
  storage.setItem(key,JSON.stringify(items));
}
root.TabulaSpreadStore=Object.freeze({validSpread,fromReading,read,write});
})(globalThis);
