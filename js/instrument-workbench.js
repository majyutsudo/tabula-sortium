/* First instrument-set workbench. This modal does not change the active tabletop. */
(function(root){'use strict';
function mount({open,close,creator,download,status}){
 const S=root.TabulaInstrumentStore,D=root.TabulaInstrumentData,I=root.TabulaContentIdentity;
 const $=id=>document.getElementById(id);
 let selected=null,reading=null,revealed=new Set();
 const button=document.createElement('button');button.type='button';button.textContent='占具セット管理（試験版）';button.className='instrument-manager-open';$('instrumentPicker').after(button);
 const get=()=>S.read(localStorage);
 function show(){
  try{
   open('<h2>占具セット管理</h2><p class="mini">籤の抽出を試すための共通管理室です。現在の卓は変更しません。</p><label class="field">登録セット<select id="instSets"></select></label><div class="instrument-manager-actions"><button id="instNew">新規作成</button><button id="instEdit">編集</button><button id="instCopy">複製</button><button id="instDelete">削除</button><button id="instExport">書き出し</button><button id="instImport">読み込み</button></div><input id="instFile" type="file" accept=".json,application/json" hidden><div id="instReading" class="stack"></div>');
   const rows=get(),select=$('instSets');for(const v of rows)select.add(new Option(v.name+'（'+v.items.length+'個）',I.key(v.identity)));
   if(!rows.some(v=>I.key(v.identity)===selected))selected=rows[0]?I.key(rows[0].identity):null;
   select.value=selected||'';select.onchange=()=>{selected=select.value;reading=null;paint()};
   const current=()=>get().find(v=>I.key(v.identity)===selected);
   $('instNew').onclick=()=>edit(null);$('instEdit').onclick=()=>{const v=current();if(v)edit(v)};
   $('instCopy').onclick=()=>{const v=current();if(v)edit({...v,name:v.name+'（複製）'},true)};
   $('instDelete').onclick=()=>{const v=current();if(v&&confirm('「'+v.name+'」を削除しますか？')){S.write(localStorage,get().filter(x=>I.key(x.identity)!==selected));reading=null;show()}};
   $('instExport').onclick=()=>{const v=current();if(v)download(S.portable(v),'TABULA_instrument.json')};
   $('instImport').onclick=()=>$('instFile').click();
   $('instFile').onchange=async()=>{try{const file=$('instFile').files[0];if(!file)return;const v=S.parse(JSON.parse(await file.text())),key=I.key(v.identity),all=get();if(all.some(x=>I.key(x.identity)===key))throw Error('同じ作品IDが登録済みです。');S.write(localStorage,[...all,v]);selected=key;reading=null;show()}catch(e){alert(e.message)}};
   function paint(){
    const host=$('instReading'),v=current();host.replaceChildren();
    for(const id of ['instEdit','instCopy','instDelete','instExport'])$(id).disabled=!v;
    if(!v){host.textContent='新規作成またはJSON読み込みで占具を登録してください。';return}
    if(!['lot','rune'].includes(v.type)){host.textContent='この種類の卓上操作は今後対応します。';return}
    if(!reading||I.key(reading.set.identity)!==selected){reading=S.session(v);revealed=new Set()}
    const info=document.createElement('p');info.textContent='残り '+reading.remaining.length+' / '+v.items.length+(v.type==='lot'?' 本':' 個');host.append(info);
    const controls=document.createElement('div');controls.className='instrument-manager-actions';
    const count=document.createElement('input');count.type='number';count.min='1';count.max=String(Math.max(1,reading.remaining.length));count.value='1';count.setAttribute('aria-label','抽出数');count.style.maxWidth='5em';
    const draw=document.createElement('button');draw.type='button';draw.textContent='引く';draw.disabled=!reading.remaining.length;
    draw.onclick=()=>{try{reading=S.take(reading,Number(count.value));paint()}catch(e){alert(e.message)}};
    const reset=document.createElement('button');reset.type='button';reset.textContent='すべて戻す';reset.onclick=()=>{reading=S.session(v);revealed=new Set();paint()};
    const revealAll=document.createElement('button');revealAll.type='button';revealAll.textContent='すべて開く';revealAll.disabled=reading.drawn.every(id=>revealed.has(id));revealAll.onclick=()=>{reading.drawn.forEach(id=>revealed.add(id));paint()};controls.append(count,draw,revealAll,reset);host.append(controls);
    const results=document.createElement('div');results.className='instrument-lot-results';host.append(results);
    for(const [i,id] of reading.drawn.entries()){const item=reading.set.items.find(x=>x.id===id),article=document.createElement('article');article.className='instrument-lot-paper';
     if(!revealed.has(id)){const reveal=document.createElement('button');reveal.type='button';reveal.className='instrument-lot-sealed';reveal.textContent=(v.type==='lot'?'籤':'ルーン')+' '+(i+1)+' · 開く';reveal.onclick=()=>{revealed.add(id);paint()};article.append(reveal);article.classList.add('sealed')}
     else for(const f of D.fields){const value=item[f.id];if(value==null||value==='')continue;const p=document.createElement(f.id==='number'?'h3':'p');p.className='instrument-field-'+f.id;p.textContent=f.id==='number'?'第'+value+'番':f.id==='body'||f.id==='fortune'||f.id==='symbol'?String(value):f.label+'：'+value;article.append(p)}results.append(article);
    }
   }paint();
  }catch(e){alert(e.message)}
 }
 function edit(original,copy=false){
  let items=original?original.items.map(x=>({...x})):[{id:I.uuid(),number:1,body:''}];
  open('<h2>占具セット編集</h2><label class="field">名称<input id="instName"></label><label class="field">種類<select id="instType"><option value="lot">籤</option><option value="rune">ルーン</option><option value="card">カード</option><option value="dice">ダイス</option></select></label><label class="field">出典<input id="instSource"></label><label class="field">個体<select id="instItem"></select></label><div id="instFields" class="stack"></div><div class="instrument-manager-actions"><button id="instAdd">個体を追加</button><button id="instRemove">個体を削除</button><button id="instCancel">キャンセル</button><button class="primary" id="instSave">保存</button></div>');
  $('instName').value=original?.name||'';$('instType').value=original?.type||'lot';$('instSource').value=original?.source||'';
  let index=0;
  function paint(){const item=items[index],select=$('instItem');select.replaceChildren(...items.map((x,i)=>new Option((i+1)+' · '+(x.name||x.number||'未設定'),String(i))));select.value=String(index);const host=$('instFields');host.replaceChildren();
   const base=new Set(D.visibleFields($('instType').value,item).map(f=>f.id)),more=document.createElement('details'),summary=document.createElement('summary');summary.textContent='追加の情報項目';more.append(summary);
   for(const f of D.fields){const label=document.createElement('label');label.className='field';label.textContent=f.label;const input=document.createElement(['body','note','upright','reversed'].includes(f.id)?'textarea':'input');if(input.tagName==='TEXTAREA')input.rows=4;input.value=item[f.id]??'';input.oninput=()=>{item[f.id]=input.value};label.append(input);(base.has(f.id)?host:more).append(label)}host.append(more);$('instRemove').disabled=items.length===1;
  }
  $('instItem').onchange=()=>{index=Number($('instItem').value);paint()};$('instType').onchange=paint;
  $('instAdd').onclick=()=>{if(items.length>=400)return;items.push({id:I.uuid(),number:items.length+1,body:''});index=items.length-1;paint()};
  $('instRemove').onclick=()=>{if(items.length>1&&confirm('この個体を削除しますか？')){items.splice(index,1);index=Math.min(index,items.length-1);paint()}};
  $('instCancel').onclick=show;
  $('instSave').onclick=()=>{try{const c=creator(),old=original?.identity;if(old&&!copy&&old.creator.id!==c.id)throw Error('他の制作者のセットは複製して編集してください。');const identity=old&&!copy?I.revise(old,c):I.newIdentity(c,old),v=S.normalize({identity,name:$('instName').value,type:$('instType').value,source:$('instSource').value,items});selected=I.key(identity);S.write(localStorage,[...get().filter(x=>I.key(x.identity)!==selected),v]);reading=null;show();status('占具セットを保存しました。')}catch(e){alert(e.message)}};
  paint();
 }
 button.onclick=show;
}
root.TabulaInstrumentWorkbench=Object.freeze({mount});
})(globalThis);
