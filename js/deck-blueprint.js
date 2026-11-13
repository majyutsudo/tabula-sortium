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
 const outlines={shield:'M-29-29H29V5Q25 30 0 39Q-25 30-29 5Z',circle:'M0-32A32 32 0 1 0 0 32A32 32 0 1 0 0-32Z',oval:'M0-35C-29-35-29 35 0 35C29 35 29-35 0-35Z'};
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
 // Optical sizing: distinguish the two black suits in small corner indices.
 const indexGlyph=symbol==='♠'
  ?'<path d="M0-13C-4-7-13-3-13 3a6.3 6.3 0 0 0 11 3c-.4 2-1.3 4-3 6H5c-1.7-2-2.6-4-3-6a6.3 6.3 0 0 0 11-3C13-3 4-7 0-13Z"/>'
  :symbol==='♣'
  ?'<path d="M0-12a6 6 0 0 1 5 9 6 6 0 1 1-3 10c.4 2 1.3 4 3 5H-5c1.7-1 2.6-3 3-5a6 6 0 1 1-3-10 6 6 0 0 1 5-9Z"/>'
  :glyph;
 const indexScale=symbol==='♠'||symbol==='♣'?'.59':'.48';
 const index=`<text x="13" y="20" font-size="${rankSize}" font-weight="700">${xml(rank)}</text><g transform="translate(13 31) scale(${indexScale})">${indexGlyph}</g>`;
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

/* TABULA built-in playing-card guide: concise synthesis of traditional
   English-language cartomancy, not a line-by-line translation of Foli,
   Minetta, or any single historical system. */
