/* TABULA SORTIUM — pure geometry for custom spread editing.
   Operates on supplied positions only; no DOM or browser storage access. */
(function(root){'use strict';
function normalizeAngle(a){a=Number(a)||0;return((a%360)+360)%360}
function describeCircleFacing(value){return{radial:'外向き',inward:'中央向き',tangent:'接線方向',keep:'向きを維持'}[value]||'外向き'}
function circleFacingAngle(thetaDeg,facing,current){if(facing==='keep')return normalizeAngle(current);if(facing==='inward')return normalizeAngle(thetaDeg+180);if(facing==='tangent')return normalizeAngle(thetaDeg+90);return normalizeAngle(thetaDeg)}
function alignPositions(ps,kind){
  if(!ps.length)return;
  if(kind==='x'){const mean=ps.reduce((n,p)=>n+p.x,0)/ps.length;ps.forEach(p=>p.x=mean)}
  if(kind==='y'){const mean=ps.reduce((n,p)=>n+p.y,0)/ps.length;ps.forEach(p=>p.y=mean)}
  if(kind==='spaceX'||kind==='spaceY'){
    const axis=kind==='spaceX'?'x':'y',ordered=[...ps].sort((a,b)=>a[axis]-b[axis]);
    const a=ordered[0][axis],b=ordered[ordered.length-1][axis];
    ordered.forEach((p,i)=>p[axis]=ordered.length===1?a:a+(b-a)*i/(ordered.length-1));
  }
}
function placeOnCircle(positions,indices,radiusPx,rotation,facing,width,height){
  const rx=radiusPx/width*100,ry=radiusPx/height*100,step=360/indices.length;
  indices.forEach((idx,i)=>{
    const thetaDeg=normalizeAngle((Number(rotation)||0)+i*step),theta=thetaDeg*Math.PI/180,p=positions[idx];
    p.x=50+Math.sin(theta)*rx;p.y=50-Math.cos(theta)*ry;
    if(facing!=='keep')p.angle=circleFacingAngle(thetaDeg,facing,p.angle);
  });
}
root.TabulaSpreadGeometry=Object.freeze({normalizeAngle,describeCircleFacing,circleFacingAngle,alignPositions,placeOnCircle});
})(globalThis);
