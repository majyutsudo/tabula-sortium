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
 // Inline SVG is essential: external artwork references inside an SVG data
 // URL are blocked by browsers, whereas inline SVG resolves same-origin hrefs.
 return `<svg class="completed-major" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 450" role="img" aria-label="${esc(name)}">
 <defs><linearGradient id="entryPaper" x2="1" y2="1"><stop stop-color="#fbefcf"/><stop offset="1" stop-color="#e5cda1"/></linearGradient></defs>
 <rect x="1" y="1" width="298" height="448" rx="10" fill="url(#entryPaper)" stroke="#735b37" stroke-width="2"/>
 <rect x="7" y="7" width="286" height="436" rx="5" fill="none" stroke="#ad8b51" stroke-width="2"/>
 <rect x="12" y="12" width="276" height="426" rx="3" fill="none" stroke="#8b7049" stroke-width=".65"/>
 <path d="M18 34H103M197 34H282M18 390H282" stroke="#a28554" stroke-width=".6"/>
 <text x="150" y="34" text-anchor="middle" fill="#43301b" font-family="Georgia,serif" font-size="${rank.length>5?17:22}">${rank}</text>
 <image href="${esc(artwork(number))}" x="20" y="48" width="260" height="332" preserveAspectRatio="xMidYMid meet"/>
 <text x="150" y="412" text-anchor="middle" fill="#49341e" font-family="'Yu Mincho','Hiragino Mincho ProN',Georgia,serif" font-size="${name.length>23?11:14}">${esc(name)}</text>
 <text x="150" y="428" text-anchor="middle" fill="#6c5130" font-family="Georgia,serif" font-size="8" letter-spacing=".8">${esc(secondary)}</text>
 <g fill="#997841"><path d="M16 16l3 4-3 4-3-4zM284 16l3 4-3 4-3-4zM16 426l3 4-3 4-3-4zM284 426l3 4-3 4-3-4z"/></g>
 </svg>`;
}
root.TabulaEntryFace=Object.freeze({title,artwork,face});
})(globalThis);
