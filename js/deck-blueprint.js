/* TABULA deck blueprint designer — independent card identities, no 78-card dependency. */
(function(root){'use strict';
const KEY='tabula_deck_blueprints_v1';
const clone=x=>JSON.parse(JSON.stringify(x));
const clean=x=>String(x??'').trim();
function playingCards(){
 const suits=[
  {id:'spades',name:'スペード',symbol:'♠',color:'black'},
  {id:'hearts',name:'ハート',symbol:'♥',color:'red'},
  {id:'diamonds',name:'ダイヤ',symbol:'♦',color:'red'},
  {id:'clubs',name:'クラブ',symbol:'♣',color:'black'}
 ];
 const ranks=Array.from({length:13},(_,i)=>({id:'r'+(i+1),order:i+1,label:['A','2','3','4','5','6','7','8','9','10','J','Q','K'][i],name:['エース','2','3','4','5','6','7','8','9','10','ジャック','クイーン','キング'][i]}));
 return {id:'blueprint_'+Date.now().toString(36),name:'プレイングカード（52枚）',suits,ranks,cards:[],nameSets:[{id:'primary',label:'基本名称'}],version:1};
}
function blank(){
 return {id:'blueprint_'+Date.now().toString(36),name:'新しいデッキ',suits:[],ranks:[],cards:[],nameSets:[{id:'primary',label:'基本名称'}],version:1};
}
function generate(def){
 const list=[],ids=new Set();
 const overrides=new Map(def.cards.map(c=>[c.id,c]));
 for(const suit of def.suits)for(const rank of def.ranks){
  const id='c_'+suit.id+'_'+rank.id;
  list.push({...{id,suitId:suit.id,rankId:rank.id,number:rank.label,name:suit.name+'の'+rank.name,image:null,names:{}},...clone(overrides.get(id)||{})});
  ids.add(id);
 }
 for(const c of def.cards){
  if(!ids.has(c.id)){list.push(clone(c));ids.add(c.id)}
 }
 return list;
}
function validate(def){
 if(!def||typeof def!=='object'||!Array.isArray(def.suits)||!Array.isArray(def.ranks)||!Array.isArray(def.cards))throw Error('デッキの構造が正しくありません');
 if(!clean(def.name))throw Error('デッキ名を入力してください');
 for(const [key,arr] of [['スート',def.suits],['ランク',def.ranks],['カード',def.cards]]){
  const ids=arr.map(v=>clean(v.id));
  if(ids.some(v=>!v)||new Set(ids).size!==ids.length)throw Error(key+'のIDが重複または空欄です');
 }
 if(generate(def).length>400)throw Error('カードは400枚以内にしてください');
 return true;
}
function load(){try{const saved=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(saved)?saved:[]}catch{return []}}
function save(def){validate(def);const all=load().filter(item=>item.id!==def.id);all.push(clone(def));localStorage.setItem(KEY,JSON.stringify(all));return all}
function remove(id){localStorage.setItem(KEY,JSON.stringify(load().filter(d=>d.id!==id)))}
root.TabulaDeckBlueprint=Object.freeze({KEY,playingCards,blank,generate,validate,load,save,remove,clone});
})(globalThis);