const PLAYING_TEXT_DATA={"hearts":[["家庭、愛情、心のよりどころ","家庭や住まい、家族の幸福に恵まれる兆し。身近な人との絆を大切にし、安心して帰れる居場所を築けるでしょう。"],["相愛、親密さ、協力","好意が通じ合い、人間関係が親密になる兆し。恋愛なら互いの気持ちを確かめ、仕事なら信頼できる相手との協力が期待できます。"],["喜び、親しい仲間、祝福","親しい人との集まりや嬉しい出来事がありそうです。友人との交流や祝賀に恵まれ、喜びを分かち合えるでしょう。"],["安らぎ、家庭の安定、満足","身近な生活が落ち着き、穏やかな満足を得られる兆し。家族や親しい相手との関係をゆっくり育てるのに向く時期です。"],["変化、感情の揺れ、再会","心や人間関係に変化が訪れそうです。再会や新しい交流がきっかけとなって、これまでの気持ちが動くかもしれません。"],["懐かしさ、思い出、旧友","昔の友人や懐かしい場所との縁が強まる兆し。過去の思い出や再会が、今の心を温めてくれるでしょう。"],["好意、贈り物、楽しい知らせ","好意や感謝が形となって届く兆し。贈り物や招待、親しみのこもった知らせなど、小さな喜びを受け取りそうです。"],["訪問、招待、社交","訪問や招待を通じて、人付き合いが楽しくなる兆し。顔を合わせて話すことが、関係を深めるきっかけになるでしょう。"],["願望成就、満足、幸福","望んでいたことが実現し、心から満足できる兆し。愛情や個人的な願いについて、喜ばしい結果が期待できます。"],["幸福、家族、祝賀","家族や大切な人と喜びを分かち合う出来事がありそうです。祝い事や円満な関係など、幸福な時間を示す札です。"],["若い友人、恋の知らせ、親切","親切な若い人物や、心を弾ませる知らせが現れそうです。恋愛や友情に関する連絡に注目するとよいでしょう。"],["親切な女性、愛情、思いやり","優しく思いやりのある女性が助けになりそうです。自分自身を表すなら、情の深さや人への心遣いが力になります。"],["信頼できる男性、家庭、保護","誠実で温かな男性から支援を得られる兆し。自分自身を表すなら、家族や親しい相手への責任を果たすことが大切です。"]],"diamonds":[["手紙、通知、新しい情報","待っていた手紙や通知が届く兆し。仕事や金銭について、書面や連絡を通じて物事が動き始めそうです。"],["取引、交換、合意","取引や交換、条件のすり合わせが重要になりそうです。互いに納得できる約束を結べるかが結果を左右します。"],["金銭の相談、書類、連絡","お金や用件について相談や連絡が増えそうです。書類や数字をよく確かめれば、話を前へ進められるでしょう。"],["収支、管理、安定した資源","財産や収入を堅実に管理することが役立つ時期です。大きな賭けよりも、手元の資源を守り整えることが成果につながります。"],["出費、変動、金銭的な不安","出費や収入の変動がありそうです。予定外の支払いに備え、金銭上の約束や条件を見直すとよいでしょう。"],["小額の利益、贈り物、機会","小さな利益や思いがけない贈り物に恵まれる兆し。ささやかな収入や身近な好機を見逃さないことが大切です。"],["不確かな知らせ、期待、噂","期待している知らせがまだ不確かな状態です。金銭や約束については、噂よりも確かな情報を待つ必要がありそうです。"],["商談、旅、面会","商談や用件のために人と会う、または移動する機会がありそうです。連絡を積極的に取り、話を具体化するとよいでしょう。"],["利益、昇進、財産の増加","取引や努力が利益につながる兆し。昇進、評価、収入の増加など、目に見える成果を受け取れるかもしれません。"],["大きな財産、成功、まとまった収入","まとまった収入や財産に関する喜ばしい展開が期待できます。仕事や商取引の成果が、物質的な豊かさにつながる札です。"],["金銭の知らせ、使者、若い実務家","仕事や金銭に関する知らせを運ぶ若い人物が現れそうです。提案や連絡の内容をよく確認してから応じましょう。"],["社交的な女性、贈与、金銭の関係","社交的で実務にも通じた女性が関わりそうです。紹介や贈り物、金銭的な協力など、人づての縁が鍵になります。"],["実業家、資産家、有力者","経済力や社会的な影響力を持つ男性が重要になりそうです。商談の相手、上司、支援者など、力を持つ人物に注目してください。"]],"clubs":[["仕事、計画、事業の始まり","新しい仕事や計画を始める好機です。思いつきをそのままにせず、具体的な行動へ移すことで道が開けるでしょう。"],["協働、相談、協力関係","誰かと協力することが成果につながりそうです。相談や役割分担を通じて、一人では進まなかった計画が動くでしょう。"],["計画の発展、商機、進歩","取り組んできた計画が発展し、仕事上の見通しが広がる兆し。協力者や新しい商機との出会いを生かせそうです。"],["基盤、仕事の安定、組織","仕事や生活の基盤を固めるのによい時期です。地道な努力を続け、組織や仕組みを整えることで安定が得られるでしょう。"],["競争、努力、課題","仕事や活動で競争や課題に直面しそうです。感情的に争うより、工夫と粘り強さで自分の立場を築くことが大切です。"],["支援、成果、信頼","協力者の支援を受け、努力の成果が見え始める兆し。信頼できる仲間と力を合わせることで前進できるでしょう。"],["相談、進路変更、選択","仕事や計画の進路について選択を迫られそうです。目先の利益だけでなく、長い目で見て進みたい方向を選びましょう。"],["仕事の連絡、進展、会合","仕事に関する連絡や会合をきっかけに、物事が動きそうです。提案に応じて行動することが進展につながります。"],["好機、成果、実務上の成功","地道な努力が実を結び、仕事上の好機を得る兆し。準備してきたことを周囲に示せば、成果や評価につながるでしょう。"],["旅、事業、忙しさ","仕事が忙しくなり、遠方との取引や移動が生じるかもしれません。大きな用件を抱える時期ですが、活動の広がりも期待できます。"],["若い同僚、実務の使者、助力","行動力のある若い人物から仕事上の知らせや助けが得られそうです。新しい仲間や実務を担う人の動きに注目しましょう。"],["有能な女性、知性、協力者","有能で自立心のある女性が頼りになりそうです。自分自身を表すなら、冷静な判断と実行力が成果を生みます。"],["有力な男性、経営、指導","責任ある立場の男性や有力な支援者が関わりそうです。自分自身を表すなら、決断力と指導力を発揮する場面です。"]],"spades":[["死、不吉な知らせ、悲嘆","死や喪失に関わる知らせ、あるいは大きな不幸を示す凶札として読まれてきました。死を逆位置だけに割り当てる古典的な流儀もあります。"],["棺、死別、涙","棺や葬送に関わる出来事を暗示する札として知られます。誰のことか、文字どおりの死かどうかは、この一枚だけでは判断できません。"],["不和、不貞、短い旅","結婚生活の不和や相手の不誠実さによって悩みが生じる暗示。流儀によっては短い旅や水辺への移動も表します。"],["病気、療養、仕事上の障害","健康に関する不安や病気、療養を要する事態を示す札です。仕事や計画に支障が出る可能性も表します。"],["怒り、口論、不和","怒りや短気が争いを呼びそうです。意見の対立や余計な干渉によって、人間関係がこじれる可能性があります。"],["遅延、苦労、不確かな見通し","物事が思うように進まず、努力や忍耐を要する暗示です。苦労ののちに落ち着きを得ると読む流儀もあります。"],["死別、喪失、悲しみ","大切な友人や親しい人を失う悲しみを示す札です。古典的には死別を明示する解釈もあり、単なる口論とは区別されます。"],["病気への警告、障害、裏切り","病気や計画への強い反対に注意を促す札です。信頼していた人からの妨害や、見込み違いを意味する場合もあります。"],["病苦、悲嘆、死の知らせ","重い病気や大きな悲しみを暗示する凶札です。死の知らせと読む伝統もあり、他の不吉な札と重なった場合にその意味が強まります。"],["悲嘆、投獄、災厄","深い悲しみや自由を奪われる事態を示す不吉な札です。古典的には投獄や計画の失敗など、厳しい結末を表します。"],["不愉快な知らせ、妨害、怠慢","頼りにした人物が思うように動かず、厄介な連絡や妨害が起こる暗示です。未熟な判断や怠慢に注意を促します。"],["寡婦、厳しい女性、敵意","未亡人や年長の女性を象徴することがある札です。古典的な流儀には嫉妬や敵意を帯びた女性、配偶者の喪失と結びつける解釈もあります。"],["権威ある男性、法律家、野心","権威や地位を持つ男性、法律家などの登場を示します。頼れる人物となるか、厳しい相手となるかは状況によって変わります。"]]};
/* Directly checked against "The English Method of Fortune-Telling by Cards",
   A. E. Waite (transcribed at mr-kaplan.com/Library/Waite/).
   These are distinct traditional readings, NOT modern extrapolations. */
