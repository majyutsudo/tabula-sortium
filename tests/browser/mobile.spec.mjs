import { test, expect } from '@playwright/test';

test('mobile cockpit has four visible actions without overlap', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#quickDeal')).toBeVisible();
  const ids = ['spreadQuickSelect', 'inspectCards', 'spreadNotebook', 'newSessionStandalone'];
  for (const id of ids) await expect(page.locator('#' + id)).toBeVisible();
  const boxes = await Promise.all(ids.map(id => page.locator('#' + id).boundingBox()));
  for (let i = 0; i < boxes.length - 1; i++) {
    const a = boxes[i], b = boxes[i + 1];
    expect(a && b).toBeTruthy();
    expect(a.x + a.width).toBeLessThanOrEqual(b.x + 1);
    expect(Math.abs(a.y - b.y)).toBeLessThanOrEqual(2);
  }
  expect(Math.abs(boxes[0].width - boxes[3].width)).toBeLessThanOrEqual(3);
});

test('mobile card size adjustment persists through reload', async ({ page }) => {
  await page.goto('/');
  const key = 'tabula_sortium_v01';
  const before = await page.evaluate(k => JSON.parse(localStorage.getItem(k)).settings.cardSize, key);
  await page.locator('#zoomIn').click();
  const after = await page.evaluate(k => JSON.parse(localStorage.getItem(k)).settings.cardSize, key);
  expect(after).toBeGreaterThan(before);
  await page.reload();
  const restored = await page.evaluate(k => JSON.parse(localStorage.getItem(k)).settings.cardSize, key);
  expect(restored).toBe(after);
});

test('new menu is collapsed with readable hints, can be opened and remembers its state', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  const sections=page.locator('aside .section');
  await expect(sections).toHaveCount(4);
  const expected=[
    ['Ⅰ. 使用するカード','カードの種類・展開法・詳細設定'],
    ['Ⅱ. カード操作','シャッフル・カット・配札の設定'],
    ['Ⅲ. アルター設定','テーブルの色彩・演出・装飾の設定'],
    ['Ⅳ. 保存・管理','データの保存・読み込み・初期化']
  ];
  for(let i=0;i<4;i++){
    await expect(sections.nth(i)).toHaveClass(/is-collapsed/);
    await expect(sections.nth(i).locator('.section-title')).toHaveText(expected[i][0]);
    await expect(sections.nth(i).locator('.section-hint')).toHaveText(expected[i][1]);
    await expect(sections.nth(i).locator('.section-hint')).toBeVisible();
    await expect(sections.nth(i).locator('.section-toggle')).toHaveAttribute('aria-expanded','false');
  }
  await expect(page.locator('#openAbout')).toHaveText('About');
  await sections.first().locator('.section-toggle').click();
  await expect(sections.first()).not.toHaveClass(/is-collapsed/);
  await expect(page.locator('#pool')).toBeVisible();
  await page.reload();
  await expect(sections.first()).not.toHaveClass(/is-collapsed/);
  await expect(sections.nth(1)).toHaveClass(/is-collapsed/);
});

test('deck move handle repositions the pile without drawing and survives reload', async ({ page }) => {
  await page.goto('/');
  const handle=page.locator('.deck-move-handle');
  await expect(handle).toBeVisible();
  const before=await page.evaluate(() => JSON.parse(localStorage.getItem('tabula_sortium_v01')).state.placed.length);
  const box=await handle.boundingBox();
  expect(box).toBeTruthy();
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
  await page.mouse.down();
  await page.mouse.move(box.x+box.width/2+45,box.y+box.height/2-45,{steps:6});
  await page.mouse.up();
  const result=await page.evaluate(() => {
    const v=JSON.parse(localStorage.getItem('tabula_sortium_v01'));
    return {position:v.settings.deckPosition,placed:v.state.placed.length};
  });
  expect(result.position.x).toBeGreaterThan(0);
  expect(result.position.y).toBeGreaterThanOrEqual(0);
  expect(result.placed).toBe(before);
  const moved=await page.locator('#deck').boundingBox();
  await page.reload();
  const restored=await page.locator('#deck').boundingBox();
  expect(Math.abs(moved.x-restored.x)).toBeLessThan(3);
  expect(Math.abs(moved.y-restored.y)).toBeLessThan(3);
  await page.locator('#deck').click({position:{x:12,y:35}});
  const placed=await page.evaluate(() => JSON.parse(localStorage.getItem('tabula_sortium_v01')).state.placed.length);
  expect(placed).toBe(before+1);
});

test('toolbar label cycle respects selected modes and deck handle is print-hidden', async ({page}) => {
  await page.goto('/');
  const toggle=page.locator('#toolbarLabelToggle');
  await expect(toggle).toBeVisible();
  await expect(toggle).toHaveText('カード名');
  await toggle.click();
  await expect(toggle).toHaveText('ポジション名');
  await toggle.click();
  await expect(toggle).toHaveText('非表示');
  await expect(page.locator('#zone .unified-label')).toHaveCount(0);
  await page.reload();
  await expect(toggle).toHaveText('非表示');
  await toggle.click();
  await expect(toggle).toHaveText('カード名');
  await page.locator('.label-cycle-settings summary').click();
  const options=page.locator('.label-cycle-options input');
  await expect(options).toHaveCount(4);
  await options.nth(0).uncheck(); // Exclude card name.
  await expect(toggle).toHaveText('ポジション名');
  await options.nth(2).check(); // Enable number-only in the fixed cycle.
  await toggle.click();
  await expect(toggle).toHaveText('番号のみ');
  await toggle.click();
  await expect(toggle).toHaveText('非表示');
  await page.reload();
  await expect(toggle).toHaveText('非表示');
  await toggle.click();
  await expect(toggle).toHaveText('ポジション名');
  await page.emulateMedia({media:'print'});
  await expect(page.locator('.deck-move-handle')).toBeHidden();
});

