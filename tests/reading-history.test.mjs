import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source=readFileSync(new URL('../js/reading-history.js',import.meta.url),'utf8');
const ctx={};runInNewContext(source,ctx);
const history=ctx.TabulaReadingHistory;
const storage=()=>{
  const data=new Map();
  return {getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};
};

test('reading history loads only records containing a placed-card array',()=>{
  const local=storage();
  assert.equal(history.read(local,'records').length,0);
  local.setItem('records',JSON.stringify([null,{}, {id:'ok',placed:[]}, {id:'no',placed:5}, {id:'also',placed:[{id:'major_00'}]}]));
  assert.deepEqual(Array.from(history.read(local,'records'),x=>x.id),['ok','also']);
  local.setItem('records','{invalid');
  assert.equal(history.read(local,'records').length,0);
  local.setItem('records',JSON.stringify({placed:[]}));
  assert.equal(history.read(local,'records').length,0);
});

test('a saved snapshot preserves the full deck and is independent from the live table',()=>{
  const settings={spread:'three',pool:'all',cardSize:1.3};
  const state={
    deck:[{id:'major_01',reversed:true}],
    placed:[{id:'major_00',x:25,y:48,slot:0,angle:0,faceUp:true}],
    removed:[{id:'cups_01',reversed:false}],
    dealCheckpoint:[{id:'swords_02',reversed:true}]
  };
  const slots=[{x:25,y:48,name:'過去'}],customIds=['major_00','major_01'];
  const cardNames=['吊り橋'];
  const input={cardNames,id:'s_test',name:'Test',time:'2026-11-06T00:00:00.000Z',settings,state,slots,customIds,recipeId:'single'};
  const result=history.createSnapshot(input);
  assert.equal(result.id,input.id);
  assert.equal(result.name,input.name);
  assert.equal(result.deckRemaining,1);
  assert.equal(result.cardPool,'all');
  assert.equal(result.spread,'three');
  assert.deepEqual(JSON.parse(JSON.stringify(result.deck)),state.deck);
  assert.deepEqual(JSON.parse(JSON.stringify(result.dealCheckpoint)),state.dealCheckpoint);
  assert.deepEqual(JSON.parse(JSON.stringify(result.removed)),state.removed);
  cardNames[0]='変更後の札名';
  state.deck[0].reversed=false;
  state.placed[0].x=99;
  state.removed.length=0;
  slots[0].x=77;
  settings.cardSize=2.3;
  customIds.push('major_02');
  assert.equal(result.deck[0].reversed,true);
  assert.equal(result.placed[0].x,25);
  assert.equal(result.removed.length,1);
  assert.equal(result.slots[0].x,25);
  assert.equal(result.settings.cardSize,1.3);
  assert.equal(result.customIds.length,2);
  assert.deepEqual(Array.from(result.cardNames),['吊り橋']);
});

test('history serialization round-trips and retains record order',()=>{
  const local=storage();
  const rows=[{id:'new',placed:[{id:'major_02'}]},{id:'old',placed:[]}];
  history.write(local,'records',rows);
  assert.deepEqual(JSON.parse(JSON.stringify(history.read(local,'records'))),rows);
});

test('storage errors propagate to existing UI error handling',()=>{
  const failure={setItem(){throw new Error('quota exceeded')}};
  assert.throws(()=>history.write(failure,'records',[]),/quota exceeded/);
});
