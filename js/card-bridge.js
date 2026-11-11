/* TABULA SORTIUM — read-only projection from legacy tabletop states to card-engine.
   No browser, storage, or DOM dependencies. Does not replace the running state.
   Maps retain the legacy card payloads; the engine is the authoritative identity
   and location snapshot only after a future controlled cutover. */
(function(root){'use strict';
function fail(s){throw Error('Card bridge: '+s)}
function copy(v){return JSON.parse(JSON.stringify(v))}
function project({decks,tables,stocks,placed,removed,extraPiles=[]}){
 const E=root.TabulaCardEngine;if(!E)fail('card engine unavailable');
 const deckDefs=decks.map(d=>({id:d.id,cardIds:d.instances.map(c=>c.id)}));
 const w=E.create({decks:deckDefs,tables:tables.map(t=>({id:t.id,slots:t.slots}))});
 const registry={},payloads={},lookup=new Map();
 for(const d of decks){
  const keys=w.decks[d.id].instanceIds;
  d.instances.forEach((c,i)=>{
   const key=keys[i],external=c.instanceId||d.id+':'+c.id;
   if(lookup.has(external))fail('duplicate physical identity');
   lookup.set(external,key);
   registry[external]=key;
   payloads[key]=copy(c);
   w.cards[key].faceUp=c.faceUp===true;
   w.cards[key].reversed=c.reversed===true;
   w.cards[key].angle=Number.isFinite(c.angle)?c.angle:0;
  });
 }
 // Clear initial stock positions before locating every physical card exactly once.
 for(const d of decks)w.containers['stock:'+d.id].cards=[];
 const occupied=new Set();let serial=0;
 const place=(c,target)=>{
  if(!c||typeof c.id!=='string')fail('invalid physical card');
  const external=c.instanceId||((c.sourceDeck||decks[0]?.id)+':'+c.id);
  const key=lookup.get(external);
  if(!key||occupied.has(key))fail('unknown or duplicate physical card');
  const info=w.cards[key];if(info.cardId!==c.id||info.deckId!==(c.sourceDeck||info.deckId))fail('physical card provenance mismatch');
  occupied.add(key);w.containers[target].cards.push(key);
  payloads[key]=copy(c);
  info.faceUp=c.faceUp===true;info.reversed=c.reversed===true;
  info.angle=Number.isFinite(c.angle)?c.angle:0;
 };
 const ensurePile=(id,tableId,x=50,y=50,kind='loose')=>{
  if(!w.tables[tableId])fail('unknown table');
  if(!Number.isFinite(x)||!Number.isFinite(y))fail('invalid pile coordinates');
  if(w.containers['pile:'+id])fail('duplicate pile id');
  w.containers['pile:'+id]={id:'pile:'+id,kind:'pile',tableId,x,y,angle:0,role:kind,cards:[]};
  return 'pile:'+id;
 };
 for(const stock of stocks){
  let target='stock:'+stock.deckId;
  if(stock.name){target=ensurePile(stock.name,stock.tableId,stock.x??50,stock.y??50,'stock-group')}
  if(!w.containers[target])fail('unknown stock');
  for(const c of stock.cards)place(c,target);
 }
 for(const t of tables){
  const positions=placed[t.id]||[];
  for(const c of positions){
   if(Number.isInteger(c.slot)){
    const slotId=String(c.slot);
    const key='slot:'+t.id+':'+slotId;
    if(!w.containers[key])fail('unknown slot');
    place(c,key);
   }else{
    const id='loose:'+t.id+':'+serial++;
    const key=ensurePile(id,t.id,c.x,c.y,c.auxiliaryPile?'auxiliary':'loose');
    place(c,key);
   }
  }
  const leftovers=removed[t.id]||[];
  if(leftovers.length){
   const key=ensurePile('removed:'+t.id,t.id,5,5,'removed');
   for(const c of leftovers)place(c,key);
  }
 }
 for(const p of extraPiles){
  const key=ensurePile(p.id,p.tableId,p.x,p.y,p.role||'pile');
  for(const c of p.cards)place(c,key);
 }
 E.validate(w);
 return {engine:w,identityMap:registry,cardPayloads:payloads};
}
function single(state,slots,{tableId='main',deckId='A'}={}){
 if(!state||!Array.isArray(state.deck)||!Array.isArray(state.placed)||!Array.isArray(slots))fail('invalid single-table state');
 const cards=[...state.deck,...state.placed,...(state.removed||[])];
 const seen=new Set();
 for(const c of cards){if(!c||typeof c.id!=='string'||seen.has(c.id))fail('single-table identity unavailable');seen.add(c.id)}
 const asCard=c=>({...c,instanceId:deckId+':'+c.id,sourceDeck:deckId});
 return project({
  decks:[{id:deckId,instances:cards.map(asCard)}],
  tables:[{id:tableId,slots:slots.map((s,i)=>({id:String(i),...s}))}],
  stocks:[{deckId,cards:state.deck.map(asCard)}],
  placed:{[tableId]:state.placed.map(asCard)},
  removed:{[tableId]:(state.removed||[]).map(asCard)}
 });
}
function multi(workspace,slotDefinitions={}){
 if(!workspace||!Array.isArray(workspace.instances)||!workspace.piles||!workspace.tables)fail('invalid multi-table state');
 if(root.TabulaMultiWorkspace)root.TabulaMultiWorkspace.validate(workspace);
 const decks=['A','B'].map(id=>({id,instances:workspace.instances.filter(c=>c.sourceDeck===id)}));
 const tables=Object.entries(workspace.tables).map(([id,t])=>({
  id,slots:(slotDefinitions[id]||[]).map((s,i)=>({id:String(i),...s}))
 }));
 // Preserve mixed pile explicitly; never silently attribute mixed cards to A.
 const primary=workspace.activeTable||tables[0]?.id;
 const stocks=['A','B'].map(id=>({deckId:id,cards:workspace.piles[id]||[]}));
 if((workspace.piles.mixed||[]).length)stocks.push({deckId:'A',name:'mixed',tableId:primary,cards:workspace.piles.mixed});
 const placed=Object.fromEntries(tables.map(t=>[t.id,workspace.tables[t.id].placed||[]]));
 const removed=Object.fromEntries(tables.map(t=>[t.id,workspace.tables[t.id].removed||[]]));
 return project({decks,tables,stocks,placed,removed});
}
root.TabulaCardBridge=Object.freeze({single,multi});
})(typeof globalThis!=='undefined'?globalThis:this);
