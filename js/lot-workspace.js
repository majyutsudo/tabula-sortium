/* TABULA — normal-table lot drawing experiment. Reading state is local to this session. */
(function(root){'use strict';
let state=null,key=null,opened=new Set(),mixed=false,previous='card:builtin',active=false,effects=true;
const S=root.TabulaInstrumentStore,I=root.TabulaContentIdentity;
const $=id=>document.getElementById(id);
const node=(tag,text,cls)=>{const e=document.createElement(tag);if(text!=null)e.textContent=text;if(cls)e.className=cls;return e};
function sets(){return [...root.TabulaStandardInstrumentSets.map(S.normalize),...S.read(localStorage)].filter(v=>v.type==='lot')}
const layer=node('section',null,'lot-table-layer');layer.id='lotTableLayer';layer.hidden=true;$('surface').append(layer);
const bar=node('nav',null,'table-shortcuts lot-quick-actions');bar.hidden=true;$('diceQuickActions').after(bar);
const picker=node('label',null,'field lot-set-picker');picker.hidden=true;picker.append(document.createTextNode('使用する籤'));const select=node('select');picker.append(select);$('instrumentPicker').append(picker);
const options=node('div',null,'lot-table-options');options.hidden=true;bar.after(options);
const count=node('input');count.type='number';count.min='1';count.max='400';count.value='1';count.setAttribute('aria-label','一度に引く本数');
const label=node('label','抽出数 ');label.append(count);options.append(label);
const check=node('input');check.type='checkbox';check.checked=true;check.onchange=()=>{effects=check.checked;paint()};const cl=node('label','');cl.append(check,document.createTextNode(' 吉凶演出'));options.append(cl);
const action=(symbol,name,fn)=>{const b=node('button');b.type='button';b.append(node('span',symbol,'quick-symbol'),node('span',name));b.onclick=fn;bar.append(b);return b};
const mix=action('⟳','混ぜる',()=>{mixed=true;paint()});
const draw=action('◇','引く',()=>{try{state=S.take(state,Number(count.value));mixed=false;paint()}catch(e){alert(e.message)}});
const reveal=action('◉','開く',()=>{state?.drawn.forEach(id=>opened.add(id));paint()});
const collect=action('↶','回収',()=>{if(state?.drawn.length&&!confirm('すべての籤を戻しますか？'))return;reset()});
const detail=action('▤','結果',()=>{if(!state)return;const rows=state.drawn.filter(id=>opened.has(id)).map(id=>{const x=state.set.items.find(v=>v.id===id);return [x.number,x.fortune,x.body].filter(v=>v!=null&&v!=='').join('\n')});alert(rows.join('\n\n')||'まだ開いた籤はありません。')});
function reset(){const v=sets().find(v=>I.key(v.identity)===key);state=v?S.session(v):null;opened=new Set();mixed=false;paint()}
function refresh(){const rows=sets();select.replaceChildren(...rows.map(v=>new Option(v.name,I.key(v.identity))));if(!rows.some(v=>I.key(v.identity)===key)){key=rows[0]?I.key(rows[0].identity):null;reset()}select.value=key||''}
select.onchange=()=>{if(state?.drawn.length&&!confirm('現在の籤を回収してセットを変更しますか？')){select.value=key;return}key=select.value;reset()};
function paint(){layer.replaceChildren();if(!state){layer.append(node('p','籤セットがありません。占具管理室で登録してください。'));draw.disabled=mix.disabled=reveal.disabled=collect.disabled=detail.disabled=true;return}
 const title=node('div',state.set.name,'lot-table-title');layer.append(title);
 const wrap=node('div',null,'lot-table-content');const vessel=node('button',null,'lot-vessel');vessel.type='button';vessel.setAttribute('aria-label','籤を引く');vessel.append(node('span','籤','lot-vessel-mark'),node('small','残り '+state.remaining.length+' 本'));vessel.onclick=()=>draw.click();vessel.classList.toggle('mixed',mixed);wrap.append(vessel);
 const papers=node('div',null,'lot-table-papers');for(const [i,id] of state.drawn.entries()){const x=state.set.items.find(v=>v.id===id),a=node('article',null,'instrument-lot-paper instrument-lot-vertical');if(!opened.has(id)){a.classList.add('sealed');const b=node('button','御籤 '+(i+1),'instrument-lot-sealed');b.onclick=()=>{opened.add(id);paint()};a.append(b)}else{if(effects){if(['大吉','吉','小吉','半吉','末吉','末小吉'].includes(x.fortune))a.classList.add('lot-favorable');if(['凶','大凶','小凶','半凶','末凶'].includes(x.fortune))a.classList.add('lot-unfavorable')}if(x.number!=null)a.append(node('h3','第'+x.number+'番'));if(x.fortune)a.append(node('p',x.fortune,'instrument-field-fortune'));if(x.body)a.append(node('p',x.body,'instrument-field-body'))}papers.append(a)}wrap.append(papers);layer.append(wrap);
 count.max=String(Math.max(1,state.remaining.length));if(Number(count.value)>Number(count.max))count.value=count.max;draw.disabled=mix.disabled=!state.remaining.length;reveal.disabled=state.drawn.every(id=>opened.has(id));collect.disabled=!state.drawn.length;detail.disabled=!opened.size;
}
const toolPicker=$('instrumentItem');toolPicker.addEventListener('change',()=>{if(toolPicker.value==='lot'&&!active)previous=root.TabulaTableTools.context().id},{capture:true});
root.TabulaLotWorkspace={activate(){active=true;document.body.classList.add('tabula-lot-mode');layer.hidden=bar.hidden=picker.hidden=options.hidden=false;refresh();paint()},deactivate(){active=false;document.body.classList.remove('tabula-lot-mode');layer.hidden=bar.hidden=picker.hidden=options.hidden=true},leave(){return !state?.drawn.length||confirm('籤の試験卓を閉じますか？')},previous:()=>previous};
})(globalThis);
