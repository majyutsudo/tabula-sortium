
(()=>{'use strict';let inspectMode=false,tableDetailFocus=null;const $=id=>document.getElementById(id);const {majors,suitDefs,ranks,cards}=TabulaCatalog;const SPREAD_LIBRARY_KEY='tabula_sortium_spread_library_v1';let spreadLibrary=[];
function loadSpreadLibrary(){spreadLibrary=TabulaSpreadStore.read(localStorage,SPREAD_LIBRARY_KEY);refreshCustomPresets()}
function syncSpreadShortcut(){const shortcut=$('spreadQuickSelect'),source=$('spread');if(!shortcut||!source)return;shortcut.replaceChildren(...Array.from(source.options,option=>option.cloneNode(true)));shortcut.value=settings.spread;}
function refreshCustomPresets(){Object.keys(presets).filter(k=>k.startsWith('custom_')).forEach(k=>delete presets[k]);spreadLibrary.forEach(v=>presets[v.id]=v.slots.map(p=>({...p})));const select=document.getElementById('spread');if(!select)return;select.querySelectorAll('option[data-custom="1"]').forEach(el=>el.remove());spreadLibrary.forEach(v=>{const o=document.createElement('option');o.value=v.id;o.textContent=v.name;o.dataset.custom='1';select.append(o)});syncSpreadShortcut()}
function storeSpreadLibrary(){TabulaSpreadStore.write(localStorage,SPREAD_LIBRARY_KEY,spreadLibrary);refreshCustomPresets();if($('spreadArchive')&&!$('spreadArchive').hidden)renderSpreadArchive()}
let spreadWorkbench=null;let spreadSnap=true;
function closeSpreadArchive(){$('spreadArchive').hidden=true;document.body.classList.remove('spread-archive-open');setNotebookButtonState(false);applyDesktopTableView();applyTableCamera();render()}
function openSpreadArchive(){renderSpreadArchive();$('archiveCapture').hidden=settings.spread!=='free';$('spreadArchive').hidden=false;document.body.classList.add('spread-archive-open');setNotebookButtonState(true);$('spreadArchive').scrollIntoView({block:'nearest',behavior:'smooth'})}
const spreadThumb=TabulaUiFormat.spreadThumb;
function renderSpreadArchive(){const root=$('archiveItems');root.replaceChildren();$('archiveCount').textContent=spreadLibrary.length+'篇';if(!spreadLibrary.length){const msg=document.createElement('p');msg.className='archive-empty';msg.textContent='まだ登録されたスプレッドはありません。卓で思いついた配置とカードサイズを、この手帖に記録できます。';root.append(msg);return}spreadLibrary.forEach(v=>{const row=document.createElement('article');row.className='archive-entry';const thumb=document.createElement('div');thumb.className='archive-thumb';thumb.innerHTML=spreadThumb(v.slots);const info=document.createElement('div');info.className='archive-info';const name=document.createElement('strong');name.textContent=v.name;const count=document.createElement('small');count.textContent=v.slots.length+'枚';info.append(name,count);const actions=document.createElement('div');actions.className='archive-actions';function action(label,fn){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=fn;actions.append(b)}action('使う',()=>{closeSpreadArchive();if(state.placed.length&&!confirm('現在の配札を山札に戻してスプレッドを変更しますか？'))return;if(state.placed.length)restoreDealWithoutPrompt();settings.spread=v.id;applySpreadCardSize(v.id);sync();render();saveLocal();setStatus('「'+v.name+'」を選択しました。')});action('解説',()=>openSpreadGuide(v.id));action('編集',()=>{closeSpreadArchive();openStoredSpreadWorkbench(v)});action('複製',()=>{const base=v.name+' のコピー';let name=base,n=2;while(spreadLibrary.some(p=>p.name===name))name=base+' '+n++;const copy=JSON.parse(JSON.stringify(v));copy.id='custom_'+Date.now()+'_'+Math.floor(Math.random()*10000);copy.name=name;spreadLibrary.push(copy);try{storeSpreadLibrary();renderSpreadArchive()}catch(e){spreadLibrary.pop();alert('複製を保存できませんでした。')}});action('削除',()=>{if(!confirm('「'+v.name+'」を削除しますか？'))return;spreadLibrary=spreadLibrary.filter(p=>p.id!==v.id);if(settings.spread===v.id)settings.spread='free';storeSpreadLibrary();sync();renderSpreadArchive();saveLocal()});row.append(thumb,info,actions);root.append(row)})}
function setNotebookButtonState(open){const b=$('spreadNotebook');b.setAttribute('aria-pressed',String(open));b.setAttribute('aria-expanded',String(open));b.setAttribute('aria-label',open?'手帖を閉じる':'手帖を開く');b.title=open?'手帖を閉じる':'手帖を開く';b.dataset.toolLabel=open?'手帖を閉じる':'手帖';}
$('spreadNotebook').setAttribute('aria-controls','spreadArchive');setNotebookButtonState(false);$('spreadNotebook').onclick=()=>{$('spreadArchive').hidden?openSpreadArchive():closeSpreadArchive()};$('archiveClose').onclick=closeSpreadArchive;$('archiveCapture').onclick=()=>{if(!state.placed.length){alert('まずフリースプレッドでカードを並べてください。');return}spreadCapture()};


/* One encyclopedia entry per spread definition: no duplicate diagrams or libraries. */
const SpreadGuide=TabulaSpreadEncyclopedia;
function spreadGuideEntry(id){return SpreadGuide.entry(id,presets,spreadLibrary)}
function spreadGuideText(t){return escapeHTML(t||'')}
function openSpreadGuide(id){
 const spread=spreadGuideEntry(id);
 if(!spread){setStatus('スプレッドが見つかりません。');return}
 const related=spread.slots||[];
 let html='<div class="spread-guide"><div class="spread-guide-kicker">TABULA SORTIUM / SPREAD ENCYCLOPEDIA</div><h2>'+spreadGuideText(spread.name)+'</h2>';
 html+='<p class="spread-guide-meta">'+related.length+'枚'+(spread.alternate?' · '+spreadGuideText(spread.alternate):'')+'</p>';
 if(spread.author)html+='<p class="spread-guide-meta"><strong>考案者</strong> '+spreadGuideText(spread.author)+'</p>';
 if(spread.source)html+='<p class="spread-guide-meta"><strong>出典</strong> '+spreadGuideText(spread.source)+'</p>';
 html+='<div id="spreadGuideDiagram" class="spread-guide-diagram-wrap">'+SpreadGuide.diagram(related,{interactive:true})+'</div>';
 if(spread.overview)html+='<section class="spread-guide-prose"><h3>概要</h3><p>'+spreadGuideText(spread.overview)+'</p></section>';
 if(spread.method)html+='<section class="spread-guide-prose"><h3>使用方法</h3><p>'+spreadGuideText(spread.method)+'</p></section>';
 if(related.length){
  html+='<section class="spread-guide-positions"><h3>位置の意味</h3><div class="spread-guide-positions-list">';
  related.forEach((slot,i)=>{html+='<button type="button" class="spread-guide-position" data-spread-position="'+i+'"><b>'+(i+1)+'</b><span>'+spreadGuideText(slot.name||'位置'+(i+1))+'</span></button>'});
  html+='</div><p id="spreadGuidePositionDetail" class="spread-guide-slot-detail"></p></section>';
 }
 if(spread.notes)html+='<section class="spread-guide-prose"><h3>備考</h3><p>'+spreadGuideText(spread.notes)+'</p></section>';
 html+='<div class="row spread-guide-actions"><button type="button" id="spreadGuideAtlas">スプレッド図鑑</button>';
 if(!spread.builtin)html+='<button type="button" id="spreadGuideEdit">解説を編集</button>';
 html+='<button type="button" id="spreadGuideUse" class="primary">この展開法を使う</button></div></div>';
 modal(html);
 const showPosition=i=>{
  const slot=related[i];if(!slot)return;
  document.querySelectorAll('.spread-guide-position').forEach(el=>el.classList.toggle('is-selected',Number(el.dataset.spreadPosition)===i));
  document.querySelectorAll('.spread-diagram-slot').forEach(el=>el.classList.toggle('is-selected',Number(el.dataset.spreadSlot)===i));
  const detail=$('spreadGuidePositionDetail');detail.replaceChildren();
  const strong=document.createElement('strong');strong.textContent=(i+1)+'. '+(slot.name||'位置'+(i+1));detail.append(strong);
  if(slot.detail){const p=document.createElement('span');p.textContent=slot.detail;detail.append(p)}
 };
 document.querySelectorAll('.spread-guide-position').forEach(el=>el.onclick=()=>showPosition(Number(el.dataset.spreadPosition)));
 document.querySelectorAll('.spread-diagram-slot').forEach(el=>{
  const open=()=>showPosition(Number(el.dataset.spreadSlot));
  el.addEventListener('click',open);el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open()}});
 });
 if(related.length)showPosition(0);
 $('spreadGuideAtlas').onclick=()=>openSpreadAtlas();
 if(!spread.builtin)$('spreadGuideEdit').onclick=()=>openSpreadGuideEditor(spread.id);
 $('spreadGuideUse').onclick=()=>{
  if(spread.id===settings.spread){closeModal();setStatus('この展開法を使用中です。');return}
  if((state.placed.length||(state.removed||[]).length)&&!confirm('現在の配札を片付けて展開法を切り替えますか？'))return;
  closeModal();
  $('spread').value=spread.id;
  $('spread').dispatchEvent(new Event('change',{bubbles:true}));
  setStatus('展開法「'+spread.name+'」を選択しました。');
 };
}
function openSpreadAtlas(){
 const list=SpreadGuide.entries(presets,spreadLibrary);
 modal('<div class="spread-atlas"><div class="spread-guide-kicker">TABULA SORTIUM / SPREAD ENCYCLOPEDIA</div><h2>スプレッド図鑑</h2><label class="field">スプレッドを検索<input id="spreadAtlasSearch" type="search" placeholder="名前・考案者・出典・枚数" autocomplete="off"></label><div class="spread-atlas-filters"><button type="button" data-spread-filter="all" class="is-selected">すべて</button><button type="button" data-spread-filter="builtin">プリセット</button><button type="button" data-spread-filter="custom">自作</button></div><p id="spreadAtlasCount" class="spread-guide-meta"></p><div id="spreadAtlasList" class="spread-atlas-list"></div></div>');
 let filter='all';
 const paint=()=>{
  const query=$('spreadAtlasSearch').value.trim().toLocaleLowerCase();
  const matches=list.filter(v=>(filter==='all'||(filter==='builtin')===v.builtin)&&(!query||[v.name,v.alternate,v.author,v.source,v.overview,String(v.slots.length)].join(' ').toLocaleLowerCase().includes(query)));
  $('spreadAtlasCount').textContent=matches.length+' 件';
  const area=$('spreadAtlasList');area.replaceChildren();
  if(!matches.length){const empty=document.createElement('p');empty.textContent='該当するスプレッドはありません。';area.append(empty);return}
  for(const spread of matches){
   const btn=document.createElement('button');btn.type='button';btn.className='spread-atlas-item';
   const diagram=document.createElement('div');diagram.className='spread-atlas-thumb';diagram.innerHTML=SpreadGuide.diagram(spread.slots);
   const label=document.createElement('span');label.className='spread-atlas-item-text';
   const title=document.createElement('strong');title.textContent=spread.name;
   const detail=document.createElement('small');detail.textContent=spread.slots.length+'枚'+(spread.author?' · '+spread.author:'')+(spread.alternate?' · '+spread.alternate:'');
   label.append(title,detail);btn.append(diagram,label);btn.onclick=()=>openSpreadGuide(spread.id);area.append(btn);
  }
 };
 $('spreadAtlasSearch').oninput=paint;
 document.querySelectorAll('[data-spread-filter]').forEach(el=>el.onclick=()=>{filter=el.dataset.spreadFilter;document.querySelectorAll('[data-spread-filter]').forEach(btn=>btn.classList.toggle('is-selected',btn===el));paint()});
 paint();
}
function openSpreadGuideEditor(id){
 const original=spreadLibrary.find(v=>v.id===id);
 if(!original){setStatus('登録スプレッドが見つかりません。');return}
 const fields=[['alternate','別名・外国語名','text'],['author','考案者','text'],['source','出典・文献','text'],['overview','概要','textarea'],['method','使用方法','textarea'],['notes','備考','textarea']];
 let html='<div class="spread-guide-editor"><h2>スプレッド解説の編集</h2><p class="spread-guide-meta">'+spreadGuideText(original.name)+' · '+original.slots.length+'枚</p><p>入力した内容はスプレッドの登録データと一緒に保存します。位置の意味は配置編集で変更できます。</p>';
 for(const [key,label,type] of fields){
  const value=spreadGuideText(original[key]||'');
  html+='<label class="field">'+label+(type==='textarea'?'<textarea data-spread-guide-field="'+key+'" rows="4" maxlength="4000">'+value+'</textarea>':'<input data-spread-guide-field="'+key+'" maxlength="'+(key==='source'?500:120)+'" value="'+value+'">')+'</label>';
 }
 html+='<div class="row"><button type="button" id="spreadGuideEditCancel">キャンセル</button><button type="button" class="primary" id="spreadGuideEditSave">解説を保存</button></div></div>';
 modal(html);
 $('spreadGuideEditCancel').onclick=()=>openSpreadGuide(id);
 $('spreadGuideEditSave').onclick=()=>{
  const values={};document.querySelectorAll('[data-spread-guide-field]').forEach(field=>{values[field.dataset.spreadGuideField]=field.value.trim()});
  const idx=spreadLibrary.findIndex(v=>v.id===id);if(idx<0)return;
  const backup=spreadLibrary[idx];
  spreadLibrary[idx]={...backup,...SpreadGuide.details(values)};
  try{storeSpreadLibrary()}catch(e){spreadLibrary[idx]=backup;alert('解説を保存できませんでした。');return}
  openSpreadGuide(id);setStatus('「'+backup.name+'」の解説を保存しました。');
 };
}

function spreadCapture(){closeSpreadArchive();if(!state.placed.length){alert('フリースプレッドでカードを並べてから実行してください。');return}if(state.placed.length>52){alert('スプレッドに登録できるのは52位置までです。');return}if(spreadWorkbench)return;spreadWorkbench={previousCardSize:zoom,original:JSON.parse(JSON.stringify(state.placed)),chosen:[],names:{},title:'新しいスプレッド',circle:{active:false,radiusPx:null,rotation:0,facing:($('spreadCircleFacing')?.value||'radial')}};$('spreadSave').textContent='スプレッドを登録';document.body.classList.add('spread-workbench-active');$('spreadWorkbench').hidden=false;spreadSnap=true;$('spreadSnapToggle').textContent='グリッド吸着：ON';$('zone').classList.add('spread-grid');$('zone').style.setProperty('--workgrid',($('spreadGridSize').value||24)+'px');refreshWorkbench();render();$('spreadWorkbench').scrollIntoView({block:'nearest',behavior:'smooth'});}
function openStoredSpreadWorkbench(source){
 if(spreadWorkbench)return;
 if(!source||!Array.isArray(source.slots)||!source.slots.length){alert('このスプレッドには編集できる配置がありません。');return}
 // Editing uses working copies of the registered positions, not the real deck or its cards.
 // Preserve the entire current session so cancellation/saving returns to the same table.
 const savedSession=JSON.parse(JSON.stringify(state)),previousCardSize=zoom;
 applySpreadCardSize(source.id,false);
 const slots=JSON.parse(JSON.stringify(source.slots));
 const sourceCards=selectedCards().length?selectedCards():cards;
 state.placed=slots.map((slot,i)=>({id:sourceCards[i%sourceCards.length].id,reversed:false,faceUp:false,slot:null,x:Number(slot.x)||0,y:Number(slot.y)||0,angle:Number(slot.angle)||0,manualMoved:false,dragOrder:i}));
 state.selected=null;
 const original=JSON.parse(JSON.stringify(state.placed));
 spreadWorkbench={previousCardSize,original,chosen:slots.map((_,i)=>i),names:Object.fromEntries(slots.map((v,i)=>[i,v.name||'位置'+(i+1)])),title:source.name,editingId:source.id,savedSession,details:slots.map(v=>v.detail||''),circle:{active:false,radiusPx:null,rotation:0,facing:($('spreadCircleFacing')?.value||'radial')}};
 document.body.classList.add('spread-workbench-active');$('spreadWorkbench').hidden=false;
 $('spreadSave').textContent='変更を保存';spreadSnap=true;
 $('spreadSnapToggle').textContent='グリッド吸着：ON';$('zone').classList.add('spread-grid');
 $('zone').style.setProperty('--workgrid',($('spreadGridSize').value||24)+'px');
 refreshWorkbench();render();$('spreadWorkbench').scrollIntoView({block:'nearest',behavior:'smooth'});
}
function spreadChoose(index){if(!spreadWorkbench)return;const w=spreadWorkbench;if(!w.chosen.includes(index))w.chosen.push(index);refreshWorkbench();render()}
const normalizeAngle=TabulaSpreadGeometry.normalizeAngle;
function workbenchTargets(){const w=spreadWorkbench,arr=state.placed;if(!w||!Array.isArray(arr))return[];return w.chosen.length===arr.length?w.chosen:[...arr.keys()]}
function getWorkbenchCircleBounds(count){const rect=$('zone').getBoundingClientRect(),m=metrics();const margin=18;const max=Math.max(48,Math.min(rect.width/2-m.w*.62-margin,rect.height/2-m.h*.62-margin));const cardStep=Math.max(m.w,m.h)*.72+10;const min=Math.max(48,Math.max(m.w*.78,count>1?(cardStep*count)/(2*Math.PI):0));const clampedMin=Math.min(min,Math.max(48,max));const initial=Math.min(max,Math.max(clampedMin,Math.min(max*.82,clampedMin+Math.max(18,m.w*.35))));return{min:clampedMin,max:Math.max(clampedMin,max),initial}}
const describeCircleFacing=TabulaSpreadGeometry.describeCircleFacing;
const circleFacingAngle=TabulaSpreadGeometry.circleFacingAngle;
function updateSpreadCircleUi(){const w=spreadWorkbench,status=$('spreadCircleStatus'),sel=$('spreadCircleFacing');if(!status||!sel)return;if(!w){status.textContent='円形整列：未実行';return}const facing=(w.circle&&w.circle.facing)||sel.value||'radial';sel.value=facing;if(!w.circle||!w.circle.active){status.textContent='円形整列：未実行';return}const radius=Math.round(Number(w.circle.radiusPx)||0);const rotation=Math.round(normalizeAngle(w.circle.rotation||0));status.textContent=`円形整列：半径 ${radius}px ／ 回転 ${rotation}° ／ ${describeCircleFacing(facing)}`;}
function applyWorkbenchCircle(opts={}){const w=spreadWorkbench;if(!w)return;const arr=state.placed,chosen=workbenchTargets();if(!chosen.length)return;const rect=$('zone').getBoundingClientRect();if(!w.circle)w.circle={active:false,radiusPx:null,rotation:0,facing:($('spreadCircleFacing')?.value||'radial')};const bounds=getWorkbenchCircleBounds(chosen.length);if(opts.facing)w.circle.facing=opts.facing;if(!w.circle.active||opts.auto||!Number.isFinite(Number(w.circle.radiusPx))){w.circle.radiusPx=bounds.initial;if(!Number.isFinite(Number(w.circle.rotation)))w.circle.rotation=0;}if(typeof opts.radiusDelta==='number')w.circle.radiusPx=Number(w.circle.radiusPx||bounds.initial)+opts.radiusDelta;if(typeof opts.rotationDelta==='number')w.circle.rotation=normalizeAngle((Number(w.circle.rotation)||0)+opts.rotationDelta);w.circle.radiusPx=Math.max(bounds.min,Math.min(bounds.max,Number(w.circle.radiusPx)||bounds.initial));w.circle.active=true;TabulaSpreadGeometry.placeOnCircle(arr,chosen,w.circle.radiusPx,w.circle.rotation,w.circle.facing,rect.width,rect.height);updateSpreadCircleUi();render()}
function refreshWorkbench(){const w=spreadWorkbench;if(!w)return;$('spreadWorkbenchHint').textContent=w.chosen.length===state.placed.length?'番号付け完了。名前や配置を調整して登録できます。':`${w.chosen.length+1}番にするカードをタップ（${w.chosen.length}/${state.placed.length}）`;updateSpreadCircleUi();const fields=$('spreadWorkbenchFields');fields.replaceChildren();const title=document.createElement('label');title.textContent='名前';const ti=document.createElement('input');ti.value=w.title;ti.placeholder='スプレッド名';ti.oninput=()=>w.title=ti.value;title.append(ti);fields.append(title);const sizeLabel=document.createElement('label');sizeLabel.textContent='カードサイズ';const sizeInput=document.createElement('input');sizeInput.type='range';sizeInput.id='spreadCardSize';sizeInput.min='.8';sizeInput.max='2.3';sizeInput.step='.05';sizeInput.value=zoom;sizeInput.setAttribute('aria-label','スプレッドに保存するカードサイズ');sizeInput.oninput=()=>{setCardSize(Number(sizeInput.value));render();applyTableCamera()};sizeLabel.append(sizeInput);fields.append(sizeLabel);w.chosen.forEach((index,i)=>{const label=document.createElement('label');label.textContent=(i+1)+'番';const inp=document.createElement('input');inp.value=w.names[index]??('位置'+(i+1));inp.oninput=()=>w.names[index]=inp.value;label.append(inp);fields.append(label)})}
function workbenchAlign(kind){const w=spreadWorkbench;if(!w)return;const arr=state.placed,chosen=workbenchTargets();if(!chosen.length)return;if(kind==='circle'){applyWorkbenchCircle({auto:true});return}TabulaSpreadGeometry.alignPositions(chosen.map(i=>arr[i]),kind);if(w.circle)w.circle.active=false;updateSpreadCircleUi();render()}
function spreadEnd(restore=true){if(!spreadWorkbench)return;const previousCardSize=spreadWorkbench.previousCardSize;if(spreadWorkbench.savedSession)state=spreadWorkbench.savedSession;else if(restore)state.placed=spreadWorkbench.original;spreadWorkbench=null;setCardSize(previousCardSize);document.body.classList.remove('spread-workbench-active');$('spreadWorkbench').hidden=true;$('zone').classList.remove('spread-grid');updateSpreadCircleUi();render();saveLocal()}
$('spreadUndoNumber').onclick=()=>{if(spreadWorkbench){spreadWorkbench.chosen.pop();refreshWorkbench();render()}};
$('spreadNumberReset').onclick=()=>{if(spreadWorkbench){spreadWorkbench.chosen=[];refreshWorkbench();render()}};
$('spreadAlignX').onclick=()=>workbenchAlign('x');$('spreadAlignY').onclick=()=>workbenchAlign('y');$('spreadSpaceX').onclick=()=>workbenchAlign('spaceX');$('spreadSpaceY').onclick=()=>workbenchAlign('spaceY');$('spreadCircle').onclick=()=>workbenchAlign('circle');$('spreadCircleWider').onclick=()=>applyWorkbenchCircle({radiusDelta:24});$('spreadCircleTighter').onclick=()=>applyWorkbenchCircle({radiusDelta:-24});$('spreadCircleRotateLeft').onclick=()=>applyWorkbenchCircle({rotationDelta:-15});$('spreadCircleRotateRight').onclick=()=>applyWorkbenchCircle({rotationDelta:15});$('spreadCircleFacing').onchange=()=>{if(!spreadWorkbench)return;if(!spreadWorkbench.circle)spreadWorkbench.circle={active:false,radiusPx:null,rotation:0,facing:'radial'};spreadWorkbench.circle.facing=$('spreadCircleFacing').value;if(spreadWorkbench.circle.active)applyWorkbenchCircle({facing:spreadWorkbench.circle.facing});else updateSpreadCircleUi()};$('spreadGridSize').onchange=()=>$('zone').style.setProperty('--workgrid',$('spreadGridSize').value+'px');$('spreadSnapToggle').onclick=()=>{spreadSnap=!spreadSnap;$('spreadSnapToggle').textContent='グリッド吸着：'+(spreadSnap?'ON':'OFF');$('zone').classList.toggle('spread-grid',spreadSnap)};
$('spreadRestoreLayout').onclick=()=>{if(spreadWorkbench){state.placed=JSON.parse(JSON.stringify(spreadWorkbench.original));if(spreadWorkbench.circle)spreadWorkbench.circle.active=false;updateSpreadCircleUi();render()}};
$('spreadCancel').onclick=()=>spreadEnd(true);
$('spreadCancel').onclick=()=>spreadEnd(true);
$('spreadSave').onclick=()=>{const w=spreadWorkbench;if(!w)return;if(w.chosen.length!==state.placed.length){alert('すべてのカードを番号順にタップしてください。');return}const name=w.title.trim();if(!name){alert('スプレッド名を入力してください。');return}if(spreadLibrary.some(v=>v.name===name&&v.id!==w.editingId)){alert('同名のスプレッドがあります。');return}const slots=w.chosen.map((index,i)=>{const p=state.placed[index];return{x:p.x,y:p.y,angle:((Number(p.angle)||0)%360+360)%360,name:(w.names[index]||'位置'+(i+1)).trim(),detail:w.editingId?(w.details?.[index]||''):''}});if(w.editingId){const idx=spreadLibrary.findIndex(v=>v.id===w.editingId);if(idx<0){alert('編集対象が見つかりません。');return}const original=spreadLibrary[idx];spreadLibrary[idx]={...original,name,slots,cardSize:zoom};try{storeSpreadLibrary()}catch(e){spreadLibrary[idx]=original;alert('変更を保存できませんでした。');return}spreadEnd(true);if(settings.spread===w.editingId)applySpreadCardSize(w.editingId);sync();render();saveLocal();setStatus('スプレッド「'+name+'」の変更を保存しました。');return;}const id='custom_'+Date.now();spreadLibrary.push({id,name,slots,cardSize:zoom});try{storeSpreadLibrary()}catch(e){spreadLibrary.pop();alert('保存できませんでした。');return}spreadEnd(true);setStatus('スプレッド「'+name+'」を登録しました。展開法から選択できます。')};
function spreadEditor(source,isStored){let draft=JSON.parse(JSON.stringify(source));if(!validCardSize(draft.cardSize))draft.cardSize=zoom;function display(){let html='<h2>'+(isStored?'登録スプレッドを編集':'新しいスプレッドを登録')+'</h2><p class="spread-editor-note">番号は上からの順番です。カードの種類や正逆位置は保存せず、位置・角度・名前・カードサイズを登録します。整列はこの編集画面の配置データに適用され、現在の卓は変更しません。</p><label class="field">スプレッド名<input id="spreadTitle" maxlength="80" value="'+escapeHTML(draft.name)+'"></label><div class="spread-editor-actions"><button id="alignSpreadX" type="button">左右の中心を揃える</button><button id="alignSpreadY" type="button">上下の中心を揃える</button><button id="spaceSpreadX" type="button">横方向を等間隔</button><button id="spaceSpreadY" type="button">縦方向を等間隔</button><button id="circleSpread" type="button">円形に整列</button><button id="undoSpreadAlign" type="button">配置を初期状態に戻す</button></div><div class="spread-editor-table">';draft.slots.forEach((p,i)=>{html+='<div class="spread-editor-row"><label>'+(i+1)+'番</label><input data-idx="'+i+'" class="spread-slot-name" maxlength="80" value="'+escapeHTML(p.name||'')+'" aria-label="'+(i+1)+'番の位置名"></div>'});html+='</div><p class="spread-editor-note">円形整列は卓の中央（50%, 50%）を基準に、1番を上、以降を時計回りに配置します。カードの向きも円周方向に合わせます。</p><div class="row"><button type="button" class="primary" id="saveCustomSpread">'+(isStored?'変更を保存':'スプレッドを登録')+'</button><button type="button" id="cancelSpreadEdit">キャンセル</button>'+(isStored?'<button type="button" id="deleteCustomSpread">登録を削除</button>':'')+'</div>';modal(html);
function read(){draft.name=$('spreadTitle').value.trim();document.querySelectorAll('.spread-slot-name').forEach(input=>{draft.slots[Number(input.dataset.idx)].name=input.value.trim()||'位置'+(Number(input.dataset.idx)+1)})}
const initial=JSON.parse(JSON.stringify(source.slots));
function action(fn){read();fn();display()}
$('alignSpreadX').onclick=()=>action(()=>{const x=draft.slots.reduce((v,p)=>v+p.x,0)/draft.slots.length;draft.slots.forEach(p=>p.x=x)});
$('alignSpreadY').onclick=()=>action(()=>{const y=draft.slots.reduce((v,p)=>v+p.y,0)/draft.slots.length;draft.slots.forEach(p=>p.y=y)});
function equalSpace(axis){const sorted=[...draft.slots].sort((a,b)=>a[axis]-b[axis]);const low=sorted[0][axis],high=sorted[sorted.length-1][axis];sorted.forEach((p,i)=>p[axis]=sorted.length===1?low:low+(high-low)*i/(sorted.length-1))}
$('spaceSpreadX').onclick=()=>action(()=>equalSpace('x'));$('spaceSpreadY').onclick=()=>action(()=>equalSpace('y'));
$('circleSpread').onclick=()=>action(()=>{const n=draft.slots.length;const r=Math.min(35,Math.max(15,115/Math.max(3,n/2)));draft.slots.forEach((p,i)=>{const angle=2*Math.PI*i/n;p.x=50+Math.sin(angle)*r;p.y=50-Math.cos(angle)*r;p.angle=(i*360/n)%360})});
$('undoSpreadAlign').onclick=()=>action(()=>{draft.slots=JSON.parse(JSON.stringify(initial))});
$('cancelSpreadEdit').onclick=closeModal;
$('saveCustomSpread').onclick=()=>{read();if(!draft.name){alert('スプレッド名を入力してください。');return}if(spreadLibrary.some(v=>v.name===draft.name&&v.id!==draft.id)){alert('同名のスプレッドがあります。');return}if(!draft.id)draft.id='custom_'+Date.now();if(!draft.slots.length)return;const idx=spreadLibrary.findIndex(v=>v.id===draft.id);if(idx>=0)spreadLibrary[idx]=draft;else spreadLibrary.push(draft);try{storeSpreadLibrary()}catch(e){alert('保存に失敗しました。');return}closeModal();settings.spread=draft.id;applySpreadCardSize(draft.id);sync();render();saveLocal();setStatus('スプレッド「'+draft.name+'」を登録しました。新しい占いで使用できます。')};
if(isStored)$('deleteCustomSpread').onclick=()=>{if(!confirm('この登録スプレッドを削除しますか？'))return;spreadLibrary=spreadLibrary.filter(v=>v.id!==draft.id);if(settings.spread===draft.id)settings.spread='free';storeSpreadLibrary();closeModal();sync();render();saveLocal()};
}display()}
function editCurrentSpread(){const v=spreadLibrary.find(v=>v.id===settings.spread);if(!v){alert('先に「展開法」から登録済みスプレッドを選んでください。');return}openStoredSpreadWorkbench(v)}
function editCurrentSpread(){const v=spreadLibrary.find(v=>v.id===settings.spread);if(!v){alert('登録済みスプレッドを選んでください。');return}openStoredSpreadWorkbench(v)}
const {presets,colors}=TabulaCatalog;const STORAGE_SCHEMA_VERSION=TabulaStorage.schemaVersion;const KEY='tabula_sortium_v01';let settings={cutCount:3,shuffleMethod:'overhand',pool:'all',cardDesign:'standard',spread:'celtic',color:0,altar:false,labels:true,crossLabelLayer:'behind',sound:false,reversals:true,visualTheme:'classic',effectPreset:'ritual',initialOrder:'random',quickWashDirection:'random',quickWashRounds:1,dealSkipFirst:0,dealSkipSchedule:'',spreadDealOrders:{}};let state={deck:[],placed:[],cutStage:null,selected:null,completionShown:false,dealCheckpoint:null,removed:[]};let recipes=[{id:'single',name:'単独シャッフル',steps:[{method:'overhand',reps:1,groups:1}]}];let recipeId='single';const methods={wash:'ウォッシュ',hindu:'ヒンズー',overhand:'オーバーハンド',riffle:'リフル',pile:'パイル'};function selectedRecipe(){return recipes.find(r=>r.id===recipeId)||recipes[0]}function syncRecipes(){const el=$('shuffleRecipe');if(!el)return;el.replaceChildren(...recipes.map(r=>{const opt=document.createElement('option');opt.value=r.id;opt.textContent=r.name;return opt}));el.value=recipeId;const quick=$('quickShuffleChoice');if(quick){quick.replaceChildren();const single=recipes.find(r=>r.id==='single');const currentMethod=single?.steps?.[0]?.method||settings.shuffleMethod||'overhand';for(const [method,label] of [['hindu','ヒンズー'],['overhand','オーバーハンド'],['riffle','リフル'],['pile','パイル（山分け）']]){const option=document.createElement('option');option.value='method:'+method;option.textContent=label;quick.append(option)}const custom=recipes.filter(r=>r.id!=='single');if(custom.length){const group=document.createElement('optgroup');group.label='登録済みシャッフル手順';custom.forEach(r=>{const option=document.createElement('option');option.value='recipe:'+r.id;option.textContent=r.name;group.append(option)});quick.append(group)}const editOption=document.createElement('option');editOption.value='__edit__';editOption.textContent='手順を編集・登録…';quick.append(editOption);quick.value=recipeId==='single'?'method:'+currentMethod:'recipe:'+recipeId}const tag=$('activeRecipeLabel');if(tag){const r=selectedRecipe();tag.textContent='シャッフル手順：'+(r?r.name:'単独シャッフル');tag.title='卓上のシャッフルボタンで実行される手順';}}function shuffleStepDefaults(method){return {method,reps:1,groups:method==='pile'?4:method==='hindu'||method==='overhand'?7:1,washDirection:'random'}}
function normStep(st){return TabulaShuffle.normStep(st,methods)}
const applyShuffleMethod=TabulaShuffle.applyShuffleMethod;
const washSequence=TabulaShuffle.washSequence;
function recipeEditor(){const recipe=selectedRecipe();const editing=recipe.id!=='single';let steps=recipe.steps.map(x=>normStep(x));let h='<h2>'+(editing?'シャッフル手順の編集':'シャッフル手順の登録')+'</h2><p class="note">方式ごとに設定項目が変わります。登録済みの手順は内容を上書き保存できます。</p><label class="field">名前<input id="recipeName" maxlength="70" value="'+escapeHTML(editing?recipe.name:'新しい手順')+'"></label><div id="recipeSteps"></div><div class="row"><button id="addRecipeStep" type="button">工程を追加</button><button id="saveRecipe" class="primary" type="button">'+(editing?'変更を保存':'名前を付けて保存')+'</button>'+(editing?'<button id="saveRecipeAs" type="button">別名で保存</button>':'')+'</div>';modal(h);

function readSteps(){const root=$('recipeSteps');if(!root)return;root.querySelectorAll('.recipe-step').forEach(row=>{const i=Number(row.dataset.i),st=steps[i];for(const field of ['reps','groups']){const el=row.querySelector('[data-field="'+field+'"]');if(el)st[field]=Math.max(1,Number(el.value)||1)}const dir=row.querySelector('[data-field="washDirection"]');if(dir)st.washDirection=dir.value})}
function draw(){const root=$('recipeSteps');root.innerHTML=steps.map((st,i)=>{const isWash=st.method==='wash',isPile=st.method==='pile',isPackets=st.method==='hindu'||st.method==='overhand';const label=isWash?'混合巡回数':isPackets?'巡回数':'シャッフル回数';const extra=isPile?'<label>分割数<input type="number" data-field="groups" min="2" max="12" value="'+st.groups+'"></label>':isPackets?'<label>取り分け回数<input type="number" data-field="groups" min="1" max="30" value="'+st.groups+'"></label>':isWash?'<label>混合方式<select data-field="washDirection"><option value="random" '+(st.washDirection==='random'?'selected':'')+'>ランダム</option><option value="cw" '+(st.washDirection==='cw'?'selected':'')+'>右回転</option><option value="ccw" '+(st.washDirection==='ccw'?'selected':'')+'>左回転</option><option value="alternate" '+(st.washDirection==='alternate'?'selected':'')+'>交互回転</option></select></label>':'';return '<div class="recipe-step" data-i="'+i+'"><b>'+(i+1)+'.</b><select class="recipe-method" data-i="'+i+'">'+Object.entries(methods).map(([v,n])=>'<option value="'+v+'" '+(st.method===v?'selected':'')+'>'+n+'</option>').join('')+'</select><label>'+label+'<input type="number" data-field="reps" min="1" max="100" value="'+st.reps+'"></label>'+(extra||'<span class="recipe-extra-empty" aria-hidden="true"></span>')+'<button type="button" class="recipe-remove" data-i="'+i+'">×</button></div>'}).join('');root.querySelectorAll('.recipe-remove').forEach(b=>b.onclick=()=>{readSteps();if(steps.length<=1)return;steps.splice(+b.dataset.i,1);draw()});root.querySelectorAll('.recipe-method').forEach(el=>el.onchange=()=>{readSteps();steps[+el.dataset.i]=shuffleStepDefaults(el.value);draw()})}
$('addRecipeStep').onclick=()=>{readSteps();steps.push(shuffleStepDefaults('overhand'));draw()};
function storeRecipe(asNew){readSteps();steps=steps.map(normStep);if(steps.reduce((n,x)=>n+x.reps,0)>100){alert('合計100巡以下にしてください。');return}const name=$('recipeName').value.trim();if(!name){alert('手順の名前を入力してください。');return}const existing=recipes.find(r=>r.name===name&&r.id!==(asNew?'':recipe.id));if(existing){alert('同じ名前の登録手順がすでにあります。別の名前にしてください。');return}if(editing&&!asNew){recipe.name=name;recipe.steps=steps;recipeId=recipe.id;}else{let id='recipe_'+Date.now();while(recipes.some(r=>r.id===id))id+='_1';recipes.push({id,name,steps});recipeId=id;}syncRecipes();saveLocal();closeModal();setStatus('シャッフル手順「'+name+'」を'+(editing&&!asNew?'更新':'登録')+'しました。')}
$('saveRecipe').onclick=()=>storeRecipe(false);if(editing)$('saveRecipeAs').onclick=()=>storeRecipe(true);draw()}
function escapeHTML(t){return String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}function runRecipe(manual=false){if(shuffleBusy)return;if(state.deck.length<2){setStatus('シャッフルには2枚以上必要です。');return}const recipe=selectedRecipe();shuffleBusy=true;$('shuffle').disabled=true;$('manualShuffle').disabled=true;let i=0;const next=()=>{if(i>=recipe.steps.length){shuffleBusy=false;$('shuffle').disabled=false;$('manualShuffle').disabled=false;render();saveLocal();play('shuffle');setStatus('「'+recipe.name+'」の手順を完了しました。');return}const st=normStep(recipe.steps[i++]),reps=st.reps;let round=0;const perform=()=>{if(round>=reps){next();return}const current=round++;const direction=st.washDirection==='alternate'?(current%2===0?'cw':'ccw'):st.washDirection;setStatus('工程 '+i+'/'+recipe.steps.length+'：'+methods[st.method]+' '+round+'/'+reps+(st.method==='wash'?'巡 · '+({random:'ランダム',cw:'右回転',ccw:'左回転',alternate:'交互回転'})[direction]:st.method==='pile'?'回 · '+st.groups+'分割':st.method==='hindu'||st.method==='overhand'?'巡 · '+st.groups+'回取り分け':'回'));animateShuffle(st.method,()=>{state.deck=applyShuffleMethod(state.deck.slice(),st,manual,current);if(settings.reversals&&st.method==='wash')state.deck.forEach(c=>{if(Math.random()<.45)c.reversed=Math.random()<.5});perform()},manual,{direction,piles:st.groups})};perform()};next()}
// View state is independent of a reading, card sizes, and future deck instances.
const TABLE_CAMERA_KEY='tabula_table_camera_v1';
let tableCamera={scale:1,x:0,y:0},cameraPanMode=false;
try{const v=JSON.parse(localStorage.getItem(TABLE_CAMERA_KEY)||'null');if(v&&[v.scale,v.x,v.y].every(Number.isFinite))tableCamera={scale:Math.max(1,Math.min(4,v.scale)),x:v.x,y:v.y}}catch(e){}
function mobileCameraEnabled(){return window.matchMedia('(pointer:coarse)').matches&&Math.min(window.screen.width||window.innerWidth,window.screen.height||window.innerHeight)<=780}
let mobileTableCamera={...tableCamera},cameraWasEnabled=null;
function saveTableCamera(){if(!mobileCameraEnabled())return;mobileTableCamera={...tableCamera};try{localStorage.setItem(TABLE_CAMERA_KEY,JSON.stringify(tableCamera))}catch(e){}}
function clampTableCamera(){
 const surface=$('surface'),stage=$('stage');
 const mx=Math.max(0,(surface.offsetWidth*tableCamera.scale-stage.clientWidth)/2+10),my=Math.max(0,(surface.offsetHeight*tableCamera.scale-stage.clientHeight)/2+10);
 tableCamera.x=Math.max(-mx,Math.min(mx,tableCamera.x));tableCamera.y=Math.max(-my,Math.min(my,tableCamera.y));
 if(tableCamera.scale===1)tableCamera.x=tableCamera.y=0;
}
function applyTableCamera(){
 const enabled=mobileCameraEnabled();
 if(enabled!==cameraWasEnabled){
  if(enabled)tableCamera={...mobileTableCamera};
  else{if(cameraWasEnabled!==false)mobileTableCamera={...tableCamera};tableCamera={scale:1,x:0,y:0};cameraPanMode=false;}
  cameraWasEnabled=enabled;
 }
 if(!enabled&&desktopTableEnabled()){tableCamera={scale:desktopTableScale(),x:desktopTablePan.x,y:desktopTablePan.y};}
 const pan=$('tablePanToggle');if(pan){pan.hidden=true;pan.setAttribute('aria-pressed','false')}
 const help=document.querySelector('.camera-help');if(help)help.hidden=!enabled;
 const output=$('tableZoomLabel');if(output)output.hidden=!enabled;
 const size=$('cardSizeScale');if(size&&$('cardSizeDetails'))size.closest('label').hidden=false;
 $('zoomReset').textContent='標準';$('zoomReset').title='カードサイズを標準に戻す';
 $('zoomIn').title='カードサイズを大きくする';$('zoomOut').title='カードサイズを小さくする';
 $('stage').classList.toggle('mobile-camera-enabled',enabled);
 $('stage').classList.remove('camera-pan-mode');
 clampTableCamera();if(!enabled&&desktopTableEnabled()){desktopTablePan={x:tableCamera.x,y:tableCamera.y};}
 $('surface').style.transform=`translate(${tableCamera.x}px,${tableCamera.y}px) scale(${tableCamera.scale})`;
 const label=$('tableZoomLabel');if(label)label.textContent=Math.round(tableCamera.scale*100)+'%';
 $('zoomOut').disabled=zoom<=.8;$('zoomIn').disabled=zoom>=2.3;
}
function zoomTableAt(scale,clientX,clientY){
 if(!mobileCameraEnabled())return;
 const r=$('stage').getBoundingClientRect(),px=clientX-r.left-r.width/2,py=clientY-r.top-r.height/2;
 const next=Math.max(1,Math.min(4,scale)),ratio=next/tableCamera.scale;
 tableCamera.x=px-(px-tableCamera.x)*ratio;tableCamera.y=py-(py-tableCamera.y)*ratio;tableCamera.scale=next;applyTableCamera();
}
function zoomTableBy(ratio){const r=$('stage').getBoundingClientRect();zoomTableAt(tableCamera.scale*ratio,r.left+r.width/2,r.top+r.height/2);saveTableCamera()}
function resetTableCamera(){tableCamera={scale:1,x:0,y:0};applyTableCamera();saveTableCamera()}
function installTableCamera(){
 const stage=$('stage');
 $('zoomReset').textContent='全体';$('zoomReset').title='卓全体を表示';$('zoomIn').title='卓を拡大';$('zoomOut').title='卓を縮小';
 const label=document.createElement('output');label.id='tableZoomLabel';label.setAttribute('aria-label','卓の表示倍率');$('zoomReset').after(label);
 const pan=document.createElement('button');pan.id='tablePanToggle';pan.type='button';pan.textContent='卓を移動';pan.setAttribute('aria-pressed','false');pan.title='ONにしてドラッグすると卓全体を移動';label.after(pan);
 pan.onclick=()=>{cameraPanMode=!cameraPanMode;pan.setAttribute('aria-pressed',String(cameraPanMode));stage.classList.toggle('camera-pan-mode',cameraPanMode)};
 const help=document.createElement('div');help.className='camera-help';help.textContent='2本指で拡大 ／ 拡大後は卓の余白を1本指で移動 ／ 全景で戻る';stage.closest('.stage-shell').after(help);
 const host=$('cardDesign').closest('section');const field=document.createElement('label');field.className='field camera-card-size';field.textContent='カードの大きさ';const size=document.createElement('input');size.type='range';size.id='cardSizeScale';size.min='0.8';size.max='2.3';size.step='0.05';
 try{const saved=localStorage.getItem('tabula_card_size_v2');const v=saved===null?NaN:Number(saved);if(v>=.8&&v<=2.3)zoom=v}catch(e){}size.value=zoom;size.setAttribute('aria-label','カードの大きさ');size.oninput=()=>{setCardSize(Number(size.value));render();applyTableCamera();if(!spreadWorkbench)saveLocal()};field.append(size);host.append(field);
 const touches=new Map();let gesture=null,blocked=false,mousePan=null,oneFingerPan=null,suppressClickUntil=0,firstCard=null;
 function cancelCardGesture(){
  cancelCardLongPress();if(firstCard&&state.placed[firstCard.index]){const p=state.placed[firstCard.index];p.x=firstCard.x;p.y=firstCard.y;if(firstCard.manualMoved===undefined)delete p.manualMoved;else p.manualMoved=firstCard.manualMoved;const node=$('zone').querySelector(`[data-index="${firstCard.index}"]`);if(node){node.style.left=p.x+'%';node.style.top=`calc(${p.y}% + ${cardDisplayLiftPx(p)}px)`;}}
  drag=null;dragMoved=false;clearDeckPreview();stage.querySelectorAll('.dragging').forEach(n=>n.classList.remove('dragging'));refreshTableLabels();
 }
 function pair(){const [a,b]=[...touches.values()];return{x:(a.x+b.x)/2,y:(a.y+b.y)/2,d:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y))}}
 function startPair(){const p=pair(),r=stage.getBoundingClientRect();gesture={...p,scale:tableCamera.scale,localX:(p.x-r.left-r.width/2-tableCamera.x)/tableCamera.scale,localY:(p.y-r.top-r.height/2-tableCamera.y)/tableCamera.scale}}
 function stopEvent(e){e.preventDefault();e.stopImmediatePropagation()}
 stage.addEventListener('pointerdown',e=>{
  if(!mobileCameraEnabled())return;
  if(e.pointerType==='touch'){
   touches.set(e.pointerId,{x:e.clientX,y:e.clientY});
   if(touches.size===1){blocked=false;const card=e.target.closest('.card');const index=card?Number(card.dataset.index):-1;const p=state.placed[index];firstCard=p?{index,x:p.x,y:p.y,manualMoved:p.manualMoved}:null;}
   if(touches.size===1&&tableCamera.scale>1&&!e.target.closest('.card,#deck,.slot,.altar-object,button,input,select,textarea,a')){oneFingerPan={id:e.pointerId,x:e.clientX,y:e.clientY,viewX:tableCamera.x,viewY:tableCamera.y,moved:false};stage.setPointerCapture(e.pointerId);stopEvent(e);}
   if(touches.size>=2){oneFingerPan=null;blocked=true;cancelCardGesture();startPair();stage.classList.add('camera-moving');for(const id of touches.keys()){try{stage.setPointerCapture(id)}catch(e){}}stopEvent(e)}
  }else if((cameraPanMode&&e.button===0)||e.button===1){cancelCardGesture();mousePan={id:e.pointerId,x:e.clientX,y:e.clientY,viewX:tableCamera.x,viewY:tableCamera.y};stage.setPointerCapture(e.pointerId);stage.classList.add('camera-moving');stopEvent(e)}
 },true);
 stage.addEventListener('pointermove',e=>{
  if(!mobileCameraEnabled())return;
  if(touches.has(e.pointerId))touches.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(blocked){if(touches.size>=2&&gesture){const p=pair(),r=stage.getBoundingClientRect();tableCamera.scale=Math.max(1,Math.min(4,gesture.scale*p.d/gesture.d));tableCamera.x=p.x-r.left-r.width/2-gesture.localX*tableCamera.scale;tableCamera.y=p.y-r.top-r.height/2-gesture.localY*tableCamera.scale;applyTableCamera()}stopEvent(e)}
  else if(oneFingerPan&&oneFingerPan.id===e.pointerId){const dx=e.clientX-oneFingerPan.x,dy=e.clientY-oneFingerPan.y;if(Math.hypot(dx,dy)>4)oneFingerPan.moved=true;if(oneFingerPan.moved){tableCamera.x=oneFingerPan.viewX+dx;tableCamera.y=oneFingerPan.viewY+dy;stage.classList.add('camera-moving');applyTableCamera()}stopEvent(e)}
  else if(mousePan&&mousePan.id===e.pointerId){tableCamera.x=mousePan.viewX+e.clientX-mousePan.x;tableCamera.y=mousePan.viewY+e.clientY-mousePan.y;applyTableCamera();stopEvent(e)}
 },true);
 function end(e){
  if(!mobileCameraEnabled())return;
  if(touches.has(e.pointerId))touches.delete(e.pointerId);
  if(blocked){suppressClickUntil=Date.now()+450;stopEvent(e);if(touches.size>=2)startPair();else gesture=null;if(!touches.size){blocked=false;firstCard=null;stage.classList.remove('camera-moving');saveTableCamera()}}
  if(oneFingerPan&&oneFingerPan.id===e.pointerId){const moved=oneFingerPan.moved;oneFingerPan=null;stage.classList.remove('camera-moving');saveTableCamera();if(moved)suppressClickUntil=Date.now()+450;else if(e.type==='pointerup'){state.selected=null;updateCardSelection()}stopEvent(e)}
  if(mousePan&&mousePan.id===e.pointerId){mousePan=null;suppressClickUntil=Date.now()+450;stage.classList.remove('camera-moving');saveTableCamera();stopEvent(e)}
 }
 stage.addEventListener('pointerup',end,true);stage.addEventListener('pointercancel',end,true);
 stage.addEventListener('click',e=>{if(mobileCameraEnabled()&&(blocked||Date.now()<suppressClickUntil))stopEvent(e)},true);
 stage.addEventListener('wheel',e=>{
  if(!mobileCameraEnabled())return;
  if(e.ctrlKey||e.metaKey){stopEvent(e);zoomTableAt(tableCamera.scale*Math.exp(-e.deltaY*.002),e.clientX,e.clientY);saveTableCamera()}
  else if(tableCamera.scale>1){stopEvent(e);const unit=e.deltaMode===1?16:e.deltaMode===2?stage.clientHeight:1;tableCamera.x-=(e.shiftKey?e.deltaY:e.deltaX)*unit;tableCamera.y-=(e.shiftKey?0:e.deltaY)*unit;applyTableCamera();saveTableCamera()}
 },{passive:false,capture:true});
 window.addEventListener('resize',applyTableCamera);applyTableCamera();
}

