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
 function refreshPicker(){const current=picker.value;picker.replaceChildren();const standard=document.createElement('option');standard.value='';standard.textContent='番号順（通常ディール）';picker.append(standard);saved().forEach(item=>{const option=document.createElement('option');option.value=item.name;option.textContent=item.name;picker.append(option)});picker.value=[...picker.options].some(o=>o.value===current)?current:''}
 function tableRemovedIds(original,steps){const ids=[];for(let i=0;i<steps.length;i++){const st=steps[i];if(st.type!=='take'||st.to!=='removed'||st.display!=='table')continue;const before=root.TabulaDealWorkflow.run(original,steps.slice(0,i),{recipes:api.shuffleRecipes?api.shuffleRecipes():[]});const after=root.TabulaDealWorkflow.run(original,steps.slice(0,i+1),{recipes:api.shuffleRecipes?api.shuffleRecipes():[]});const prior=new Set(before.removed.map(c=>c.id));ids.push(...after.removed.filter(c=>!prior.has(c.id)).map(c=>c.id))}return ids}
 function executeSelected(){if(!picker.value)return false;if(!api.canStart()){api.status('卓上のカードを回収してから独自ディールを実行してください。');return true}const item=saved().find(x=>x.name===picker.value);if(!item){refreshPicker();return false}try{const original=api.deck();const steps=item.steps||[];const run=list=>root.TabulaDealWorkflow.run(original,list,{recipes:api.shuffleRecipes?api.shuffleRecipes():[]});const preliminary=run(steps);const extra=[];if(preliminary.piles.length)extra.push({type:'collect',order:preliminary.piles.map((_,i)=>i)});if(item.autoDeal!==false){const remaining=Math.max(0,(api.spreadCount?api.spreadCount():0)-preliminary.dealt.length);if(remaining)extra.push({type:'deal-rest',count:remaining})}const result=run([...steps,...extra]);if(result.selected.length)throw Error('保留カードが残っています');api.commit(result.stock,result.dealt,result.removed,{mode:item.orderMode||'standard',order:item.customOrder||'',tableRemovedIds:tableRemovedIds(original,steps)})}catch(e){api.status('ディール手順を実行できません：'+e.message)}return true}

 function open(){
  if(!api.canStart()){api.status('卓上のカードを回収してから開始してください。');return}
  const original=api.deck();if(original.length<2){api.status('山札が2枚以上必要です。');return}
  let steps=[],selected=-1,result=root.TabulaDealWorkflow.run(original,[]),message='',name='新しいディール',autoDeal=true,orderMode='standard',customOrder='';
  const shade=document.createElement('div');shade.style.cssText='position:fixed;inset:0;background:#000b;z-index:99999;display:grid;place-items:center;padding:12px';
  const panel=document.createElement('section');panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','ディール・アクション');panel.style.cssText='background:#1b2926;color:#f1dfbd;border:1px solid #b29b70;border-radius:10px;width:min(650px,100%);max-height:92vh;overflow:auto;padding:18px;font:inherit';
  shade.append(panel);document.body.append(shade);dialog=shade;
  function close(){shade.remove();dialog=null;trigger.focus()}
  function el(tag,txt,parent=panel){const e=document.createElement(tag);if(txt!==undefined)e.textContent=txt;parent.append(e);return e}
  function btn(label,fn,parent=panel,disabled=false){const b=el('button',label,parent);b.type='button';b.disabled=disabled;b.style.cssText='margin:3px;padding:8px;border:1px solid #9d8967;border-radius:5px;background:#30423c;color:#f1dfbd;cursor:pointer;opacity:'+(disabled?'.45':'1');b.onclick=fn;return b}
  function input(value,parent=panel){const e=el('input',undefined,parent);e.value=value;e.style.cssText='box-sizing:border-box;max-width:100%;padding:8px;margin:4px;background:#f8f2e6;color:#17221e;border-radius:4px';return e}
  function select(options,parent=panel){const e=el('select',undefined,parent);e.style.cssText='padding:8px;margin:4px;background:#f8f2e6;color:#17221e';options.forEach(([v,t])=>{const o=el('option',t,e);o.value=String(v)});return e}
  function run(list){return root.TabulaDealWorkflow.run(original,list,{recipes:api.shuffleRecipes?api.shuffleRecipes():[]})}
  function finalRun(list=steps,automatic=autoDeal){const preliminary=run(list);if(!automatic)return preliminary.piles.length?run([...list,{type:'collect',order:preliminary.piles.map((_,i)=>i)}]):preliminary;const available=api.spreadCount?api.spreadCount():0;const remaining=Math.max(0,available-preliminary.dealt.length);if(!remaining)return preliminary;const extra=preliminary.piles.length?[{type:'collect',order:preliminary.piles.map((_,i)=>i)},{type:'deal-rest',count:remaining}]:[{type:'deal-rest',count:remaining}];return run([...list,...extra])}
  function change(next,sel=-1){try{const value=run(next);if(value.dealt.length>original.length)throw Error('配札枚数が山札を超えています');steps=next;selected=sel;result=value;message='';paint()}catch(e){message='工程を実行できません：'+e.message;paint()}}
  function label(st){const pile=n=>'束'+String.fromCharCode(65+n);switch(st.type){
   case 'shuffle-recipe':return 'シャッフル：'+((api.shuffleRecipes?api.shuffleRecipes():[]).find(r=>r.id===st.recipeId)?.name||'未登録');
   case 'skip-deal':return '各回'+st.skip+'枚除外して1枚配札 × '+st.times+'回';
   case 'split':return '山札を分割：'+st.sizes.join(' / ')+'枚';
   case 'take':return (st.from==='stock'?'山札':pile(st.from))+'から'+st.count+'枚'+(st.to==='removed'?(st.display==='table'?'除外して卓上に積む':'除外'):st.to==='selected'?'保留':'配札');
   case 'collect':return '積み直す：'+st.order.map(pile).join(' → ');
   case 'reverse-pile':return pile(st.pile)+'の上下順を逆にする';
   default:return st.type;
  }}

  function persist(v){try{localStorage.setItem(STORE,JSON.stringify(v));return true}catch(e){message='保存できませんでした（ブラウザーの保存領域を確認してください）。';paint();return false}}
  function stateBefore(index){return run(steps.slice(0,index))}
  function addStep(){const s=result;const kinds=[];if(s.stock.length||s.piles.some(p=>p.length))kinds.push(['take','カードを除外・配札']);if(!s.piles.length&&s.stock.length>=2)kinds.push(['split','山札を分割']);if(!s.piles.length&&s.stock.length){kinds.push(['skip-deal','除外を挟んで繰り返し配札']);if((api.shuffleRecipes?api.shuffleRecipes():[]).length)kinds.push(['shuffle-recipe','登録済みシャッフルを実行'])}if(s.piles.length){kinds.push(['collect','束を積み直す'],['reverse-pile','束の上下順を逆にする'])}
   if(!kinds.length){message='追加できる工程がありません。';paint();return}
   const box=el('div');box.style.cssText='border:1px solid #7b796c;padding:10px;margin:8px 0;border-radius:6px';
   el('strong','追加する操作',box);const kind=select(kinds,box);
   const fields=el('div',undefined,box);
   function drawFields(){fields.replaceChildren();const type=kind.value;
    if(type==='shuffle-recipe'){const r=api.shuffleRecipes?api.shuffleRecipes():[];const recipe=select(r.map(x=>[x.id,x.name]),fields);return()=>({type,recipeId:recipe.value})}
    if(type==='skip-deal'){el('span','各回の除外枚数',fields);const skip=input('2',fields);skip.type='number';skip.min='0';el('span','配札回数',fields);const times=input(String(Math.min(10,api.spreadCount?api.spreadCount():3)),fields);times.type='number';times.min='1';return()=>({type,skip:Number(skip.value),times:Number(times.value)})}
    if(type==='split'){el('span','各束の枚数',fields);const n=s.stock.length,third=Math.floor(n/3);const sizes=input([third,third,n-third*2].join(','),fields);return()=>({type,sizes:sizes.value.split(',').map(x=>Number(x.trim()))})}
    if(type==='take'){const opts=[];if(s.stock.length)opts.push(['stock','山札 ('+s.stock.length+'枚)']);s.piles.forEach((p,i)=>{if(p.length)opts.push([i,'束'+String.fromCharCode(65+i)+' ('+p.length+'枚)'])});const from=select(opts,fields);el('span','枚数',fields);const count=input('1',fields);count.type='number';count.min='1';el('span','用途',fields);const to=select([['removed','カードを除外'],['dealt','指定枚数を配札']],fields);el('span','除外札の置き方',fields);const display=select([['hidden','従来どおり除外札の山に保管'],['table','卓上に伏せて積む（クリック・ドラッグ可能）']],fields);display.disabled=to.value!=='removed';to.onchange=()=>display.disabled=to.value!=='removed';return()=>({type,from:from.value==='stock'?'stock':Number(from.value),count:Number(count.value),to:to.value,display:to.value==='removed'?display.value:'hidden'})}
    if(type==='collect'){el('span','上からの束の順序（例：C,A,B）',fields);const order=input(s.piles.map((_,i)=>String.fromCharCode(65+i)).join(','),fields);return()=>({type,order:order.value.toUpperCase().split(',').map(x=>x.trim().charCodeAt(0)-65)})}
    const pile=select(s.piles.map((_,i)=>[i,'束'+String.fromCharCode(65+i)]),fields);return()=>({type,pile:Number(pile.value)});
   }
   let read=drawFields();kind.onchange=()=>{read=drawFields()};
   btn('工程を追加',()=>change([...steps,read()]),box);btn('閉じる',()=>{selected=-1;paint()},box);
  }
  function edit(index){const step=steps[index],before=stateBefore(index),box=el('div');box.style.cssText='border:1px solid #b29b70;border-radius:6px;padding:10px;margin:8px 0';
   el('strong','工程 '+(index+1)+' を編集',box);let read;
   if(step.type==='shuffle-recipe'){const r=api.shuffleRecipes?api.shuffleRecipes():[];const v=select(r.map(x=>[x.id,x.name]),box);v.value=step.recipeId;read=()=>({...step,recipeId:v.value})}
   else if(step.type==='skip-deal'){el('span','各回の除外枚数',box);const skip=input(String(step.skip),box);skip.type='number';el('span','配札回数',box);const times=input(String(step.times),box);times.type='number';read=()=>({...step,skip:Number(skip.value),times:Number(times.value)})}
   else if(step.type==='split'){el('span','分割枚数',box);const v=input(step.sizes.join(','),box);read=()=>({...step,sizes:v.value.split(',').map(x=>Number(x.trim()))})}
   else if(step.type==='take'){const opts=[];if(before.stock.length)opts.push(['stock','山札']);before.piles.forEach((p,i)=>{if(p.length)opts.push([i,'束'+String.fromCharCode(65+i)])});const from=select(opts,box);from.value=String(step.from);el('span','枚数',box);const n=input(String(step.count),box);n.type='number';el('span','用途',box);const to=select([['removed','カードを除外'],['dealt','指定枚数を配札']],box);to.value=step.to||'dealt';el('span','除外札の置き方',box);const display=select([['hidden','従来どおり除外札の山に保管'],['table','卓上に伏せて積む（クリック・ドラッグ可能）']],box);display.value=step.display||'hidden';display.disabled=to.value!=='removed';to.onchange=()=>display.disabled=to.value!=='removed';read=()=>({...step,from:from.value==='stock'?'stock':Number(from.value),count:Number(n.value),to:to.value,display:to.value==='removed'?display.value:'hidden'})}
   else if(step.type==='collect'){el('span','積み直し順（例：C,A,B）',box);const v=input(step.order.map(i=>String.fromCharCode(65+i)).join(','),box);read=()=>({...step,order:v.value.toUpperCase().split(',').map(x=>x.trim().charCodeAt(0)-65)})}
   else {const v=select(before.piles.map((_,i)=>[i,'束'+String.fromCharCode(65+i)]),box);v.value=String(step.pile);read=()=>({...step,pile:Number(v.value)})}
   btn('変更を適用',()=>change(steps.map((x,i)=>i===index?read():x),-1),box);btn('閉じる',paint,box);
  }
  function paint(){
   panel.replaceChildren();el('h2','ディール・アクション');
   el('p','上から順に操作します。通常ディールは現在のスプレッドの必要枚数を自動で配ります。');
   if(message){const m=el('p',message);m.setAttribute('role','alert');m.style.color='#ffb9a4'}
   const title=input(name);title.setAttribute('aria-label','アクション名');title.style.width='min(360px,95%)';title.onchange=()=>{name=title.value.trim()||'新しいディール'};
   const list=el('div');list.style.cssText='border:1px solid #6b756b;border-radius:7px;padding:8px;margin:10px 0';
   el('strong','実行リスト（'+steps.length+'工程）',list);
   if(!steps.length)el('p','工程がありません。「＋ 工程追加」から始めてください。',list);
   steps.forEach((step,i)=>{const line=el('div',undefined,list);line.style.cssText='display:flex;align-items:center;gap:4px;flex-wrap:wrap;padding:6px;border-bottom:1px solid #45574f;background:'+(selected===i?'#364b43':'transparent');
    btn((i+1)+'. '+label(step),()=>{selected=i;paint()},line);
    btn('↑',()=>{if(i===0)return;const a=[...steps];[a[i-1],a[i]]=[a[i],a[i-1]];change(a,i-1)},line,i===0);
    btn('↓',()=>{if(i===steps.length-1)return;const a=[...steps];[a[i],a[i+1]]=[a[i+1],a[i]];change(a,i+1)},line,i===steps.length-1);
    btn('×',()=>change(steps.filter((_,j)=>i!==j),Math.min(i,steps.length-2)),line);
   });
   if(selected>=0&&selected<steps.length)edit(selected);
   const ordering=el('div');ordering.style.cssText='border:1px solid #7b796c;border-radius:6px;padding:10px;margin:8px 0';el('strong','配札位置の順序',ordering);const orderChoice=select([['standard','スプレッドの標準順'],['random','ランダムな位置順'],['custom','指定順']],ordering);orderChoice.value=orderMode;const orderField=input(customOrder||((api.defaultOrder?api.defaultOrder():[]).map(n=>n+1).join(', ')),ordering);orderField.placeholder='例：1,2,3,6,5,4';orderField.style.width='95%';orderField.hidden=orderMode!=='custom';orderChoice.onchange=()=>{orderMode=orderChoice.value;orderField.hidden=orderMode!=='custom'};orderField.onchange=()=>{customOrder=orderField.value};
   const auto=el('label',undefined);auto.style.cssText='display:flex;align-items:center;gap:9px;padding:10px;margin:8px 0;border:1px solid #7b796c;border-radius:6px';const tick=el('input',undefined,auto);tick.type='checkbox';tick.checked=autoDeal;tick.onchange=()=>{autoDeal=tick.checked;paint()};el('span','最後に通常ディール（スプレッドの必要枚数を自動配札）',auto);
   const actions=el('div');btn('＋ 工程追加',addStep,actions);btn('一工程戻す',()=>change(steps.slice(0,-1)),actions,!steps.length);btn('最初から',()=>change([], -1),actions,!steps.length);
   let preview=result;try{preview=finalRun()}catch(e){message='通常ディールの確認：'+e.message}const summary=el('p','実行プレビュー：山札 '+preview.stock.length+'枚 / '+preview.piles.map((p,i)=>'束'+String.fromCharCode(65+i)+' '+p.length+'枚').join('、')+' / 配札 '+preview.dealt.length+'枚 / 除外 '+preview.removed.length+'枚');
   summary.setAttribute('role','status');
   if(result.piles.length)el('p','実行時、残りの束はA→B→Cの順に自動で積み直します。');
   const store=el('div');store.style.cssText='border-top:1px solid #6b756b;padding-top:10px;margin-top:10px';
   btn('アクションを保存',()=>{name=title.value.trim()||'新しいディール';const items=saved();const ix=items.findIndex(x=>x.name===name);customOrder=orderField.value;const entry={name,steps:steps.map(x=>({...x})),autoDeal,orderMode,customOrder};if(ix>=0)items[ix]=entry;else items.push(entry);if(persist(items)){refreshPicker();picker.value=name;message='「'+name+'」を保存しました。';paint()}},store,!steps.length&&!autoDeal);
   const items=saved();const chooser=select([['','保存済みアクションを選択'],...items.map(x=>[x.name,x.name])],store);
   btn('読み込む',()=>{const item=items.find(x=>x.name===chooser.value);if(!item)return;name=item.name;autoDeal=item.autoDeal!==false;orderMode=item.orderMode||'standard';customOrder=item.customOrder||'';change(item.steps.map(x=>({...x})), -1)},store);
   btn('削除',()=>{if(!chooser.value)return;const remaining=items.filter(x=>x.name!==chooser.value);if(persist(remaining)){refreshPicker();message='保存済みアクションを削除しました。';paint()}},store);
   const footer=el('div');footer.style.cssText='border-top:1px solid #6b756b;padding-top:10px;margin-top:10px';
   btn('▶ 卓上に実行',()=>{if(!steps.length&&!autoDeal)return;if(!api.canStart()){message='卓上の状態が変わりました。';paint();return}try{const final=finalRun();customOrder=orderField.value;if(final.selected.length)throw Error('保留カードが残っています');api.commit(final.stock,final.dealt,final.removed,{mode:orderMode,order:customOrder,tableRemovedIds:tableRemovedIds(original,steps)});close()}catch(e){message=e.message;paint()}},footer,!steps.length&&!autoDeal);
   btn('キャンセル',close,footer);
  }
  shade.addEventListener('click',e=>{if(e.target===shade)close()});
  shade.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
  paint();
 }
 refreshPicker();trigger.onclick=()=>{if(dialog)return;try{open()}catch(error){if(dialog){dialog.remove();dialog=null}const reason=error&&error.message?error.message:String(error);api.status('ディール編集画面のエラー：'+reason);window.alert('ディール編集画面を開けませんでした。\n'+reason)}};
 return Object.freeze({executeSelected});
}
root.TabulaDealWorkbench=Object.freeze({install});
})(globalThis);
