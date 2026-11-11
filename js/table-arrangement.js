/* TABULA SORTIUM — generic tabletop location operations.
   A preset is an ordered set of frames on the same freely operable tabletop.
   Location keys: slot:<index> and pile:<physical pile id>.
   Cards in a location are top-first; no game or spread-specific rules. */
(function(root){'use strict';
const clone=value=>JSON.parse(JSON.stringify(value));
function fail(message){throw Error('Table arrangement: '+message)}
function locationOrder(state,slots=[],slotOrder){
 const keys=[];
 const indices=Array.isArray(slotOrder)?slotOrder:slots.map((_,i)=>i);
 for(const index of indices){
  if(!Number.isInteger(index)||index<0||index>=slots.length)fail('invalid slot order');
  keys.push('slot:'+index);
 }
 // Unanchored piles are independently positioned frames, available equally
 // in free and registered layouts. Insertion order is a valid explicit order.
 for(const pile of state.tablePiles||[]){
  if(!Number.isInteger(pile.slot))keys.push('pile:'+pile.id);
 }
 if(new Set(keys).size!==keys.length)fail('duplicate locations');
 return keys;
}
function getLocation(state,key,slots){
 if(typeof key!=='string')fail('invalid location');
 if(key.startsWith('slot:')){
  const index=Number(key.slice(5));
  if(!Number.isInteger(index)||String(index)!==key.slice(5)||index<0||index>=slots.length)fail('unknown slot');
  const pile=(state.tablePiles||[]).find(p=>p.slot===index);
  const placed=state.placed.filter(c=>c.slot===index);
  if(pile&&placed.length||placed.length>1)fail('duplicate slot occupants');
  return {kind:'slot',slot:index,pile,placed,position:slots[index],
   cards:pile?pile.cards:placed};
 }
 if(key.startsWith('pile:')){
  const id=key.slice(5),pile=(state.tablePiles||[]).find(p=>p.id===id);
  if(!pile||Number.isInteger(pile.slot))fail('unknown free pile');
  return {kind:'pile',pile,cards:pile.cards};
 }
 fail('invalid location key');
}
function checkedOrder(state,slots,order){
 if(!Array.isArray(slots)||!Array.isArray(state.placed)||!Array.isArray(state.tablePiles))fail('invalid table');
 if(!Array.isArray(order)||new Set(order).size!==order.length)fail('invalid location order');
 return order.map(key=>getLocation(state,key,slots));
}
function moveContents(state,src,dst){
 if(!src.cards.length||dst.cards.length)fail('invalid compaction');
 const cards=src.cards.slice();
 if(src.pile)src.pile.cards=[];
 else state.placed=state.placed.filter(c=>c.slot!==src.slot);
 if(dst.pile){
  dst.pile.cards=cards.map(c=>({...c,slot:null}));
 }else if(cards.length===1){
  const c=cards[0],pos=dst.position;
  state.placed.push({...c,slot:dst.slot,x:pos.x,y:pos.y,
   angle:pos.angle??c.angle??0,manualMoved:false});
 }else{
  let n=1;while(state.tablePiles.some(p=>p.id==='pile-'+n))n++;
  const pos=dst.position;
  state.tablePiles.push({id:'pile-'+n,slot:dst.slot,x:pos.x,y:pos.y,
   role:'pile',fan:src.pile?.fan?clone(src.pile.fan):{dx:0,dy:0},
   cards:cards.map(c=>({...c,slot:null}))});
 }
}
function compact(state,slots,order){
 // Atomic: failures never partially change the live workspace.
 const next=clone(state);
 checkedOrder(next,slots,order);
 let moves=0;
 for(let destIndex=0;destIndex<order.length;destIndex++){
  if(getLocation(next,order[destIndex],slots).cards.length)continue;
  let sourceIndex=destIndex+1;
  while(sourceIndex<order.length&&!getLocation(next,order[sourceIndex],slots).cards.length)sourceIndex++;
  if(sourceIndex===order.length)break;
  moveContents(next,getLocation(next,order[sourceIndex],slots),
   getLocation(next,order[destIndex],slots));
  moves++;
 }
 return {state:next,moves};
}
function refill(state,slots,order,{faceUp=false,limit=Infinity}={}){
 const next=clone(state);
 checkedOrder(next,slots,order);
 if(limit!==Infinity&&(!Number.isInteger(limit)||limit<0))fail('invalid refill count');
 let dealt=0;
 for(const key of order){
  if(dealt>=limit||!next.deck.length)break;
  const dst=getLocation(next,key,slots);
  if(dst.cards.length)continue;
  const original=next.deck.shift();
  const visible=dst.pile?.role==='waste'||faceUp===true;
  const card={...original,faceUp:visible};
  if(dst.pile)dst.pile.cards.unshift({...card,slot:null,manualMoved:true});
  else {
   const pos=dst.position;
   next.placed.push({...card,slot:dst.slot,x:pos.x,y:pos.y,
    angle:pos.angle??card.angle??0,
    origin:{x:pos.x,y:pos.y,angle:pos.angle??card.angle??0},
    manualMoved:false});
  }
  dealt++;
 }
 return {state:next,dealt};
}
root.TabulaTableArrangement=Object.freeze({locationOrder,compact,refill});
})(typeof globalThis!=='undefined'?globalThis:this);
