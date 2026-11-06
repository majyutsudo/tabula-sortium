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
  // Open the settings required by legacy acceptance cases; fresh-start folding has its own test.
  for (const button of await page.locator('aside .section > h2 .section-toggle').all()) await button.click();
});

test('fresh default configuration uses Celtic cross, overhand and card labels', async ({ page }) => {
  const workspace = await saved(page, WORKSPACE);
  expect(workspace.settings.spread).toBe('celtic');
  expect(workspace.settings.shuffleMethod).toBe('overhand');
  expect(workspace.settings.cardSize).toBe(1.0); // Celtic-cross desktop preset
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
  await page.locator('.label-cycle-settings summary').click();
  await page.locator('.label-cycle-options input[value="number"]').check();
  await page.locator('#toolbarLabelToggle').click();
  await page.locator('#toolbarLabelToggle').click();
  await expect(page.locator('#toolbarLabelToggle')).toHaveText('番号のみ');
  await page.locator('#quickDeal').click();
  await expect.poll(async () => (await saved(page, WORKSPACE)).state.placed.length).toBe(10);
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
  await page.locator('.label-cycle-settings summary').click();
  await page.locator('.label-cycle-options input[value="number"]').check();
  await page.locator('#toolbarLabelToggle').click();
  await page.locator('#toolbarLabelToggle').click();
  await expect(page.locator('#toolbarLabelToggle')).toHaveText('番号のみ');
  await page.locator('#quickDeal').click();
  await expect.poll(async () => (await saved(page, WORKSPACE)).state.placed.length).toBe(10);
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
  expect(fresh.settings.cardSize).toBe(1.0);
  // The Celtic cross uses a tighter preset; slots 7–10 must not overlap after reset.
  const rightColumn = await page.locator('#zone .slot').evaluateAll(nodes => nodes.slice(6, 10).map(node => {
    const r = node.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom };
  }).sort((a, b) => a.top - b.top));
  expect(rightColumn).toHaveLength(4);
  for (let i = 1; i < rightColumn.length; i++)
    expect(rightColumn[i - 1].bottom).toBeLessThanOrEqual(rightColumn[i].top + 1);

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

test('custom Marseille-style deck saves French names, swaps VIII/XI, and restores full-area plain pips', async ({ page }) => {
 await page.locator('#deckEditNew').click();
 await expect(page.locator('#deckEditorName')).toBeVisible();
 await page.locator('#deckEditorName').fill('Tarot de Marseille — étude');
 await page.locator('#deckEditorLanguage').selectOption('fr');
 await page.locator('#deckEditorSwap').click();
 await page.locator('#deckEditorPip').selectOption('none');
 await page.locator('#deckEditorBack').selectOption('navy');
 await expect(page.locator('.deck-major-number[data-major="major_08"]')).toHaveValue('11');
 await expect(page.locator('.deck-major-number[data-major="major_11"]')).toHaveValue('8');
 await expect(page.locator('.deck-editor-card-name[data-name="major_11"]')).toHaveValue('La Justice');
 await page.locator('#deckEditorSave').click();
 const decks=await saved(page,'tabula_sortium_deck_library_v1');
 expect(decks).toHaveLength(1);
 expect(decks[0].name).toBe('Tarot de Marseille — étude');
 expect(decks[0].majorNumbers.major_08).toBe(11);
 expect(decks[0].majorNumbers.major_11).toBe(8);
 expect(decks[0].language).toBe('fr');
 expect(decks[0].names.major_08).toBeUndefined();
 expect(decks[0].names.major_11).toBeUndefined();
 expect(decks[0].pipBackground).toBe('none');
 expect(decks[0].backColor).toBe('navy');
 expect((await saved(page,WORKSPACE)).settings.deckId).toBe(decks[0].id);
 await expect(page.locator('#deckLibrarySelect')).toHaveValue(decks[0].id);
 await page.locator('#cardGalleryOpen').click();
 await page.locator('#cardGalleryFilter').selectOption('major');
 await expect(page.locator('#cardGalleryGrid .gallery-tile').nth(8)).toContainText('La Force');
 await expect(page.locator('#cardGalleryGrid .gallery-tile').nth(11)).toContainText('La Justice');
 await page.locator('#cardGalleryFilter').selectOption('pip');
 await expect(page.locator('#cardGalleryGrid .gallery-tile').first().locator('.ace-background')).toHaveCount(0);
 await expect(page.locator('#cardGalleryGrid .gallery-tile').nth(1).locator('.pip-landscape')).toHaveCount(0);
 await page.locator('#cardGalleryClose').click();
 await page.reload();
 expect((await saved(page,'tabula_sortium_deck_library_v1'))[0].pipBackground).toBe('none');
 await expect(page.locator('#deckLibrarySelect')).toHaveValue(decks[0].id);
 await expect(page.locator('#cardBackColor')).toHaveValue('navy');
 await page.locator('#deckLibrarySelect').selectOption('builtin');
 await page.locator('#cardGalleryOpen').click();
 await page.locator('#cardGalleryFilter').selectOption('pip');
 await expect(page.locator('#cardGalleryGrid .gallery-tile').nth(1).locator('.pip-landscape')).toHaveCount(1);
});

test('deck definitions validate unique major numbers and one or more included cards', async ({ page }) => {
 const result=await page.evaluate(()=>{
  const store=TabulaDeckStore,all=TabulaCatalog.cards;
  const deck=store.fresh(all,'deck_test','Test');
  const before=store.validate(deck,all);
  store.swapNumber(deck,all,'major_08',11);
  const switched=store.validate(deck,all)&&deck.majorNumbers.major_08===11&&deck.majorNumbers.major_11===8;
  deck.majorNumbers.major_11=11;
  const duplicate=store.validate(deck,all);
  deck.majorNumbers.major_11=8;deck.included=[];
  const empty=store.validate(deck,all);
  return {before,switched,duplicate,empty}
 });
 expect(result).toEqual({before:true,switched:true,duplicate:false,empty:false});
});

test('numberless Fool, major numbering and independent language preset persist',async ({page})=>{
 await page.locator('#deckEditNew').click();
 await page.locator('#deckEditorName').fill('Le Mat sans numéro');
 await page.locator('#deckEditorLanguage').selectOption('fr');
 await page.locator('.deck-major-number[data-major="major_00"]').selectOption('none');
 await page.locator('#deckEditorPip').selectOption('none');
 await page.locator('#deckEditorSave').click();
 const deck=(await saved(page,'tabula_sortium_deck_library_v1'))[0];
 expect(deck.majorNumbers.major_00).toBeNull();
 expect(deck.language).toBe('fr');
 await page.locator('#cardGalleryOpen').click();
 await page.locator('#cardGalleryFilter').selectOption('major');
 await page.locator('#cardGalleryGrid .gallery-tile').first().click();
 await expect(page.locator('#cardGalleryLabel')).toContainText('Le Mat');
 const code=await page.locator('#cardGalleryLarge').evaluate(el=>el.outerHTML);
 expect(code).not.toMatch(/>0<\/text>/);
 await page.locator('#cardGalleryBack').click();
 await page.locator('#cardGalleryClose').click();
 await page.reload();
 expect((await saved(page,'tabula_sortium_deck_library_v1'))[0].majorNumbers.major_00).toBeNull();
 await expect(page.locator('#cardLanguage')).toHaveValue('fr');
 await expect(page.locator('#pipBackground')).toHaveValue('none');
});

test('built-in deck language and traditional pip option can change without cloning', async ({page})=>{
 await page.locator('#cardLanguage').selectOption('de');
 await page.locator('#pipBackground').selectOption('none');
 await expect(page.locator('#cardLanguage')).toHaveValue('de');
 await page.locator('#cardGalleryOpen').click();
 await page.locator('#cardGalleryFilter').selectOption('major');
 await expect(page.locator('#cardGalleryGrid .gallery-tile').first()).toContainText('Der Narr');
 await page.locator('#cardGalleryFilter').selectOption('pip');
 await expect(page.locator('#cardGalleryGrid .gallery-tile').nth(1).locator('.pip-landscape')).toHaveCount(0);
 await page.locator('#cardGalleryClose').click();
 await page.reload();
 await expect(page.locator('#cardLanguage')).toHaveValue('de');
 await expect(page.locator('#pipBackground')).toHaveValue('none');
 await page.locator('#pipBackground').selectOption('landscape');
 await page.locator('#cardGalleryOpen').click();
 await page.locator('#cardGalleryFilter').selectOption('pip');
 await expect(page.locator('#cardGalleryGrid .gallery-tile').nth(1).locator('.pip-landscape')).toHaveCount(1);
});

test('fresh and dealt cards are unique by physical ID',async ({page})=>{
 const getIds=async()=>{const w=await saved(page,WORKSPACE);return [...w.state.deck,...w.state.placed,...(w.state.removed||[])].map(c=>c.id)};
 for(let k=0;k<4;k++){
  let ids=await getIds();
  expect(ids).toHaveLength(78);
  expect(new Set(ids).size).toBe(78);
  await page.locator('#quickDeal').click();
  await expect.poll(async()=> (await saved(page,WORKSPACE)).state.placed.length).toBe(10);
  ids=await getIds();expect(new Set(ids).size).toBe(78);
  await page.locator('#quickCollect').click({force:true});
  await page.reload();
  await page.locator('#newSessionStandalone').click();
 }
});
