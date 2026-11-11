/* TABULA SORTIUM — stable identity compatibility layer for legacy card state.
   Keeps physical instanceId independent of position/order, without replacing
   the live UI's state model. Existing one-copy-per-face deck contract only. */
(function(root){'use strict';
function fail(msg){throw Error('Physical identity: '+msg)}
function preserveCard(c){
 if(!c||typeof c.id!=='string'||!c.id)fail('invalid card');
 const result={id:c.id,reversed:!!c.reversed,instanceId:c.instanceId||'A:'+c.id};
 if(c.sourceDeck)result.sourceDeck=c.sourceDeck;
 return result;
}
function ensureSingle(state){
 if(!state||!Array.isArray(state.deck)||!Array.isArray(state.placed)||!Array.isArray(state.removed??[]))fail('invalid state');
 const seen=new Set(),faces=new Set();
 for(const c of [...state.deck,...state.placed,...(state.removed||[])]){
  if(!c||typeof c.id!=='string'||!c.id||faces.has(c.id))fail('duplicate or invalid face in single deck');
  faces.add(c.id);
  const physical=c.instanceId||'A:'+c.id;
  if(seen.has(physical))fail('duplicate physical card');
  seen.add(physical);c.instanceId=physical;
 }
 if(Array.isArray(state.dealCheckpoint)){
  const byFace=new Map([...state.deck,...state.placed,...(state.removed||[])].map(c=>[c.id,c.instanceId]));
  for(const c of state.dealCheckpoint){
   if(!c||!byFace.has(c.id))fail('invalid checkpoint card');
   c.instanceId=byFace.get(c.id);
  }
 }
 return state;
}
function nextReading(previous,selected,{reversals=false,random=Math.random}={}){
 const current=new Map();
 if(previous)for(const c of [...previous.deck,...previous.placed,...(previous.removed||[])]){
  if(current.has(c.id))fail('duplicate old card');current.set(c.id,c.instanceId||'A:'+c.id);
 }
 const seen=new Set();
 return selected.map(card=>{
  if(!card||!card.id||seen.has(card.id))fail('invalid selected card');
  seen.add(card.id);
  return {id:card.id,instanceId:current.get(card.id)||'A:'+card.id,reversed:reversals?random()<.5:false};
 });
}
root.TabulaPhysicalIdentity=Object.freeze({preserveCard,ensureSingle,nextReading});
})(typeof globalThis!=='undefined'?globalThis:this);
