/* TABULA SORTIUM — action-list custom deal editor. */
(function(root){'use strict';
function install(api){
 const host=document.getElementById('cutCountSetting');if(!host||!root.TabulaDealWorkflow)return;
 const field=document.createElement('div');field.className='field';
 const heading=document.createElement('span');heading.textContent='ディール手順';
 const picker=document.createElement('select');picker.setAttribute('aria-label','卓上のディール手順');
 const trigger=document.createElement('button');trigger.type='button';trigger.textContent='手順を編集';trigger.title='ディール手順の作成・編集';
 field.append(heading,picker,trigger);host.closest('label')?.after(field);
 const STORE='tabula-deal-actions-v1';
 let dialog=null;
 function saved(){try{const v=JSON.parse(localStorage.getItem(STORE)||'[]');return Array.isArray(v)?v:[]}catch(e){return []}}
 const quickPicker=document.createElement('select');quickPicker.id='quickDealChoice';quickPicker.setAttribute('aria-label','卓上のディール手順を選択');quickPicker.title='ディール手順を選択';const dealButton=document.getElementById('quickDeal');if(dealButton){const group=document.createElement('div');group.className='quick-action-choice';dealButton.before(group);group.append(dealButton,quickPicker)}
 function refreshPicker(){const current=picker.value==='__standard_up__'?'':picker.value;picker.replaceChildren();for(const [value,label] of [['','番号順']]){const option=document.createElement('option');option.value=value;option.textContent=label;picker.append(option)}saved().forEach(item=>{const option=document.createElement('option');option.value=item.name;option.textContent=item.name;picker.append(option)});picker.value=[...picker.options].some(o=>o.value===current)?current:'';quickPicker.replaceChildren(...[...picker.options].map(o=>o.cloneNode(true)));const editOption=document.createElement('option');editOption.value='__edit__';editOption.textContent='手順を編集・登録…';quickPicker.append(editOption);quickPicker.value=picker.value;quickPicker.dispatchEvent(new Event('tabula:deal-choice-updated',{bubbles:true}))}
 // Facing is controlled by the dedicated tabletop selector, never by the procedure picker.
 picker.addEventListener('change',()=>{quickPicker.value=picker.value;quickPicker.dispatchEvent(new Event('tabula:deal-choice-updated',{bubbles:true}))});quickPicker.addEventListener('change',()=>{if(quickPicker.value==='__edit__'){quickPicker.value=picker.value;trigger.click();return}picker.value=quickPicker.value;quickPicker.dispatchEvent(new Event('tabula:deal-choice-updated',{bubbles:true}))});
 function executeSelected(){if(!picker.value)return false;if(!api.canStart()){api.status('卓上のカードを回収してから独自ディールを実行してください。');return true}const item=saved().find(x=>x.name===picker.value);if(!item){refreshPicker();return false}try{const original=api.deck();const steps=item.steps||[];const run=list=>root.TabulaDealWorkflow.run(original,list,{recipes:api.shuffleRecipes?api.shuffleRecipes():[],defaultFaceUp:api.getDefaultFaceUp?.()===true});const preliminary=run(steps);const extra=[];if(preliminary.piles.length)extra.push({type:'collect',order:preliminary.piles.map((_,i)=>i)});if(item.autoDeal!==false){const remaining=Math.max(0,(api.spreadCount?api.spreadCount():0)-preliminary.dealt.length);if(remaining)extra.push({type:'deal-rest',count:remaining})}const result=root.TabulaDealWorkflow.run(original,[...steps,...extra],{recipes:api.shuffleRecipes?api.shuffleRecipes():[],trace:true,defaultFaceUp:api.getDefaultFaceUp?.()===true});if(result.selected.length)throw Error('保留カードが残っています');api.commit(result.stock,result.dealt,result.removed,{mode:item.orderMode||'standard',order:item.customOrder||'',tableRemovedIds:result.removed.map(c=>c.id),timeline:result.timeline})}catch(e){api.status('ディール手順を実行できません：'+e.message)}return true}

 function open(){
  const original=api.editorDeck?api.editorDeck():api.deck();
  if(original.length<2){api.status('山札が2枚以上必要です。');return}
  let steps=[],name='新しいディール',editingName=null,autoDeal=true,orderMode='standard',customOrder='',message='';
  const active=saved().find(item=>item.name===picker.value);
  if(active){name=active.name;editingName=active.name;steps=(active.steps||[]).map(st=>({...st}));autoDeal=active.autoDeal!==false;orderMode=active.orderMode||'standard';customOrder=active.customOrder||''}
  const shade=document.createElement('div');shade.className='deal-editor-shade';
  shade.style.cssText='position:fixed;inset:0;background:#000b;z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px';
  const panel=document.createElement('section');panel.className='deal-editor-panel modal';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','ディール手順の登録');
  panel.style.cssText='width:min(600px,100%);max-height:85vh;overflow:auto;padding:24px;color:#f1dfbd;border:1px solid #a88c60;border-radius:8px;box-shadow:0 20px 60px #0009';
  shade.append(panel);document.body.append(shade);dialog=shade;
  const make=(tag,parent,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;parent.append(e);return e};
  const button=(parent,label,fn)=>{const b=make('button',parent,label);b.type='button';b.onclick=fn;return b};
  const input=(parent,value,type='text')=>{const e=make('input',parent);e.type=type;e.value=value;e.style.minWidth='0';return e};
  const select=(parent,options,value)=>{const e=make('select',parent);for(const [v,label] of options){const o=make('option',e,label);o.value=String(v)}e.value=String(value??'');return e};
  const field=(parent,label,value,type='number')=>{const l=make('label',parent,label);const e=input(l,String(value),type);return e};
  const recipes=()=>api.shuffleRecipes?api.shuffleRecipes():[];
  const run=list=>root.TabulaDealWorkflow.run(original,list,{recipes:recipes(),defaultFaceUp:api.getDefaultFaceUp?.()===true});
  function preview(){const preliminary=run(steps);const extra=[];if(preliminary.piles.length)extra.push({type:'collect',order:preliminary.piles.map((_,i)=>i)});if(autoDeal){const remaining=Math.max(0,(api.spreadCount?api.spreadCount():0)-preliminary.dealt.length);if(remaining)extra.push({type:'deal-rest',count:remaining})}return run([...steps,...extra])}
  function close(){shade.remove();dialog=null;trigger.focus()}
  const defaults={
   'take':()=>({type:'take',from:'stock',count:1,to:'dealt'}),
   'skip-deal':()=>({type:'skip-deal',skip:1,times:3}),
   'split':()=>{const n=run(steps).stock.length;const a=Math.floor(n/3);return {type:'split',sizes:[a,a,n-2*a]}},
   'collect':()=>({type:'collect',order:run(steps).piles.map((_,i)=>i)}),
   'reverse-pile':()=>({type:'reverse-pile',pile:0}),
   'shuffle-recipe':()=>({type:'shuffle-recipe',recipeId:recipes()[0]?.id||''})
  };
  const types=[['take','カードを除外・配札'],['skip-deal','除外を挟んで配札'],['split','山札を分割'],['collect','束を積み直す'],['reverse-pile','束の順序を逆にする'],['shuffle-recipe','登録済みシャッフル']];
  function validate(){try{preview();message='';return true}catch(e){message='工程を実行できません：'+e.message;return false}}
  function updateStep(i,next){steps[i]=next;validate();paint()}
  function paint(){
   panel.replaceChildren();
   const head=make('div',panel);head.style.cssText='display:flex;align-items:start;justify-content:space-between;gap:12px';
   make('h2',head,editingName?'ディール手順の編集':'ディール手順の登録');
   button(head,'×',close).setAttribute('aria-label','閉じる');
   make('p',panel,'方式ごとに設定項目が変わります。登録済みの手順は内容を上書き保存できます。').className='note';
   if(message){const m=make('p',panel,message);m.style.color='#ffb9a4';m.setAttribute('role','alert')}
   const nameLabel=make('label',panel,'名前');nameLabel.className='field';
   const nameInput=input(nameLabel,name);nameInput.maxLength=70;nameInput.style.width='100%';nameInput.oninput=()=>{name=nameInput.value};
   const list=make('div',panel);list.className='deal-steps';
   if(!steps.length)make('p',list,'工程がありません。「工程を追加」から始めてください。');
   steps.forEach((step,i)=>{
    let before;try{before=run(steps.slice(0,i))}catch(e){before={stock:[],piles:[]}}
    const row=make('div',list);row.className='recipe-step deal-step-row';
    row.style.cssText='display:grid;grid-template-columns:18px minmax(95px,2fr) minmax(55px,1fr) minmax(55px,1fr) 28px;gap:6px;align-items:center;margin:9px 0;padding:8px;border:1px solid #665841;border-radius:6px';
    make('b',row,(i+1)+'.');
    const kind=select(row,types,step.type);kind.style.width='100%';
    kind.onchange=()=>{const next=defaults[kind.value]();updateStep(i,next)};
    const controls=make('div',row);controls.style.cssText='grid-column:3/5;display:flex;gap:6px;align-items:center;flex-wrap:wrap;min-width:0';
    function control(label,value,options,onchange){const l=make('label',controls,label);l.style.cssText='font-size:11px;flex:1 1 75px;min-width:0';const el=options?select(l,options,value):input(l,String(value),'number');el.style.cssText='width:100%;min-width:0;box-sizing:border-box;padding:7px 3px';el.onchange=()=>onchange(el.value);return el}
    const patch=values=>updateStep(i,{...step,...values});
    if(step.type==='take'){
      control('取り出し元',step.from,[...(before.stock.length?[['stock','山札']]:[]),...before.piles.map((p,j)=>[j,'束'+String.fromCharCode(65+j)])],v=>patch({from:v==='stock'?'stock':Number(v)}));
      control('枚数',step.count,null,v=>patch({count:Number(v)}));
      control('用途',step.to,[['dealt','配札'],['removed','除外'],['selected','保留']],v=>patch({to:v}));
    }else if(step.type==='skip-deal'){
      control('除外枚数',step.skip,null,v=>patch({skip:Number(v)}));
      control('配札回数',step.times,null,v=>patch({times:Number(v)}));
    }else if(step.type==='split'){
      const l=make('label',controls,'各束の枚数（カンマ区切り）');l.style.cssText='font-size:11px;flex:1 1 100%';const e=input(l,step.sizes.join(','));e.style.width='100%';e.onchange=()=>patch({sizes:e.value.split(',').map(x=>Number(x.trim()))});
    }else if(step.type==='collect'){
      const l=make('label',controls,'積み直し順（例：C,A,B）');l.style.cssText='font-size:11px;flex:1 1 100%';const e=input(l,step.order.map(x=>String.fromCharCode(65+x)).join(','));e.style.width='100%';e.onchange=()=>patch({order:e.value.toUpperCase().split(',').map(x=>x.trim().charCodeAt(0)-65)});
    }else if(step.type==='reverse-pile'){
      control('束',step.pile,before.piles.map((_,j)=>[j,'束'+String.fromCharCode(65+j)]),v=>patch({pile:Number(v)}));
    }else if(step.type==='shuffle-recipe'){
      control('手順',step.recipeId,recipes().map(x=>[x.id,x.name]),v=>patch({recipeId:v}));
    }
    if(step.type==='take'||step.type==='skip-deal'){
      const l=make('label',controls,'表裏');l.style.cssText='font-size:11px;flex:1 1 75px';const e=select(l,[['default','卓上設定'],['up','表'],['down','裏']],step.faceUp===true?'up':step.faceUp===false?'down':'default');e.style.width='100%';e.onchange=()=>{const next={...step};if(e.value==='default')delete next.faceUp;else next.faceUp=e.value==='up';updateStep(i,next)};
    }
    const remove=button(row,'×',()=>{steps.splice(i,1);validate();paint()});remove.className='recipe-remove';remove.style.cssText='width:28px;min-width:28px;height:32px;padding:0';
   });
   const actions=make('div',panel);actions.className='row';actions.style.cssText='display:flex;gap:10px;flex-wrap:wrap;margin:12px 0';
   button(actions,'工程を追加',()=>{
    let current;try{current=run(steps)}catch(e){message='工程の入力を完成させてから追加してください：'+e.message;paint();return}let type='take';
    if(!current.stock.length&&current.piles.length)type='collect';
    else if(!current.stock.length){message='追加できる工程がありません。';paint();return}
    steps.push(defaults[type]());validate();paint();
   });
   const detail=make('details',panel);detail.style.cssText='border:1px solid #665841;border-radius:6px;padding:10px;margin:12px 0';
   make('summary',detail,'詳細設定（配札順序・通常ディール）');
   const orderLabel=make('label',detail,'配札位置の順序');orderLabel.className='field';
   const order=select(orderLabel,[['standard','スプレッドの標準順'],['random','ランダムな位置順'],['custom','指定順']],orderMode);
   const custom=input(detail,customOrder||((api.defaultOrder?api.defaultOrder():[]).map(n=>n+1).join(', ')));custom.placeholder='例：1,2,3,6,5,4';custom.style.width='100%';custom.hidden=orderMode!=='custom';
   order.onchange=()=>{orderMode=order.value;custom.hidden=orderMode!=='custom'};
   custom.oninput=()=>{customOrder=custom.value};
   const autoLabel=make('label',detail);autoLabel.style.cssText='display:flex;align-items:center;gap:8px;margin-top:10px';
   const tick=make('input',autoLabel);tick.type='checkbox';tick.checked=autoDeal;tick.onchange=()=>{autoDeal=tick.checked;validate();paint()};
   make('span',autoLabel,'最後に通常ディール（必要枚数を自動配札）');
   try{const p=preview();make('p',panel,'実行プレビュー：山札 '+p.stock.length+'枚 / 配札 '+p.dealt.length+'枚 / 除外 '+p.removed.length+'枚').className='note'}catch(e){make('p',panel,'実行プレビュー：'+e.message).className='note'}
   const store=make('div',panel);store.className='row';store.style.cssText='display:flex;gap:8px;flex-wrap:wrap;margin:12px 0';
   function save(asNew){
    name=nameInput.value.trim();if(!name){message='手順の名前を入力してください。';paint();return}
    if(!validate()){paint();return}
    const items=saved(),target=asNew?name:(editingName||name),ix=items.findIndex(x=>x.name===target);
    if(asNew&&ix>=0&&name!==editingName){message='同じ名前の手順があります。';paint();return}
    if(!asNew&&editingName&&ix<0){message='上書き対象がありません。';paint();return}
    const entry={name,steps:steps.map(x=>({...x})),autoDeal,orderMode,customOrder:custom.value};
    if(ix>=0)items[ix]=entry;else items.push(entry);
    try{localStorage.setItem(STORE,JSON.stringify(items))}catch(e){message='保存に失敗しました。';paint();return}
    editingName=name;refreshPicker();picker.value=name;quickPicker.value=name;message='「'+name+'」を保存しました。';paint();
   }
   button(store,editingName?'変更を保存':'名前を付けて保存',()=>save(false));
   if(editingName)button(store,'別名で保存',()=>save(true));
   const savedBox=make('details',panel);savedBox.style.cssText='border-top:1px solid #665841;padding-top:12px;margin-top:12px';
   make('summary',savedBox,'保存済み手順の管理');
   const chooser=select(savedBox,[['','保存済み手順を選択'],...saved().map(x=>[x.name,x.name])],'');
   button(savedBox,'読み込む',()=>{const item=saved().find(x=>x.name===chooser.value);if(!item)return;name=item.name;editingName=item.name;steps=item.steps.map(x=>({...x}));autoDeal=item.autoDeal!==false;orderMode=item.orderMode||'standard';customOrder=item.customOrder||'';validate();paint()});
   button(savedBox,'削除',()=>{if(!chooser.value)return;const items=saved().filter(x=>x.name!==chooser.value);localStorage.setItem(STORE,JSON.stringify(items));if(editingName===chooser.value)editingName=null;refreshPicker();message='削除しました。';paint()});
  }
  shade.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
  paint();
 }
 function resetSavedActions(){
  localStorage.removeItem(STORE);
  picker.value='';
  refreshPicker();
  picker.value='';quickPicker.value='';
 }
 refreshPicker();trigger.onclick=()=>{if(dialog)return;try{open()}catch(error){if(dialog){dialog.remove();dialog=null}const reason=error&&error.message?error.message:String(error);api.status('ディール編集画面のエラー：'+reason);window.alert('ディール編集画面を開けませんでした。\n'+reason)}};
 return Object.freeze({executeSelected,resetSavedActions});
}
root.TabulaDealWorkbench=Object.freeze({install});
})(globalThis);
