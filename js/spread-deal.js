/* TABULA SORTIUM — spread-owned interactive deal plans (v1).
   Definitions are data, never executable code. The tabletop remains the
   sole owner of the physical deck, its identities, and its animation. */
(function(root){'use strict';
const BUILTIN=Object.freeze({
 foliGrandFigure:{version:1,steps:[
  {type:'select-card',target:67,role:'significator',orientation:'keep',recommendations:['major_01','major_02']},
  {type:'deal-remaining',order:'slot-order',excludeOccupied:true}
 ]},
 grandStar:{version:1,steps:[
  {type:'select-card',target:1,role:'significator',orientation:'keep',allowed:'any',recommendations:["c_clubs_r11","c_clubs_r12","c_clubs_r13","c_hearts_r11","c_hearts_r12","c_hearts_r13","c_spades_r11","c_spades_r12","c_spades_r13","c_diamonds_r11","c_diamonds_r12","c_diamonds_r13"],recommendedNote:'伝統的には32枚のプレイングカードを用い、人物札（J・Q・K）から相談者カードを選びます。現在の山札からは任意のカードを選択できます。'},
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
   if(step.allowed!==undefined&&!['any','playing-court'].includes(step.allowed))throw Error('選択可能なカードの範囲が不正です。');
   if(step.role!==undefined&&step.role!=='significator'&&step.role!=='ordinary')throw Error('カードの役割が不正です。');
   if(step.orientation!==undefined&&!['keep','upright','reversed','random'].includes(step.orientation))throw Error('正逆位置の指定が不正です。');
   if(step.recommendedNote!==undefined&&(typeof step.recommendedNote!=='string'||step.recommendedNote.length>500))throw Error('推奨カードの説明が不正です。');
   if(step.recommendations!==undefined&&(!Array.isArray(step.recommendations)||step.recommendations.length>12||step.recommendations.some(v=>typeof v!=='string'||v.length>100)))throw Error('推奨カードの指定が不正です。');
   return {type:'select-card',target:step.target,role:step.role||'ordinary',orientation:step.orientation||'keep',allowed:step.allowed||'any',recommendations:[...new Set(step.recommendations||[])],recommendedNote:step.recommendedNote||''};
  }
  if(step.type==='shuffle'){
   if(remaining||!['selected','recipe'].includes(step.source||'selected'))throw Error('シャッフル工程の指定が不正です。');
   if(step.recipeId!==undefined&&(typeof step.recipeId!=='string'||step.recipeId.length>100))throw Error('シャッフルレシピ名が不正です。');
   if(step.source==='recipe'&&!step.recipeId)throw Error('シャッフルレシピを指定してください。');
   return {type:'shuffle',source:step.source||'selected',...(step.recipeId?{recipeId:step.recipeId}:{})};
  }
  if(step.type==='cut'){
   if(remaining||!Number.isInteger(step.count)||step.count<2||step.count>8)throw Error('カットは2〜8分割で指定してください。');
   if(step.repetitions!==undefined&&(!Number.isInteger(step.repetitions)||step.repetitions<1||step.repetitions>5))throw Error('カットの反復は1〜5回で指定してください。');
   return {type:'cut',count:step.count,repetitions:step.repetitions||1};
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
function eligible(card,rule='any'){
 if(rule==='any')return true;
 if(rule==='playing-court')return !!card&&['clubs','hearts','spades','diamonds'].includes(card.suitId)
  &&['r11','r12','r13'].includes(card.rankId);
 return false;
}
function resolve(spreadId,library){
 const custom=(library||[]).find(p=>p.id===spreadId);
 const definition=custom?custom.deal:BUILTIN[spreadId];
 if(!definition)return null;
 const count=custom?.slots?.length|| ({foliGrandFigure:78,grandStar:22}[spreadId]||0);
 return normalize(definition,count);
}
root.TabulaSpreadDeal=Object.freeze({BUILTIN,normalize,resolve,eligible});
})(globalThis);
