/* TABULA SORTIUM — physical card containers, pure model (experimental).
   Independent of DOM, rendering, persistence, and specific card systems.
   Each physical card occurs in exactly one container. Cards are ordered top-first. */
(function(root){'use strict';
const clone=v=>JSON.parse(JSON.stringify(v));
function fail(s){throw Error('Card engine: '+s)}
function requireId(v,label){if(typeof v!=='string'||!v.trim())fail('invalid '+label);return v}
function distinct(items,label){if(new Set(items).size!==items.length)fail('duplicate '+label)}
function validate(w){
 if(!w||w.schemaVersion!==1||!w.cards||!w.containers||!w.tables||!w.decks)fail('invalid workspace');
 const ids=Object.keys(w.cards),seen=new Set();
 for(const [id,c] of Object.entries(w.cards)){
  if(c.instanceId!==id||typeof c.cardId!=='string'||!w.decks[c.deckId])fail('invalid physical card');
  if(typeof c.faceUp!=='boolean'||typeof c.reversed!=='boolean'||!Number.isFinite(c.angle))fail('invalid card state');
 }
 for(const [id,d] of Object.entries(w.decks)){
  if(d.id!==id||!Array.isArray(d.instanceIds))fail('invalid deck');
  distinct(d.instanceIds,'deck card');for(const key of d.instanceIds)if(w.cards[key]?.deckId!==id)fail('deck membership mismatch');
  const stock=w.containers['stock:'+id];if(!stock||stock.kind!=='stock'||stock.deckId!==id)fail('stock missing');
 }
 for(const [id,t] of Object.entries(w.tables)){
  if(t.id!==id||!Array.isArray(t.slots))fail('invalid table');
  distinct(t.slots.map(s=>s.id),'slot');
  for(const s of t.slots){requireId(s.id,'slot id');if(!Number.isFinite(s.x)||!Number.isFinite(s.y)||!Number.isFinite(s.angle))fail('invalid slot position');
   const c=w.containers['slot:'+id+':'+s.id];if(!c||c.kind!=='slot'||c.tableId!==id||c.slotId!==s.id)fail('slot container missing')}
 }
 for(const [id,c] of Object.entries(w.containers)){
  if(c.id!==id||!Array.isArray(c.cards))fail('invalid container');
  if(!['stock','slot','pile'].includes(c.kind))fail('invalid container kind');
  if(c.kind==='pile'&&(!w.tables[c.tableId]||!Number.isFinite(c.x)||!Number.isFinite(c.y)))fail('invalid pile');
  if(c.kind==='slot'&&!(w.tables[c.tableId]?.slots.some(s=>s.id===c.slotId)))fail('orphan slot');
  for(const key of c.cards){if(!w.cards[key]||seen.has(key))fail('unknown or duplicate physical card');seen.add(key)}
 }
 if(seen.size!==ids.length)fail('card conservation failed');
 const registered=Object.values(w.decks).flatMap(d=>d.instanceIds);
 if(registered.length!==ids.length||new Set(registered).size!==ids.length)fail('registry mismatch');
 return true;
}
function create({decks=[],tables=[]}={}){
 const w={schemaVersion:1,cards:{},decks:{},tables:{},containers:{}};
 for(const d of decks){
  const id=requireId(d.id,'deck id');if(w.decks[id]||!Array.isArray(d.cardIds)||d.instanceIds!==undefined&&(!Array.isArray(d.instanceIds)||d.instanceIds.length!==d.cardIds.length))fail('invalid deck definition');
  const keys=d.cardIds.map((cardId,i)=>{requireId(cardId,'card id');const key=d.instanceIds===undefined?id+':'+i:requireId(d.instanceIds[i],'instance id');if(w.cards[key])fail('duplicate instance id');w.cards[key]={instanceId:key,cardId,deckId:id,faceUp:false,reversed:false,angle:0};return key});
  w.decks[id]={id,instanceIds:keys};w.containers['stock:'+id]={id:'stock:'+id,kind:'stock',deckId:id,cards:keys.slice()};
 }
 for(const t of tables){
  const id=requireId(t.id,'table id');if(w.tables[id]||!Array.isArray(t.slots))fail('invalid table definition');
  const slots=t.slots.map((s,i)=>({id:requireId(s.id??String(i),'slot id'),x:Number(s.x),y:Number(s.y),angle:Number(s.angle??0),name:String(s.name??'')}));
  w.tables[id]={id,slots};for(const s of slots){const key='slot:'+id+':'+s.id;if(w.containers[key])fail('duplicate slot');w.containers[key]={id:key,kind:'slot',tableId:id,slotId:s.id,cards:[]}}
 }
 validate(w);return w;
}
function change(w,fn){validate(w);const next=clone(w);fn(next);validate(next);return next}
function addPile(w,{id,tableId,x,y,angle=0,faceUp=null}){
 return change(w,n=>{requireId(id,'pile id');if(!n.tables[tableId]||!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(angle))fail('invalid pile position');
  const key='pile:'+id;if(n.containers[key])fail('pile exists');
  n.containers[key]={id:key,kind:'pile',tableId,x,y,angle,faceUp,cards:[]};
 });
}
function move(w,{from,to,count=1,fromEnd='top',toEnd='top'}){
 return change(w,n=>{
  const src=n.containers[from],dst=n.containers[to];if(!src||!dst||src===dst)fail('invalid move endpoints');
  if(!Number.isInteger(count)||count<1||count>src.cards.length)fail('invalid move count');
  if(!['top','bottom'].includes(fromEnd)||!['top','bottom'].includes(toEnd))fail('invalid move end');
  const moved=fromEnd==='top'?src.cards.splice(0,count):src.cards.splice(-count);
  if(toEnd==='top')dst.cards.unshift(...moved);else dst.cards.push(...moved);
 });
}
/* Collect an explicitly ordered sequence of whole piles. A pile retains its
   internal top-to-bottom order; depositing successive piles on top changes
   group order just as with real cards. Callers choose the collection order. */
function collect(w,{from,to,toEnd='top'}){
 if(!Array.isArray(from)||!from.length||new Set(from).size!==from.length)fail('invalid collect sources');
 if(!['top','bottom'].includes(toEnd)||from.includes(to))fail('invalid collect destination');
 return change(w,n=>{
  const dest=n.containers[to];if(!dest)fail('unknown collect destination');
  for(const sourceId of from){
   const src=n.containers[sourceId];if(!src||src===dest)fail('unknown collect source');
   const cards=src.cards.splice(0);
   if(toEnd==='top')dest.cards.unshift(...cards);else dest.cards.push(...cards);
  }
 });
}
function dealVacancies(w,{from,tableId,order,count=Infinity}){
 validate(w);const t=w.tables[tableId];if(!t||!w.containers[from])fail('invalid deal target');
 const ids=order===undefined?t.slots.map(s=>s.id):order; if(!Array.isArray(ids))fail('invalid deal order');
 distinct(ids,'deal slot');for(const id of ids)if(!t.slots.some(s=>s.id===id))fail('unknown deal slot');
 if(count!==Infinity&&(!Number.isInteger(count)||count<0))fail('invalid deal count');
 let next=w,dealt=0;
 for(const id of ids){if(dealt>=count)break;
  const key='slot:'+tableId+':'+id;
  if(next.containers[key].cards.length||!next.containers[from].cards.length)continue;
  next=move(next,{from,to:key});dealt++;
 }
 return {workspace:next,dealt};
}
function flip(w,instanceId,faceUp){return change(w,n=>{const c=n.cards[instanceId];if(!c)fail('unknown physical card');c.faceUp=typeof faceUp==='boolean'?faceUp:!c.faceUp})}
function rotate(w,instanceId,angle){return change(w,n=>{const c=n.cards[instanceId];if(!c||!Number.isFinite(angle))fail('invalid rotation');c.angle=angle})}
function reorder(w,containerId,orderedIds){return change(w,n=>{const c=n.containers[containerId];if(!c||!Array.isArray(orderedIds)||orderedIds.length!==c.cards.length||new Set(orderedIds).size!==orderedIds.length||orderedIds.some(id=>!c.cards.includes(id)))fail('invalid reorder');c.cards=orderedIds.slice()})}
function removeEmptyPile(w,id){return change(w,n=>{const key='pile:'+id,c=n.containers[key];if(!c||c.kind!=='pile'||c.cards.length)fail('pile not empty');delete n.containers[key]})}
root.TabulaCardEngine=Object.freeze({create,validate,addPile,move,collect,dealVacancies,flip,rotate,reorder,removeEmptyPile});
})(typeof globalThis!=='undefined'?globalThis:this);
