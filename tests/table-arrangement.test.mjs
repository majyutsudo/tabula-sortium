import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const ctx={};
runInNewContext(readFileSync(new URL('../js/table-arrangement.js',import.meta.url),'utf8'),ctx);
const A=ctx.TabulaTableArrangement;
const ids=s=>[...s.deck,...s.placed,...(s.removed||[]),...s.tablePiles.flatMap(p=>p.cards)].map(c=>c.instanceId).sort();
const frame=(id,x,y,cards=[],slot)=>({id,x,y,cards,role:'pile',...(slot===undefined?{}:{slot})});
const card=(id,faceUp=false)=>({id,instanceId:'A:'+id,faceUp});
const copy=v=>JSON.parse(JSON.stringify(v));

test('free frames support ordered compaction, keeping whole card blocks intact',()=>{
 const s={deck:[],placed:[],removed:[],tablePiles:[
  frame('p-1',15,30),frame('p-2',50,30,[card('a'),card('b',true)]),
  frame('p-3',80,30,[card('c')])]};
 const before=copy(s),order=A.locationOrder(s,[]);
 assert.deepEqual(Array.from(order),['pile:p-1','pile:p-2','pile:p-3']);
 const {state,moves}=A.compact(s,[],order);
 assert.equal(moves,2);
 assert.deepEqual(Array.from(state.tablePiles[0].cards,c=>c.instanceId),['A:a','A:b']);
 assert.deepEqual(Array.from(state.tablePiles[1].cards,c=>c.instanceId),['A:c']);
 assert.equal(state.tablePiles[2].cards.length,0);
 assert.deepEqual(ids(state),ids(s));
 assert.deepEqual(s,before);
});
test('custom ordering and free piles refill multiple vacancies from stock',()=>{
 const s={deck:[card('a'),card('b'),card('c')],placed:[],removed:[],tablePiles:[
  frame('p-1',15,30),frame('p-2',50,30,[]),
  {...frame('p-3',80,30),role:'waste'}]};
 const order=['pile:p-3','pile:p-1','pile:p-2'];
 const {state,dealt}=A.refill(s,[],order,{limit:2});
 assert.equal(dealt,2);
 assert.equal(state.tablePiles[2].cards[0].instanceId,'A:a');
 assert.equal(state.tablePiles[2].cards[0].faceUp,true);
 assert.equal(state.tablePiles[0].cards[0].instanceId,'A:b');
 assert.equal(state.tablePiles[0].cards[0].faceUp,false);
 assert.equal(state.tablePiles[1].cards.length,0);
 assert.deepEqual(ids(state),ids(s));
});
test('preset frame compaction retains position, moving a whole stack into a vacant registered slot',()=>{
 const slots=[{x:10,y:30,angle:0},{x:40,y:30,angle:0},{x:70,y:30,angle:90}];
 const s={deck:[],placed:[{...card('a'),slot:0,x:10,y:30}],removed:[],
  tablePiles:[{...frame('p-1',70,30,[card('b'),card('c')],2),
   fan:{dx:.2,dy:.3}}]};
 const {state,moves}=A.compact(s,slots,['slot:0','slot:1','slot:2']);
 assert.equal(moves,1);
 assert.equal(state.tablePiles.find(p=>p.id==='p-1').cards.length,0);
 const target=state.tablePiles.find(p=>p.slot===1);
 assert.deepEqual(Array.from(target.cards,c=>c.instanceId),['A:b','A:c']);
 assert.deepEqual(copy(target.fan),{dx:.2,dy:.3});
 assert.equal(state.placed.length,1);
 assert.deepEqual(ids(state),ids(s));
});
test('preset vacancy refills slots and anchored piles in configured order',()=>{
 const slots=[{x:10,y:20,angle:0},{x:50,y:20,angle:0}];
 const s={deck:[card('a'),card('b')],placed:[],removed:[],
  tablePiles:[frame('p-1',50,20,[],1)]};
 const {state,dealt}=A.refill(s,slots,['slot:1','slot:0']);
 assert.equal(dealt,2);
 assert.equal(state.tablePiles[0].cards[0].instanceId,'A:a');
 assert.equal(state.placed[0].slot,0);
 assert.equal(state.placed[0].instanceId,'A:b');
 assert.deepEqual(ids(state),ids(s));
});
test('invalid or duplicate order fails without mutating live state',()=>{
 const s={deck:[card('a')],placed:[],removed:[],tablePiles:[frame('p-1',50,30)]};
 const before=copy(s);
 assert.throws(()=>A.compact(s,[],['pile:p-1','pile:p-1']));
 assert.throws(()=>A.refill(s,[],['slot:4']));
 assert.deepEqual(s,before);
});
