import { test, expect } from '@playwright/test';

const SINGLE='tabula_sortium_v01';
const MULTI='tabula_sortium_dual_session_v1';
const load=(page,key)=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
const ids=cards=>cards.map(card=>card.id).sort();

async function setUpFourSeasons(page,count){
 await page.goto('/table.html');
 await page.locator('#instrumentChoiceSection .section-toggle').click();
 await page.locator('#deckLibrarySelect').selectOption('playing-cards');
 await page.locator('#pool').selectOption('custom');
 const picks=page.locator('#modalContent .pick-card');
 const selection=await picks.evaluateAll((cards,n)=>cards.slice(0,n).map(card=>card.value),count);
 await page.locator('#noCards').click();
 for(const id of selection)await picks.and(page.locator('[value="'+id+'"]')).check();
 await page.locator('#confirmCards').click();
 await page.locator('#spreadQuickSelect').selectOption('fourSeasons');
 return selection.sort();
}
async function dealSix(page){
 const deal=page.locator('#quickDeal');
 await deal.click();
 await expect(page.locator('#zone .table-pile-top')).toHaveCount(6);
 await expect(deal).not.toContainText('中断');
}

for(const mode of ['independent','shared']){
 test('clearing the '+mode+' additional table preserves the complete main deck',async ({page})=>{
  const selection=await setUpFourSeasons(page,mode==='shared'?12:6);
  await dealSix(page);
  await page.locator('#tableManagement .section-toggle').click();
  await page.locator('#tableAddOpen').click();
  await page.locator('#tableAddMode').selectOption(mode);
  await page.locator(mode==='shared'?'#sharedTableAdd':'#independentTableAdd').click();
  await expect(page.locator('#workspaceTable')).toHaveValue('table2');
  await page.locator('#spreadQuickSelect').selectOption('fourSeasons');
  await dealSix(page);
  const before=await load(page,MULTI);
  expect(before.piles.A).toHaveLength(0);
  const mainPiles=before.tables.table1.tablePiles;
  const extraCards=before.tables.table2.tablePiles.flatMap(pile=>pile.cards);

  page.once('dialog',dialog=>dialog.accept());
  await page.locator('#sharedTableClear').click();
  expect(await load(page,MULTI)).toBeNull();
  await page.reload();
  await expect(page.locator('#zone .table-pile-top')).toHaveCount(6);
  const {state,settings}=await load(page,SINGLE);
  expect(settings.spread).toBe('fourSeasons');
  expect(settings.pool).toBe('custom');
  expect(state.tablePiles).toEqual(mainPiles.map(pile=>({
   ...pile,cards:pile.cards.map(({sourceDeck,...card})=>card)
  })));
  expect(ids(state.deck)).toEqual(mode==='shared'?ids(extraCards):[]);
  expect(ids([...state.deck,...state.tablePiles.flatMap(pile=>pile.cards)])).toEqual(selection);

  await page.locator('#newSessionStandalone').click();
  expect(ids((await load(page,SINGLE)).state.deck)).toEqual(selection);
 });
}

test('an old empty Four Seasons reading restores the saved card selection on reload',async ({page})=>{
 const selection=await setUpFourSeasons(page,6);
 const before=await load(page,SINGLE);
 await page.evaluate(key=>{
  const saved=JSON.parse(localStorage.getItem(key));
  saved.state.deck=[];
  localStorage.setItem(key,JSON.stringify(saved));
 },SINGLE);
 await page.reload();
 await expect(page.locator('#status')).toContainText('カード構成から山札を復元しました');
 const {state,settings}=await load(page,SINGLE);
 expect(ids(state.deck)).toEqual(selection);
 expect(state.tablePiles).toEqual(before.state.tablePiles);
 expect(settings.spread).toBe('fourSeasons');
 expect(settings.pool).toBe('custom');
 await dealSix(page);
});
