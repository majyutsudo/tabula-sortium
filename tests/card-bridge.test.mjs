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
