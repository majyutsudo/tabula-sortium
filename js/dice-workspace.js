/* TABULA v0.725 — shared table tool-specific actions. */
(()=>{'use strict';
 const picker=document.getElementById('instrumentItem');
 const source=document.getElementById('deckLibrarySelect');
 const section=document.getElementById('instrumentChoiceSection');
 const workspace=document.getElementById('diceWorkspace');
 if(!picker||!source||!section||!workspace)return;
 const diceModes=new Set(['normal','astro','iching']);
 let loadPromise=null,lastCardId=source.value||'builtin';
 const diceSelect=document.getElementById('dice-preset');
 const cardActions=document.querySelector('.table-shortcuts:not(.dice-quick-actions)');
 const diceActions=document.getElementById('diceQuickActions');
 const cardResults=document.getElementById('liveResults');
 const resultToggle=document.getElementById('toggleResults');
 const cardStatus=document.getElementById('status');
 // Attach existing dice UI fragments to TABULA's permanent interface.
 const addHolder=(parent,id,cls='')=>{
  const holder=document.createElement('div');holder.id=id;
  if(cls)holder.className=cls;parent.append(holder);return holder;
 };
 const settingsHolder=addHolder(document.getElementById('instrumentPicker'),'diceSettingsHolder','dice-workspace');
 const strengthHolder=addHolder(document.getElementById('tableActionSettings'),'diceStrengthHolder','dice-workspace');
 const resultsHolder=addHolder(cardResults,'diceResultsHolder','dice-workspace');
 const configChildren=[...workspace.querySelectorAll(':scope > details')];
 for(const element of configChildren)settingsHolder.append(element);
 strengthHolder.append(workspace.querySelector('.force-control'));
 resultsHolder.append(workspace.querySelector('.iching-outcome'));
 document.querySelector('.toolbar').prepend(document.getElementById('dice-status'));
 const sourceButtons=[
  document.getElementById('dice-collect'),
  document.getElementById('dice-mix'),
  document.getElementById('dice-roll')
 ];
 const proxyButtons=[
  document.getElementById('diceQuickCollect'),
  document.getElementById('diceQuickMix'),
  document.getElementById('diceQuickRoll')
 ];
 function syncActionStates(){
  proxyButtons.forEach((btn,i)=>{btn.disabled=sourceButtons[i].disabled});
  const mixing=sourceButtons[1].getAttribute('aria-pressed')==='true';
  document.getElementById('diceQuickMixLabel').textContent=mixing?'止める':'混ぜる';
 }
 sourceButtons.forEach(button=>new MutationObserver(syncActionStates).observe(button,{attributes:true,attributeFilter:['disabled','aria-pressed']}));
 proxyButtons.forEach((button,i)=>button.addEventListener('click',()=>sourceButtons[i].click()));
 syncActionStates();
 const settingsButton=document.getElementById('diceQuickSettings');
 settingsButton.addEventListener('click',()=>{
  const panel=[...settingsHolder.querySelectorAll('details')].find(x=>!x.hidden);
  if(!panel)return;
  section.classList.remove('is-collapsed');
  section.querySelector('.section-toggle')?.setAttribute('aria-expanded','true');
  panel.open=!panel.open;
  settingsHolder.scrollIntoView({behavior:'smooth',block:'nearest'});
 });
 let cardResultsOpen=false;
 const resultsButton=document.getElementById('diceQuickResults');
 function toggleDiceResults(){
  cardResults.hidden=!cardResults.hidden;
  const opened=!cardResults.hidden;
  resultToggle.setAttribute('aria-expanded',String(opened));
  resultToggle.textContent=opened?'結果を閉じる ▴':'結果を表示 ▾';
  resultsButton.setAttribute('aria-pressed',String(opened));
 }
 resultsButton.addEventListener('click',toggleDiceResults);
 resultToggle.addEventListener('click',event=>{
  if(!document.body.classList.contains('tabula-dice-mode'))return;
  event.preventDefault();event.stopImmediatePropagation();toggleDiceResults();
 },true);
 const felt=document.getElementById('dice-felt');
 for(const type of ['pointerdown','pointermove','pointerup','pointercancel','click','dblclick','wheel']){
  felt.addEventListener(type,event=>event.stopPropagation());
 }
 function loadEngine(){
  if(!loadPromise)loadPromise=import('./dice-table-engine.js?v=0725').catch(err=>{
   loadPromise=null;
   document.getElementById('dice-failure').hidden=false;
   document.getElementById('dice-failure').textContent='ダイスの読み込みに失敗しました：'+err.message;
   throw err;
  });
  return loadPromise;
 }
 function syncAvailableCards(){
  const group=picker.querySelector('optgroup[label="カード"]'),previous=picker.value;
  group.replaceChildren();
  for(const item of source.options)group.append(new Option(item.text,'card:'+item.value));
  const desired=document.body.classList.contains('tabula-dice-mode')?previous:'card:'+source.value;
  picker.value=[...picker.options].some(o=>o.value===desired)?desired:'card:'+source.value;
 }
 new MutationObserver(syncAvailableCards).observe(source,{childList:true,subtree:true,characterData:true});
 function switchToCard(id){
  document.body.classList.remove('tabula-dice-mode');workspace.hidden=true;
  cardActions.hidden=false;diceActions.hidden=true;
  cardResults.hidden=!cardResultsOpen;
  resultToggle.setAttribute('aria-expanded',String(cardResultsOpen));
  resultToggle.textContent=cardResultsOpen?'結果を閉じる ▴':'結果を表示 ▾';
  if(id&&source.value!==id&&[...source.options].some(o=>o.value===id)){
   source.value=id;source.dispatchEvent(new Event('change',{bubbles:true}));
  }
  lastCardId=source.value;
  requestAnimationFrame(()=>window.dispatchEvent(new Event('resize')));
 }
 function switchToDice(id){
  if(!document.body.classList.contains('tabula-dice-mode'))cardResultsOpen=!cardResults.hidden;
  document.body.classList.add('tabula-dice-mode');workspace.hidden=true;
  cardActions.hidden=true;diceActions.hidden=false;
  cardResults.hidden=true;
  resultToggle.setAttribute('aria-expanded','false');
  resultToggle.textContent='結果を表示 ▾';
  section.classList.remove('is-collapsed');
  const toggle=section.querySelector('.section-toggle');
  if(toggle)toggle.setAttribute('aria-expanded','true');
  diceSelect.value=id;
  loadEngine().then(()=>{
   window.TabulaDiceTable?.setMode(id);
   requestAnimationFrame(()=>window.TabulaDiceTable?.resize());
   syncActionStates();
  }).catch(()=>{});
 }
 picker.addEventListener('change',()=>{
  const [kind,id]=picker.value.split(':');
  if(kind==='dice'&&diceModes.has(id))switchToDice(id);
  else if(kind==='card')switchToCard(id);
 });
 source.addEventListener('change',()=>{
  lastCardId=source.value;
  if(!document.body.classList.contains('tabula-dice-mode'))picker.value='card:'+lastCardId;
 });
 window.addEventListener('resize',()=>{
  if(document.body.classList.contains('tabula-dice-mode'))window.TabulaDiceTable?.resize();
 });
 syncAvailableCards();
})();
