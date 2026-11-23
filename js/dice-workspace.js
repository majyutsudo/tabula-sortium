/* TABULA v0.724: shared table dice overlay, no iframe.
   Card drawing remains mounted in the original #surface. */
(()=>{'use strict';
 const picker=document.getElementById('instrumentItem');
 const source=document.getElementById('deckLibrarySelect');
 const section=document.getElementById('instrumentChoiceSection');
 const workspace=document.getElementById('diceWorkspace');
 if(!picker||!source||!section||!workspace)return;
 const diceModes=new Set(['normal','astro','iching']);
 let loadPromise=null,lastCardId=source.value||'builtin';
 const diceSelect=document.getElementById('dice-preset');
 const felt=document.getElementById('dice-felt');
 for(const type of ['pointerdown','pointermove','pointerup','pointercancel','click','dblclick','wheel']){
  felt.addEventListener(type,event=>event.stopPropagation());
 }
 function loadEngine(){
  if(!loadPromise)loadPromise=import('./dice-table-engine.js?v=0724').catch(err=>{
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
  if(id&&source.value!==id&&[...source.options].some(o=>o.value===id)){
   source.value=id;source.dispatchEvent(new Event('change',{bubbles:true}));
  }
  lastCardId=source.value;
  requestAnimationFrame(()=>window.dispatchEvent(new Event('resize')));
 }
 function switchToDice(id){
  document.body.classList.add('tabula-dice-mode');workspace.hidden=false;
  section.classList.remove('is-collapsed');
  const toggle=section.querySelector('.section-toggle');
  if(toggle)toggle.setAttribute('aria-expanded','true');
  diceSelect.value=id;
  loadEngine().then(()=>{
   window.TabulaDiceTable?.setMode(id);
   requestAnimationFrame(()=>window.TabulaDiceTable?.resize());
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
