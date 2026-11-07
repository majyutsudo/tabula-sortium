/* TABULA SORTIUM — optional, reversible custom-deal workbench. */
(function(root){'use strict';
function install(api){
 const host=document.getElementById('cutCountSetting');if(!host||!root.TabulaDealWorkflow)return;
 const trigger=document.createElement('button');trigger.type='button';trigger.textContent='独自ディールを試す';trigger.title='山札を分割・再結合する実験用操作画面';
 host.closest('label')?.after(trigger);
 let dialog=null;
 function open(){
  if(!api.canStart()){api.status('配札中のカードを回収してから独自ディールを開始してください。');return}
  const original=api.deck();if(original.length<2){api.status('山札が2枚以上必要です。');return}
  let steps=[],result=null;
  const shade=document.createElement('div');shade.style.cssText='position:fixed;inset:0;background:#000b;z-index:99999;display:grid;place-items:center;padding:16px';
  const panel=document.createElement('section');panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','独自ディール');panel.style.cssText='background:#1b2926;color:#f1dfbd;border:1px solid #b29b70;border-radius:10px;width:min(560px,100%);max-height:90vh;overflow:auto;padding:20px;font:inherit';
  shade.append(panel);document.body.append(shade);dialog=shade;
  function close(){shade.remove();dialog=null;trigger.focus()}
  function button(text,fn,disabled=false){const b=document.createElement('button');b.type='button';b.textContent=text;b.disabled=disabled;b.style.cssText='margin:4px;padding:9px;border:1px solid #9d8967;border-radius:5px;background:#30423c;color:#f1dfbd;cursor:pointer';b.onclick=fn;panel.append(b);return b}
  function apply(next){try{result=root.TabulaDealWorkflow.run(original,next);steps=next;paint()}catch(e){alert(e.message)}}
  function paint(){
   panel.replaceChildren();
   const title=document.createElement('h2');title.textContent='独自ディール · 試作';panel.append(title);
   const p=document.createElement('p');p.textContent='操作は確定するまで元の山札に影響しません。現在の操作：'+steps.length+'工程';panel.append(p);
   const s=result||root.TabulaDealWorkflow.run(original,[]);
   const summary=document.createElement('p');summary.textContent='山札 '+s.stock.length+'枚 / 束 '+s.piles.map((v,i)=>String.fromCharCode(65+i)+':'+v.length+'枚').join('、')+' / 保留 '+s.selected.length+'枚 / 配札 '+s.dealt.length+'枚';panel.append(summary);
   if(!s.piles.length&&!s.selected.length){
    const label=document.createElement('label');label.textContent='分割する束の枚数（カンマ区切り）';label.style.display='block';panel.append(label);
    const field=document.createElement('input');field.type='text';field.value=Array.from({length:3},(_,i)=>Math.floor(s.stock.length/3)+(i<s.stock.length%3?1:0)).join(',');field.style.cssText='width:100%;padding:9px;margin:8px 0;background:#f8f2e6;color:#17221e';panel.append(field);
    button('束に分ける',()=>{const sizes=field.value.split(',').map(x=>Number(x.trim()));apply([...steps,{type:'split',sizes}])});
   }
   if(s.piles.length){
    const label=document.createElement('p');label.textContent='束を選択した順に山札の上から積み直します。';panel.append(label);
    let order=[];
    const status=document.createElement('p');panel.append(status);
    s.piles.forEach((pile,i)=>button('束 '+String.fromCharCode(65+i)+' ('+pile.length+'枚)',()=>{if(order.includes(i))return;order.push(i);status.textContent='選択順：'+order.map(n=>String.fromCharCode(65+n)).join(' → ')}));
    button('この順序で積み直す',()=>apply([...steps,{type:'collect',order}]),false);
    const indexLabel=document.createElement('label');indexLabel.textContent='反転する束：';panel.append(indexLabel);
    s.piles.forEach((pile,i)=>button('束 '+String.fromCharCode(65+i)+' の順序を反転',()=>apply([...steps,{type:'reverse-pile',pile:i}])));
   }
   button('一工程戻す',()=>apply(steps.slice(0,-1)),steps.length===0);
   button('最初から',()=>apply([]),steps.length===0);
   button('山札に確定',()=>{if(s.piles.length||s.selected.length||s.dealt.length){alert('すべての束を積み直してから確定してください。');return}if(!api.canStart()){alert('卓の状態が変わりました。操作をやり直してください。');return}api.commit(s.stock);close()},!!(s.piles.length||s.selected.length||s.dealt.length||!steps.length));
   button('キャンセル',close);
  }
  shade.addEventListener('click',e=>{if(e.target===shade)close()});
  shade.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
  result=root.TabulaDealWorkflow.run(original,[]);paint();panel.querySelector('input,button')?.focus();
 }
 trigger.onclick=()=>{if(!dialog)open()};
}
root.TabulaDealWorkbench=Object.freeze({install});
})(globalThis);
