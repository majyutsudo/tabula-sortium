import { test, expect } from '@playwright/test';

test('Four Seasons opens the active table’s pile tops with an additional table', async ({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/table.html');

 await page.locator('#instrumentChoiceSection .section-toggle').click();
 await page.locator('#deckLibrarySelect').selectOption('playing-cards');

 const management=page.locator('#tableManagement');
 await management.locator('.section-toggle').click();
 await page.locator('#tableAddOpen').click();
 await page.locator('#independentTableAdd').click();

 const switcher=page.locator('#workspaceTable');
 const spread=page.locator('#spreadQuickSelect');
 const deal=page.locator('#quickDeal');
 const open=page.locator('#quickOpen');
 const tops=page.locator('#zone .table-pile-top');
 const openTops=page.locator('#zone .table-pile-top.is-face-up');
 const openMode=page.locator('#tableOpenMode');

 async function dealClosed(){
  await spread.selectOption('fourSeasons');
  await deal.click();
  await expect(tops).toHaveCount(6);
  await expect(deal).not.toContainText('中断');
  await expect(openTops).toHaveCount(0);
 }

 await expect(switcher).toHaveValue('table2');
 await dealClosed();
 await switcher.selectOption('main');
 await dealClosed();

 await openMode.selectOption('quick');
 await open.click();
 await expect(openTops).toHaveCount(6);
 await expect(open).not.toContainText('中断');

 await switcher.selectOption('table2');
 await expect(openTops).toHaveCount(0);
 await openMode.selectOption('bloom');
 await open.click();
 await expect(openTops).toHaveCount(6);

 await page.reload();
 await expect(switcher).toHaveValue('table2');
 await expect(openTops).toHaveCount(6);
 await switcher.selectOption('main');
 await expect(openTops).toHaveCount(6);
});

for(const mode of ['independent','shared']){
 test('Four Seasons can reveal and place stock cards on both '+mode+' tables',async ({page})=>{
  await page.setViewportSize({width:1600,height:1000});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/table.html');
  await page.locator('#instrumentChoiceSection .section-toggle').click();
  await page.locator('#deckLibrarySelect').selectOption('playing-cards');
  await page.locator('#tableManagement .section-toggle').click();
  await page.locator('#tableAddOpen').click();
  await page.locator('#tableAddMode').selectOption(mode);
  await page.locator(mode==='shared'?'#sharedTableAdd':'#independentTableAdd').click();

  const workspace=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('tabula_sortium_dual_session_v1')));
  const switcher=page.locator('#workspaceTable');
  const deal=page.locator('#quickDeal');
  const stock=page.locator('#deck');
  const hand=page.locator('#zone > .card');
  await expect(switcher).toHaveValue('table2');
  for(const tableId of ['table2','table1']){
   if(tableId==='table1')await switcher.selectOption('main');
   await page.locator('#spreadQuickSelect').selectOption('fourSeasons');
   await deal.click();
   await expect(page.locator('#zone .table-pile-top')).toHaveCount(6);
   await expect(deal).not.toContainText('中断');

   const before=await workspace();
   const stockId=before.activePile;
   const talonId=before.tables[tableId].tablePiles.find(pile=>pile.role==='waste').id;
   const talon=page.locator('#zone .table-pile[data-pile-id="'+talonId+'"]');
   const first=before.piles[stockId][0].instanceId;

   await stock.click();
   await expect(hand).toHaveClass(/faceup/);
   let saved=await workspace();
   expect(saved.tables[tableId].placed.map(card=>card.instanceId)).toEqual([first]);
   expect(saved.piles[stockId]).toHaveLength(before.piles[stockId].length-1);
   await deal.click();
   await expect(page.locator('#status')).toContainText('枠外の手札');
   expect((await workspace()).piles[stockId]).toHaveLength(before.piles[stockId].length-1);

   await expect(hand).toBeVisible();
   await hand.dragTo(talon,{force:true});
   await expect(hand).toHaveCount(0);
   await expect(talon.locator('.table-pile-top')).toHaveClass(/is-face-up/);
   await deal.click();
   await expect(hand).toHaveClass(/faceup/);
   saved=await workspace();
   expect(saved.piles[stockId]).toHaveLength(before.piles[stockId].length-2);
   expect(saved.tables[tableId].tablePiles.find(pile=>pile.id===talonId).cards[0].instanceId).toBe(first);
   await expect(hand).toBeVisible();
   await hand.dragTo(talon,{force:true});
   await expect(hand).toHaveCount(0);
   await stock.dragTo(talon,{force:true});
   saved=await workspace();
   expect(saved.piles[stockId]).toHaveLength(before.piles[stockId].length-3);
   expect(saved.tables[tableId].tablePiles.find(pile=>pile.id===talonId).cards).toHaveLength(3);
   const otherId=tableId==='table1'?'table2':'table1';
   expect(saved.tables[otherId]).toEqual(before.tables[otherId]);
  }
 });
}

