/* TABULA SORTIUM — deterministic, non-mutating deal workflow core.
   A workflow acts on card objects without altering the existing tabletop state.
   The UI is responsible for confirming, displaying, and committing the result. */
(function(root){'use strict';
function fail(message){throw new Error('Deal workflow: '+message)}
function copy(cards){if(!Array.isArray(cards))fail('cards must be an array');return cards.map(c=>({...c}))}
function index(value,max,label){if(!Number.isInteger(value)||value<0||value>=max)fail('invalid '+label);return value}
function run(deck,steps){
 if(!Array.isArray(steps)||steps.length>100)fail('invalid steps');
 const initial=copy(deck),state={stock:initial,piles:[],selected:[],dealt:[],removed:[],log:[]};
 const count=()=>state.stock.length+state.piles.reduce((n,p)=>n+p.length,0)+state.selected.length+state.dealt.length+state.removed.length;
 for(const step of steps){
  if(!step||typeof step.type!=='string')fail('invalid step');
  const before=count();
  switch(step.type){
   case 'split':{
    if(state.piles.length||state.selected.length)fail('finish previous pile operation first');
    const sizes=step.sizes;
    if(!Array.isArray(sizes)||sizes.length<2||sizes.length>16||sizes.some(n=>!Number.isInteger(n)||n<0)||sizes.reduce((a,b)=>a+b,0)!==state.stock.length)fail('split sizes must cover stock');
    let at=0;state.piles=sizes.map(n=>{const p=state.stock.slice(at,at+n);at+=n;return p});state.stock=[];break;
   }
   case 'collect':{
    if(!state.piles.length)fail('no piles to collect');
    const order=step.order;
    if(!Array.isArray(order)||order.length!==state.piles.length||new Set(order).size!==order.length)fail('order must include each pile once');
    order.forEach(n=>index(n,state.piles.length,'pile index'));
    state.stock=order.flatMap(n=>state.piles[n]);state.piles=[];break;
   }
   case 'take':{
    const n=step.count;
    if(!Number.isInteger(n)||n<1)fail('invalid take count');
    const source=step.from==='stock'?state.stock:state.piles[index(step.from,state.piles.length,'pile index')];
    if(source.length<n)fail('not enough cards');
    const cards=source.splice(0,n);
    if(step.to==='dealt')state.dealt.push(...cards);
    else if(step.to==='removed')state.removed.push(...cards);
    else if(step.to==='selected')state.selected.push(...cards);
    else fail('invalid destination');
    break;
   }
   case 'return-selected':{
    if(!state.selected.length)fail('nothing selected');
    if(step.to==='stock')state.stock=step.position==='bottom'?[...state.stock,...state.selected]:[...state.selected,...state.stock];
    else {const p=state.piles[index(step.to,state.piles.length,'pile index')];if(step.position==='bottom')p.push(...state.selected);else p.unshift(...state.selected)}
    state.selected=[];break;
   }
   case 'reverse-pile':{
    const p=state.piles[index(step.pile,state.piles.length,'pile index')];p.reverse();break;
   }
   default:fail('unsupported operation '+step.type);
  }
  if(count()!==before)fail('card conservation violated');
  state.log.push({type:step.type,stock:state.stock.length,piles:state.piles.map(p=>p.length),selected:state.selected.length,dealt:state.dealt.length,removed:state.removed.length});
 }
 return state;
}
root.TabulaDealWorkflow=Object.freeze({run});
})(typeof globalThis!=='undefined'?globalThis:this);
