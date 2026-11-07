/* TABULA SORTIUM — action-list custom deal editor. */
(function(root){'use strict';
function install(api){
 const host=document.getElementById('cutCountSetting');if(!host||!root.TabulaDealWorkflow)return;
 const trigger=document.createElement('button');trigger.type='button';trigger.textContent='ディール・アクション';trigger.title='配札手順を記録・編集・保存・実行';
 host.closest('label')?.after(trigger);
 const STORE='tabula-deal-actions-v1';
 let dialog=null;
 function open(){
  if(!api.canStart()){api.status('卓上のカードを回収してから開始してください。');return}
  const original=api.deck();if(original.length<2){api.status('山札が2枚以上必要です。');return}
  let steps=[],selected=-1,result=root.TabulaDealWorkflow.run(original,[]),message='',name='新しいディール';
  const shade=document.createElement('div');shade.style.cssText='position:fixed;inset:0;background:#000b;z-index:99999;display:grid;place-items:center;padding:12px';
  const panel=document.createElement('section');panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','ディール・アクション');panel.style.cssText='background:#1b2926;color:#f1dfbd;border:1px solid #b29b70;border-radius:10px;width:min(650px,100%);max-height:92vh;overflow:auto;padding:18px;font:inherit';
  shade.append(panel);document.body.append(shade);dialog=shade;
  function close(){shade.remove();dialog=null;trigger.focus()}
  function el(tag,txt,parent=panel){const e=document.createElement(tag);if(txt!==undefined)e.textContent=txt;parent.append(e);return e}
  function btn(label,fn,parent=panel,disabled=false){const b=el('button',label,parent);b.type='button';b.disabled=disabled;b.style.cssText='margin:3px;padding:8px;border:1px solid #9d8967;border-radius:5px;background:#30423c;color:#f1dfbd;cursor:pointer;opacity:'+(disabled?'.45':'1');b.onclick=fn;return b}
  function input(value,parent=panel){const e=el('input',undefined,parent);e.value=value;e.style.cssText='box-sizing:border-box;max-width:100%;padding:8px;margin:4px;background:#f8f2e6;color:#17221e;border-radius:4px';return e}
  function select(options,parent=panel){const e=el('select',undefined,parent);e.style.cssText='padding:8px;margin:4px;background:#f8f2e6;color:#17221e';options.forEach(([v,t])=>{const o=el('option',t,e);o.value=String(v)});return e}
  function run(list){return root.TabulaDealWorkflow.run(original,list)}
  function change(next,sel=next.length-1){try{const value=run(next);if(value.dealt.length>52)throw Error('配札は52枚までです');steps=next;selected=sel;result=value;message='';paint()}catch(e){message='工程を実行できません：'+e.message;paint()}}
  function label(st){const pile=n=>'束'+String.fromCharCode(65+n);switch(st.type){
   case 'split':return '山札を分割：'+st.sizes.join(' / ')+'枚';
   case 'take':return (st.from==='stock'?'山札':pile(st.from))+'から'+st.count+'枚'+(st.to==='removed'?'除外':st.to==='selected'?'保留':'配札');
   case 'collect':return '積み直す：'+st.order.map(pile).join(' → ');
   case 'reverse-pile':return pile(st.pile)+'の上下順を逆にする';
   default:return st.type;
  }}
  function saved(){try{const v=JSON.parse(localStorage.getItem(STORE)||'[]');return Array.isArray(v)?v:[]}catch(e){return []}}
  function persist(v){try{localStorage.setItem(STORE,JSON.stringify(v));return true}catch(e){message='保存できませんでした（ブラウザーの保存領域を確認してください）。';paint();return false}}
  function stateBefore(index){return run(steps.slice(0,index))}
  function addStep(){const s=result;const kinds=[];if(!s.piles.length&&s.stock.length>=2)kinds.push(['split','山札を分割']);if(s.stock.length||s.piles.some(p=>p.length))kinds.push(['take','カードを取り出す']);if(s.piles.length){kinds.push(['collect','束を積み直す'],['reverse-pile','束の上下順を逆にする'])}
   if(!kinds.length){message='追加できる工程がありません。';paint();return}
   const box=el('div');box.style.cssText='border:1px solid #7b796c;padding:10px;margin:8px 0;border-radius:6px';
   el('strong','追加する操作',box);const kind=select(kinds,box);
   const fields=el('div',undefined,box);
   function drawFields(){fields.replaceChildren();const type=kind.value;
    if(type==='split'){el('span','各束の枚数',fields);const n=s.stock.length,third=Math.floor(n/3);const sizes=input([third,third,n-third*2].join(','),fields);return()=>({type,sizes:sizes.value.split(',').map(x=>Number(x.trim()))})}
    if(type==='take'){const opts=[];if(s.stock.length)opts.push(['stock','山札 ('+s.stock.length+'枚)']);s.piles.forEach((p,i)=>{if(p.length)opts.push([i,'束'+String.fromCharCode(65+i)+' ('+p.length+'枚)'])});const from=select(opts,fields);el('span','枚数',fields);const count=input('1',fields);count.type='number';count.min='1';el('span','用途',fields);const to=select([['dealt','卓上に配札'],['removed','除外する']],fields);return()=>({type,from:from.value==='stock'?'stock':Number(from.value),count:Number(count.value),to:to.value})}
    if(type==='collect'){el('span','上からの束の順序（例：C,A,B）',fields);const order=input(s.piles.map((_,i)=>String.fromCharCode(65+i)).join(','),fields);return()=>({type,order:order.value.toUpperCase().split(',').map(x=>x.trim().charCodeAt(0)-65)})}
    const pile=select(s.piles.map((_,i)=>[i,'束'+String.fromCharCode(65+i)]),fields);return()=>({type,pile:Number(pile.value)});
   }
   let read=drawFields();kind.onchange=()=>{read=drawFields()};
   btn('工程を追加',()=>change([...steps,read()]),box);btn('閉じる',paint,box);
  }
  function edit(index){const step=steps[index],before=stateBefore(index),box=el('div');box.style.cssText='border:1px solid #b29b70;border-radius:6px;padding:10px;margin:8px 0';
   el('strong','工程 '+(index+1)+' を編集',box);let read;
   if(step.type==='split'){el('span','分割枚数',box);const v=input(step.sizes.join(','),box);read=()=>({...step,sizes:v.value.split(',').map(x=>Number(x.trim()))})}
   else if(step.type==='take'){const opts=[];if(before.stock.length)opts.push(['stock','山札']);before.piles.forEach((p,i)=>{if(p.length)opts.push([i,'束'+String.fromCharCode(65+i)])});const from=select(opts,box);from.value=String(step.from);el('span','枚数',box);const n=input(String(step.count),box);n.type='number';el('span','用途',box);const to=select([['dealt','卓上に配札'],['removed','除外する']],box);to.value=step.to||'dealt';read=()=>({...step,from:from.value==='stock'?'stock':Number(from.value),count:Number(n.value),to:to.value})}
   else if(step.type==='collect'){el('span','積み直し順（例：C,A,B）',box);const v=input(step.order.map(i=>String.fromCharCode(65+i)).join(','),box);read=()=>({...step,order:v.value.toUpperCase().split(',').map(x=>x.trim().charCodeAt(0)-65)})}
   else {const v=select(before.piles.map((_,i)=>[i,'束'+String.fromCharCode(65+i)]),box);v.value=String(step.pile);read=()=>({...step,pile:Number(v.value)})}
   btn('変更を適用',()=>change(steps.map((x,i)=>i===index?read():x),index),box);btn('閉じる',paint,box);
  }
  function paint(){
   panel.replaceChildren();el('h2','ディール・アクション');
   el('p','工程を上から順に実行します。変更は「卓上に実行」まで現在の占いに反映されません。');
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
   const actions=el('div');btn('＋ 工程追加',addStep,actions);btn('一工程戻す',()=>change(steps.slice(0,-1)),actions,!steps.length);btn('最初から',()=>change([], -1),actions,!steps.length);
   const summary=el('p','現在の計算結果：山札 '+result.stock.length+'枚 / '+result.piles.map((p,i)=>'束'+String.fromCharCode(65+i)+' '+p.length+'枚').join('、')+' / 配札 '+result.dealt.length+'枚 / 除外 '+result.removed.length+'枚');
   summary.setAttribute('role','status');
   if(result.piles.length)el('p','実行時、残りの束はA→B→Cの順に自動で積み直します。');
   const store=el('div');store.style.cssText='border-top:1px solid #6b756b;padding-top:10px;margin-top:10px';
   btn('アクションを保存',()=>{name=title.value.trim()||'新しいディール';const items=saved();const ix=items.findIndex(x=>x.name===name);const entry={name,steps:steps.map(x=>({...x}))};if(ix>=0)items[ix]=entry;else items.push(entry);if(persist(items)){message='「'+name+'」を保存しました。';paint()}},store,!steps.length);
   const items=saved();const chooser=select([['','保存済みアクションを選択'],...items.map(x=>[x.name,x.name])],store);
   btn('読み込む',()=>{const item=items.find(x=>x.name===chooser.value);if(!item)return;name=item.name;change(item.steps.map(x=>({...x})), -1)},store);
   btn('削除',()=>{if(!chooser.value)return;const remaining=items.filter(x=>x.name!==chooser.value);if(persist(remaining)){message='保存済みアクションを削除しました。';paint()}},store);
   const footer=el('div');footer.style.cssText='border-top:1px solid #6b756b;padding-top:10px;margin-top:10px';
   btn('▶ 卓上に実行',()=>{if(!steps.length)return;if(!api.canStart()){message='卓上の状態が変わりました。';paint();return}try{const final=result.piles.length?run([...steps,{type:'collect',order:result.piles.map((_,i)=>i)}]):result;if(final.selected.length)throw Error('保留カードが残っています');api.commit(final.stock,final.dealt,final.removed);close()}catch(e){message=e.message;paint()}},footer,!steps.length);
   btn('キャンセル',close,footer);
  }
  shade.addEventListener('click',e=>{if(e.target===shade)close()});
  shade.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
  paint();
 }
 trigger.onclick=()=>{if(!dialog)open()};
}
root.TabulaDealWorkbench=Object.freeze({install});
})(globalThis);
