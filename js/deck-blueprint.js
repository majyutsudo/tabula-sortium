/* TABULA deck blueprint designer — independent card identities, no 78-card dependency. */
(function(root){'use strict';
const KEY='tabula_deck_blueprints_v1';
const clone=x=>JSON.parse(JSON.stringify(x));
const clean=x=>String(x??'').trim();
const newBlueprintId=()=>'blueprint_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8);
const COLORS=Object.freeze([
 ['black','黒','#25211e'],['red','赤','#a5232c'],['blue','青','#22589b'],
 ['green','緑','#247047'],['purple','紫','#704596'],['burgundy','深紅','#842c49'],
 ['navy','紺','#253966'],['teal','青緑','#15716a'],['turquoise','ターコイズ','#16858b'],
 ['orange','橙','#b65a1c'],['gold','金','#98700f'],['brown','茶','#765135'],
 ['pink','桃','#aa456d'],['indigo','藍','#444a92'],['olive','オリーブ','#66712d'],
 ['gray','灰','#62636a']
]);
const COLOR_INKS=Object.fromEntries(COLORS.map(([id,,ink])=>[id,ink]));
function inkColor(value){return COLOR_INKS[value]||COLOR_INKS.black}

function playingCards(id=newBlueprintId(),name='プレイングカード（52枚）'){
 const suits=[
  // Match the Tarot suit sequence: Wands, Cups, Swords, Pentacles.
  {id:'clubs',name:'クラブ',symbol:'♣',color:'black'},
  {id:'hearts',name:'ハート',symbol:'♥',color:'red'},
  {id:'spades',name:'スペード',symbol:'♠',color:'black'},
  {id:'diamonds',name:'ダイヤ',symbol:'♦',color:'red'}
 ];
 const ranks=Array.from({length:13},(_,i)=>({...{id:'r'+(i+1),order:i+1,label:['A','2','3','4','5','6','7','8','9','10','J','Q','K'][i],name:['エース','2','3','4','5','6','7','8','9','10','ジャック','クイーン','キング'][i]},...(i>=10?{faceKind:'court',courtStyle:'portrait',courtTitle:['JACK','QUEEN','KING'][i-10],courtEmblem:['fleur','crown','crown'][i-10],courtFrame:'shield'}:{})}));
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
  list.push({...{id,suitId:suit.id,rankId:rank.id,number:rank.label,name:suit.name+'の'+rank.name,names:{},faceKind:rank.faceKind||undefined,courtStyle:rank.courtStyle||undefined,courtTitle:rank.courtTitle||rank.name,courtEmblem:rank.courtEmblem||'crown',courtFrame:rank.courtFrame||'shield'},...clone(overrides.get(id)||{})});
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
const isPlayingCourt=card=>card.faceKind==='court'||(card.faceKind!=='pip'&&playingSuitIds.has(card.suitId)&&courtRanks.has(card.rankId));
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
const COURT_EMBLEMS=Object.freeze([
 ['crown','王冠'],['fleur','百合紋'],['sun','太陽'],['moon','三日月'],
 ['star','星章'],['hex','六芒星'],['tower','塔'],['leaf','植物紋']
]);
const COURT_FRAMES=Object.freeze([['shield','盾形'],['circle','円形'],['oval','楕円形'],['none','枠なし']]);
function emblemShape(id){
 switch(id){
 case 'crown':return '<path d="M-19 8-22-12-10-4 0-19 10-4 22-12 19 8Z M-19 14H19V19H-19Z"/><circle cx="-22" cy="-12" r="2"/><circle cy="-19" r="2"/><circle cx="22" cy="-12" r="2"/>';
 case 'fleur':return '<path d="M0-22C-11-11-8-3 0 5C8-3 11-11 0-22ZM-23-3C-20-18-5-10-4 7C-13 4-20 4-23-3ZM23-3C20-18 5-10 4 7C13 4 20 4 23-3ZM-5 5H5V18H-5ZM-13 12H13"/>';
 case 'sun':return '<circle r="11"/>'+Array.from({length:12},(_,i)=>'<path d="M0-17V-23" transform="rotate('+(i*30)+')"/>').join('');
 case 'moon':return '<path d="M10-22A23 23 0 1 0 10 22A17 17 0 1 1 10-22Z"/>';
 case 'star':return '<path d="'+Array.from({length:16},(_,i)=>{const a=-Math.PI/2+i*Math.PI/8,r=i%2?9:22;return (i?'L':'M')+(Math.cos(a)*r).toFixed(2)+' '+(Math.sin(a)*r).toFixed(2)}).join(' ')+'Z"/>';
 case 'hex':return '<path d="M0-21 19 11H-19Z M0 21-19-11H19Z"/>';
 case 'tower':return '<path d="M-16 20V-12H-21V-22H-12V-15H-5V-22H5V-15H12V-22H21V-12H16V20Z M-5 20V4A5 5 0 0 1 5 4V20 M-11-7H-5 M5-7H11"/>';
 case 'leaf':return '<path d="M-3 22C-5 8-1-6 13-19 M-3 11C-19 6-20-6-17-14C-4-13 1-3-3 11ZM3 1C18 0 23-10 21-21C8-20 1-12 3 1Z M-3 18C6 8 13 9 19 12C15 22 7 24-3 18Z"/>';
 default:return emblemShape('crown');
 }
}
function courtTextArtwork(card){
 const title=String(card.courtTitle||card.number||'COURT').slice(0,48);
 const n=Array.from(title).length;
 const fontSize=n>13?8:n>9?10:n>6?12:n>4?15:18;
 const shape=emblemShape(card.courtEmblem||'crown');
 const frame=card.courtFrame||'shield';
 const outlines={shield:'M-29-29H29V5Q25 30 0 39Q-25 30-29 5Z',circle:'M0-32A32 32 0 1 0 0 32A32 32 0 1 0 0-32Z',oval:'M0-34C-42-34-42 34 0 34C42 34 42-34 0-34Z'};
 const border=frame==='none'?'':('<path d="'+(outlines[frame]||outlines.shield)+'" fill="none" stroke="currentColor" stroke-width=".8" opacity=".7"/>');
 const half='<g transform="translate(60 0)"><text x="0" y="32" font-size="'+fontSize+'" font-weight="600" letter-spacing=".4">'+xml(title)+'</text><g transform="translate(0 69) scale(.63)" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">'+border+'<g>'+shape+'</g></g><path d="M-20 86H20" fill="none" stroke="currentColor" stroke-width=".65" opacity=".65"/></g>';
 return '<g class="playing-card-heraldic" fill="currentColor" stroke="none">'+half+'<g transform="rotate(180 60 90)">'+half+'</g></g>';
}
function needsOrientationMark(card,symbol){
 if(isPlayingCourt(card))return true;
 if(!playingSuitIds.has(card.suitId))return false;
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
 if((!playingSuitIds.has(card.suitId)&&!court)||(!count&&!court))return '';
 const rank=String(rankLabel??'');
 const rankSize=Math.min(18,36/Math.max(1,Array.from(rank).length));
 const glyph=suitPaths.has(symbol)
  ?`<path d="${suitPaths.get(symbol)}"/>`
  :`<text x="0" y="0" dominant-baseline="central" font-size="24">${xml(symbol)}</text>`;
 const ink=inkColor(color);
 const index=`<text x="13" y="20" font-size="${rankSize}" font-weight="700">${xml(rank)}</text><g transform="translate(13 31) scale(.48)">${glyph}</g>`;
 const design=court?(card.courtStyle==='text'||!playingSuitIds.has(card.suitId)||!courtRanks.has(card.rankId)?courtTextArtwork(card):courtArtwork(card)):pipLayouts[count].map(([x,y])=>{
  const orientation=y>90?' rotate(180)':'';
  const size=count===1?' scale(2)':'';
  return `<g class="playing-card-pip" transform="translate(${x} ${y})${orientation}${size}">${glyph}</g>`;
 }).join('');
 const mark=showOrientationMark&&needsOrientationMark(card,symbol)
  ?'<circle class="playing-card-orientation-mark" cx="107" cy="13" r="2.35" fill="#514940"/>':'';
 return `<svg class="playing-card-face-svg" viewBox="0 0 120 180" aria-hidden="true" focusable="false"><rect x=".75" y=".75" width="118.5" height="178.5" rx="6" fill="#faf5e9" stroke="#c6b79e" stroke-width="1.5"/><g fill="${ink}" color="${ink}" text-anchor="middle" font-family="Georgia, serif">${design}${mark}<g class="playing-card-index">${index}</g><g class="playing-card-index" transform="rotate(180 60 90)">${index}</g></g></svg>`;
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
root.TabulaDeckBlueprint=Object.freeze({KEY,builtInPlaying,playingCards,blank,generate,playingFaceMarkup,isPlayingCourt,needsOrientationMark,nameSets,nameOf,playingName,COURT_EMBLEMS,COURT_FRAMES,COLORS,inkColor,validate,load,save,remove,clone});
})(globalThis);
