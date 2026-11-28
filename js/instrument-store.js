/* TABULA — portable instrument set library, independent of tabletop rendering. */
(function(root){'use strict';
const KEY='tabula_instrument_sets_v1',FORMAT='tabula-instrument-set';
const D=root.TabulaInstrumentData,I=root.TabulaContentIdentity;
function normalize(v){
 if(!v||!Object.hasOwn(D.profiles,v.type)||typeof v.name!=='string'||!v.name.trim()||v.name.length>120||!Array.isArray(v.items)||!v.items.length||v.items.length>400)throw Error('占具セットの構造が不正です。');
 const ids=new Set();
 const items=v.items.map(item=>{
  if(!item||typeof item.id!=='string'||!item.id||item.id.length>120||ids.has(item.id))throw Error('個体IDが不正または重複しています。');ids.add(item.id);
  const info=D.information(item,item);
  if(Object.values(info).some(x=>typeof x==='string'&&x.length>100000))throw Error('情報項目が長すぎます。');
  return {id:item.id,...info};
 });
 const identity=I.identity(v.identity);
 return {identity,type:v.type,name:v.name.trim(),source:typeof v.source==='string'?v.source.slice(0,10000):'',items};
}
function library(rows){if(!Array.isArray(rows)||rows.length>100)throw Error('占具ライブラリが不正です。');const out=rows.map(normalize);if(new Set(out.map(v=>I.key(v.identity))).size!==out.length)throw Error('占具IDが重複しています。');return out}
function read(storage){return library(JSON.parse(storage.getItem(KEY)||'[]'))}
function write(storage,rows){storage.setItem(KEY,JSON.stringify(library(rows)))}
function portable(set){return {format:FORMAT,version:1,set:normalize(set)}}
function parse(v){if(v?.format!==FORMAT||v.version!==1)throw Error('占具セットJSONを選択してください。');return normalize(v.set)}
function session(set){const def=normalize(set);return {set:def,remaining:def.items.map(x=>x.id),drawn:[]}}
function take(state,count=1,random=Math.random){const q=D.draw(state.remaining,count,random);return {...state,remaining:q.remaining,drawn:[...state.drawn,...q.selected]}}
const LOT_KEY='tabula_lot_workspace_v1';
function lotSnapshot(v){
 if(!v||v.version!==1||typeof v.active!=='boolean'||typeof v.effects!=='boolean'||!Number.isInteger(v.count)||v.count<1||v.count>400)throw Error('籤の卓の設定が不正です。');
 const state=v.state==null?null:{set:normalize(v.state.set),remaining:v.state.remaining,drawn:v.state.drawn};
 if(state){const ids=new Set(state.set.items.map(x=>x.id));if(state.set.type!=='lot'||!Array.isArray(state.remaining)||!Array.isArray(state.drawn))throw Error('籤の抽出記録が不正です。');
 const all=[...state.remaining,...state.drawn];if(all.length!==ids.size||new Set(all).size!==ids.size||all.some(id=>!ids.has(id)))throw Error('籤の個体記録が不正です。');}
 const opened=v.opened;if(!Array.isArray(opened)||new Set(opened).size!==opened.length||opened.some(id=>!state?.drawn.includes(id)))throw Error('籤の開封記録が不正です。');
 return {version:1,active:v.active,effects:v.effects,count:v.count,state,opened:opened.slice()};
}
function readLot(storage){const raw=storage.getItem(LOT_KEY);return raw?lotSnapshot(JSON.parse(raw)):null}
root.TabulaInstrumentStore=Object.freeze({KEY,normalize,library,read,write,portable,parse,session,take,LOT_KEY,lotSnapshot,readLot});
})(globalThis);
