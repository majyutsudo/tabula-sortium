import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const context=vm.createContext({});
vm.runInContext(readFileSync(new URL('../js/deal-workflow.js',import.meta.url),'utf8'),context);
const run=context.TabulaDealWorkflow.run;
const cards=Array.from({length:12},(_,i)=>({id:i}));
test('split, collect and take preserve order and original deck',()=>{
 const result=run(cards,[{type:'split',sizes:[4,4,4]},{type:'collect',order:[1,0,2]},{type:'take',from:'stock',count:3,to:'dealt'}]);
 assert.deepEqual(Array.from(result.dealt,c=>c.id),[4,5,6]);
 assert.deepEqual(Array.from(result.stock,c=>c.id),[7,0,1,2,3,8,9,10,11]);
 assert.equal(cards.length,12);
});
test('take from piles, return selected, and reverse',()=>{
 const result=run(cards,[{type:'split',sizes:[6,6]},{type:'reverse-pile',pile:1},{type:'take',from:1,count:2,to:'selected'},{type:'return-selected',to:0,position:'bottom'},{type:'collect',order:[0,1]}]);
 assert.deepEqual(Array.from(result.stock,c=>c.id),[0,1,2,3,4,5,11,10,9,8,7,6]);
});
test('reject incomplete split and repeated pile index',()=>{
 assert.throws(()=>run(cards,[{type:'split',sizes:[5,5]}]));
 assert.throws(()=>run(cards,[{type:'split',sizes:[6,6]},{type:'collect',order:[0,0]}]));
});
test('reject missing cards without changing input',()=>{
 assert.throws(()=>run(cards,[{type:'take',from:'stock',count:13,to:'dealt'}]));
 assert.equal(cards.length,12);
});
