/* TABULA SORTIUM — interchangeable card-flight trajectories.
   Pure trajectory model: caller owns DOM, card identity and arrival cleanup.
   All transforms use viewport translations, unrotated physical dimensions,
   and a final rotation matching the actual destination card. */
(function(root){
 'use strict';
 const MODES=Object.freeze({standard:'STANDARD — 通常',spin:'SPIN — 回転',petal:'PETAL — 浮遊'});
 function normalize(mode){return Object.hasOwn(MODES,mode)?mode:'standard'}
 function create(mode,{dx,dy,arrivalAngle=0,wind=0}={}){
  mode=normalize(mode);
  const x=Number(dx)||0,y=Number(dy)||0,a=Number(arrivalAngle)||0;
  const t=(px,py)=>'translate(calc(-50% + '+px+'px),calc(-50% + '+py+'px))';
  const transform=(px,py,angle,scale=1)=>t(px,py)+' rotate('+angle+'deg) scale('+scale+')';
  const finish={transform:transform(0,0,a),filter:'brightness(1)'};
  if(mode==='spin')return {
   duration:680,easing:'cubic-bezier(.18,.64,.2,1)',
   frames:[
    {offset:0,transform:transform(x,y,0,.96),filter:'brightness(1.08)'},
    {offset:.43,transform:transform(x*.58,y*.58,360+a*.26,1.025),filter:'brightness(1.10)'},
    {offset:.78,transform:transform(x*.15,y*.15,650+a*.8,1.01),filter:'brightness(1.05)'},
    {offset:1,...finish,transform:transform(0,0,720+a)}
   ]
  };
  if(mode==='petal'){
   // A restrained wind variation changes the drift without affecting arrival.
   const w=Math.max(-1,Math.min(1,Number(wind)||0));
   const distance=Math.hypot(x,y);
   const arc=Math.max(48,Math.min(150,distance*.35));
   const side=arc*(w>=0?1:-1);
   const flutter=15*w;
   return {
    duration:3400,easing:'linear',
    frames:[
     {offset:0,transform:transform(x,y,0,.96),filter:'brightness(1.08)',easing:'cubic-bezier(.2,0,.4,1)'},
     {offset:.16,transform:transform(x*.94+side*.28,y*.93-arc,.9*-16+flutter,.99),filter:'brightness(1.11)',easing:'ease-in-out'},
     {offset:.43,transform:transform(x*.65+side,y*.55-arc*.75,23+flutter,1.015),filter:'brightness(1.09)',easing:'ease-in-out'},
     {offset:.70,transform:transform(x*.33-side*.26,y*.22+arc*.3,-24+flutter*.5,1.02),filter:'brightness(1.06)',easing:'cubic-bezier(.25,.15,.35,1)'},
     {offset:.89,transform:transform(x*.08,y*.05-14,10+a*.7,1.005),filter:'brightness(1.03)',easing:'ease-out'},
     {offset:1,...finish}
    ]
   };
  }
  return {
   duration:320,easing:'cubic-bezier(.22,.72,.25,1)',
   frames:[
    {transform:transform(x,y,0,.96),filter:'brightness(1.08)'},
    {offset:.16,transform:transform(x*.85,y*.85-7,-3+a*.16,1.025)},
    finish
   ]
  };
 }
 root.TabulaDealAnimation=Object.freeze({MODES,normalize,create});
})(typeof globalThis!=='undefined'?globalThis:this);