const PLAYING_WAITE_VARIANTS={"hearts":{"1":"この資料では家そのものを意味します。周囲がスペードなら家庭内の争い、クラブなら祝い事、ダイヤなら金銭や遠方の友人からの知らせを示します。","2":"この資料では大きな成功を示しますが、それを確かなものにするには十分な注意と努力が必要とされます。","3":"この資料では、自分自身の軽率な行為が原因となる悲しみを意味します。","4":"この資料では、なかなか心を許さず、容易には振り向かない人物を表します。","5":"この資料では、根拠のない嫉妬から起こる問題を示します。","6":"この資料では、寛大である一方、人の話を信じやすい人物を表します。","7":"この資料では、移り気で不誠実な友人への警告となります。","9":"この資料では、富と周囲からの高い評価を示すと同時に、願望成就を占う「願いの札」とされます。","10":"この資料では、幸福と多くの子どもを示します。隣接する不吉な札の影響を和らげるとも解釈されます。","11":"この資料では、占われる人物の最も親しい友人、または同じ色の人物札が示す人の思いを表します。","12":"この資料では、誠実で慎重、愛情深い女性を表します。","13":"この資料では、善良な心を持つものの、性急で無謀な判断をしがちな男性を表します。"},"diamonds":{"1":"この資料では「手紙」を意味します。送り主や内容は隣接する札から判断します。","2":"この資料では、友人たちの反対を受ける婚約を表します。","3":"この資料では、口論や訴訟、家庭内の不和を示す凶兆とされます。","4":"この資料では、不誠実な友人による問題、あるいは秘密が漏れることを示します。","5":"この資料では、思いがけず届く知らせを意味します。","6":"この資料では、早い結婚と、その後の寡婦・寡夫となる境遇を意味するとされます。","7":"この資料では、皮肉や悪口、中傷を表します。","8":"この資料では、晩年あるいは比較的遅い時期の結婚を示します。","9":"この資料では、各地を旅して回ることを好む人物を表します。","11":"この資料では、自分の利益ばかりを考える近親者、または明るい色の人物札が示す人の思いを表します。","12":"この資料では、社交好きで浮気っぽい、色白の女性を表します。","13":"この資料では、短気で頑固、復讐心を持つ色白の男性を表します。"},"clubs":{"1":"この資料では、富、幸福、心の平和を示す吉札とされます。","2":"この資料では、反対に「失望」を示します。協力が期待外れに終わる可能性も読まれます。","3":"この資料では、二度以上の結婚を意味するとされます。","4":"この資料では、金銭を目的に目標や態度を変えることへの警告です。","5":"この資料では、慎重に選ばれた堅実な結婚を示します。","6":"この資料では、利益を生む商売や事業を予告します。","7":"この資料では、幸運や幸福の予兆である一方、異性との関係には注意を促します。","8":"この資料では、強欲な人物を表し、投機的な取引を戒めます。","9":"この資料では、友人の願いに従わないことを意味します。","10":"この資料では、思いがけない財産と、親しい友人の喪失という二つの意味を併せ持ちます。","11":"この資料では、誠実だが性急な友人、または黒いスートの人物札が示す人の思いを表します。","12":"この資料では、穏やかで人当たりのよい、色の濃い髪の女性を表します。","13":"この資料では、正直で誠実、愛情深い、色の濃い髪の男性を表します。"},"spades":{"1":"大きな不幸や悪意を示します。ここでは死そのものとは明記されておらず、別の伝統での解釈と区別できます。","2":"転居や移転を表します。従来の説明にある棺・死別とは、別系統の意味です。","3":"旅を意味します。不和や不貞とする解釈と異なり、移動という具体的な出来事を示します。","4":"病気を意味します。","5":"短気を改める必要があることを示します。","6":"勤勉な労働によって富が得られることを示します。スペードであっても吉意を持つ例です。","7":"友人を失い、それに伴って多くの困難が生じることを示します。原文は友人の喪失であり、必ずしも死亡とは限定していません。","8":"これから始める事業や計画に慎重であるよう警告します。","9":"病気と不運を予告する、非常に不吉な札とされます。","10":"悲嘆と投獄を意味します。","11":"怠惰で嫉妬深い人物、あるいは黒い人物札で表される人の思いを示します。","12":"悪意ある黒髪の女性を示し、一般には寡婦とされます。","13":"野心を持つ黒髪の男性を表します。"}};
const PLAYING_WAITE_SOURCE='典拠：A. E. Waite収録「The English Method of Fortune-Telling by Cards」（英国式の52枚占法）';
const playingDefaultTexts=Object.freeze(Object.assign(
 {},...Object.entries(PLAYING_TEXT_DATA).map(([suit,entries])=>
  Object.fromEntries(entries.map(([keywords,description],i)=>[
   'c_'+suit+'_r'+(i+1),
   Object.freeze({body:'一般的な意味\n'+description+'\n\nキーワード\n'+keywords+(PLAYING_WAITE_VARIANTS[suit]?.[i+1]?'\n\n古典資料にみる別解\n'+PLAYING_WAITE_VARIANTS[suit][i+1]:''),source:PLAYING_WAITE_VARIANTS[suit]?.[i+1]?PLAYING_WAITE_SOURCE:''})
  ]))),
 {
  'playing-joker-1':Object.freeze({body:"ジョーカーは19世紀半ばのアメリカで、カードゲーム「ユーカー」の最高位の切り札として生まれ、のちに他のゲームでもワイルドカードなどとして用いられるようになった。",source:''}),
  'playing-joker-2':Object.freeze({body:"ジョーカーは19世紀半ばのアメリカで、カードゲーム「ユーカー」の最高位の切り札として生まれ、のちに他のゲームでもワイルドカードなどとして用いられるようになった。",source:''})
 }
));
root.TabulaDeckBlueprint=Object.freeze({KEY,builtInPlaying,playingDefaultTexts,playingCards,blank,generate,playingFaceMarkup,isPlayingCourt,needsOrientationMark,nameSets,nameOf,playingName,COURT_EMBLEMS,COURT_FRAMES,COLORS,inkColor,validate,load,save,remove,clone});
})(globalThis);
