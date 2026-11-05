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
