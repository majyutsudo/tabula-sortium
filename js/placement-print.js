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
 // Draw order matches the tabletop's card/label layering preference.
 const labelLayer=$('crossLabelLayer')?.value==='front'?'front':'behind';
 svg.setAttribute('data-label-layer',labelLayer);
 const cardAnchors=[];
 for(const node of nodes){
  const idx=Number(node.dataset.index),item=live.cards[idx];
  if(!item)continue;
  const rect=node.getBoundingClientRect();
  const x=toX(rect.left+rect.width/2),y=toY(rect.top+rect.height/2);
  const w=node.offsetWidth*scale,h=node.offsetHeight*scale;
  const angle=parseFloat(node.style.getPropertyValue('--rotation'))||0;
  const g=element('g',{transform:`translate(${x} ${y}) rotate(${angle})`});
  g.append(element('rect',{x:-w/2,y:-h/2,width:w,height:h,rx:0.6,fill:'#fff',stroke:'#111','stroke-width':0.22}));
  svg.append(g);
  const halfHeight=(Math.abs(Math.cos(angle*Math.PI/180))*h+Math.abs(Math.sin(angle*Math.PI/180))*w)/2;
  cardAnchors.push({x,y:y+halfHeight,angle,used:false});
 }
 // Render only the card-name labels actually shown on the table, in their
 // real positions, including any intentional overlaps in the Celtic cross.
 const labelNodes=[];
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
  if(node.dataset.positionName&&node.dataset.positionNumber){label.setAttribute('data-position-name',node.dataset.positionName);label.setAttribute('data-position-number',node.dataset.positionNumber);}
  // Pair each label with the nearest unused card's expected below-card anchor.
  // Keep text horizontal by default, but retain the angle for editor controls.
  const match=cardAnchors.filter(a=>!a.used).sort((a,b)=>Math.hypot(a.x-x,a.y-(y-font))-Math.hypot(b.x-x,b.y-(y-font)))[0];
  if(match){match.used=true;label.setAttribute('data-card-angle',String(match.angle));}
  labelNodes.push(label);
 }
 if(labelLayer==='behind'){
  const firstCard=[...svg.children].find(el=>el.localName==='g');
  for(const label of labelNodes)svg.insertBefore(label,firstCard||null);
 }else for(const label of labelNodes)svg.append(label);
 return svg;
}
function download(svg){
 const xml=new XMLSerializer().serializeToString(svg);
 const blob=new Blob([xml],{type:'image/svg+xml;charset=utf-8'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='TABULA-配置図.svg';document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),2000);
}
// Create a self-contained, single-page A4 PDF; no network library or print dialog needed.
async function createPlacementPdf(svg){
 const xml=new XMLSerializer().serializeToString(svg);
 const svgUrl=URL.createObjectURL(new Blob([xml],{type:'image/svg+xml;charset=utf-8'}));
 let jpeg;
 const width=Math.round(210*150/25.4),height=Math.round(297*150/25.4);
 try{
  const img=new Image();
  await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('配置図の画像変換に失敗しました。'));img.src=svgUrl;});
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d');if(!ctx)throw Error('PDF作成用のメモリを確保できませんでした。');
  ctx.fillStyle='#ffffff';ctx.fillRect(0,0,width,height);
  ctx.drawImage(img,0,0,width,height);
  jpeg=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',0.94));
  canvas.width=0;canvas.height=0;
  if(!jpeg)throw Error('PDF用画像を生成できませんでした。');
 }finally{URL.revokeObjectURL(svgUrl);}
 const imageBytes=new Uint8Array(await jpeg.arrayBuffer());
 const encoder=new TextEncoder(),chunks=[],offsets=[0];
 let pos=0;
 const add=part=>{const bytes=typeof part==='string'?encoder.encode(part):part;chunks.push(bytes);pos+=bytes.byteLength;};
 const object=(id,parts)=>{offsets[id]=pos;add(id+' 0 obj\n');for(const part of parts)add(part);add('\nendobj\n');};
 add('%PDF-1.4\n%TABULA\n');
 object(1,['<< /Type /Catalog /Pages 2 0 R >>']);
 object(2,['<< /Type /Pages /Kids [3 0 R] /Count 1 >>']);
 object(3,['<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.276 841.89] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>']);
 object(4,['<< /Type /XObject /Subtype /Image /Width '+width+' /Height '+height+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+imageBytes.byteLength+' >>\nstream\n',imageBytes,'\nendstream']);
 const commands='q\n595.276 0 0 841.89 0 0 cm\n/Im0 Do\nQ\n';
 object(5,['<< /Length '+encoder.encode(commands).byteLength+' >>\nstream\n',commands,'endstream']);
 const xref=pos;
 add('xref\n0 6\n0000000000 65535 f \n');
 for(let id=1;id<=5;id++)add(String(offsets[id]).padStart(10,'0')+' 00000 n \n');
 add('trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF\n');
 return new Blob(chunks,{type:'application/pdf'});
}
function print(svg){
 // Use the same dismissible in-app preview in Safari and installed home-screen apps.
  const previous=document.getElementById('tabulaStandalonePrintPreview');
  if(previous)previous.remove();
  const overlay=document.createElement('section');
  overlay.id='tabulaStandalonePrintPreview';
  overlay.setAttribute('role','dialog');
  overlay.setAttribute('aria-modal','true');
  overlay.setAttribute('aria-label','配置図の印刷プレビュー');
  const standalone=window.navigator.standalone===true||(window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches);
  let pdfUrl=null,pdfFile=null;
  overlay.innerHTML='<style>'+
   '#tabulaStandalonePrintPreview{position:fixed;inset:0;z-index:2147483647;background:#e2e2e2;color:#222;overflow:auto;-webkit-overflow-scrolling:touch;padding:0 0 env(safe-area-inset-bottom,0px)}'+
   '#tabulaStandalonePrintPreview .tp-print-controls{position:sticky;top:0;z-index:1;display:flex;flex-wrap:wrap;gap:8px;padding:calc(10px + env(safe-area-inset-top,0px)) 12px 10px;background:#222;color:white}'+
   '#tabulaStandalonePrintPreview button,#tabulaStandalonePrintPreview .tp-pdf-download{font:inherit;padding:9px 13px;border:1px solid #999;border-radius:6px;background:white;color:#222;cursor:pointer;text-decoration:none}'+
   '#tabulaStandalonePrintPreview .tp-print-paper{width:min(100%,210mm);margin:12px auto;background:white;box-shadow:0 2px 12px #999}'+
   '#tabulaStandalonePrintPreview .tp-print-paper svg{width:100%;height:auto;display:block}'+
   '#tabulaStandalonePrintPreview .tp-print-note{padding:0 12px 16px;font-size:13px;line-height:1.6}'+
   '@media print{@page{size:A4 portrait;margin:0}'+
   ':root,html,body{background:#fff!important;background-image:none!important;color:#111!important;margin:0!important;padding:0!important;min-height:0!important;height:auto!important;overflow:visible!important}'+
   'body>*:not(#tabulaStandalonePrintPreview){display:none!important}'+
   '#tabulaStandalonePrintPreview{position:static!important;inset:auto!important;display:block!important;width:205mm!important;height:285mm!important;max-width:205mm!important;max-height:285mm!important;min-height:0!important;overflow:hidden!important;background:#fff!important;margin:0!important;padding:0!important;box-shadow:none!important;break-after:avoid!important;page-break-after:avoid!important}'+
   '#tabulaStandalonePrintPreview .tp-print-controls,#tabulaStandalonePrintPreview .tp-print-note{display:none!important}'+
   '#tabulaStandalonePrintPreview .tp-print-paper{display:block!important;width:205mm!important;height:285mm!important;max-height:285mm!important;margin:0!important;padding:0!important;overflow:hidden!important;box-shadow:none!important;break-inside:avoid!important;page-break-inside:avoid!important}'+
   '#tabulaStandalonePrintPreview .tp-print-paper svg{display:block!important;width:205mm!important;height:285mm!important;max-height:285mm!important}}'+
   '</style><div class="tp-print-controls"><button type="button" data-action="close">← 配置図に戻る</button><button type="button" data-action="save">SVG保存</button><button type="button" data-action="print">印刷 / PDF</button><button type="button" data-action="create-pdf">PDFを作成</button><a class="tp-pdf-download" data-action="download-pdf" download="TABULA-配置図.pdf" hidden>PDFを保存</a><button type="button" data-action="share-pdf" hidden>PDFを共有・保存</button></div><div class="tp-print-paper"></div><p class="tp-print-note">印刷機能が使えない場合は「PDFを作成」を押してください。作成後は環境に適した保存方法が表示されます。PDFはA4・1ページです。</p>';
  overlay.querySelector('.tp-print-paper').append(svg.cloneNode(true));
  const dismiss=()=>{overlay.remove();document.removeEventListener('keydown',onKey);if(pdfUrl)URL.revokeObjectURL(pdfUrl);};
  const onKey=e=>{if(e.key==='Escape')dismiss();};
  overlay.querySelector('[data-action="close"]').addEventListener('click',dismiss);
  overlay.querySelector('[data-action="save"]').addEventListener('click',()=>download(svg));
  overlay.querySelector('[data-action="print"]').addEventListener('click',()=>window.print());
  const printButton=overlay.querySelector('[data-action="print"]');
  const pdfButton=overlay.querySelector('[data-action="create-pdf"]');
  const pdfLink=overlay.querySelector('[data-action="download-pdf"]');
  const shareButton=overlay.querySelector('[data-action="share-pdf"]');
  if(standalone)printButton.hidden=true;
  pdfButton.addEventListener('click',async()=>{
   pdfButton.disabled=true;pdfButton.textContent='PDF作成中…';
   try{
    const blob=await createPlacementPdf(svg);
    if(pdfUrl)URL.revokeObjectURL(pdfUrl);
    pdfUrl=URL.createObjectURL(blob);
    pdfFile=typeof File==='function'?new File([blob],'TABULA-配置図.pdf',{type:'application/pdf'}):null;
    pdfLink.href=pdfUrl;
    // Show exactly one export action: native sharing in standalone mode,
    // otherwise a regular PDF download. Always retain download fallback.
    let canShareFile=false;
    if(standalone&&pdfFile&&typeof navigator.share==='function'){
     try{canShareFile=typeof navigator.canShare==='function'&&navigator.canShare({files:[pdfFile]});}
     catch(_){canShareFile=false;}
    }
    shareButton.hidden=!canShareFile;
    pdfLink.hidden=canShareFile;
    pdfButton.textContent='PDFを再作成';
   }catch(e){alert('PDFを作成できませんでした。'+(e?.message||''));pdfButton.textContent='PDFを作成';}
   finally{pdfButton.disabled=false;}
  });
  shareButton.addEventListener('click',async()=>{
   if(!pdfFile)return;
   try{await navigator.share({files:[pdfFile],title:'TABULA 配置図'});}
   catch(e){
    if(e?.name!=='AbortError'){
     shareButton.hidden=true;
     pdfLink.hidden=false;
     alert('共有を開けませんでした。「PDFを保存」をお試しください。');
    }
   }
  });

  document.addEventListener('keydown',onKey);
  document.body.append(overlay);
  overlay.querySelector('[data-action="close"]').focus();
}


