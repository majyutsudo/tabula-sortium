/* TABULA SORTIUM — independently saved deck definitions (v1).
   A definition refers to stable catalog IDs; no images or readings are copied. */
(function(root){'use strict';
const KEY='tabula_sortium_deck_library_v1';
const FRENCH_MAJOR=[
 'Le Mat','Le Bateleur','La Papesse','L’Impératrice','L’Empereur','Le Pape',
 'L’Amoureux','Le Chariot','La Force','L’Ermite','La Roue de Fortune','La Justice',
 'Le Pendu','L’Arcane sans nom','Tempérance','Le Diable','La Maison Dieu',
 'L’Étoile','La Lune','Le Soleil','Le Jugement','Le Monde'
];
const FRENCH_SUITS={wands:'Bâtons',cups:'Coupes',swords:'Épées',pentacles:'Deniers'};
const FRENCH_RANKS=['As','Deux','Trois','Quatre','Cinq','Six','Sept','Huit','Neuf','Dix','Valet','Cavalier','Reine','Roi'];
const COLORS=['sepia','green','burgundy','navy','purple','black','ivory'];
const LANGUAGES=[['original','標準（元の表記）'],['ja','日本語'],['en','English'],['fr','Français'],['es','Español'],['de','Deutsch'],['it','Italiano']];
const MAJOR_NAMES={
 ja:['愚者','魔術師','女教皇','女帝','皇帝','教皇','恋人','戦車','力','隠者','運命の輪','正義','吊るされた男','死神','節制','悪魔','塔','星','月','太陽','審判','世界'],
 en:['The Fool','The Magician','The High Priestess','The Empress','The Emperor','The Hierophant','The Lovers','The Chariot','Strength','The Hermit','Wheel of Fortune','Justice','The Hanged Man','Death','Temperance','The Devil','The Tower','The Star','The Moon','The Sun','Judgement','The World'],
 fr:FRENCH_MAJOR,
 es:['El Loco','El Mago','La Papisa','La Emperatriz','El Emperador','El Papa','Los Enamorados','El Carro','La Fuerza','El Ermitaño','La Rueda de la Fortuna','La Justicia','El Colgado','La Muerte','La Templanza','El Diablo','La Torre','La Estrella','La Luna','El Sol','El Juicio','El Mundo'],
 de:['Der Narr','Der Magier','Die Hohepriesterin','Die Herrscherin','Der Herrscher','Der Hierophant','Die Liebenden','Der Wagen','Die Kraft','Der Eremit','Das Rad des Schicksals','Die Gerechtigkeit','Der Gehängte','Der Tod','Die Mäßigkeit','Der Teufel','Der Turm','Der Stern','Der Mond','Die Sonne','Das Gericht','Die Welt'],
 it:['Il Matto','Il Bagatto','La Papessa','L’Imperatrice','L’Imperatore','Il Papa','Gli Amanti','Il Carro','La Forza','L’Eremita','La Ruota della Fortuna','La Giustizia','L’Appeso','La Morte','La Temperanza','Il Diavolo','La Torre','La Stella','La Luna','Il Sole','Il Giudizio','Il Mondo']
};
const SUITS={
 ja:{wands:'杖',cups:'杯',swords:'剣',pentacles:'金貨'},
 en:{wands:'Wands',cups:'Cups',swords:'Swords',pentacles:'Pentacles'},
 fr:FRENCH_SUITS,
 es:{wands:'Bastos',cups:'Copas',swords:'Espadas',pentacles:'Oros'},
 de:{wands:'Stäbe',cups:'Kelche',swords:'Schwerter',pentacles:'Münzen'},
 it:{wands:'Bastoni',cups:'Coppe',swords:'Spade',pentacles:'Denari'}
};
const RANKS={
 ja:['A','2','3','4','5','6','7','8','9','10','ペイジ','ナイト','クイーン','キング'],
 en:['Ace','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Page','Knight','Queen','King'],
 fr:FRENCH_RANKS,
 es:['As','Dos','Tres','Cuatro','Cinco','Seis','Siete','Ocho','Nueve','Diez','Sota','Caballo','Reina','Rey'],
 de:['Ass','Zwei','Drei','Vier','Fünf','Sechs','Sieben','Acht','Neun','Zehn','Bube','Ritter','Königin','König'],
 it:['Asso','Due','Tre','Quattro','Cinque','Sei','Sette','Otto','Nove','Dieci','Fante','Cavaliere','Regina','Re']
};
function translatedName(c,language){
 if(language==='original'||!MAJOR_NAMES[language])return c.name;
 if(c.group==='major')return MAJOR_NAMES[language][c.number];
 const n=RANKS[language][c.number-1],s=SUITS[language][c.suit];
 if(language==='ja')return s+'の'+n;
 if(language==='en')return n+' of '+s;
 if(language==='fr')return n+' de '+s;
 if(language==='es')return n+' de '+s;
 if(language==='de')return n+' der '+s;
 return n+' di '+s;
}
function namesForLanguage(cards,language){return Object.fromEntries(cards.map(c=>[c.id,translatedName(c,language)]))}
function frenchNames(cards){return namesForLanguage(cards,'fr')}
function fresh(cards,id,name){
 return {id,name,names:{},majorNumbers:{},included:cards.map(c=>c.id),pipBackground:'landscape',backColor:'sepia',language:'original',faceStyle:'standard'};
}
function validate(deck,cards){
 if(!deck||typeof deck!=='object'||typeof deck.id!=='string'||!/^deck_[a-z0-9_-]{1,80}$/.test(deck.id))return false;
 if(typeof deck.name!=='string'||!deck.name.trim()||deck.name.length>80)return false;
 if(!deck.names||typeof deck.names!=='object'||Array.isArray(deck.names)||!deck.majorNumbers||typeof deck.majorNumbers!=='object'||Array.isArray(deck.majorNumbers))return false;
 if(!['landscape','none'].includes(deck.pipBackground)||!COLORS.includes(deck.backColor)||!LANGUAGES.some(([id])=>id===(deck.language||'original'))||!['standard','simple'].includes(deck.faceStyle||'standard'))return false;
 const ids=new Set(cards.map(c=>c.id)),majors=cards.filter(c=>c.group==='major');
 if(!Array.isArray(deck.included)||deck.included.length===0||deck.included.length>cards.length||new Set(deck.included).size!==deck.included.length||deck.included.some(id=>!ids.has(id)))return false;
 if(Object.entries(deck.names).some(([id,name])=>!ids.has(id)||typeof name!=='string'||name.length>90))return false;
 if(Object.keys(deck.majorNumbers).some(id=>!majors.some(c=>c.id===id)))return false;
 const numbered=majors.map(c=>Object.hasOwn(deck.majorNumbers,c.id)?deck.majorNumbers[c.id]:c.number);
 return numbered.every(n=>n===null||Number.isInteger(n)&&n>=0&&n<=21)&&new Set(numbered.filter(n=>n!==null)).size===numbered.filter(n=>n!==null).length;
}
function sanitize(deck,cards){
 if(!validate(deck,cards))return null;
 return {id:deck.id,name:deck.name.trim(),names:Object.fromEntries(Object.entries(deck.names).filter(([,v])=>v.trim()).map(([k,v])=>[k,v.trim()])),majorNumbers:{...deck.majorNumbers},included:[...deck.included],pipBackground:deck.pipBackground,backColor:deck.backColor,language:deck.language||'original',faceStyle:deck.faceStyle||'standard'};
}
function read(storage,cards){try{const saved=JSON.parse(storage.getItem(KEY)||'[]');return Array.isArray(saved)?saved.map(d=>sanitize(d,cards)).filter(Boolean).slice(0,50):[]}catch{return []}}
function write(storage,decks,cards){
 if(!Array.isArray(decks)||decks.length>50||decks.some(d=>!validate(d,cards)))throw Error('Invalid deck definitions');
 storage.setItem(KEY,JSON.stringify(decks.map(d=>sanitize(d,cards))));
}
function materialize(deck,cards){
 if(!deck)return cards;
 return cards.map(c=>({...c,name:deck.names[c.id]||translatedName(c,deck.language||'original'),number:c.group==='major'&&Object.hasOwn(deck.majorNumbers,c.id)?deck.majorNumbers[c.id]:c.number}));
}
function swapNumber(deck,cards,id,number){
 const majors=cards.filter(c=>c.group==='major');
 const card=majors.find(c=>c.id===id);
 if(!card||!(number===null||Number.isInteger(number)&&number>=0&&number<=21))return false;
 const current=Object.hasOwn(deck.majorNumbers,id)?deck.majorNumbers[id]:card.number;
 if(current===number)return true;
 if(number!==null){
  const other=majors.find(c=>c.id!==id&&(Object.hasOwn(deck.majorNumbers,c.id)?deck.majorNumbers[c.id]:c.number)===number);
  if(other)deck.majorNumbers[other.id]=current;
 }
 deck.majorNumbers[id]=number;return true;
}
root.TabulaDeckStore=Object.freeze({KEY,COLORS,fresh,frenchNames,LANGUAGES,translatedName,namesForLanguage,validate,sanitize,read,write,materialize,swapNumber});
})(globalThis);
