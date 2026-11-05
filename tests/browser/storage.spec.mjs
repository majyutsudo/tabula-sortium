import { test, expect } from '@playwright/test';

const WORKSPACE = 'tabula_sortium_v01';
const HISTORY = 'tabula_sortium_history_v034';
const SPREADS = 'tabula_sortium_spread_library_v1';

async function saved(page, key) {
  return page.evaluate(k => JSON.parse(localStorage.getItem(k)), key);
}

test.beforeEach(async ({ page }) => {
  // Every test uses an isolated browser context and a clean localStorage.
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator('#quickDeal')).toBeVisible();
});

test('fresh default configuration uses Celtic cross, overhand and card labels', async ({ page }) => {
  const workspace = await saved(page, WORKSPACE);
  expect(workspace.settings.spread).toBe('celtic');
  expect(workspace.settings.shuffleMethod).toBe('overhand');
  await expect(page.locator('#spread')).toHaveValue('celtic');
  await expect(page.locator('#shuffleMethod')).toHaveValue('overhand');
  await expect(page.locator('#tableLabelMode')).toHaveValue('card');
  await expect(page.locator('#numberCardStyle')).toHaveCount(0);
  const pools = await page.locator('#pool option').evaluateAll(options => options.map(x => x.value));
  expect(pools).toEqual(['all', 'major', 'minor', 'court', 'custom']);
  await page.locator('#quickDeal').click();
  await expect.poll(async () => (await saved(page, WORKSPACE)).state.placed.length).toBe(10);
  await page.reload();
  await expect(page.locator('#tableLabelMode')).toHaveValue('card');
});

test('new session is saved in schema v1 and restores its deck across reload', async ({ page }) => {
  const before = await saved(page, WORKSPACE);
  expect(before.schemaVersion).toBe(1);
  expect(before.state.deck).toHaveLength(78);
  expect(before.settings.spread).toBeTruthy();
  await page.reload();
  const after = await saved(page, WORKSPACE);
  expect(after.schemaVersion).toBe(1);
  expect(after.state.deck).toEqual(before.state.deck);
  expect(after.state.placed).toEqual(before.state.placed);
});

test('dealing cards persists identities and slots after reload', async ({ page }) => {
  await page.locator('#spreadQuickSelect').selectOption('three');
  await page.locator('#quickDeal').click();
  await expect.poll(async () => (await saved(page, WORKSPACE)).state.placed.length).toBe(3);
  const before = await saved(page, WORKSPACE);
  expect(new Set(before.state.placed.map(p => p.id)).size).toBe(3);
  await page.reload();
  const after = await saved(page, WORKSPACE);
  expect(after.state.placed).toEqual(before.state.placed);
  expect(after.state.deck).toEqual(before.state.deck);
});

test('custom spreads retain positions, labels, and saved card size', async ({ page }) => {
  const custom = {
    id: 'custom_test_fixture',
    name: '自動テストの展開法',
    slots: [{ x: 33, y: 40, angle: 0, name: '第一の位置' },
      { x: 66, y: 60, angle: 15, name: '第二の位置' }],
    cardSize: 1.45
  };
  await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify([value])), { key: SPREADS, value: custom });
  await page.reload();
  const choices = await page.locator('#spreadQuickSelect option').evaluateAll(nodes => nodes.map(n => n.value));
  expect(choices).toContain(custom.id);
  await page.locator('#spreadQuickSelect').selectOption(custom.id);
  const selected = await saved(page, WORKSPACE);
  expect(selected.settings.spread).toBe(custom.id);
  expect(selected.settings.cardSize).toBeCloseTo(custom.cardSize, 4);
  expect((await saved(page, SPREADS))[0]).toMatchObject(custom);
});

test('full JSON backup keeps schema, readings and custom spreads', async ({ page }) => {
  await page.locator('#spreadQuickSelect').selectOption('three');
  await page.locator('#quickDeal').click();
  // A three-card deal is staggered: wait for all cards before making the backup.
  await expect.poll(async () => (await saved(page, WORKSPACE)).state.placed.length).toBe(3);
  const before = await saved(page, WORKSPACE);
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('#exportAll').click()
  ]);
  const file = await download.createReadStream();
  let raw = '';
  for await (const chunk of file) raw += chunk.toString();
  const exported = JSON.parse(raw);
  expect(exported).toMatchObject({ format: 'tabula-sortium', version: 1, kind: 'backup' });
  expect(exported.workspace.schemaVersion).toBe(1);
  expect(exported.workspace.state.placed).toEqual(before.state.placed);
  expect(exported.snapshots).toEqual([]);
  expect(Array.isArray(exported.spreadLibrary)).toBe(true);

  // Restore into the same isolated browser after changing its workspace.
  await page.locator('#newSessionStandalone').click();
  const confirm = page.waitForEvent('dialog').then(d => d.accept());
  await page.locator('#externalFile').setInputFiles({
    name: 'tabula-backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(raw, 'utf8')
  });
  await confirm;
  await expect.poll(async () => (await saved(page, WORKSPACE)).state.placed.length).toBe(before.state.placed.length);
  const restored = await saved(page, WORKSPACE);
  expect(restored.state.deck).toEqual(before.state.deck);
  expect(restored.state.placed).toEqual(before.state.placed);
});

