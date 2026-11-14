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

test('explicit persistent IDs survive reshuffling and another reading',()=>{
 const ids=['physical-91','physical-07','physical-35'];
 let w=E.create({decks:[{id:'A',cardIds:['h1','h1','s2'],instanceIds:ids}],tables:[{id:'t',slots:[{id:'0',x:20,y:25},{id:'1',x:40,y:25}]}]});
 w=E.dealVacancies(w,{from:'stock:A',tableId:'t'}).workspace;
 w=E.addPile(w,{id:'discard',tableId:'t',x:70,y:70});
 w=E.move(w,{from:'slot:t:0',to:'pile:discard'});
 w=E.collect(w,{from:['pile:discard','slot:t:1'],to:'stock:A'});
 assert.deepEqual(Array.from(w.containers['stock:A'].cards),['physical-07','physical-91','physical-35']);
 w=E.reorder(w,'stock:A',['physical-35','physical-07','physical-91']);
 const saved=JSON.parse(JSON.stringify(w));assert.equal(E.validate(saved),true);
 assert.deepEqual(Array.from(saved.decks.A.instanceIds),ids);
 assert.deepEqual(Array.from(saved.containers['stock:A'].cards),['physical-35','physical-07','physical-91']);
 const next=E.dealVacancies(saved,{from:'stock:A',tableId:'t'}).workspace;
 assert.equal(next.containers['slot:t:0'].cards[0],'physical-35');
 assert.equal(E.validate(next),true);
});
test('whole-pile collection preserves within-pile order and has explicit group order',()=>{
 let w=E.create({decks:[{id:'A',cardIds:['a','b','c','d']}],tables:[{id:'t',slots:[]}]});
 w=E.addPile(w,{id:'one',tableId:'t',x:10,y:10});
 w=E.addPile(w,{id:'two',tableId:'t',x:30,y:10});
 w=E.move(w,{from:'stock:A',to:'pile:one',count:2});
 w=E.move(w,{from:'stock:A',to:'pile:two',count:2});
 w=E.collect(w,{from:['pile:one','pile:two'],to:'stock:A'});
 assert.deepEqual(Array.from(w.containers['stock:A'].cards),['A:2','A:3','A:0','A:1']);
 assert.equal(E.validate(w),true);
});
test('persistent identity validation rejects mismatched lengths and duplicates',()=>{
 assert.throws(()=>E.create({decks:[{id:'A',cardIds:['a'],instanceIds:[]}]}));
 assert.throws(()=>E.create({decks:[{id:'A',cardIds:['a','b'],instanceIds:['same','same']}]}));
 assert.throws(()=>E.create({decks:[{id:'A',cardIds:['a'],instanceIds:['same']},{id:'B',cardIds:['a'],instanceIds:['same']}]}));
});

test('semantic container roles survive engine moves and cannot be inherited by card identity',()=>{
 let w=fresh();
 w=E.addPile(w,{id:'talon',tableId:'main',x:70,y:50,role:'waste'});
 w=E.addPile(w,{id:'discard',tableId:'main',x:85,y:60,role:'discard'});
 w=E.move(w,{from:'stock:A',to:'pile:talon',count:2});
 const before=Array.from(w.containers['pile:talon'].cards);
 w=E.move(w,{from:'pile:talon',to:'pile:discard',count:1});
 assert.deepEqual(Array.from(w.containers['pile:discard'].cards),before.slice(0,1));
 assert.equal(E.roleOf(w.containers['pile:discard']),'discard');
 assert.equal(E.roleOf(w.containers['pile:talon']),'waste');
 w=E.setPileRole(w,'talon','tableau');
 assert.equal(E.roleOf(w.containers['pile:talon']),'tableau');
 assert.equal(E.validate(JSON.parse(JSON.stringify(w))),true);
 assert.throws(()=>E.setPileRole(w,'talon','unknown'));
});
