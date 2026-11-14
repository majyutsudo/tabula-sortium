/* TABULA SORTIUM — reading-history serialization and snapshots.
   No UI operations; accepts caller-owned storage and data. */
(function(root){'use strict';
function read(storage,key){
  try{
    const parsed=JSON.parse(storage.getItem(key)||'[]');
    return Array.isArray(parsed)?parsed.filter(v=>v&&Array.isArray(v.placed)):[];
  }catch(e){return []}
}
function write(storage,key,items){
  storage.setItem(key,JSON.stringify(items));
}
function createSnapshot(input){
  const {id,name,time,settings,state,slots,customIds,recipeId,cardNames}=input;
  return {
    id,name,time,settings:{...settings},
    placed:JSON.parse(JSON.stringify(state.placed)),
    tablePiles:JSON.parse(JSON.stringify(state.tablePiles||[])),
    ...(cardNames ? {cardNames:[...cardNames]} : {}),
    slots:JSON.parse(JSON.stringify(slots)),
    deckRemaining:state.deck.length,
    removed:JSON.parse(JSON.stringify(state.removed||[])),
    dealCheckpoint:JSON.parse(JSON.stringify(state.dealCheckpoint)),
    deck:JSON.parse(JSON.stringify(state.deck)),
    customIds:[...customIds],
    recipeId,cardPool:settings.pool,spread:settings.spread
  };
}
root.TabulaReadingHistory=Object.freeze({read,write,createSnapshot});
})(globalThis);
