/* TABULA — shared creator and portable content identity. No account or network required. */
(function(root){'use strict';
const KEY='tabula_creator_profile_v1';
const validId=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
function uuid(){
 if(root.crypto?.randomUUID)return root.crypto.randomUUID();
 if(!root.crypto?.getRandomValues)throw Error('固有IDを生成できません。');
 const bytes=root.crypto.getRandomValues(new Uint8Array(16));bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
 const h=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
 return [h.slice(0,8),h.slice(8,12),h.slice(12,16),h.slice(16,20),h.slice(20)].join('-');
}
function creator(v){
 if(!v||!validId(v.id)||typeof v.name!=='string'||v.name.length>120||typeof v.website!=='string'||v.website.length>500)throw Error('制作者情報が不正です。');
 return {id:v.id.toLowerCase(),name:v.name,website:v.website};
}
function profile(v){const c=creator(v);if(!validId(v.libraryPackId))throw Error('パックIDが不正です。');return {...c,libraryPackId:v.libraryPackId.toLowerCase()}}
function load(storage){let v;try{v=JSON.parse(storage.getItem(KEY)||'null')}catch(e){}if(v)return profile(v);v={id:uuid(),name:'',website:'',libraryPackId:uuid()};storage.setItem(KEY,JSON.stringify(v));return v}
function save(storage,v){const p=profile(v);storage.setItem(KEY,JSON.stringify(p));return p}
function identity(v){
 if(!v||!validId(v.id)||!Number.isSafeInteger(v.revision)||v.revision<1||!validId(v.revisionId))throw Error('作品IDまたは改訂情報が不正です。');
 const result={id:v.id.toLowerCase(),creator:creator(v.creator),revision:v.revision,revisionId:v.revisionId.toLowerCase()};
 if(v.derivedFrom!==undefined){const d=v.derivedFrom;if(!d||!validId(d.id)||!validId(d.creatorId)||!validId(d.revisionId))throw Error('派生元の情報が不正です。');result.derivedFrom={id:d.id.toLowerCase(),creatorId:d.creatorId.toLowerCase(),revisionId:d.revisionId.toLowerCase()}}
 return result;
}
function newIdentity(c,source){return {id:uuid(),creator:creator(c),revision:1,revisionId:uuid(),...(source?{derivedFrom:{id:source.id,creatorId:source.creator.id,revisionId:source.revisionId}}:{})}}
function revise(v,c){return {...identity(v),creator:creator(c),revision:v.revision+1,revisionId:uuid()}}
const key=v=>v.creator.id+':'+v.id;
root.TabulaContentIdentity=Object.freeze({KEY,validId,uuid,creator,profile,load,save,identity,newIdentity,revise,key});
})(globalThis);
