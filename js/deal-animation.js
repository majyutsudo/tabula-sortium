/* TABULA SORTIUM — interchangeable card-flight trajectories.
   Pure trajectory model: caller owns DOM, card identity and arrival cleanup.
   All transforms use viewport translations, unrotated physical dimensions,
   and a final rotation matching the actual destination card. */
(function(root){
 'use strict';
 const MODES=Object.freeze({standard:'STANDARD — 通常',spin:'SPIN — 回転',petalSoft:'PETAL — 緩やかな螺旋',serpent:'SERPENT — 蛇行',serpentFast:'SERPENT ×2 — 倍速'});
 function normalize(mode){return mode==='petal'||mode==='petalVortex'?'petalSoft':Object.hasOwn(MODES,mode)?mode:'standard'}
 function create(mode,{dx,dy,arrivalAngle=0,wind=0,bounds=null}={}){
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
  if(mode==='serpent'||mode==='serpentFast'){
   // A single unbroken path: the card advances along the stock-to-target
   // axis, displaced sideways by a damped sine wave (the snake's body).
   // The card itself does not spin; only destination orientation is blended.
   const distance=Math.hypot(x,y);
   const nx=distance>1e-6?-y/distance:0;
   const ny=distance>1e-6?x/distance:1;
   const cycles=1;
   const baseAmplitude=Math.min(104,distance*.23);
   const direction=(Number(wind)||0)<0?-1:1;
   const count=160;
   const smooth=n=>Math.round(n*10000)/10000;
   const samples=Array.from({length:count+1},(_,i)=>{
    const t=i/count;
    // Nearly even progress makes the procession considerably slower
    // than PETAL without the visual sensation of a late acceleration.
    const q=t*t*(3-2*t);
    const envelope=Math.pow(Math.sin(Math.PI*q),.82);
    const wave=Math.sin(2*Math.PI*cycles*q);
    const displacement=direction*baseAmplitude*envelope*wave;
    return {t,q,bx:x*(1-q),by:y*(1-q),vx:nx*displacement,vy:ny*displacement};
   });
   // Keep the entire bent line in the available viewport without moving
   // either endpoint. Bounds may be relaxed for very close deck positions.
   let amplitude=1;
   if(bounds&&[bounds.minX,bounds.maxX,bounds.minY,bounds.maxY].every(Number.isFinite)){
    const cap=(base,v,min,max)=>{
     if(Math.abs(v)<1e-8)return 1;
     return Math.max(0,Math.min(1,(v>0?max-base:min-base)/v));
    };
    for(const p of samples){
     amplitude=Math.min(amplitude,
      cap(p.bx,p.vx,bounds.minX,bounds.maxX),
      cap(p.by,p.vy,bounds.minY,bounds.maxY));
    }
   }
   const frames=samples.map(p=>({
    offset:smooth(p.t),
    transform:transform(smooth(p.bx+amplitude*p.vx),smooth(p.by+amplitude*p.vy),smooth(a*p.q),1),
    filter:'brightness(1)'
   }));
   frames[0]={offset:0,transform:transform(x,y,0,1),filter:'brightness(1)'};
   frames[frames.length-1]={offset:1,...finish};
   return {duration:mode==='serpentFast'?1950:3900,easing:'linear',frames};
  }
  if(mode==='petal'||mode==='petalSoft'||mode==='petalVortex'){
   // Spiral centred on the destination. s=0 is the stock; s=1 is the
   // destination, so every preset finishes exactly at the real card's centre.
   // The same trajectory can be used for custom spread positions.
   const variants={
    petalSoft:{duration:4300,turns:.9,power:1.45,tilt:7,inward:1.17},
    petal:{duration:3300,turns:1.4,power:1.9,tilt:12,inward:1.05},
    petalVortex:{duration:2750,turns:2.1,power:2.35,tilt:16,inward:.95}
   };
   const spec=variants[mode],distance=Math.hypot(x,y);
   const phase=Math.atan2(y,x);
   const direction=(Number(wind)||0)<0?-1:1;
   const variation=Math.min(.12,Math.abs(Number(wind)||0)*.12);
   const turns=spec.turns*(1+variation);
   const count=100;
   const smooth=(n)=>Math.round(n*10000)/10000;
   const sample=(t)=>{
    // Advancing through the curve starts slowly and accelerates as the
    // destination becomes dominant. A short ease-out avoids a hard stop.
    const q=t<.94?Math.pow(t/.94,spec.power)*.975:
     .975+.025*(1-Math.pow((1-t)/.06,2));
    const r=distance*Math.pow(Math.max(0,1-q),spec.inward);
    const theta=phase+direction*Math.PI*2*turns*q;
    return {q,x:r*Math.cos(theta),y:r*Math.sin(theta)};
   };
   const samples=Array.from({length:count+1},(_,i)=>sample(i/count));
   // A diagonal or near-edge destination may place the full spiral outside
   // the viewport. Reduce only the curved displacement relative to the
   // stock-to-target segment, never the source or destination coordinates.
   // bounds are viewport-safe offsets relative to the target centre.
   let amplitude=1;
   if(bounds&&[bounds.minX,bounds.maxX,bounds.minY,bounds.maxY].every(Number.isFinite)){
    for(const p of samples){
     const bx=x*(1-p.q),by=y*(1-p.q);
     const vx=p.x-bx,vy=p.y-by;
     const cap=(base,v,min,max)=>{
      if(Math.abs(v)<1e-8)return 1;
      return Math.max(0,Math.min(1,(v>0?max-base:min-base)/v));
     };
     amplitude=Math.min(amplitude,cap(bx,vx,bounds.minX,bounds.maxX),cap(by,vy,bounds.minY,bounds.maxY));
    }
   }
   const frames=samples.map((p,i)=>{
    const t=i/count,q=p.q;
    const bx=x*(1-q),by=y*(1-q);
    const px=bx+(p.x-bx)*amplitude,py=by+(p.y-by)*amplitude;
    const flutter=Math.sin(q*Math.PI*2*turns)*spec.tilt*(1-q);
    const angle=a*q+flutter;
    const scale=1-.04*Math.pow(1-q,1.2);
    return {
     offset:smooth(t),
     transform:transform(smooth(px),smooth(py),smooth(angle),smooth(scale)),
     filter:'brightness('+smooth(1+.08*(1-q))+')'
    };
   });
   frames[0]={offset:0,transform:transform(x,y,0,.96),filter:'brightness(1.08)'};
   frames[frames.length-1]={offset:1,...finish};
   return {duration:spec.duration,easing:'linear',frames};
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
