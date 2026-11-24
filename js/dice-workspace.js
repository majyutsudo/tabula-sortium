/* TABULA v0.725 — shared table tool-specific actions. */
(()=>{'use strict';
 const picker=document.getElementById('instrumentItem');
 const source=document.getElementById('deckLibrarySelect');
 const section=document.getElementById('instrumentChoiceSection');
 const workspace=document.getElementById('diceWorkspace');
 if(!picker||!source||!section||!workspace)return;
 let loadPromise=null,lastCardId=source.value||'builtin',activationToken=0;
 const diceSelect=document.getElementById('dice-preset');
 const settingsDialog=document.getElementById('diceSettingsDialog');
 const setDialog=document.getElementById('diceSetDialog');
 const changeSet=document.getElementById('diceChangeSet');
 const setChoices=document.getElementById('diceSetChoices');
 const draftPanel=document.getElementById('diceSetDraft');
 const draftRows=document.getElementById('diceDraftRows');
 const presetName=document.getElementById('dicePresetName');
 const message=document.getElementById('diceSetMessage');
 const PRESET_STORAGE='tabula_normal_dice_presets_v1';
 let draft=[],chooseFor=null,draftRequest=0,onChoose=null;
 const normalDie=(color='#c7b48d')=>({sides:6,color,surface:'ring'});
 const cloneDice=dice=>dice.map(die=>({...die}));
 const builtInSets=[
  ...[1,2,3].map(count=>({name:count+'ダイス',description:'砂色のD6 × '+count,mode:'normal',dice:Array.from({length:count},()=>normalDie())})),
  {name:'アルケミーダイス',description:'黒・赤・金のD6を各1個。',mode:'normal',dice:['#29242a','#a0252b','#c5a269'].map(normalDie)},
  {name:'アストロダイス',description:'天体・十二宮・ハウスの3個を振り、出目の組み合わせを表示します。',mode:'astro'},
  {name:'易占ダイス',description:'上卦・下卦・動爻の3個を振り、本卦と之卦を表示します。',mode:'iching'}
 ];
 function savedSets(){
  try {
   const sets=JSON.parse(localStorage.getItem(PRESET_STORAGE));
   return Array.isArray(sets)?sets.filter(set=>typeof set?.name==='string'&&Array.isArray(set.dice)&&set.dice.length>=1&&set.dice.length<=8&&set.dice.every(d=>d&&[6,8,10,12,20].includes(d.sides)&&/^#[0-9a-f]{6}$/i.test(d.color)&&['standard','ring','ivory'].includes(d.surface))):[];
  }catch{return []}
 }
 function setMessage(text){
  message.textContent=text;message.hidden=!text;
 }
 function applySet(mode,dice){
  const bridge=window.TabulaTableTools,current=bridge?.context();
  if(!chooseFor||current?.tableId!==chooseFor.tableId||current?.id!==chooseFor.id)return;
  const snapshot=dice?{schema:1,mode,settings:cloneDice(dice),force:current.dice?.force??30}:null;
  const accepted=onChoose?onChoose('dice:'+mode,snapshot):bridge.switchTool('dice:'+mode,{replaceDice:true,snapshot});
  if(accepted)setDialog.close();
  else setMessage('セットを変更できませんでした。');
 }
 function addChoice(name,description,choose){
  const button=document.createElement('button');button.type='button';
  const title=document.createElement('strong');title.textContent=name;
  const detail=document.createElement('small');detail.textContent=description;
  button.append(title,detail);button.addEventListener('click',choose);setChoices.append(button);
 }
 function renderSetChoices(){
  setChoices.replaceChildren();
  for(const set of builtInSets)addChoice(set.name,set.description,()=>applySet(set.mode,set.dice));
  for(const set of savedSets())addChoice(set.name,set.dice.map(die=>'D'+die.sides).join('・'),()=>applySet('normal',set.dice));
  addChoice('新しく組む','個数・面数・色・仕上げ・ラベルを指定。',openDraft);
 }
 async function openDraft(){
  const request=++draftRequest;
  try{
   await loadEngine();
   if(!setDialog.open||request!==draftRequest)return;
   if(draftPanel.hidden){
    const engine=window.TabulaDiceTable;
    const previous=!onChoose&&chooseFor?.id==='dice:normal'?chooseFor.dice?.settings:null;
    draft=previous?.length?cloneDice(previous):[engine.defaultNormalDie()];
    engine.editNormalDraft(draftRows,draft);
    draftPanel.hidden=false;
   }
   draftRows.querySelector('select')?.focus();
  }catch{if(setDialog.open&&request===draftRequest)setMessage('ダイスの設定を読み込めませんでした。')}
 }
 function openSetDialog(callback=null){
  if(setDialog.open||window.TabulaDiceTable?.busy())return;
  chooseFor=window.TabulaTableTools?.context();onChoose=callback;
  if(!chooseFor)return;
  draftPanel.hidden=true;presetName.value='';setMessage('');
  renderSetChoices();setDialog.showModal();
 }
 setDialog.addEventListener('close',()=>{if(!setDialog.open){chooseFor=null;onChoose=null;draftRequest++;}});
 changeSet.addEventListener('click',()=>openSetDialog());
 window.addEventListener('tabula:choose-dice-set',event=>openSetDialog(event.detail));
 document.getElementById('diceUseDraft').addEventListener('click',()=>applySet('normal',draft));
 document.getElementById('diceSavePreset').addEventListener('click',()=>{
  const name=presetName.value.trim();
  if(!name){setMessage('プリセット名を入力してください。');presetName.focus();return}
  const sets=savedSets();
  if(sets.some(set=>set.name===name)||builtInSets.some(set=>set.name===name)){
   setMessage('同じ名前のプリセットがあります。');presetName.focus();return;
  }
  try{localStorage.setItem(PRESET_STORAGE,JSON.stringify([...sets,{name,dice:cloneDice(draft)}]));}
  catch{setMessage('プリセットを保存できませんでした。');return}
  renderSetChoices();setMessage('「'+name+'」を保存しました。');
 });
 document.getElementById('diceChooseOtherSet').addEventListener('click',()=>{
  settingsDialog.close();openSetDialog();
 });
 const cardActions=document.querySelector('.table-shortcuts:not(.dice-quick-actions)');
 const diceActions=document.getElementById('diceQuickActions');
 const cardResults=document.getElementById('liveResults');
 const resultToggle=document.getElementById('toggleResults');
 const toolbarToolName=document.getElementById('toolbarDeckName');
 function updateSharedLabelCaption(id){
  const button=document.getElementById('toolbarLabelToggle');
  if(!button||button.dataset.labelMode!=='card')return;
  button.textContent=id.startsWith('dice:')?'ダイス名':'カード名';
 }
 function updateToolbarTool(id){
  if(!toolbarToolName)return;
  const names={'dice:normal':'ダイス','dice:astro':'アストロダイス','dice:iching':'易占ダイス'};
  const label=names[id]||source.selectedOptions[0]?.textContent||'カード';
  toolbarToolName.textContent=label.replace(/（.*?枚）/g,'').trim();
  updateSharedLabelCaption(id);
  const button=document.getElementById('toolbarDeckButton');if(button)button.title='使用する道具：'+label;
 }
 // Leave card-only functions in their usual positions, but prevent editing
 // the preserved card session while the user is working with dice.
 const cardOnlyControls=[
  ...['tableUndo','zoomOut','zoomReset','zoomIn','newSessionStandalone','cardGalleryOpen','spreadNotebook','toolbarDeckPicker','quickPositions','quickReturn','quickCollect','quickFaceDown','quickRevealAll','presetSnapToggle'].map(id=>document.getElementById(id)).filter(Boolean)
 ];
 function setCardControlsInactive(inactive){
  cardOnlyControls.forEach(element=>{
   element.inert=inactive;
   // Preserve the button's original disabled state. An unavailable tool
   // is visually distinct from a currently disabled card action.
   element.classList.toggle('dice-unavailable',inactive);
   if(inactive){
    if(!element.hasAttribute('data-dice-previous-aria-disabled')){
     element.dataset.dicePreviousAriaDisabled=element.getAttribute('aria-disabled')??'__absent__';
    }
    element.setAttribute('aria-disabled','true');
   }else{
    const previous=element.dataset.dicePreviousAriaDisabled;
    if(previous!==undefined){
     if(previous==='__absent__')element.removeAttribute('aria-disabled');
     else element.setAttribute('aria-disabled',previous);
     delete element.dataset.dicePreviousAriaDisabled;
    }
   }
  });
 }
 // Attach existing dice UI fragments to TABULA's permanent interface.
 const addHolder=(parent,id,cls='')=>{
  const holder=document.createElement('div');holder.id=id;
  if(cls)holder.className=cls;parent.append(holder);return holder;
 };
 const settingsHolder=document.getElementById('diceSettingsHolder');
 const strengthHolder=addHolder(document.getElementById('tableActionSettings'),'diceStrengthHolder','dice-workspace');
 const resultsHolder=addHolder(cardResults,'diceResultsHolder','dice-workspace');
 const configChildren=[...workspace.querySelectorAll(':scope > .normal-config')];
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
  document.getElementById('diceQuickMixLabel').textContent='混ぜる';
  proxyButtons[1].setAttribute('aria-pressed',String(mixing));
 }
 sourceButtons.forEach(button=>new MutationObserver(syncActionStates).observe(button,{attributes:true,attributeFilter:['disabled','aria-pressed']}));
 proxyButtons.forEach((button,i)=>{
  if(i!==1)button.addEventListener('click',()=>sourceButtons[i].click());
 });
 syncActionStates();
 const settingsButton=document.getElementById('diceQuickSettings');
 settingsButton.addEventListener('click',async()=>{
  const token=activationToken;
  try{
   await loadEngine();
   if(token!==activationToken||!document.body.classList.contains('tabula-dice-mode')||!window.TabulaDiceTable?.isReady()||window.TabulaDiceTable.busy()||settingsDialog.open)return;
   document.getElementById('diceFixedSetNote').hidden=diceSelect.value==='normal';
   settingsDialog.showModal();
  }catch{}
 });
 let cardResultsOpen=false;
 const resultsButton=document.getElementById('diceQuickResults');
 function setDiceResultsOpen(open){
  cardResults.hidden=!open;
  resultToggle.setAttribute('aria-expanded',String(open));
  resultToggle.textContent=open?'結果を閉じる ▴':'結果を表示 ▾';
  resultsButton.setAttribute('aria-pressed',String(open));
 }
 function toggleDiceResults(){setDiceResultsOpen(cardResults.hidden)}
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
  if(!loadPromise)loadPromise=import('./dice-table-engine.js?v=0739').catch(err=>{
   loadPromise=null;
   document.getElementById('dice-status').textContent='ダイスの読み込みに失敗しました：'+err.message;
   throw err;
  });
  return loadPromise;
 }
 function syncAvailableCards(){
  const group=picker.querySelector('optgroup[label="カード"]');
  group.replaceChildren();
  for(const item of source.options)group.append(new Option(item.text,'card:'+item.value));
  const desired=document.body.classList.contains('tabula-dice-mode')?'dice':'card:'+source.value;
  picker.value=[...picker.options].some(o=>o.value===desired)?desired:'card:'+source.value;
 }
 new MutationObserver(syncAvailableCards).observe(source,{childList:true,subtree:true,characterData:true});
 function switchToCard(id){
  activationToken++;
  document.body.classList.remove('tabula-dice-mode');workspace.hidden=true;
  cardActions.hidden=false;diceActions.hidden=true;
  setCardControlsInactive(false);
  changeSet.hidden=true;
  resultsButton.setAttribute('aria-pressed','false');
  cardResults.hidden=!cardResultsOpen;
  resultToggle.setAttribute('aria-expanded',String(cardResultsOpen));
  resultToggle.textContent=cardResultsOpen?'結果を閉じる ▴':'結果を表示 ▾';
  if(id&&source.value!==id&&[...source.options].some(o=>o.value===id)){
   source.value=id;source.dispatchEvent(new Event('change',{bubbles:true}));
  }
  lastCardId=source.value;
  updateToolbarTool('card:'+lastCardId);
  requestAnimationFrame(()=>window.dispatchEvent(new Event('resize')));
 }
 function switchToDice(id,snapshot=null){
  const token=++activationToken;
  if(!document.body.classList.contains('tabula-dice-mode'))cardResultsOpen=!cardResults.hidden;
  document.body.classList.add('tabula-dice-mode');workspace.hidden=true;
  cardActions.hidden=true;diceActions.hidden=false;
  setCardControlsInactive(true);
  changeSet.hidden=false;
  const placementTools=document.getElementById('placementToolsContent');
  if(placementTools){placementTools.hidden=true;placementTools.style.display='none';}
  // Dice outcomes are primary information: open immediately on entering
  // a dice table; the five-button RESULTS action still toggles the panel.
  setDiceResultsOpen(true);
  section.classList.remove('is-collapsed');
  const toggle=section.querySelector('.section-toggle');
  if(toggle)toggle.setAttribute('aria-expanded','true');
  diceSelect.value=id;
  updateToolbarTool('dice:'+id);
  loadEngine().then(()=>{
   if(token!==activationToken||!document.body.classList.contains('tabula-dice-mode'))return;
   window.TabulaDiceTable?.restore(snapshot,id);
   requestAnimationFrame(()=>window.TabulaDiceTable?.resize());
   syncActionStates();
  }).catch(()=>{});
 }
 function applyCurrentTable(detail){
  const current=detail||window.TabulaTableTools?.context?.();
  if(!current)return;
  if(settingsDialog.open)settingsDialog.close();
  const choice=current.id.startsWith('dice:')?'dice':current.id;
  if(![...picker.options].some(option=>option.value===choice))syncAvailableCards();
  picker.value=choice;
  if(current.id.startsWith('dice:'))switchToDice(current.id.slice(5),current.dice);
  else switchToCard(current.id.slice(5));
 }
 picker.addEventListener('change',()=>{
  const selected=picker.value;
  const bridge=window.TabulaTableTools;
  const previous=bridge?.context()?.id||'card:'+source.value;
  if(selected==='dice'){
   picker.value=previous.startsWith('dice:')?'dice':previous;
   openSetDialog();return;
  }
  if(!bridge?.switchTool(selected)){
   picker.value=previous.startsWith('dice:')?'dice':previous;
   return;
  }
  // The table model emits tabula:tool-context after the transition.
 });
 window.addEventListener('tabula:tool-context',event=>applyCurrentTable(event.detail));
 source.addEventListener('change',()=>{
  if(!document.body.classList.contains('tabula-dice-mode')){
   window.TabulaTableTools?.updateCard(source.value);
   picker.value='card:'+source.value;
  }
 });
 window.addEventListener('resize',()=>{
  if(document.body.classList.contains('tabula-dice-mode'))window.TabulaDiceTable?.resize();
 });
 syncAvailableCards();
 applyCurrentTable();
})();