test('label settings disclosure matches the neighboring utility button', async ({page}) => {
  await page.goto('/');
  const summary=page.locator('.table-utility-actions .label-cycle-settings > summary');
  const neighbor=page.locator('#quickPositions');
  await expect(summary).toBeVisible();
  const style=await page.evaluate(() => {
    const summary=document.querySelector('.table-utility-actions .label-cycle-settings > summary');
    const neighbor=document.querySelector('#quickPositions');
    const a=getComputedStyle(summary),b=getComputedStyle(neighbor);
    return {backgroundA:a.backgroundColor,backgroundB:b.backgroundColor,borderA:a.borderTopColor,borderB:b.borderTopColor,rectA:summary.getBoundingClientRect().toJSON(),rectB:neighbor.getBoundingClientRect().toJSON()};
  });
  expect(style.backgroundA).toBe(style.backgroundB);
  expect(style.borderA).toBe(style.borderB);
  expect(Math.abs(style.rectA.height-style.rectB.height)).toBeLessThan(2);
  expect(Math.abs(style.rectA.y-style.rectB.y)).toBeLessThan(2);
  await summary.click();
  await expect(page.locator('.label-cycle-settings')).toHaveAttribute('open','');
  await expect(page.locator('.label-cycle-options input')).toHaveCount(4);
});

test('TABULA TAROT back color is theme-independent, persistent, and limited to its own deck',async ({page})=>{
 await page.goto('/');
 await expect(page.locator('body')).toHaveAttribute('data-tabula-back-tone','sepia');
 expect(await page.locator('#cardBackColor option').allTextContents()).toEqual(['Sepia','Green','Burgundy','Navy','Purple','Black','Ivory']);
 await page.locator('aside .section > h2 .section-toggle').first().click();
 await expect(page.locator('#cardBackColorField')).toBeVisible();
 await page.locator('#cardBackColor').selectOption('burgundy');
 await expect(page.locator('body')).toHaveAttribute('data-tabula-back-tone','burgundy');
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('tabula_sortium_v01')));
 expect(saved.settings.cardBackColor).toBe('burgundy');
 await page.locator('aside .section > h2 .section-toggle').nth(2).click();
 await page.locator('#visualTheme').selectOption('gothic');
 await expect(page.locator('body')).toHaveAttribute('data-tabula-back-tone','burgundy');
 await page.reload();
 if(!await page.locator('#deckLibrarySelect').isVisible())await page.locator('aside .section > h2 .section-toggle').first().click();
 await expect(page.locator('#cardBackColor')).toHaveValue('burgundy');
 expect(await page.locator('#deckLibrarySelect option').allTextContents()).toContain('シンプル');
 await page.locator('#deckLibrarySelect').selectOption('simple');
 await expect(page.locator('#cardBackColorField')).toBeHidden();
 await expect(page.locator('body')).toHaveAttribute('data-tabula-back','off');
 await expect(page.locator('#cardDesign')).toHaveValue('simple');
 await page.locator('#deckLibrarySelect').selectOption('builtin');
 await expect(page.locator('#cardDesign')).toHaveValue('standard');
 await expect(page.locator('#cardBackColor')).toHaveValue('burgundy');
 await expect(page.locator('body')).toHaveAttribute('data-tabula-back','on');
 const deckBackground=await page.evaluate(()=>getComputedStyle(document.querySelector('#deck')).backgroundImage);
 expect(deckBackground).toContain('/backs/burgundy.webp');
 for(const tone of ['sepia','green','burgundy','navy','purple','black','ivory']){
  await page.locator('#cardBackColor').selectOption(tone);
  await expect(page.locator('body')).toHaveAttribute('data-tabula-back-tone',tone);
  const background=await page.evaluate(()=>getComputedStyle(document.querySelector('#deck')).backgroundImage);
  expect(background).toContain('/backs/'+tone+'.webp');
  const image=await page.evaluate(async color=>{
   const img=new Image();
   img.src='images/decks/tabula-tarot/backs/'+color+'.webp';
   try{await img.decode();return {width:img.naturalWidth,height:img.naturalHeight}}catch{return null}
  },tone);
  expect(image).not.toBeNull();
  expect(image.width).toBeGreaterThanOrEqual(512);
 }
 const deckAfter=await page.evaluate(()=>getComputedStyle(document.querySelector('#deck')).backgroundImage);
 expect(deckAfter).toContain('/backs/ivory.webp');
});

test('mobile Use Deck lists built-in Simple and restores its selection',async({page})=>{
 await page.goto('/');
 const first=page.locator('aside .section > h2 .section-toggle').first();
 if(!await page.locator('#deckLibrarySelect').isVisible())await first.click();
 await expect(page.locator('#deckLibrarySelect option[value="simple"]')).toHaveText('シンプル');
 await page.locator('#deckLibrarySelect').selectOption('simple');
 await expect(page.locator('#cardDesign')).toHaveValue('simple');
 await expect(page.locator('#deckLibrarySelect')).toHaveValue('simple');
 await page.reload();
 if(!await page.locator('#deckLibrarySelect').isVisible())await first.click();
 await expect(page.locator('#deckLibrarySelect')).toHaveValue('simple');
 await page.locator('#deckLibrarySelect').selectOption('builtin');
 await expect(page.locator('#cardDesign')).toHaveValue('standard');
});
