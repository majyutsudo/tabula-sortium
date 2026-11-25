/* TABULA — one set of label rules for the live dice table and placement sheets. */
(function(root){'use strict';
const roles={
 astro:['天体','十二宮','ハウス'],
 iching:['上卦','下卦','動爻'],
 calendar:['月','日・十の位','日・一の位','午前／午後','時','分']
};
function labelFor(dice,index,mode='off'){
 if(mode==='off')return '';
 const item=dice?.settings?.[index]||{};
 const fallback=roles[dice?.mode]?.[index]||'ダイス'+(index+1);
 const name=dice?.mode==='normal'?(String(item.userLabel||'').trim()||fallback):fallback;
 if(mode==='number')return String(index+1);
 if(mode==='position')return (index+1)+' · '+name;
 if(mode==='positionPlain'||mode==='card')return name;
 return '';
}
function preferences(doc){
 const toggle=doc.getElementById('toolbarLabelToggle');
 const select=doc.getElementById('tableLabelMode');
 const placement=doc.getElementById('labelPlacement')?.value;
 return {
  mode:toggle?.dataset.labelMode||select?.value||'off',
  position:['above','center','below'].includes(placement)?placement:'below'
 };
}
root.TabulaDiceLabels=Object.freeze({labelFor,preferences});
})(globalThis);
