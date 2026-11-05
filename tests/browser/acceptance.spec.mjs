import { test, expect } from '@playwright/test';

const WORKSPACE='tabula_sortium_v01';
const SPREADS='tabula_sortium_spread_library_v1';
const saved=(page,key)=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);

test.beforeEach(async ({page})=>{
  await page.goto('/');
  await page.evaluate(()=>localStorage.clear());
  await page.reload();
  await expect(page.locator('#quickDeal')).toBeVisible();
});

test('card gallery opens, filters majors and displays enlarged artwork',async ({page})=>{
  await page.locator('#cardGalleryOpen').click();
  await expect(page.locator('#cardGallery')).toBeVisible();
  await page.locator('#cardGalleryFilter').selectOption('major');
  await expect(page.locator('#cardGalleryCount')).toContainText('22 / 78');
  await expect(page.locator('#cardGalleryGrid button')).toHaveCount(22);
  await page.locator('#cardGalleryGrid button').first().click();
  await expect(page.locator('#cardGalleryLightbox')).toBeVisible();
  await expect(page.locator('#cardGalleryLabel')).toContainText('1 / 22');
  await page.locator('#cardGalleryNext').click();
  await expect(page.locator('#cardGalleryLabel')).toContainText('2 / 22');
  await page.locator('#cardGalleryBack').click();
  await expect(page.locator('#cardGalleryLightbox')).toBeHidden();
  await page.locator('#cardGalleryClose').click();
  await expect(page.locator('#cardGallery')).toBeHidden();
});

test('manual cut modal restacks every card exactly once',async ({page})=>{
  const before=await saved(page,WORKSPACE);
  await page.locator('#quickCut').click();
  await expect(page.locator('#cutConfirm')).toBeDisabled();
  const piles=page.locator('.cut-stack');
  await expect(piles).toHaveCount(3);
  for(let i=2;i>=0;i--)await piles.nth(i).click();
  await expect(page.locator('#cutConfirm')).toBeEnabled();
  await page.locator('#cutConfirm').click();
  await expect.poll(async()=> (await saved(page,WORKSPACE)).state.deck.length).toBe(78);
  const after=await saved(page,WORKSPACE);
  expect(after.state.deck.map(c=>c.id).sort()).toEqual(before.state.deck.map(c=>c.id).sort());
  expect(new Set(after.state.deck.map(c=>c.id)).size).toBe(78);
  expect(after.state.placed).toEqual(before.state.placed);
});

test('registered spread can be opened in workbench, aligned, then cancelled without changing reading',async ({page})=>{
  const fixture={
    id:'custom_acceptance',name:'確認用スプレッド',cardSize:1.5,
    slots:[{x:30,y:40,angle:0,name:'入口',detail:''},{x:70,y:65,angle:15,name:'出口',detail:''}]
  };
  await page.evaluate(({key,item})=>localStorage.setItem(key,JSON.stringify([item])),{key:SPREADS,item:fixture});
  await page.reload();
  const before=await saved(page,WORKSPACE);
  await page.locator('#spreadNotebook').click();
  await expect(page.locator('#spreadArchive')).toBeVisible();
  await expect(page.locator('#archiveItems')).toContainText(fixture.name);
  await page.locator('#archiveItems').getByRole('button',{name:'編集'}).click();
  await expect(page.locator('#spreadWorkbench')).toBeVisible();
  await page.locator('#spreadCircle').click();
  await expect(page.locator('#spreadCircleStatus')).toContainText('円形整列：半径');
  await page.locator('#spreadCancel').click();
  await expect(page.locator('#spreadWorkbench')).toBeHidden();
  const after=await saved(page,WORKSPACE);
  expect(after.state.deck).toEqual(before.state.deck);
  expect(after.state.placed).toEqual(before.state.placed);
  expect((await saved(page,SPREADS))[0]).toEqual(fixture);
});
