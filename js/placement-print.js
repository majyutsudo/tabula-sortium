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
 const svg=source.cloneNode(true),root=document.createElement('div');
 root.id='tabulaPrintEditor';root.tabIndex=-1;
 const css=document.createElement('style');
 css.textContent='#tabulaPrintEditor{position:fixed;inset:0;z-index:2147483646;display:flex;flex-direction:column;background:#211d19;color:#e9deca;font:13px Georgia,"Yu Mincho",serif}#tabulaPrintEditor *{box-sizing:border-box}#tabulaPrintEditor button,#tabulaPrintEditor input,#tabulaPrintEditor select{font:inherit;border:1px solid #827357;border-radius:4px;background:#302f29;color:#f3e8d3;padding:6px 9px;min-height:32px}#tabulaPrintEditor button{cursor:pointer}#tabulaPrintEditor button:hover{background:#4b4b3d}#tabulaPrintEditor button:disabled{opacity:.4;cursor:default}#tabulaPrintEditor .tp-head{display:flex;align-items:center;flex-wrap:wrap;gap:8px;padding:10px 15px;background:#242823;border-bottom:1px solid #806e4d}#tabulaPrintEditor .tp-head strong{font-size:17px;letter-spacing:.09em;color:#e8d09c;margin-right:12px}#tabulaPrintEditor .tp-spacer{flex:1}#tabulaPrintEditor .tp-head .tp-export{border-color:#c3a46a;color:#ffebbf}#tabulaPrintEditor .tp-main{display:flex;flex:1;min-height:0}#tabulaPrintEditor .tp-work{flex:1;min-width:0;overflow:auto;padding:22px;background:radial-gradient(ellipse,#393027,#211b17)}#tabulaPrintEditor .tp-sheet{width:650px;margin:0 auto}#tabulaPrintEditor .tp-sheet svg{display:block;width:100%;height:auto;background:white;box-shadow:0 8px 30px #0009;touch-action:none;user-select:none}#tabulaPrintEditor .tp-side{width:275px;flex:none;overflow:auto;padding:16px;background:#242823;border-left:1px solid #655743}#tabulaPrintEditor .tp-section{border-bottom:1px solid #514c3d;padding-bottom:15px;margin-bottom:16px}#tabulaPrintEditor .tp-section h3{font-size:13px;font-weight:normal;letter-spacing:.1em;color:#e1c58d;margin:0 0 12px}#tabulaPrintEditor .tp-field{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:8px 0}#tabulaPrintEditor .tp-field label{font:12px sans-serif;color:#d2c8b6}#tabulaPrintEditor .tp-field input,#tabulaPrintEditor .tp-field select{width:127px;min-width:0}#tabulaPrintEditor .tp-field input[type=checkbox]{width:auto;min-height:0;accent-color:#c3a46a}#tabulaPrintEditor .tp-actions{display:flex;gap:6px;flex-wrap:wrap}#tabulaPrintEditor .tp-note{color:#bcb19d;font:12px/1.6 sans-serif}#tabulaPrintEditor .tp-status{padding:7px 14px;background:#242823;border-top:1px solid #655743;color:#cbbd9e;font:12px sans-serif}#tabulaPrintEditor .tp-selected{stroke:#447dbb!important;stroke-width:.55!important;stroke-dasharray:2 1}#tabulaPrintEditor .tp-head select{max-width:120px}@media(max-width:760px){#tabulaPrintEditor .tp-main{flex-direction:column}#tabulaPrintEditor .tp-side{width:100%;max-height:42%;border-left:0;border-top:1px solid #655743}#tabulaPrintEditor .tp-work{padding:12px}}';
 root.append(css);
 const make=(tag,parent,text,cls)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;if(parent)parent.append(el);return el;};
 const button=(parent,label,fn,cls)=>{const el=make('button',parent,label,cls);el.type='button';el.onclick=fn;return el;};
 const head=make('div',root,undefined,'tp-head');
 make('strong',head,'TABULA · 配置図');
 make('span',head,'選択対象','tp-note');
 const mode=make('select',head);
 [['all','すべて'],['card','カード枠'],['label','ラベル']].forEach(pair=>{const opt=make('option',mode,pair[1]);opt.value=pair[0];});
 const undoBtn=button(head,'↶ 元に戻す',undo),redoBtn=button(head,'↷ やり直す',redo);
 button(head,'初期配置に戻す',()=>{if(!confirm('カード枠とラベルの編集をすべて破棄し、最初の配置に戻します。よろしいですか？'))return;restore(initial);history=[];future=[];refresh();});
 make('span',head,undefined,'tp-spacer');
 button(head,'SVG保存',()=>download(exportSvg()),'tp-export');
 button(head,'PNG保存',()=>savePng(),'tp-export');
 button(head,'印刷 / PDF',()=>print(exportSvg()),'tp-export');
 button(head,'閉じる',()=>root.remove());
 const main=make('div',root,undefined,'tp-main'),work=make('div',main,undefined,'tp-work'),sheet=make('div',work,undefined,'tp-sheet'),side=make('aside',main,undefined,'tp-side'),status=make('div',root,undefined,'tp-status');
 sheet.append(svg);document.body.append(root);
 const cards=[...svg.children].filter(el=>el.localName==='g'&&el.querySelector(':scope > rect'));
 const labels=[...svg.children].filter(el=>el.localName==='text');
 const elements=[...cards,...labels],selection=new Set();
 const bg=svg.querySelector(':scope > rect');
 const grid=element('g',{'data-editor-overlay':'grid','pointer-events':'none'}),defs=element('defs'),pattern=element('pattern',{id:'tp-print-grid',width:5,height:5,patternUnits:'userSpaceOnUse'});
 pattern.append(element('path',{d:'M5 0H0V5',stroke:'#9fb1c7','stroke-width':.12,fill:'none'}));defs.append(pattern);grid.append(defs,element('rect',{width:210,height:297,fill:'url(#tp-print-grid)'}));grid.style.display='none';svg.append(grid);
 let active=null,drag=null,history=[],future=[],zoom=100,showGrid=false,transparent=false,dpi=300,linkLabels=false;
 const type=el=>labels.includes(el)?'label':'card';
 const coords=el=>{if(type(el)==='label')return{x:Number(el.getAttribute('x')),y:Number(el.getAttribute('y'))};const m=(el.getAttribute('transform')||'').match(/translate\(\s*([-\d.]+)[ ,]+([-\d.]+)/);return{x:Number(m?.[1]||0),y:Number(m?.[2]||0)};};
 const angle=el=>{if(type(el)==='label')return Number(el.getAttribute('data-label-angle')||0);const m=(el.getAttribute('transform')||'').match(/rotate\(\s*([-\d.]+)/);return Number(m?.[1]||0);};
 function setAngle(el,n){const p=coords(el);if(type(el)==='card')el.setAttribute('transform','translate('+p.x+' '+p.y+') rotate('+n+')');else{el.setAttribute('data-label-angle',n);if(n)el.setAttribute('transform','rotate('+n+' '+p.x+' '+p.y+')');else el.removeAttribute('transform');}}
 function setPosition(el,x,y){if(type(el)==='card')el.setAttribute('transform','translate('+x+' '+y+') rotate('+angle(el)+')');else{const a=angle(el);el.setAttribute('x',x);el.setAttribute('y',y);setAngle(el,a);}}
 const snapshot=()=>elements.map(el=>({attrs:[...el.attributes].map(a=>[a.name,a.value]),text:type(el)==='label'?el.textContent:null,stroke:type(el)==='card'?el.querySelector('rect')?.getAttribute('stroke-width'):null}));
 const initial=snapshot();
 function restore(state){state.forEach((v,i)=>{const el=elements[i];[...el.attributes].forEach(a=>el.removeAttribute(a.name));v.attrs.forEach(a=>el.setAttribute(a[0],a[1]));if(type(el)==='label')el.textContent=v.text;else el.querySelector('rect')?.setAttribute('stroke-width',v.stroke||'.22');});selection.clear();active=null;}
 function remember(){history.push(snapshot());if(history.length>100)history.shift();future=[];}
 function undo(){if(!history.length)return;future.push(snapshot());restore(history.pop());refresh();}
 function redo(){if(!future.length)return;history.push(snapshot());restore(future.pop());refresh();}
 function select(el,shift){if(!shift)selection.clear();if(el){if(shift&&selection.has(el))selection.delete(el);else selection.add(el);}active=selection.has(el)?el:([...selection].at(-1)||null);refresh();}
 function section(title){const el=make('div',side,undefined,'tp-section');make('h3',el,title);return el;}
 function field(parent,label,value,fn,kind='number'){const row=make('div',parent,undefined,'tp-field');make('label',row,label);const input=make('input',row);input.type=kind;input.value=value;input.onchange=()=>{remember();fn(input.value);refresh();};return input;}
 function selectField(parent,label,values,current,fn){const row=make('div',parent,undefined,'tp-field');make('label',row,label);const input=make('select',row);values.forEach(pair=>{const o=make('option',input,pair[1]);o.value=pair[0];});input.value=current;input.onchange=()=>{fn(input.value);refresh();};return input;}
 function check(parent,label,value,fn){const row=make('div',parent,undefined,'tp-field');make('label',row,label);const input=make('input',row);input.type='checkbox';input.checked=value;input.onchange=()=>{fn(input.checked);};}
 function properties(){
  side.replaceChildren();
  const view=section('表示');
  selectField(view,'倍率',[[100,'100%'],[150,'150%'],[200,'200%'],[400,'400%']],zoom,v=>{zoom=Number(v);sheet.style.width=650*zoom/100+'px';sheet.style.margin=zoom>100?'0':'0 auto';});
  check(view,'5mmグリッド',showGrid,v=>{showGrid=v;grid.style.display=v?'':'none';});
  if(!selection.size)make('p',side,'カード枠またはラベルをクリックすると、ここに編集項目が表示されます。','tp-note');
  else{
   const same=[...selection].every(el=>type(el)===type(active)),s=section(selection.size>1?selection.size+'件を編集':type(active)==='card'?'カード枠':'ラベル');
   if(!same)make('p',s,'枠とラベルを一緒に移動できます。書式の変更は同じ種類を選択してください。','tp-note');
   const p=coords(active);
   field(s,'X (mm)',p.x.toFixed(2),v=>{const d=Number(v)-p.x;if(Number.isFinite(d))selection.forEach(el=>{const q=coords(el);setPosition(el,q.x+d,q.y);});});
   field(s,'Y (mm)',p.y.toFixed(2),v=>{const d=Number(v)-p.y;if(Number.isFinite(d))selection.forEach(el=>{const q=coords(el);setPosition(el,q.x,q.y+d);});});
   field(s,'角度 (°)',angle(active),v=>{if(Number.isFinite(Number(v)))selection.forEach(el=>setAngle(el,Number(v)));});
   if(same&&type(active)==='label'){
    if(selection.size===1)field(s,'文字',active.textContent,v=>{active.textContent=v;},'text');
    field(s,'文字サイズ (mm)',active.getAttribute('font-size'),v=>{if(Number(v)>0)selection.forEach(el=>el.setAttribute('font-size',v));});
    selectField(s,'書体',[['serif','明朝体'],['sans-serif','ゴシック体'],['monospace','等幅']],active.getAttribute('font-family')||'serif',v=>{remember();selection.forEach(el=>el.setAttribute('font-family',v));});
    const actions=make('div',s,undefined,'tp-actions');
    button(actions,'各カードの角度',()=>{remember();selection.forEach(el=>setAngle(el,Number(el.getAttribute('data-card-angle')||0)));refresh();});
    button(actions,'水平',()=>{remember();selection.forEach(el=>setAngle(el,0));refresh();});
   }
   if(same&&type(active)==='card')field(s,'枠線幅 (mm)',active.querySelector('rect')?.getAttribute('stroke-width')||'.22',v=>{if(Number(v)>=0)selection.forEach(el=>el.querySelector('rect')?.setAttribute('stroke-width',v));});
   make('p',s,'Shift＋クリックで複数選択。矢印キーで微調整できます。','tp-note');
  }
  const output=section('書き出し設定');
  check(output,'透明背景',transparent,v=>transparent=v);
  selectField(output,'PNG解像度',[[150,'150 dpi'],[300,'300 dpi'],[600,'600 dpi']],dpi,v=>dpi=Number(v));
  make('p',output,'グリッドと選択枠は出力しません。','tp-note');
 }
 function refresh(){
  elements.forEach(el=>{const on=selection.has(el);if(type(el)==='card')el.querySelector('rect')?.classList.toggle('tp-selected',on);else if(on)el.setAttribute('text-decoration','underline');else el.removeAttribute('text-decoration');});
  undoBtn.disabled=!history.length;redoBtn.disabled=!future.length;
  status.textContent=selection.size?'選択 '+selection.size+'件　｜　矢印 0.5mm ・ Shift＋矢印 2mm ・ Alt＋矢印 0.1mm':'選択なし　｜　クリックで選択 ・ Shift＋クリックで追加';
  properties();
 }
 function exportSvg(){const copy=svg.cloneNode(true);copy.removeAttribute('style');copy.querySelector('[data-editor-overlay="grid"]')?.remove();copy.querySelectorAll('.tp-selected').forEach(el=>el.classList.remove('tp-selected'));copy.querySelectorAll('text').forEach(el=>{el.removeAttribute('text-decoration');el.removeAttribute('style');});if(transparent)copy.querySelector(':scope > rect')?.remove();copy.setAttribute('width','210mm');copy.setAttribute('height','297mm');return copy;}
 async function savePng(){try{const xml=new XMLSerializer().serializeToString(exportSvg()),url=URL.createObjectURL(new Blob([xml],{type:'image/svg+xml;charset=utf-8'}));try{const img=new Image();await new Promise((ok,fail)=>{img.onload=ok;img.onerror=()=>fail(Error('SVGの変換に失敗しました'));img.src=url;});const canvas=document.createElement('canvas'),factor=dpi/25.4;canvas.width=Math.round(210*factor);canvas.height=Math.round(297*factor);const ctx=canvas.getContext('2d');if(!ctx)throw Error('画像用メモリ不足');ctx.drawImage(img,0,0,canvas.width,canvas.height);const blob=await new Promise(ok=>canvas.toBlob(ok,'image/png'));if(!blob)throw Error('PNGを生成できませんでした');const href=URL.createObjectURL(blob),a=document.createElement('a');a.href=href;a.download='TABULA-配置図-'+dpi+'dpi.png';a.click();setTimeout(()=>URL.revokeObjectURL(href),2000);}finally{URL.revokeObjectURL(url);}}catch(e){alert(e.message);}}
 function point(e){const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;const m=svg.getScreenCTM();return m?p.matrixTransform(m.inverse()):null;}
 elements.forEach(el=>{
  el.style.cursor='move';
  el.addEventListener('pointerdown',e=>{
   if(mode.value!=='all'&&type(el)!==mode.value)return;
   e.preventDefault();
   if(!selection.has(el)||e.shiftKey)select(el,e.shiftKey);
   if(!selection.has(el))return;
   const p=point(e);if(!p)return;
   drag={el,p,moved:false,items:[...selection].map(item=>({item,...coords(item)}))};
   el.setPointerCapture(e.pointerId);root.focus({preventScroll:true});
  });
  el.addEventListener('pointermove',e=>{if(!drag||drag.el!==el)return;const p=point(e);if(!p)return;const dx=p.x-drag.p.x,dy=p.y-drag.p.y;if(!drag.moved&&Math.hypot(dx,dy)>.1){remember();drag.moved=true;}if(!drag.moved)return;drag.items.forEach(v=>setPosition(v.item,v.x+dx,v.y+dy));});
  el.addEventListener('pointerup',()=>{drag=null;refresh();});
  el.addEventListener('pointercancel',()=>{drag=null;refresh();});
 });
 root.addEventListener('keydown',e=>{
  if(e.key==='Escape'){if(selection.size){selection.clear();active=null;refresh();}else root.remove();return;}
  if(e.target?.closest?.('input,textarea,select,[contenteditable]'))return;
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo();return;}
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){e.preventDefault();redo();return;}
  if(!selection.size||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;
  e.preventDefault();remember();const step=e.altKey?.1:e.shiftKey?2:.5;
  const dx=e.key==='ArrowLeft'?-step:e.key==='ArrowRight'?step:0,dy=e.key==='ArrowUp'?-step:e.key==='ArrowDown'?step:0;
  selection.forEach(el=>{const p=coords(el);setPosition(el,p.x+dx,p.y+dy);});refresh();
 });
 root.focus();refresh();
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