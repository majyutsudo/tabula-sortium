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
 const cardAnchors=[];
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
  const halfHeight=(Math.abs(Math.cos(angle*Math.PI/180))*h+Math.abs(Math.sin(angle*Math.PI/180))*w)/2;
  cardAnchors.push({x,y:y+halfHeight,angle,used:false});
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
  const label=element('text',{x,y,'text-anchor':'middle','font-family':style.fontFamily||'sans-serif','font-size':font,fill:'#111'},node.textContent.trim());
  // Pair each label with the nearest unused card's expected below-card anchor.
  // Keep text horizontal by default, but retain the angle for editor controls.
  const match=cardAnchors.filter(a=>!a.used).sort((a,b)=>Math.hypot(a.x-x,a.y-(y-font))-Math.hypot(b.x-x,b.y-(y-font)))[0];
  if(match){match.used=true;label.setAttribute('data-card-angle',String(match.angle));}
  svg.append(label);
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

function editor(source){
 const svg=source.cloneNode(true);
 const root=document.createElement('div');root.id='tabulaPrintEditor';
 root.style.cssText='position:fixed;inset:0;z-index:2147483646;background:#202027;display:flex;flex-direction:column;color:#eee;font:14px system-ui,sans-serif';
 const toolbar=document.createElement('div');toolbar.style.cssText='display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:10px;background:#30303a';
 const stage=document.createElement('div');stage.style.cssText='flex:1;min-height:0;overflow:auto;display:flex;justify-content:center;align-items:flex-start;padding:16px';
 svg.style.cssText='background:white;width:min(100%,650px);height:auto;box-shadow:0 4px 25px #0008;touch-action:none;user-select:none;flex-shrink:0';
 stage.append(svg);root.append(toolbar,stage);document.body.append(root);
 const texts=[...svg.querySelectorAll('text')];
 const baseViewBox='0 0 210 297';
 const overlay=element('g',{'data-editor-overlay':'grid', 'pointer-events':'none'});
 const gridDefs=element('defs');
 const pattern=element('pattern',{id:'tabula-print-grid',width:5,height:5,patternUnits:'userSpaceOnUse'});
 pattern.append(element('path',{d:'M 5 0 L 0 0 0 5',fill:'none',stroke:'#80a0b9','stroke-width':0.12}));gridDefs.append(pattern);
 overlay.append(gridDefs,element('rect',{width:210,height:297,fill:'url(#tabula-print-grid)'}));
 overlay.style.display='none';svg.append(overlay);
 let selected=null,drag=null;
 const control=(tag,label)=>{const e=document.createElement(tag);e.title=label;e.setAttribute('aria-label',label);e.style.cssText='padding:5px 8px;min-height:30px;color:#111;background:#fff;border:1px solid #aaa;border-radius:4px';toolbar.append(e);return e;};
 const heading=document.createElement('strong');heading.textContent='配置図エディター';toolbar.append(heading);
 const zoom=control('select','表示倍率');for(const n of [100,150,200,400]){const o=document.createElement('option');o.value=n;o.textContent=n+'%';zoom.append(o)}
 zoom.onchange=()=>{svg.style.width=(650*Number(zoom.value)/100)+'px';stage.style.justify=Number(zoom.value)>100?'flex-start':'center'};
 const gridLabel=document.createElement('label');gridLabel.style.cssText='display:flex;align-items:center;gap:3px';
 const gridToggle=document.createElement('input');gridToggle.type='checkbox';gridToggle.onchange=()=>overlay.style.display=gridToggle.checked?'':'none';gridLabel.append(gridToggle,document.createTextNode('5mmグリッド'));toolbar.append(gridLabel);
 const size=control('input','文字サイズ (mm)');size.type='number';size.min='1';size.max='30';size.step='0.5';size.style.width='64px';
 const family=control('select','フォント');
 for(const [name,value] of [['明朝体','serif'],['ゴシック体','sans-serif'],['等幅','monospace']]){const o=document.createElement('option');o.textContent=name;o.value=value;family.append(o);}
 const value=control('input','ラベルの文字');value.placeholder='ラベルを選択';value.style.width='140px';
 const angle=control('input','ラベルの回転角度 (度)');angle.type='number';angle.min='-360';angle.max='360';angle.step='1';angle.style.width='65px';
 const alignCard=control('button','カードと同じ角度');alignCard.textContent='カードに合わせる';
 const horizontal=control('button','水平に戻す');horizontal.textContent='水平';
 const angleOf=t=>Number(t?.getAttribute('data-label-angle')||0);
 function setAngle(t,n){if(!t||!Number.isFinite(n))return;const x=Number(t.getAttribute('x')),y=Number(t.getAttribute('y'));t.setAttribute('data-label-angle',String(n));if(n)t.setAttribute('transform',`rotate(${n} ${x} ${y})`);else t.removeAttribute('transform');}
 function syncAngle(t){if(t)setAngle(t,angleOf(t));}
 const all=control('button','全ラベルに適用');all.textContent='全ラベルに適用';
 const reset=control('button','初期状態に戻す');reset.textContent='元に戻す';
 const transparentLabel=document.createElement('label');transparentLabel.style.cssText='display:flex;align-items:center;gap:3px';
 const transparent=document.createElement('input');transparent.type='checkbox';transparentLabel.append(transparent,document.createTextNode('透明背景'));toolbar.append(transparentLabel);
 const dpi=control('select','PNG解像度');for(const n of [150,300,600]){const o=document.createElement('option');o.value=n;o.textContent=n+' dpi';if(n===300)o.selected=true;dpi.append(o);}
 const svgButton=control('button','SVG保存');svgButton.textContent='SVG保存';
 const pngButton=control('button','PNG保存');pngButton.textContent='PNG保存';
 const printButton=control('button','印刷');printButton.textContent='印刷';
 const close=control('button','閉じる');close.textContent='閉じる';
 const original=source.cloneNode(true);
 const background=()=>svg.querySelector('rect');
 function exportSvg(){
  const copy=svg.cloneNode(true);copy.removeAttribute('style');copy.querySelector('[data-editor-overlay="grid"]')?.remove();
  copy.querySelectorAll('text').forEach(t=>{t.removeAttribute('text-decoration');t.removeAttribute('style')});
  if(transparent.checked)copy.querySelector('rect')?.remove();
  copy.setAttribute('width','210mm');copy.setAttribute('height','297mm');
  return copy;
 }
 function choose(t){
  if(selected)selected.removeAttribute('text-decoration');
  selected=t;
  if(!t){value.value='';size.value='';angle.value='';return;}
  t.setAttribute('text-decoration','underline');
  value.value=t.textContent;size.value=Number(t.getAttribute('font-size')||3).toFixed(1);angle.value=String(angleOf(t));
  family.value=t.getAttribute('font-family')==='sans-serif'?'sans-serif':t.getAttribute('font-family')==='monospace'?'monospace':'serif';
 }
 texts.forEach(t=>{t.style.cursor='move';t.addEventListener('pointerdown',e=>{
  e.preventDefault();choose(t);const pt=svg.createSVGPoint();pt.x=e.clientX;pt.y=e.clientY;
  const matrix=svg.getScreenCTM();if(!matrix)return;const p=pt.matrixTransform(matrix.inverse());
  drag={t,startX:p.x,startY:p.y,x:Number(t.getAttribute('x')),y:Number(t.getAttribute('y'))};
  t.setPointerCapture(e.pointerId);
  root.focus({preventScroll:true});
 });t.addEventListener('pointermove',e=>{
  if(!drag||drag.t!==t)return;
  const matrix=svg.getScreenCTM();if(!matrix)return;const pt=svg.createSVGPoint();pt.x=e.clientX;pt.y=e.clientY;const p=pt.matrixTransform(matrix.inverse());
  t.setAttribute('x',drag.x+p.x-drag.startX);t.setAttribute('y',drag.y+p.y-drag.startY);syncAngle(t);
 });t.addEventListener('pointerup',()=>drag=null);t.addEventListener('pointercancel',()=>drag=null);});
 size.oninput=()=>{if(selected&&Number(size.value)>0)selected.setAttribute('font-size',size.value)};
 family.onchange=()=>{if(selected)selected.setAttribute('font-family',family.value)};
 value.oninput=()=>{if(selected)selected.textContent=value.value};
 angle.oninput=()=>{if(selected&&angle.value!=='')setAngle(selected,Number(angle.value))};
 alignCard.onclick=()=>{if(selected){setAngle(selected,Number(selected.getAttribute('data-card-angle')||0));angle.value=String(angleOf(selected))}};
 horizontal.onclick=()=>{if(selected){setAngle(selected,0);angle.value='0'}};
 all.onclick=()=>{const n=Number(size.value);for(const t of texts){if(n>0)t.setAttribute('font-size',n);t.setAttribute('font-family',family.value)}};
 reset.onclick=()=>{if(!confirm('編集を初期状態に戻しますか？'))return;const orig=[...original.querySelectorAll('text')];texts.forEach((t,i)=>{const o=orig[i];if(!o)return;for(const attr of ['x','y','font-size','font-family'])t.setAttribute(attr,o.getAttribute(attr));t.textContent=o.textContent;setAngle(t,0)});choose(null)};
 svgButton.onclick=()=>download(exportSvg());
 pngButton.onclick=async()=>{
  try{
   const xml=new XMLSerializer().serializeToString(exportSvg());
   const blob=new Blob([xml],{type:'image/svg+xml;charset=utf-8'}),url=URL.createObjectURL(blob);
   const img=new Image();try{
    await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('SVGの画像変換に失敗しました'));img.src=url});
    const canvas=document.createElement('canvas');const factor=Number(dpi.value)/25.4;
    canvas.width=Math.round(210*factor);canvas.height=Math.round(297*factor);
    const ctx=canvas.getContext('2d');if(!ctx)throw Error('画像用メモリを確保できません');
    ctx.drawImage(img,0,0,canvas.width,canvas.height);
    const png=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
    if(!png)throw Error('PNGを生成できませんでした');
    const link=URL.createObjectURL(png),a=document.createElement('a');a.href=link;a.download='TABULA-配置図-'+dpi.value+'dpi.png';a.click();setTimeout(()=>URL.revokeObjectURL(link),2000);
   }finally{URL.revokeObjectURL(url)}
  }catch(e){alert(e.message)}
 };
 printButton.onclick=()=>print(exportSvg());
 close.onclick=()=>root.remove();
 root.addEventListener('keydown',e=>{
  if(e.key==='Escape'){root.remove();return;}
  if(!selected||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;
  const target=e.target;if(target?.closest?.('input,textarea,select,[contenteditable]'))return;
  e.preventDefault();const step=e.altKey?0.1:e.shiftKey?2:0.5;
  const dx=e.key==='ArrowLeft'?-step:e.key==='ArrowRight'?step:0;
  const dy=e.key==='ArrowUp'?-step:e.key==='ArrowDown'?step:0;
  selected.setAttribute('x',Number(selected.getAttribute('x'))+dx);
  selected.setAttribute('y',Number(selected.getAttribute('y'))+dy);syncAngle(selected);
 });
 root.tabIndex=-1;root.focus();
}

function install(){
 const bar=document.querySelector('.main > .toolbar');if(!bar||$('printPlacement'))return;
 const button=document.createElement('button');button.type='button';button.id='printPlacement';button.textContent='配置図を編集・出力';button.title='カード枠とラベルを編集してSVG・PNG保存／印刷';
 button.addEventListener('click',()=>{
  try{if($('tabulaPrintEditor'))return;editor(printable())}catch(e){alert(e.message)}
 });
 bar.append(button);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();