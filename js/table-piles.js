/* TABULA SORTIUM — single-table manual piles (v1).
   Pure card transfers; array index zero is the TOP of every pile.
   The live app retains its current stock and placed-card model for now. */
(function(root){'use strict';
function fail(msg){throw Error('Table piles: '+msg)}
const clamp=n=>Math.max(4,Math.min(96,n));
function piles(state){if(!Array.isArray(state.tablePiles))state.tablePiles=[];return state.tablePiles}
function validate(state){
 const seen=new Set();
 for(const p of piles(state)){
  if(typeof p.id!=='string'||!p.id||seen.has(p.id)||!Number.isFinite(p.x)||!Number.isFinite(p.y)||!Array.isArray(p.cards))fail('invalid pile');
  seen.add(p.id);
 }
 return true;
}
function create(state,x,y){
 validate(state);if(!Number.isFinite(x)||!Number.isFinite(y))fail('invalid position');
 let i=1;while(state.tablePiles.some(p=>p.id==='pile-'+i))i++;
 const p={id:'pile-'+i,x:clamp(x),y:clamp(y),cards:[]};
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
function withdraw(state,id,position){
 validate(state);const p=find(state,id);
 if(!p.cards.length)fail('empty pile');
 if(!position||!Number.isFinite(position.x)||!Number.isFinite(position.y))fail('invalid position');
 const card=p.cards.shift();
 const slot=position.slot??null;
 if(slot!==null&&(state.placed.some(c=>c.slot===slot)||!Number.isInteger(slot)))fail('occupied or invalid destination slot');
 const x=clamp(position.x),y=clamp(position.y);
 const move={...card,slot,x,y,angle:position.angle??card.angle??0,origin:{x,y,angle:position.angle??card.angle??0},manualMoved:slot===null};
 state.placed.push(move);
 state.selected=null;return move;
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
root.TabulaTablePiles=Object.freeze({piles,validate,create,find,deposit,withdraw,relocate,removeEmpty,collect});
})(typeof globalThis!=='undefined'?globalThis:this);