// A placement diagram is a document, not a live view of the table.
// Store only known SVG geometry and typography; never import arbitrary SVG markup.
let draft=null;
const cardAttrs=['transform'];
const rectAttrs=['x','y','width','height','rx','fill','stroke','stroke-width','stroke-dasharray'];
const labelAttrs=['x','y','text-anchor','font-family','font-size','fill','transform','data-label-angle','data-card-angle','data-position-name','data-position-number'];
function attrsOf(node,allowed){return Object.fromEntries(allowed.filter(k=>node.hasAttribute(k)).map(k=>[k,node.getAttribute(k)]));}
function cleanAttrs(node,attrs,allowed){
 if(!attrs||typeof attrs!=='object'||Array.isArray(attrs))throw Error('図形データが不正です。');
 for(const [k,v] of Object.entries(attrs)){
  if(!allowed.includes(k)||typeof v!=='string'||v.length>500||/url\s*\(|javascript:|[<>]/i.test(v))throw Error('許可されない図形属性があります。');
  node.setAttribute(k,v);
 }
}
function normalizedBackgroundColor(value){
 if(typeof value!=='string')throw Error('背景色が不正です。');
 if(/^#[0-9a-fA-F]{3}$/.test(value))return '#'+[...value.slice(1)].map(c=>c+c).join('').toLowerCase();
 if(/^#[0-9a-fA-F]{6}$/.test(value))return value.toLowerCase();
 throw Error('背景色が不正です。');
}
function documentFromSvg(svg,transparent=false,dpi=300){
 const cards=[...svg.children].filter(el=>el.localName==='g'&&!el.hasAttribute('data-editor-overlay')&&el.querySelector(':scope > rect'));
 const labels=[...svg.children].filter(el=>el.localName==='text');
 return {format:'tabula-placement-diagram',version:2,page:{width:210,height:297},transparent,dpi,labelLayer:svg.getAttribute('data-label-layer')==='behind'?'behind':'front',backgroundColor:normalizedBackgroundColor(svg.querySelector(':scope > rect')?.getAttribute('fill')||'#ffffff'),
  cards:cards.map(el=>({attrs:attrsOf(el,cardAttrs),rect:attrsOf(el.querySelector('rect'),rectAttrs)})),
  labels:labels.map(el=>({attrs:attrsOf(el,labelAttrs),text:el.textContent}))};
}
function svgFromDocument(doc){
 if(!doc||doc.format!=='tabula-placement-diagram'||doc.version!==2||!Array.isArray(doc.cards)||!Array.isArray(doc.labels)||doc.cards.length>500||doc.labels.length>500||doc.cards.length+doc.labels.length===0)throw Error('対応していない配置図データです。');
 const svg=element('svg',{xmlns:ns,viewBox:'0 0 210 297',width:'210mm',height:'297mm'});
 const labelLayer=doc.labelLayer==='behind'?'behind':'front';
 svg.setAttribute('data-label-layer',labelLayer);
 const backgroundColor=normalizedBackgroundColor(doc.backgroundColor??'#ffffff');
 svg.append(element('rect',{width:210,height:297,fill:backgroundColor}));
 for(const data of doc.cards){
  const g=element('g');cleanAttrs(g,data.attrs,cardAttrs);
  const rect=element('rect');cleanAttrs(rect,data.rect,rectAttrs);
  if(!['x','y','width','height'].every(k=>Number.isFinite(Number(rect.getAttribute(k))))||Number(rect.getAttribute('width'))<=0||Number(rect.getAttribute('height'))<=0)throw Error('カード枠の寸法が不正です。');
  g.append(rect);svg.append(g);
 }
 for(const data of doc.labels){
  if(typeof data.text!=='string'||data.text.length>2000)throw Error('ラベルが不正です。');
  const label=element('text');cleanAttrs(label,data.attrs,labelAttrs);label.textContent=data.text;svg.append(label);
 }
 if(labelLayer==='behind'){
  const firstCard=[...svg.children].find(el=>el.localName==='g');
  for(const label of [...svg.children].filter(el=>el.localName==='text'))svg.insertBefore(label,firstCard||null);
 }
 return svg;
}
async function parseDiagramFile(file){
 if(file.size>2000000)throw Error('ファイルが大きすぎます。');
 const data=JSON.parse(await file.text());
 if(data.version!==2||data.format!=='tabula-placement-diagram')throw Error('独立した配置図JSON（v2）ではありません。以前の形式は元の卓から開いてください。');
 return data;
}
function chooseDiagramFile(){
 const input=document.createElement('input');input.type='file';input.accept='.json,application/json';
 input.onchange=async()=>{
  const file=input.files?.[0];if(!file)return;
  try{const data=await parseDiagramFile(file);const svg=svgFromDocument(data);draft=null;editor(svg,{document:data});}
  catch(e){alert('配置図を開けませんでした: '+e.message);}
 };
 input.click();
}

function editor(source,options={}){
 const svg=source.cloneNode(true),root=document.createElement('div');
 root.id='tabulaPrintEditor';root.tabIndex=-1;
 const css=document.createElement('style');
 css.textContent='#tabulaPrintEditor{position:fixed;inset:0;z-index:2147483646;display:flex;flex-direction:column;background:#211d19;color:#e9deca;font:13px Georgia,"Yu Mincho",serif}#tabulaPrintEditor *{box-sizing:border-box}#tabulaPrintEditor button,#tabulaPrintEditor input,#tabulaPrintEditor select{font:inherit;border:1px solid #827357;border-radius:4px;background:#302f29;color:#f3e8d3;padding:6px 9px;min-height:32px}#tabulaPrintEditor button{cursor:pointer}#tabulaPrintEditor button:hover{background:#4b4b3d}#tabulaPrintEditor button:disabled{opacity:.4;cursor:default}#tabulaPrintEditor .tp-head{display:flex;align-items:center;flex-wrap:wrap;gap:8px;padding:10px 15px;background:#242823;border-bottom:1px solid #806e4d}#tabulaPrintEditor .tp-head strong{font-size:17px;letter-spacing:.09em;color:#e8d09c;margin-right:12px}#tabulaPrintEditor .tp-spacer{flex:1}#tabulaPrintEditor .tp-head .tp-export{border-color:#c3a46a;color:#ffebbf}#tabulaPrintEditor .tp-intro{margin:0;padding:8px 15px;background:#242823;border-bottom:1px solid #514c3d;color:#d2c8b6;font:12px/1.6 sans-serif}#tabulaPrintEditor .tp-main{display:flex;flex:1;min-height:0}#tabulaPrintEditor .tp-work{flex:1;min-width:0;overflow:auto;padding:22px;background:radial-gradient(ellipse,#393027,#211b17)}#tabulaPrintEditor .tp-sheet{width:min(650px,100%);margin:0 auto}#tabulaPrintEditor .tp-sheet svg{display:block;width:100%;height:auto;background:white;box-shadow:0 8px 30px #0009;touch-action:none;user-select:none}#tabulaPrintEditor .tp-side{width:275px;flex:none;overflow:auto;padding:16px;background:#242823;border-left:1px solid #655743}#tabulaPrintEditor .tp-section{border-bottom:1px solid #514c3d;padding-bottom:15px;margin-bottom:16px}#tabulaPrintEditor .tp-section h3{font-size:13px;font-weight:normal;letter-spacing:.1em;color:#e1c58d;margin:0 0 12px}#tabulaPrintEditor .tp-field{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:8px 0}#tabulaPrintEditor .tp-field label{font:12px sans-serif;color:#d2c8b6}#tabulaPrintEditor .tp-field input,#tabulaPrintEditor .tp-field select{width:127px;min-width:0}#tabulaPrintEditor .tp-field input[type=checkbox]{width:auto;min-height:0;accent-color:#c3a46a}#tabulaPrintEditor .tp-actions{display:flex;gap:6px;flex-wrap:wrap}#tabulaPrintEditor .tp-note{color:#bcb19d;font:12px/1.6 sans-serif}#tabulaPrintEditor .tp-status{padding:7px 14px;background:#242823;border-top:1px solid #655743;color:#cbbd9e;font:12px sans-serif}#tabulaPrintEditor .tp-selected{stroke:#447dbb!important;stroke-width:.55!important;stroke-dasharray:2 1}#tabulaPrintEditor .tp-head select{max-width:120px}@media(max-width:760px){#tabulaPrintEditor{overflow-y:auto;overflow-x:hidden}#tabulaPrintEditor .tp-head{gap:6px;padding:8px 10px}#tabulaPrintEditor .tp-head strong{flex:1 1 100%;margin-right:0}#tabulaPrintEditor .tp-intro{padding:7px 10px}#tabulaPrintEditor .tp-main{flex:none;flex-direction:column;min-height:0;overflow:visible}#tabulaPrintEditor .tp-work{flex:none;min-height:0;height:auto;padding:12px;overflow:visible}#tabulaPrintEditor .tp-work.tp-zoomed{max-height:70vh;max-height:70dvh;overflow:auto;overscroll-behavior:contain}#tabulaPrintEditor .tp-sheet{width:min(650px,100%)}#tabulaPrintEditor .tp-side{width:100%;max-height:none;overflow:visible;border-left:0;border-top:1px solid #655743}#tabulaPrintEditor .tp-status{flex:none}}';
 root.append(css);
 const make=(tag,parent,text,cls)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;if(parent)parent.append(el);return el;};
 const button=(parent,label,fn,cls)=>{const el=make('button',parent,label,cls);el.type='button';el.onclick=fn;return el;};
 const head=make('div',root,undefined,'tp-head');
 make('strong',head,'TABULA · 配置図');
 make('span',head,'選択対象','tp-note');
 const mode=make('select',head);
 [['all','すべて'],['card','カード枠'],['label','ラベル']].forEach(pair=>{const opt=make('option',mode,pair[1]);opt.value=pair[0];});
 const undoBtn=button(head,'↶ 元に戻す',undo),redoBtn=button(head,'↷ やり直す',redo);
 button(head,'初期配置に戻す',()=>{if(!confirm('カード枠・ラベル・背景色の編集をすべて破棄し、最初の配置に戻します。よろしいですか？'))return;restore(initial);bg.setAttribute('fill',initialBackground);history=[];future=[];refresh();});
 make('span',head,undefined,'tp-spacer');
 button(head,'SVG保存',()=>download(exportSvg()),'tp-export');
 button(head,'PNG保存',()=>savePng(),'tp-export');
 button(head,'印刷 / PDF',()=>print(exportSvg()),'tp-export');
 const saveData=button(head,'編集データ保存',()=>saveProject(),'tp-export');
 const openData=button(head,'編集データ読込',()=>fileInput.click());
 const fileInput=make('input',head);fileInput.type='file';fileInput.accept='.json,application/json';fileInput.style.display='none';
 fileInput.onchange=async()=>{const file=fileInput.files?.[0];fileInput.value='';if(file)await loadProject(file);};
 button(head,'閉じる',()=>closeEditor());
 const intro=make('p',root,'卓上のカード配置をもとに、カードの枠線とラベルの位置・書式・色などを編集し、配置図として保存・印刷できます。','tp-intro');
 const main=make('div',root,undefined,'tp-main'),work=make('div',main,undefined,'tp-work'),sheet=make('div',work,undefined,'tp-sheet'),side=make('div',main,undefined,'tp-side'),status=make('div',root,undefined,'tp-status');
 sheet.append(svg);document.body.append(root);
 const cards=[...svg.children].filter(el=>el.localName==='g'&&el.querySelector(':scope > rect'));
 const labels=[...svg.children].filter(el=>el.localName==='text');
 const elements=[...cards,...labels],selection=new Set();
 const bg=svg.querySelector(':scope > rect');
 const initialBackground=normalizedBackgroundColor(bg.getAttribute('fill')||'#ffffff');
 const grid=element('g',{'data-editor-overlay':'grid','pointer-events':'none'}),defs=element('defs'),pattern=element('pattern',{id:'tp-print-grid',width:5,height:5,patternUnits:'userSpaceOnUse'});
 pattern.append(element('path',{d:'M5 0H0V5',stroke:'#9fb1c7','stroke-width':.12,fill:'none'}));defs.append(pattern);grid.append(defs,element('rect',{width:210,height:297,fill:'url(#tp-print-grid)'}));grid.style.display='none';svg.append(grid);
 let active=null,drag=null,history=[],future=[],zoom=100,showGrid=false,transparent=false,dpi=300,linkLabels=false;
 let savedState='',boxDrag=null;
 const initialDocument=options.document||null;
 const hitLayer=element('g',{'data-editor-overlay':'hits'});
 const hitMap=new Map();
 for(const card of cards){
  const rect=card.querySelector('rect');
  const hit=element('rect',{x:rect.getAttribute('x'),y:rect.getAttribute('y'),width:rect.getAttribute('width'),height:rect.getAttribute('height'),rx:rect.getAttribute('rx')||0,fill:'transparent',stroke:'transparent','stroke-width':2,'pointer-events':'stroke'});
  hit.setAttribute('transform',card.getAttribute('transform')||'');
  hitLayer.append(hit);hitMap.set(card,hit);
 }
 svg.append(hitLayer);
 function syncHits(){
  hitLayer.style.pointerEvents=mode.value==='label'?'none':'';
  for(const [card,hit] of hitMap){
   hit.setAttribute('transform',card.getAttribute('transform')||'');
   hit.setAttribute('pointer-events',mode.value==='card'?'all':'stroke');
  }
  labels.forEach(label=>label.style.pointerEvents=mode.value==='card'?'none':'');
 }
 mode.onchange=()=>{selection.clear();active=null;syncHits();refresh();};
 function dirty(){return JSON.stringify({items:snapshot(),backgroundColor:bg.getAttribute('fill'),transparent,dpi})!==savedState;}
 function markSaved(){savedState=JSON.stringify({items:snapshot(),backgroundColor:bg.getAttribute('fill'),transparent,dpi});refresh();}
 function currentDocument(){return documentFromSvg(svg,transparent,dpi);}
 function keepDraft(){draft=currentDocument();}
 function closeEditor(){keepDraft();root.remove();}
 function saveProject(){
  const data=currentDocument();
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='TABULA-配置図-編集データ.json';document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),2000);markSaved();
 }
 async function loadProject(file){
  try{
   if(file.size>2000000)throw Error('ファイルが大きすぎます。');
   const data=JSON.parse(await file.text());
   if(data.format!=='tabula-placement-diagram')throw Error('配置図データではありません。');
   if(data.version===2){
    const loaded=svgFromDocument(data);
    if(!confirm('保存した配置図を開きます。現在の編集画面を置き換えますか？'))return;
    keepDraft();root.remove();draft=null;editor(loaded,{document:data});return;
   }
   if(data.version!==1||!Array.isArray(data.elements)||data.elements.length!==elements.length)throw Error('旧形式の編集データです。元の卓と同じ枚数の配置図から読み込んでください。');
   if(!data.elements.every((v,i)=>v&&Array.isArray(v.attrs)&&v.attrs.every(a=>Array.isArray(a)&&a.length===2&&typeof a[0]==='string'&&typeof a[1]==='string')&&(type(elements[i])==='label'?typeof v.text==='string':typeof v.stroke==='string')))throw Error('編集データが不正です。');
   if(!confirm('現在の配置図を旧形式の編集データで置き換えますか？'))return;
   remember();restore(data.elements);transparent=!!data.transparent;dpi=[150,300,600].includes(data.dpi)?data.dpi:300;syncHits();markSaved();
  }catch(err){alert('読み込みに失敗しました: '+err.message);}
 }
 const type=el=>labels.includes(el)?'label':'card';
 const coords=el=>{if(type(el)==='label')return{x:Number(el.getAttribute('x')),y:Number(el.getAttribute('y'))};const m=(el.getAttribute('transform')||'').match(/translate\(\s*([-\d.]+)[ ,]+([-\d.]+)/);return{x:Number(m?.[1]||0),y:Number(m?.[2]||0)};};
 const angle=el=>{if(type(el)==='label')return Number(el.getAttribute('data-label-angle')||0);const m=(el.getAttribute('transform')||'').match(/rotate\(\s*([-\d.]+)/);return Number(m?.[1]||0);};
 function setAngle(el,n){const p=coords(el);if(type(el)==='card')el.setAttribute('transform','translate('+p.x+' '+p.y+') rotate('+n+')');else{el.setAttribute('data-label-angle',n);if(n)el.setAttribute('transform','rotate('+n+' '+p.x+' '+p.y+')');else el.removeAttribute('transform');}}
 function setPosition(el,x,y){if(type(el)==='card')el.setAttribute('transform','translate('+x+' '+y+') rotate('+angle(el)+')');else{const a=angle(el);el.setAttribute('x',x);el.setAttribute('y',y);setAngle(el,a);}}
  const snapshot=()=>elements.map(el=>({attrs:[...el.attributes].map(a=>[a.name,a.value]),text:type(el)==='label'?el.textContent:null,stroke:type(el)==='card'?el.querySelector('rect')?.getAttribute('stroke-width'):null,fill:type(el)==='card'?el.querySelector('rect')?.getAttribute('fill')||'none':null,strokeColor:type(el)==='card'?el.querySelector('rect')?.getAttribute('stroke')||'#111':null,dash:type(el)==='card'?el.querySelector('rect')?.getAttribute('stroke-dasharray')||'':null}));
 const initial=snapshot();
 function restore(state){state.forEach((v,i)=>{const el=elements[i];[...el.attributes].forEach(a=>el.removeAttribute(a.name));v.attrs.forEach(a=>el.setAttribute(a[0],a[1]));if(type(el)==='label')el.textContent=v.text;else {const rect=el.querySelector('rect');rect?.setAttribute('stroke-width',v.stroke||'.22');rect?.setAttribute('fill',v.fill||'none');rect?.setAttribute('stroke',v.strokeColor||'#111');if(v.dash)rect?.setAttribute('stroke-dasharray',v.dash);else rect?.removeAttribute('stroke-dasharray');}});selection.clear();active=null;syncHits();}
 function historyState(){return {items:snapshot(),backgroundColor:bg.getAttribute('fill')||'#ffffff'};}
 function restoreHistory(state){restore(state.items);bg.setAttribute('fill',state.backgroundColor);}
 function remember(){history.push(historyState());if(history.length>100)history.shift();future=[];}
 function undo(){if(!history.length)return;future.push(historyState());restoreHistory(history.pop());refresh();}
 function redo(){if(!future.length)return;history.push(historyState());restoreHistory(future.pop());refresh();}
 function select(el,shift){if(!shift)selection.clear();if(el){if(shift&&selection.has(el))selection.delete(el);else selection.add(el);}active=selection.has(el)?el:([...selection].at(-1)||null);refresh();}
 function section(title){const el=make('div',side,undefined,'tp-section');make('h3',el,title);return el;}
 function field(parent,label,value,fn,kind='number'){const row=make('div',parent,undefined,'tp-field');make('label',row,label);const input=make('input',row);input.type=kind;input.value=value;input.onchange=()=>{remember();fn(input.value);refresh();};return input;}
 function selectField(parent,label,values,current,fn){const row=make('div',parent,undefined,'tp-field');make('label',row,label);const input=make('select',row);values.forEach(pair=>{const o=make('option',input,pair[1]);o.value=pair[0];});input.value=current;input.onchange=()=>{fn(input.value);refresh();};return input;}
 function colorField(parent,label,current,fn){
  const row=make('div',parent,undefined,'tp-field');make('label',row,label);
  const controls=make('div',row);controls.style.cssText='display:flex;gap:4px;width:127px;align-items:center';
  const picker=make('input',controls);picker.type='color';picker.style.cssText='width:42px;min-width:42px;padding:2px;height:32px';
  const input=make('input',controls);input.type='text';input.style.cssText='width:81px;min-width:0;padding:5px 3px;font:11px sans-serif';
  const valid=v=>/^#[0-9a-fA-F]{6}$/.test(v);
  const normalize=v=>/^#[0-9a-fA-F]{3}$/.test(v)?'#'+[...v.slice(1)].map(c=>c+c).join(''):v;
  let value=normalize(current||'#111111');if(!valid(value))value='#111111';
  picker.value=value;input.value=value;
  const apply=v=>{v=normalize(v.trim());if(!valid(v)){input.value=picker.value;return;}remember();fn(v);refresh();};
  picker.onchange=()=>apply(picker.value);input.onchange=()=>apply(input.value);
 }
 function check(parent,label,value,fn){const row=make('div',parent,undefined,'tp-field');make('label',row,label);const input=make('input',row);input.type='checkbox';input.checked=value;input.onchange=()=>{fn(input.checked);};}
 function positionLabelText(el,numbered){const name=el.getAttribute('data-position-name'),number=el.getAttribute('data-position-number');return name&&number?(numbered?number+' · ':'')+name:null;}
 function positionLabels(){return labels.filter(el=>positionLabelText(el,false)!==null);}
 function applyZoom(){
  const mobile=window.matchMedia('(max-width:760px)').matches;
  work.classList.toggle('tp-zoomed',mobile&&zoom>100);
  if(zoom===100){
   // CSS percentage sizing avoids stale measurements during mobile layout.
   sheet.style.width='min(650px,100%)';
  }else{
   const padding=mobile?24:44;
   const base=Math.min(650,Math.max(1,work.clientWidth-padding));
   sheet.style.width=base*zoom/100+'px';
  }
  sheet.style.margin=zoom>100?'0':'0 auto';
 }
 function properties(){
  side.replaceChildren();
  const view=section('表示');
  selectField(view,'倍率',[[100,'100%'],[150,'150%'],[200,'200%'],[400,'400%']],zoom,v=>{zoom=Number(v);applyZoom();});
  check(view,'5mmグリッド',showGrid,v=>{showGrid=v;grid.style.display=v?'':'none';});
   colorField(view,'背景色',bg.getAttribute('fill')||'#ffffff',v=>bg.setAttribute('fill',v));
   if(positionLabels().length){
    const first=positionLabels()[0];
    selectField(view,'位置番号', [['with','表示する'],['without','表示しない']],first.textContent===positionLabelText(first,false)?'without':'with',v=>{
     const numbered=v==='with';if(positionLabels().every(el=>el.textContent===positionLabelText(el,numbered)))return;
     remember();positionLabels().forEach(el=>{el.textContent=positionLabelText(el,numbered);});
    });
   }
  if(!selection.size)make('p',side,'カード枠またはラベルをクリックすると、ここに編集項目が表示されます。','tp-note');
  else{
   const same=[...selection].every(el=>type(el)===type(active)),s=section(selection.size>1?selection.size+'件を編集':type(active)==='card'?'カード枠':'ラベル');
   if(!same)make('p',s,'枠とラベルを一緒に移動できます。書式の変更は同じ種類を選択してください。','tp-note');
   const p=coords(active);
   field(s,'X (mm)',p.x.toFixed(2),v=>{const d=Number(v)-p.x;if(Number.isFinite(d))selection.forEach(el=>{const q=coords(el);setPosition(el,q.x+d,q.y);});});
   field(s,'Y (mm)',p.y.toFixed(2),v=>{const d=Number(v)-p.y;if(Number.isFinite(d))selection.forEach(el=>{const q=coords(el);setPosition(el,q.x,q.y+d);});});
   field(s,'角度 (°)',angle(active),v=>{if(Number.isFinite(Number(v)))selection.forEach(el=>setAngle(el,Number(v)));});
   if(same&&type(active)==='label'){
    if(selection.size===1)field(s,'文字',active.textContent,v=>{active.textContent=v;active.removeAttribute('data-position-name');active.removeAttribute('data-position-number');},'text');
    field(s,'文字サイズ (mm)',active.getAttribute('font-size'),v=>{if(Number(v)>0)selection.forEach(el=>el.setAttribute('font-size',v));});
    selectField(s,'書体',[['serif','明朝体'],['sans-serif','ゴシック体'],['monospace','等幅']],active.getAttribute('font-family')||'serif',v=>{remember();selection.forEach(el=>el.setAttribute('font-family',v));});
    colorField(s,'文字色',active.getAttribute('fill')||'#111111',v=>selection.forEach(el=>el.setAttribute('fill',v)));
    const actions=make('div',s,undefined,'tp-actions');
    button(actions,'全ラベルに書式を適用',()=>{
     if(!confirm('選択中のラベルの書体と文字サイズを、すべてのラベルに適用します。位置・角度・文字内容は変更しません。よろしいですか？'))return;
     remember();
     const size=active.getAttribute('font-size'),family=active.getAttribute('font-family');
     labels.forEach(el=>{if(size!==null)el.setAttribute('font-size',size);if(family!==null)el.setAttribute('font-family',family);});
     refresh();
    });
    button(actions,'各カードの角度',()=>{remember();selection.forEach(el=>setAngle(el,Number(el.getAttribute('data-card-angle')||0)));refresh();});
    button(actions,'水平',()=>{remember();selection.forEach(el=>setAngle(el,0));refresh();});
   }
   if(same&&type(active)==='card'){
    const rect=active.querySelector('rect');
    const fill=rect?.getAttribute('fill')||'none';
    selectField(s,'内側の塗り',[['none','透明'],['#fff','白'],['custom','任意の色']],fill==='none'?'none':fill==='#fff'||fill==='#ffffff'?'#fff':'custom',v=>{
     remember();selection.forEach(el=>el.querySelector('rect')?.setAttribute('fill',v==='custom'?(fill==='none'?'#f5e8c8':fill):v));
    });
    colorField(s,'塗り色',fill==='none'?'#ffffff':fill,v=>selection.forEach(el=>el.querySelector('rect')?.setAttribute('fill',v)));
    colorField(s,'枠線色',rect?.getAttribute('stroke')||'#111111',v=>selection.forEach(el=>el.querySelector('rect')?.setAttribute('stroke',v)));
    field(s,'枠線幅 (mm)',rect?.getAttribute('stroke-width')||'.22',v=>{if(Number(v)>=0)selection.forEach(el=>el.querySelector('rect')?.setAttribute('stroke-width',v));});
    const dashItems=[['','実線'],['2 1.2','破線'],['.35 1.2','点線'],['3 1 0.4 1','一点鎖線']];
    selectField(s,'線の種類',dashItems,rect?.getAttribute('stroke-dasharray')||'',v=>{remember();selection.forEach(el=>{const r=el.querySelector('rect');if(v)r?.setAttribute('stroke-dasharray',v);else r?.removeAttribute('stroke-dasharray');});});
    button(s,'全カード枠に適用',()=>{
     if(!confirm('選択中のカード枠の塗り・枠線色・線幅・線の種類を、全カード枠に適用しますか？'))return;
     remember();const width=rect.getAttribute('stroke-width'),dash=rect.getAttribute('stroke-dasharray'),fill=rect.getAttribute('fill')||'none',strokeColor=rect.getAttribute('stroke')||'#111';
     cards.forEach(el=>{const r=el.querySelector('rect');r.setAttribute('fill',fill);r.setAttribute('stroke',strokeColor);r.setAttribute('stroke-width',width);if(dash)r.setAttribute('stroke-dasharray',dash);else r.removeAttribute('stroke-dasharray');});refresh();
    });
   }
   make('p',s,'Shift＋クリックで複数選択。矢印キーで微調整できます。','tp-note');
  }
  const output=section('書き出し設定');
  check(output,'透明背景',transparent,v=>transparent=v);
  selectField(output,'PNG解像度',[[150,'150 dpi'],[300,'300 dpi'],[600,'600 dpi']],dpi,v=>dpi=Number(v));
  make('p',output,'グリッドと選択枠は出力しません。','tp-note');
 }
 function refresh(){
  elements.forEach(el=>{const on=selection.has(el);if(type(el)==='card')el.querySelector('rect')?.classList.toggle('tp-selected',on);else if(on)el.setAttribute('text-decoration','underline');else el.removeAttribute('text-decoration');});
  syncHits();undoBtn.disabled=!history.length;redoBtn.disabled=!future.length;
  status.textContent=(dirty()?'● 未保存　｜　':'保存済み　｜　')+(selection.size?'選択 '+selection.size+'件　｜　矢印 0.5mm ・ Shift＋矢印 2mm ・ Alt＋矢印 0.1mm':'選択なし　｜　余白ドラッグで範囲選択 ・ Shiftで追加');
  properties();
 }
 function exportSvg(){const copy=svg.cloneNode(true);copy.removeAttribute('style');copy.querySelector('[data-editor-overlay="grid"]')?.remove();copy.querySelector('[data-editor-overlay="hits"]')?.remove();copy.querySelector('[data-editor-overlay="marquee"]')?.remove();copy.querySelectorAll('.tp-selected').forEach(el=>el.classList.remove('tp-selected'));copy.querySelectorAll('text').forEach(el=>{el.removeAttribute('text-decoration');el.removeAttribute('style');});if(transparent)copy.querySelector(':scope > rect')?.remove();copy.setAttribute('width','210mm');copy.setAttribute('height','297mm');return copy;}
 async function savePng(){try{const xml=new XMLSerializer().serializeToString(exportSvg()),url=URL.createObjectURL(new Blob([xml],{type:'image/svg+xml;charset=utf-8'}));try{const img=new Image();await new Promise((ok,fail)=>{img.onload=ok;img.onerror=()=>fail(Error('SVGの変換に失敗しました'));img.src=url;});const canvas=document.createElement('canvas'),factor=dpi/25.4;canvas.width=Math.round(210*factor);canvas.height=Math.round(297*factor);const ctx=canvas.getContext('2d');if(!ctx)throw Error('画像用メモリ不足');ctx.drawImage(img,0,0,canvas.width,canvas.height);const blob=await new Promise(ok=>canvas.toBlob(ok,'image/png'));if(!blob)throw Error('PNGを生成できませんでした');const href=URL.createObjectURL(blob),a=document.createElement('a');a.href=href;a.download='TABULA-配置図-'+dpi+'dpi.png';a.click();setTimeout(()=>URL.revokeObjectURL(href),2000);}finally{URL.revokeObjectURL(url);}}catch(e){alert(e.message);}}
 function point(e){const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;const m=svg.getScreenCTM();return m?p.matrixTransform(m.inverse()):null;}
 function attachSelection(el,target){
  target.style.cursor='move';
  target.addEventListener('pointerdown',e=>{
   if(mode.value!=='all'&&type(el)!==mode.value)return;
   e.stopPropagation();e.preventDefault();
   if(e.shiftKey)select(el,true);else if(!selection.has(el))select(el,false);
   if(!selection.has(el))return;
   const p=point(e);if(!p)return;
   drag={el,target,p,moved:false,plainMulti:!e.shiftKey&&selection.size>1,items:[...selection].map(item=>({item,...coords(item)}))};
   target.setPointerCapture(e.pointerId);root.focus({preventScroll:true});
  });
  target.addEventListener('pointermove',e=>{if(!drag||drag.target!==target)return;const p=point(e);if(!p)return;const dx=p.x-drag.p.x,dy=p.y-drag.p.y;if(!drag.moved&&Math.hypot(dx,dy)>.2){remember();drag.moved=true;}if(!drag.moved)return;drag.items.forEach(v=>setPosition(v.item,v.x+dx,v.y+dy));syncHits();});
  target.addEventListener('pointerup',()=>{if(drag&&drag.target===target&&drag.plainMulti&&!drag.moved)select(el,false);drag=null;refresh();});
  target.addEventListener('pointercancel',()=>{drag=null;refresh();});
 }
 elements.forEach(el=>{attachSelection(el,el);});
 for(const [card,hit] of hitMap)attachSelection(card,hit);
 root.addEventListener('keydown',e=>{
  if(e.key==='Escape'){if(selection.size){selection.clear();active=null;refresh();}else closeEditor();return;}
  if(e.target?.closest?.('input,textarea,select,[contenteditable]'))return;
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo();return;}
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){e.preventDefault();redo();return;}
  if(!selection.size||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;
  e.preventDefault();remember();const step=e.altKey?.1:e.shiftKey?2:.5;
  const dx=e.key==='ArrowLeft'?-step:e.key==='ArrowRight'?step:0,dy=e.key==='ArrowUp'?-step:e.key==='ArrowDown'?step:0;
  selection.forEach(el=>{const p=coords(el);setPosition(el,p.x+dx,p.y+dy);});refresh();
 });
 const marquee=element('rect',{'data-editor-overlay':'marquee',fill:'#bca26b','fill-opacity':.13,stroke:'#bca26b','stroke-width':.35,'stroke-dasharray':'2 1','pointer-events':'none'});
 marquee.style.display='none';svg.append(marquee);
 svg.addEventListener('pointerdown',e=>{
  if(!(e.target===svg||e.target===bg||e.target===grid||e.target.parentNode===grid))return;
  const p=point(e);if(!p)return;
  if(!e.shiftKey){selection.clear();active=null;}refresh();
  boxDrag={pointer:e.pointerId,start:p};marquee.style.display='';marquee.setAttribute('x',p.x);marquee.setAttribute('y',p.y);marquee.setAttribute('width',0);marquee.setAttribute('height',0);
  svg.setPointerCapture(e.pointerId);root.focus({preventScroll:true});
 });
 svg.addEventListener('pointermove',e=>{
  if(!boxDrag||boxDrag.pointer!==e.pointerId)return;
  const p=point(e);if(!p)return;
  const x=Math.min(p.x,boxDrag.start.x),y=Math.min(p.y,boxDrag.start.y),w=Math.abs(p.x-boxDrag.start.x),h=Math.abs(p.y-boxDrag.start.y);
  Object.entries({x,y,width:w,height:h}).forEach(([k,v])=>marquee.setAttribute(k,v));
 });
 svg.addEventListener('pointerup',e=>{
  if(!boxDrag||boxDrag.pointer!==e.pointerId)return;
  const p=point(e),start=boxDrag.start;boxDrag=null;marquee.style.display='none';
  if(!p||Math.hypot(p.x-start.x,p.y-start.y)<1){refresh();return;}
  const x1=Math.min(p.x,start.x),x2=Math.max(p.x,start.x),y1=Math.min(p.y,start.y),y2=Math.max(p.y,start.y);
  for(const el of elements){
   if(mode.value!=='all'&&type(el)!==mode.value)continue;
   // Compare in the SVG page's user coordinates, not viewport coordinates.
   // getScreenCTM() includes the element's rotation and page zoom.
   const bounds=el.getBBox(),screen=el.getScreenCTM(),page=svg.getScreenCTM();
   if(!screen||!page)continue;
   const matrix=page.inverse().multiply(screen);
   const corners=[[bounds.x,bounds.y],[bounds.x+bounds.width,bounds.y],[bounds.x+bounds.width,bounds.y+bounds.height],[bounds.x,bounds.y+bounds.height]];
   const inside=corners.every(([x,y])=>{const q=svg.createSVGPoint();q.x=x;q.y=y;const t=q.matrixTransform(matrix);return t.x>=x1&&t.x<=x2&&t.y>=y1&&t.y<=y2;});
   if(inside)selection.add(el);
  }
  active=[...selection].at(-1)||null;refresh();
 });
 svg.addEventListener('pointercancel',()=>{boxDrag=null;marquee.style.display='none';});
 if(initialDocument){transparent=!!initialDocument.transparent;dpi=[150,300,600].includes(initialDocument.dpi)?initialDocument.dpi:300;}
 applyZoom();
 // Refit after the mobile viewport settles and when the editor width changes.
 const onResize=()=>{if(root.isConnected)applyZoom();else window.removeEventListener('resize',onResize);};
 window.addEventListener('resize',onResize);
 const resizeObserver=typeof ResizeObserver==='function'?new ResizeObserver(()=>{if(root.isConnected)applyZoom();else resizeObserver.disconnect();}):null;
 resizeObserver?.observe(work);
 requestAnimationFrame(()=>{if(root.isConnected)applyZoom();});
 markSaved();root.focus();refresh();
}
function install(){
 const button=$('printPlacement');if(!button)return;
 button.addEventListener('click',()=>{
  if($('tabulaPrintEditor'))return;
  if(draft){
   const choice=prompt('配置図を開く方法を選んでください。\n1：前回の編集を再開\n2：現在の卓から新規作成\n3：保存したJSONを読み込む','1');
   if(choice===null)return;
   if(choice.trim()==='1'){try{editor(svgFromDocument(draft),{document:draft});}catch(e){alert(e.message);}return;}
   if(choice.trim()==='3'){chooseDiagramFile();return;}
   if(choice.trim()!=='2')return;
   if(!confirm('現在の卓から新しい配置図を作ります。前回の一時編集状態は置き換わります。JSONに保存していない場合は失われます。よろしいですか？'))return;
  }else{
   const choice=prompt('配置図を開く方法を選んでください。\n1：現在の卓から新規作成\n2：保存したJSONを読み込む','1');
   if(choice===null)return;
   if(choice.trim()==='2'){chooseDiagramFile();return;}
   if(choice.trim()!=='1')return;
  }
  try{const fresh=printable();draft=null;editor(fresh);}catch(e){alert(e.message);}
 });
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();