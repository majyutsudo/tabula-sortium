/* TABULA — vector placement sheet; independent of camera zoom and artwork. */
(()=>{
'use strict';
const ns='http://www.w3.org/2000/svg';
const $=id=>document.getElementById(id);
function element(tag,attrs={},text){
 const e=document.createElementNS(ns,tag);
 for(const [k,v] of Object.entries(attrs))e.setAttribute(k,String(v));
 if(text!==undefined)e.textContent=text;
 return e;
}
function printable(){
 const zone=$('zone');if(!zone)throw Error('卓が見つかりません。');
 const zr=zone.getBoundingClientRect();
 if(!zr.width||!zr.height)throw Error('卓の寸法を取得できません。');
 const nodes=[...zone.querySelectorAll(':scope > .card')];
 if(!nodes.length)throw Error('卓上にカードがありません。');
 const live=globalThis.TabulaPlacementPrintData?.();
 if(!live||!Array.isArray(live.cards))throw Error('卓情報を取得できません。ページを再読み込みしてください。');
 const entries=nodes.map(node=>{
  const idx=Number(node.dataset.index),item=live.cards[idx];
  if(!item)return null;
  // Position and size are taken from the actual card element, never its artwork.
  // The DOM top uses calc(…% + …px), which parseFloat cannot read. Use model coordinates.
  const x=Number(item.x),y=Number(item.y);
  const angle=parseFloat(node.style.getPropertyValue('--rotation'))||0;
  const width=parseFloat(node.style.width)||node.offsetWidth;
  const height=parseFloat(node.style.height)||node.offsetHeight;
  return {x:Number.isFinite(x)?x:50,y:Number.isFinite(y)?y:50,angle,width,height,label:String(item.label||item.id||'カード')+(item.reversed?'〈逆〉':''),idx};
 }).filter(Boolean);
 if(!entries.length)throw Error('印刷できるカードがありません。');
 // Derive the native card dimensions from the untransformed DOM, not the camera.
 const zw=zone.offsetWidth,zh=zone.offsetHeight;
 const pageW=210,pageH=297,margin=12;
 const scale=Math.min((pageW-2*margin)/zw,(pageH-2*margin)/zh);
 const contentW=zw*scale,contentH=zh*scale;
 const ox=(pageW-contentW)/2,oy=(pageH-contentH)/2;
 const svg=element('svg',{xmlns:ns,viewBox:'0 0 210 297',width:'210mm',height:'297mm'});
 svg.append(element('rect',{width:210,height:297,fill:'#fff'}));
 for(const e of entries){
  const x=ox+e.x/100*contentW,y=oy+e.y/100*contentH;
  const w=e.width*scale,h=e.height*scale;
  const g=element('g',{transform:`translate(${x} ${y}) rotate(${e.angle})`});
  g.append(element('rect',{x:-w/2,y:-h/2,width:w,height:h,rx:0.6,fill:'none',stroke:'#111','stroke-width':0.22}));
  svg.append(g);
  // Card-name labels remain upright and BELOW the rotated card outline.
  const rad=e.angle*Math.PI/180;
  const halfHeight=(Math.abs(Math.cos(rad))*h+Math.abs(Math.sin(rad))*w)/2;
  const font=Math.min(3.5,Math.max(1.6,w/Math.max(6,e.label.length)*1.3));
  const labelY=y+halfHeight+Math.max(1.2,2*scale);
  svg.append(element('text',{x,y:labelY+font,'text-anchor':'middle','font-family':'sans-serif','font-size':font,fill:'#111'},e.label));
 }
 return svg;
}
function download(svg){
 const xml=new XMLSerializer().serializeToString(svg);
 const blob=new Blob([xml],{type:'image/svg+xml;charset=utf-8'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='TABULA-配置図.svg';document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),2000);
}
function print(svg){
 const xml=new XMLSerializer().serializeToString(svg);
 const win=window.open('','_blank');
 if(!win){download(svg);alert('ポップアップが制限されたためSVGを保存しました。SVGを開いて印刷してください。');return;}
 win.document.write('<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>TABULA 配置図</title><style>@page{size:A4 portrait;margin:0}body{margin:0}svg{width:210mm;height:297mm;display:block}@media screen{body{background:#ddd}svg{background:white;margin:auto}}</style></head><body>'+xml+'</body></html>');
 win.document.close();win.focus();setTimeout(()=>win.print(),300);
}
function install(){
 const bar=document.querySelector('.main > .toolbar');if(!bar||$('printPlacement'))return;
 const button=document.createElement('button');button.type='button';button.id='printPlacement';button.textContent='配置図を印刷';button.title='現在の卓を、カードの外枠と名前だけでA4印刷／PDF保存';
 button.addEventListener('click',()=>{
  try{const svg=printable();print(svg)}catch(e){alert(e.message)}
 });
 bar.append(button);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();