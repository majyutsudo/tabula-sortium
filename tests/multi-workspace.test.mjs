import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=readFileSync(new URL('../js/multi-workspace.js',import.meta.url),'utf8');
const ctx={};runInNewContext(source,ctx);
const M=ctx.TabulaMultiWorkspace;
const a=['major_00','major_01', 'cups_01'],b=['major_00','major_01','cups_01'];
test('same tarot identity can exist once in each physical deck',()=>{
 const w=M.create(a,b);
 assert.equal(w.instances.length,6);
 assert.equal(w.piles.A.length,3);
 assert.equal(w.piles.B.length,3);
 assert.notEqual(w.piles.A[0].instanceId,w.piles.B[0].instanceId);
 assert.equal(w.piles.A[0].id,w.piles.B[0].id);
 assert.equal(M.validate(w),true);
});
test('156-card mixed stock retains physical provenance and splits correctly',()=>{
 const ids=Array.from({length:78},(_,i)=>'card_'+i);
 const w=M.mix(M.create(ids,ids));
 assert.equal(w.piles.mixed.length,156);
 assert.equal(new Set(Array.from(w.piles.mixed,c=>c.instanceId)).size,156);
 const first=M.deal(w,{pile:'mixed',slot:0});
 const second=M.deal(first.workspace,{pile:'mixed',slot:1});
 assert.equal(second.workspace.piles.mixed.length,154);
 const separated=M.separate(second.workspace);
 assert.equal(separated.piles.A.length+separated.piles.B.length,154);
 assert.equal(separated.tables.table1.placed.length,2);
 assert.equal(M.validate(separated),true);
});
test('one table can retain A while another table uses B',()=>{
 let w=M.table(M.create(a,b),'table2','卓Ⅱ');
 let placed=M.deal(w,{pile:'A',tableId:'table1',slot:0});
 w=M.selectTable(placed.workspace,'table2');
 placed=M.deal(w,{pile:'B',slot:0});
 w=placed.workspace;
 assert.equal(w.tables.table1.placed.length,1);
 assert.equal(w.tables.table2.placed.length,1);
 assert.equal(w.tables.table1.placed[0].id,w.tables.table2.placed[0].id);
 assert.notEqual(w.tables.table1.placed[0].instanceId,w.tables.table2.placed[0].instanceId);
 assert.equal(M.validate(w),true);
});
test('cards return to their source piles even after a mixed stock is separated',()=>{
 let w=M.mix(M.create(a,b));
 let result=M.deal(w,{pile:'mixed',slot:0});w=result.workspace;
 w=M.separate(w);
 const c=w.tables.table1.placed[0];
 w=M.returnCard(w,'table1',c.instanceId);
 assert.equal(w.piles[c.sourceDeck][0].instanceId,c.instanceId);
 assert.equal(M.validate(w),true);
});
test('reject invalid duplicates and reordering that loses cards',()=>{
 const w=M.create(a,b);
 assert.throws(()=>M.create(['major_00','major_00'],b));
 assert.throws(()=>M.reorder(w,'A',['A:major_00']));
 assert.throws(()=>M.deal(w,{pile:'mixed'}));
 let n=M.deal(w,{pile:'A',slot:2}).workspace;
 assert.throws(()=>M.deal(n,{pile:'A',slot:2}));
 n.tables.table1.placed.push({...n.tables.table1.placed[0]});
 assert.throws(()=>M.validate(n));
});

test('temporarily removed cards remain accounted for in their table',()=>{
 let w=M.create(a,b);
 const c=w.piles.A.shift();
 w.tables.table1.removed=[{...c}];
 assert.equal(M.validate(w),true);
 w=M.selectTable(w,'table1');
 assert.equal(M.validate(w),true);
 w.tables.table1.removed=[];
 assert.throws(()=>M.validate(w));
});

test('physical cards within table piles survive switching and never duplicate',()=>{
 let w=M.table(M.create(a,b),'table2','卓Ⅱ');
 const first=w.piles.A.shift();
 w.tables.table1.tablePiles=[{id:'pile-1',x:30,y:40,slot:1,role:'tableau',cards:[first]}];
 assert.equal(M.validate(w),true);
 w=M.selectTable(w,'table2');
 assert.equal(M.validate(w),true);
 const second=w.piles.B.shift();
 w.tables.table2.tablePiles=[{id:'pile-1',x:50,y:50,slot:1,role:'foundation',cards:[second]}];
 assert.equal(M.validate(w),true);
 const restored=JSON.parse(JSON.stringify(w));
 assert.equal(M.validate(restored),true);
 assert.equal(restored.tables.table1.tablePiles[0].cards[0].instanceId,first.instanceId);
 restored.tables.table1.placed.push({...first});
 assert.throws(()=>M.validate(restored));
});
test('table piles and individual cards cannot occupy the same spread slot',()=>{
 const w=M.create(a,b);
 const c=w.piles.A.shift();
 w.tables.table1.tablePiles=[{id:'pile-1',x:30,y:40,slot:0,cards:[c]}];
 assert.throws(()=>M.deal(w,{pile:'A',slot:0}));
});
