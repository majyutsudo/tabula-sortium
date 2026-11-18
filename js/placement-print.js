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
 // Use actual on-screen geometry for BOTH cards and labels. The labels are
 // independent DOM elements; their positions must never be inferred from cards.
 const zw=zone.offsetWidth,zh=zone.offsetHeight;
 const pageW=210,pageH=297,margin=12;
 const scale=Math.min((pageW-2*margin)/zw,(pageH-2*margin)/zh);
 const ox=(pageW-zw*scale)/2,oy=(pageH-zh*scale)/2;
 const toX=px=>ox+(px-zr.left)*zw/zr.width*scale;
 const toY=px=>oy+(px-zr.top)*zh/zr.height*scale;
 const sx=zw/zr.width,sy=zh/zr.height;
 const svg=element('svg',{xmlns:ns,viewBox:'0 0 210 297',width:'210mm',height:'297mm'});
 svg.append(element('rect',{width:210,height:297,fill:'#fff'}));
 // Outlines first, then labels, matching TABULA's separate label layer.
 for(const node of nodes){
  const idx=Number(node.dataset.index),item=live.cards[idx];
  if(!item)continue;
  const rect=node.getBoundingClientRect();
  const x=toX(rect.left+rect.width/2),y=toY(rect.top+rect.height/2);
  const w=node.offsetWidth*scale,h=node.offsetHeight*scale;
  const angle=parseFloat(node.style.getPropertyValue('--rotation'))||0;
  const g=element('g',{transform:`translate(${x} ${y}) rotate(${angle})`});
  g.append(element('rect',{x:-w/2,y:-h/2,width:w,height:h,rx:0.6,fill:'none',stroke:'#111','stroke-width':0.22}));
  svg.append(g);
 }
 // Render only the card-name labels actually shown on the table, in their
 // real positions, including any intentional overlaps in the Celtic cross.
 for(const node of zone.querySelectorAll(':scope > .zone-label.unified-label')){
  if(!node.textContent.trim()||getComputedStyle(node).display==='none')continue;
  const rect=node.getBoundingClientRect();
  if(!rect.width||!rect.height)continue;
  const style=getComputedStyle(node);
  const fontPx=parseFloat(style.fontSize)||12;
  const font=fontPx*sy*scale;
  const x=toX(rect.left+rect.width/2);
  const y=toY(rect.top)+font*0.87;
  svg.append(element('text',{x,y,'text-anchor':'middle','font-family':style.fontFamily||'sans-serif','font-size':font,fill:'#111'},node.textContent.trim()));
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