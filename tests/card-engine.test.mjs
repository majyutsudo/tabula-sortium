import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const ctx={};
runInNewContext(readFileSync(new URL('../js/card-engine.js',import.meta.url),'utf8'),ctx);
const E=ctx.TabulaCardEngine;
const fresh=()=>E.create({decks:[{id:'A',cardIds:['h1','h1','s2','s3','s4','s5']},{id:'B',cardIds:['h1']}],tables:[{id:'main',slots:Array.from({length:5},(_,i)=>({id:String(i),x:10+i*15,y:30}))}]});
test('physical identity survives duplicate faces and two decks',()=>{
 const w=fresh();assert.equal(E.validate(w),true);
 assert.equal(Object.keys(w.cards).length,7);
 assert.notEqual(w.cards['A:0'].instanceId,w.cards['A:1'].instanceId);
 assert.notEqual(w.cards['A:0'].instanceId,w.cards['B:0'].instanceId);
});
test('vacancies refill in specified order without moving occupied cards',()=>{
 let w=fresh();let result=E.dealVacancies(w,{from:'stock:A',tableId:'main'});
 w=result.workspace;assert.equal(result.dealt,5);
 assert.deepEqual(Array.from(w.containers['slot:main:1'].cards),['A:1']);
 w=E.addPile(w,{id:'discard',tableId:'main',x:85,y:70});
 w=E.move(w,{from:'slot:main:1',to:'pile:discard'});
 w=E.move(w,{from:'slot:main:3',to:'pile:discard'});
 result=E.dealVacancies(w,{from:'stock:A',tableId:'main'});
 assert.equal(result.dealt,1);assert.deepEqual(Array.from(result.workspace.containers['slot:main:1'].cards),['A:5']);
 assert.deepEqual(Array.from(result.workspace.containers['slot:main:3'].cards),[]);
 assert.deepEqual(Array.from(result.workspace.containers['pile:discard'].cards),['A:3','A:1']);
 assert.equal(E.validate(result.workspace),true);
});
test('pile stacking, block move, bottom insertion, and reorder preserve order',()=>{
 let w=fresh();w=E.addPile(w,{id:'reserve',tableId:'main',x:60,y:40});
 w=E.move(w,{from:'stock:A',to:'pile:reserve',count:3});
 assert.deepEqual(Array.from(w.containers['pile:reserve'].cards),['A:0','A:1','A:2']);
 w=E.move(w,{from:'pile:reserve',to:'stock:B',count:2,toEnd:'bottom'});
 assert.deepEqual(Array.from(w.containers['stock:B'].cards),['B:0','A:0','A:1']);
 w=E.reorder(w,'stock:B',['A:1','B:0','A:0']);
 assert.equal(E.validate(w),true);
});
test('card state is independent from its container',()=>{
 let w=fresh();w=E.flip(w,'A:0');w=E.rotate(w,'A:0',90);
 w=E.move(w,{from:'stock:A',to:'slot:main:0'});
 assert.equal(w.cards['A:0'].faceUp,true);assert.equal(w.cards['A:0'].angle,90);
});
test('invalid operations are atomic; card loss or duplication is rejected',()=>{
 let w=fresh();assert.throws(()=>E.move(w,{from:'stock:A',to:'slot:main:0',count:999}));
 assert.equal(w.containers['stock:A'].cards.length,6);
 w.containers['stock:A'].cards.push('A:0');assert.throws(()=>E.validate(w));
});
test('nonempty piles cannot be removed',()=>{
 let w=fresh();w=E.addPile(w,{id:'discard',tableId:'main',x:20,y:20});
 w=E.move(w,{from:'stock:A',to:'pile:discard'});
 assert.throws(()=>E.removeEmptyPile(w,'discard'));
 w=E.move(w,{from:'pile:discard',to:'stock:A'});
 w=E.removeEmptyPile(w,'discard');assert.equal(w.containers['pile:discard'],undefined);
});
