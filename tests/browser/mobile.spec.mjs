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
