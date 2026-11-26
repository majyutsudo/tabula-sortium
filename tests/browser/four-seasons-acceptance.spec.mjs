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