// Discrete desktop views use real layout dimensions, with document scrolling only.
const DESKTOP_TABLE_VIEWS={full:{label:'全景',scale:1},zoom:{label:'近景',scale:1.5},close:{label:'接写',scale:2}};
let desktopTableView='full',desktopTablePan={x:0,y:0},desktopZoomStep=1;
try{const v=JSON.parse(localStorage.getItem('tabula_desktop_table_pan_v1')||'null');if(v&&[v.x,v.y].every(Number.isFinite))desktopTablePan={x:v.x,y:v.y}}catch(e){}
function saveDesktopTablePan(){try{localStorage.setItem('tabula_desktop_table_pan_v1',JSON.stringify(desktopTablePan))}catch(e){}}
try{const v=localStorage.getItem('tabula_desktop_table_view_v1');if(DESKTOP_TABLE_VIEWS[v])desktopTableView=v}catch(e){}
try{const stored=Number(localStorage.getItem('tabula_desktop_zoom_step_v1'));desktopZoomStep=stored>=1&&stored<=6?Math.min(4,Math.round(stored)):({full:1,zoom:2,close:4}[desktopTableView]||1)}catch(e){}
function desktopTableEnabled(){return window.innerWidth>780&&!mobileCameraEnabled()}
const DESKTOP_ZOOM_SCALES=[1,1.3,1.6,2];function desktopTableScale(){return desktopTableEnabled()?DESKTOP_ZOOM_SCALES[desktopZoomStep-1]:1}
function applyDesktopTableView(){
 const enabled=desktopTableEnabled();document.body.classList.toggle('pc-table-view',enabled);document.body.classList.toggle('pc-table-expanded',enabled&&desktopZoomStep>1);
 document.body.style.setProperty('--desktop-table-scale',String(desktopTableScale()));
 const base=Math.min(740,Math.max(260,window.innerWidth-340));document.body.style.setProperty('--desktop-table-width',base+'px');
 const group=$('desktopTableViews');if(group){group.hidden=!enabled;group.querySelectorAll('button[data-distance]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.distance)===desktopZoomStep)));}
}
function installDesktopTableViews(){
 const group=document.createElement('div');group.id='desktopTableViews';group.setAttribute('role','group');group.setAttribute('aria-label','卓を見る距離');const viewLabel=document.createElement('span');viewLabel.className='table-view-label';viewLabel.textContent='卓';viewLabel.setAttribute('aria-hidden','true');group.append(viewLabel);
 const labels=['卓全体（100%）','少し近づく（130%）','近づく（160%）','細部を見る（200%）'];
 for(let step=1;step<=4;step++){
  const button=document.createElement('button');button.type='button';button.dataset.distance=step;if(step===1)button.id='tableViewReset';
  button.title=labels[step-1];button.setAttribute('aria-label',labels[step-1]);
  const height=12+(step-1)*5;button.style.setProperty('--card-icon-height',height+'px');button.style.setProperty('--card-icon-width',(height*22/32)+'px');
  button.innerHTML='<svg viewBox="0 0 26 36" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="2" y="2" width="22" height="32" rx="2"/><path d="m13 12 4 6-4 6-4-6z" stroke-width="1"/></svg>';
  button.onclick=()=>{const previous=desktopZoomStep;desktopZoomStep=step;desktopTableView=step===1?'full':'zoom';if(step===1)desktopTablePan={x:0,y:0};else desktopTablePan={x:desktopTablePan.x*DESKTOP_ZOOM_SCALES[step-1]/DESKTOP_ZOOM_SCALES[previous-1],y:desktopTablePan.y*DESKTOP_ZOOM_SCALES[step-1]/DESKTOP_ZOOM_SCALES[previous-1]};try{localStorage.setItem('tabula_desktop_zoom_step_v1',String(step))}catch(e){}applyDesktopTableView();applyTableCamera();render();saveDesktopTablePan();};
  group.append(button);
 }
  // Grab only bare tabletop space; cards and inspection retain their own events.
 const stage=$('stage');let backgroundPan=null,backgroundMoved=false;
 stage.addEventListener('pointerdown',e=>{
  backgroundMoved=false;
  if(e.button!==0||e.pointerType==='touch'||!desktopTableEnabled()||desktopTableScale()<=1||e.target.closest('.card,#deck,.slot,.altar-object,button,input,select,textarea,a'))return;
  backgroundPan={id:e.pointerId,x:e.clientX,y:e.clientY,panX:desktopTablePan.x,panY:desktopTablePan.y};stage.setPointerCapture(e.pointerId);e.preventDefault();e.stopImmediatePropagation();
 },true);
 stage.addEventListener('pointermove',e=>{
  if(!backgroundPan||backgroundPan.id!==e.pointerId)return;
  const dx=e.clientX-backgroundPan.x,dy=e.clientY-backgroundPan.y;
  if(Math.hypot(dx,dy)>4)backgroundMoved=true;
  if(backgroundMoved){document.body.classList.add('pc-table-dragging');desktopTablePan={x:backgroundPan.panX+dx,y:backgroundPan.panY+dy};applyTableCamera();}
  e.preventDefault();e.stopImmediatePropagation();
 },true);
 function endBackgroundPan(e){if(!backgroundPan||backgroundPan.id!==e.pointerId)return;backgroundPan=null;saveDesktopTablePan();document.body.classList.remove('pc-table-dragging');e.preventDefault();e.stopImmediatePropagation()}
 stage.addEventListener('pointerup',endBackgroundPan,true);stage.addEventListener('pointercancel',endBackgroundPan,true);
 stage.addEventListener('lostpointercapture',()=>{backgroundPan=null;document.body.classList.remove('pc-table-dragging')});
 stage.addEventListener('click',e=>{if(backgroundMoved&&!e.target.closest('.card,#deck,button')){e.preventDefault();e.stopImmediatePropagation();backgroundMoved=false}},true);

 $('zoomReset').after(group);window.addEventListener('resize',()=>{applyDesktopTableView();applyTableCamera();render()});applyDesktopTableView();
}

let customIds=cards.map(c=>c.id);
let deckLibrary=TabulaDeckStore.read(localStorage,cards);
function activeDeck(){return deckLibrary.find(d=>d.id===settings.deckId)||null}
function effectiveCardLanguage(){return activeDeck()?.language||settings.cardLanguage||'original'}
function effectivePipBackground(){return activeDeck()?.pipBackground||settings.pipBackground||'landscape'}
function displayCard(c){const original=cards.find(v=>v.id===c.id)||c,d=activeDeck();return {...original,name:d?.names?.[original.id]||TabulaDeckStore.translatedName(original,effectiveCardLanguage()),number:original.group==='major'&&d&&Object.hasOwn(d.majorNumbers,original.id)?d.majorNumbers[original.id]:original.number}}
function tableCardName(c){const lang=settings.tableCardLanguage||'linked';return lang==='linked'?displayCard(c).name:TabulaDeckStore.translatedName(c,lang)}
function storeDeckLibrary(){try{TabulaDeckStore.write(localStorage,deckLibrary,cards);return true}catch(e){setStatus('デッキの保存に失敗しました。');return false}}
function refreshDeckPicker(){const picker=$('deckLibrarySelect');if(!picker)return;picker.replaceChildren(new Option('TABULA TAROT（標準）','builtin'),new Option('シンプル','simple'));for(const d of deckLibrary)picker.add(new Option(d.name,d.id));picker.value=activeDeck()?.id||(settings.deckId==='simple'||settings.cardDesign==='simple'?'simple':'builtin')}
let audioCtx=null,zoom=defaultCardSize(),drag=null,dragMoved=false;const rnd=TabulaShuffle.rnd;
const randomize=TabulaShuffle.randomize;function selectedCards(){
 const d=activeDeck();
 const base=TabulaCardRules.selectCards(cards,settings.pool,customIds).filter(c=>!d||d.included.includes(c.id));
 return base.sort((a,b)=>a.group==='major'&&b.group==='major'?((displayCard(a).number??-1)-(displayCard(b).number??-1)):0);
}function setStatus(t){$('status').textContent=t}function play(type){if(!settings.sound)return;try{audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();const t=audioCtx.currentTime,osc=audioCtx.createOscillator(),g=audioCtx.createGain();osc.type='triangle';osc.frequency.setValueAtTime(type==='flip'?360:160,t);osc.frequency.exponentialRampToValueAtTime(type==='flip'?180:90,t+.06);g.gain.setValueAtTime(.035,t);g.gain.exponentialRampToValueAtTime(.001,t+.075);osc.connect(g);g.connect(audioCtx.destination);osc.start(t);osc.stop(t+.085)}catch(e){}}function initialize(){setCardSize(spreadCardSize(settings.spread));state={deck:(settings.initialOrder==='ordered'?selectedCards().map(c=>({id:c.id,reversed:false})):randomize(selectedCards().map(c=>({id:c.id,reversed:settings.reversals?Math.random()<.5:false})))),placed:[],cutStage:null,selected:null,completionShown:false,dealCheckpoint:null,removed:[]};render();setStatus(`新しい占い：${state.deck.length}枚のカードを用意しました。`);saveLocal()}function defaultDealOrder(spread){return TabulaCardRules.defaultDealOrder(presets,spread)}
function getDealOrder(spread=settings.spread){return TabulaCardRules.getDealOrder(presets,spread,settings.spreadDealOrders)}
function parseDealOrderInput(raw,spread=settings.spread){return TabulaCardRules.parseDealOrderInput(raw,presets,spread)}
function syncDealOrderField(){const el=$('spreadDealOrder'),help=$('spreadOrderHelp'),reset=$('resetSpreadDealOrder');if(!el)return;const spread=settings.spread,count=getSlots().length;el.disabled=spread==='free';reset.disabled=spread==='free';el.value=spread==='free'?'':getDealOrder().map(n=>n+1).join(', ');help.textContent=spread==='free'?'自由配置では配札位置の指定順はありません。':`位置番号1〜${count}を並べ替えます。カードの意味・結果番号はそのままです。`}
function nextDealSlot(){const occupied=new Set(state.placed.map(p=>p.slot));return getDealOrder().find(slot=>!occupied.has(slot))??-1}
function getSlots(){return presets[settings.spread]||[];
}function metrics(){const rect=$('zone').getBoundingClientRect();const z={width:$('zone').offsetWidth,height:$('zone').offsetHeight};const scale=zoom;const pc=window.innerWidth>780;const w=Math.min(z.width*(pc?.129:.12),z.height*(pc?.268:.25),pc?92:85)*scale;return{w,h:w*1.52,z:rect}}function shortName(c){c=displayCard(c);if(activeDeck()&&activeDeck().names[c.id])return c.name;if(c.group==='major')return c.name;const nm={wands:'ワンド',cups:'カップ',swords:'ソード',pentacles:'ペンタクル'}[c.suit]||'';const rank=c.number<=10?(c.number===1?'A':String(c.number)):['ペイジ','ナイト','クイーン','キング'][c.number-11];return nm+(c.number<=10?rank:'の'+rank)}const TABULA_TAROT_IMAGES={"major_00":"images/decks/tabula-tarot/base/major_00.webp","major_01":"images/decks/tabula-tarot/base/major_01.webp","major_02":"images/decks/tabula-tarot/base/major_02.webp","major_03":"images/decks/tabula-tarot/base/major_03.webp","major_04":"images/decks/tabula-tarot/base/major_04.webp","major_05":"images/decks/tabula-tarot/base/major_05.webp","major_06":"images/decks/tabula-tarot/base/major_06.webp","major_07":"images/decks/tabula-tarot/base/major_07.webp","major_08":"images/decks/tabula-tarot/base/major_08.webp","major_09":"images/decks/tabula-tarot/base/major_09.webp","major_10":"images/decks/tabula-tarot/base/major_10.webp","major_11":"images/decks/tabula-tarot/base/major_11.webp","major_12":"images/decks/tabula-tarot/base/major_12.webp","major_13":"images/decks/tabula-tarot/base/major_13.webp","major_14":"images/decks/tabula-tarot/base/major_14.webp","major_15":"images/decks/tabula-tarot/base/major_15.webp","major_16":"images/decks/tabula-tarot/base/major_16.webp","major_17":"images/decks/tabula-tarot/base/major_17.webp","major_18":"images/decks/tabula-tarot/base/major_18.webp","major_19":"images/decks/tabula-tarot/base/major_19.webp","major_20":"images/decks/tabula-tarot/base/major_20.webp","major_21":"images/decks/tabula-tarot/base/major_21.webp","wands_14":"images/decks/tabula-tarot/base/wands_14.webp","wands_13":"images/decks/tabula-tarot/base/wands_13.webp","wands_12":"images/decks/tabula-tarot/base/wands_12.webp","wands_11":"images/decks/tabula-tarot/base/wands_11.webp","cups_14":"images/decks/tabula-tarot/base/cups_14.webp","cups_13":"images/decks/tabula-tarot/base/cups_13.webp","cups_12":"images/decks/tabula-tarot/base/cups_12.webp","cups_11":"images/decks/tabula-tarot/base/cups_11.webp","swords_14":"images/decks/tabula-tarot/base/swords_14.webp","swords_13":"images/decks/tabula-tarot/base/swords_13.webp","swords_12":"images/decks/tabula-tarot/base/swords_12.webp","swords_11":"images/decks/tabula-tarot/base/swords_11.webp","pentacles_14":"images/decks/tabula-tarot/base/pentacles_14.webp","pentacles_13":"images/decks/tabula-tarot/base/pentacles_13.webp","pentacles_12":"images/decks/tabula-tarot/base/pentacles_12.webp","pentacles_11":"images/decks/tabula-tarot/base/pentacles_11.webp","wands_01":"images/decks/tabula-tarot/base/wands_01.webp","wands_02":"images/decks/tabula-tarot/base/wands_02.webp","wands_03":"images/decks/tabula-tarot/base/wands_03.webp","wands_04":"images/decks/tabula-tarot/base/wands_04.webp","wands_05":"images/decks/tabula-tarot/base/wands_05.webp","wands_06":"images/decks/tabula-tarot/base/wands_06.webp","wands_07":"images/decks/tabula-tarot/base/wands_07.webp","wands_08":"images/decks/tabula-tarot/base/wands_08.webp","wands_09":"images/decks/tabula-tarot/base/wands_09.webp","wands_10":"images/decks/tabula-tarot/base/wands_10.webp","cups_01":"images/decks/tabula-tarot/base/cups_01.webp","cups_02":"images/decks/tabula-tarot/base/cups_02.webp","cups_03":"images/decks/tabula-tarot/base/cups_03.webp","cups_04":"images/decks/tabula-tarot/base/cups_04.webp","cups_05":"images/decks/tabula-tarot/base/cups_05.webp","cups_06":"images/decks/tabula-tarot/base/cups_06.webp","cups_07":"images/decks/tabula-tarot/base/cups_07.webp","cups_08":"images/decks/tabula-tarot/base/cups_08.webp","cups_09":"images/decks/tabula-tarot/base/cups_09.webp","cups_10":"images/decks/tabula-tarot/base/cups_10.webp","swords_01":"images/decks/tabula-tarot/base/swords_01.webp","swords_02":"images/decks/tabula-tarot/base/swords_02.webp","swords_03":"images/decks/tabula-tarot/base/swords_03.webp","swords_04":"images/decks/tabula-tarot/base/swords_04.webp","swords_05":"images/decks/tabula-tarot/base/swords_05.webp","swords_06":"images/decks/tabula-tarot/base/swords_06.webp","swords_07":"images/decks/tabula-tarot/base/swords_07.webp","swords_08":"images/decks/tabula-tarot/base/swords_08.webp","swords_09":"images/decks/tabula-tarot/base/swords_09.webp","swords_10":"images/decks/tabula-tarot/base/swords_10.webp","pentacles_01":"images/decks/tabula-tarot/base/pentacles_01.webp","pentacles_02":"images/decks/tabula-tarot/base/pentacles_02.webp","pentacles_03":"images/decks/tabula-tarot/base/pentacles_03.webp","pentacles_04":"images/decks/tabula-tarot/base/pentacles_04.webp","pentacles_05":"images/decks/tabula-tarot/base/pentacles_05.webp","pentacles_06":"images/decks/tabula-tarot/base/pentacles_06.webp","pentacles_07":"images/decks/tabula-tarot/base/pentacles_07.webp","pentacles_08":"images/decks/tabula-tarot/base/pentacles_08.webp","pentacles_09":"images/decks/tabula-tarot/base/pentacles_09.webp","pentacles_10":"images/decks/tabula-tarot/base/pentacles_10.webp"};
function cardMark(c){c=displayCard(c);
 if(settings.cardDesign==='standard' && TABULA_TAROT_IMAGES[c.id])return cardArtworkMarkup(finishedCardSource(c,true)).replace('class="card-art"','class="card-art tarot-face-art"');
 if(c.group==='major')return `<div class="major-rank">${c.number===null?'':c.number}</div><div class="major-name">${escapeHTML(c.name)}</div>`;
 const rank=c.number<=10?String(c.number):['P','N','Q','K'][c.number-11];
 const symbols={
 wands:'<svg viewBox="0 0 48 70" aria-hidden="true"><path d="M10 63 L37 7" stroke="#54361f" stroke-width="7" stroke-linecap="round"/><path d="M10 63 L37 7" stroke="#ad8550" stroke-width="3" stroke-linecap="round"/><path d="M27 28 Q12 11 14 10 Q27 13 30 24 M24 34 Q38 30 42 21 Q30 22 24 34" fill="#608052" stroke="#35533d" stroke-width="1.5"/></svg>',
 cups:'<svg viewBox="0 0 48 70" aria-hidden="true"><path d="M7 11 Q4 42 24 44 Q44 42 41 11 Z M24 44 V59 M13 61 H35" fill="#c6a158" stroke="#72552b" stroke-width="3" stroke-linejoin="round"/><path d="M12 17 H36" stroke="#f2d792" stroke-width="3"/></svg>',
 swords:'<svg viewBox="0 0 48 70" aria-hidden="true"><path d="M24 4 L29 49 L24 57 L19 49Z" fill="#b9c2c1" stroke="#45575b" stroke-width="2"/><path d="M24 6 V50" stroke="#eef4ed" stroke-width="2"/><path d="M9 51 H39 M24 52 V65" stroke="#927446" stroke-width="5" stroke-linecap="round"/><circle cx="24" cy="65" r="3" fill="#b89553"/></svg>',
 pentacles:'<svg viewBox="0 0 70 70" aria-hidden="true"><circle cx="35" cy="35" r="28" fill="#c4a05b" stroke="#6a4f30" stroke-width="3"/><circle cx="35" cy="35" r="23" fill="none" stroke="#ead49e" stroke-width="2"/><path d="M35 12 L48.5 53 L13.5 27 H56.5 L21.5 53 Z" fill="none" stroke="#5a442d" stroke-width="3" stroke-linejoin="round"/></svg>'};
 return `<div class="suit-icon">${symbols[c.suit]}</div><div class="rank-value">${rank}</div>`;
}
function celticCrossShift(){return window.innerWidth<=780?Math.round(Math.min(30,metrics().h*.32)):76}
function cardDisplayLiftPx(item){return settings.spread==='celtic'&&item.slot===1&&item.faceUp&&!item.manualMoved?celticCrossShift():0}
function cardDisplayRotation(item){return TabulaUiFormat.cardDisplayRotation(item,settings.spread)}
function createPlacedSlotLabel(item,slot,slotIndex,m){
  // Position numbers belong to the spread, not to the physical card.
  // Keep them at their original slot even if the card is reversed or dragged.
  const t=document.createElement('span');t.className='zone-label';
  t.textContent=window.innerWidth<=780?String(slotIndex+1):`${slotIndex+1} ${slot.name}`;
  t.title=`${slotIndex+1} ${slot.name}`;
  if(window.innerWidth<=780)t.classList.add('mobile-num-label');
  const dist=window.innerWidth<=780?m.h*.52+5:m.h*.52+8;
  const angle=Number(slot.angle)||0, rad=angle*Math.PI/180;
  const dx=Math.sin(rad)*dist,dy=-Math.cos(rad)*dist;
  t.style.left=`calc(${slot.x}% + ${dx.toFixed(1)}px)`;
  t.style.top=`calc(${slot.y}% + ${dy.toFixed(1)}px)`;
  t.style.transform=`translate(-50%,-50%) rotate(${angle}deg)`;
  t.style.zIndex=settings.crossLabelLayer==='front'?'310':'2';
  return t;
}
let longPressTimer=null;
function cancelCardLongPress(){if(longPressTimer!==null){clearTimeout(longPressTimer);longPressTimer=null}}
function updateCardSelection(){const i=state.selected,valid=Number.isInteger(i)&&i>=0&&i<state.placed.length;const panel=$('cardControls');if(panel)panel.hidden=!valid;document.querySelectorAll('#zone .card').forEach(el=>el.classList.toggle('is-selected',valid&&Number(el.dataset.index)===i));if(!valid)return;const p=state.placed[i],definition=cards.find(c=>c.id===p.id);$('cardSelectionName').textContent='選択中：'+(p.faceUp&&definition?definition.name:'伏せ札');$('cardAngle').textContent=((p.angle%360)+360)%360+'°'}
function selectCard(index){state.selected=index;updateCardSelection()}
function rotateSelected(delta,reset=false){const index=state.selected;if(!Number.isInteger(index)||!state.placed[index])return;const item=state.placed[index];item.angle=TabulaCardRules.rotateAngle(item.angle,delta,reset);render();saveLocal()}
$('rotateLeft').addEventListener('click',()=>rotateSelected(-90));$('rotateFineLeft').addEventListener('click',()=>rotateSelected(-15));$('rotateZero').addEventListener('click',()=>rotateSelected(0,true));$('rotateFineRight').addEventListener('click',()=>rotateSelected(15));$('rotateRight').addEventListener('click',()=>rotateSelected(90));
$('zone').addEventListener('contextmenu',e=>e.preventDefault());
$('surface').addEventListener('contextmenu',e=>e.preventDefault());
$('zone').addEventListener('pointerdown',e=>{if(e.target===$('zone')){state.selected=null;updateCardSelection()}});
function cardHTML(item,index){const c=cards.find(c=>c.id===item.id)||cards[0];const node=document.createElement('div');node.className='card'+(item.faceUp?' faceup':'')+(item.reversed?' no-reversal-spin':'');node.dataset.index=index;const crossOpen=settings.spread==='celtic'&&item.slot===1&&item.faceUp&&!item.manualMoved;
 const move=crossOpen?celticCrossShift():0;
 node.style.left=item.x+'%';node.style.top=`calc(${item.y}% + ${move}px)`;
 node.style.setProperty('--rotation',((settings.spread==='celtic'&&item.slot===1&&item.faceUp?80:item.angle)+(item.reversed&&item.faceUp?180:0))+'deg');node.style.setProperty('--z',String(item.dragOrder?1000+item.dragOrder:index+5));node.innerHTML=`<div class="card-inner"><div class="face back"></div><div class="face front">${cardMark(c)}</div></div>`;node.addEventListener('pointerdown',e=>{if(e.button!==0||inspectionEnabled())return;const rect=$('zone').getBoundingClientRect();drag={type:'placed',idx:index,startX:e.clientX,startY:e.clientY,origX:item.x,origY:item.y+(crossOpen?celticCrossShift()*tableCamera.scale/rect.height*100:0),rect};dragMoved=false;node.setPointerCapture(e.pointerId);cancelCardLongPress();if(!spreadWorkbench)longPressTimer=setTimeout(()=>{longPressTimer=null;if(drag?.type==='placed'&&drag.idx===index&&!dragMoved){drag.longSelected=true;selectCard(index);saveLocal()}},520);
// Each grab raises the selected card to the highest persistent stack layer.
const nextOrder=Math.max(0,...state.placed.map(p=>Number(p.dragOrder)||0))+1;
item.dragOrder=nextOrder;
node.style.setProperty('--z',String(1000+nextOrder));
node.classList.add('dragging')});node.addEventListener('pointermove',e=>{if(!drag||drag.type!=='placed'||drag.idx!==index)return;const dx=(e.clientX-drag.startX)/drag.rect.width*100,dy=(e.clientY-drag.startY)/drag.rect.height*100;if(Math.abs(dx)+Math.abs(dy)>1.5)dragMoved=true;if(dragMoved){cancelCardLongPress();selectCard(index);if(!item.manualMoved&&settings.spread==='celtic'&&item.slot===1&&item.faceUp){item.manualMoved=true;}const desktop=window.innerWidth>780;item.x=Math.max(desktop?-50:0,Math.min(desktop?150:100,drag.origX+dx));item.y=Math.max(desktop?-50:0,Math.min(desktop?150:100,drag.origY+dy));node.style.left=item.x+'%';node.style.top=item.y+'%';refreshDraggedSlotLabel(item)}});node.addEventListener('pointerup',e=>{if(!drag||drag.idx!==index)return;node.classList.remove('dragging');const wasLong=!!drag.longSelected;cancelCardLongPress();drag=null;if(spreadWorkbench&&dragMoved&&spreadSnap){const z=$('zone').getBoundingClientRect();const spacing=(Number($('spreadGridSize').value)||24)*tableCamera.scale;const px=z.width*item.x/100,py=z.height*item.y/100;item.x=Math.max(0,Math.min(100,Math.round(px/spacing)*spacing/z.width*100));item.y=Math.max(0,Math.min(100,Math.round(py/spacing)*spacing/z.height*100));node.style.left=item.x+'%';node.style.top=item.y+'%';}if(spreadWorkbench&&!dragMoved){spreadChoose(index);return}if(!dragMoved&&!wasLong){item.faceUp=!item.faceUp;play('flip')}if(dragMoved||wasLong)selectCard(index);
// Keep the tapped DOM node mounted. Rebuilding it while the pointer is released
// makes mobile Safari jump to alternating scroll anchors.
node.classList.toggle('faceup',item.faceUp);
const openedCross=settings.spread==='celtic'&&item.slot===1&&item.faceUp&&!item.manualMoved;
const moveCross=openedCross?celticCrossShift():0;
node.style.top=`calc(${item.y}% + ${moveCross}px)`;
node.classList.toggle('no-reversal-spin',!!item.reversed);node.style.setProperty('--rotation',cardDisplayRotation(item)+'deg');refreshDraggedSlotLabel(item);
const cardData=cards.find(c=>c.id===item.id),position=item.slot!=null?getSlots()[item.slot]:null;
$('infoText').textContent=`${cardData.name}（${item.reversed?'逆位置':'正位置'}）${position?` — ${item.slot+1}. ${position.name}：${position.detail}`:' — 自由配置'}`;
if(!item.faceUp)$('infoText').textContent='伏せ札'+(position?' — '+position.name:'');updateLiveResults();maybeTriggerCompletionEffect();saveLocal()});node.addEventListener('pointercancel',()=>{cancelCardLongPress();node.classList.remove('dragging');drag=null});node.addEventListener('contextmenu',e=>{e.preventDefault();if(inspectionEnabled()||e.pointerType==='touch')return;item.angle=(item.angle+90)%360;render();saveLocal()});if(inspectionEnabled()){node.tabIndex=0;node.setAttribute('role','button');node.setAttribute('aria-label',item.faceUp?c.name+'を拡大する':'伏せ札');}node.addEventListener('click',()=>{if(inspectionEnabled())inspectTableCard(index,node)});node.addEventListener('keydown',e=>{if(inspectionEnabled()&&(e.key==='Enter'||e.key===' ')){e.preventDefault();inspectTableCard(index,node)}});return node}const RESULTS_VIS_KEY='tabula_sortium_results_visible';let resultsVisible=false;try{resultsVisible=localStorage.getItem(RESULTS_VIS_KEY)==='1'}catch(e){};
function syncResultsVisibility(){const panel=$('liveResults'),button=$('toggleResults');if(!panel||!button)return;panel.hidden=!resultsVisible;button.textContent=resultsVisible?'RESULTSを閉じる ▴':'RESULTSを表示 ▾';button.setAttribute('aria-expanded',String(resultsVisible))}
function updateLiveResults(){const root=$('liveResultsRows');if(!root)return;syncResultsVisibility();if(!resultsVisible)return;const spread=getSlots(),all=Array.isArray(state.placed)?state.placed:[];const entries=[];if(settings.spread!=='free'){spread.forEach((slot,i)=>entries.push({label:`${i+1}. ${slot.name}`,item:all.find(p=>p.slot===i)}));}all.filter(p=>p.slot==null||settings.spread==='free').forEach((item,i)=>entries.push({label:`${settings.spread==='free'?i+1+'. 自由配置':'補助 '+(i+1)}`,item}));root.replaceChildren();entries.forEach(({label,item})=>{const row=document.createElement('div');row.className='live-result-row';const left=document.createElement('div');left.className='live-result-pos';left.textContent=label;const right=document.createElement('div');right.className='live-result-card';if(!item){right.classList.add('unrevealed');right.textContent='未配札'}else if(!item.faceUp){right.classList.add('unrevealed');right.textContent='裏向き'}else{right.textContent=`${displayCard(cards.find(c=>c.id===item.id)||cards[0]).name}（${item.reversed?'逆位置':'正位置'}）`;}row.append(left,right);root.append(row)});$('liveResultsCount').textContent=`${all.filter(p=>p.faceUp).length} / ${all.length}枚公開`;if(!entries.length){const empty=document.createElement('div');empty.className='mini';empty.textContent='まだカードがありません。';root.append(empty)}}
$('toggleResults').addEventListener('click',()=>{resultsVisible=!resultsVisible;try{localStorage.setItem(RESULTS_VIS_KEY,resultsVisible?'1':'0')}catch(e){}updateLiveResults()});syncResultsVisibility();
const TABULA_BACK_PALETTE={green:'#0d3428',burgundy:'#651622',navy:'#11234b',purple:'#3b2458',black:'#18191a',sepia:'#55331d',ivory:'#e6d6b1'};
function syncTabulaBack(){
 const tone=Object.hasOwn(TABULA_BACK_PALETTE,settings.cardBackColor)?settings.cardBackColor:'sepia';
 settings.cardBackColor=tone;
 const field=$('cardBackColorField'),input=$('cardBackColor');
 if(field)field.hidden=settings.cardDesign!=='standard';
 if(input)input.value=tone;
 document.body.dataset.tabulaBack=settings.cardDesign==='standard'?'on':'off';
 document.body.dataset.tabulaBackTone=tone;
 document.body.style.setProperty('--tabula-back-base',TABULA_BACK_PALETTE[tone]);
}
function render(){syncTabulaBack();$('surface').classList.toggle('celtic-spread',settings.spread==='celtic');updateLiveResults();const m=metrics(),zone=$('zone');zone.innerHTML='';zone.style.setProperty('--cw',m.w+'px');zone.style.setProperty('--ch',m.h+'px');const assigned=new Set(state.placed.map(p=>p.slot).filter(s=>s!==null));getSlots().forEach((p,i)=>{if(assigned.has(i))return;const n=document.createElement('div');n.className='slot';n.style.left=p.x+'%';n.style.top=p.y+'%';n.style.setProperty('--angle',p.angle+'deg');n.innerHTML=`<span class="slot-num">${i+1}</span>`;n.addEventListener('click',()=>drawAt(i));zone.append(n)});state.placed.forEach((p,i)=>{const card=cardHTML(p,i);if(spreadWorkbench&&spreadWorkbench.chosen.includes(i))card.classList.add('spread-numbered');zone.append(card)});if(spreadWorkbench){state.placed.forEach((p,i)=>{const b=document.createElement('span');b.className='spread-edit-badge'+(spreadWorkbench.chosen.includes(i)?'':' unassigned');const k=spreadWorkbench.chosen.indexOf(i);b.textContent=k<0?'?':String(k+1);b.style.left=`calc(${p.x}% + ${m.w*.48}px)`;b.style.top=`calc(${p.y}% - ${m.h*.48}px)`;zone.append(b)})}if(settings.labels&&!spreadWorkbench){state.placed.forEach(item=>{if(item.slot==null)return;const slot=getSlots()[item.slot];if(!slot)return;zone.append(createPlacedSlotLabel(item,slot,item.slot,m))});getSlots().forEach((p,i)=>{if(assigned.has(i))return;const t=document.createElement('span');t.className='zone-label';t.textContent=window.innerWidth<=780?String(i+1):`${i+1} ${p.name}`;t.title=`${i+1} ${p.name}`;if(window.innerWidth<=780)t.classList.add('mobile-num-label');const dist=window.innerWidth<=780?m.h*.52+5:m.h*.52+8;const rad=p.angle*Math.PI/180;t.style.left=`calc(${p.x}% + ${(Math.sin(rad)*dist).toFixed(1)}px)`;t.style.top=`calc(${p.y}% - ${(Math.cos(rad)*dist).toFixed(1)}px)`;t.style.transform=`translate(-50%,-50%) rotate(${p.angle}deg)`;t.style.zIndex=(settings.crossLabelLayer==='front'?'310':'2');zone.append(t)})}updateCardSelection();const deck=$('deck');deck.classList.toggle('empty',state.deck.length===0);deck.style.setProperty('--cw',m.w+'px');deck.style.setProperty('--ch',m.h+'px');applyDeckPosition();$('surface').classList.toggle('compact-spread',settings.spread!=='celtic');$('spreadNotebook').hidden=!!spreadWorkbench;$('deckCount').textContent=`山札 ${state.deck.length}枚 / ディール ${state.placed.filter(c=>!c.auxiliaryPile).length}枚 / 別札 ${state.placed.filter(c=>c.auxiliaryPile).length}枚 / 除外 ${(state.removed||[]).length}枚`;const removedSize=(state.removed||[]).length;const removedPile=$('removedPile');removedPile.style.setProperty('--cw',m.w+'px');removedPile.style.setProperty('--ch',m.h+'px');removedPile.classList.toggle('visible',removedSize>0);$('removedPileCount').textContent=removedSize+'枚';$('removedPileCount').hidden=!settings.labels;const s=state.selected;if(s!=null&&state.placed[s]){const p=state.placed[s],c=cards.find(c=>c.id===p.id),pos=p.slot!=null?getSlots()[p.slot]:null;$('infoText').textContent=`${c.name}（${p.reversed?'逆位置':'正位置'}）${pos?` — ${p.slot+1}. ${pos.name}：${pos.detail}`:' — 自由配置'}`}else if(inspectionEnabled()){$('infoText').textContent='表向きのカードをクリックすると、完成形と説明が開きます。'}else{$('infoText').textContent='カードをクリックすると表裏が切り替わります。ドラッグで移動できます。基本の配札後も、山札から補助カードを自由に追加できます。右クリックで90°回転（PC）。'}$('altar').classList.toggle('hidden',!settings.altar);$('altar').hidden=!settings.altar;$('altar').style.display=settings.altar?'':'none';$('cloth').style.setProperty('--cloth',colors[settings.color][1]);$('clothName').textContent=colors[settings.color][0];$('swatches').querySelectorAll('button').forEach((b,i)=>b.classList.toggle('active',i===settings.color));updateCompletionAura();}function parseDealSchedule(value){
 const plan=new Map(),raw=String(value||'').trim();if(!raw)return plan;
 for(const token of raw.split(/[,，、;；\n]+/)){
  const t=token.trim();if(!t)continue;
  const m=t.match(/^(\d+)\s*[:：]\s*(\d+)$/);
  if(!m)throw Error('追加指定は「4:2, 7:1」の形式で入力してください。');
  const ordinal=Number(m[1]),count=Number(m[2]);
  if(ordinal<1||ordinal>200||count<1||count>78)throw Error('指定範囲を確認してください（配札番号1〜200、除外枚数1〜78）。');
  plan.set(ordinal,(plan.get(ordinal)||0)+count);
 }
 return plan;
}
function applyDealRemoval(){
 const ordinal=state.placed.length+1;
 let plan;try{plan=parseDealSchedule(settings.dealSkipSchedule)}catch(e){setStatus(e.message);return false}
 const count=(ordinal===1?Math.max(0,Math.trunc(Number(settings.dealSkipFirst)||0)):0)+(plan.get(ordinal)||0);
 if(!Array.isArray(state.removed))state.removed=[];
 if(!state.placed.length&&!Array.isArray(state.dealCheckpoint))state.dealCheckpoint=state.deck.map(c=>({...c}));
 if(state.deck.length<=count){setStatus(`第${ordinal}枚の配札に必要なカードが足りません。除外${count}枚に対して山札は${state.deck.length}枚です。`);return false}
 if(count){state.removed.push(...state.deck.splice(0,count));setStatus(`第${ordinal}枚の配札前に${count}枚を取り除きました（累計${state.removed.length}枚）。`)}
 return true;
}
function animateCardFromDeck(index,sourceRect){
 const zone=$('zone');
 // Locate the actual placed card by its data position rather than relying on slot counts.
 const cardsOnTable=Array.from(zone.children).filter(el=>el.classList.contains('card'));
 const card=cardsOnTable[index];if(!card||!sourceRect||!card.animate)return;
 const end=card.getBoundingClientRect();if(!end.width||!end.height)return;
 const ghost=card.cloneNode(true);ghost.style.cssText='position:fixed;pointer-events:none;margin:0;z-index:100000;left:'+end.left+'px;top:'+end.top+'px;width:'+end.width+'px;height:'+end.height+'px;transform:none;';
 document.body.append(ghost);
 card.style.visibility='hidden';
 const dx=sourceRect.left+sourceRect.width/2-(end.left+end.width/2),dy=sourceRect.top+sourceRect.height/2-(end.top+end.height/2);
 const animation=ghost.animate([{transform:'translate('+dx+'px,'+dy+'px) scale(.96)',filter:'brightness(1.08)'},{offset:.16,transform:'translate('+(dx*.85)+'px,'+(dy*.85-7)+'px) rotate(-3deg) scale(1.025)'},{transform:'translate(0px,0px) rotate(0deg) scale(1)',filter:'brightness(1)'}],{duration:320,easing:'cubic-bezier(.22,.72,.25,1)'});
 animation.finished.catch(()=>{}).then(()=>{ghost.remove();card.style.visibility=''});
}
function drawAt(slot=null,x=null,y=null){if(!state.deck.length){setStatus('山札にカードがありません。');return}const slots=getSlots();if(settings.spread!=='free'&&slot===null&&x===null&&y===null){slot=nextDealSlot();if(slot<0){setStatus('本来の展開は完了しています。山札を卓の好きな場所へドラッグすると補助カードを追加できます。');return}}if(slot!==null&&state.placed.some(p=>p.slot===slot)){setStatus('その位置にはすでにカードがあります。');return}const physical=[...state.deck,...state.placed,...(state.removed||[])];
 const seen=new Set(),duplicate=physical.find(c=>{if(seen.has(c.id))return true;seen.add(c.id);return false});
 if(duplicate){setStatus('同じカードが重複しています（'+duplicate.id+'）。新しい占いを始めるかバックアップを確認してください。');return}
 if(!applyDealRemoval())return;
 const sourceRect=$('deck').getBoundingClientRect();const next=state.deck.shift(),pos=slot!==null?slots[slot]:{x:x??50,y:y??50,angle:0};state.placed.push({...next,slot,x:pos.x,y:pos.y,angle:pos.angle,origin:{x:pos.x,y:pos.y,angle:pos.angle},faceUp:false});play('deal');render();animateCardFromDeck(state.placed.length-1,sourceRect);setStatus(`配札しました（${state.placed.length}枚）。カードをクリックして開いてください。`);saveLocal()}function dealAuto(){if(dealWorkbenchController?.executeSelected())return;if(!state.deck.length)return;if(settings.spread==='free'){drawAt(null,25+rnd(50),20+rnd(55));return}const slots=getSlots();const unfilled=getDealOrder().filter(i=>!state.placed.some(p=>p.slot===i));if(!unfilled.length){setStatus('基本の配札は完了しました。補助カードは山札をドラッグして自由な位置へ追加できます。');return}unfilled.forEach((s,i)=>setTimeout(()=>drawAt(s),i*340))}let shuffleBusy=false;
const riffleSequence=TabulaShuffle.riffleSequence;
const overhandSequence=TabulaShuffle.overhandSequence;
const pileSequence=TabulaShuffle.pileSequence;
function animateShuffle(method,done,manual=false,opts={}){let layer=$('shuffleLayer');layer.innerHTML='';layer.classList.add('active');const n=Math.min(state.deck.length,method==='wash'?44:32);const w=layer.clientWidth||500,h=layer.clientHeight||500;const originX=w*.5,originY=h*.52;const physical=metrics();const spriteW=Math.min(physical.w,w*.22),spriteH=spriteW*1.52;const sprites=[];for(let i=0;i<n;i++){let c=document.createElement('div');c.className='shuffle-card';c.style.zIndex=i;c.style.width=spriteW+'px';c.style.height=spriteH+'px';c.style.left=(originX-spriteW/2)+'px';c.style.top=(originY-spriteH/2)+'px';layer.append(c);sprites.push(c)}const seq=method==='wash'?3:method==='overhand'||method==='hindu'?3:method==='riffle'?3:2;let animations=[];sprites.forEach((c,i)=>{let spreadX,spreadY,rot;if(method==='wash'){const theta=Math.random()*Math.PI*2,rad=Math.sqrt(Math.random())*Math.min(w,h)*.35;spreadX=Math.cos(theta)*rad;spreadY=Math.sin(theta)*rad;rot=(Math.random()-.5)*340;if(opts.direction==='cw'||opts.direction==='ccw'){const sign=opts.direction==='cw'?1:-1;rot=sign*(140+Math.random()*100);}}else if(method==='riffle'){spreadX=(i%2===0?-w*.19:w*.19)+((i%6)-3)*1.4;spreadY=(i%4)*1.4;rot=i%2===0?-7:7;}else if(method==='pile'){spreadX=((i%(opts.piles||4))-((opts.piles||4)-1)/2)*Math.min(w*.13,w*.65/(opts.piles||4));spreadY=((i%3)-1)*3;rot=0;}else if(method==='hindu'){spreadX=0;spreadY=h*.14*(i%3-1)+(i%9-4)*2;rot=i%2?3:-3;}else{spreadX=w*.14*(i%3-1);spreadY=-h*.14+(i%9)*4;rot=i%2?6:-6;}const circleDir=opts.direction==='ccw'?-1:1;const swirl=method==='wash'&&(opts.direction==='cw'||opts.direction==='ccw');const midX=swirl?(-spreadY*circleDir*.88):(method==='wash'?spreadX*.65+Math.sin(i*2)*w*.16:spreadX*.6);const midY=swirl?(spreadX*circleDir*.88):(method==='wash'?spreadY*.7+Math.cos(i*1.7)*h*.13:spreadY*.65);const frames=[{transform:'translate(-50%,-50%) translate(0px,0px) rotate(0deg)'},{transform:`translate(-50%,-50%) translate(${spreadX}px,${spreadY}px) rotate(${rot}deg)`,offset:.27},{transform:`translate(-50%,-50%) translate(${midX}px,${midY}px) rotate(${method==='wash'?(opts.direction==='cw'?rot+110:opts.direction==='ccw'?rot-110:rot+110):rot*1.4}deg)`,offset:.7},{transform:'translate(-50%,-50%) translate(0px,0px) rotate(0deg)'}];const anim=c.animate(frames,{duration:manual?1000:850,delay:i*9,easing:'ease-in-out',fill:'forwards'});animations.push(anim)});Promise.all(animations.map(a=>a.finished.catch(()=>{}))).then(()=>{layer.innerHTML='';layer.classList.remove('active');done()})}
function runWashQuick(){
 if(shuffleBusy)return;
 if(state.deck.length<2){setStatus('ウォッシュには2枚以上必要です。');return}
 const direction=settings.quickWashDirection||'random';
 if(direction==='none'){setStatus('単独ウォッシュは「なし」に設定されています。');return}
 const rounds=Math.max(1,Math.min(10,Number(settings.quickWashRounds)||1));
 const labels={random:'ランダム',cw:'右回転',ccw:'左回転',alternate:'交互回転'};
 shuffleBusy=true;
 for(const id of ['quickWash','quickShuffle','shuffle','manualShuffle'])if($(id))$(id).disabled=true;
 let round=0;
 const next=()=>{
  if(round>=rounds){
   shuffleBusy=false;
   for(const id of ['quickWash','quickShuffle','shuffle','manualShuffle'])if($(id))$(id).disabled=false;updateStandaloneAvailability();
   play('shuffle');render();saveLocal();setStatus('ウォッシュ '+labels[direction]+' '+rounds+'巡を完了しました。');
   return;
  }
  const current=round++;
  const dir=direction==='alternate'?(current%2===0?'cw':'ccw'):direction;
  setStatus('ウォッシュ '+labels[dir]+' '+round+'/'+rounds+'巡…');
  animateShuffle('wash',()=>{
   state.deck=washSequence(state.deck,dir,current);
   if(settings.reversals)state.deck.forEach(c=>{if(Math.random()<.45)c.reversed=Math.random()<.5});
   next();
  },false,{direction:dir});
 };
 next();
}
function shuffleDeck(manual=false){if(shuffleBusy)return;if(!state.deck.length){setStatus('山札は空です。新しい占いを始めてください。');return}const method=settings.shuffleMethod||'hindu';if(state.deck.length<2){setStatus('シャッフルには2枚以上必要です。');return}shuffleBusy=true;$('shuffle').disabled=true;$('manualShuffle').disabled=true;setStatus(`${({wash:'ウォッシュ',overhand:'オーバーハンド',riffle:'リフル',pile:'パイル'})[method]}シャッフル中…`);animateShuffle(method,()=>{let a=state.deck.slice();if(method==='wash')randomize(a);else if(method==='overhand'||method==='hindu')a=overhandSequence(a,manual);else if(method==='riffle')a=riffleSequence(a,manual);else a=pileSequence(a,4);state.deck=a;if(settings.reversals&&method==='wash'){state.deck.forEach(c=>{if(Math.random()<.45)c.reversed=Math.random()<.5})}else if(settings.reversals&&manual&&Math.random()<.25){const portion=Math.max(1,Math.floor(state.deck.length/4)),start=rnd(Math.max(1,state.deck.length-portion+1));for(let i=start;i<start+portion;i++)state.deck[i].reversed=!state.deck[i].reversed}shuffleBusy=false;$('shuffle').disabled=false;$('manualShuffle').disabled=false;play('shuffle');render();saveLocal();setStatus(`${({wash:'ウォッシュ',overhand:'オーバーハンド',riffle:'リフル',pile:'パイル'})[method]}シャッフルを行いました。${manual?'手動の簡易操作モード。':''}`)},manual)}
const HISTORY_KEY='tabula_sortium_history_v034';
let snapshots=[];
function loadSnapshots(){snapshots=TabulaReadingHistory.read(localStorage,HISTORY_KEY)}
function storeSnapshots(){try{TabulaReadingHistory.write(localStorage,HISTORY_KEY,snapshots);return true}catch(e){setStatus('結果を保存できません。ブラウザーの保存容量を確認してください。');return false}}
const EXPORT_FORMAT='tabula-sortium';
const fileNamePart=TabulaStorage.fileNamePart;
function downloadJSON(payload,name){const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),15000)}
function exportOne(v){if(!v)return;downloadJSON({format:EXPORT_FORMAT,version:1,kind:'reading',exportedAt:new Date().toISOString(),reading:v},'TABULA_'+fileNamePart(v.name)+'.json');setStatus('占例をJSONファイルに書き出しました。')}
function exportCurrentReading(){if(!state.placed.length){setStatus('書き出すカードがありません。');return}const v={id:'shared_'+Date.now(),name:'占例 '+freshName(),time:new Date().toISOString(),settings:{...settings},placed:JSON.parse(JSON.stringify(state.placed)),slots:JSON.parse(JSON.stringify(getSlots())),deckRemaining:state.deck.length,removed:JSON.parse(JSON.stringify(state.removed||[])),dealCheckpoint:JSON.parse(JSON.stringify(state.dealCheckpoint)),deck:JSON.parse(JSON.stringify(state.deck)),customIds:[...customIds],recipeId,cardPool:settings.pool,spread:settings.spread};exportOne(v)}
function exportAllData(){downloadJSON({format:EXPORT_FORMAT,version:1,kind:'backup',exportedAt:new Date().toISOString(),workspace:{schemaVersion:STORAGE_SCHEMA_VERSION,settings,state,customIds,recipes,recipeId},snapshots:snapshots,spreadLibrary:spreadLibrary,deckLibrary:deckLibrary},'TABULA_BACKUP_'+new Date().toISOString().slice(0,10)+'.json');setStatus('全データをJSONファイルに書き出しました。')}
const validateReading=v=>TabulaStorage.validateReading(v,cards);
function readExternalFile(file){if(!file)return;if(file.size>4*1024*1024){alert('ファイルが大きすぎます（上限4MB）。');return}const reader=new FileReader();reader.onerror=()=>alert('ファイルを読み込めませんでした。');reader.onload=()=>{let data;try{data=JSON.parse(String(reader.result));}catch(e){alert('JSONファイルとして読み込めませんでした。');return}if(data?.format!==EXPORT_FORMAT||data.version!==1||!['reading','backup'].includes(data.kind)){alert('TABULA SORTIUMの対応するJSONファイルではありません。');return}if(data.kind==='reading'){const v=data.reading;if(!validateReading(v)){alert('占例の内容が不正です。');return}const imported=JSON.parse(JSON.stringify(v));imported.id='s_'+Date.now()+'_'+Math.random().toString(36).slice(2,7);imported.name=String(imported.name||'読み込んだ占例').slice(0,100);if(!confirm('占例「'+imported.name+'」を記録一覧に追加しますか？ 現在の卓は変更されません。'))return;snapshots.unshift(imported);if(!storeSnapshots()){snapshots.shift();return}setStatus('占例を記録一覧に追加しました。卓上の「記録一覧・比較」から確認・復元できます。');return}
const w=data.workspace;if(!w||(!TabulaStorage.supportsSchema(w.schemaVersion))||!w.settings||!w.state||!Array.isArray(w.state.deck)||!Array.isArray(w.state.placed)||w.state.deck.length>120||!validateReading({...w,placed:w.state.placed})||w.state.deck.some(c=>!c||!cards.some(x=>x.id===c.id))||!Array.isArray(data.snapshots)||data.snapshots.length>1000||!data.snapshots.every(validateReading)||!Array.isArray(w.recipes)||w.recipes.length>100||!Array.isArray(w.customIds)||w.customIds.some(id=>!cards.some(c=>c.id===id))||(data.deckLibrary!==undefined&&(!Array.isArray(data.deckLibrary)||data.deckLibrary.length>50||data.deckLibrary.some(d=>!TabulaDeckStore.validate(d,cards))))){alert('バックアップの内容が不正です。');return}
if(!confirm('全データを復元すると、現在の作業状態・保存記録・設定が上書きされます。よろしいですか？'))return;
const prev={settings,state,customIds,recipes,recipeId,snapshots,spreadLibrary,deckLibrary};try{const ws=JSON.parse(JSON.stringify(w));const ss=JSON.parse(JSON.stringify(data.snapshots));settings={...settings,...ws.settings};state={...ws.state,completionShown:!!ws.state.completionShown};customIds=ws.customIds;recipes=ws.recipes;recipeId=ws.recipeId;snapshots=ss;deckLibrary=Array.isArray(data.deckLibrary)?data.deckLibrary.map(d=>TabulaDeckStore.sanitize(d,cards)):[];storeDeckLibrary();if(Array.isArray(data.spreadLibrary)){spreadLibrary=data.spreadLibrary.filter(v=>v&&/^custom_/.test(v.id)&&Array.isArray(v.slots)&&v.slots.length<=52&&v.slots.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.angle))).slice(0,100);storeSpreadLibrary()}localStorage.setItem(KEY,JSON.stringify({schemaVersion:STORAGE_SCHEMA_VERSION,settings,state,customIds,recipes,recipeId}));localStorage.setItem(HISTORY_KEY,JSON.stringify(snapshots));setCardSize(validCardSize(ws.settings?.cardSize)?ws.settings.cardSize:spreadCardSize(settings.spread));sync();render();setStatus('全データを復元しました。')}catch(e){({settings,state,customIds,recipes,recipeId,snapshots,spreadLibrary,deckLibrary}=prev);refreshCustomPresets();alert('バックアップの復元に失敗しました。元の状態を維持します。')}};reader.readAsText(file)}

