import { test, expect } from '@playwright/test';

test('startup keeps both menus hidden until the tool layout is ready',async ({page})=>{
 let releaseBridge;
 const bridgeReady=new Promise(resolve=>{releaseBridge=resolve});
 await page.route('**/js/dice-workspace.js?*',async route=>{
  await bridgeReady;
  await route.continue();
 });
 const engineRequests=[];
 page.on('request',request=>{
  if(request.url().includes('/js/dice-table-engine.js'))engineRequests.push(request.url());
 });
 await page.goto('/table.html',{waitUntil:'commit'});
 await expect(page.locator('html')).toHaveAttribute('data-table-core-ready','');
 await expect(page.locator('#tableStartupStatus')).toBeVisible();
 await expect(page.locator('.toolbar')).toBeHidden();
 await expect(page.locator('.shell > aside')).toBeHidden();

 releaseBridge();
 await expect(page.locator('#tableStartup')).toBeHidden();
 await expect(page.locator('.toolbar')).toBeVisible();
 await expect(page.locator('.shell > aside')).toBeVisible();
 await expect(page.locator('#instrumentItem')).toHaveValue('card');
 expect(engineRequests).toEqual([]);
});

test('saved dice layout appears while the physics engine is still loading',async ({page})=>{
 await page.addInitScript(()=>{
  localStorage.setItem('tabula_sortium_main_tool_v1',JSON.stringify({id:'dice:normal',dice:null}));
 });
 let releaseEngine;
 const engineReady=new Promise(resolve=>{releaseEngine=resolve});
 await page.route('**/js/dice-table-engine.js?*',async route=>{
  await engineReady;
  await route.abort();
 });
 await page.goto('/table.html',{waitUntil:'domcontentloaded'});
 try{
  await expect(page.locator('#tableStartup')).toBeHidden();
  await expect(page.locator('#diceQuickActions')).toBeVisible();
  await expect(page.locator('#quickDeal')).toBeHidden();
  await expect(page.locator('#instrumentItem')).toHaveValue('dice');
  await expect(page.locator('#dice-status')).toHaveText('物理エンジンを読み込み中…');
 }finally{
  releaseEngine();
 }
 await expect(page.locator('#dice-status')).toContainText('ダイスの読み込みに失敗しました');
});

test('failed menu initialization shows a reload action',async ({page})=>{
 await page.route('**/js/dice-workspace.js?*',route=>route.abort());
 await page.goto('/table.html',{waitUntil:'domcontentloaded'});
 await expect(page.locator('#tableStartupStatus')).toHaveText('卓を読み込めませんでした。');
 await expect(page.locator('#tableStartupRetry')).toBeVisible();
 await expect(page.locator('.toolbar')).toBeHidden();
});
