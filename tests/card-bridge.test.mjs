import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const ctx={};
for(const file of ['card-engine.js','multi-workspace.js','card-bridge.js']){
 runInNewContext(readFileSync(new URL('../js/'+file,import.meta.url),'utf8'),ctx);
}
const B=ctx.TabulaCardBridge,E=ctx.TabulaCardEngine,M=ctx.TabulaMultiWorkspace;
const slots=n=>Array.from({length:n},(_,i)=>({x:10+i*10,y:30,angle:0}));
test('single snapshot retains stock order, slot assignment and removed cards',()=>{
 const state={deck:[{id:'a',reversed:true},{id:'e'}],placed:[{id:'b',slot:2,x:25,y:30,angle:15,faceUp:true},{id:'c',slot:null,x:70,y:60,faceUp:false}],removed:[{id:'d'}]};
 const old=JSON.stringify(state),p=B.single(state,slots(5)),w=p.engine;
 assert.equal(JSON.stringify(state),old);
 assert.deepEqual(Array.from(w.containers['stock:A'].cards),['A:0','A:1']);
 assert.equal(w.containers['slot:main:2'].cards.length,1);
 assert.equal(w.cards[w.containers['slot:main:2'].cards[0]].faceUp,true);
 assert.equal(w.containers['pile:removed:main'].cards.length,1);
 assert.equal(Object.values(w.containers).filter(c=>c.role==='loose').length,1);
 assert.equal(p.cardPayloads[p.identityMap['A:b']].angle,15);
 assert.equal(E.validate(w),true);
});
test('multi snapshot keeps equal faces from A and B distinct and mixed stock intact',()=>{
 const old=M.table(M.create(['a','b'],['a','b']),'table2');
 const dealt=M.deal(old,{pile:'A',tableId:'table1',slot:0}).workspace;
 const mixed=M.mix(dealt);
 const p=B.multi(mixed,{table1:slots(2),table2:slots(2)}),w=p.engine;
 assert.equal(E.validate(w),true);
 assert.notEqual(p.identityMap['A:a'],p.identityMap['B:a']);
 assert.equal(w.containers['pile:mixed'].cards.length,3);
 assert.equal(w.containers['slot:table1:0'].cards.length,1);
 assert.equal(w.containers['stock:A'].cards.length,0);
 assert.equal(w.containers['stock:B'].cards.length,0);
});
test('single state rejects duplicate identities and out-of-range slots',()=>{
 assert.throws(()=>B.single({deck:[{id:'a'}],placed:[{id:'a',slot:0,x:0,y:0}]},slots(2)));
 assert.throws(()=>B.single({deck:[],placed:[{id:'a',slot:8,x:0,y:0}]},slots(2)));
});
test('missing multi-table slot definition fails without silent data loss',()=>{
 const w=M.deal(M.create(['a'],[]),{slot:0}).workspace;
 assert.throws(()=>B.multi(w,{}));
});

test('single state projects interactive manual pile into engine as ordered container',()=>{
 const state={deck:[{id:'c'}],placed:[{id:'b',slot:1,x:50,y:45}],removed:[],tablePiles:[{id:'pile-1',x:70,y:30,cards:[{id:'a',faceUp:true}]}]};
 const p=B.single(state,slots(3));const w=p.engine;
 assert.equal(E.validate(w),true);
 assert.equal(w.containers['pile:pile-1'].cards.length,1);
 assert.equal(w.cards[w.containers['pile:pile-1'].cards[0]].cardId,'a');
 assert.equal(w.cards[w.containers['pile:pile-1'].cards[0]].faceUp,true);
 assert.equal(w.containers['slot:main:1'].cards.length,1);
});

