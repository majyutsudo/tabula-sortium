/* TABULA SORTIUM — custom spread storage rules. */
(function(root){'use strict';
const MAX_SPREAD_SLOTS=100,MAX_LIBRARY=500;
const identityModule=()=>root.TabulaContentIdentity;
function groups(v){if(!Array.isArray(v)||v.length>100)throw Error('グループ情報が不正です。');const seen=new Set();return v.map(g=>{if(!g||!identityModule().validId(g.id)||typeof g.name!=='string'||!g.name.trim()||g.name.length>100||seen.has(g.id))throw Error('グループ情報が不正です。');seen.add(g.id);const result={id:g.id,name:g.name};if(g.origin!==undefined){const o=g.origin;if(!o||!identityModule().validId(o.creatorId)||!identityModule().validId(o.packId))throw Error('グループの配布元が不正です。');result.origin={creatorId:o.creatorId,packId:o.packId}}return result})}
function packInfo(v){if(!v||!identityModule().validId(v.id)||typeof v.name!=='string'||!v.name.trim()||v.name.length>100)throw Error('パック情報が不正です。');return {id:v.id,name:v.name,creator:identityModule().creator(v.creator)}}
function sources(v){if(!Array.isArray(v)||v.length>100)throw Error('配布元情報が不正です。');return v.map(packInfo)}
function validMetadata(v){try{if(v.identity!==undefined)identityModule().identity(v.identity);if(v.groups!==undefined)groups(v.groups);if(v.packSources!==undefined)sources(v.packSources);return true}catch(e){return false}}
function validDeckPosition(p){return p&&typeof p==='object'&&!Array.isArray(p)&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=100&&p.y>=0&&p.y<=100}
function copyDeckPosition(p){return {x:p.x,y:p.y}}
function validDeal(plan,count){try{return !!root.TabulaSpreadDeal?.normalize(plan,count)}catch(e){return false}}
function validSpread(v){
  return !!(v&&typeof v.id==='string'&&validMetadata(v)&&Array.isArray(v.slots)
    &&v.slots.length<=MAX_SPREAD_SLOTS&&(v.deckPosition===undefined||validDeckPosition(v.deckPosition))&&(v.deal===undefined||validDeal(v.deal,v.slots.length))&&v.slots.every(q=>Number.isFinite(q.x)&&Number.isFinite(q.y)&&Number.isFinite(q.angle)&&(!q.frameRole||['card','pile','tableau','foundation','waste','discard'].includes(q.frameRole))));
}
function fromReading(reading,id,name){
 if(!reading||!Array.isArray(reading.placed))throw Error('占例の配置を読み取れません。');
 const recorded=Array.isArray(reading.slots)&&reading.slots.length?reading.slots:null;
 const fallback=recorded?null:[
  ...reading.placed.map((p,i)=>({...p,_order:i,frameRole:'card'})),
  ...(reading.tablePiles||[]).map((p,i)=>({...p,_order:reading.placed.length+i,frameRole:p.role||'pile'}))
 ].sort((a,b)=>(Number.isInteger(a.slot)?a.slot:1e5)-(Number.isInteger(b.slot)?b.slot:1e5)||a._order-b._order);
 const source=recorded||fallback;
 if(!source?.length||source.length>MAX_SPREAD_SLOTS)throw Error('登録できる配置位置がありません（上限'+MAX_SPREAD_SLOTS+'位置）。');
 const slots=source.map((p,i)=>{
  const slot={x:p.x,y:p.y,angle:p.angle??0,name:typeof p.name==='string'&&p.name.trim()?p.name:'位置'+(i+1)};
  if(typeof p.detail==='string')slot.detail=p.detail;
  if(typeof p.frameRole==='string'&&p.frameRole!=='card')slot.frameRole=p.frameRole;
  return slot;
 });
 const size=reading.settings?.cardSize;
 const result={id,name,slots,...(typeof size==='number'&&Number.isFinite(size)&&size>=.8&&size<=2.3?{cardSize:size}:{}),...(validDeckPosition(reading.settings?.deckPosition)?{deckPosition:copyDeckPosition(reading.settings.deckPosition)}:{})};
 if(!validSpread(result)||!slots.length||slots.some(s=>typeof s.name!=='string'||s.name.length>200))throw Error('占例の位置情報が不正です。');
 return result;
}
/* Portable single-spread JSON. Does not include cards, readings or table state.
   Also accepts the bare {name,slots,...} format from early shared spreads. */
const PORTABLE_FORMAT='tabula-sortium';
function portableSpread(v){
 if(!v||typeof v!=='object'||Array.isArray(v))throw Error('スプレッド情報がありません。');
 const name=typeof v.name==='string'?v.name.trim():'';
 if(!name||name.length>100)throw Error('スプレッド名が不正です。');
 if(!Array.isArray(v.slots)||v.slots.length<1||v.slots.length>MAX_SPREAD_SLOTS)throw Error('配置数は1〜'+MAX_SPREAD_SLOTS+'にしてください。');
 const slots=v.slots.map((q,i)=>{
  if(!q||typeof q!=='object'||Array.isArray(q)||![q.x,q.y,q.angle].every(Number.isFinite)
    ||q.x<0||q.x>100||q.y<0||q.y>100||Math.abs(q.angle)>3600)
   throw Error('位置'+(i+1)+'の座標・角度が不正です。');
  if(q.frameRole!==undefined&&!['card','pile','tableau','foundation','waste','discard'].includes(q.frameRole))
   throw Error('位置'+(i+1)+'の種類が不正です。');
  const label=typeof q.name==='string'?q.name.trim():'位置'+(i+1);
  if(!label||label.length>200)throw Error('位置名が不正です。');
  if(q.detail!==undefined&&(typeof q.detail!=='string'||q.detail.length>3000))throw Error('位置の説明が長すぎます。');
  return {x:q.x,y:q.y,angle:q.angle,name:label,
   ...(typeof q.detail==='string'?{detail:q.detail}:{}),
   ...(q.frameRole&&q.frameRole!=='card'?{frameRole:q.frameRole}:{})};
 });
 const meta={};
 for(const field of ['alternate','author','source','overview','method','notes']){
  if(v[field]!==undefined){
   const limit=['alternate','author'].includes(field)?120:field==='source'?500:4000;
   if(typeof v[field]!=='string'||v[field].length>limit)throw Error('解説情報が不正です。');
   meta[field]=v[field];
  }
 }
 if(v.identity!==undefined)meta.identity=identityModule().identity(v.identity);
 if(v.packSources!==undefined&&v.packSources.length)meta.packSources=sources(v.packSources);
 if(v.deal!==undefined)meta.deal=root.TabulaSpreadDeal.normalize(v.deal,slots.length);
 if(v.cardSize!==undefined&&(!Number.isFinite(v.cardSize)||v.cardSize<.8||v.cardSize>2.3))
  throw Error('カードサイズが不正です。');
 if(v.deckPosition!==undefined&&!validDeckPosition(v.deckPosition))throw Error('山札の位置が不正です。');
 return {name,slots,...meta,...(v.cardSize===undefined?{}:{cardSize:v.cardSize}),...(v.deckPosition===undefined?{}:{deckPosition:copyDeckPosition(v.deckPosition)})};
}
function exportPortable(v){
 return {format:PORTABLE_FORMAT,kind:'spread',version:v.identity?2:1,spread:portableSpread(v)};
}
function importPortable(data){
 const wrapped=data&&data.format===PORTABLE_FORMAT&&data.kind==='spread'&&[1,2].includes(data.version);
 if(data&&('format' in Object(data)||'kind' in Object(data))&&!wrapped)
  throw Error('対応していないスプレッドJSONです。');
 const result=portableSpread(wrapped?data.spread:data);
 if(wrapped&&data.version===2&&!result.identity)throw Error('作品IDがありません。');
 return result;
}
function exportPack(info,items){
 const pack=packInfo(info);
 if(!Array.isArray(items)||!items.length||items.length>MAX_LIBRARY)throw Error('パックの収録数が不正です。');
 const spreads=items.map(portableSpread);
 if(spreads.some(s=>!s.identity)||new Set(spreads.map(s=>identityModule().key(s.identity))).size!==spreads.length)throw Error('パック内の作品IDが不正です。');
 return {format:PORTABLE_FORMAT,kind:'spread-pack',version:1,pack,spreads};
}
function importBundle(data){
 if(data?.kind!=='spread-pack')return [{spread:importPortable(data),pack:null}];
 if(data.format!==PORTABLE_FORMAT||data.version!==1||!Array.isArray(data.spreads)||!data.spreads.length||data.spreads.length>MAX_LIBRARY)throw Error('対応していないスプレッドパックです。');
 const pack=packInfo(data.pack),spreads=data.spreads.map(portableSpread);
 if(spreads.some(s=>!s.identity)||new Set(spreads.map(s=>identityModule().key(s.identity))).size!==spreads.length)throw Error('パック内の作品IDが不正です。');
 return spreads.map(spread=>({spread,pack}));
}
/* A pack is a publication snapshot, independent of editable local groups. */
const PACK_LIBRARY_KEY='tabula_sortium_spread_packs_v1',MAX_PACKS=500;
function packKey(p){return p.creator.id+':'+p.id}
function normalizePack(data){
 if(data?.kind!=='spread-pack')throw Error('スプレッドパックではありません。');
 const rows=importBundle(data);
 return exportPack(rows[0].pack,rows.map(r=>r.spread));
}
function normalizePackLibrary(items){
 if(!Array.isArray(items)||items.length>MAX_PACKS)throw Error('パック登録数が上限を超えています。');
 const packs=items.map(normalizePack);
 if(new Set(packs.map(p=>packKey(p.pack))).size!==packs.length)throw Error('パックIDが重複しています。');
 return packs;
}
function readPacks(storage){
 const raw=storage.getItem(PACK_LIBRARY_KEY);
 return raw===null?[]:normalizePackLibrary(JSON.parse(raw));
}
function stagePacks(existing,documents){
 const next=normalizePackLibrary(existing),index=new Map(next.map(p=>[packKey(p.pack),p]));
 let added=0,unchanged=0,conflicts=0;
 const accepted=[];
 for(const document of documents){
  if(document?.kind!=='spread-pack'){accepted.push(document);continue}
  const pack=normalizePack(document),key=packKey(pack.pack),prior=index.get(key);
  if(prior){
   if(JSON.stringify(prior)===JSON.stringify(pack)){unchanged++;accepted.push(pack)}
   else conflicts++;
   continue;
  }
  next.push(pack);index.set(key,pack);added++;accepted.push(pack);
 }
 if(next.length>MAX_PACKS)throw Error('パック登録数が上限を超えています。');
 return {packs:next,accepted,added,unchanged,conflicts};
}
function newPack(name,creator,items){
 return exportPack({id:identityModule().uuid(),name,creator},items);
}
function content(v){
 try{const {identity,packSources,...rest}=portableSpread(v);return JSON.stringify(rest)}
 catch(e){const fields=['name','slots','alternate','author','source','overview','method','notes','deal','cardSize','deckPosition'];return JSON.stringify(Object.fromEntries(fields.filter(k=>v[k]!==undefined).map(k=>[k,v[k]])))}
}
function sameContent(a,b){return content(a)===content(b)}
function validLibrary(items){
 if(!Array.isArray(items)||items.length>MAX_LIBRARY||!items.every(validSpread))return false;
 const ids=items.map(v=>v.id),works=items.filter(v=>v.identity).map(v=>identityModule().key(v.identity));
 return new Set(ids).size===ids.length&&new Set(works).size===works.length;
}
function prepareLibrary(items,previous,profile){
 const I=identityModule(),old=new Map(previous.map(v=>[v.id,v]));
 if(items.length>MAX_LIBRARY)throw Error('登録上限（'+MAX_LIBRARY+'件）に達しています。');
 const prepared=items.map(v=>{
  const before=old.get(v.id),prior=before?.identity;
  let id=v.identity;
  if(!id)id=I.newIdentity(profile);
  else if(prior&&I.key(id)===I.key(prior)&&!sameContent(v,before)){
   id=prior.creator.id===profile.id?I.revise(prior,profile):I.newIdentity(profile,prior);
  }
  if(id.creator.id===profile.id)id={...id,creator:I.creator(profile)};
  return {...v,identity:I.identity(id),groups:groups(v.groups||[]),packSources:sources(v.packSources||[])};
 });
 if(new Set(prepared.map(v=>v.id)).size!==prepared.length||new Set(prepared.map(v=>I.key(v.identity))).size!==prepared.length)throw Error('作品IDが重複しています。');
 return prepared;
}
function read(storage,key){
  try{
    const entries=JSON.parse(storage.getItem(key)||'[]');
    return Array.isArray(entries)?entries.filter(validSpread).slice(0,MAX_LIBRARY):[];
  }catch(e){return []}
}
function write(storage,key,items){
  storage.setItem(key,JSON.stringify(items));
}
root.TabulaSpreadStore=Object.freeze({MAX_SPREAD_SLOTS,MAX_LIBRARY,validSpread,fromReading,read,write,portableSpread,exportPortable,importPortable,exportPack,importBundle,prepareLibrary,groups,packInfo,sameContent,validLibrary,PACK_LIBRARY_KEY,MAX_PACKS,packKey,normalizePack,normalizePackLibrary,readPacks,stagePacks,newPack});
})(globalThis);
