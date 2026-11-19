/* TABULA entrance: reuse the original Major Arcana illustrations. 
   Title translations are shared with TABULA; the art itself stays unframed. */
(function(root){'use strict';

const esc=s=>String(s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
function title(number,language){
 return root.TabulaDeckStore.translatedName({group:'major',number,name:'Major Arcana'},language);
}
function artwork(number){
 const id='major_'+String(number).padStart(2,'0');
 return 'images/decks/tabula-tarot/base/'+id+'.webp';
}
function face(number,language){
 // Restore v29's unframed image; names belong to the separate bilingual label.
 return `<img class="drawn-art" src="${esc(artwork(number))}" alt="${esc(title(number,language))}" draggable="false">`;
}

root.TabulaEntryFace=Object.freeze({title,artwork,face});
})(globalThis);
