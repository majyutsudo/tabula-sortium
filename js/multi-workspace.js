/* TABULA SORTIUM — multiple physical decks and tables (pure model, v1).
   No DOM or storage access. The legacy one-deck UI remains unchanged until migrated.
   A card's catalogue id ("major_00") is NOT its unique physical identity.
*/
(function(root){'use strict';
const PILES=['A','B','mixed'];
function fail(message){throw new Error('Multiple decks: '+message)}
function copy(v){return JSON.parse(JSON.stringify(v))}
function own(v,k){return Object.prototype.hasOwnProperty.call(v,k)}
function cardInstance(source,id,reversed=false){
 if(!['A','B'].includes(source)||typeof id!=='string'||!id)fail('invalid card');
 return {instanceId:source+':'+id,id,sourceDeck:source,reversed:!!reversed};
}
function cardsFor(source,ids){
 if(!Array.isArray(ids)||new Set(ids).size!==ids.length)fail('duplicate or invalid card catalogue IDs');
 return ids.map(id=>cardInstance(source,id));
}
function validate(w){
 if(!w||!w.piles||!w.tables||!Array.isArray(w.instances))fail('invalid workspace');
 for(const p of PILES)if(!Array.isArray(w.piles[p]))fail('missing pile '+p);
 if(typeof w.activeTable!=='string'||!own(w.tables,w.activeTable))fail('invalid active table');
 if(!PILES.includes(w.activePile))fail('invalid active pile');
 const expected=new Set(w.instances.map(c=>c.instanceId));
 if(expected.size!==w.instances.length)fail('duplicate instance definition');
 const all=[...PILES.flatMap(p=>w.piles[p]),...Object.values(w.tables).flatMap(t=>[...(t.placed||[]),...(t.removed||[])])];
 const seen=new Set();
 for(const c of all){
  if(!c||typeof c.instanceId!=='string'||seen.has(c.instanceId)||!expected.has(c.instanceId))fail('missing or duplicate physical card');
  const original=w.instances.find(x=>x.instanceId===c.instanceId);
  if(c.id!==original.id||c.sourceDeck!==original.sourceDeck)fail('card provenance changed');
  seen.add(c.instanceId);
 }
 if(seen.size!==expected.size)fail('card conservation failed');
 for(const [id,t] of Object.entries(w.tables)){
  if(!Array.isArray(t.placed))fail('invalid table '+id);
  const slots=t.placed.filter(c=>Number.isInteger(c.slot)).map(c=>c.slot);
  if(new Set(slots).size!==slots.length)fail('duplicate table slot in '+id);
 }
 return true;
}
function create(idsA,idsB,options={}){
 const a=cardsFor('A',idsA),b=cardsFor('B',idsB);
 const w={schemaVersion:1,instances:[...a,...b],piles:{A:a,B:b,mixed:[]},
  tables:{table1:{id:'table1',name:'卓Ⅰ',spread:options.spread||'celtic',placed:[]}},
  activeTable:'table1',activePile:'A',mixed:false};
 validate(w);return w;
}
function change(w,fn){validate(w);const next=copy(w);const out=fn(next);validate(next);return out||next}
function table(w,id,name){
 return change(w,n=>{
  if(!id||own(n.tables,id))fail('table already exists');
  n.tables[id]={id,name:name||id,spread:'free',placed:[]};
 });
}
function selectTable(w,id){return change(w,n=>{if(!own(n.tables,id))fail('unknown table');n.activeTable=id})}
function selectPile(w,id){return change(w,n=>{if(!PILES.includes(id)||(id==='mixed'&&!n.mixed)||(id!=='mixed'&&n.mixed))fail('pile unavailable');n.activePile=id})}
function mix(w){
 return change(w,n=>{
  if(n.mixed)fail('already mixed');
  n.piles.mixed.push(...n.piles.A,...n.piles.B);
  n.piles.A=[];n.piles.B=[];n.mixed=true;n.activePile='mixed';
 });
}
function separate(w){
 return change(w,n=>{
  if(!n.mixed)fail('not mixed');
  for(const c of n.piles.mixed)n.piles[c.sourceDeck].push(c);
  n.piles.mixed=[];n.mixed=false;n.activePile='A';
 });
}
function reorder(w,id,instanceIds){
 return change(w,n=>{
  if(!PILES.includes(id))fail('unknown pile');
  const pile=n.piles[id],old=new Set(pile.map(c=>c.instanceId));
  if(!Array.isArray(instanceIds)||instanceIds.length!==pile.length||new Set(instanceIds).size!==old.size||instanceIds.some(x=>!old.has(x)))fail('reorder must preserve cards');
  const byId=new Map(pile.map(c=>[c.instanceId,c]));
  n.piles[id]=instanceIds.map(x=>byId.get(x));
 });
}
function deal(w,{pile=w.activePile,tableId=w.activeTable,slot=null,x=null,y=null}={}){
 let chosen;
 const next=change(w,n=>{
  if(!PILES.includes(pile)||(n.mixed&&pile!=='mixed')||(!n.mixed&&pile==='mixed'))fail('pile unavailable');
  const t=n.tables[tableId];
  if(!t||!n.piles[pile].length)fail('table or pile unavailable');
  if(slot!==null&&t.placed.some(c=>c.slot===slot))fail('slot already occupied');
  const card=n.piles[pile].shift();chosen={...card,slot,x,y,faceUp:false};
  t.placed.push(chosen);
 });
 return {workspace:next,card:chosen};
}
function returnCard(w,tableId,instanceId){
 return change(w,n=>{
  const t=n.tables[tableId];if(!t)fail('unknown table');
  const i=t.placed.findIndex(c=>c.instanceId===instanceId);
  if(i<0)fail('card not on table');
  const card=t.placed.splice(i,1)[0];
  const target=n.mixed?'mixed':card.sourceDeck;
  n.piles[target].unshift({instanceId:card.instanceId,id:card.id,sourceDeck:card.sourceDeck,reversed:card.reversed});
 });
}
root.TabulaMultiWorkspace=Object.freeze({create,validate,table,selectTable,selectPile,mix,separate,reorder,deal,returnCard});
})(globalThis);
