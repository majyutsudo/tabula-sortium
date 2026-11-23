/* TABULA v0.722: dice workspace adapter.
   Card DOM is preserved and dice physics stays in a separate same-origin
   rendering context until full shared-table integration. */
(()=>{'use strict';
 const mode=document.getElementById('instrumentMode'),kind=document.getElementById('instrumentDiceKind');
 const kindField=document.getElementById('diceKindField'),info=document.getElementById('diceModeNotice');
 const workspace=document.getElementById('diceWorkspace'),frame=document.getElementById('diceWorkspaceFrame');
 if(!mode||!kind||!kindField||!workspace||!frame)return;
 let loaded=false;
 function sendPreset(){
  if(!loaded||!frame.contentWindow)return;
  frame.contentWindow.postMessage({type:'tabula:dice:mode',mode:kind.value},location.origin);
 }
 frame.addEventListener('load',()=>{loaded=true;sendPreset()});
 kind.addEventListener('change',sendPreset);
 mode.addEventListener('change',()=>{
  const dice=mode.value==='dice';
  document.body.classList.toggle('tabula-dice-mode',dice);
  workspace.hidden=!dice;kindField.hidden=!dice;info.hidden=!dice;
  if(dice){
   if(!frame.getAttribute('src'))frame.src='dice-unified-lab.html?embedded=1&v=0722';
   else sendPreset();
  }
 });
 window.addEventListener('message',event=>{
  if(event.origin!==location.origin||event.source!==frame.contentWindow)return;
  if(event.data?.type!=='tabula:dice:height')return;
  const height=Number(event.data.height);
  if(Number.isFinite(height)&&height>200&&height<4000)frame.style.height=Math.ceil(height)+'px';
 });
})();
