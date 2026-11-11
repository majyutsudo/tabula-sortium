/* TABULA SORTIUM — single-table manual piles (v1).
   Pure card transfers; array index zero is the TOP of every pile.
   The live app retains its current stock and placed-card model for now. */
(function(root){'use strict';
function fail(msg){throw Error('Table piles: '+msg)}
const clamp=n=>Math.max(4,Math.min(96,n));
const roles=Object.freeze(['pile','tableau','foundation','waste','discard']);
function roleOf(pile){return roles.includes(pile?.role)?pile.role:'pile'}
function setRole(state,id,role){
 const pile=find(state,id);
 if(!roles.includes(role))fail('unknown pile role');
 pile.role=role;
 return pile;
}
function piles(state){if(!Array.isArray(state.tablePiles))state.tablePiles=[];return state.tablePiles}
function validate(state){
 const seen=new Set();
 for(const p of piles(state)){
  if(typeof p.id!=='string'||!p.id||seen.has(p.id)||!Number.isFinite(p.x)||!Number.isFinite(p.y)||!Array.isArray(p.cards))fail('invalid pile');
  seen.add(p.id);
 }
 return true;
}
function fanOf(pile){
 const fan=pile?.fan;
 return fan&&Number.isFinite(fan.dx)&&Number.isFinite(fan.dy)
  ?{dx:fan.dx,dy:fan.dy}:{dx:0,dy:0};
}
function setFan(state,id,dx,dy){
 const pile=find(state,id);
 if(!Number.isFinite(dx)||!Number.isFinite(dy))fail('invalid fan');
 pile.fan={dx:Math.max(-0.85,Math.min(0.85,dx)),dy:Math.max(-0.85,Math.min(0.85,dy))};
 return pile.fan;
}
function create(state,x,y,role='pile'){
 if(!roles.includes(role))fail('unknown pile role');
 validate(state);if(!Number.isFinite(x)||!Number.isFinite(y))fail('invalid position');
 let i=1;while(state.tablePiles.some(p=>p.id==='pile-'+i))i++;
 const p={id:'pile-'+i,x:clamp(x),y:clamp(y),role,cards:[]};
 state.tablePiles.push(p);return p;
}
function find(state,id){const p=piles(state).find(p=>p.id===id);if(!p)fail('unknown pile');return p}
function deposit(state,index,id){
 validate(state);
 const p=find(state,id);
 if(!Number.isInteger(index)||index<0||index>=state.placed.length)fail('invalid placed card');
 const [card]=state.placed.splice(index,1);
 p.cards.unshift(card);
 state.selected=null;state.completionShown=false;
 return card;
}
/* Deal the stock's top physical card directly onto a table pile. */
function drawFromDeck(state,id,faceUp=false){
 validate(state);
 const target=find(state,id);
 if(!Array.isArray(state.deck)||!state.deck.length)fail('empty deck');
 const next=state.deck.shift();
 const card={...next,faceUp:faceUp===true,slot:null,manualMoved:true};
 target.cards.unshift(card);
 state.selected=null;state.completionShown=false;
 return card;
}
function withdraw(state,id,position){
 validate(state);const p=find(state,id);
 if(!p.cards.length)fail('empty pile');
 if(!position||!Number.isFinite(position.x)||!Number.isFinite(position.y))fail('invalid position');
 const slot=position.slot??null;
 if(slot!==null&&(state.placed.some(c=>c.slot===slot)||!Number.isInteger(slot)))fail('occupied or invalid destination slot');
 const card=p.cards.shift();
 const x=clamp(position.x),y=clamp(position.y);
 const move={...card,slot,x,y,angle:position.angle??card.angle??0,origin:{x,y,angle:position.angle??card.angle??0},manualMoved:slot===null};
 state.placed.push(move);
 state.selected=null;return move;
}
/* Move a consecutive block from the TOP of one pile to the TOP of another.
   The internal top-to-bottom order of that block is never reversed. */
function transfer(state,fromId,toId,count=1){
 validate(state);
 if(fromId===toId)fail('source and destination are the same pile');
 const source=find(state,fromId),target=find(state,toId);
 if(!Number.isInteger(count)||count<1||count>source.cards.length)fail('invalid transfer count');
 const cards=source.cards.splice(0,count);
 target.cards.unshift(...cards);
 state.selected=null;state.completionShown=false;
 return cards;
}
/* Split off the top N cards as a new, independently movable pile. */
function split(state,id,count,x,y){
 validate(state);
 const source=find(state,id);
 if(!Number.isInteger(count)||count<1||count>source.cards.length)fail('invalid split count');
 if(!Number.isFinite(x)||!Number.isFinite(y))fail('invalid position');
 const target=create(state,x,y);
 target.fan={...fanOf(source)};
 transfer(state,id,target.id,count);
 return target;
}
function relocate(state,id,x,y){
 const p=find(state,id);if(!Number.isFinite(x)||!Number.isFinite(y))fail('invalid position');
 p.x=clamp(x);p.y=clamp(y);return p;
}
function removeEmpty(state,id){const p=find(state,id);if(p.cards.length)fail('pile is not empty');state.tablePiles.splice(state.tablePiles.indexOf(p),1)}
function collect(state){
 const returned=piles(state).flatMap(p=>p.cards);
 state.tablePiles=[];return returned;
}
root.TabulaTablePiles=Object.freeze({piles,validate,create,find,roleOf,setRole,fanOf,setFan,deposit,drawFromDeck,withdraw,transfer,split,relocate,removeEmpty,collect});
})(typeof globalThis!=='undefined'?globalThis:this);
