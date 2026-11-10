/* Images for user-authored decks. Stored separately from lightweight JSON definitions. */
(function(root){'use strict';
const DB='tabula-deck-art-v1',STORE='faces';
function database(){
 return new Promise((resolve,reject)=>{
  const request=indexedDB.open(DB,1);
  request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE)};
  request.onerror=()=>reject(request.error||Error('画像保存庫を開けません'));
  request.onsuccess=()=>resolve(request.result);
 });
}
async function access(mode,action){
 const db=await database();
 try{return await new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,mode),store=tx.objectStore(STORE);
  let request;
  try{request=action(store)}catch(e){reject(e);return}
  tx.oncomplete=()=>resolve(request?.result);
  tx.onerror=()=>reject(tx.error||Error('画像保存に失敗しました'));
  tx.onabort=()=>reject(tx.error||Error('画像保存を中止しました'));
 })}finally{db.close()}
}
const key=(deckId,cardId)=>deckId+'::'+cardId;
function put(deckId,cardId,blob){
 if(!(blob instanceof Blob)||!blob.type.startsWith('image/'))return Promise.reject(Error('画像ファイルを選択してください'));
 return access('readwrite',store=>store.put(blob,key(deckId,cardId)));
}
const get=(deckId,cardId)=>access('readonly',store=>store.get(key(deckId,cardId)));
const remove=(deckId,cardId)=>access('readwrite',store=>store.delete(key(deckId,cardId)));
async function removeDeck(deckId){
 const ids=await access('readonly',store=>store.getAllKeys());
 const prefix=deckId+'::';
 for(const id of ids.filter(v=>typeof v==='string'&&v.startsWith(prefix)))await access('readwrite',store=>store.delete(id));
}
async function loadDeck(deckId,ids){
 const result=new Map(),all=await Promise.all(ids.map(async id=>[id,await get(deckId,id)]));
 for(const [id,blob] of all)if(blob instanceof Blob)result.set(id,blob);
 return result;
}
root.TabulaDeckArt=Object.freeze({put,get,remove,removeDeck,loadDeck});
})(globalThis);
