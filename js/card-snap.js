/* TABULA card alignment — independent of deck and display technology. */
(function(root){'use strict';
function snap(position,items,size,threshold=14,gap=0){
 const {x,y}=position,{w,h}=size;
 if(!Number.isFinite(w)||!Number.isFinite(h)||w<=0||h<=0||!items.length)return {x,y};
 const xs=[x],ys=[y];
 const near=(arr,value,original)=>{if(Math.abs(value-original)<=threshold)arr.push(value)};
 for(const c of items){
  // Adjacent edges and shared centerlines.
  for(const dx of [-w-gap,0,w+gap])near(xs,c.x+dx,x);
  for(const dy of [-h-gap,0,h+gap])near(ys,c.y+dy,y);
  // A half-card offset only has meaning on another row (pyramid).
  if(Math.abs(Math.abs(y-c.y)-(h+gap))<=threshold){
   near(xs,c.x-w/2,x);near(xs,c.x+w/2,x);
  }
 }
 let best={x,y},score=Infinity,quality=0;
 for(const px of xs)for(const py of ys){
  const dx=Math.abs(px-x),dy=Math.abs(py-y);
  if(dx>threshold||dy>threshold)continue;
  const aligned=Number(px!==x)+Number(py!==y);
  if(!aligned)continue;
  // Cards are center-positioned. Never pull a card on top of an existing one.
  if(items.some(c=>Math.abs(px-c.x)<w+gap-.5&&Math.abs(py-c.y)<h+gap-.5))continue;
  const move=Math.hypot(dx,dy);
  // Two-axis alignment takes precedence over a nearer one-axis alignment.
  // The former makes exact rows, columns and staggered pyramid joints.
  if(aligned>quality||(aligned===quality&&move<score)){
   quality=aligned;score=move;best={x:px,y:py};
  }
 }
 return best;
}
const api=Object.freeze({snap});
root.TabulaCardSnap=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:window);
