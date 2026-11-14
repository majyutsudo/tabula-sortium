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
function fitGridColumns(slots,zoneWidth,cardWidth,marginPx=6){
 const output=(Array.isArray(slots)?slots:[]).map(p=>({...p}));
 if(!(zoneWidth>0&&cardWidth>0)||output.length<12)return output;
 const rows=new Map();
 for(const p of output){
  if(!Number.isFinite(p.x)||!Number.isFinite(p.y))return output;
  const key=Math.round(p.y*100)/100;
  if(!rows.has(key))rows.set(key,[]);
  rows.get(key).push(p.x);
 }
 const grouped=[...rows.values()],columns=Math.max(0,...grouped.map(row=>row.length));
 const full=grouped.filter(row=>row.length===columns);
 if(columns<4||full.length<3)return output;
 const pattern=[...full[0]].sort((a,b)=>a-b);
 if(full.some(row=>[...row].sort((a,b)=>a-b).some((x,i)=>Math.abs(x-pattern[i])>.1)))return output;
 const minStep=Math.min(...pattern.slice(1).map((x,i)=>x-pattern[i]));
 if(minStep<=0)return output;
 const requested=(cardWidth+2)/zoneWidth*100/minStep;
 if(requested<=1)return output;
 const extent=Math.max(...output.map(p=>Math.abs(p.x-50)));
 if(!extent)return output;
 const room=50-(cardWidth/2+marginPx)/zoneWidth*100;
 const factor=Math.min(requested,room/extent);
 if(!(factor>1))return output;
 for(const p of output)p.x=50+(p.x-50)*factor;
 return output;
}
root.TabulaSpreadGeometry=Object.freeze({normalizeAngle,describeCircleFacing,circleFacingAngle,alignPositions,placeOnCircle,fitGridColumns});
})(globalThis);
