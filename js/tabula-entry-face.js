/* TABULA entrance: reuse the original Major Arcana illustrations. 
   Title translations are shared with TABULA; the art itself stays unframed. */
(function(root){'use strict';
const restored={"major_15":"images/decks/tabula-tarot/restored/major_15.webp","major_16":"images/decks/tabula-tarot/restored/major_16.webp","major_18":"images/decks/tabula-tarot/restored/major_18.webp","major_19":"images/decks/tabula-tarot/restored/major_19.webp","major_21":"images/decks/tabula-tarot/restored/major_21.webp","major_09":"images/decks/tabula-tarot/restored/major_09.webp","major_14":"images/decks/tabula-tarot/restored/major_14.webp","major_00":"images/decks/tabula-tarot/restored/major_00.webp","major_08":"images/decks/tabula-tarot/restored/major_08.webp","major_12":"images/decks/tabula-tarot/restored/major_12.webp","major_04":"images/decks/tabula-tarot/restored/major_04.webp","major_05":"images/decks/tabula-tarot/restored/major_05.webp","major_10":"images/decks/tabula-tarot/restored/major_10.webp","major_07":"images/decks/tabula-tarot/restored/major_07.webp","major_11":"images/decks/tabula-tarot/restored/major_11.webp","major_13":"images/decks/tabula-tarot/restored/major_13.webp","major_17":"images/decks/tabula-tarot/restored/major_17.webp","major_20":"images/decks/tabula-tarot/restored/major_20.webp","major_01":"images/decks/tabula-tarot/restored/major_01.webp","major_06":"images/decks/tabula-tarot/restored/major_06.webp","major_03":"images/decks/tabula-tarot/restored/major_03.webp","major_02":"images/decks/tabula-tarot/restored/major_02.webp"};
const esc=s=>String(s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
function title(number,language){
 return root.TabulaDeckStore.translatedName({group:'major',number,name:'Major Arcana'},language);
}
function artwork(number){
 const id='major_'+String(number).padStart(2,'0');
 return restored[id]||'images/decks/tabula-tarot/base/'+id+'.webp';
}
function face(number,language){
 // Restore v29's unframed image; names belong to the separate bilingual label.
 return `<img class="drawn-art" src="${esc(artwork(number))}" alt="${esc(title(number,language))}" draggable="false">`;
}

root.TabulaEntryFace=Object.freeze({title,artwork,face});
})(globalThis);
