/* TABULA SORTIUM — custom spread storage rules. */
(function(root){'use strict';
function validSpread(v){
  return !!(v&&typeof v.id==='string'&&Array.isArray(v.slots)
    &&v.slots.length<=52&&v.slots.every(q=>Number.isFinite(q.x)&&Number.isFinite(q.y)&&Number.isFinite(q.angle)));
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
root.TabulaSpreadStore=Object.freeze({validSpread,read,write});
})(globalThis);
