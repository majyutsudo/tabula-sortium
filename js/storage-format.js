/* TABULA SORTIUM — pure saved-data rules (schema v1).
   This is loaded before tabula.js and does not read or write browser storage. */
(function(root){'use strict';
const schemaVersion=1;
function fileNamePart(s){return String(s||'reading').normalize('NFKC').replace(/[\\/:*?"<>|\x00-\x1f]/g,'_').replace(/\s+/g,'_').slice(0,65)||'reading'}
function validCardSize(v){return typeof v==='number'&&Number.isFinite(v)&&v>=.8&&v<=2.3}
function validateReading(v,cards){return !!(v&&typeof v==='object'&&!Array.isArray(v)&&Array.isArray(v.placed)&&v.placed.length<=120&&v.placed.every(p=>p&&typeof p.id==='string'&&cards.some(c=>c.id===p.id)&&Number.isFinite(Number(p.x))&&Number.isFinite(Number(p.y))&&Number(p.x)>=-200&&Number(p.x)<=300&&Number(p.y)>=-200&&Number(p.y)<=300&&[null,...Array.from({length:80},(_,i)=>i)].includes(p.slot??null))&&(!v.deck||Array.isArray(v.deck)&&v.deck.length<=120&&v.deck.every(p=>p&&cards.some(c=>c.id===p.id))))}

function supportsSchema(version){return version==null||version===schemaVersion}
root.TabulaStorage=Object.freeze({schemaVersion,fileNamePart,validCardSize,validateReading,supportsSchema});
})(globalThis);
