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
function frenchNames(cards){
 const obj={};
 for(const card of cards){
  if(card.group==='major')obj[card.id]=FRENCH_MAJOR[card.number];
  else obj[card.id]=FRENCH_RANKS[card.number-1]+' de '+FRENCH_SUITS[card.suit];
 }
 return obj;
}
function fresh(cards,id,name){
 return {id,name,names:{},majorNumbers:{},included:cards.map(c=>c.id),pipBackground:'landscape',backColor:'sepia'};
}
function validate(deck,cards){
 if(!deck||typeof deck!=='object'||typeof deck.id!=='string'||!/^deck_[a-z0-9_-]{1,80}$/.test(deck.id))return false;
 if(typeof deck.name!=='string'||!deck.name.trim()||deck.name.length>80)return false;
 if(!deck.names||typeof deck.names!=='object'||Array.isArray(deck.names)||!deck.majorNumbers||typeof deck.majorNumbers!=='object'||Array.isArray(deck.majorNumbers))return false;
 if(!['landscape','none'].includes(deck.pipBackground)||!COLORS.includes(deck.backColor))return false;
 const ids=new Set(cards.map(c=>c.id)),majors=cards.filter(c=>c.group==='major');
 if(!Array.isArray(deck.included)||deck.included.length===0||deck.included.length>cards.length||new Set(deck.included).size!==deck.included.length||deck.included.some(id=>!ids.has(id)))return false;
 if(Object.entries(deck.names).some(([id,name])=>!ids.has(id)||typeof name!=='string'||name.length>90))return false;
 if(Object.keys(deck.majorNumbers).some(id=>!majors.some(c=>c.id===id)))return false;
 const numbered=majors.map(c=>Object.hasOwn(deck.majorNumbers,c.id)?deck.majorNumbers[c.id]:c.number);
 return numbered.every(n=>Number.isInteger(n)&&n>=0&&n<=21)&&new Set(numbered).size===22;
}
function sanitize(deck,cards){
 if(!validate(deck,cards))return null;
 return {id:deck.id,name:deck.name.trim(),names:Object.fromEntries(Object.entries(deck.names).filter(([,v])=>v.trim()).map(([k,v])=>[k,v.trim()])),majorNumbers:{...deck.majorNumbers},included:[...deck.included],pipBackground:deck.pipBackground,backColor:deck.backColor};
}
function read(storage,cards){try{const saved=JSON.parse(storage.getItem(KEY)||'[]');return Array.isArray(saved)?saved.map(d=>sanitize(d,cards)).filter(Boolean).slice(0,50):[]}catch{return []}}
function write(storage,decks,cards){
 if(!Array.isArray(decks)||decks.length>50||decks.some(d=>!validate(d,cards)))throw Error('Invalid deck definitions');
 storage.setItem(KEY,JSON.stringify(decks.map(d=>sanitize(d,cards))));
}
function materialize(deck,cards){
 if(!deck)return cards;
 return cards.map(c=>({...c,name:deck.names[c.id]||c.name,number:c.group==='major'&&Object.hasOwn(deck.majorNumbers,c.id)?deck.majorNumbers[c.id]:c.number}));
}
function swapNumber(deck,cards,id,number){
 const majors=cards.filter(c=>c.group==='major');
 const card=majors.find(c=>c.id===id);
 if(!card||!Number.isInteger(number)||number<0||number>21)return false;
 const current=Object.hasOwn(deck.majorNumbers,id)?deck.majorNumbers[id]:card.number;
 if(current===number)return true;
 const other=majors.find(c=>c.id!==id&&(Object.hasOwn(deck.majorNumbers,c.id)?deck.majorNumbers[c.id]:c.number)===number);
 if(!other)return false;
 deck.majorNumbers[id]=number;deck.majorNumbers[other.id]=current;return true;
}
root.TabulaDeckStore=Object.freeze({KEY,COLORS,fresh,frenchNames,validate,sanitize,read,write,materialize,swapNumber});
})(globalThis);
