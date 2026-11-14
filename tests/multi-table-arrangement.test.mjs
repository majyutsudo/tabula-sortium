import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const ctx={};
for(const file of ['catalog','multi-workspace','table-arrangement'])
 runInNewContext(readFileSync(new URL('../js/'+file+'.js',import.meta.url),'utf8'),ctx);
const {presets}=ctx.TabulaCatalog;
const M=ctx.TabulaMultiWorkspace,A=ctx.TabulaTableArrangement;
const ids=n=>Array.from({length:n},(_,i)=>'card_'+i);
const copy=v=>JSON.parse(JSON.stringify(v));
function resultOnTable(workspace,action,spread){
 const table=workspace.tables[workspace.activeTable];
 const stock=workspace.piles[workspace.activePile];
 const state={deck:copy(stock),placed:copy(table.placed),removed:copy(table.removed||[]),
  tablePiles:copy(table.tablePiles||[])};
 const slots=presets[spread];
 const order=A.locationOrder(state,slots,slots.map((_,i)=>i));
 const result=action==='compact'?A.compact(state,slots,order):A.refill(state,slots,order);
 const candidate=copy(workspace);
 candidate.piles[candidate.activePile]=result.state.deck;
 Object.assign(candidate.tables[candidate.activeTable],{
  placed:result.state.placed,removed:result.state.removed,tablePiles:result.state.tablePiles
 });
 assert.equal(M.validate(candidate),true);
 return {workspace:candidate,result};
}
test('Monte Carlo refills physical cards in canonical 5x5 slots on an independent table',()=>{
 let w=M.table(M.create(ids(30),ids(30)),'table2','Other');
 w=M.deal(w,{pile:'A',tableId:'table1',slot:0}).workspace;
 w=M.selectTable(w,'table2');w=M.selectPile(w,'B');
 const {workspace,result}=resultOnTable(w,'refill','monteCarlo');
 assert.equal(result.dealt,25);
 assert.equal(workspace.tables.table1.placed.length,1);
 for(const card of workspace.tables.table2.placed){
  const pos=presets.monteCarlo[card.slot];
  assert.equal(card.x,pos.x);assert.equal(card.y,pos.y);
 }
 assert.equal(M.validate(copy(workspace)),true);
});
test('shared stock refills only current table and keeps cards unique on both tables',()=>{
 let w=M.table(M.create(ids(36),[]),'table2','Shared');
 w=M.deal(w,{tableId:'table1',slot:0}).workspace;
 w=M.selectTable(w,'table2');
 const {workspace}=resultOnTable(w,'refill','monteCarlo');
 assert.equal(workspace.piles.A.length,10);
 assert.equal(workspace.tables.table1.placed.length,1);
 assert.equal(workspace.tables.table2.placed.length,25);
 assert.equal(M.validate(copy(workspace)),true);
});
test('Four Seasons anchored tableau and foundation piles remain visible data locations in a shared workspace',()=>{
 let w=M.table(M.create(ids(30),[]),'table2','Shared');
 w=M.selectTable(w,'table2');
 w.tables.table2.tablePiles=presets.fourSeasons
  .map((slot,i)=>({id:'pile-'+(i+1),slot:i,x:slot.x,y:slot.y,role:slot.frameRole,cards:[]}));
 const {workspace}=resultOnTable(w,'refill','fourSeasons');
 assert.equal(workspace.tables.table2.tablePiles.length,10);
 assert.equal(workspace.tables.table2.tablePiles.reduce((n,p)=>n+p.cards.length,0),10);
 assert.equal(workspace.tables.table2.tablePiles[9].cards[0].faceUp,true);
 assert.equal(M.validate(copy(workspace)),true);
});
test('Grand Tableau 9x4 positions and pile-card conservation remain valid on table switching',()=>{
 let w=M.table(M.create(ids(40),ids(40)),'table2','Other');
 w=M.selectTable(w,'table2');w=M.selectPile(w,'B');
 const {workspace}=resultOnTable(w,'refill','grandTableau9');
 assert.equal(workspace.tables.table2.placed.length,36);
 assert.equal(workspace.tables.table2.placed[35].slot,35);
 assert.equal(workspace.tables.table2.placed[35].x,presets.grandTableau9[35].x);
 const switched=M.selectTable(workspace,'table1');
 assert.equal(M.validate(copy(switched)),true);
});
test('compaction in a multi-table workspace does not alter the other table',()=>{
 let w=M.table(M.create(ids(10),ids(10)),'table2','Other');
 w=M.deal(w,{pile:'B',tableId:'table2',slot:2}).workspace;
 w=M.deal(w,{pile:'A',tableId:'table1',slot:0}).workspace;
 w=M.selectTable(w,'table2');w=M.selectPile(w,'B');
 const {workspace,result}=resultOnTable(w,'compact','monteCarlo');
 assert.equal(result.moves,1);
 assert.equal(workspace.tables.table2.placed[0].slot,0);
 assert.equal(workspace.tables.table2.placed[0].x,presets.monteCarlo[0].x);
 assert.equal(workspace.tables.table1.placed[0].slot,0);
 assert.equal(M.validate(workspace),true);
});