function freshName(){let d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`}
function captureSnapshot(name){if(!state.placed.length){setStatus('結果がありません。まずカードを配ってください。');return false}const obj=TabulaReadingHistory.createSnapshot({id:'s_'+Date.now()+'_'+Math.random().toString(36).slice(2,7),name:name||freshName(),time:new Date().toISOString(),settings,state,slots:getSlots(),customIds,recipeId});snapshots.unshift(obj);if(!storeSnapshots()){snapshots.shift();return false}setStatus('占い結果を記録しました。記録一覧から比較できます。');return true}
function saveSnapshotModal(){if(!state.placed.length){setStatus('保存する結果がありません。');return}modal('<h2>占い結果を保存</h2><p class="note">現在の配置を固定して記録します。続けて占いをしても上書きされません。</p><label class="field">記録名（省略すると日時）<input id="snapshotName" maxlength="100" placeholder="'+freshName()+'"></label><div class="row"><button type="button" id="snapCancel">キャンセル</button><button type="button" id="snapConfirm" class="primary">結果を保存</button></div>');$('snapCancel').onclick=closeModal;$('snapConfirm').onclick=()=>{if(captureSnapshot($('snapshotName').value.trim()))closeModal()}}
function saveAndAgain(){if(captureSnapshot('')){initialize();setStatus('結果を保存し、同じ設定で新しい占いを開始しました。')}}
const snapshotSummary=TabulaUiFormat.snapshotSummary;
const snapshotFace=p=>TabulaUiFormat.snapshotFace(p,cards);
function snapshotPanel(v){
 if(!v)return '<p class="note">記録を選択してください。</p>';
 const ordered=v.placed.map((p,i)=>({...p,originalIndex:i}));
 const cloth=colors[Number.isInteger(v.settings?.color)?v.settings.color:0]?.[1]||'#171719';
 const altar=v.settings?.altar?'<div class="record-altar">'+(v.settings.candles||[{x:8,y:25,color:'#d8b977',lit:true},{x:92,y:25,color:'#d8b977',lit:true}]).map((c,i)=>'<div style="position:absolute;left:'+c.x+'%;top:'+c.y+'%;width:12%;aspect-ratio:120/210;transform:translate(-50%,-94%)">'+candleArtwork(c,i)+'</div>').join('')+'</div>':'';
 const pieces=ordered.map((p,i)=>{
  const face=snapshotFace(p),cross=v.spread==='celtic'&&p.slot===1&&p.faceUp;
  const angle=(cross?80:Number(p.angle||0))+(p.reversed&&p.faceUp?180:0);
  const y=Number(p.y||0)+(cross?38/70*9:0);
  return `<div class="snapshot-card" title="${escapeHTML(face)}" style="left:${p.x}%;top:${y}%;transform:translate(-50%,-50%) rotate(${angle}deg);z-index:${i+5}"><span style="transform:rotate(${p.reversed&&p.faceUp?180:0}deg)">${p.faceUp?escapeHTML(face):'✦'}</span></div>`
 }).join('');
 const rows=ordered.map((p,i)=>{let pos=p.slot!=null?v.slots?.[p.slot]:null;return `<div class="snapshot-row"><b>${pos?`${p.slot+1}. ${escapeHTML(pos.name)}`:`補助 ${i+1}`}</b><span>${p.faceUp?escapeHTML(snapshotFace(p)):'裏向き'}${p.reversed?'（逆）':''}</span></div>`}).join('');
 return `<div class="snapshot-board" style="--record-cloth:${cloth}">${altar}${pieces}</div><div class="snapshot-details">${rows}</div>`;
}
function restoreSnapshot(v){
 if(!v)return;
 if(!confirm('記録「'+v.name+'」をメインの卓に復元しますか？ 現在の未保存の作業状態は置き換わります。'))return;
 settings={...settings,...(v.settings||{})};
 if(v.spread)settings.spread=v.spread;
 if(Array.isArray(v.customIds))customIds=[...v.customIds];
 const placed=JSON.parse(JSON.stringify(v.placed));
 let deck;
 if(Array.isArray(v.deck))deck=JSON.parse(JSON.stringify(v.deck));
 else{
  const seen=new Set(placed.map(p=>p.id));
  deck=selectedCards().filter(c=>!seen.has(c.id)).map(c=>({id:c.id,reversed:false}));
 }
 state={deck,placed,cutStage:null,selected:null,completionShown:false,dealCheckpoint:Array.isArray(v.dealCheckpoint)?structuredClone(v.dealCheckpoint):null,removed:Array.isArray(v.removed)?structuredClone(v.removed):[]};
 if(v.recipeId&&recipes.some(r=>r.id===v.recipeId))recipeId=v.recipeId;
 setCardSize(validCardSize(v.settings?.cardSize)?v.settings.cardSize:spreadCardSize(settings.spread));sync();render();saveLocal();closeModal();
 setStatus('保存記録「'+v.name+'」を復元しました。補助カードも追加できます。'+(!Array.isArray(v.deck)?'※旧記録につき山札の順序は再現できません。':''));
 window.scrollTo({top:0,behavior:'instant'});
}

function compareModal(){
 if(!snapshots.length){modal('<h2>記録一覧</h2><p>保存した占い結果はまだありません。</p>');return}
 let rows=snapshots.map(v=>`<div class="history-row"><div><b>${escapeHTML(v.name)}</b><div class="mini">${escapeHTML(snapshotSummary(v))} · ${new Date(v.time).toLocaleString('ja-JP')}</div></div><button type="button" data-export="${v.id}">書き出す</button><button type="button" data-rename="${v.id}">名称変更</button><button type="button" data-delete="${v.id}">削除</button></div>`).join('');
 let options=snapshots.map(v=>`<option value="${v.id}">${escapeHTML(v.name)}</option>`).join('');
 modal(`<h2>占い結果の記録</h2><p class="note">まず1件を大きく表示します。比較を有効にすると2件を横に並べます。</p><div class="records-toolbar"><label class="choice"><input type="checkbox" id="compareEnabled"> 2件を比較する</label><span class="mini" id="compareHint">保存した記録を単独表示中</span></div><div class="record-viewport"><div class="snapshot-compare" id="snapshotCompare"><div class="record-a"><label class="field">表示する記録<select id="compareA">${options}</select></label><div id="snapViewA"></div><div class="record-restore"><button type="button" class="primary" id="restoreA">左の結果を卓に復元</button><button type="button" id="exportA">この結果を書き出す</button></div></div><div class="record-b"><label class="field">比較する記録<select id="compareB">${options}</select></label><div id="snapViewB"></div><div class="record-restore"><button type="button" class="primary" id="restoreB">右の結果を卓に復元</button></div></div></div></div><h3>保存済みの記録（${snapshots.length}件）</h3><div>${rows}</div>`);
 $('modalBg').classList.add('records-active');
 $('compareB').selectedIndex=Math.min(1,snapshots.length-1);
 const repaint=()=>{
  let a=snapshots.find(s=>s.id===$('compareA').value),b=snapshots.find(s=>s.id===$('compareB').value);
  let comparing=$('compareEnabled').checked;
  $('snapshotCompare').classList.toggle('is-comparing',comparing);
  $('compareHint').textContent=comparing?'左・右の復元ボタンで対象を選べます':'保存した記録を単独表示中';$('restoreA').textContent=comparing?'左の結果を卓に復元':'この結果を卓に復元';
  $('snapViewA').innerHTML=snapshotPanel(a);
  $('snapViewB').innerHTML=comparing?snapshotPanel(b):'';
 };
 $('exportA').onclick=()=>exportOne(snapshots.find(v=>v.id===$('compareA').value));$('restoreA').onclick=()=>restoreSnapshot(snapshots.find(v=>v.id===$('compareA').value));$('restoreB').onclick=()=>restoreSnapshot(snapshots.find(v=>v.id===$('compareB').value));$('compareA').onchange=repaint;$('compareB').onchange=repaint;$('compareEnabled').onchange=repaint;repaint();
 document.querySelectorAll('[data-export]').forEach(b=>b.onclick=()=>exportOne(snapshots.find(x=>x.id===b.dataset.export)));document.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>{if(!confirm('この結果を削除しますか？'))return;snapshots=snapshots.filter(x=>x.id!==b.dataset.delete);storeSnapshots();compareModal()});
 document.querySelectorAll('[data-rename]').forEach(b=>b.onclick=()=>{let v=snapshots.find(x=>x.id===b.dataset.rename);if(!v)return;const name=prompt('記録の名前',v.name);if(name===null)return;v.name=name.trim()||v.name;storeSnapshots();compareModal()});
}
function resetSettingsAction(){if(!confirm('クロスや操作の設定を初期値に戻しますか？ 記録と登録したシャッフル手順は残ります。'))return;settings={cutCount:3,shuffleMethod:'overhand',pool:'all',cardDesign:'standard',spread:'celtic',color:0,altar:false,labels:true,crossLabelLayer:'behind',sound:false,reversals:true,visualTheme:'classic',effectPreset:'ritual',initialOrder:'random',quickWashDirection:'random',quickWashRounds:1};recipeId='single';labelMode='card';localStorage.setItem('tabula_label_mode','card');$('tableLabelMode').value='card';resetLabelCyclePreferences();setCardSize(spreadCardSize(settings.spread));sync();render();saveLocal();setStatus('設定だけを初期化しました。現在の配札と記録は残っています。')}
function resetEverythingAction(){if(!confirm('現在の卓、保存結果、登録したシャッフル手順をすべて削除します。続けますか？'))return;if(!confirm('この操作は取り消せません。本当にすべて初期化しますか？'))return;localStorage.removeItem(KEY);localStorage.removeItem(HISTORY_KEY);localStorage.removeItem(SPREAD_LIBRARY_KEY);localStorage.removeItem(TabulaDeckStore.KEY);deckLibrary=[];settings.deckId='builtin';spreadLibrary=[];refreshCustomPresets();snapshots=[];document.querySelectorAll('aside .section').forEach((_,i)=>localStorage.removeItem('tabula_sortium_section_'+i));recipes=[{id:'single',name:'単独シャッフル',steps:[{method:'overhand',reps:1,groups:1}]}];recipeId='single';settings={cutCount:3,shuffleMethod:'overhand',pool:'all',cardDesign:'standard',spread:'celtic',color:0,altar:false,labels:true,crossLabelLayer:'behind',sound:false,reversals:true,visualTheme:'classic',effectPreset:'ritual',initialOrder:'random',quickWashDirection:'random',quickWashRounds:1,dealSkipFirst:0,dealSkipSchedule:''};customIds=cards.map(c=>c.id);state={deck:[],placed:[],cutStage:null,selected:null,completionShown:false,dealCheckpoint:null,removed:[]};labelMode='card';localStorage.setItem('tabula_label_mode','card');$('tableLabelMode').value='card';resetLabelCyclePreferences();setCardSize(spreadCardSize(settings.spread));sync();initialize();setStatus('全データを初期化しました。')}
function modal(html){$('modalBg').classList.remove('records-active','card-viewer-active');$('modalContent').innerHTML=html;$('modalBg').classList.add('open')}function cutModal(quick=false){
 if(Number(settings.cutCount)===0){setStatus('カットは「なし」に設定されています。');return}
 if(state.deck.length<2){setStatus('カットには2枚以上必要です。');return}
 if(document.getElementById('physicalCutOverlay'))return;
 const count=Math.max(2,Math.min(Number(settings.cutCount)||3,8,state.deck.length));
 const lengths=TabulaShuffle.cutLengths(state.deck.length,count),sequence=[];
 const surface=$('surface'),overlay=document.createElement('div');
 overlay.id='physicalCutOverlay';
 overlay.style.cssText='position:absolute;inset:0;z-index:850;pointer-events:none;overflow:hidden;';
 surface.append(overlay);
 const m=metrics(),width=surface.clientWidth,height=surface.clientHeight;
 const cardW=Math.min(m.w,Math.max(30,(width-28)/(count+1.4))),cardH=cardW*1.52;
 const center={x:width*.5-cardW*.5,y:height*.64-cardH*.5};
 const span=Math.min(width*.77,cardW*(count-1)*1.32);
 const positions=lengths.map((_,i)=>({x:width*.5-cardW*.5+(i-(count-1)/2)*(span/Math.max(1,count-1)),y:height*.50-cardH*.5}));
 const piles=[];
 function makeStack(i){
  const el=document.createElement('button');el.type='button';el.setAttribute('aria-label','束 '+String.fromCharCode(65+i)+'、'+lengths[i]+'枚');
  el.style.cssText='position:absolute;pointer-events:auto;cursor:pointer;border:0;background:transparent;padding:0;width:'+cardW+'px;height:'+(cardH+12)+'px;left:'+positions[i].x+'px;top:'+positions[i].y+'px;touch-action:manipulation;';
  for(let j=0;j<Math.min(5,lengths[i]);j++){
   const card=document.createElement('span');card.className='face back';
   card.style.cssText='position:absolute;display:block;box-sizing:border-box;width:'+cardW+'px;height:'+cardH+'px;left:0;top:'+(8-j*2)+'px;border-radius:4px;box-shadow:1px 2px 3px #0009;';
   el.append(card);
  }
  const label=document.createElement('span');label.textContent=String.fromCharCode(65+i);
  label.style.cssText='position:absolute;left:0;right:0;top:'+(cardH+14)+'px;color:#ead6aa;text-align:center;font:12px sans-serif;text-shadow:0 1px 3px #000;';
  el.append(label);overlay.append(el);piles.push(el);
  el.onclick=()=>choose(i);
 }
 lengths.forEach((_,i)=>makeStack(i));
 const note=document.createElement('div');note.textContent='積み直す順に束を選ぶ';
 note.style.cssText='position:absolute;left:0;right:0;top:12%;text-align:center;color:#ead6aa;font:13px sans-serif;text-shadow:0 1px 4px #000;pointer-events:none;';
 overlay.append(note);
 let busy=false;
 async function choose(i){
  if(busy||sequence.includes(i))return;
  const el=piles[i];
  sequence.push(i);
  // Selection is silent and stationary: only the chosen pile becomes subdued.
  el.disabled=true;
  el.style.pointerEvents='none';
  el.style.filter='brightness(.38) saturate(.55)';
  el.style.transition='filter 200ms ease';
  note.textContent=sequence.map(n=>String.fromCharCode(65+n)).join(' → ');
  if(sequence.length!==count)return;
  busy=true;
  note.textContent='カットを完成しています…';
  await new Promise(resolve=>setTimeout(resolve,280));
  // All piles converge together. Their final stacking depth follows the chosen order:
  // the first selected pile is uppermost, the last selected pile is lowest.
  const animations=sequence.map((pileIndex,order)=>{
   const node=piles[pileIndex],from=positions[pileIndex];
   const dx=center.x-from.x+order*2,dy=center.y-from.y+order*4;
   node.style.zIndex=String(100+count-order);
   const animation=node.animate([
    {transform:'translate(0px,0px) scale(1)',filter:'brightness(.38) saturate(.55)'},
    {offset:.24,transform:'translate(0px,-9px) scale(1.015)',filter:'brightness(.72) saturate(.85)'},
    {transform:'translate('+dx+'px,'+dy+'px) scale(1)',filter:'brightness(1) saturate(1)'}
   ],{duration:720,delay:order*55,easing:'cubic-bezier(.24,.65,.25,1)',fill:'forwards'});
   return {node,dx,dy,animation};
  });
  await Promise.all(animations.map(({animation})=>animation.finished.catch(()=>{})));
  // Clear the persistent dimming on the actual pile elements, not just on
  // the animation keyframes, so the finished stack visibly brightens.
  // A fill-forwards animation overrides inline filter, so cancel it after
  // transferring the final transform. Then the complete stack is truly bright.
  animations.forEach(({node,dx,dy,animation})=>{
   node.style.transform='translate('+dx+'px,'+dy+'px) scale(1)';
   node.style.filter='brightness(1) saturate(1)';
   node.style.transition='none';
   animation.cancel();
  });
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  await new Promise(resolve=>setTimeout(resolve,600));
  state.deck=TabulaShuffle.restack(state.deck,lengths,sequence);
  overlay.remove();render();saveLocal();play('shuffle');
  setStatus(count+'分割カット：'+sequence.map(n=>String.fromCharCode(65+n)).join(' → ')+' の順に積み直しました。');
 }
}
function closeModal(){$('modalBg').classList.remove('open','records-active','card-viewer-active');if(tableDetailFocus){const origin=tableDetailFocus;tableDetailFocus=null;if(origin.isConnected)origin.focus();else $('inspectCards')?.focus();}}function saveLocal(){try{settings.cardSize=zoom;const persistedState=spreadWorkbench?.savedSession||state;localStorage.setItem(KEY,JSON.stringify({schemaVersion:STORAGE_SCHEMA_VERSION,settings,state:persistedState,customIds,recipes,recipeId}))}catch(e){setStatus('この環境ではブラウザー保存を利用できません。')}}function restoreLocal(){try{const raw=localStorage.getItem(KEY);if(!raw){setStatus('保存された状態はありません。');return}const data=JSON.parse(raw);if(!TabulaStorage.supportsSchema(data.schemaVersion))throw Error('Unsupported workspace schema version');settings={...settings,...(data.settings||{})};settings.dealSkipFirst=0;settings.dealSkipSchedule='';settings.spreadDealOrders={};state={completionShown:false,...(data.state||{})};customIds=data.customIds||customIds;if(Array.isArray(data.recipes)&&data.recipes.length){recipes=[recipes[0],...data.recipes.filter(r=>r.id!=='single'&&Array.isArray(r.steps))];const single=data.recipes.find(r=>r.id==='single');if(single&&Array.isArray(single.steps)&&single.steps.length)recipes[0]={...single,name:'単独シャッフル'};}recipeId=recipes.some(r=>r.id===data.recipeId)?data.recipeId:'single';setCardSize(state.placed.length?(validCardSize(data.settings?.cardSize)?data.settings.cardSize:zoom):spreadCardSize(settings.spread));syncRecipes();sync();render();setStatus('保存した卓を復元しました。')}catch(e){setStatus('保存データの復元に失敗しました。')}}function updateDealRuleSummary(){const n=Number(settings.dealSkipFirst)||0,s=(settings.dealSkipSchedule||'').trim(),el=$('dealRuleSummary');if(!el)return;el.textContent=(n||s)?[n?`最初に${n}枚`:null,s?'途中除外あり':null].filter(Boolean).join(' / '):'設定なし'}
function updateStandaloneAvailability(){const noWash=settings.quickWashDirection==='none',noCut=Number(settings.cutCount)===0;const w=$('quickWash'),c=$('quickCut');if(w){w.disabled=noWash;w.title=noWash?'単独ウォッシュは「なし」に設定されています':'単独ウォッシュを実行'}if(c){c.disabled=noCut;c.title=noCut?'カットは「なし」に設定されています':'山札をカット'}}function sync(){if(activeDeck())settings.cardDesign=activeDeck().faceStyle||'standard';else if(settings.deckId==='simple')settings.cardDesign='simple';refreshDeckPicker();$('cardLanguage').value=effectiveCardLanguage();$('tableCardLanguage').value=settings.tableCardLanguage||'linked';$('pipBackground').value=effectivePipBackground();if(['cups','swords','wands','pentacles'].includes(settings.pool)){customIds=cards.filter(c=>c.suit===settings.pool).map(c=>c.id);settings.pool='custom'}$('cardDesign').value=settings.cardDesign==='standard'?'standard':'simple';$('pool').value=settings.pool;$('spread').value=settings.spread;syncSpreadShortcut();syncDealOrderField();$('initialOrder').value=settings.initialOrder||'random';$('quickWashDirection').value=settings.quickWashDirection||'random';$('quickWashRounds').value=settings.quickWashRounds||1;updateStandaloneAvailability();$('dealSkipFirst').value=Number(settings.dealSkipFirst)||0;$('dealSkipSchedule').value=settings.dealSkipSchedule||'';$('cutCountSetting').value=String(settings.cutCount??3);$('reversals').checked=settings.reversals;$('altarToggle').checked=settings.altar;$('quickLabels').textContent=settings.labels?'ポジション名 ON':'ポジション名 OFF';$('quickLabels').setAttribute('aria-pressed',String(settings.labels));$('crossLabelLayer').value=settings.crossLabelLayer==='front'?'front':'behind';$('soundToggle').checked=settings.sound;$('shuffleMethod').value=settings.shuffleMethod||'overhand';$('visualTheme').value=settings.visualTheme||'classic';$('effectPreset').value=settings.effectPreset||'ritual';applyVisuals();syncRecipes();updateDealRuleSummary();updateStandaloneAvailability()}function applyVisuals(){document.body.dataset.visualTheme=settings.visualTheme||'classic';document.body.dataset.effectPreset=settings.effectPreset||'ritual';const desc={silent:'静かな反転。完成時の追加演出なし。',ritual:'暖かな金色の光。カードが厳かに反転される。',mystic:'青白い光輪。完成後も神秘的な発光を維持。',psychic:'紫の霊光。完成後もカードが明滅し続ける。'};if($('effectDescription'))$('effectDescription').textContent=desc[settings.effectPreset]||desc.ritual;updateCompletionAura()}let __effectTimer=null;function previewVisualEffect(finale=false){const stage=$('stage');stage.classList.remove('effect-demo','effect-finale');void stage.offsetWidth;stage.classList.add(finale?'effect-finale':'effect-demo');clearTimeout(__effectTimer);__effectTimer=setTimeout(()=>stage.classList.remove('effect-demo','effect-finale'),finale?3800:1900)}function coreTargetCount(){if(settings.spread==='free')return state.placed.length;return getSlots().length}function coreFaceUpCount(){if(settings.spread==='free')return state.placed.filter(p=>p.faceUp).length;return state.placed.filter(p=>p.slot!=null&&p.faceUp).length}function isCoreSpreadOpen(){const target=coreTargetCount();return target>0&&coreFaceUpCount()>=target}function updateCompletionAura(){const stage=$('stage');if(!stage)return;stage.classList.remove('spread-complete-ritual','spread-complete-mystic','spread-complete-psychic');if(!isCoreSpreadOpen())return;const preset=settings.effectPreset;if(preset==='ritual')stage.classList.add('spread-complete-ritual');else if(preset==='mystic')stage.classList.add('spread-complete-mystic');else if(preset==='psychic')stage.classList.add('spread-complete-psychic')}function maybeTriggerCompletionEffect(force=false){if(isCoreSpreadOpen()){updateCompletionAura();if(force||!state.completionShown){state.completionShown=true;if(settings.effectPreset!=='silent')previewVisualEffect(true)}}else{state.completionShown=false;updateCompletionAura()}}

function activateDeck(id,ask=true){
 const deck=deckLibrary.find(d=>d.id===id)||null;
 if(ask&&(state.placed.length||(state.removed||[]).length)&&!confirm('デッキを変更すると、現在の配札を片付けて新しい山札を作ります。続けますか？')){refreshDeckPicker();return false}
 settings.deckId=deck?.id||(id==='simple'?'simple':'builtin');
 settings.pool='all';
 customIds=cards.map(c=>c.id);
 settings.cardDesign=deck?.faceStyle||(id==='simple'?'simple':'standard');
 if(deck)settings.cardBackColor=deck.backColor;
 finishedCache.clear();
 sync();initialize();
 setStatus((deck?.name||(id==='simple'?'シンプル':'TABULA TAROT（標準）'))+' を読み込みました。');
 return true;
}
function openDeckEditor(createCopy=false){
 const existing=createCopy?null:activeDeck();
 const source=activeDeck();
 const draft=existing?structuredClone(existing):source?structuredClone(source):TabulaDeckStore.fresh(cards,'deck_temp','新しいデッキ');
 if(!existing){
  draft.id='deck_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8);
  draft.name=source?source.name+'（複製）':'新しいデッキ';
  if(!source){draft.language=effectiveCardLanguage();draft.pipBackground=effectivePipBackground();draft.backColor=settings.cardBackColor||'sepia';draft.faceStyle=settings.cardDesign==='simple'?'simple':'standard'}
 }
 const colorNames={sepia:'Sepia',green:'Green',burgundy:'Burgundy',navy:'Navy',purple:'Purple',black:'Black',ivory:'Ivory'};
 const groups=[['major','大アルカナ'],...suitDefs.map(([id,name])=>[id,name])];
 let html='<h2>デッキの編集</h2><p class="note">原版のカード画像はそのままに、番号・名称・背景・収録カードを編集します。番号の変更は相手のカードと自動交換されます。</p>';
 html+='<label class="field">デッキ名<input id="deckEditorName" maxlength="80" value="'+escapeHTML(draft.name)+'"></label>';
 html+='<label class="field">表面デザイン<select id="deckEditorFaceStyle"><option value="standard">TABULA TAROT</option><option value="simple">シンプル</option></select></label>';
 html+='<label class="field">カード名の言語<select id="deckEditorLanguage">'+TabulaDeckStore.LANGUAGES.map(([id,name])=>'<option value="'+id+'">'+name+'</option>').join('')+'</select></label>';
 html+='<div class="row deck-editor-shortcuts"><button type="button" id="deckEditorSwap">力 VIII ↔ 正義 XI</button><button type="button" id="deckEditorUnnumbered">愚者を番号なしに</button></div>';
 html+='<label class="field">小アルカナ数札の図像<select id="deckEditorPip"><option value="landscape">背景あり（風景とスート）</option><option value="none">背景なし（スートを全面に大きく配置）</option></select></label>';
 html+='<label class="field">裏面色<select id="deckEditorBack">'+TabulaDeckStore.COLORS.map(color=>'<option value="'+color+'">'+colorNames[color]+'</option>').join('')+'</select></label>';
 html+='<p class="note">使用するカードをチェックし、必要な番号と名前を変更してください。</p>';
 for(const [group,label] of groups){
  const items=cards.filter(c=>group==='major'?c.group==='major':c.suit===group);
  html+='<details class="deck-editor-group" '+(group==='major'?'open':'')+'><summary>'+label+'（'+items.length+'枚）</summary><div class="deck-editor-rows">';
  for(const c of items){
   const rank=c.group==='major'?(Object.hasOwn(draft.majorNumbers,c.id)?draft.majorNumbers[c.id]:c.number):c.number;
   const number=c.group==='major'?'<select class="deck-major-number" data-major="'+c.id+'" aria-label="'+escapeHTML(c.name)+'の番号">'+'<option value="none" '+(rank===null?'selected':'')+'>番号なし</option>'+Array.from({length:22},(_,n)=>'<option value="'+n+'" '+(n===rank?'selected':'')+'>'+n+'</option>').join('')+'</select>':'<span class="deck-editor-rank">'+(c.number<=10?c.number:['P','N','Q','K'][c.number-11])+'</span>';
   html+='<div class="deck-editor-row"><label title="採用する"><input type="checkbox" class="deck-editor-include" value="'+c.id+'" '+(draft.included.includes(c.id)?'checked':'')+'></label>'+number+'<input class="deck-editor-card-name" data-name="'+c.id+'" maxlength="90" aria-label="'+escapeHTML(c.name)+'の表示名" value="'+escapeHTML(draft.names[c.id]||TabulaDeckStore.translatedName(c,draft.language||'original'))+'"></div>';
  }
  html+='</div></details>';
 }
 html+='<div class="row deck-editor-footer"><button type="button" id="deckEditorCancel">キャンセル</button>'+(existing?'<button type="button" id="deckEditorDelete">このデッキを削除</button>':'')+'<button type="button" class="primary" id="deckEditorSave">デッキを保存</button></div>';
 modal(html);
 $('deckEditorFaceStyle').value=draft.faceStyle||'standard';
 $('deckEditorLanguage').value=draft.language||'original';
 $('deckEditorPip').value=draft.pipBackground;
 $('deckEditorBack').value=draft.backColor;
 $('deckEditorCancel').onclick=closeModal;
 function refreshNumbers(){document.querySelectorAll('.deck-major-number').forEach(el=>{const card=cards.find(c=>c.id===el.dataset.major);el.value=String((Object.hasOwn(draft.majorNumbers,card.id)?draft.majorNumbers[card.id]:card.number)??'none')});const fool=Object.hasOwn(draft.majorNumbers,'major_00')?draft.majorNumbers.major_00:0;$('deckEditorUnnumbered').textContent=fool===null?'愚者を0番に':'愚者を番号なしに'}
 document.querySelectorAll('.deck-major-number').forEach(el=>{el.onchange=()=>{
  if(!TabulaDeckStore.swapNumber(draft,cards,el.dataset.major,el.value==='none'?null:Number(el.value)))return;
  refreshNumbers();
 }});
 refreshNumbers();
 $('deckEditorSwap').onclick=()=>{
  const force=cards.find(c=>c.id==='major_08');
  const value=Object.hasOwn(draft.majorNumbers,force.id)?draft.majorNumbers[force.id]:force.number;
  TabulaDeckStore.swapNumber(draft,cards,force.id,value===8?11:8);refreshNumbers();
 };
 $('deckEditorUnnumbered').onclick=()=>{const number=Object.hasOwn(draft.majorNumbers,'major_00')?draft.majorNumbers.major_00:0;TabulaDeckStore.swapNumber(draft,cards,'major_00',number===null?0:null);refreshNumbers()};
 $('deckEditorLanguage').onchange=e=>{
  const previous=draft.language||'original',next=e.target.value;
  document.querySelectorAll('.deck-editor-card-name').forEach(el=>{
   const c=cards.find(c=>c.id===el.dataset.name),prev=TabulaDeckStore.translatedName(c,previous);
   if(el.value===prev||el.value===draft.names[c.id])el.value=TabulaDeckStore.translatedName(c,next);
  });
  draft.language=next;
 };
 $('deckEditorSave').onclick=()=>{
  draft.name=$('deckEditorName').value.trim();
  draft.faceStyle=$('deckEditorFaceStyle').value;
  draft.language=$('deckEditorLanguage').value;
  draft.pipBackground=$('deckEditorPip').value;
  draft.backColor=$('deckEditorBack').value;
  draft.included=[...document.querySelectorAll('.deck-editor-include:checked')].map(el=>el.value);
  draft.names={};
  document.querySelectorAll('.deck-editor-card-name').forEach(el=>{
   const value=el.value.trim(),original=cards.find(c=>c.id===el.dataset.name);
   if(value&&value!==TabulaDeckStore.translatedName(original,draft.language))draft.names[el.dataset.name]=value;
  });
  if(!TabulaDeckStore.validate(draft,cards)){alert('デッキの設定が不正です。名前・番号・採用カードを確認してください。');return}
  if((state.placed.length||(state.removed||[]).length)&&!confirm('デッキを保存して使い始めると、現在の配札は片付けられます。続けますか？'))return;
  const updated=deckLibrary.map(d=>d.id===draft.id?structuredClone(draft):d);
  if(!updated.some(d=>d.id===draft.id))updated.push(structuredClone(draft));
  if(updated.length>50){alert('保存できるデッキは50件までです。');return}
  const previous=deckLibrary;deckLibrary=updated;
  if(!storeDeckLibrary()){deckLibrary=previous;return}
  closeModal();activateDeck(draft.id,false);setStatus('デッキ「'+draft.name+'」を保存しました。');
 };
 if(existing)$('deckEditorDelete').onclick=()=>{
  if(!confirm('デッキ「'+existing.name+'」を削除しますか？'))return;
  const next=deckLibrary.filter(d=>d.id!==existing.id),old=deckLibrary;deckLibrary=next;
  if(!storeDeckLibrary()){deckLibrary=old;return}
  closeModal();activateDeck('builtin',false);setStatus('保存デッキを削除しました。');
 };
}
$('cardLanguage').addEventListener('change',e=>{
 const language=e.target.value,d=activeDeck();
 if(d){
  // Old one-off language conversions are ordinary name overrides: discard only
  // values that exactly match a preset, retaining genuinely custom names.
  for(const [id,name] of Object.entries(d.names||{})){
   const original=cards.find(c=>c.id===id);
   if(original&&TabulaDeckStore.LANGUAGES.some(([code])=>TabulaDeckStore.translatedName(original,code)===name))delete d.names[id];
  }
  d.language=language;if(!storeDeckLibrary())return
 }else settings.cardLanguage=language;
 finishedCache.clear();render();if(GALLERY.visible)galleryRender();saveLocal();
 setStatus('カード名の言語を変更しました。');
});
$('tableCardLanguage').addEventListener('change',e=>{settings.tableCardLanguage=e.target.value;refreshTableLabels();saveLocal();setStatus('卓上カード名ラベルの言語を変更しました。')});
$('pipBackground').addEventListener('change',e=>{
 const pip=e.target.value,d=activeDeck();
 if(d){d.pipBackground=pip;if(!storeDeckLibrary())return}
 else settings.pipBackground=pip;
 finishedCache.clear();render();if(GALLERY.visible)galleryRender();saveLocal();
 setStatus('小アルカナの図像を切り替えました。');
});
$('deckLibrarySelect').addEventListener('change',e=>activateDeck(e.target.value));
$('deckEditNew').addEventListener('click',()=>openDeckEditor(true));
$('deckEditCurrent').addEventListener('click',()=>openDeckEditor(false));
function customModal(){const groups=[['major','大アルカナ'],...suitDefs.map(s=>[s[0],s[1]])];let h='<h2>使用カードを個別に選択</h2><p class="note">チェックしたカードだけを山札として使用します。</p><div class="row"><button type="button" id="allCards">すべて選択</button><button type="button" id="noCards">すべて解除</button></div>';groups.forEach(([id,name])=>{h+=`<h3>${name}</h3><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:7px">`;cards.filter(c=>id==='major'?c.group==='major':c.suit===id).forEach(c=>{h+=`<label class="choice"><input type="checkbox" class="pick-card" value="${c.id}" ${customIds.includes(c.id)?'checked':''}>${c.name}</label>`});h+='</div>'});h+='<p><button type="button" class="primary" id="confirmCards">このカード群を使用</button></p>';modal(h);$('allCards').onclick=()=>document.querySelectorAll('.pick-card').forEach(e=>e.checked=true);$('noCards').onclick=()=>document.querySelectorAll('.pick-card').forEach(e=>e.checked=false);$('confirmCards').onclick=()=>{const ids=[...document.querySelectorAll('.pick-card:checked')].map(el=>el.value);if(!ids.length){alert('カードを1枚以上選択してください。');return}customIds=ids;settings.pool='custom';$('pool').value='custom';closeModal();initialize()}}$('visualTheme').onchange=e=>{settings.visualTheme=e.target.value;applyVisuals();saveLocal()};$('effectPreset').onchange=e=>{settings.effectPreset=e.target.value;applyVisuals();saveLocal();previewVisualEffect(true)};$('previewEffect').onclick=()=>previewVisualEffect(true);colors.forEach(([name,color],i)=>{const b=document.createElement('button');b.className='swatch';b.style.background=color;b.title=name;b.setAttribute('aria-label',name);b.onclick=()=>{settings.color=i;render();saveLocal()};$('swatches').append(b)});$('pool').onchange=e=>{if(e.target.value==='custom'){customModal();return}settings.pool=e.target.value;initialize()};$('captureSpread').onclick=spreadCapture;$('editCustomSpread').onclick=editCurrentSpread;$('spread').onchange=e=>{const newSpread=e.target.value;if(newSpread===settings.spread){syncSpreadShortcut();return;}if(state.placed.length||(state.removed||[]).length)restoreDealWithoutPrompt();settings.spread=newSpread;syncSpreadShortcut();applySpreadCardSize(newSpread);syncDealOrderField();render();saveLocal();setStatus('展開法を切り替えました。山札の配列は維持しています。')};$('spreadDealOrder').addEventListener('change',e=>{try{const order=parseDealOrderInput(e.target.value);settings.spreadDealOrders={...(settings.spreadDealOrders||{}),[settings.spread]:order};syncDealOrderField();saveLocal();setStatus('配札順を保存しました。次にカードを配る際に適用されます。')}catch(err){setStatus(err.message);syncDealOrderField();alert(err.message)}});
$('resetSpreadDealOrder').onclick=()=>{settings.spreadDealOrders={...(settings.spreadDealOrders||{})};delete settings.spreadDealOrders[settings.spread];syncDealOrderField();saveLocal();setStatus('このスプレッドの配札順を番号順に戻しました。')};
$('reversals').onchange=e=>{settings.reversals=e.target.checked;initialize()};$('altarToggle').onchange=e=>{settings.altar=e.target.checked;render();saveLocal()};$('quickLabels').onclick=()=>{settings.labels=!settings.labels;sync();render();saveLocal()};$('initialOrder').onchange=e=>{settings.initialOrder=e.target.value;saveLocal();setStatus('次に新しい占いを始める際のデッキ初期状態を設定しました。')};$('cutCountSetting').onchange=e=>{settings.cutCount=Number(e.target.value);updateStandaloneAvailability();saveLocal()};$('dealSkipFirst').onchange=e=>{const n=Math.max(0,Math.min(77,Math.trunc(Number(e.target.value)||0)));settings.dealSkipFirst=n;e.target.value=n;updateDealRuleSummary();saveLocal();setStatus('配札前の除外枚数を設定しました。')};$('dealSkipSchedule').onchange=e=>{try{parseDealSchedule(e.target.value);settings.dealSkipSchedule=e.target.value.trim();$('dealRuleStatus').textContent='除外タイミングを保存しました。';updateDealRuleSummary();saveLocal()}catch(err){$('dealRuleStatus').textContent=err.message;e.target.value=settings.dealSkipSchedule||''}};$('quickWashDirection').onchange=e=>{settings.quickWashDirection=e.target.value;updateStandaloneAvailability();saveLocal()};$('quickWashRounds').onchange=e=>{settings.quickWashRounds=Math.max(1,Math.min(10,Number(e.target.value)||1));e.target.value=settings.quickWashRounds;saveLocal()};$('crossLabelLayer').onchange=e=>{settings.crossLabelLayer=e.target.value;render();saveLocal()};$('soundToggle').onchange=e=>{settings.sound=e.target.checked;saveLocal()};$('shuffleMethod').onchange=e=>{settings.shuffleMethod=e.target.value;recipes.find(r=>r.id==='single').steps[0].method=e.target.value;recipeId='single';syncRecipes();saveLocal();setStatus('シャッフル方式を変更しました。')};$('newSessionStandalone').onclick=initialize;$('quickWash').onclick=()=>runWashQuick();const quickShuffleChoice=document.createElement('select');quickShuffleChoice.id='quickShuffleChoice';quickShuffleChoice.setAttribute('aria-label','卓上のシャッフル手順を選択');quickShuffleChoice.title='シャッフル手順を選択';const shuffleButton=$('quickShuffle');const shuffleGroup=document.createElement('div');shuffleGroup.className='quick-action-choice';shuffleButton.before(shuffleGroup);shuffleGroup.append(shuffleButton,quickShuffleChoice);quickShuffleChoice.onchange=()=>{const value=quickShuffleChoice.value;if(value==='__edit__'){syncRecipes();recipeEditor();return}if(value.startsWith('method:')){const method=value.slice(7);settings.shuffleMethod=method;const single=recipes.find(r=>r.id==='single');if(single){if(!single.steps.length)single.steps=[shuffleStepDefaults(method)];else single.steps[0].method=method}recipeId='single';$('shuffleMethod').value=method}else if(value.startsWith('recipe:')){recipeId=value.slice(7)}$('shuffleRecipe').value=recipeId;syncRecipes();saveLocal();setStatus('シャッフル手順を切り替えました。')};syncRecipes();$('quickShuffle').onclick=()=>runRecipe(false);$('quickCut').onclick=()=>cutModal(true);$('quickDeal').onclick=dealAuto;let openingBusy=false;
function openSequentially(){if(openingBusy)return;const closed=state.placed.filter(p=>!p.faceUp&&!p.auxiliaryPile).sort((a,b)=>(a.slot??999)-(b.slot??999));if(!closed.length){setStatus('開ける伏せ札がありません。カードをタップすると個別に表裏を切り替えられます。');return}openingBusy=true;$('quickOpen').disabled=true;$('quickRevealAll').disabled=true;const pace={silent:330,ritual:760,mystic:470,psychic:430}[settings.effectPreset]||500;let index=0;function step(){if(index>=closed.length){openingBusy=false;$('quickOpen').disabled=false;$('quickRevealAll').disabled=false;render();maybeTriggerCompletionEffect();saveLocal();setStatus(closed.length+'枚を順番に開きました。');return}closed[index].faceUp=true;index++;play('flip');render();saveLocal();setStatus(`オープン中：${index} / ${closed.length}枚`);setTimeout(step,pace)}step()}
function restoreDealWithoutPrompt(){if(!state.placed.length&&!(state.removed||[]).length)return false;if(Array.isArray(state.dealCheckpoint)){state.deck=state.dealCheckpoint.map(c=>({...c}));}else{state.deck=[...(state.removed||[]),...state.placed.map(p=>({id:p.id,reversed:p.reversed})),...state.deck];}state.placed=[];state.selected=null;state.completionShown=false;state.dealCheckpoint=null;state.removed=[];render();saveLocal();return true}
function collectForNextReading(){if(!state.placed.length&&!(state.removed||[]).length){setStatus('回収するカードがありません。');return}const returned=state.placed.map(p=>({id:p.id,reversed:p.reversed}));state.deck=[...returned,...(state.removed||[]),...state.deck];state.placed=[];state.selected=null;state.completionShown=false;state.dealCheckpoint=null;state.removed=[];render();saveLocal();setStatus('配札したカードと除外カードを回収しました。同じデッキで次の占いを続けられます。')}
function returnPositions(){if(!state.placed.length){setStatus('戻すカードがありません。');return}for(const p of state.placed){if(p.slot!=null&&getSlots()[p.slot]){const slot=getSlots()[p.slot];p.x=slot.x;p.y=slot.y;p.angle=slot.angle;p.manualMoved=false;p.dragOrder=0;}else if(p.origin){p.x=p.origin.x;p.y=p.origin.y;p.angle=p.origin.angle;p.manualMoved=false;p.dragOrder=0;}}render();saveLocal();setStatus('卓のカード位置を元に戻しました。')}
$('quickPositions').onclick=returnPositions;
$('quickReturn').onclick=()=>{if(!state.placed.length&&!(state.removed||[]).length){setStatus('戻す配札がありません。');return}if(confirm('配札前の山札の順番と正逆位置を復元しますか？')){restoreDealWithoutPrompt();setStatus('配札前の山札を完全復元しました。')}};
$('quickCollect').onclick=()=>{if(confirm('卓上のカードを配札順に回収して、同じデッキで次の占いを続けますか？'))collectForNextReading()};
$('quickFaceDown').onclick=()=>{state.placed.forEach(p=>p.faceUp=false);state.completionShown=false;render();saveLocal()};
function revealAllAtOnce(){
 if(openingBusy)return;
 const closed=state.placed.filter(p=>!p.faceUp&&!p.auxiliaryPile);
 if(!closed.length){setStatus('開ける伏せ札がありません。');return}
 closed.forEach(p=>{p.faceUp=true});
 // Instant reveal matches "all face down": no sound or completion effects.
 render();saveLocal();
 setStatus(closed.length+'枚を一度に開きました。');
}
$('quickRevealAll').onclick=revealAllAtOnce;
$('quickOpen').onclick=openSequentially;$('shuffle').onclick=()=>runRecipe(false);$('manualShuffle').onclick=()=>runRecipe(true);$('shuffleRecipe').onchange=e=>{recipeId=e.target.value;syncRecipes();saveLocal();setStatus('シャッフル手順を切り替えました。')};$('editRecipe').onclick=recipeEditor;$('deleteRecipe').onclick=()=>{if(recipeId==='single'){setStatus('標準手順は削除できません。');return}recipes=recipes.filter(r=>r.id!==recipeId);recipeId='single';syncRecipes();saveLocal();setStatus('登録した手順を削除しました。')};$('cut').onclick=()=>cutModal(false);$('deal').onclick=dealAuto;$('draw').onclick=()=>drawAt();$('revealAll').onclick=revealAllAtOnce;$('faceDown').onclick=()=>{state.placed.forEach(p=>p.faceUp=false);state.completionShown=false;render();saveLocal()};$('resetLayout').onclick=()=>{if(!state.placed.length){setStatus('戻すカードがありません。');return}modal('<h2>配札を戻す</h2><p class="note">卓上のカードを山札へ戻しますか？</p><div class="row"><button type="button" id="returnCancel">キャンセル</button><button type="button" class="primary" id="returnConfirm">山札に戻す</button></div>');$('returnCancel').onclick=closeModal;$('returnConfirm').onclick=()=>{state.deck=[...state.placed.map(({id,reversed})=>({id,reversed})),...state.deck];state.placed=[];state.selected=null;state.dealCheckpoint=null;closeModal();render();saveLocal();setStatus('配札を山札に戻しました。')}};$('exportCurrent').onclick=exportCurrentReading;$('exportAll').onclick=exportAllData;$('importExternal').onclick=()=>{$('externalFile').click()};$('externalFile').onchange=e=>{const f=e.target.files?.[0];e.target.value='';readExternalFile(f)};$('snapshotSave').onclick=saveSnapshotModal;$('quickSnapshotSave').onclick=saveSnapshotModal;$('quickSnapshotList').onclick=compareModal;$('snapshotAgain').onclick=saveAndAgain;$('snapshotList').onclick=compareModal;$('resetSettings').onclick=resetSettingsAction;$('resetEverything').onclick=resetEverythingAction;$('save').onclick=()=>{saveLocal();setStatus('現在の卓をブラウザー内に保存しました。')};$('restore').onclick=restoreLocal;$('modalClose').onclick=closeModal;$('modalBg').onclick=e=>{ /* 背景クリックでは閉じない。入力欄のテキスト選択・ドラッグ時の誤終了を防ぐ。 */ };function defaultCardSize(){return window.innerWidth<=780?1.75:1.3}
const validCardSize=TabulaStorage.validCardSize;
const {builtinSpreadCardSizes}=TabulaCatalog;function spreadCardSize(id){const stored=spreadLibrary.find(v=>v.id===id);if(validCardSize(stored?.cardSize))return stored.cardSize;const built=builtinSpreadCardSizes[id];if(built)return window.innerWidth<=780?built.mobile:built.desktop;return defaultCardSize()}
function updateCardSizeQuickValue(){const label=$('cardSizeQuickValue');if(label)label.textContent=Math.round(zoom*100)+'%';}function setCardSize(value,persist=true){zoom=validCardSize(value)?value:defaultCardSize();updateCardSizeQuickValue();for(const id of ['cardSizeScale','spreadCardSize']){const input=$(id);if(input)input.value=zoom;}if(persist){settings.cardSize=zoom;try{localStorage.setItem('tabula_card_size_v2',String(zoom))}catch(e){}}}
function applySpreadCardSize(id,persist=true){setCardSize(spreadCardSize(id),persist)}

function changeDesktopCardSize(delta,reset=false){setCardSize(reset?spreadCardSize(settings.spread):Math.max(.8,Math.min(2.3,Math.round((zoom+delta)*100)/100)));render();applyTableCamera();if(!spreadWorkbench)saveLocal()}
$('zoomIn').onclick=()=>changeDesktopCardSize(.1);
$('zoomOut').onclick=()=>changeDesktopCardSize(-.1);
$('zoomReset').onclick=()=>changeDesktopCardSize(0,true);const deck=$('deck');
// The move handle is separate from deck dragging, which still deals a card.
// Coordinates are relative to the table surface and persist with the workspace.
const deckMoveHandle=document.createElement('button');
deckMoveHandle.type='button';
deckMoveHandle.className='deck-move-handle';
deckMoveHandle.textContent='✥';
deckMoveHandle.title='ここをドラッグして山札を移動';
deckMoveHandle.setAttribute('aria-label','山札を移動する（ドラッグ）');
deck.append(deckMoveHandle);
function applyDeckPosition(){
  const position=settings.deckPosition;
  const pile=$('deck'),label=$('deckCount'),surface=$('surface');
  if(!position||!Number.isFinite(position.x)||!Number.isFinite(position.y)){
    for(const prop of ['left','top','right','bottom'])pile.style.removeProperty(prop);
    for(const prop of ['left','top','right','bottom','transform'])label.style.removeProperty(prop);
    return;
  }
  const sw=surface.offsetWidth||1,sh=surface.offsetHeight||1;
  const x=Math.max(0,Math.min(Number(position.x),100*(sw-pile.offsetWidth)/sw));
  const y=Math.max(0,Math.min(Number(position.y),100*(sh-pile.offsetHeight)/sh));
  pile.style.left=x+'%';pile.style.top=y+'%';pile.style.right='auto';pile.style.bottom='auto';
  // Keep the counter beside the pile instead of leaving it at its old location.
  const leftSide=x>65;
  label.style.left=leftSide?'calc('+x+'% - 12px)':'calc('+x+'% + var(--cw) + 13px)';
  label.style.top='calc('+y+'% + var(--ch) / 2)';
  label.style.right='auto';label.style.bottom='auto';
  label.style.transform=leftSide?'translate(-100%,-50%)':'translateY(-50%)';
}
let deckMove=null;
deckMoveHandle.addEventListener('pointerdown',e=>{
  if(e.button!==0)return;
  e.preventDefault();e.stopPropagation();
  const surface=$('surface'),rect=surface.getBoundingClientRect();
  deckMove={pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,
    x:deck.offsetLeft,y:deck.offsetTop,
    scaleX:rect.width/(surface.offsetWidth||1),scaleY:rect.height/(surface.offsetHeight||1)};
  deckMoveHandle.setPointerCapture(e.pointerId);
});
deckMoveHandle.addEventListener('pointermove',e=>{
  if(!deckMove||deckMove.pointerId!==e.pointerId)return;
  e.preventDefault();e.stopPropagation();
  const surface=$('surface'),sw=surface.offsetWidth||1,sh=surface.offsetHeight||1;
  const x=Math.max(0,Math.min(sw-deck.offsetWidth,deckMove.x+(e.clientX-deckMove.startX)/(deckMove.scaleX||1)));
  const y=Math.max(0,Math.min(sh-deck.offsetHeight,deckMove.y+(e.clientY-deckMove.startY)/(deckMove.scaleY||1)));
  settings.deckPosition={x:100*x/sw,y:100*y/sh};
  applyDeckPosition();
});
function finishDeckMove(e){
  if(!deckMove||deckMove.pointerId!==e.pointerId)return;
  e.stopPropagation();deckMove=null;saveLocal();
}
deckMoveHandle.addEventListener('pointerup',finishDeckMove);
deckMoveHandle.addEventListener('pointercancel',finishDeckMove);
deckMoveHandle.addEventListener('lostpointercapture',()=>{if(deckMove){deckMove=null;saveLocal()}});
deckMoveHandle.addEventListener('click',e=>{e.preventDefault();e.stopPropagation()});
// A lightweight preview follows the finger while drawing a card from the deck.
// The actual card is removed from the deck only when released over the table.
let deckPreview=null;
function clearDeckPreview(){if(deckPreview){deckPreview.remove();deckPreview=null}}
function moveDeckPreview(e){if(!deckPreview)return;deckPreview.style.left=e.clientX+'px';deckPreview.style.top=e.clientY+'px'}
function beginDeckPreview(e){
  if(deckPreview)return;
  const m=metrics();
  deckPreview=document.createElement('div');
  deckPreview.className='deck-drag-preview';
  deckPreview.style.width=m.w*tableCamera.scale+'px';deckPreview.style.height=m.h*tableCamera.scale+'px';
  deckPreview.innerHTML='<span class="deck-drag-preview-symbol">✧</span>';
  document.body.append(deckPreview);moveDeckPreview(e);
}
deck.addEventListener('pointerdown',e=>{
  if(e.button!==0||!state.deck.length)return;
  drag={type:'deck',startX:e.clientX,startY:e.clientY,pointerId:e.pointerId};
  dragMoved=false;
  deck.setPointerCapture(e.pointerId);
});
deck.addEventListener('pointermove',e=>{
  if(drag?.type!=='deck'||drag.pointerId!==e.pointerId)return;
  if(!dragMoved&&Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)>8){
    dragMoved=true;beginDeckPreview(e);
  }
  if(dragMoved)moveDeckPreview(e);
});
deck.addEventListener('pointerup',e=>{
  if(drag?.type!=='deck'||drag.pointerId!==e.pointerId)return;
  drag=null;clearDeckPreview();
  if(!dragMoved){drawAt();return}
  const r=$('zone').getBoundingClientRect(),x=(e.clientX-r.left)/r.width*100,y=(e.clientY-r.top)/r.height*100;
  if(x<0||x>100||y<0||y>100)return;
  if(settings.spread==='free'||getSlots().every((_,i)=>state.placed.some(p=>p.slot===i)))
    drawAt(null,Math.max(7,Math.min(93,x)),Math.max(10,Math.min(90,y)));
  else{
    const slots=getSlots(),available=slots.map((s,i)=>({...s,i})).filter(s=>!state.placed.some(p=>p.slot===s.i));
    const nearest=available.sort((a,b)=>(a.x-x)**2+(a.y-y)**2-(b.x-x)**2-(b.y-y)**2)[0];
    if(nearest)drawAt(nearest.i);
  }
});
deck.addEventListener('pointercancel',()=>{if(drag?.type==='deck')drag=null;clearDeckPreview()});
deck.addEventListener('lostpointercapture',()=>{clearDeckPreview();if(drag?.type==='deck')drag=null});
window.addEventListener('resize',render);
// Independent disclosure state; no navigation or form submission on toggle.
if((Number(settings.dealSkipFirst)||0)||(settings.dealSkipSchedule||'').trim())$('dealRulesDetails').open=true;
const HELP_CONTENT="\n<p class=\"mini\">TABULA SORTIUM v0.9.96 — タロットを自由に扱うための仮想カードテーブル。基本操作とデータの扱いをまとめています。</p>\n<h3>1. はじめに</h3>\n<p>「Ⅰ. 使用するカード」でカード群（全78枚・大／小アルカナ・コートカード・任意選択）と展開法（1枚・3枚・ケルト十字・自由配置）を選び、「新しい占いを始める」を押します。初期設定はケルト十字、単独シャッフルはオーバーハンドです。デッキは「ランダム」または「新品（整列）」から開始できます。左側の各セクションは見出しをクリックすると折り畳み・展開でき、開閉状態はブラウザーに保存されます。</p>\n<h3>2. 山札の操作</h3>\n<p>「ウォッシュ」は選択した方向と回数で混ぜます。「シャッフル」は登録した手順を実行します。手順は方式・回数・束数などを組み合わせて編集・保存できます。「カット」は山札を分割して積み直します。各操作は任意で、整列した山札をそのまま使用することもできます。</p>\n<h3>3. 配札・自由配置</h3>\n<p>「ディール」で選択中の展開法に従って配札します。空のポジションをタップしてその位置に配ることもできます。山札を卓へドラッグするとカードの裏面が指に追従し、離した位置に配られます。山札の右上にある✥ハンドルをドラッグすると山札そのものを移動できます。移動した位置は自動保存されます。フリースプレッドでは枚数と置き場所を自由に決められます。基本の展開を終えた後も補助カードを追加できます。</p>\n<h3>4. カードの表裏・移動・回転</h3>\n<p>カードをタップすると表裏が切り替わります。「オープン」は伏せたカードを順番に開きます。ドラッグで移動すると、そのカードが最前面になり、金色の枠で選択されます。長押し（約0.5秒）でも移動せずに選択できます。卓の直下に表示される回転ボタンで選択カードを左右90°・15°ずつ回したり、0°に戻したりできます。配置角度と占術上の正逆位置は別々に管理され、回転操作で正逆位置は変更されません。PCでは右クリックでも90°回転します。卓の余白をタップすると選択が解除されます。</p>\n<h3>5. 正逆位置とポジション</h3>\n<p>正逆位置を有効にすると、カードの向きはランダムに決まります。逆位置はカード自体を180°回転させますが、ポジション番号は初期位置・初期角度に固定されます。「ポジション名 ON／OFF」で表示を切り替えられます。「位置を戻す」はカードの配置位置を戻す操作です。</p>\n<h3>6. 自作スプレッド</h3><p>フリースプレッドでカードを並べ、操作バーの「手帖」を開き、「現在の卓から作成」を押します。位置名を編集し、必要に応じてグリッドスナップや円形整列（半径・回転・カード向きの調整付き）を行って登録します。手帖では登録した展開法の利用・編集・複製・削除ができます。登録した展開法は一覧からも選べます。配置だけを記録するので、使用したカードの種類や正逆位置は登録されません。全データのJSONバックアップにも登録内容が含まれます。</p><h3>7. 結果の表示・記録</h3>\n<p>「RESULTS」で現在のカードと表裏の状況を確認できます。「結果を保存」で占例を記録し、「記録一覧・比較」で保存した占例を参照できます。卓の状態はブラウザー内に自動保存されます。</p>\n<h3>8. JSONの書き出し・読み込み</h3>\n<p>「現在の占例を書き出す」はその占例のJSONを出力します。「全データをバックアップ」は保存記録や設定等を含むデータのバックアップ用です。「外部ファイルを読み込む」でJSONを取り込めます。単独の占例JSONは記録一覧に追加され、現在の卓は変更されません。全データのバックアップJSONは、確認後に作業状態・保存記録・設定を置き換えます。全データを読み込む前には、必要に応じて現在のデータをバックアップしてください。</p>\n<h3>9. 保存場所・注意事項</h3>\n<p>通常の使用データは、利用中のブラウザー・端末内に保存されます。別の端末やブラウザーへ自動同期されません。プライベートブラウズ、サイトデータの削除、ブラウザーの保存領域の制限によって失われる場合があります。重要な記録はJSONとして別途保管してください。</p>\n<h3>10. 卓の拡大・移動（PC・スマホ）</h3><p>スマホでは2本指のピンチで卓を拡大・縮小し、拡大後は卓の空いている部分を1本指で動かせます。カード上ではカード操作が優先されるため、2本指で移動することもできます。「全景」で元の表示に戻せます。PCでは卓の表示倍率スライダーで全景と細部を切り替え、拡大中は卓の余白をドラッグして表示位置を動かせます。表示倍率や位置は新しい占い・シャッフル後も維持されます。カードそのもののサイズは「Ⅰ. 使用するカード」の「詳細設定：カードサイズ」で調整し、「標準」で戻します。「カードを見る」をONにすると、表向きの札をクリックして拡大画像と解説を確認できます。</p>\n";