test('strict projection preserves stable IDs, fanned piles, face states, and physical order',()=>{
 const state={
  deck:[{id:'hearts-a',instanceId:'physical-72',reversed:true}],
  placed:[{id:'hearts-a',instanceId:'physical-04',slot:1,x:30,y:40,faceUp:true,angle:45}],
  removed:[{id:'joker',instanceId:'physical-83',faceUp:false}],
  tablePiles:[{id:'pile-1',x:65,y:52,fan:{dx:.31,dy:-.26},cards:[
   {id:'clubs-7',instanceId:'physical-22',faceUp:true},
   {id:'clubs-6',instanceId:'physical-21',faceUp:false}
  ]}]
 };
 const old=JSON.stringify(state);
 const result=B.singleStable(state,slots(3)),w=result.engine;
 assert.equal(JSON.stringify(state),old);
 assert.equal(E.validate(w),true);
 assert.deepEqual(Array.from(w.containers['stock:A'].cards),['physical-72']);
 assert.deepEqual(Array.from(w.containers['slot:main:1'].cards),['physical-04']);
 assert.deepEqual(Array.from(w.containers['pile:pile-1'].cards),['physical-22','physical-21']);
 assert.deepEqual(JSON.parse(JSON.stringify(w.containers['pile:pile-1'].fan)),{dx:.31,dy:-.26});
 assert.equal(w.cards['physical-04'].faceUp,true);
 assert.equal(w.cards['physical-04'].angle,45);
 assert.equal(w.cards['physical-72'].reversed,true);
 assert.deepEqual(Object.keys(result.identityMap).sort(),Object.values(result.identityMap).sort());
 const saved=JSON.parse(JSON.stringify(w));
 assert.equal(E.validate(saved),true);
});
test('strict projection rejects missing and repeated physical instance IDs without mutating input',()=>{
 const a={deck:[{id:'a',instanceId:'card-1'}],placed:[{id:'b',instanceId:'card-1',slot:0,x:20,y:20}],removed:[],tablePiles:[]};
 const before=JSON.stringify(a);
 assert.throws(()=>B.singleStable(a,slots(2)));
 assert.equal(JSON.stringify(a),before);
 assert.throws(()=>B.singleStable({deck:[{id:'a'}],placed:[],removed:[],tablePiles:[]},slots(1)));
});

test('strict projection retains waste and discard roles as container metadata',()=>{
 const state={deck:[{id:'a',instanceId:'physical-a'}],placed:[],removed:[],tablePiles:[
  {id:'pile-1',role:'waste',x:30,y:35,cards:[{id:'b',instanceId:'physical-b',faceUp:true}]},
  {id:'pile-2',role:'discard',x:60,y:35,cards:[{id:'c',instanceId:'physical-c',faceUp:false}]}
 ]};
 const original=JSON.stringify(state),projection=B.singleStable(state,slots(1));
 assert.equal(projection.engine.containers['pile:pile-1'].role,'waste');
 assert.equal(projection.engine.containers['pile:pile-2'].role,'discard');
 assert.equal(E.validate(projection.engine),true);
 assert.equal(JSON.stringify(state),original);
});

test('a role-aware pile anchored to a registered spread position projects as one multi-card slot',()=>{
 const state={deck:[{id:'stock',instanceId:'physical-stock'}],placed:[],removed:[],tablePiles:[
  {id:'pile-1',slot:1,x:40,y:30,role:'tableau',fan:{dx:.18,dy:.34},
   cards:[{id:'a',instanceId:'physical-a',faceUp:true},
          {id:'b',instanceId:'physical-b',faceUp:false}]}
 ]};
 const original=JSON.stringify(state),p=B.singleStable(state,slots(3)),w=p.engine;
 assert.equal(E.validate(w),true);
 assert.deepEqual(Array.from(w.containers['slot:main:1'].cards),['physical-a','physical-b']);
 assert.equal(w.containers['slot:main:1'].displayPileId,'pile-1');
 assert.equal(w.containers['slot:main:1'].role,'tableau');
 assert.deepEqual(JSON.parse(JSON.stringify(w.containers['slot:main:1'].fan)),{dx:.18,dy:.34});
 assert.equal(w.containers['pile:pile-1'],undefined);
 assert.equal(JSON.stringify(state),original);
 const next=E.move(w,{from:'slot:main:1',to:'slot:main:2'});
 assert.deepEqual(Array.from(next.containers['slot:main:1'].cards),['physical-b']);
 assert.deepEqual(Array.from(next.containers['slot:main:2'].cards),['physical-a']);
 assert.equal(E.validate(next),true);
});
test('strict projection rejects a position-attached pile outside the registered spread',()=>{
 const state={deck:[],placed:[],removed:[],tablePiles:[{
  id:'bad',slot:8,x:40,y:40,cards:[{id:'a',instanceId:'physical-a'}]
 }]};
 assert.throws(()=>B.singleStable(state,slots(2)));
});
