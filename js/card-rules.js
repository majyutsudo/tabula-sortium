/* TABULA SORTIUM — pure card selection and dealing rules.
   No DOM, state mutation, or browser storage access. */
(function(root){'use strict';
function selectCards(cards,pool,customIds){
  return cards.filter(c=>pool==='all'||pool==='custom'&&customIds.includes(c.id)||pool==='major'&&c.group==='major'||pool==='minor'&&c.group!=='major'||pool==='court'&&c.group==='court'||pool===c.suit)
}
function defaultDealOrder(presets,spread){return (presets[spread]||[]).map((_,i)=>i)}
function getDealOrder(presets,spread,orders){
  const count=(presets[spread]||[]).length,raw=orders?.[spread];
  if(!Array.isArray(raw)||raw.length!==count)return defaultDealOrder(presets,spread);
  const nums=raw.map(Number);
  return new Set(nums).size===count&&nums.every(n=>Number.isInteger(n)&&n>=0&&n<count)?nums:defaultDealOrder(presets,spread)
}
function parseDealOrderInput(raw,presets,spread){
  const count=(presets[spread]||[]).length,str=String(raw).trim();
  if(!str)return defaultDealOrder(presets,spread);
  const parts=str.split(/[,，、\s]+/).filter(Boolean);
  if(parts.length!==count)throw Error(`このスプレッドでは${count}個の位置番号をすべて指定してください。`);
  const nums=parts.map(x=>Number(x));
  if(nums.some(n=>!Number.isInteger(n)||n<1||n>count)||new Set(nums).size!==count)throw Error(`1〜${count}を重複なく1回ずつ指定してください。`);
  return nums.map(n=>n-1)
}
function rotateAngle(angle,delta,reset=false){return reset?0:((angle+delta)%360+360)%360}
root.TabulaCardRules=Object.freeze({selectCards,defaultDealOrder,getDealOrder,parseDealOrderInput,rotateAngle});
})(globalThis);
