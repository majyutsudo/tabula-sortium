/* TABULA SORTIUM — deterministic, non-mutating deal workflow core.
   A workflow acts on card objects without altering the existing tabletop state.
   The UI is responsible for confirming, displaying, and committing the result. */
(function(root){'use strict';
function fail(message){throw new Error('Deal workflow: '+message)}
function copy(cards){if(!Array.isArray(cards))fail('cards must be an array');return cards.map(c=>({...c}))}
function index(value,max,label){if(!Number.isInteger(value)||value<0||value>=max)fail('invalid '+label);return value}
function run(deck,steps,options={}){
 if(!Array.isArray(steps)||steps.length>100)fail('invalid steps');
 const initial=copy(deck),state={stock:initial,piles:[],selected:[],dealt:[],removed:[],log:[],timeline:[]};
 const capture=(type,label)=>{if(options.trace){state.timeline.push({type,label,stock:copy(state.stock),piles:state.piles.map(copy),selected:copy(state.selected),dealt:copy(state.dealt),removed:copy(state.removed)})}};
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
   case 'shuffle-recipe':{
    if(state.piles.length||state.selected.length)fail('collect piles before shuffle');
    const recipes=options.recipes||[];const recipe=recipes.find(r=>r.id===step.recipeId);
    if(!recipe)fail('shuffle recipe not found');
    if(!root.TabulaShuffle)fail('shuffle engine unavailable');
    for(const raw of recipe.steps){const st=root.TabulaShuffle.normStep(raw,{wash:'ウォッシュ',hindu:'ヒンズー',overhand:'オーバーハンド',riffle:'リフル',pile:'パイル'});for(let i=0;i<st.reps;i++)state.stock=root.TabulaShuffle.applyShuffleMethod(state.stock.slice(),st,false,i)}
    break;
   }
   case 'skip-deal':{
    const times=step.times,skip=step.skip;
    if(!Number.isInteger(times)||times<1||!Number.isInteger(skip)||skip<0)fail('invalid repeated deal');
    if(state.piles.length)fail('collect piles before repeated deal');
    if(state.stock.length<times*(skip+1))fail('not enough cards for repeated deal');
    for(let i=0;i<times;i++){if(skip){state.removed.push(...state.stock.splice(0,skip));capture('removed','第'+(i+1)+'回：'+skip+'枚を除外')}{const card=state.stock.shift();card.dealFaceUp=typeof step.faceUp==='boolean'?step.faceUp:options.defaultFaceUp===true;state.dealt.push(card)}capture('dealt','第'+(i+1)+'回：1枚を配札')}
    break;
   }
   case 'deal-rest':{
    const n=step.count;
    if(!Number.isInteger(n)||n<0)fail('invalid spread card count');
    if(state.piles.length)fail('collect piles before normal deal');
    if(state.stock.length<n)fail('not enough cards for spread');
    for(let i=0;i<n;i++){{const card=state.stock.shift();card.dealFaceUp=typeof step.faceUp==='boolean'?step.faceUp:options.defaultFaceUp===true;state.dealt.push(card)}capture('dealt','通常ディール '+(i+1)+' / '+n)}break;
   }
   case 'take':{
    const n=step.count;
    if(!Number.isInteger(n)||n<1)fail('invalid take count');
    const source=step.from==='stock'?state.stock:state.piles[index(step.from,state.piles.length,'pile index')];
    if(source.length<n)fail('not enough cards');
    if(!['dealt','removed','selected'].includes(step.to))fail('invalid destination');
    for(let i=0;i<n;i++){
      const card=source.shift();
      if(step.to==='dealt')card.dealFaceUp=typeof step.faceUp==='boolean'?step.faceUp:options.defaultFaceUp===true;
      state[step.to].push(card);
      capture(step.to==='dealt'?'dealt':step.to==='removed'?'removed':'selected',(step.to==='dealt'?'配札':step.to==='removed'?'除外':'保留')+' '+(i+1)+' / '+n);
    }
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
  if(step.type!=='skip-deal'&&step.type!=='deal-rest'&&step.type!=='take')capture(step.type,step.type==='shuffle-recipe'?'シャッフル':step.type==='take'?(step.to==='removed'?'除外':step.to==='dealt'?'配札':'保留'):step.type==='split'?'山札を分割':step.type==='collect'?'山札を積み直す':'工程を実行');
  if(options.trace&&step.type==='shuffle-recipe'&&state.timeline.length)state.timeline[state.timeline.length-1].recipeId=step.recipeId;
  state.log.push({type:step.type,stock:state.stock.length,piles:state.piles.map(p=>p.length),selected:state.selected.length,dealt:state.dealt.length,removed:state.removed.length});
 }
 return state;
}
root.TabulaDealWorkflow=Object.freeze({run});
})(typeof globalThis!=='undefined'?globalThis:this);
