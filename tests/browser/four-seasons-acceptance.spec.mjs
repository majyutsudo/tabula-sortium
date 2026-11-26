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
