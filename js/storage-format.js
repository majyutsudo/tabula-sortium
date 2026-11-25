/* TABULA SORTIUM — pure saved-data rules (schema v1).
   This is loaded before tabula.js and does not read or write browser storage. */
(function(root){'use strict';
const schemaVersion=1;
function fileNamePart(s){return String(s||'reading').normalize('NFKC').replace(/[\\/:*?"<>|\x00-\x1f]/g,'_').replace(/\s+/g,'_').slice(0,65)||'reading'}
function validCardSize(v){return typeof v==='number'&&Number.isFinite(v)&&v>=.8&&v<=2.3}
const calendarSides=[12,8,10,6,12,12];
function validCalendarYear(year){return Number.isInteger(year)&&year>=1&&year<=9999}
function calendarResult(results,year){
 if(!validCalendarYear(year)||!Array.isArray(results)||results.length!==6
  ||!results.every((n,i)=>Number.isInteger(n)&&n>=1&&n<=calendarSides[i]))return null;
 const [month,tens,units,period,hour,minute]=results;
 const day=Math.floor((tens-1)/2)*10+units%10;
 const leap=year%4===0&&(year%100!==0||year%400===0);
 const monthLength=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31][month-1];
 const time=(period%2?'午前':'午後')+hour+'時'+String(minute%12*5).padStart(2,'0')+'分';
 return {valid:day>=1&&day<=monthLength,text:year+'年'+month+'月'+day+'日 '+time};
}
function validDiceSnapshot(v){
 if(!v||v.kind!=='dice'||!['normal','astro','iching','calendar'].includes(v.dice?.mode))return false;
 const d=v.dice,number=n=>typeof n==='number'&&Number.isFinite(n);
 const count=d.mode==='normal'?d.settings?.length:d.mode==='calendar'?calendarSides.length:3;
 if(!Array.isArray(d.settings)||count<1||count>8||d.settings.length!==count)return false;
 if(d.settings.some(x=>!x||![6,8,10,12,20].includes(x.sides)||typeof x.color!=='string'||!/^#[0-9a-f]{6}$/i.test(x.color)))return false;
 if(!Array.isArray(d.results)||d.results.length!==count||d.results.some((r,i)=>!Number.isInteger(r)||r<1||r>d.settings[i].sides))return false;
 if(d.mode==='calendar'&&(!d.settings.every((die,i)=>die.sides===calendarSides[i])||!calendarResult(d.results,d.calendarYear)?.valid))return false;
 if(!Array.isArray(d.poses)||d.poses.length!==count||d.poses.some(x=>
  !x||!x.p||!x.q||![x.p.x,x.p.y,x.p.z,x.q.x,x.q.y,x.q.z,x.q.w].every(number)||typeof x.visible!=='boolean'))return false;
 return typeof v.id==='string'&&v.id.length>0&&v.id.length<=160
  &&typeof v.name==='string'&&v.name.length<=100
  &&typeof v.time==='string'&&Number.isFinite(Date.parse(v.time))
  &&(!v.settings||typeof v.settings==='object'&&!Array.isArray(v.settings));
}
function validateReading(v,cards){
 if(v?.kind==='dice')return validDiceSnapshot(v);
 const allowed=cards&&new Set(cards.map(c=>c.id));
 const validCard=p=>p&&typeof p.id==='string'&&p.id.trim()&&(!allowed||allowed.has(p.id));
 const validList=list=>Array.isArray(list)&&list.length<=800&&list.every(validCard);
 const piles=v?.tablePiles??[];
 const validPiles=Array.isArray(piles)&&piles.length<=200&&piles.every(p=>
  p&&typeof p.id==='string'&&p.id.length>0&&Number.isFinite(p.x)&&p.x>=-200&&p.x<=300
  &&Number.isFinite(p.y)&&p.y>=-200&&p.y<=300
  &&(p.slot==null||Number.isInteger(p.slot)&&p.slot>=0&&p.slot<80)
  &&validList(p.cards));
 const slotList=[
  ...(Array.isArray(v?.placed)?v.placed:[]).filter(c=>Number.isInteger(c.slot)).map(c=>c.slot),
  ...(Array.isArray(piles)?piles:[]).filter(p=>Number.isInteger(p?.slot)).map(p=>p.slot)
 ];
 const uniqueSlots=new Set(slotList).size===slotList.length;
 const uniquePiles=Array.isArray(piles)&&new Set(piles.map(p=>p?.id)).size===piles.length;
 return !!(v&&typeof v==='object'&&!Array.isArray(v)&&validList(v.placed)
  &&v.placed.every(p=>Number(p.x)>=-200&&Number(p.x)<=300&&Number(p.y)>=-200&&Number(p.y)<=300
   &&(p.angle==null||typeof p.angle==='number'&&Number.isFinite(p.angle))
   &&(p.slot==null||Number.isInteger(p.slot)&&p.slot>=0&&p.slot<80))
  &&validPiles&&uniquePiles&&uniqueSlots
  &&[v.deck,v.removed,v.dealCheckpoint].every(list=>list==null||validList(list))
  &&(v.cardNames===undefined||Array.isArray(v.cardNames)&&v.cardNames.length===v.placed.length
   &&v.cardNames.every(name=>typeof name==='string')));
}
function matchesDeck(reading,cards){
 if(!Array.isArray(reading?.deck)||!validateReading(reading,cards))return false;
 const stock=[...reading.deck,...reading.placed,...(reading.removed||[]),...(reading.tablePiles||[]).flatMap(p=>p.cards)];
 const ids=new Set(stock.map(c=>c.id));
 const checkpoint=reading.dealCheckpoint||[];
 return stock.length===cards.length&&ids.size===stock.length
  &&new Set(checkpoint.map(c=>c.id)).size===checkpoint.length;
}

function supportsSchema(version){return version==null||version===schemaVersion}
root.TabulaStorage=Object.freeze({schemaVersion,fileNamePart,validCardSize,validateReading,matchesDeck,supportsSchema,validCalendarYear,calendarResult});
})(globalThis);
