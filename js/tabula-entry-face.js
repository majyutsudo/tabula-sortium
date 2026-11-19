/* TABULA entrance — completed Major Arcana face, using the same artwork
   and the full-card frame geometry as TABULA's finishedCardSource().
   Keeps card preparation independent of the 21 flying spectres. */
(function(root){'use strict';
const restored={"major_15":"images/decks/tabula-tarot/restored/major_15.webp","major_16":"images/decks/tabula-tarot/restored/major_16.webp","major_18":"images/decks/tabula-tarot/restored/major_18.webp","major_19":"images/decks/tabula-tarot/restored/major_19.webp","major_21":"images/decks/tabula-tarot/restored/major_21.webp","major_09":"images/decks/tabula-tarot/restored/major_09.webp","major_14":"images/decks/tabula-tarot/restored/major_14.webp","major_00":"images/decks/tabula-tarot/restored/major_00.webp","major_08":"images/decks/tabula-tarot/restored/major_08.webp","major_12":"images/decks/tabula-tarot/restored/major_12.webp","major_04":"images/decks/tabula-tarot/restored/major_04.webp","major_05":"images/decks/tabula-tarot/restored/major_05.webp","major_10":"images/decks/tabula-tarot/restored/major_10.webp","major_07":"images/decks/tabula-tarot/restored/major_07.webp","major_11":"images/decks/tabula-tarot/restored/major_11.webp","major_13":"images/decks/tabula-tarot/restored/major_13.webp","major_17":"images/decks/tabula-tarot/restored/major_17.webp","major_20":"images/decks/tabula-tarot/restored/major_20.webp","major_01":"images/decks/tabula-tarot/restored/major_01.webp","major_06":"images/decks/tabula-tarot/restored/major_06.webp","major_03":"images/decks/tabula-tarot/restored/major_03.webp","major_02":"images/decks/tabula-tarot/restored/major_02.webp"};
const numeral=n=>{if(n===0)return '0';const digits=[[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']];let out='';for(const [value,letter] of digits)while(n>=value){out+=letter;n-=value;}return out;};
const esc=s=>String(s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
function title(number,language){
 const original={group:'major',number,name:'Major Arcana'};
 return root.TabulaDeckStore.translatedName(original,language);
}
function artwork(number){
 const id='major_'+String(number).padStart(2,'0');
 return restored[id]||'images/decks/tabula-tarot/base/'+id+'.webp';
}
function face(number,language){
 const name=title(number,language),english=title(number,'en'),rank=numeral(number);
 const secondary=language==='en'?'MAJOR ARCANA':english.toUpperCase();
 // Use a real HTML image so browser resolution/loading is independent of SVG
 // image-href behavior. The frame matches the full TABULA card geometry.
 return `<div class="completed-major" role="img" aria-label="${esc(name)}">
  <div class="completed-major-rank">${esc(rank)}</div>
  <div class="completed-major-rule"></div>
  <img class="completed-major-art" src="${esc(artwork(number))}" alt="" draggable="false">
  <div class="completed-major-name">${esc(name)}</div>
  <div class="completed-major-subtitle">${esc(secondary)}</div>
  <i class="completed-major-corner a"></i><i class="completed-major-corner b"></i>
  <i class="completed-major-corner c"></i><i class="completed-major-corner d"></i>
 </div>`;
}

root.TabulaEntryFace=Object.freeze({title,artwork,face});
})(globalThis);