$('openHelp').addEventListener('click',()=>{modal('<div class="help-popup-content"><h2>操作説明・仕様</h2>'+HELP_CONTENT+'</div>')});

const ABOUT_MARKUP='<div class="about-panel"><img class="about-icon" src="images/ui/icon-00.png" alt="TABULA SORTIUM アイコン"><h2>TABULA SORTIUM</h2><p class="about-subtitle">THE VIRTUAL DIVINATION TABLE</p><hr class="about-divider"><p class="about-credits">Created by <a href="https://majyutsudo.wpcomstaging.com/" target="_blank" rel="noopener noreferrer">Majyutsudo</a></p><p class="about-meta">Version 0.9.96</p><p class="about-meta">© 2026 Majyutsudo</p><button type="button" id="aboutLegal" class="about-license">License &amp; Disclaimer</button></div>';
function openAbout(){modal(ABOUT_MARKUP);$('aboutLegal').onclick=showAboutLegal}
function showAboutLegal(){
 modal('<div class="about-legal"><h2>License &amp; Disclaimer</h2><p>© 2026 Majyutsudo. TABULA SORTIUM の名称、独自のプログラムおよび図像の権利については、それぞれの権利者に帰属します。この表示自体は、プログラムやカード画像の複製・改変・再配布を許可するライセンスではありません。</p><p>本アプリは占術の実践・研究・創作のための道具です。カードの解釈や占断の結果は、使用する方の判断によるものです。</p><p>お問い合わせ先：<a href="https://majyutsudo.wpcomstaging.com/" target="_blank" rel="noopener noreferrer">Majyutsudo</a></p><button type="button" id="aboutBack" class="about-back">Aboutに戻る</button></div>');
 $('aboutBack').onclick=openAbout;
}
$('openAbout').addEventListener('click',openAbout);

