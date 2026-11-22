/* TABULA SORTIUM — spread-owned interactive deal plans (v1).
   Definitions are data, never executable code. The tabletop remains the
   sole owner of the physical deck, its identities, and its animation. */
(function(root){'use strict';
const BUILTIN=Object.freeze({
 foliGrandFigure:{version:1,steps:[
  {type:'select-card',target:67,role:'significator',orientation:'keep',recommendations:['major_01','major_02']},
  {type:'deal-remaining',order:'slot-order',excludeOccupied:true}
 ]}
});
function normalize(plan,count){
 if(plan===undefined||plan===null)return null;
 if(!plan||typeof plan!=='object'||Array.isArray(plan)||plan.version!==1||!Array.isArray(plan.steps)||!plan.steps.length||plan.steps.length>20)throw Error('ディール設定の形式が不正です。');
 const seenTargets=new Set();let remaining=false;
 const steps=plan.steps.map((step,i)=>{
  if(!step||typeof step!=='object'||Array.isArray(step))throw Error('ディール工程が不正です。');
  if(step.type==='select-card'){
   if(remaining||!Number.isInteger(step.target)||step.target<1||step.target>count||seenTargets.has(step.target))throw Error('カード選択の配置先が不正です。');
   seenTargets.add(step.target);
   if(step.role!==undefined&&step.role!=='significator'&&step.role!=='ordinary')throw Error('カードの役割が不正です。');
   if(step.orientation!==undefined&&!['keep','upright','reversed','random'].includes(step.orientation))throw Error('正逆位置の指定が不正です。');
   if(step.recommendations!==undefined&&(!Array.isArray(step.recommendations)||step.recommendations.length>12||step.recommendations.some(v=>typeof v!=='string'||v.length>100)))throw Error('推奨カードの指定が不正です。');
   return {type:'select-card',target:step.target,role:step.role||'ordinary',orientation:step.orientation||'keep',recommendations:[...(step.recommendations||[])]};
  }
  if(step.type==='deal-remaining'){
   if(remaining||i!==plan.steps.length-1||step.order!=='slot-order'||step.excludeOccupied!==true)throw Error('残りの配札工程が不正です。');
   remaining=true;return {type:'deal-remaining',order:'slot-order',excludeOccupied:true};
  }
  throw Error('未対応のディール工程：'+String(step.type));
 });
 if(!remaining)throw Error('最後に残りの配札工程が必要です。');
 return {version:1,steps};
}
function resolve(spreadId,library){
 const custom=(library||[]).find(p=>p.id===spreadId);
 const definition=custom?custom.deal:BUILTIN[spreadId];
 if(!definition)return null;
 const count=custom?.slots?.length|| (spreadId==='foliGrandFigure'?78:0);
 return normalize(definition,count);
}
root.TabulaSpreadDeal=Object.freeze({BUILTIN,normalize,resolve});
})(globalThis);