async function recordPileFlights(page){
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.addInitScript(()=>{
  const animate=Element.prototype.animate;
  window.pileFlights=[];
  Element.prototype.animate=function(frames,options){
   const animation=animate.call(this,frames,options);
   if(this.classList.contains('table-pile-top')){
    window.pileFlights.push({duration:options.duration,first:frames[0].transform,last:frames.at(-1).transform});
    animation.playbackRate=100;
   }
   return animation;
  };
 });
}

test('Four Seasons deals all six pile cards with each selected flight',async ({page})=>{
 await recordPileFlights(page);
 await page.goto('/table.html');
 await page.locator('#spreadQuickSelect').selectOption('fourSeasons');
 const deal=page.locator('#quickDeal');
 const modes=await page.evaluate(()=>Object.keys(TabulaDealAnimation.MODES));
 for(const mode of modes){
  await page.locator('#newSessionStandalone').click();
  await page.locator('#dealAnimation').selectOption(mode);
  const expectedDuration=await page.evaluate(id=>TabulaDealAnimation.create(id,{dx:100,dy:100}).duration,mode);
  await page.evaluate(()=>{window.pileFlights=[]});
  await deal.click();
  await expect(deal).not.toContainText('中断');
  await expect(page.locator('#zone .table-pile-top')).toHaveCount(6);
  const flights=await page.evaluate(()=>window.pileFlights);
  expect(flights.map(flight=>flight.duration)).toEqual(Array(6).fill(expectedDuration));
  expect(flights.every(flight=>flight.first!==flight.last)).toBe(true);
 }
});

for(const mode of ['single','independent']){
 test('Four Seasons returns filled and empty pile frames in '+mode+' mode',async ({page})=>{
  await recordPileFlights(page);
  await page.goto('/table.html');
  if(mode==='independent'){
   await page.locator('#tableManagement .section-toggle').click();
   await page.locator('#tableAddOpen').click();
   await page.locator('#independentTableAdd').click();
   await expect(page.locator('#workspaceTable')).toHaveValue('table2');
  }
  await page.locator('#spreadQuickSelect').selectOption('fourSeasons');
  await page.locator('#dealAnimation').selectOption('spin');
  await page.locator('#quickDeal').click();
  await expect(page.locator('#zone .table-pile-top')).toHaveCount(6);
  await expect(page.locator('#quickDeal')).not.toContainText('中断');
  const {durations,spinDuration}=await page.evaluate(()=>({
   durations:window.pileFlights.map(flight=>flight.duration),
   spinDuration:TabulaDealAnimation.create('spin',{dx:100,dy:100}).duration
  }));
  expect(durations).toEqual(Array(6).fill(spinDuration));
  const key=mode==='single'?'tabula_sortium_v01':'tabula_sortium_dual_session_v1';
  const original=await page.evaluate(key=>{
   const saved=JSON.parse(localStorage.getItem(key));
   const table=saved.state||saved.tables.table2;
   const originals=[table.tablePiles.find(pile=>pile.cards.length),table.tablePiles.find(pile=>!pile.cards.length)];
   const snapshot=structuredClone(originals);
   for(const pile of originals)Object.assign(pile,{x:18,y:76,angle:25,manualMoved:true});
   localStorage.setItem(key,JSON.stringify(saved));
   return snapshot;
  },key);
  await page.reload();
  for(const pile of original){
   const frame=page.locator('[data-pile-id="'+pile.id+'"]');
   expect(await frame.evaluate(node=>[node.style.left,node.style.top])).toEqual(['18%','76%']);
  }
  await page.locator('#quickPositions').click();
  await page.reload();
  const restored=await page.evaluate(key=>{
   const saved=JSON.parse(localStorage.getItem(key));
   return (saved.state||saved.tables.table2).tablePiles;
  },key);
  for(const pile of original){
   const actual=restored.find(item=>item.id===pile.id);
   expect(actual).toMatchObject({x:pile.x,y:pile.y,angle:0,manualMoved:false,cards:pile.cards});
  }
 });
}
