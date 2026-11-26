import { test, expect } from '@playwright/test';

const MULTI='tabula_sortium_dual_session_v1';
const workspace=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),MULTI);

async function showTableSetup(page){
 await page.locator('#tableManagement .section-toggle').click();
 await page.locator('#tableAddOpen').click();
}

test('independent table can start with a historical playing-card pack',async ({page})=>{
 await page.goto('/table.html');
 await showTableSetup(page);
 await page.locator('#independentDeckSelect').selectOption('playing-cards');
 await page.locator('#independentDeckPool').selectOption('piquet32');
 await page.locator('#independentTableAdd').click();

 const saved=await workspace(page);
 expect(saved.piles.A).toHaveLength(78);
 expect(saved.piles.B).toHaveLength(32);
 expect(new Set(saved.piles.B.map(card=>Number(card.id.split('_r').at(-1))))).toEqual(new Set([1,7,8,9,10,11,12,13]));
 expect(saved.tables.table2.pool).toBe('piquet32');
 await page.reload();
 await expect(page.locator('#pool')).toHaveValue('piquet32');
});

async function checkCards(page,ids){
 await page.locator('#noCards').click();
 for(const id of ids)await page.locator('#modalContent .pick-card[value="'+id+'"]').check();
 await page.locator('#confirmCards').click();
}

for(const [deckName,deckId,ids] of [
 ['Tarot','builtin',['major_00','major_01']],
 ['Lenormand','lenormand-36',['lenormand-01','lenormand-02']],
]){
 test('independent table can use an individual '+deckName+' selection',async ({page})=>{
  await page.goto('/table.html');
  const mainIds=['major_00','major_01','major_02'];
  if(deckId==='builtin'){
   await page.locator('#instrumentChoiceSection .section-toggle').click();
   await page.locator('#pool').selectOption('custom');
   await checkCards(page,mainIds);
  }
  await showTableSetup(page);
  await page.locator('#independentDeckSelect').selectOption(deckId);
  const pool=page.locator('#independentDeckPool');
  await pool.selectOption('custom');
  if(deckId==='builtin')await expect(page.locator('#modalContent .pick-card:checked')).toHaveCount(mainIds.length);
  await page.locator('#modalClose').click();
  await expect(pool).toHaveValue('all');
  await pool.selectOption('custom');
  await checkCards(page,ids);
  await expect(pool).toHaveValue('custom');
  await page.locator('#independentCustomPoolEdit').click();
  await expect(page.locator('#modalContent .pick-card:checked')).toHaveCount(ids.length);
  await page.locator('#modalClose').click();
  await page.locator('#independentTableAdd').click();

  const saved=await workspace(page);
  if(deckId==='builtin')expect(saved.piles.A.map(card=>card.id).sort()).toEqual(mainIds);
  else expect(saved.piles.A).toHaveLength(78);
  expect(saved.piles.B.map(card=>card.id).sort()).toEqual(ids);
  expect(saved.tables.table2.pool).toBe('custom');
  await page.reload();
  await expect(page.locator('#pool')).toHaveValue('custom');
  await page.locator('#workspaceTable').selectOption('main');
  await expect(page.locator('#pool')).toHaveValue(deckId==='builtin'?'custom':'all');
 });
}
