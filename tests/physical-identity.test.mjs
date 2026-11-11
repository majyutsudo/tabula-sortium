import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const context={};
runInNewContext(readFileSync(new URL('../js/physical-identity.js',import.meta.url),'utf8'),context);
const I=context.TabulaPhysicalIdentity;
test('new reading reuses IDs after shuffle, draw and collection',()=>{
 const before=I.ensureSingle({deck:[{id:'a'},{id:'b'}],placed:[{id:'c',slot:1,faceUp:true}],removed:[{id:'d'}]});
 const current=Object.fromEntries([...before.deck,...before.placed,...before.removed].map(c=>[c.id,c.instanceId]));
 const fresh=I.nextReading(before,[{id:'d'},{id:'c'},{id:'a'},{id:'b'}],{reversals:false});
 assert.deepEqual(fresh.map(c=>c.instanceId),['A:d','A:c','A:a','A:b']);
 assert.deepEqual(Object.fromEntries(fresh.map(c=>[c.id,c.instanceId])),current);
});
test('collection preserves IDs and physical order, checkpoint uses the same identities',()=>{
 const state=I.ensureSingle({deck:[{id:'a'}],placed:[{id:'b',reversed:true},{id:'c'}],removed:[{id:'d'}],dealCheckpoint:[{id:'a'},{id:'b'},{id:'c'},{id:'d'}]});
 const stock=[...state.placed.map(I.preserveCard),...state.removed.map(I.preserveCard),...state.deck.map(I.preserveCard)];
 assert.deepEqual(stock.map(c=>c.instanceId),['A:b','A:c','A:d','A:a']);
 assert.equal(stock[0].reversed,true);
 assert.deepEqual(state.dealCheckpoint.map(c=>c.instanceId),['A:a','A:b','A:c','A:d']);
});
test('identity survives JSON storage and reload',()=>{
 const state=I.ensureSingle({deck:[{id:'a',instanceId:'physical-x'},{id:'b',instanceId:'physical-y'}],placed:[],removed:[]});
 const restored=I.ensureSingle(JSON.parse(JSON.stringify(state)));
 assert.equal(restored.deck[0].instanceId,'physical-x');
 const next=I.nextReading(restored,[{id:'b'},{id:'a'}]);
 assert.deepEqual(next.map(c=>c.instanceId),['physical-y','physical-x']);
});
test('duplicate faces and physical IDs are never repaired silently',()=>{
 assert.throws(()=>I.ensureSingle({deck:[{id:'a'}],placed:[{id:'a'}]}));
 assert.throws(()=>I.ensureSingle({deck:[{id:'a',instanceId:'same'},{id:'b',instanceId:'same'}],placed:[]}));
 assert.throws(()=>I.ensureSingle({deck:[{id:'a'}],placed:[],dealCheckpoint:[{id:'missing'}]}));
});