document.querySelectorAll('aside .section').forEach((section,i)=>{const btn=section.querySelector('.section-toggle');const key='tabula_sortium_section_'+i;let closed=true;try{closed=localStorage.getItem(key)!=='open'}catch(e){}section.classList.toggle('is-collapsed',closed);btn.setAttribute('aria-expanded',String(!closed));btn.addEventListener('click',()=>{const next=!section.classList.contains('is-collapsed');section.classList.toggle('is-collapsed',next);btn.setAttribute('aria-expanded',String(!next));try{localStorage.setItem(key,next?'closed':'open')}catch(e){}})});
// TABULA TAROT image gallery; only the existing in-memory images are used.

// Render SVG as page content so its external image references remain loadable.
let artworkSerial=0;
function cardArtworkMarkup(source){
 if(!source.startsWith('data:image/svg+xml'))return `<img class="card-art" src="${source}" alt="" draggable="false">`;
 let svg=decodeURIComponent(source.slice(source.indexOf(',')+1));
 const prefix='card-art-'+(++artworkSerial)+'-';
 const ids=[...svg.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 for(const id of new Set(ids)){
  svg=svg.split('id="'+id+'"').join('id="'+prefix+id+'"');
  svg=svg.split('url(#'+id+')').join('url(#'+prefix+id+')');
  svg=svg.split('href="#'+id+'"').join('href="#'+prefix+id+'"');
 }
 return svg.replace('<svg ','<svg class="card-art" role="img" aria-label="カード" focusable="false" ');
}
function setCardArtwork(target,source){
 const template=document.createElement('template');template.innerHTML=cardArtworkMarkup(source);
 const node=template.content.firstElementChild;
 for(const attr of [...target.attributes])if(!['src','class','width','height'].includes(attr.name))node.setAttribute(attr.name,attr.value);
 node.classList.add(...target.classList);
 target.replaceWith(node);return node;
}

const GALLERY={visible:false,listed:[],focus:null,index:0};
function gallerySelection(){const v=$('cardGalleryFilter').value;return cards.filter(c=>{
 if(v==='all')return true;
 if(v==='major')return c.group==='major';
 if(v==='minor')return c.group!=='major';
 if(v==='pip')return c.group==='minor';
 if(v==='court')return c.group==='court';
 return c.suit===v;
}).filter(c=>!!TABULA_TAROT_IMAGES[c.id]);}
function galleryCloseLarge(){ $('cardGalleryLightbox').hidden=true;$('cardGalleryLarge').removeAttribute('src');if(GALLERY.focus)GALLERY.focus.focus();}
function galleryShowLarge(index,origin){const all=GALLERY.listed;if(!all.length)return;GALLERY.index=(index+all.length)%all.length;if(origin)GALLERY.focus=origin;const c=all[GALLERY.index];setCardArtwork($('cardGalleryLarge'),finishedCardSource(c));renderDetailText($('galleryCardText'),c);$('cardGalleryLarge').alt=displayCard(c).name;$('cardGalleryLabel').textContent=displayCard(c).name+'  ·  '+(GALLERY.index+1)+' / '+all.length;$('cardGalleryLightbox').hidden=false;}
function galleryRender(){GALLERY.listed=gallerySelection();$('cardGalleryCount').textContent=GALLERY.listed.length+' / 78枚';const root=$('cardGalleryGrid');root.replaceChildren();for(const [i,c] of GALLERY.listed.entries()){const btn=document.createElement('button');btn.type='button';btn.className='gallery-tile';btn.setAttribute('aria-label',displayCard(c).name+'を拡大する');let img=document.createElement('img');img=setCardArtwork(img,finishedCardSource(c));img.loading='lazy';img.decoding='async';img.alt='';const txt=document.createElement('span');txt.textContent=displayCard(c).name;btn.append(img,txt);btn.addEventListener('click',()=>galleryShowLarge(i,btn));root.append(btn)}$('cardGalleryScroll').scrollTop=0;}
function galleryOpen(){if(GALLERY.visible)return;GALLERY.visible=true;$('cardGallery').hidden=false;document.body.classList.add('gallery-open');$('cardGalleryLightbox').hidden=true;galleryRender();$('cardGalleryClose').focus()}
function galleryClose(){if(!GALLERY.visible)return;if(!$('cardGalleryLightbox').hidden)galleryCloseLarge();GALLERY.visible=false;$('cardGallery').hidden=true;document.body.classList.remove('gallery-open');$('cardGalleryOpen').focus()}
$('cardGalleryOpen').addEventListener('click',galleryOpen);
$('cardGalleryClose').addEventListener('click',galleryClose);
$('cardGalleryFilter').addEventListener('change',()=>{galleryCloseLarge();galleryRender()});
$('cardGalleryBack').addEventListener('click',galleryCloseLarge);
$('cardGalleryPrev').addEventListener('click',()=>galleryShowLarge(GALLERY.index-1));
$('cardGalleryNext').addEventListener('click',()=>galleryShowLarge(GALLERY.index+1));
document.addEventListener('keydown',e=>{if(!GALLERY.visible)return;if(e.key==='Escape'){e.preventDefault();if(!$('cardGalleryLightbox').hidden)galleryCloseLarge();else galleryClose()}else if(!$('cardGalleryLightbox').hidden&&e.key==='ArrowLeft'){e.preventDefault();galleryShowLarge(GALLERY.index-1)}else if(!$('cardGalleryLightbox').hidden&&e.key==='ArrowRight'){e.preventDefault();galleryShowLarge(GALLERY.index+1)}});


$('cardBackColor').addEventListener('change',()=>{settings.cardBackColor=$('cardBackColor').value;const d=activeDeck();if(d){d.backColor=settings.cardBackColor;storeDeckLibrary()}syncTabulaBack();saveLocal();setStatus('TABULA TAROTの裏面色を変更しました。')});

const SUIT_SHEET='images/decks/tabula-tarot/suit-sheet.png';
function largeSuit(suit){const q={cups:[0,0],swords:[627.0,0],wands:[0,627.0],pentacles:[627.0,627.0]}[suit];return `<svg x="22" y="16" width="256" height="218" viewBox="${q[0]} ${q[1]} 627.0 627.0" preserveAspectRatio="xMidYMid meet"><image href="${SUIT_SHEET}" width="1254" height="1254"/></svg>`;}

// Shared artwork and identifier compositor for all 78 cards.
const IDENTIFIER_GLYPHS={"0": {"path": "M713 88Q833 88 877.5 197.0Q922 306 922 745Q922 1181 877.5 1292.0Q833 1403 713 1403Q593 1403 548.5 1294.0Q504 1185 504 745Q504 306 548.5 197.0Q593 88 713 88ZM713 -29Q414 -29 255.0 170.5Q96 370 96 745Q96 1120 255.0 1320.0Q414 1520 713 1520Q1011 1520 1170.0 1320.0Q1329 1120 1329 745Q1329 370 1170.0 170.5Q1011 -29 713 -29Z", "advance": 1425, "bounds": [96, -29, 1329, 1520]}, "1": {"path": "M281 0V121H561V1329L250 1145V1294L625 1520H940V121H1221V0Z", "advance": 1425, "bounds": [250, 0, 1221, 1520]}, "2": {"path": "M270 1124H150V1446Q272 1483 391.5 1501.5Q511 1520 633 1520Q918 1520 1077.5 1403.5Q1237 1287 1237 1079Q1237 931 1149.0 813.5Q1061 696 813 535L397 262H1104V438H1241V0H137V244L358 397Q641 592 735.0 729.0Q829 866 829 1049Q829 1222 757.5 1312.5Q686 1403 549 1403Q431 1403 360.0 1331.5Q289 1260 270 1124Z", "advance": 1425, "bounds": [137, 0, 1241, 1520]}, "3": {"path": "M176 1450Q308 1485 432.0 1502.5Q556 1520 674 1520Q944 1520 1088.5 1423.5Q1233 1327 1233 1147Q1233 1012 1150.0 928.0Q1067 844 907 815Q1102 784 1198.0 682.0Q1294 580 1294 403Q1294 194 1128.5 82.5Q963 -29 649 -29Q531 -29 405.5 -9.0Q280 11 143 51V379H264Q275 237 353.0 162.5Q431 88 569 88Q721 88 804.0 172.5Q887 257 887 412Q887 574 800.5 662.0Q714 750 555 750H489V870H541Q688 870 762.0 938.0Q836 1006 836 1141Q836 1268 766.5 1335.5Q697 1403 567 1403Q449 1403 380.0 1338.5Q311 1274 297 1151H176Z", "advance": 1425, "bounds": [143, -29, 1294, 1520]}, "4": {"path": "M1307 0H485V121H707V393H84V508L709 1520H1085V522H1341V393H1085V121H1307ZM707 522V1247L262 522Z", "advance": 1425, "bounds": [84, 0, 1341, 1520]}, "5": {"path": "M1155 1493V1231H356V903Q422 954 503.0 980.0Q584 1006 674 1006Q950 1006 1110.0 866.5Q1270 727 1270 487Q1270 243 1110.0 107.0Q950 -29 662 -29Q540 -29 419.5 -9.0Q299 11 168 53V379H288Q294 232 364.5 160.0Q435 88 573 88Q720 88 791.0 186.5Q862 285 862 487Q862 686 792.5 784.5Q723 883 582 883Q506 883 446.5 851.5Q387 820 336 754H236V1493Z", "advance": 1425, "bounds": [168, -29, 1270, 1493]}, "6": {"path": "M504 885Q569 937 649.5 963.0Q730 989 825 989Q1054 989 1184.5 855.0Q1315 721 1315 487Q1315 240 1168.0 105.5Q1021 -29 750 -29Q444 -29 286.5 155.5Q129 340 129 698Q129 1105 304.0 1312.5Q479 1520 823 1520Q913 1520 1016.0 1505.0Q1119 1490 1237 1460V1196H1116Q1091 1298 1021.5 1350.5Q952 1403 842 1403Q664 1403 584.5 1281.0Q505 1159 504 885ZM727 88Q830 88 874.0 175.5Q918 263 918 479Q918 695 874.0 782.5Q830 870 727 870Q624 870 580.5 782.5Q537 695 537 479Q537 263 580.5 175.5Q624 88 727 88Z", "advance": 1425, "bounds": [129, -29, 1315, 1520]}, "7": {"path": "M1255 1239 639 0H436L1036 1210H299V1008H162V1493H1255Z", "advance": 1425, "bounds": [162, 0, 1255, 1493]}, "8": {"path": "M952 795Q1130 766 1222.5 664.0Q1315 562 1315 397Q1315 191 1159.5 81.0Q1004 -29 711 -29Q418 -29 262.0 81.0Q106 191 106 397Q106 562 199.0 664.0Q292 766 469 795Q312 831 234.0 915.5Q156 1000 156 1130Q156 1320 298.0 1420.0Q440 1520 711 1520Q981 1520 1123.5 1420.0Q1266 1320 1266 1130Q1266 1000 1187.5 915.5Q1109 831 952 795ZM879 1126Q879 1284 841.0 1343.5Q803 1403 711 1403Q618 1403 580.5 1343.5Q543 1284 543 1126Q543 969 580.5 910.5Q618 852 711 852Q804 852 841.5 910.5Q879 969 879 1126ZM918 414Q918 597 871.5 666.0Q825 735 711 735Q596 735 550.0 666.0Q504 597 504 414Q504 229 550.5 158.5Q597 88 711 88Q824 88 871.0 158.5Q918 229 918 414Z", "advance": 1425, "bounds": [106, -29, 1315, 1520]}, "9": {"path": "M698 1403Q595 1403 551.5 1315.5Q508 1228 508 1012Q508 796 551.5 708.5Q595 621 698 621Q801 621 845.0 708.5Q889 796 889 1012Q889 1228 845.0 1315.5Q801 1403 698 1403ZM921 608Q855 555 774.5 528.5Q694 502 600 502Q372 502 241.5 635.5Q111 769 111 1004Q111 1252 257.0 1386.0Q403 1520 674 1520Q980 1520 1138.0 1335.0Q1296 1150 1296 793Q1296 386 1121.0 178.5Q946 -29 602 -29Q512 -29 409.0 -14.0Q306 1 188 31V295H309Q334 193 403.5 140.5Q473 88 584 88Q760 88 840.0 210.5Q920 333 921 608Z", "advance": 1425, "bounds": [111, -29, 1296, 1520]}, "I": {"path": "M96 0V121H287V1372H96V1493H864V1372H672V121H864V0Z", "advance": 958, "bounds": [96, 0, 864, 1493]}, "V": {"path": "M1618 1493V1372H1493L930 0H692L129 1372H-12V1493H688V1372H543L946 383L1352 1372H1174V1493Z", "advance": 1589, "bounds": [-12, 0, 1618, 1493]}, "X": {"path": "M694 575 383 121H567V0H37V121H221L614 692L147 1372H10V1493H752V1372H588L877 952L1163 1372H989V1493H1509V1372H1325L956 836L1446 121H1587V0H842V121H1008Z", "advance": 1589, "bounds": [10, 0, 1587, 1493]}, "P": {"path": "M96 0V121H287V1372H96V1493H946Q1195 1493 1342.0 1374.5Q1489 1256 1489 1057Q1489 857 1341.5 737.5Q1194 618 946 618H672V121H913V0ZM672 739H784Q914 739 991.5 825.5Q1069 912 1069 1057Q1069 1201 992.0 1286.5Q915 1372 784 1372H672Z", "advance": 1540, "bounds": [96, 0, 1489, 1493]}, "K": {"path": "M96 0V121H287V1372H96V1493H864V1372H672V827L1305 1372H1145V1493H1702V1372H1503L967 911L1696 121H1843V0H1337L672 725V121H864V0Z", "advance": 1780, "bounds": [96, 0, 1843, 1493]}, "Q": {"path": "M885 -29Q507 -23 296.5 181.0Q86 385 86 745Q86 1107 300.5 1313.5Q515 1520 891 1520Q1268 1520 1482.0 1314.0Q1696 1108 1696 745Q1696 427 1531.5 229.0Q1367 31 1063 -16Q1116 -73 1192.0 -98.0Q1268 -123 1389 -123H1440V-369H1411Q1221 -369 1094.0 -287.0Q967 -205 885 -29ZM891 92Q1082 92 1175.0 253.0Q1268 414 1268 745Q1268 1077 1175.0 1238.0Q1082 1399 891 1399Q701 1399 607.5 1236.5Q514 1074 514 745Q514 417 607.5 254.5Q701 92 891 92Z", "advance": 1784, "bounds": [86, -369, 1696, 1520]}, "n": {"path": "M70 0V121H221V942H70V1063H575V913Q639 1008 721.0 1050.0Q803 1092 928 1092Q1107 1092 1198.5 986.5Q1290 881 1290 676V121H1442V0H807V121H936V686Q936 821 901.5 873.5Q867 926 782 926Q675 926 625.0 847.5Q575 769 575 598V121H705V0Z", "advance": 1489, "bounds": [70, 0, 1442, 1092]}};
function identifierPaths(label,cx,cy,height,maxWidth,fill,stroke){
 let x=0,minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity,paths='';
 for(const ch of label){const g=IDENTIFIER_GLYPHS[ch];if(!g)continue;const b=g.bounds;minX=Math.min(minX,x+b[0]);maxX=Math.max(maxX,x+b[2]);minY=Math.min(minY,b[1]);maxY=Math.max(maxY,b[3]);paths+=`<path d="${g.path}" transform="translate(${x} 0)"/>`;x+=g.advance;}
 const sy=height/(maxY-minY),sx=Math.min(sy,maxWidth/(maxX-minX));
 return `<g transform="translate(${cx} ${cy}) scale(${sx} ${-sy}) translate(${-(minX+maxX)/2} ${-(minY+maxY)/2})" fill="${fill}" stroke="${stroke?'#38200f':'none'}" stroke-width="${stroke?5/sy:0}" paint-order="stroke fill" stroke-linejoin="round">${paths}</g>`;
}

const FACE_PREF_KEY='tabula_face_preferences_v1';
let facePrefs={major:'roman',pip:'arabic'};
try{Object.assign(facePrefs,JSON.parse(localStorage.getItem(FACE_PREF_KEY)||'{}'))}catch(e){}

function romanValue(n){if(!n)return '0';let out='';for(const [v,t] of [[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']])while(n>=v){out+=t;n-=v}return out}
function faceNumber(n,type){return n===null?'':facePrefs[type]==='roman'?romanValue(n):String(n)}
function installFaceControls(){
 const host=document.querySelector('.gallery-controls');
 const panel=document.createElement('div');panel.className='face-preferences';
 panel.innerHTML='<label>大アルカナの数字 <select data-face="major"><option value="roman">ローマ数字</option><option value="arabic">算用数字</option></select></label><label>数札の数字 <select data-face="pip"><option value="arabic">算用数字</option><option value="roman">ローマ数字</option></select></label>';
 host.after(panel);
 panel.querySelectorAll('select').forEach(el=>{el.value=facePrefs[el.dataset.face];el.addEventListener('change',()=>{facePrefs[el.dataset.face]=el.value;localStorage.setItem(FACE_PREF_KEY,JSON.stringify(facePrefs));render();galleryRender();if(!$('cardGalleryLightbox').hidden)galleryShowLarge(GALLERY.index)})});
}
installFaceControls();


const DETAIL_PIP_IMAGES={"wands": "images/decks/tabula-tarot/detail/wands.webp", "cups": "images/decks/tabula-tarot/detail/cups.webp", "swords": "images/decks/tabula-tarot/detail/swords.webp", "pentacles": "images/decks/tabula-tarot/detail/pentacles.webp"};
const dims={cups:{w:20,h:19,soloW:77,soloH:77},swords:{w:21,h:60,soloW:69,soloH:88},wands:{w:20,h:61,soloW:57,soloH:90},pentacles:{w:19,h:18,soloW:72,soloH:72}};
// Fixed suit-specific layout, normalized to the artwork area (0..100).
const coinLayouts={
 6:[[30,20],[70,20],[30,50],[70,50],[30,80],[70,80]],
 7:[[29,21],[71,21],[18,50],[50,50],[82,50],[29,79],[71,79]],
 8:[[22,20],[50,20],[78,20],[22,50],[78,50],[22,80],[50,80],[78,80]],
 9:[[22,20],[50,20],[78,20],[22,50],[50,50],[78,50],[22,80],[50,80],[78,80]],
 10:[[23,22],[77,22],[23,50],[77,50],[23,78],[77,78],[50,13],[50,38],[50,63],[50,88]]
};
const cupLayouts={
 7:[[50,12],[24,30],[76,30],[50,50],[24,70],[76,70],[50,88]],
 8:[[24,14],[76,14],[50,32],[24,50],[76,50],[50,68],[24,86],[76,86]],
 9:[[24,12],[76,12],[24,37],[76,37],[50,50],[24,63],[76,63],[24,88],[76,88]],
 10:[[24,12],[76,12],[50,25],[24,37],[76,37],[24,63],[76,63],[50,75],[24,88],[76,88]]
};
function geometricPips(n,radius){if(n===1)return [[50,50]];return Array.from({length:n},(_,i)=>{const theta=-Math.PI/2+i*2*Math.PI/n;return [50+radius*Math.cos(theta),50+radius*Math.sin(theta)]})}
function getFixedPips(suit,n){
 if(n===1)return [[50,50]];
 if(suit==='cups'||suit==='pentacles'){
  // Use the same upper/lower baselines as the four-pip card.
  if(n===2)return [[50,27],[50,73]];
  if(n===3)return [[50,27],[30,73],[70,73]];
  if(n===4)return [[30,27],[70,27],[30,73],[70,73]];
 }
 if(suit==='cups'&&n>=7)return cupLayouts[n];
 if(suit==='pentacles'&&n>=6)return coinLayouts[n];
 return geometricPips(n,suit==='pentacles'?30:25);
}
function rotatedAngle(suit,x,y){if(suit==='swords')return Math.atan2(x-50,50-y)*180/Math.PI;return 0}

const RESTORED_CARD_IMAGES={"major_09":"images/decks/tabula-tarot/restored/major_09.webp","major_14":"images/decks/tabula-tarot/restored/major_14.webp","pentacles_12":"images/decks/tabula-tarot/restored/pentacles_12.webp","major_00":"images/decks/tabula-tarot/restored/major_00.webp","major_08":"images/decks/tabula-tarot/restored/major_08.webp","major_12":"images/decks/tabula-tarot/restored/major_12.webp","major_04":"images/decks/tabula-tarot/restored/major_04.webp","cups_14":"images/decks/tabula-tarot/restored/cups_14.webp","major_05":"images/decks/tabula-tarot/restored/major_05.webp","major_10":"images/decks/tabula-tarot/restored/major_10.webp","pentacles_13":"images/decks/tabula-tarot/restored/pentacles_13.webp","cups_11":"images/decks/tabula-tarot/restored/cups_11.webp","major_07":"images/decks/tabula-tarot/restored/major_07.webp","cups_12":"images/decks/tabula-tarot/restored/cups_12.webp","wands_11":"images/decks/tabula-tarot/restored/wands_11.webp","major_11":"images/decks/tabula-tarot/restored/major_11.webp","major_13":"images/decks/tabula-tarot/restored/major_13.webp","wands_13":"images/decks/tabula-tarot/restored/wands_13.webp","wands_14":"images/decks/tabula-tarot/restored/wands_14.webp","pentacles_14":"images/decks/tabula-tarot/restored/pentacles_14.webp","cups_13":"images/decks/tabula-tarot/restored/cups_13.webp","swords_13":"images/decks/tabula-tarot/restored/swords_13.webp","major_17":"images/decks/tabula-tarot/restored/major_17.webp","major_20":"images/decks/tabula-tarot/restored/major_20.webp","wands_12":"images/decks/tabula-tarot/restored/wands_12.webp","major_01":"images/decks/tabula-tarot/restored/major_01.webp","swords_14":"images/decks/tabula-tarot/restored/swords_14.webp","pentacles_11":"images/decks/tabula-tarot/restored/pentacles_11.webp","major_06":"images/decks/tabula-tarot/restored/major_06.webp","major_03":"images/decks/tabula-tarot/restored/major_03.webp","swords_12":"images/decks/tabula-tarot/restored/swords_12.webp","major_02":"images/decks/tabula-tarot/restored/major_02.webp","swords_11":"images/decks/tabula-tarot/restored/swords_11.webp"};
// Display boxes in the 260 x 332 artwork area; edit here when changing Ace emblems.
const ACE_ART_LAYOUT={wands:{w:65,h:222.44,angle:0},cups:{w:160,h:159.36,angle:0},swords:{w:72,h:222.44,angle:180},pentacles:{w:140.4,h:140.4,angle:0}};
const finishedCache=new Map();
const majorEnglish=['THE FOOL','THE MAGICIAN','THE HIGH PRIESTESS','THE EMPRESS','THE EMPEROR','THE HIEROPHANT','THE LOVERS','THE CHARIOT','STRENGTH','THE HERMIT','WHEEL OF FORTUNE','JUSTICE','THE HANGED MAN','DEATH','TEMPERANCE','THE DEVIL','THE TOWER','THE STAR','THE MOON','THE SUN','JUDGEMENT','THE WORLD'];
function finishedCardSource(c,tabletop=false){
 c=displayCard(c);
 const d=activeDeck(),pipPlain=effectivePipBackground()==='none';
 const key=(d?.id||'builtin')+':'+c.id+':'+c.name+':'+c.number+':'+effectiveCardLanguage()+':'+(pipPlain?'plain':'landscape')+':'+facePrefs.major+':'+facePrefs.pip+':'+(tabletop?'tabletop':'full');if(finishedCache.has(key))return finishedCache.get(key);
 const pip=c.group==='minor';
 const rank=c.group==='major'?faceNumber(c.number,'major'):pip?faceNumber(c.number,'pip'):['PAGE','KNIGHT','QUEEN','KING'][c.number-11];
 // A secondary caption is complementary to the main title, never a duplicate.
 const original=cards.find(v=>v.id===c.id)||c;
 const englishTitle=TabulaDeckStore.translatedName(original,'en');
 const category=c.group==='major'?'MAJOR ARCANA':pip?'MINOR ARCANA':'COURT CARD';
 const en=c.name.trim().toLocaleLowerCase()===englishTitle.toLocaleLowerCase()?category:englishTitle.toUpperCase();
 let art='';
 if(pip&&c.number===1){
  // Generic Ace backgrounds and existing suit emblems remain independent assets.
  const ace=ACE_ART_LAYOUT[c.suit],cx=150,cy=48+332*.48;
  art=pipPlain?'':`<image class="pip-landscape ace-background" href="images/decks/tabula-tarot/ace-backgrounds/${c.suit}.webp?v=090" x="20" y="48" width="260" height="332" preserveAspectRatio="none"/>`;
  art+=`<image class="ace-emblem" href="${DETAIL_PIP_IMAGES[c.suit]}" x="${cx-ace.w/2}" y="${cy-ace.h/2}" width="${ace.w}" height="${ace.h}" preserveAspectRatio="xMidYMid meet" transform="rotate(${ace.angle} ${cx} ${cy})"/>`;
 }else if(pip){
  const landscape=!pipPlain&&c.number>=2&&c.number<=10;
  if(landscape){const bg='images/decks/tabula-tarot/landscapes/'+c.suit+'_'+String(c.number).padStart(2,'0')+'.webp?v=089';art+=`<image class="pip-landscape" href="${bg}" x="20" y="48" width="260" height="332" preserveAspectRatio="none"/ >`.replace('/ >','/>');}
  const d=dims[c.suit],long=c.suit==='wands'||c.suit==='swords';
  if(c.number===1){for(let i=0;i<40;i++){const a=i*Math.PI/20;art+=`<path d="M${150+45*Math.cos(a)} ${217+60*Math.sin(a)} L${150+110*Math.cos(a)} ${217+130*Math.sin(a)}" stroke="#ae8d54" opacity=".22" stroke-width=".7"/>`;}}
  const points=getFixedPips(landscape&&c.suit==='cups'?'pentacles':c.suit,c.number);
  for(const [j,[x,y]] of points.entries()){
   const factor=landscape&&long?.58:1;
   const w=258*(c.number===1?d.soloW:d.w)/100*factor,h=265.5*(c.number===1?d.soloH:d.h)/100*factor;
   let px=21+x*2.58,py=90+y*2.655,angle=c.number>1?rotatedAngle(c.suit,x,y):0;
   if(landscape){py=158.67+(y-50)*(long?2.1:2.2);if(!long&&c.number<=4)py=158.67+(y-50)*2.655;if(long&&c.number===2){px=150;py=158.67+(j?1:-1)*(h/2+4);angle=j?180:0;}}
   if(!art.includes('id="detailPip"'))art+=`<defs><image id="detailPip" href="${DETAIL_PIP_IMAGES[c.suit]}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet"/></defs>`;
   art+=`<use href="#detailPip" x="${px-w/2}" y="${py-h/2}" transform="rotate(${angle} ${px} ${py})"/>`;
  }
 }else{
  const box=[0,0,300,450]; // Redrawn major and court art uses the complete image.
  art=RESTORED_CARD_IMAGES[c.id]?`<image href="${RESTORED_CARD_IMAGES[c.id]}" x="20" y="48" width="260" height="332" preserveAspectRatio="xMidYMid meet"/>`:`<svg x="20" y="48" width="260" height="332" viewBox="${box.join(' ')}" preserveAspectRatio="xMidYMid meet"><image href="${RESTORED_CARD_IMAGES[c.id]||TABULA_TAROT_IMAGES[c.id]}" width="300" height="450"/></svg>`;
 }
 // The table uses a compact frame; galleries and the card inspector keep the full design.
 if(tabletop){
  const numberNames=['ACE','TWO','THREE','FOUR','FIVE','SIX','SEVEN','EIGHT','NINE','TEN'];
  const title=(effectiveCardLanguage()!=='original'||d)?c.name:(c.group==='major'?majorEnglish[Number(c.id.slice(-2))]:(pip?numberNames[c.number-1]:['PAGE','KNIGHT','QUEEN','KING'][c.number-11])+' OF '+c.suit.toUpperCase());
  let tableArt='';
  if(!pip){
   tableArt=`<image href="${RESTORED_CARD_IMAGES[c.id]||TABULA_TAROT_IMAGES[c.id]}" x="9" y="25" width="282" height="400" preserveAspectRatio="xMidYMid slice"/>`;
  }else{
   // Expand the background to the new art box; enlarge the symbols uniformly to retain their shapes.
   const background=art.match(/<image class="pip-landscape[^>]*\/>/);
   const symbols=background?art.replace(background[0],''):art;
   if(background)tableArt+=background[0].replace('x="20" y="48" width="260" height="332"','x="9" y="25" width="282" height="400"');
   const scale=282/260,tx=9-20*scale,ty=25+(400-332*scale)/2-48*scale;
   tableArt+=`<g transform="translate(${tx} ${ty}) scale(${scale})">${symbols}</g>`;
  }
  const tableSvg=`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 300 450"><defs><linearGradient id="tablePaper" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fbefd2"/><stop offset="1" stop-color="#eddbb5"/></linearGradient><clipPath id="tableArtClip"><rect x="9" y="25" width="282" height="400"/></clipPath></defs><rect x="1" y="1" width="298" height="448" rx="3" fill="url(#tablePaper)" stroke="#ad915d" stroke-width=".7"/><rect x="4.5" y="4.5" width="291" height="441" rx="1.5" fill="none" stroke="#957544" stroke-width=".65"/><g clip-path="url(#tableArtClip)">${tableArt}</g><g fill="none" stroke="#8e6b3d" stroke-width=".6"><path d="M38 14H108M192 14H262M20 436H35M265 436H280"/><path d="M4.5 10Q10 10 10 4.5M290 4.5Q290 10 295.5 10M4.5 440Q10 440 10 445.5M290 445.5Q290 440 295.5 440"/></g><g fill="#8e6b3d"><path d="M106 14l2-1.3 2 1.3-2 1.3zM190 14l2-1.3 2 1.3-2 1.3z"/></g><text x="150" y="19" text-anchor="middle" fill="#30251c" font-family="Georgia,serif" font-size="${rank.length>5?14:17}" font-weight="500">${rank}</text><text x="150" y="441" text-anchor="middle" fill="#30251c" font-family="Georgia,serif" font-size="${title.length>22?10:11.5}" font-weight="500" letter-spacing=".6">${escapeHTML(title)}</text></svg>`;
  const source='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(tableSvg);finishedCache.set(key,source);return source;
 }
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="900" viewBox="0 0 300 450"><defs><linearGradient id="paper" x2="1" y2="1"><stop stop-color="#fbefcf"/><stop offset="1" stop-color="#e5cda1"/></linearGradient></defs><rect x="1" y="1" width="298" height="448" rx="10" fill="url(#paper)" stroke="#735b37" stroke-width="2"/><rect x="7" y="7" width="286" height="436" rx="5" fill="none" stroke="#ad8b51" stroke-width="2"/><rect x="12" y="12" width="276" height="426" rx="3" fill="none" stroke="#8b7049" stroke-width=".65"/><path d="M18 34H103M197 34H282M18 390H282" stroke="#a28554" stroke-width=".6"/><text x="150" y="34" text-anchor="middle" fill="#43301b" font-family="Georgia,serif" font-size="${rank.length>5?17:22}">${rank}</text>${art}<text x="150" y="412" text-anchor="middle" fill="#49341e" font-family="'Yu Mincho','Hiragino Mincho ProN',serif" font-size="14">${escapeHTML(c.name)}</text><text x="150" y="428" text-anchor="middle" fill="#6c5130" font-family="Georgia,serif" font-size="8" letter-spacing=".8">${escapeHTML(en)}</text><g fill="#997841"><path d="M16 16l3 4-3 4-3-4zM284 16l3 4-3 4-3-4zM16 426l3 4-3 4-3-4zM284 426l3 4-3 4-3-4z"/></g></svg>`;
 const src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);finishedCache.set(key,src);return src;
}
const DEFAULT_CARD_TEXTS={"major_00":{"body":"一般的な意味\nまだ形の決まらない可能性と、新しい旅立ちを表します。経験よりも好奇心が先に立ち、未知の場所へ足を踏み出す場面です。\n\n正位置のキーワード\n自由、出発、冒険、可能性、無心\n\n逆位置のキーワード\n無謀、準備不足、軽率、方向の定まらなさ","source":""},"major_01":{"body":"一般的な意味\n手元の道具や知識を使い、考えを具体的な行動へ移す力です。始めるための条件を見つけ、自分から働きかける場面を示します。\n\n正位置のキーワード\n創意、技術、意志、着手、巧みな伝達\n\n逆位置のキーワード\n口先だけ、策略、技術不足、力の浪費","source":""},"major_02":{"body":"一般的な意味\n表面に現れていない事情や、静かな観察によって得られる知識を表します。すぐに結論を出さず、言葉の背後や隠された情報に目を向ける札です。\n\n正位置のキーワード\n洞察、秘密、学識、静観、慎重さ\n\n逆位置のキーワード\n思い込み、秘密の露見、閉鎖性、情報不足","source":""},"major_03":{"body":"一般的な意味\n生命や創作物を育て、豊かな実りを受け取る力です。快適な環境、感覚的な喜び、惜しみなく与える姿勢に結びつきます。\n\n正位置のキーワード\n豊穣、育成、創造、享受、包容力\n\n逆位置のキーワード\n過保護、浪費、停滞、甘やかし、実りの遅れ","source":""},"major_04":{"body":"一般的な意味\n秩序を築き、責任を引き受けて領域を守る力です。明確な方針や規則が役立つ一方、その力をどのように使うかも問われます。\n\n正位置のキーワード\n統率、責任、安定、権威、基盤\n\n逆位置のキーワード\n独断、硬直、支配、無責任、統率の欠如","source":""},"major_05":{"body":"一般的な意味\n受け継がれた教えや制度、師から学ぶことを表します。共通の規範に従って協力したり、経験ある人の助言を得たりする場面です。\n\n正位置のキーワード\n伝統、教導、信頼、規範、正式な手続き\n\n逆位置のキーワード\n形式主義、因習、不寛容、教えへの疑問","source":""},"major_06":{"body":"一般的な意味\n人や考えとの結びつき、心から選び取ることを表します。魅力に引かれるだけでなく、選択が自分の価値観に沿っているかが焦点です。\n\n正位置のキーワード\n愛情、調和、合意、選択、結びつき\n\n逆位置のキーワード\n不一致、誘惑、迷い、関係の亀裂、選択の先延ばし","source":""},"major_07":{"body":"一般的な意味\n相反する力をまとめ、目的へ進む意志です。勢いと統制を両立できれば前進しますが、勝ち急ぐほど進路を見失いやすくなります。\n\n正位置のキーワード\n前進、勝利、決意、統制、突破\n\n逆位置のキーワード\n暴走、足並みの乱れ、行き詰まり、制御不能","source":""},"major_08":{"body":"一般的な意味\n激しい力を、忍耐と落ち着きによって扱う姿です。圧倒するよりも、恐れや衝動に向き合い、粘り強く関わる力を示します。\n\n正位置のキーワード\n勇気、忍耐、自制、穏やかな強さ、信頼\n\n逆位置のキーワード\n気弱さ、焦り、抑圧、衝動、消耗","source":""},"major_09":{"body":"一般的な意味\n喧騒から離れ、自分で調べ、時間をかけて答えを探す姿です。経験に基づく知恵や、慎重に進むための小さな灯火を表します。\n\n正位置のキーワード\n探究、熟慮、経験、慎重さ、独学\n\n逆位置のキーワード\n孤立、閉じこもり、疑いすぎ、助言の拒絶","source":""},"major_10":{"body":"一般的な意味\n個人の意志だけでは動かせない変化や、状況の転換を表します。巡ってきた機会を捉えること、流れが変わる兆しを読むことが焦点です。\n\n正位置のキーワード\n転機、好機、循環、進展、時機\n\n逆位置のキーワード\n不運、足踏み、変化への抵抗、時機のずれ","source":""},"major_11":{"body":"一般的な意味\n事実を見比べ、公平な判断を下すことを表します。過去の行動の結果や、約束・契約・役割に応じた責任が明らかになる場面です。\n\n正位置のキーワード\n公平、均衡、判断、責任、正当な評価\n\n逆位置のキーワード\n偏見、不公平、責任逃れ、誤った判断","source":""},"major_12":{"body":"一般的な意味\n身動きの取れない時間を通じて、見方が変わる札です。すぐに成果を求めず、何を差し出し、何を待つ価値があるかを考えます。\n\n正位置のキーワード\n保留、献身、視点の転換、受容、熟成\n\n逆位置のキーワード\n無益な犠牲、徒労、停滞への執着、抵抗","source":""},"major_13":{"body":"一般的な意味\n一つの段階が終わり、従来の形を手放す変化です。終わったものを認めることで、新しい状況へ移る余地が生まれます。\n\n正位置のキーワード\n終結、区切り、刷新、別離、移行\n\n逆位置のキーワード\n変化への抵抗、未練、終われない関係、移行の遅れ","source":""},"major_14":{"body":"一般的な意味\n異なるものを少しずつ混ぜ、無理のない釣り合いを探す札です。調整、仲介、節度ある運用によって、全体を長く保つことに結びつきます。\n\n正位置のキーワード\n調和、節度、調整、協力、融和\n\n逆位置のキーワード\n不調和、過不足、無理な妥協、偏り","source":""},"major_15":{"body":"一般的な意味\n欲望や利益、習慣が強い拘束になる場面です。魅力的な条件の裏で、自由や判断力をどこまで差し出しているかが問われます。\n\n正位置のキーワード\n執着、誘惑、拘束、欲望、利害関係\n\n逆位置のキーワード\n束縛からの離脱、悪習の見直し、依存の自覚、誘惑への抵抗","source":""},"major_16":{"body":"一般的な意味\n脆い前提や保たれていた体制が、急な出来事で崩れる札です。衝撃とともに隠れていた問題が表れ、立て直しを迫られます。\n\n正位置のキーワード\n急変、崩壊、衝撃、真実の露呈、解放\n\n逆位置のキーワード\n危機の長期化、崩壊の回避、変化への抵抗、余震","source":""},"major_17":{"body":"一般的な意味\n困難の後に見える希望や、遠くから進路を示す光です。すぐの成果よりも、信頼できる展望や創作の源が戻ってくる兆しを表します。\n\n正位置のキーワード\n希望、澄んだ展望、着想、再生、信頼\n\n逆位置のキーワード\n落胆、見通しの弱さ、理想倒れ、希望を失うこと","source":""},"major_18":{"body":"一般的な意味\n輪郭の曖昧な状況、想像と事実が交じる時間です。夢や予感に耳を澄ませつつ、確かでない情報を確定事項として扱わない慎重さも要ります。\n\n正位置のキーワード\n不確かさ、夢、幻想、隠れた事情、予感\n\n逆位置のキーワード\n混乱の解消、誤解の発覚、秘密の露見、不安の長期化","source":""},"major_19":{"body":"一般的な意味\n物事が明るみに出て、喜びや成果を分かち合う札です。複雑だった状況が単純になり、率直さや活力が前進を助けます。\n\n正位置のキーワード\n成功、喜び、明快さ、活力、祝福\n\n逆位置のキーワード\n喜びの遅れ、過信、見栄、一時的な曇り","source":""},"major_20":{"body":"一般的な意味\n過去を振り返り、呼びかけに応じて次の段階へ進む札です。再評価、再出発、以前の行いへの返答が重要な意味を持ちます。\n\n正位置のキーワード\n覚醒、再起、決断、再評価、応答\n\n逆位置のキーワード\n決断の遅れ、後悔、呼びかけの無視、過去への固執","source":""},"major_21":{"body":"一般的な意味\n一つの過程がまとまり、全体が完成する札です。積み重ねてきた経験が結びつき、達成を受け取ったうえで新しい周期へ進みます。\n\n正位置のキーワード\n完成、達成、統合、充足、旅の結実\n\n逆位置のキーワード\n未完成、仕上げの不足、区切れないこと、停滞","source":""},"wands_01":{"body":"一般的な意味\n行動や創作を始める火種です。まだ実績はなくても、強い着想や意欲が生まれ、試してみる価値のある入口が現れます。\n\n正位置のキーワード\n着想、発端、熱意、創造力、挑戦\n\n逆位置のキーワード\n意欲の低下、着手の遅れ、空回り、短命な情熱","source":""},"wands_02":{"body":"一般的な意味\n目の前の成果を踏まえ、次に進む範囲を見定める札です。今の場所に留まるか、外へ広げるかという計画と選択を表します。\n\n正位置のキーワード\n構想、展望、計画、主導権、進路の選択\n\n逆位置のキーワード\n見通し不足、優柔不断、拡張への恐れ、計画倒れ","source":""},"wands_03":{"body":"一般的な意味\n準備したものが外へ届き、手応えを待つ段階です。交易や遠方との関わり、協力者を通じた発展、長期的な見通しに結びつきます。\n\n正位置のキーワード\n拡大、協働、遠方、先見、成果の兆し\n\n逆位置のキーワード\n遅延、期待外れ、連携不足、視野の狭さ","source":""},"wands_04":{"body":"一般的な意味\n一段落の成果を祝い、安心できる場を整える札です。住まい、仲間、催しなど、共に喜べる基盤が意味の中心になります。\n\n正位置のキーワード\n祝賀、安らぎ、団結、居場所、節目\n\n逆位置のキーワード\n落ち着かない環境、内輪の不和、祝いの延期、不安定な基盤","source":""},"wands_05":{"body":"一般的な意味\n複数の意志がぶつかり、競い合う状況です。対立が技量を磨く場合もありますが、目的を忘れると消耗する争いになります。\n\n正位置のキーワード\n競争、切磋琢磨、議論、衝突、訓練\n\n逆位置のキーワード\n争いの長期化、無益な対抗、紛争、競争からの離脱","source":""},"wands_06":{"body":"一般的な意味\n努力が認められ、人前で成果を受け取る札です。支持や評価が追い風となり、次の行動を導く自信につながります。\n\n正位置のキーワード\n勝利、承認、評判、支持、達成\n\n逆位置のキーワード\n評価の遅れ、慢心、不評、支持の喪失","source":""},"wands_07":{"body":"一般的な意味\n有利な立場を保ち、自分の領域を守る札です。周囲からの要求や競争に対し、必要な線を引いて踏みとどまります。\n\n正位置のキーワード\n防衛、勇敢さ、優位、信念、踏ん張り\n\n逆位置のキーワード\n圧倒されること、弱腰、過剰な防衛、立場の動揺","source":""},"wands_08":{"body":"一般的な意味\n動きが速まり、知らせや出来事が続けて届く札です。停滞がほどける一方、判断や応答にも速さが求められます。\n\n正位置のキーワード\n急展開、迅速な連絡、進行、接近、移動\n\n逆位置のキーワード\n行き違い、遅延、性急さ、混乱した連絡","source":""},"wands_09":{"body":"一般的な意味\nこれまでの経験を頼りに、もう一度備える姿です。傷や疲れがあっても持ちこたえる力と、警戒を解きにくい状態の両方を表します。\n\n正位置のキーワード\n忍耐、警戒、備え、持久力、再挑戦\n\n逆位置のキーワード\n消耗、疑いすぎ、守りの限界、抵抗の長期化","source":""},"wands_10":{"body":"一般的な意味\n引き受けた役目や成果が重荷になった状態です。終点は近くても、一人で抱える範囲を見直さなければ動きが鈍くなります。\n\n正位置のキーワード\n責任、重荷、多忙、抱え込み、最後の努力\n\n逆位置のキーワード\n負担の軽減、放棄、責任転嫁、過重な役割","source":""},"wands_11":{"body":"一般的な意味\n新しい世界に惹かれ、試しながら学ぶ人物や姿勢です。情熱を刺激する知らせ、企画の種、まだ経験の浅い挑戦者として現れます。\n\n正位置のキーワード\n好奇心、朗報、挑戦、若い情熱、探検\n\n逆位置のキーワード\n未熟、移り気、不確かな知らせ、実行不足","source":""},"wands_12":{"body":"一般的な意味\n勢いよく動き、変化を起こす人物や出来事です。旅や転身、素早い挑戦に向きますが、長く続ける工夫も問われます。\n\n正位置のキーワード\n行動力、冒険、出発、転換、情熱\n\n逆位置のキーワード\n短気、無鉄砲、中断、不和、持続力不足","source":""},"wands_13":{"body":"一般的な意味\n自分の魅力と意志で周囲を動かす人物や姿勢です。温かな支援と独立心を兼ね備え、場に活気をもたらします。\n\n正位置のキーワード\n自信、魅力、寛大さ、自立、活力\n\n逆位置のキーワード\n嫉妬、気の強さ、独占欲、虚勢、干渉","source":""},"wands_14":{"body":"一般的な意味\n大きな構想を掲げ、責任を持って人を率いる人物です。決断力と情熱を現実の行動へ結びつけ、全体の進路を定めます。\n\n正位置のキーワード\n統率、構想、決断、度量、先導\n\n逆位置のキーワード\n強引さ、尊大、独善、短気、無理な号令","source":""},"cups_01":{"body":"一般的な意味\n心を動かす出会いや、感情が満ち始める兆しです。愛情、喜び、創作の感動など、受け取って分かち合うものが生まれます。\n\n正位置のキーワード\n愛情、喜び、感受性、新しい関係、創作の泉\n\n逆位置のキーワード\n感情の閉塞、期待外れ、空虚、愛情の行き違い","source":""},"cups_02":{"body":"一般的な意味\n互いを認め合い、応じ合う関係です。恋愛に限らず、対等な協力、和解、双方の合意が成立する場面を示します。\n\n正位置のキーワード\n相愛、協力、合意、和解、対等さ\n\n逆位置のキーワード\n不一致、すれ違い、不均衡、別離、合意の難航","source":""},"cups_03":{"body":"一般的な意味\n喜びを仲間と分かち合う札です。友情、集まり、祝賀、力を持ち寄って実る楽しさを表します。\n\n正位置のキーワード\n友情、祝宴、交流、協力、喜びの共有\n\n逆位置のキーワード\n内輪の不和、享楽過多、噂、仲間外れ","source":""},"cups_04":{"body":"一般的な意味\n差し出されたものに心が動かず、立ち止まる状態です。倦怠や不満の中で、本当に欲しいものと、見落としている機会を見比べます。\n\n正位置のキーワード\n倦怠、熟考、無関心、満たされなさ、保留\n\n逆位置のキーワード\n新しい関心、機会への気づき、退屈からの脱出、再開","source":""},"cups_05":{"body":"一般的な意味\n失ったものへの悲しみや、期待が崩れた痛みです。残っている支えに目を向けられるかどうかが、その後の展開を左右します。\n\n正位置のキーワード\n喪失、失望、後悔、悲嘆、別れ\n\n逆位置のキーワード\n立ち直り、和解、残るものの発見、過去からの帰還","source":""},"cups_06":{"body":"一般的な意味\n昔の記憶や、親しみのある関係を表します。懐かしさ、贈り物、素直な好意がある一方、過去を美化していないかも見ます。\n\n正位置のキーワード\n思い出、旧友、贈り物、純真、懐旧\n\n逆位置のキーワード\n過去への執着、幼さ、古い関係からの離脱、未来志向","source":""},"cups_07":{"body":"一般的な意味\n多くの魅力的な可能性が浮かび、選択が曖昧になる札です。想像力の豊かさを活かすには、実現できるものを見極める必要があります。\n\n正位置のキーワード\n幻想、選択肢、夢、誘惑、想像力\n\n逆位置のキーワード\n現実的な選択、迷いの解消、幻滅、決意","source":""},"cups_08":{"body":"一般的な意味\n満たされない状況から離れ、別の道を探す姿です。すでに持っているものを捨てても、より重要なものを求める転換を示します。\n\n正位置のキーワード\n離脱、探求、見切り、旅立ち、価値の再検討\n\n逆位置のキーワード\n離れがたさ、引き返すこと、漂流、同じ場所への固執","source":""},"cups_09":{"body":"一般的な意味\n望んだものを受け取り、満足を味わう札です。個人的な喜びや快適さに恵まれる一方、それが本当に十分なのかも問われます。\n\n正位置のキーワード\n満足、願いの成就、享受、充足、好結果\n\n逆位置のキーワード\n過剰な欲望、うわべの満足、期待外れ、自己満足","source":""},"cups_10":{"body":"一般的な意味\n感情的な結びつきが安定し、喜びを共にする関係です。家族や共同体、長く安心して属せる場所を表します。\n\n正位置のキーワード\n円満、幸福、家族、調和、共通の喜び\n\n逆位置のキーワード\n不和、理想の押しつけ、表面だけの調和、価値観のずれ","source":""},"cups_11":{"body":"一般的な意味\n柔らかな感受性や、心に届く知らせを表します。想像力に富む人物、好意の表明、作品の着想として現れることもあります。\n\n正位置のキーワード\n感性、好意、知らせ、想像力、素直さ\n\n逆位置のキーワード\n幼い感情、気まぐれ、甘い誘い、誤解","source":""},"cups_12":{"body":"一般的な意味\n心に描いた理想を追い、言葉や行動で近づく人物です。誘い、提案、芸術的な働きかけなど、感情を運ぶ役割を持ちます。\n\n正位置のキーワード\n誘い、提案、求愛、優雅さ、理想の追求\n\n逆位置のキーワード\n口約束、見せかけ、感情の揺れ、失望","source":""},"cups_13":{"body":"一般的な意味\n感情を深く理解し、静かに受け止める人物や姿勢です。豊かな想像力と細やかな観察が、言葉にならない気持ちを読み取ります。\n\n正位置のキーワード\n共感、受容、想像力、思いやり、洞察\n\n逆位置のキーワード\n感情への没入、依存、過敏さ、境界の曖昧さ","source":""},"cups_14":{"body":"一般的な意味\n強い感情を抱えながら、落ち着いて関係を保つ人物です。理解と節度をもって仲介し、感情を創作や判断へ結びつけます。\n\n正位置のキーワード\n寛容、情緒の安定、理解、仲介、成熟\n\n逆位置のキーワード\n感情操作、二面性、不誠実、抑えた怒り","source":""},"swords_01":{"body":"一般的な意味\n曖昧なものを切り分け、事実や方針を明確にする力です。鋭い判断は突破口にもなりますが、言葉や決断の厳しさも伴います。\n\n正位置のキーワード\n明晰、決断、真実、突破、知的な勝利\n\n逆位置のキーワード\n混乱、誤判断、冷酷な言葉、過剰な力","source":""},"swords_02":{"body":"一般的な意味\n相反する立場の間で判断を保留している状態です。均衡は保たれていても、避けた情報や感情に向き合う必要が残っています。\n\n正位置のキーワード\n保留、均衡、休戦、板挟み、慎重な判断\n\n逆位置のキーワード\n迷いの増大、隠し事の露見、不均衡、選択を迫られること","source":""},"swords_03":{"body":"一般的な意味\n厳しい事実や言葉がもたらす痛みです。失望や別離を認める過程でもあり、傷ついた理由を明確にする札です。\n\n正位置のキーワード\n悲しみ、別離、衝撃、対立、痛い真実\n\n逆位置のキーワード\n和解、痛みの緩和、悲嘆の長期化、抑えた悲しみ","source":""},"swords_04":{"body":"一般的な意味\n争いや活動をいったん休め、回復の時間を取る札です。行動を急がず、距離を置いて状況を整理することに意味があります。\n\n正位置のキーワード\n休止、静養、退避、熟考、休戦\n\n逆位置のキーワード\n再開、落ち着けなさ、休息不足、消耗の継続","source":""},"swords_05":{"body":"一般的な意味\n勝つために払う代償や、後味の悪い争いです。優位を得ても信頼を損なう場合があり、争いを続ける価値そのものが問われます。\n\n正位置のキーワード\n対立、屈辱、損失、不名誉な勝利、利己心\n\n逆位置のキーワード\n和解の模索、敗北の受容、遺恨、争いの蒸し返し","source":""},"swords_06":{"body":"一般的な意味\n難しい場所から離れ、より穏やかな状況へ移る過程です。問題が完全に消えていなくても、援助や距離によって前進できます。\n\n正位置のキーワード\n移行、避難、旅、援助、状況の改善\n\n逆位置のキーワード\n移行の難航、引き戻されること、未解決の問題、足止め","source":""},"swords_07":{"body":"一般的な意味\n正面から進まず、策や隠密な行動によって目的へ近づく札です。機転と独立性が働く一方、欺きや責任回避の可能性も読みます。\n\n正位置のキーワード\n策略、機転、秘密、単独行動、抜け道\n\n逆位置のキーワード\n露見、告白、助言を受けること、策略の失敗","source":""},"swords_08":{"body":"一般的な意味\n制約や恐れのために、動ける道が見えにくい状態です。外側の条件と自分が想定した限界を分けることで、出口を探します。\n\n正位置のキーワード\n拘束、制限、無力感、行き詰まり、恐れ\n\n逆位置のキーワード\n解放、打開、制約の見直し、自由への一歩","source":""},"swords_09":{"body":"一般的な意味\n不安や後悔が頭から離れず、苦しみが膨らむ札です。現実に起きていることと、恐れによって思い描いたことの区別が焦点になります。\n\n正位置のキーワード\n苦悩、不眠、後悔、自責、強い不安\n\n逆位置のキーワード\n不安の緩和、打ち明けること、長引く心配、孤立した苦悩","source":""},"swords_10":{"body":"一般的な意味\n続けられない状況が、はっきり終わる札です。痛い結末であっても、一つの局面の底が見え、次を考える余地が生まれます。\n\n正位置のキーワード\n終局、破綻、敗北、限界、決定的な区切り\n\n逆位置のキーワード\n再起の兆し、最悪の回避、終わりへの抵抗、回復の途上","source":""},"swords_11":{"body":"一般的な意味\n周囲を警戒し、情報や言葉を鋭く扱う人物です。調査や学習に向く一方、噂や詮索、早すぎる断定にも結びつきます。\n\n正位置のキーワード\n警戒、調査、観察、学習、機敏な思考\n\n逆位置のキーワード\n詮索、噂、軽率な発言、誤情報、過剰な警戒","source":""},"swords_12":{"body":"一般的な意味\n明確な目的へ素早く突き進む人物や出来事です。論戦や難局を突破する力がありますが、他者や細部を置き去りにしやすい面もあります。\n\n正位置のキーワード\n迅速、断行、論戦、突破、強い決意\n\n逆位置のキーワード\n無謀、攻撃性、独断、衝突、性急な結論","source":""},"swords_13":{"body":"一般的な意味\n経験に裏打ちされた明晰さと、情に流されない判断を表します。厳しい言葉や境界を示す人物として現れ、冷たさと公正さの両面を持ちます。\n\n正位置のキーワード\n識別、独立、厳格さ、洞察、率直な言葉\n\n逆位置のキーワード\n冷酷さ、皮肉、偏見、操作、容赦のない裁き","source":""},"swords_14":{"body":"一般的な意味\n事実と規則をもとに、厳しく決断を下す人物です。権限や専門知識を持ち、問題の構造を見通して判断します。\n\n正位置のキーワード\n理性、公正、権限、専門性、決断力\n\n逆位置のキーワード\n圧政、恣意的な判断、冷酷、権力の濫用","source":""},"pentacles_01":{"body":"一般的な意味\n仕事や暮らしに根を下ろす、新しい機会や資源です。小さな種を手入れして育てるように、具体的な行動によって実りへ結びつけます。\n\n正位置のキーワード\n機会、資源、着実な始まり、豊かさ、実益\n\n逆位置のキーワード\n機会の見落とし、準備不足、浪費、実現の遅れ","source":""},"pentacles_02":{"body":"一般的な意味\n複数の用事や資源をやりくりし、変化に対応する札です。固定した均衡よりも、動きながら優先順位を調整する力が必要になります。\n\n正位置のキーワード\n柔軟性、両立、やりくり、適応、調整\n\n逆位置のキーワード\n手一杯、不均衡、優先順位の混乱、管理不足","source":""},"pentacles_03":{"body":"一般的な意味\n技術や役割を持ち寄り、具体的な成果を作る札です。専門性が評価され、協力や学びを通じて仕事の質が高まります。\n\n正位置のキーワード\n協働、技能、評価、計画、学習\n\n逆位置のキーワード\n連携不足、未熟な仕事、役割の不一致、評価不足","source":""},"pentacles_04":{"body":"一般的な意味\n得たものを確保し、生活や立場の安定を守る札です。堅実な管理が役立つ一方、失う恐れから何も動かせなくなる面もあります。\n\n正位置のキーワード\n保持、蓄え、保守、安定、所有\n\n逆位置のキーワード\n手放すこと、浪費、執着、守りすぎ、資源の停滞","source":""},"pentacles_05":{"body":"一般的な意味\n必要な資源や支えが乏しく、困難を感じる札です。孤立や排除の問題も含み、利用できる援助や協力先の存在が焦点になります。\n\n正位置のキーワード\n欠乏、困窮、疎外、苦境、孤立\n\n逆位置のキーワード\n支援の発見、改善の兆し、再建、困難の長期化","source":""},"pentacles_06":{"body":"一般的な意味\n資源や知識、時間を与えたり受け取ったりする関係です。援助のありがたさとともに、交換が公平か、立場が偏っていないかを見ます。\n\n正位置のキーワード\n援助、分配、寛大さ、返礼、公平な交換\n\n逆位置のキーワード\n不公平、見返りの要求、依存、一方的な援助","source":""},"pentacles_07":{"body":"一般的な意味\n育ててきたものを点検し、収穫まで待つ札です。すぐの結果よりも、労力に見合う成長があるかを見て、続け方を考えます。\n\n正位置のキーワード\n忍耐、点検、育成、長期的な成果、待機\n\n逆位置のキーワード\n焦り、実りの乏しさ、徒労、方向の見直し","source":""},"pentacles_08":{"body":"一般的な意味\n繰り返し手を動かし、技術と品質を磨く姿です。派手さよりも、丁寧な仕事や学習の積み重ねが成果を作ります。\n\n正位置のキーワード\n修練、勤勉、技能、集中、丁寧な仕事\n\n逆位置のキーワード\n手抜き、単調さ、未熟、完璧主義、集中不足","source":""},"pentacles_09":{"body":"一般的な意味\n積み重ねによって得た安定や、美しい暮らしを味わう札です。他人任せにせず、自分で選べる余裕と独立性を表します。\n\n正位置のキーワード\n自立、実り、洗練、余裕、達成の享受\n\n逆位置のキーワード\n虚飾、依存、浪費、基盤の弱さ、満たされない豊かさ","source":""},"pentacles_10":{"body":"一般的な意味\n長く続く基盤や、共同体に蓄えられた資産を表します。家、事業、相続、伝統など、個人を超えて受け継ぐものが焦点です。\n\n正位置のキーワード\n繁栄、継承、家系、長期的な安定、蓄積\n\n逆位置のキーワード\n継承の問題、内輪の不和、基盤の動揺、家のしがらみ","source":""},"pentacles_11":{"body":"一般的な意味\n実際に役立つ知識や技術を、丁寧に学ぶ人物です。新しい仕事や学習の知らせ、現実的な目標を育てる姿勢を表します。\n\n正位置のキーワード\n学習、勤勉、具体的な目標、好機、基礎作り\n\n逆位置のキーワード\n怠慢、準備不足、非現実的な計画、学びの停滞","source":""},"pentacles_12":{"body":"一般的な意味\n派手な近道よりも、確かな手順を繰り返す人物です。責任感と持続力によって成果を守り、時間をかけて前進します。\n\n正位置のキーワード\n堅実、責任感、忍耐、継続、信頼\n\n逆位置のキーワード\n停滞、頑固、惰性、働きすぎ、柔軟性不足","source":""},"pentacles_13":{"body":"一般的な意味\n暮らしや資源を巧みに整え、周囲を豊かにする人物です。実用的な配慮と美意識を兼ね備え、育てたものを惜しまず分かち合います。\n\n正位置のキーワード\n豊穣、実務、寛大さ、居心地のよさ、資源の管理\n\n逆位置のキーワード\n過干渉、浪費、物への執着、世話の偏り","source":""},"pentacles_14":{"body":"一般的な意味\n経験と管理能力によって、持続する豊かさを築く人物です。信頼できる実務家、経営者、家や土地を守る立場として現れます。\n\n正位置のキーワード\n成功、実務能力、信頼、繁栄、安定した基盤\n\n逆位置のキーワード\n強欲、保守への固執、独占、物質偏重、管理の失敗","source":""}};
function cardTextRecord(c){return Object.prototype.hasOwnProperty.call(cardTexts,c.id)?cardTexts[c.id]:DEFAULT_CARD_TEXTS[c.id];}
let detailTextVisible=true,cardTexts={};
try{cardTexts=JSON.parse(localStorage.getItem('tabula_card_texts_v1')||'{}')}catch(e){}
// Remove the retired introductory note from previously saved copies only.
try{let changed=false;for(const record of Object.values(cardTexts)){if(record&&typeof record==='object'&&record.source==="一般的なウェイト系の現代的解釈をもとにした初期解説。原典の逐語訳ではありません。"){record.source='';changed=true;}}if(changed)localStorage.setItem('tabula_card_texts_v1',JSON.stringify(cardTexts));}catch(e){}
function renderDetailText(root,c){
 const record=cardTextRecord(c),text=typeof record==='string'?record:record?.body||'',source=typeof record==='object'?record?.source||'':'';
 root.replaceChildren();root.hidden=!detailTextVisible||!text.trim();root.parentElement.classList.toggle('has-copy',!root.hidden);
 if(root.hidden)return;const body=document.createElement('div');body.className='card-prose';body.textContent=text;root.append(body);
 if(source.trim()){const foot=document.createElement('p');foot.className='card-source';foot.textContent=source;root.append(foot);}
}
function editCardText(c){
 const record=cardTextRecord(c),body=typeof record==='string'?record:record?.body||'',source=record?.source||'';
 modal('<h2>'+escapeHTML(c.name)+' · 文章</h2><label class="field">本文<textarea id="cardTextBody" rows="12" placeholder="占いの意味、詩、解説など。空欄なら説明欄は表示しません。"></textarea></label><label class="field">出典・注記（任意）<input id="cardTextSource"></label><p class="mini">改行と段落はそのまま表示されます。本文を空欄にして保存すると、説明欄を非表示にできます。</p><div class="row"><button id="cardTextDefault" type="button">標準の解説に戻す</button><button id="cardTextCancel" type="button">キャンセル</button><button id="cardTextSave" class="primary" type="button">保存</button></div>');
 $('cardTextBody').value=body;$('cardTextSource').value=source;
 $('cardTextDefault').onclick=()=>{const initial=DEFAULT_CARD_TEXTS[c.id];$('cardTextBody').value=initial?.body||'';$('cardTextSource').value=initial?.source||'';};
 $('cardTextCancel').onclick=closeModal;$('cardTextSave').onclick=()=>{const body=$('cardTextBody').value,source=$('cardTextSource').value;cardTexts[c.id]={body,source};localStorage.setItem('tabula_card_texts_v1',JSON.stringify(cardTexts));closeModal();if(GALLERY.visible&&!$('cardGalleryLightbox').hidden)galleryShowLarge(GALLERY.index);};
}
// One shared label per position; preferences are independent of the reading.
let labelMode='card',galleryHideIdentifiers=true,labelPlacement='below';
try{labelPlacement=localStorage.getItem('tabula_label_placement')||'below'}catch(e){}
try{galleryHideIdentifiers=localStorage.getItem('tabula_detail_symbols')!=='show'}catch(e){}
try{labelMode=localStorage.getItem('tabula_label_mode')||'card'}catch(e){}
const labelChoices=[['card','カード名'],['position','ポジション名'],['number','番号のみ'],['off','非表示']];
const labelCycleKey='tabula_label_cycle_v1';
let labelCycleModes=['card','position','off'];
try{const saved=JSON.parse(localStorage.getItem(labelCycleKey)||'null');if(Array.isArray(saved)){const valid=labelChoices.map(x=>x[0]).filter(id=>saved.includes(id));if(valid.length)labelCycleModes=valid;}}catch(e){}
if(!labelChoices.some(c=>c[0]===labelMode))labelMode='card';
// Preserve older saved display modes even when they were not in the default cycle.
if(!labelCycleModes.includes(labelMode))labelCycleModes=labelChoices.map(x=>x[0]).filter(id=>labelCycleModes.includes(id)||id===labelMode);
const labelSelect=document.createElement('select');labelSelect.id='tableLabelMode';labelSelect.setAttribute('aria-label','現在の卓上ラベル');labelSelect.hidden=true;
for(const [value,name] of labelChoices){const o=document.createElement('option');o.value=value;o.textContent=name;labelSelect.append(o)}
labelSelect.value=labelMode;
const labelSettings=document.createElement('details');labelSettings.className='label-cycle-settings';
const labelSummary=document.createElement('summary');labelSummary.textContent='ラベル表示';
const labelHint=document.createElement('p');labelHint.className='mini';labelHint.textContent='卓上ボタンで切り替える項目（1つ以上選択）';
const labelOptions=document.createElement('div');labelOptions.className='label-cycle-options';
const labelInputs=new Map();
for(const [id,name] of labelChoices){
 const label=document.createElement('label');const input=document.createElement('input');input.type='checkbox';input.value=id;input.checked=labelCycleModes.includes(id);input.setAttribute('aria-label',name);
 label.append(input,document.createTextNode(name));labelOptions.append(label);labelInputs.set(id,input);
 input.addEventListener('change',()=>{
  const next=labelChoices.map(x=>x[0]).filter(v=>labelInputs.get(v).checked);
  if(!next.length){input.checked=true;return}
  labelCycleModes=next;
  try{localStorage.setItem(labelCycleKey,JSON.stringify(next))}catch(e){}
  if(!next.includes(labelMode))setTableLabelMode(next[0]);
  syncToolbarLabelCycle();
 });
}
labelSettings.append(labelSummary,labelHint,labelOptions);
const placementSelect=document.createElement('select');placementSelect.id='labelPlacement';placementSelect.setAttribute('aria-label','ラベルの位置');placementSelect.innerHTML='<option value="below">カードの下</option><option value="above">カードの上</option>';placementSelect.value=labelPlacement;placementSelect.onchange=()=>{labelPlacement=placementSelect.value;localStorage.setItem('tabula_label_placement',labelPlacement);refreshTableLabels()};
const placementLabel=document.createElement('label');placementLabel.className='label-cycle-placement';placementLabel.append(document.createTextNode('位置 '),placementSelect);
labelSettings.append(placementLabel,labelSelect);
$('quickLabels').replaceWith(labelSettings);
// Retain legacy lookup used by existing settings sync without a second visible control.
const legacyLabels=document.createElement('button');legacyLabels.id='quickLabels';legacyLabels.hidden=true;labelSettings.after(legacyLabels);
function resetLabelCyclePreferences(){
 labelCycleModes=['card','position','off'];
 for(const [id,input] of labelInputs)input.checked=labelCycleModes.includes(id);
 try{localStorage.removeItem(labelCycleKey)}catch(e){}
 syncToolbarLabelCycle();
}
function syncToolbarLabelCycle(){
 const button=$('toolbarLabelToggle');if(!button)return;
 button.textContent=labelChoices.find(([id])=>id===labelMode)?.[1]||'カード名';
 button.title='ラベル表示を切り替える（'+labelCycleModes.map(id=>labelChoices.find(x=>x[0]===id)?.[1]).join(' → ')+'）';
 button.setAttribute('aria-label',button.title);
 button.setAttribute('data-label-mode',labelMode);
}
function setTableLabelMode(mode){
 if(!labelChoices.some(([id])=>id===mode))return;
 labelMode=mode;labelSelect.value=mode;
 try{localStorage.setItem('tabula_label_mode',mode)}catch(e){}
 refreshTableLabels();syncToolbarLabelCycle();
}
function refreshTableLabels(){
 const zone=$('zone');zone.querySelectorAll('.slot-num').forEach(e=>e.hidden=!spreadWorkbench);zone.querySelectorAll('.zone-label').forEach(e=>e.remove());if(labelMode==='off'||spreadWorkbench)return;
 const slots=getSlots(),m=metrics();
 function add(item,slot,i){
  const t=document.createElement('span');t.className='zone-label unified-label';
  const num=item?.slot==null&&item?'＋':String(i+1);
  let text=num;
  if(labelMode==='position'&&slot)text+=' · '+slot.name;
  if(labelMode==='card'&&item?.faceUp){const c=cards.find(c=>c.id===item.id);text+=' · '+(c?tableCardName(c):'カード')+(item.reversed?'〈逆〉':'');}
  t.textContent=text;t.title=text;
  // Card names follow the card; position names remain anchored to the spread.
  const follow=labelMode==='card'&&item;
  const x=follow?item.x:slot?.x??item.x,y=follow?item.y:slot?.y??item.y;
  const angle=follow?cardDisplayRotation(item):Number(slot?.angle)||0,rad=angle*Math.PI/180;
  const halfHeight=(Math.abs(Math.cos(rad))*m.h+Math.abs(Math.sin(rad))*m.w)/2;
  const lift=follow?cardDisplayLiftPx(item):0;
  t.style.left=x+'%';t.style.top=`calc(${y}% + ${lift+(labelPlacement==='below'?halfHeight+2:-halfHeight-2)}px)`;t.style.setProperty('transform',labelPlacement==='below'?'translate(-50%,0)':'translate(-50%,-100%)','important');
  zone.append(t);
  const zw=zone.offsetWidth,lw=t.getBoundingClientRect().width/tableCamera.scale;
  if(zw&&lw){const center=Math.max(lw/2+3,Math.min(zw-lw/2-3,zw*x/100));t.style.left=center+'px';}

 }
 slots.forEach((slot,i)=>add(state.placed.find(p=>p.slot===i),slot,i));
 state.placed.filter(p=>p.slot==null).forEach(p=>add(p,null,-1));
}
function refreshDraggedSlotLabel(){refreshTableLabels()}
const baseRender=render;render=function(){baseRender();refreshTableLabels()};
labelSelect.addEventListener('change',()=>{setTableLabelMode(labelSelect.value)});
const galleryBody=document.createElement('div');galleryBody.className='detail-body';const galleryImage=$('cardGalleryLarge');galleryImage.before(galleryBody);galleryBody.append(galleryImage);const galleryCopy=document.createElement('aside');galleryCopy.id='galleryCardText';galleryCopy.className='detail-copy';galleryCopy.hidden=true;galleryBody.append(galleryCopy);
const textToggle=document.createElement('button');textToggle.type='button';textToggle.textContent='文章：表示';textToggle.onclick=()=>{detailTextVisible=!detailTextVisible;textToggle.textContent=detailTextVisible?'文章：表示':'文章：非表示';galleryShowLarge(GALLERY.index)};
const textEdit=document.createElement('button');textEdit.type='button';textEdit.textContent='文章を編集';textEdit.onclick=()=>editCardText(GALLERY.listed[GALLERY.index]);document.querySelector('.gallery-lightbox-bar').append(textToggle,textEdit);
const textExport=document.createElement('button');textExport.type='button';textExport.textContent='カード文章を書き出す';document.querySelector('.face-preferences').append(textExport);textExport.onclick=()=>downloadJSON({format:'tabula-card-texts',version:1,texts:{...DEFAULT_CARD_TEXTS,...cardTexts}},'TABULA_card_texts.json');
const textImport=document.createElement('button');textImport.type='button';textImport.textContent='カード文章を読み込む';textExport.after(textImport);const textFile=document.createElement('input');textFile.type='file';textFile.accept='.json,application/json';textFile.hidden=true;textImport.after(textFile);textImport.onclick=()=>textFile.click();textFile.onchange=async()=>{try{const f=textFile.files[0];if(!f)return;const data=JSON.parse(await f.text());if(data.format!=='tabula-card-texts'||!data.texts||Array.isArray(data.texts))throw Error('カード文章のJSONを選択してください。');for(const c of cards){const r=data.texts[c.id];if(typeof r==='string')cardTexts[c.id]={body:r,source:''};else if(r&&typeof r.body==='string')cardTexts[c.id]={body:r.body,source:typeof r.source==='string'?r.source:''};}localStorage.setItem('tabula_card_texts_v1',JSON.stringify(cardTexts));setStatus('カード文章を読み込みました。');if(!$('cardGalleryLightbox').hidden)galleryShowLarge(GALLERY.index);}catch(e){alert(e.message)}finally{textFile.value=''}};

const enlarge=document.createElement('button');enlarge.id='enlargeSelected';enlarge.type='button';enlarge.textContent='拡大';$('cardControls').append(enlarge);
function openTableCard(index){
 const p=state.placed[index];if(!p)return;if(!p.faceUp){setStatus('表向きのカードを選ぶと拡大できます。');return}
 const c=cards.find(c=>c.id===p.id);if(!c)return;
 const position=p.slot!=null?getSlots()[p.slot]:null;
 modal('<h2>'+escapeHTML(c.name)+(p.reversed?'〈逆位置〉':'〈正位置〉')+'</h2>'+(position?'<section class="table-reading-context" aria-label="ポジションの意味"><strong>'+escapeHTML(String(p.slot+1)+'. '+position.name)+'</strong>'+(position.detail?'<p>'+escapeHTML(position.detail)+'</p>':'')+'</section>':'')+'<div class="table-card-view detail-body"><img id="tableCardLarge" alt="'+escapeHTML(c.name)+'"><aside class="detail-copy" id="tableCardText" hidden></aside></div><div class="table-card-footer"><div class="row"><button type="button" id="tableCardPrev">前の札</button><button type="button" id="tableCardNext">次の札</button></div></div>');
 $('modalBg').classList.add('card-viewer-active');$('modalClose').focus();
 const update=()=>{setCardArtwork($('tableCardLarge'),finishedCardSource(c));renderDetailText($('tableCardText'),c);$('tableCardLarge').style.transform=p.reversed?'rotate(180deg)':'';};update();

 const copyToggle=document.createElement('button');copyToggle.type='button';copyToggle.textContent=detailTextVisible?'文章：表示':'文章：非表示';copyToggle.onclick=()=>{detailTextVisible=!detailTextVisible;copyToggle.textContent=detailTextVisible?'文章：表示':'文章：非表示';renderDetailText($('tableCardText'),c)};$('tableCardNext').parentElement.after(copyToggle);
 const visible=state.placed.map((p,i)=>p.faceUp?i:-1).filter(i=>i>=0),at=visible.indexOf(index);
 $('tableCardPrev').disabled=visible.length<2;$('tableCardNext').disabled=visible.length<2;
 $('tableCardPrev').onclick=()=>openTableCard(visible[(at-1+visible.length)%visible.length]);$('tableCardNext').onclick=()=>openTableCard(visible[(at+1)%visible.length]);
}
enlarge.onclick=()=>{tableDetailFocus=enlarge;openTableCard(state.selected)};
const inspectionButton=document.createElement('button');
inspectionButton.id='inspectCards';inspectionButton.type='button';
inspectionButton.innerHTML='<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="10" cy="10" r="6.5"/><path d="m15 15 6 6"/></svg><span>カードを見る</span>';
inspectionButton.setAttribute('aria-pressed','false');
inspectionButton.title='閲覧モードを切り替えます。表向きのカードをクリックすると完成形と説明を表示します。';
document.querySelector('.table-utility-actions').prepend(inspectionButton);
function inspectionEnabled(){return inspectMode&&!spreadWorkbench;}
function setInspectionMode(enabled){
 if(enabled&&spreadWorkbench){setStatus('スプレッドの編集を終えてからカードを見られます。');return;}
 cancelCardLongPress();
 if(enabled){cameraPanMode=false;$('stage').classList.remove('camera-pan-mode','camera-moving');const pan=$('tablePanToggle');if(pan)pan.setAttribute('aria-pressed','false');drag=null;clearDeckPreview();}
 inspectMode=!!enabled;
 inspectionButton.setAttribute('aria-pressed',String(inspectMode));
 inspectionButton.querySelector('span').textContent=inspectMode?'カードを見る：ON':'カードを見る';
 $('surface').classList.toggle('card-inspection-mode',inspectMode);
 render();
 setStatus(inspectMode?'閲覧モード：表向きのカードをクリックすると、完成形と説明が開きます。Escまたは「カードを見る」で通常操作へ戻ります。':'通常操作に戻りました。');
}
inspectionButton.onclick=()=>setInspectionMode(!inspectMode);
function inspectTableCard(index,origin){
 if(!inspectionEnabled())return;
 const item=state.placed[index];if(!item)return;
 if(!item.faceUp){setStatus('この札はまだ伏せられています。閲覧モードを解除して開いてください。');return;}
 tableDetailFocus=origin||inspectionButton;
 // Every new inspection starts with the finished card and its available text.
 // Navigation within that reading keeps any subsequent display choices.
 detailTextVisible=true;
 openTableCard(index);
}
document.addEventListener('keydown',e=>{
 if(GALLERY.visible||/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)||e.target.isContentEditable)return;
 const viewing=$('modalBg').classList.contains('open')&&!!$('tableCardLarge');
 if(e.key==='Escape'){
  if(viewing){e.preventDefault();closeModal();}
  else if(inspectMode&&!$('modalBg').classList.contains('open')){e.preventDefault();setInspectionMode(false);inspectionButton.focus();}
 }else if(viewing&&(e.key==='ArrowLeft'||e.key==='ArrowRight')){
  e.preventDefault();$('tableCard'+(e.key==='ArrowLeft'?'Prev':'Next')).click();
 }
});

function installTableToolLayout(){
 const toolbar=document.querySelector('.toolbar'),utility=document.querySelector('.table-utility-actions');
 const inspect=$('inspectCards'),notebook=$('spreadNotebook');
 inspect.classList.add('toolbar-icon');inspect.querySelector('svg').outerHTML='<svg viewBox="0 0 28 28" width="25" height="25" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="3" y="2" width="15" height="23" rx="2"/><path d="m10.5 6 3 4-3 4-3-4z" stroke-width="1.1"/><path d="M6 20h4"/><circle cx="18" cy="17" r="5.5" fill="#25352f"/><path d="m22 21 4 4" stroke-width="2" stroke-linecap="round"/></svg>';inspect.querySelector('span').classList.add('tool-sr-only');inspect.setAttribute('aria-label','カードを見る');inspect.dataset.toolLabel='カードを見る';
 notebook.classList.add('toolbar-icon');notebook.querySelector('span:last-child').classList.add('tool-sr-only');notebook.dataset.toolLabel='手帖';notebook.title='手帖を開く';
 const fit=document.createElement('button');fit.type='button';fit.id='mobileTableFit';fit.textContent='全景';fit.title='卓全体を表示';fit.setAttribute('aria-label','卓全体を表示');fit.onclick=resetTableCamera;
 $('newSessionStandalone').textContent='新しい占い';
 const quickSpread=document.createElement('div');quickSpread.className='toolbar-spread-shortcut';quickSpread.title='展開法を選択';quickSpread.innerHTML='<span>展開法</span><select id="spreadQuickSelect" aria-label="展開法を選択"></select>';toolbar.append($('desktopTableViews'),fit,$('tableZoomLabel'),quickSpread,inspect,notebook,$('newSessionStandalone'));syncSpreadShortcut();$('spreadQuickSelect').addEventListener('change',e=>{const source=$('spread');source.value=e.target.value;source.dispatchEvent(new Event('change',{bubbles:true}));syncSpreadShortcut();});
 // A compact information control beside the active spread; the atlas is its second entrance.
 const spreadInfo=document.createElement('button');spreadInfo.id='spreadInfoButton';spreadInfo.type='button';
 spreadInfo.textContent='ⓘ';spreadInfo.title='このスプレッドの解説を見る';spreadInfo.setAttribute('aria-label','現在のスプレッドの解説');
 quickSpread.append(spreadInfo);spreadInfo.onclick=e=>{e.preventDefault();openSpreadGuide(settings.spread)};
 const atlasMenu=document.createElement('button');atlasMenu.id='spreadAtlasMenu';atlasMenu.type='button';atlasMenu.className='spread-atlas-menu';
 atlasMenu.textContent='スプレッド図鑑';atlasMenu.onclick=()=>openSpreadAtlas();
 $('spread').closest('label').after(atlasMenu);
 const gallery=$('cardGalleryOpen');gallery.innerHTML='<svg viewBox="0 0 24 24" width="19" height="21" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="3" y="3" width="13" height="18" rx="2" transform="rotate(-9 10 12)"/><rect x="7" y="2" width="13" height="18" rx="2"/><path d="m13.5 6 3 4-3 4-3-4z"/></svg><span>カード図鑑</span>';gallery.setAttribute('aria-label','カード図鑑を開く');document.querySelector('.deck-edit-actions').after(gallery);
 const slider=$('cardSizeScale');const field=slider.closest('label');field.hidden=true;field.style.display='none';const sizeControls=document.createElement('div');sizeControls.className='toolbar-card-size';sizeControls.title='カードそのものの大きさを調整';const buttons={};for(const [id,label,title] of [['zoomOut','−','カードサイズを小さくする'],['zoomReset','標準','この展開法の標準サイズに戻す'],['zoomIn','＋','カードサイズを大きくする']]){const b=$(id);b.textContent=label;b.title=title;b.setAttribute('aria-label',title);buttons[id]=b;}const sizeValue=document.createElement('output');sizeValue.id='cardSizeQuickValue';sizeValue.title='カードサイズ倍率';sizeValue.setAttribute('aria-label','カードサイズ倍率');const sizeLabel=document.createElement('span');sizeLabel.className='toolbar-size-label';sizeLabel.textContent='札';const labelToggle=document.createElement('button');labelToggle.type='button';labelToggle.id='toolbarLabelToggle';
 labelToggle.onclick=()=>{const index=labelCycleModes.indexOf(labelMode);setTableLabelMode(labelCycleModes[(index+1)%labelCycleModes.length]);};
 sizeControls.append(sizeLabel,labelToggle,buttons.zoomOut,sizeValue,buttons.zoomIn,buttons.zoomReset);quickSpread.before(sizeControls);syncToolbarLabelCycle();const mobileActions=document.createElement('div');mobileActions.className='mobile-cockpit-actions';mobileActions.append(quickSpread,inspect,notebook,$('newSessionStandalone'));toolbar.append(mobileActions);updateCardSizeQuickValue();
 const onResize=()=>{fit.hidden=!mobileCameraEnabled();};window.addEventListener('resize',onResize);onResize();
 applyTableCamera();
}

let selectedCandle=null;
const candlePalette=[['蜜蝋','#d8b977'],['白','#eee4ce'],['黒','#343239'],['赤','#a62f30'],['橙','#d07c32'],['黄','#e4c65c'],['緑','#44704b'],['青','#3c6091'],['紫','#785080'],['桃','#ce929a'],['茶','#73503a'],['銀','#a8adb2']];
function altarCandles(){if(!Array.isArray(settings.candles))settings.candles=[{id:'left',x:5,y:25,color:'#d8b977',lit:true},{id:'right',x:95,y:25,color:'#d8b977',lit:true}];for(const c of settings.candles){if(c.id==='left'&&[16,8].includes(c.x)&&c.y===25)c.x=5;if(c.id==='right'&&[84,92].includes(c.x)&&c.y===25)c.x=95;}return settings.candles;}
function candleArtwork(c,i){const id='altar-candle-'+(++artworkSerial),top=c.length==='short'?80:47,shift=top-47;return `<svg viewBox="0 0 120 210" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><defs>
<linearGradient id="${id}-brass"><stop stop-color="#38271c"/><stop offset=".18" stop-color="#8e6735"/><stop offset=".39" stop-color="#dbc28a"/><stop offset=".49" stop-color="#9d783e"/><stop offset=".68" stop-color="#5e4227"/><stop offset=".85" stop-color="#bd9a57"/><stop offset="1" stop-color="#473021"/></linearGradient>
<linearGradient id="${id}-wax"><stop stop-color="#000" stop-opacity=".42"/><stop offset=".24" stop-color="#000" stop-opacity="0"/><stop offset=".43" stop-color="#fff4d6" stop-opacity=".38"/><stop offset=".7" stop-color="#fff" stop-opacity=".04"/><stop offset="1" stop-color="#000" stop-opacity=".36"/></linearGradient>
<radialGradient id="${id}-light"><stop stop-color="#ffd994" stop-opacity=".28"/><stop offset="1" stop-color="#e9b05c" stop-opacity="0"/></radialGradient>
<radialGradient id="${id}-shadow"><stop stop-opacity=".65"/><stop offset="1" stop-opacity="0"/></radialGradient>
<linearGradient id="${id}-flame" x2="0" y2="1"><stop stop-color="#d88635"/><stop offset=".4" stop-color="#ffc863"/><stop offset=".78" stop-color="#fff6d6"/><stop offset="1" stop-color="#9bb5d9"/></linearGradient></defs>
<ellipse cx="62" cy="196" rx="57" ry="12" fill="url(#${id}-shadow)"/>
${c.lit?`<ellipse cx="60" cy="186" rx="59" ry="22" fill="url(#${id}-light)"/><ellipse cx="60" cy="${top-11}" rx="38" ry="35" fill="url(#${id}-light)"/>`:''}
<g fill="url(#${id}-brass)" stroke="#4c3824" stroke-width=".7">
<ellipse cx="60" cy="190" rx="37" ry="9"/>
<path d="M23 187L24 183Q36 180 48 171Q56 161 55 151L54 145H66L65 151Q64 161 72 171Q84 180 96 183L97 187Q60 199 23 187Z"/>
<ellipse cx="60" cy="184" rx="35" ry="8"/>
<path d="M29 182Q45 177 51 164Q56 154 54 145H66Q64 154 69 164Q75 177 91 182Q60 193 29 182Z"/>
<path d="M54 150Q51 147 54 144Q59 141 53 138Q47 135 47 128L44 118Q60 112 76 118L73 128Q73 135 67 138Q61 141 66 144Q69 147 66 150Z"/>
<ellipse cx="60" cy="118" rx="16" ry="4"/>
</g>
<path d="M29 187Q60 197 92 187M36 182Q60 189 84 182M49 121Q60 124 71 121M57 151Q60 168 45 178" fill="none" stroke="#e9ce93" stroke-opacity=".46" stroke-width=".7"/>
<path d="M48 ${top}Q60 ${top-3} 72 ${top}L72 118Q60 122 48 118Z" fill="${c.color}"/><path d="M48 ${top}Q60 ${top-3} 72 ${top}L72 118Q60 122 48 118Z" fill="url(#${id}-wax)"/>
<g transform="translate(0 ${shift})"><path d="M48 48Q51 52 51 63Q51 70 54 68L55 53Q57 49 59 54L61 75Q65 80 66 72L66 52Q69 54 72 49" fill="none" stroke="#fff1c8" stroke-opacity=".3" stroke-width="2"/>
<ellipse cx="60" cy="47" rx="12" ry="4" fill="${c.color}" stroke="#e7cf99" stroke-opacity=".5"/><ellipse cx="60" cy="47" rx="4" ry="1.6" fill="#725537"/><path d="M60 47Q58 43 60 39" stroke="#35271f" stroke-width="1.5" fill="none"/>
${c.lit?`<g class="candle-flame" style="animation-delay:-${i*.73}s"><path d="M60 43C45 40 54 23 61 13C59 27 73 37 60 43Z" fill="url(#${id}-flame)"/><path d="M60 42Q55 37 61 29Q65 38 60 42" fill="#fff7d9"/></g>`:''}</g><path d="M44 118Q60 124 76 118" fill="none" stroke="#b89b5d" stroke-width="1.4"/></svg>`;}
function renderCandles(){const host=$('altar');host.replaceChildren();host.hidden=!settings.altar;host.style.display=settings.altar?'':'none';if(!settings.altar)return;const list=altarCandles();list.forEach((c,i)=>{const node=document.createElement('button');node.type='button';node.className='altar-object';node.title='キャンドルを選択・ドラッグで移動';node.setAttribute('aria-label','キャンドル '+(i+1));node.setAttribute('aria-pressed',String(c.id===selectedCandle));node.style.left=c.x+'%';node.style.top=c.y+'%';node.style.setProperty('--candle-scale',String(Math.max(.6,Math.min(1.8,(Number(c.size)||100)/100))));node.innerHTML=candleArtwork(c,i);host.append(node);
 let gesture=null;
 node.onpointerdown=e=>{if(e.button!==0)return;e.stopPropagation();selectedCandle=c.id;syncCandleControls();host.querySelectorAll('.altar-object').forEach(n=>n.setAttribute('aria-pressed',String(n===node)));const r=host.getBoundingClientRect();gesture={id:e.pointerId,x:e.clientX,y:e.clientY,ox:c.x,oy:c.y,w:r.width,h:r.height};node.setPointerCapture(e.pointerId);};
 node.onpointermove=e=>{if(!gesture||gesture.id!==e.pointerId)return;e.stopPropagation();const pc=window.innerWidth>780;c.x=Math.max(pc?0:5,Math.min(pc?100:95,gesture.ox+(e.clientX-gesture.x)/gesture.w*100));c.y=Math.max(pc?5:23,Math.min(pc?100:96,gesture.oy+(e.clientY-gesture.y)/gesture.h*100));node.style.left=c.x+'%';node.style.top=c.y+'%';};
 const finish=()=>{if(gesture){gesture=null;saveLocal();}};node.onpointerup=finish;node.onpointercancel=finish;node.onclick=e=>{e.stopPropagation();selectedCandle=c.id;syncCandleControls();};node.onkeydown=e=>{const v={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(v){e.preventDefault();const pc=window.innerWidth>780;c.x=Math.max(pc?0:5,Math.min(pc?100:95,c.x+v[0]));c.y=Math.max(pc?5:23,Math.min(pc?100:96,c.y+v[1]));node.style.left=c.x+'%';node.style.top=c.y+'%';saveLocal();}};
 });syncCandleControls();}
function syncCandleControls(){const list=altarCandles(),c=list.find(c=>c.id===selectedCandle);$('candleSelection').textContent=c?'選択中：キャンドル '+(list.indexOf(c)+1):'キャンドルをクリックして選択';for(const id of ['candleLength','candleSize','candleLit','candleRemove','candleDeselect'])$(id).disabled=!c;$('candleSwatches').querySelectorAll('button').forEach(b=>{b.disabled=!c;const active=!!c&&b.dataset.color===c.color;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});$('candleColorName').textContent=c?(candlePalette.find(p=>p[1]===c.color)?.[0]||''):'色を変更するキャンドルを選択';if(c){$('candleLength').value=c.length==='short'?'short':'long';$('candleSize').value=String([60,80,100,120,140,160,180].includes(Number(c.size))?Number(c.size):100);$('candleColor').value=c.color;$('candleLit').checked=c.lit;} }
function installCandles(){const section=$('altarToggle').closest('section');section.querySelector('h2 .section-title').textContent='Ⅲ. アルター設定';const panel=document.createElement('div');panel.className='candle-settings stack';panel.innerHTML='<div class="row"><button type="button" id="candleAdd">キャンドルを追加</button></div><div class="mini" id="candleSelection"></div><label class="field">蝋燭の長さ<select id="candleLength"><option value="long">長</option><option value="short">短</option></select></label><label class="field">表示サイズ<select id="candleSize"><option value="60">60%（小）</option><option value="80">80%</option><option value="100">100%（標準）</option><option value="120">120%</option><option value="140">140%</option><option value="160">160%</option><option value="180">180%（最大）</option></select></label><span class="field" id="candleColorHeading">キャンドルの色を選ぶ</span><div class="swatches" id="candleSwatches" role="group" aria-labelledby="candleColorHeading"></div><div class="mini" id="candleColorName"></div><select id="candleColor" hidden aria-hidden="true">'+candlePalette.map(([name,color])=>'<option value="'+color+'">'+name+'</option>').join('')+'</select><label class="choice"><input type="checkbox" id="candleLit">火を灯す</label><button type="button" id="candleRemove">選択したキャンドルを取り除く</button><button type="button" id="candleDeselect">選択を解除</button><p class="mini">ドラッグで配置。テーブルの余白を押すと選択を解除できます。</p>';$('altarToggle').closest('label').after(panel);
 const clothHeading=document.createElement('div');clothHeading.className='field';clothHeading.id='clothColorHeading';clothHeading.textContent='クロスの色を選ぶ';$('swatches').before(clothHeading);$('swatches').setAttribute('role','group');$('swatches').setAttribute('aria-labelledby','clothColorHeading');
 const deselect=()=>{selectedCandle=null;$('altar').querySelectorAll('.altar-object').forEach(n=>n.setAttribute('aria-pressed','false'));syncCandleControls();};$('candleDeselect').onclick=deselect;
 $('stage').addEventListener('pointerdown',e=>{if(!e.target.closest('.altar-object'))deselect();},true);
 document.addEventListener('keydown',e=>{if(e.key==='Escape')deselect();});
 candlePalette.forEach(([name,color])=>{const b=document.createElement('button');b.type='button';b.className='swatch';b.dataset.color=color;b.style.background=color;b.title=name;b.setAttribute('aria-label',name);b.onclick=()=>{$('candleColor').value=color;$('candleColor').dispatchEvent(new Event('change'));};$('candleSwatches').append(b);});
 $('candleAdd').onclick=()=>{const list=altarCandles(),c={id:'c'+Date.now()+Math.random().toString(36).slice(2,6),x:25+(list.length*17)%50,y:30+(list.length*11)%55,color:$('candleColor').value||'#d8b977',length:$('candleLength').value||'long',size:100,lit:true};list.push(c);selectedCandle=c.id;settings.altar=true;$('altarToggle').checked=true;render();saveLocal();};
 const change=()=>{const c=altarCandles().find(c=>c.id===selectedCandle);if(!c)return;c.color=$('candleColor').value;c.length=$('candleLength').value;c.size=Number($('candleSize').value)||100;c.lit=$('candleLit').checked;renderCandles();saveLocal();};$('candleLength').onchange=change;$('candleSize').onchange=change;$('candleColor').onchange=change;$('candleLit').onchange=change;$('candleRemove').onclick=()=>{settings.candles=altarCandles().filter(c=>c.id!==selectedCandle);selectedCandle=null;renderCandles();saveLocal();};}
installCandles();
const renderBeforeCandles=render;render=function(){renderBeforeCandles();renderCandles();};

const dealWorkbenchController=TabulaDealWorkbench.install({
 deck:()=>state.deck.map(c=>({...c})),
 editorDeck:()=>[...state.deck,...state.placed,...(state.removed||[])].map(c=>({...c})),
 spreadCount:()=>settings.spread==='free'?0:getSlots().length,
 defaultOrder:()=>getDealOrder(),
 shuffleRecipes:()=>recipes.map(r=>({id:r.id,name:r.name,steps:r.steps.map(st=>({...st}))})),
 canStart:()=>!state.placed.length&&!(state.removed||[]).length,
 commit:(cards,dealt=[],removed=[],positionOptions={})=>{
  const slots=getSlots();let order=settings.spread==='free'?[]:getDealOrder();
  if(positionOptions.mode==='random'){order=order.slice();for(let i=order.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[order[i],order[j]]=[order[j],order[i]]}}
  if(positionOptions.mode==='custom'&&settings.spread!=='free')order=parseDealOrderInput(positionOptions.order);
  const placed=dealt.map((card,i)=>{
    const slot=i<order.length?order[i]:null;
    const pos=slot!==null&&slots[slot]?slots[slot]:{x:20+(i%7)*10,y:22+(Math.floor(i/7)%5)*13,angle:0};
    return {...card,slot,x:pos.x,y:pos.y,angle:pos.angle,origin:{...pos},faceUp:false};
  });
  const tableIds=new Set(positionOptions.tableRemovedIds||[]);
  const tableCards=removed.filter(c=>tableIds.has(c.id));
  const zoneRect=$('zone').getBoundingClientRect(),surfaceRect=$('surface').getBoundingClientRect(),size=metrics();
  const pileX=(surfaceRect.left+surfaceRect.width*.057+size.w/2-zoneRect.left)/zoneRect.width*100;
  const pileY=(surfaceRect.top+surfaceRect.height*.058+size.h/2-zoneRect.top)/zoneRect.height*100;
  const placeRemoved=(list)=>list.map((c,i)=>{const pos={x:pileX+i*.12,y:pileY+i*.12,angle:0};return {...c,slot:null,...pos,origin:{...pos},faceUp:false,auxiliaryPile:true,dragOrder:i+1}});
  const placeDealt=(list)=>placed.slice(0,list.length);
  state.selected=null;state.completionShown=false;state.dealCheckpoint=null;
  const timeline=Array.isArray(positionOptions.timeline)?positionOptions.timeline:null;
  if(timeline&&timeline.length){
    const finalIds=dealt.map(c=>c.id).join('|')+';'+removed.map(c=>c.id).join('|');
    const last=timeline[timeline.length-1];
    if(last.dealt.map(c=>c.id).join('|')+';'+last.removed.map(c=>c.id).join('|')!==finalIds)throw Error('ディール工程の最終結果が一致しません');
    const sequence=[{type:'start',label:'開始',stock:[...state.deck],piles:[],selected:[],dealt:[],removed:[]},...timeline];
    let cursor=0;
    function nextStage(){
      const frame=sequence[cursor];
      const previousPlaced=state.placed.filter(c=>!c.auxiliaryPile).length,previousRemoved=state.placed.filter(c=>c.auxiliaryPile).length;
      const sourceRect=$('deck').getBoundingClientRect();
      const stock=[...frame.stock,...frame.piles.flat(),...frame.selected];
      state.deck=stock.map(c=>({...c}));
      state.placed=[...placeRemoved(frame.removed),...placeDealt(frame.dealt)];
      state.removed=[];
      render();saveLocal();
      if(frame.dealt.length>previousPlaced)animateCardFromDeck(state.placed.length-1,sourceRect);
      else if(frame.removed.length>previousRemoved)animateCardFromDeck(frame.removed.length-1,sourceRect);
      setStatus('独自ディール '+cursor+' / '+timeline.length+'：'+frame.label+'（配札 '+frame.dealt.length+'枚・除外 '+frame.removed.length+'枚）');
      if(frame.type==='dealt'||frame.type==='removed'||frame.type==='take')play('deal');
      cursor++;
      if(cursor<sequence.length){
        if(frame.type==='shuffle-recipe'){
          const recipe=recipes.find(r=>r.id===frame.recipeId);
          const rounds=(recipe?.steps||[]).flatMap(raw=>{const step=normStep(raw);return Array.from({length:step.reps},(_,i)=>({step,i}))});
          let round=0;
          function animateRound(){
            if(round>=rounds.length){play('shuffle');setTimeout(()=>requestAnimationFrame(()=>requestAnimationFrame(nextStage)),300);return}
            const {step,i}=rounds[round++];
            const direction=step.washDirection==='alternate'?(i%2===0?'cw':'ccw'):step.washDirection;
            setStatus('独自ディール・シャッフル：'+methods[step.method]+' '+round+'/'+rounds.length);
            animateShuffle(step.method,animateRound,false,{direction,piles:step.groups});
          }
          if(rounds.length)animateRound();else setTimeout(nextStage,300);
        }else setTimeout(()=>requestAnimationFrame(nextStage),frame.type==='split'||frame.type==='collect'?430:380);
      }
      else{
        state.deck=cards.map(c=>({...c}));
        state.placed=[...placeRemoved(tableCards),...placed];
        state.removed=removed.filter(c=>!tableIds.has(c.id)).map(c=>({...c}));
        render();saveLocal();
        setStatus('独自ディールを完了しました。'+dealt.length+'枚を配札、'+removed.length+'枚を除外しました。');
      }
    }
    // Give the browser a paint before beginning a potentially long animated procedure.
    requestAnimationFrame(()=>requestAnimationFrame(nextStage));return;
  }
  state.deck=cards.map(c=>({...c}));
  state.placed=[...placeRemoved(tableCards),...placed];
  state.removed=removed.filter(c=>!tableIds.has(c.id)).map(c=>({...c}));
  render();saveLocal();setStatus('独自ディールを完了しました。');

 },
 status:setStatus
});
function installTableActionSettings(){
 const shuffleChoice=$('quickShuffleChoice'),dealChoice=$('quickDealChoice');
 if(shuffleChoice)$('tableShuffleChoiceSlot').append(shuffleChoice);
 if(dealChoice)$('tableDealChoiceSlot').append(dealChoice);
 const washDirection=$('tableWashDirection'),washRounds=$('tableWashRounds'),cutCount=$('tableCutCount');
 const update=()=>{washDirection.value=settings.quickWashDirection||'random';washRounds.value=String(settings.quickWashRounds||1);cutCount.value=String(settings.cutCount??3)};
 washDirection.onchange=()=>{settings.quickWashDirection=washDirection.value;$('quickWashDirection').value=washDirection.value;updateStandaloneAvailability();saveLocal()};
 washRounds.onchange=()=>{settings.quickWashRounds=Number(washRounds.value);$('quickWashRounds').value=washRounds.value;updateStandaloneAvailability();saveLocal()};
 cutCount.onchange=()=>{settings.cutCount=Number(cutCount.value);$('cutCountSetting').value=cutCount.value;updateStandaloneAvailability();saveLocal()};
 for(const id of ['quickWashDirection','quickWashRounds','cutCountSetting'])$(id).addEventListener('change',update);
 const previousSync=sync;sync=function(){previousSync();update()};
 update();
}
installTableActionSettings();
loadSnapshots();syncRecipes();applyVisuals();loadSpreadLibrary();installTableCamera();installDesktopTableViews();installTableToolLayout();
const initial=localStorage.getItem(KEY);if(initial){restoreLocal()}else{setCardSize(spreadCardSize(settings.spread));sync();initialize()} })();
