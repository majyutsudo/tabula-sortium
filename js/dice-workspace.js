/* TABULA v0.723 — unified tool selection in section II.
   The card deck selector remains the card model's source of truth.
   Dice scene is kept alive in a separate, hidden iframe when cards are active. */
(()=>{'use strict';
 const picker=document.getElementById('instrumentItem');
 const source=document.getElementById('deckLibrarySelect');
 const section=document.getElementById('instrumentChoiceSection');
 const workspace=document.getElementById('diceWorkspace'),frame=document.getElementById('diceWorkspaceFrame');
 if(!picker||!source||!section||!workspace||!frame)return;
 let frameLoaded=false,lastCardId=source.value||'builtin';
 const diceModes=new Set(['normal','astro','iching']);
 function sendPreset(id){
  if(frameLoaded&&frame.contentWindow)
   frame.contentWindow.postMessage({type:'tabula:dice:mode',mode:id},location.origin);
 }
 function syncAvailableCards(){
  const cardGroup=picker.querySelector('optgroup[label="カード"]');
  const previous=picker.value;
  cardGroup.replaceChildren();
  for(const option of source.options)cardGroup.append(new Option(option.text,'card:'+option.value));
  const desired=document.body.classList.contains('tabula-dice-mode')?previous:'card:'+source.value;
  if([...picker.options].some(o=>o.value===desired))picker.value=desired;
  else picker.value='card:'+source.value;
 }
 const observer=new MutationObserver(syncAvailableCards);
 observer.observe(source,{childList:true,subtree:true,characterData:true});
 function switchToCard(id){
  document.body.classList.remove('tabula-dice-mode');workspace.hidden=true;
  if(id&&source.value!==id&&[...source.options].some(o=>o.value===id)){
   source.value=id;source.dispatchEvent(new Event('change',{bubbles:true}));
  }
  lastCardId=source.value;
  requestAnimationFrame(()=>window.dispatchEvent(new Event('resize')));
 }
 function switchToDice(id){
  document.body.classList.add('tabula-dice-mode');
  workspace.hidden=false;
  section.classList.remove('is-collapsed');
  const toggle=section.querySelector('.section-toggle');
  if(toggle)toggle.setAttribute('aria-expanded','true');
  if(!frame.getAttribute('src'))frame.src='dice-unified-lab.html?embedded=1&v=0722';
  else sendPreset(id);
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
 frame.addEventListener('load',()=>{
  frameLoaded=true;const id=picker.value.slice(5);
  if(picker.value.startsWith('dice:')&&diceModes.has(id))sendPreset(id);
 });
 window.addEventListener('message',event=>{
  if(event.origin!==location.origin||event.source!==frame.contentWindow)return;
  if(event.data?.type!=='tabula:dice:height')return;
  const height=Number(event.data.height);
  if(Number.isFinite(height)&&height>200&&height<4000)frame.style.height=Math.ceil(height)+'px';
 });
 syncAvailableCards();
})();