test('invalid JSON does not replace the current workspace', async ({ page }) => {
  const before = await saved(page, WORKSPACE);
  const alert = page.waitForEvent('dialog').then(async d => {
    expect(d.type()).toBe('alert');
    await d.accept();
  });
  await page.locator('#externalFile').setInputFiles({
    name: 'invalid.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{broken', 'utf8')
  });
  await alert;
  expect(await saved(page, WORKSPACE)).toEqual(before);
  expect(await saved(page, HISTORY)).toBeNull();
});

test('settings reset preserves the current reading', async ({ page }) => {
  await page.locator('#tableLabelMode').selectOption('number');
  await page.locator('#quickDeal').click();
  await expect.poll(async () => (await saved(page, WORKSPACE)).state.placed.length).toBeGreaterThan(0);
  const before = await saved(page, WORKSPACE);
  const confirm = page.waitForEvent('dialog').then(d => d.accept());
  await page.locator('#resetSettings').click();
  await confirm;
  const after = await saved(page, WORKSPACE);
  expect(after.state.placed).toEqual(before.state.placed);
  expect(after.settings.spread).toBe('celtic');
  expect(after.settings.shuffleMethod).toBe('overhand');
  await expect(page.locator('#tableLabelMode')).toHaveValue('card');
});

test('all-data reset discards readings and returns card size to its default', async ({ page }) => {
  await page.locator('#tableLabelMode').selectOption('number');
  await page.locator('#quickDeal').click();
  await expect.poll(async () => (await saved(page, WORKSPACE)).state.placed.length).toBeGreaterThan(0);
  const originalSize = await page.evaluate(() => JSON.parse(localStorage.getItem('tabula_sortium_v01')).settings.cardSize);
  await page.locator('#zoomIn').click();
  const changedSize = await page.evaluate(() => JSON.parse(localStorage.getItem('tabula_sortium_v01')).settings.cardSize);
  expect(changedSize).toBeGreaterThan(originalSize);
  page.on('dialog', dialog => dialog.accept());
  await page.locator('#resetEverything').click();
  await expect.poll(async () => (await saved(page, WORKSPACE)).state.placed.length).toBe(0);
  const fresh = await saved(page, WORKSPACE);
  expect(fresh.schemaVersion).toBe(1);
  expect(fresh.settings.cardSize).toBe(originalSize);
  expect(await saved(page, HISTORY)).toBeNull();
  expect(await saved(page, SPREADS)).toBeNull();
  expect(Number(await page.evaluate(() => localStorage.getItem('tabula_card_size_v2')))).toBe(originalSize);
  await expect(page.locator('#tableLabelMode')).toHaveValue('card');
  expect(fresh.settings.spread).toBe('celtic');
  expect(fresh.settings.shuffleMethod).toBe('overhand');
});

test('saved readings can be reopened and restored after page reload', async ({ page }) => {
  await page.locator('#spreadQuickSelect').selectOption('three');
  await page.locator('#quickDeal').click();
  await expect.poll(async () => (await saved(page, WORKSPACE)).state.placed.length).toBe(3);
  const before = await saved(page, WORKSPACE);

  await page.locator('#quickSnapshotSave').click();
  await page.locator('#snapshotName').fill('自動テストの占例');
  await page.locator('#snapConfirm').click();
  await expect.poll(async () => (await saved(page, HISTORY))?.length ?? 0).toBe(1);
  const stored = (await saved(page, HISTORY))[0];
  expect(stored.name).toBe('自動テストの占例');
  expect(stored.placed).toEqual(before.state.placed);
  expect(stored.deck).toEqual(before.state.deck);

  await page.reload();
  await page.locator('#newSessionStandalone').click();
  expect((await saved(page, WORKSPACE)).state.placed).toHaveLength(0);
  await page.locator('#quickSnapshotList').click();
  await expect(page.locator('#compareA')).toHaveValue(stored.id);
  page.on('dialog', dialog => dialog.accept());
  await page.locator('#restoreA').click();
  await expect.poll(async () => (await saved(page, WORKSPACE)).state.placed.length).toBe(3);
  const after = await saved(page, WORKSPACE);
  expect(after.state.placed).toEqual(before.state.placed);
  expect(after.state.deck).toEqual(before.state.deck);
  await page.reload();
  expect((await saved(page, WORKSPACE)).state.placed).toEqual(before.state.placed);
});
