/* TABULA deck blueprint designer — independent card identities, no 78-card dependency. */
(function(root){'use strict';
const KEY='tabula_deck_blueprints_v1';
const clone=x=>JSON.parse(JSON.stringify(x));
const clean=x=>String(x??'').trim();
const newBlueprintId=()=>'blueprint_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8);
function playingCards(id=newBlueprintId(),name='プレイングカード（52枚）'){
 const suits=[
  // Match the Tarot suit sequence: Wands, Cups, Swords, Pentacles.
  {id:'clubs',name:'クラブ',symbol:'♣',color:'black'},
  {id:'hearts',name:'ハート',symbol:'♥',color:'red'},
  {id:'spades',name:'スペード',symbol:'♠',color:'black'},
  {id:'diamonds',name:'ダイヤ',symbol:'♦',color:'red'}
 ];
 const ranks=Array.from({length:13},(_,i)=>({id:'r'+(i+1),order:i+1,label:['A','2','3','4','5','6','7','8','9','10','J','Q','K'][i],name:['エース','2','3','4','5','6','7','8','9','10','ジャック','クイーン','キング'][i]}));
 return {id,name,suits,ranks,cards:[],nameSets:[{id:'primary',label:'基本名称'}],version:1};
}
// Two distinct physical cards sharing one approved artwork. A Joker belongs to
// the built-in deck's catalogue, but not to any reduced historic rank preset.
// Localized names for the built-in French-suited playing cards.
// These are language labels, not claims about historical divinatory meanings.
const PLAYING_LANGUAGES=Object.freeze([
 ['primary','日本語（基本名称）'],['en','English'],['fr','Français'],
 ['es','Español'],['de','Deutsch'],['it','Italiano']
]);
const PLAYING_SUIT_NAMES=Object.freeze({
 en:{spades:'Spades',hearts:'Hearts',diamonds:'Diamonds',clubs:'Clubs'},
 fr:{spades:'pique',hearts:'cœur',diamonds:'carreau',clubs:'trèfle'},
 es:{spades:'picas',hearts:'corazones',diamonds:'diamantes',clubs:'tréboles'},
 de:{spades:'Pik',hearts:'Herz',diamonds:'Karo',clubs:'Kreuz'},
 it:{spades:'picche',hearts:'cuori',diamonds:'quadri',clubs:'fiori'}
});
const PLAYING_RANK_NAMES=Object.freeze({
 en:['Ace','2','3','4','5','6','7','8','9','10','Jack','Queen','King'],
 fr:['As','2','3','4','5','6','7','8','9','10','Valet','Dame','Roi'],
 es:['As','2','3','4','5','6','7','8','9','10','Jota','Reina','Rey'],
 de:['Ass','2','3','4','5','6','7','8','9','10','Bube','Dame','König'],
 it:['Asso','2','3','4','5','6','7','8','9','10','Fante','Donna','Re']
});
function playingName(card,language='primary'){
 if(language==='primary'||language==='ja'||language==='original')return card.name;
 const rank=Number(String(card.rankId||'').replace(/^r/,'')),suit=PLAYING_SUIT_NAMES[language]?.[card.suitId];
 if(card.kind==='joker'){
  const index=card.id==='playing-joker-2'?'Ⅱ':'Ⅰ';
  return 'Joker '+index;
 }
 if(!suit||!Number.isInteger(rank)||rank<1||rank>13)return card.name;
 const name=PLAYING_RANK_NAMES[language][rank-1];
 if(language==='en')return name+' of '+suit;
 if(language==='fr')return name+' de '+suit;
 if(language==='es')return name+' de '+suit;
 if(language==='de')return suit+'-'+name;
 return name+' di '+suit;
}
const builtInPlaying=playingCards('playing-cards','TABULA PLAYING CARDS');
builtInPlaying.nameSets=PLAYING_LANGUAGES.map(([id,label])=>({id,label}));
builtInPlaying.cards.push(
 {id:'playing-joker-1',name:'ジョーカーⅠ',number:'JOKER',rankId:null,suitId:null,kind:'joker'},
 {id:'playing-joker-2',name:'ジョーカーⅡ',number:'JOKER',rankId:null,suitId:null,kind:'joker'}
);
function blank(){
 return {id:newBlueprintId(),name:'新しいデッキ',suits:[],ranks:[],cards:[],nameSets:[{id:'primary',label:'基本名称'}],version:1};
}
function generate(def){
 const list=[],ids=new Set();
 const overrides=new Map(def.cards.map(c=>[c.id,c]));
 for(const suit of def.suits)for(const rank of def.ranks){
  const id='c_'+suit.id+'_'+rank.id;
  list.push({...{id,suitId:suit.id,rankId:rank.id,number:rank.label,name:suit.name+'の'+rank.name,names:{}},...clone(overrides.get(id)||{})});
  ids.add(id);
 }
 for(const c of def.cards){
  if(!ids.has(c.id)){list.push(clone(c));ids.add(c.id)}
 }
 return list;
}
// The 52-card template keeps its suit and rank IDs even when labels change.
const playingSuitIds=new Set(['spades','hearts','diamonds','clubs']);
const courtRanks=new Map([['r11','j'],['r12','q'],['r13','k']]);
const isPlayingCourt=card=>playingSuitIds.has(card.suitId)&&courtRanks.has(card.rankId);
const pipRanks=new Map(Array.from({length:10},(_,i)=>['r'+(i+1),i+1]));
const center=y=>[60,y];
const sides=(...rows)=>rows.flatMap(y=>[[38,y],[82,y]]);
const pipLayouts=[
 [],
 [center(90)],
 [center(32),center(148)],
 [center(32),center(90),center(148)],
 sides(32,148),
 [...sides(32,148),center(90)],
 sides(32,90,148),
 [...sides(32,90,148),center(61)],
 [...sides(32,90,148),center(61),center(119)],
 [...sides(32,71,109,148),center(90)],
 [...sides(32,71,109,148),center(51.5),center(128.5)]
];
const suitPaths=new Map([
 ['♠','M0-12C-4-7-12-3-12 3a6 6 0 0 0 10 4c-.4 2-1.3 4-3 5h10c-1.7-1-2.6-3-3-5a6 6 0 0 0 10-4c0-6-8-10-12-15Z'],
 ['♥','M0 11C-6 6-12 2-12-4a6.5 6.5 0 0 1 12-3 6.5 6.5 0 0 1 12 3c0 6-6 10-12 15Z'],
 ['♦','M0-12 9 0 0 12-9 0Z'],
 ['♣','M0-12a6 6 0 0 1 5 9 6 6 0 1 1-3 10c.4 2 1.3 4 3 5H-5c1.7-1 2.6-3 3-5a6 6 0 1 1-3-10 6 6 0 0 1 5-9Z']
]);
const xml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let courtSerial=0;
function courtArtwork(card){
 const file='images/decks/tabula-playing-cards/courts/'+card.suitId+'-'+courtRanks.get(card.rankId)+'.webp';
 const clip='tabula-court-'+(++courtSerial);
 // Extend the cloak to the diagonal and overlap the two clip edges to avoid an antialiasing gap.
 const half=`<g clip-path="url(#${clip})"><image href="${file}" x="4" y="5" width="112" height="97" preserveAspectRatio="none"/></g>`;
 return `<defs><clipPath id="${clip}"><path d="M0 0H120V80.45L0 100.45Z"/></clipPath></defs><g class="playing-card-court">${half}<g transform="rotate(180 60 90)">${half}</g></g>`;
}
function needsOrientationMark(card,symbol){
 if(!playingSuitIds.has(card.suitId))return false;
 if(isPlayingCourt(card))return true;
 const count=pipRanks.get(card.rankId);
 // Seven is asymmetric in its placement, even with a symmetric suit glyph.
 return !!count&&count!==7&&(count%2===0||symbol==='♦'||!suitPaths.has(symbol));
}
function playingFaceMarkup(card,symbol,color,rankLabel=card.number,showOrientationMark=false){
 // Both built-in Jokers use the same full-card artwork in the shared
 // 120 × 180 SVG coordinate system as all other playing-card faces.
 // The image is flush with the viewBox: no second paper, border or inset.
 if(card.id==='playing-joker-1'||card.id==='playing-joker-2'){
  return '<svg class="playing-card-face-svg" viewBox="0 0 120 180" aria-hidden="true" focusable="false"><image href="images/decks/tabula-playing-cards/joker.webp?v=0371" x="0" y="0" width="120" height="180" preserveAspectRatio="none"/></svg>';
 }
 const count=pipRanks.get(card.rankId);
 const court=isPlayingCourt(card);
 if(!playingSuitIds.has(card.suitId)||(!count&&!court))return '';
 const rank=String(rankLabel??'');
 const rankSize=Math.min(18,36/Math.max(1,Array.from(rank).length));
 const glyph=suitPaths.has(symbol)
  ?`<path d="${suitPaths.get(symbol)}"/>`
  :`<text x="0" y="0" dominant-baseline="central" font-size="24">${xml(symbol)}</text>`;
 const ink=color==='red'?'#a5232c':'#25211e';
 const index=`<text x="13" y="20" font-size="${rankSize}" font-weight="700">${xml(rank)}</text><g transform="translate(13 31) scale(.48)">${glyph}</g>`;
 const design=court?courtArtwork(card):pipLayouts[count].map(([x,y])=>{
  const orientation=y>90?' rotate(180)':'';
  const size=count===1?' scale(2)':'';
  return `<g class="playing-card-pip" transform="translate(${x} ${y})${orientation}${size}">${glyph}</g>`;
 }).join('');
 const mark=showOrientationMark&&needsOrientationMark(card,symbol)
  ?'<circle class="playing-card-orientation-mark" cx="107" cy="13" r="2.35" fill="#514940"/>':'';
 return `<svg class="playing-card-face-svg" viewBox="0 0 120 180" aria-hidden="true" focusable="false"><rect x=".75" y=".75" width="118.5" height="178.5" rx="6" fill="#faf5e9" stroke="#c6b79e" stroke-width="1.5"/><g fill="${ink}" text-anchor="middle" font-family="Georgia, serif">${design}${mark}<g class="playing-card-index">${index}</g><g class="playing-card-index" transform="rotate(180 60 90)">${index}</g></g></svg>`;
}
function nameSets(def){
 const raw=Array.isArray(def.nameSets)?def.nameSets:[];
 return raw.length?raw:[{id:'primary',label:'基本名称'}];
}
function nameOf(card,setId='primary'){
 if(setId==='primary')return card.name;
 const value=card.names?.[setId];
 return typeof value==='string'&&value.trim()?value.trim():card.name;
}
function validate(def){
 if(!def||typeof def!=='object'||!Array.isArray(def.suits)||!Array.isArray(def.ranks)||!Array.isArray(def.cards))throw Error('デッキの構造が正しくありません');
 if(!clean(def.name))throw Error('デッキ名を入力してください');
 for(const [key,arr] of [['スート',def.suits],['ランク',def.ranks],['カード',def.cards]]){
  const ids=arr.map(v=>clean(v.id));
  if(ids.some(v=>!v)||new Set(ids).size!==ids.length)throw Error(key+'のIDが重複または空欄です');
 }
 const sets=nameSets(def);
 if(sets[0]?.id!=='primary'||sets.some(v=>!clean(v.id)||!clean(v.label))||new Set(sets.map(v=>v.id)).size!==sets.length)throw Error('名称セットを確認してください');
 if(generate(def).length>400)throw Error('カードは400枚以内にしてください');
 return true;
}
function load(){try{const saved=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(saved)?saved:[]}catch{return []}}
function save(def){validate(def);const all=load().filter(item=>item.id!==def.id);all.push(clone(def));localStorage.setItem(KEY,JSON.stringify(all));return all}
function remove(id){localStorage.setItem(KEY,JSON.stringify(load().filter(d=>d.id!==id)))}
root.TabulaDeckBlueprint=Object.freeze({KEY,builtInPlaying,playingCards,blank,generate,playingFaceMarkup,isPlayingCourt,needsOrientationMark,nameSets,nameOf,playingName,validate,load,save,remove,clone});
})(globalThis);
