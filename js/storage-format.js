/* TABULA SORTIUM — pure saved-data rules (schema v1).
   This is loaded before tabula.js and does not read or write browser storage. */
(function(root){'use strict';
const schemaVersion=1;
function fileNamePart(s){return String(s||'reading').normalize('NFKC').replace(/[\\/:*?"<>|\x00-\x1f]/g,'_').replace(/\s+/g,'_').slice(0,65)||'reading'}
function validCardSize(v){return typeof v==='number'&&Number.isFinite(v)&&v>=.8&&v<=2.3}
function validateReading(v,cards){
 const allowed=cards&&new Set(cards.map(c=>c.id));
 const validCard=p=>p&&typeof p.id==='string'&&p.id.trim()&&(!allowed||allowed.has(p.id));
 const validList=list=>Array.isArray(list)&&list.length<=800&&list.every(validCard);
 return !!(v&&typeof v==='object'&&!Array.isArray(v)&&validList(v.placed)
  &&v.placed.every(p=>Number(p.x)>=-200&&Number(p.x)<=300&&Number(p.y)>=-200&&Number(p.y)<=300
   &&(p.angle==null||typeof p.angle==='number'&&Number.isFinite(p.angle))
   &&(p.slot==null||Number.isInteger(p.slot)&&p.slot>=0&&p.slot<80))
  &&[v.deck,v.removed,v.dealCheckpoint].every(list=>list==null||validList(list))
  &&(v.cardNames===undefined||Array.isArray(v.cardNames)&&v.cardNames.length===v.placed.length
   &&v.cardNames.every(name=>typeof name==='string')));
}
function matchesDeck(reading,cards){
 if(!Array.isArray(reading?.deck)||!validateReading(reading,cards))return false;
 const stock=[...reading.deck,...reading.placed,...(reading.removed||[])];
 const ids=new Set(stock.map(c=>c.id));
 const checkpoint=reading.dealCheckpoint||[];
 return stock.length===cards.length&&ids.size===stock.length
  &&new Set(checkpoint.map(c=>c.id)).size===checkpoint.length;
}

function supportsSchema(version){return version==null||version===schemaVersion}
root.TabulaStorage=Object.freeze({schemaVersion,fileNamePart,validCardSize,validateReading,matchesDeck,supportsSchema});
})(globalThis);
