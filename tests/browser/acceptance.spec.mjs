import { test, expect } from '@playwright/test';

const WORKSPACE='tabula_sortium_v01';
const SPREADS='tabula_sortium_spread_library_v1';
const saved=(page,key)=>page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);

test.beforeEach(async ({page})=>{
  await page.goto('/');
  await page.evaluate(()=>localStorage.clear());
  await page.reload();
  await expect(page.locator('#quickDeal')).toBeVisible();
  // Open the settings required by legacy acceptance cases; fresh-start folding has its own test.
  for (const button of await page.locator('aside .section > h2 .section-toggle').all()) await button.click();
});

test('advanced placement popup groups controls and preserves five basic shortcuts',async ({page})=>{
 await expect(page.locator('.table-shortcuts > button')).toHaveCount(5);
 await page.locator('#placementTools > button[aria-label="配置設定を開く"]').click();
 const popup=page.locator('#placementToolsContent');
 await expect(popup.locator('[data-group="placement"] .placement-tools-heading')).toHaveText('配置');
 await expect(popup.locator('[data-group="behavior"] .placement-tools-heading')).toHaveText('操作');
 await expect(popup.locator('[data-group="placement"] #physicalCardPickButton')).toBeVisible();
 await expect(popup.locator('[data-group="placement"] #addTablePile')).toBeVisible();
 await expect(popup.locator('[data-group="behavior"] #naturalTiltButton')).toBeVisible();
 await page.locator('#spreadQuickSelect').selectOption('free');
 await expect(popup.locator('[data-group="placement"] #freeSnapButton')).toBeVisible();
});
test('zoomed desktop pile card drag is not stolen by background pan',async ({page})=>{
 await page.setViewportSize({width:1280,height:850});
 await page.locator('#spreadQuickSelect').selectOption('free');
 await page.locator('#placementTools > button[aria-label="配置設定を開く"]').click();
 await page.locator('#placementToolsContent #addTablePile').click();
 await page.locator('#zone').click({position:{x:290,y:240}});
 const pile=page.locator('#zone .table-pile').first();
 for(let i=0;i<3;i++){
  const deck=await page.locator('#deck').boundingBox();
  const target=await pile.boundingBox();
  await page.mouse.move(deck.x+deck.width/2,deck.y+deck.height/2);
  await page.mouse.down();
  await page.mouse.move(target.x+target.width/2,target.y+target.height/2,{steps:12});
  await page.mouse.up();
 }
 const grip=await pile.locator('.table-pile-fan-grip').boundingBox();
 await page.mouse.move(grip.x+grip.width/2,grip.y+grip.height/2);
 await page.mouse.down();
 await page.mouse.move(grip.x+grip.width/2+70,grip.y+grip.height/2+28,{steps:10});
 await page.mouse.up();
 await expect(pile.locator('.table-pile-top')).toHaveCount(3);
 await page.locator('#desktopTableViews button[data-distance="2"]').click();
 const card=await pile.locator('.table-pile-top[data-pile-index="1"]').boundingBox();
 await page.mouse.move(card.x+card.width*.17,card.y+card.height*.75);
 await page.mouse.down();
 await page.mouse.move(card.x+card.width*.17+120,card.y+card.height*.75+90,{steps:10});
 await expect(pile).toHaveClass(/pile-drag-active/);
 await page.mouse.up();
 const state=(await saved(page,WORKSPACE)).state;
 expect(state.tablePiles.some(p=>p.cards.length===2)).toBe(true);
});
test('primary shortcuts stay at five while pile creation is in placement popover',async ({page})=>{
 await expect(page.locator('.table-shortcuts button#addTablePile')).toHaveCount(0);
 await expect(page.locator('.table-shortcuts > button')).toHaveCount(5);
 const popup=page.locator('#placementToolsContent');
 const add=popup.locator('#addTablePile');
 await expect(add).toBeHidden();
 await page.locator('#placementTools > button[aria-label="配置設定を開く"]').click();
 await expect(add).toBeVisible();
 await add.click();
 await expect(add).toHaveAttribute('aria-pressed','true');
 await page.locator('#zone').click({position:{x:250,y:230}});
 await expect(page.locator('#zone .table-pile')).toHaveCount(1);
 await expect(add).toHaveAttribute('aria-pressed','false');
});
test('deliberately hovering a dropped card turns exactly two cards into a pile',async ({page})=>{
 await page.locator('#spreadQuickSelect').selectOption('free');
 await expect(page.locator('.table-shortcuts > button')).toHaveCount(5);
 await page.locator('#quickDeal').click();
 await page.locator('#quickDeal').click();
 await page.evaluate(key=>{
  const workspace=JSON.parse(localStorage.getItem(key));
  workspace.state.placed[0].x=30;workspace.state.placed[0].y=45;
  workspace.state.placed[1].x=70;workspace.state.placed[1].y=45;
  localStorage.setItem(key,JSON.stringify(workspace));
 },WORKSPACE);
 await page.reload();
 const cards=page.locator('#zone .card');
 await expect(cards).toHaveCount(2);
 const first=await cards.nth(0).boundingBox();
 const second=await cards.nth(1).boundingBox();
 await page.mouse.move(second.x+second.width/2,second.y+second.height/2);
 await page.mouse.down();
 await page.mouse.move(first.x+first.width/2,first.y+first.height/2,{steps:12});
 await page.waitForTimeout(800);
 await expect(cards.nth(0)).toHaveClass(/stack-hover-target/);
 await page.mouse.up();
 await expect(page.locator('#zone .table-pile')).toHaveCount(1);
 const state=(await saved(page,WORKSPACE)).state;
 expect(state.tablePiles[0].cards).toHaveLength(2);
 expect(state.placed).toHaveLength(0);
});

test('tapping the top card of a pile flips it without removing it',async ({page})=>{
 await page.locator('#spreadQuickSelect').selectOption('free');
 await page.locator('#placementTools > button[aria-label="配置設定を開く"]').click();
 await page.locator('#placementToolsContent #addTablePile').click();
 await page.locator('#zone').click({position:{x:250,y:230}});
 const pile=page.locator('#zone .table-pile').first();
 const deck=await page.locator('#deck').boundingBox();
 const target=await pile.boundingBox();
 await page.mouse.move(deck.x+deck.width/2,deck.y+deck.height/2);
 await page.mouse.down();
 await page.mouse.move(target.x+target.width/2,target.y+target.height/2,{steps:12});
 await page.mouse.up();
 await expect(pile.locator('.table-pile-top')).toHaveCount(1);
 const before=(await saved(page,WORKSPACE)).state;
 const physical=before.tablePiles[0].cards[0].instanceId;
 const initial=before.tablePiles[0].cards[0].faceUp===true;
 await pile.locator('.table-pile-top').click();
 const after=(await saved(page,WORKSPACE)).state;
 expect(after.tablePiles[0].cards[0].instanceId).toBe(physical);
 expect(after.tablePiles[0].cards[0].faceUp).toBe(!initial);
 expect(after.placed).toHaveLength(0);
 await page.reload();
 const restored=(await saved(page,WORKSPACE)).state;
 expect(restored.tablePiles[0].cards[0].faceUp).toBe(!initial);
});
test('pile handle assigns a waste role without adding permanent table controls',async ({page})=>{
 await page.locator('#spreadQuickSelect').selectOption('free');
 await page.locator('#addTablePile').click();
 await page.locator('#zone').click({position:{x:230,y:210}});
 const pile=page.locator('#zone .table-pile').first();
 const role=pile.locator('.table-pile-role-select');
 await expect(role).toBeHidden();
 await pile.locator('.table-pile-handle').click();
 await expect(role).toBeVisible();
 await role.selectOption('waste');
 await expect(pile.locator('.table-pile-handle')).toContainText('タロン');
 const savedRole=(await saved(page,WORKSPACE)).state.tablePiles[0].role;
 expect(savedRole).toBe('waste');
 await page.reload();
 await expect(page.locator('#zone .table-pile .table-pile-handle').first()).toContainText('タロン');
 await expect(page.locator('#zone .table-pile-role-select').first()).toBeHidden();
});

test('pile count selector is hidden until requested',async ({page})=>{
  await page.locator('#spreadQuickSelect').selectOption('free');
  await page.locator('#addTablePile').click();
  await page.locator('#zone').click({position:{x:240,y:220}});
  const pile=page.locator('#zone .table-pile').first();
  // Deposit one dealt card into the empty pile so that count selection exists.
  await page.locator('#quickDeal').click();
  const card=page.locator('#zone .card').first();
  const p=await pile.boundingBox();
  const c=await card.boundingBox();
  await page.mouse.move(c.x+c.width/2,c.y+c.height/2);
  await page.mouse.down();
  await page.mouse.move(p.x+p.width/2,p.y+p.height/2,{steps:12});
  await page.mouse.up();
  await expect(pile.locator('.table-pile-take-count')).toBeHidden();
  await pile.locator('.table-pile-take-toggle').click();
  await expect(pile.locator('.table-pile-take-count')).toBeVisible();
  await pile.locator('.table-pile-take-toggle').click();
  await expect(pile.locator('.table-pile-take-count')).toBeHidden();
});

test('first pile fan gesture renders lower cards immediately and lifted stack is foregrounded',async ({page})=>{
 await page.locator('#spreadQuickSelect').selectOption('free');
 await page.locator('#addTablePile').click();
 await page.locator('#zone').click({position:{x:230,y:210}});
 const pile=page.locator('#zone .table-pile').first();
 for(let i=0;i<3;i++){
  const deck=await page.locator('#deck').boundingBox();
  const target=await pile.boundingBox();
  await page.mouse.move(deck.x+deck.width/2,deck.y+deck.height/2);
  await page.mouse.down();
  await page.mouse.move(target.x+target.width/2,target.y+target.height/2,{steps:12});
  await page.mouse.up();
 }
 const grip=await pile.locator('.table-pile-fan-grip').boundingBox();
 const gx=grip.x+grip.width/2,gy=grip.y+grip.height/2;
 await page.mouse.move(gx,gy);
 await page.mouse.down();
 await page.mouse.move(gx+55,gy+35,{steps:8});
 // The first gesture must reveal all the cards before pointer release.
 await expect(pile.locator('.table-pile-top')).toHaveCount(3);
 const offsets=await pile.locator('.table-pile-top').evaluateAll(nodes=>nodes.map(n=>parseFloat(n.style.left)||0));
 expect(new Set(offsets).size).toBe(3);
 await page.mouse.up();
 const top=await pile.locator('.table-pile-top[data-pile-index="0"]').boundingBox();
 await page.mouse.move(top.x+top.width*.85,top.y+top.height*.85);
 await page.mouse.down();
 await page.mouse.move(top.x+top.width*.85+45,top.y+top.height*.85+40,{steps:8});
 await expect(pile).toHaveClass(/pile-drag-active/);
 const z=await pile.evaluate(node=>getComputedStyle(node).zIndex);
 expect(Number(z)).toBeGreaterThan(1600);
 await page.mouse.up();
});

test('returning an accidentally lifted sequence to its origin does not split the pile',async ({page})=>{
 await page.locator('#spreadQuickSelect').selectOption('free');
 await page.locator('#addTablePile').click();
 await page.locator('#zone').click({position:{x:240,y:240}});
 const pile=page.locator('#zone .table-pile').first();
 for(let i=0;i<3;i++){
  const deck=await page.locator('#deck').boundingBox();
  const target=await pile.boundingBox();
  await page.mouse.move(deck.x+deck.width/2,deck.y+deck.height/2);
  await page.mouse.down();
  await page.mouse.move(target.x+target.width/2,target.y+target.height/2,{steps:12});
  await page.mouse.up();
 }
 const grip=await pile.locator('.table-pile-fan-grip').boundingBox();
 const gx=grip.x+grip.width/2,gy=grip.y+grip.height/2;
 await page.mouse.move(gx,gy);
 await page.mouse.down();
 await page.mouse.move(gx+90,gy+45,{steps:10});
 await page.mouse.up();
 const before=(await saved(page,WORKSPACE)).state.tablePiles.map(p=>p.cards.map(c=>c.instanceId));
 const card=await pile.locator('.table-pile-top[data-pile-index="1"]').boundingBox();
 const x=card.x+card.width*.35,y=card.y+card.height*.55;
 await page.mouse.move(x,y);
 await page.mouse.down();
 await page.mouse.move(x+65,y+25,{steps:6});
 await page.mouse.move(x+3,y+2,{steps:6});
 await page.mouse.up();
 const after=(await saved(page,WORKSPACE)).state.tablePiles.map(p=>p.cards.map(c=>c.instanceId));
 expect(after).toEqual(before);
 await expect(page.locator('#zone .table-pile')).toHaveCount(1);
});

test('pile spreads diagonally and retains its fan after reload',async ({page})=>{
  await page.locator('#spreadQuickSelect').selectOption('free');
  await page.locator('#addTablePile').click();
  await page.locator('#zone').click({position:{x:250,y:240}});
  const pile=page.locator('#zone .table-pile').first();
  for(let i=0;i<3;i++){
    const deck=await page.locator('#deck').boundingBox();
    const target=await pile.boundingBox();
    await page.mouse.move(deck.x+deck.width/2,deck.y+deck.height/2);
    await page.mouse.down();
    await page.mouse.move(target.x+target.width/2,target.y+target.height/2,{steps:12});
    await page.mouse.up();
  }
  await expect(pile.locator('.table-pile-top')).toHaveCount(1);
  const grip=await pile.locator('.table-pile-fan-grip').boundingBox();
  await page.mouse.move(grip.x+grip.width/2,grip.y+grip.height/2);
  await page.mouse.down();
  await page.mouse.move(grip.x+grip.width/2+80,grip.y+grip.height/2-65,{steps:10});
  await page.mouse.up();
  await expect(pile.locator('.table-pile-top')).toHaveCount(3);
  const fan=(await saved(page,WORKSPACE)).state.tablePiles[0].fan;
  expect(fan.dx).toBeGreaterThan(0);
  expect(fan.dy).toBeLessThan(0);
  await page.reload();
  await expect(page.locator('#zone .table-pile .table-pile-top')).toHaveCount(3);
  const persisted=(await saved(page,WORKSPACE)).state.tablePiles[0].fan;
  expect(persisted).toEqual(fan);
});

test('pile handle click does not jump and drag retains the grabbed offset',async ({page})=>{
  await page.locator('#spreadQuickSelect').selectOption('free');
  await page.locator('#addTablePile').click();
  await page.locator('#zone').click({position:{x:240,y:220}});
  const pile=page.locator('#zone .table-pile').first();
  await expect(pile).toBeVisible();
  const before=(await saved(page,WORKSPACE)).state.tablePiles[0];
  const handle=pile.locator('.table-pile-handle');
  await handle.click();
  const initial=await pile.boundingBox();
  const afterClick=(await saved(page,WORKSPACE)).state.tablePiles[0];
  expect(afterClick.x).toBeCloseTo(before.x,5);
  expect(afterClick.y).toBeCloseTo(before.y,5);
  const handleRect=await handle.boundingBox();
  const grabX=handleRect.x+handleRect.width*.25;
  const grabY=handleRect.y+handleRect.height/2;
  await page.mouse.move(grabX,grabY);
  await page.mouse.down();
  await page.mouse.move(grabX+65,grabY+35,{steps:8});
  await page.mouse.up();
  const moved=await pile.boundingBox();
  expect(moved.x-initial.x).toBeCloseTo(65,0);
  expect(moved.y-initial.y).toBeCloseTo(35,0);
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

test('physical cut restacks every card exactly once while preserving identity',async ({page})=>{
  const before=await saved(page,WORKSPACE);
  await page.locator('#quickCut').click();
  const piles=page.locator('#physicalCutOverlay button[aria-label^="束"]');
  await expect(piles).toHaveCount(3);
  for(let i=2;i>=0;i--)await piles.nth(i).click();
  await expect(page.locator('#physicalCutOverlay')).toHaveCount(0,{timeout:12000});
  const after=await saved(page,WORKSPACE);
  expect(after.state.deck.map(c=>c.instanceId).sort()).toEqual(before.state.deck.map(c=>c.instanceId).sort());
  expect(new Set(after.state.deck.map(c=>c.instanceId)).size).toBe(78);
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

test('new custom spread is created from a free table and is selectable after reload',async ({page})=>{
  await page.locator('#spreadQuickSelect').selectOption('free');
  await page.locator('#quickDeal').click();
  await page.locator('#quickDeal').click();
  await expect.poll(async()=>(await saved(page,WORKSPACE)).state.placed.length).toBe(2);
  await page.locator('#spreadNotebook').click();
  await page.locator('#archiveCapture').click();
  await expect(page.locator('#spreadWorkbench')).toBeVisible();
  await page.locator('#spreadWorkbenchFields input').first().fill('実操作のスプレッド');
  // Physically separate the initially overlapping free cards before numbering them.
  const top=await page.locator('#zone .card').nth(1).boundingBox();
  await page.mouse.move(top.x+top.width/2,top.y+top.height/2);
  await page.mouse.down();
  await page.mouse.move(top.x+top.width/2+180,top.y+top.height/2+35,{steps:8});
  await page.mouse.up();
  await page.locator('#zone .card').first().click();
  await page.locator('#zone .card').nth(1).click();
  await expect(page.locator('#spreadWorkbenchHint')).toContainText('番号付け完了');
  await page.locator('#spreadSave').click();
  await expect.poll(async()=> (await saved(page,SPREADS))?.length ?? 0).toBe(1);
  const created=(await saved(page,SPREADS))[0];
  expect(created.name).toBe('実操作のスプレッド');
  expect(created.slots).toHaveLength(2);
  expect(created.cardSize).toBeGreaterThanOrEqual(.8);
  await page.reload();
  await page.locator('#spreadQuickSelect').selectOption(created.id);
  expect((await saved(page,WORKSPACE)).settings.spread).toBe(created.id);
});

test('standalone JSON reading import adds history without replacing the current table',async ({page})=>{
  await page.locator('#spreadQuickSelect').selectOption('three');
  await page.locator('#quickDeal').click();
  await expect.poll(async()=>(await saved(page,WORKSPACE)).state.placed.length).toBe(3);
  const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#exportCurrent').click()]);
  const stream=await download.createReadStream();
  let raw='';
  for await(const chunk of stream)raw+=chunk.toString();
  const exported=JSON.parse(raw);
  expect(exported.kind).toBe('reading');
  const original=exported.reading;
  await page.locator('#newSessionStandalone').click();
  const current=await saved(page,WORKSPACE);
  expect(current.state.placed).toHaveLength(0);
  page.on('dialog',dialog=>dialog.accept());
  await page.locator('#externalFile').setInputFiles({
    name:'reading.json',mimeType:'application/json',buffer:Buffer.from(raw,'utf8')
  });
  await expect.poll(async()=> (await saved(page,'tabula_sortium_history_v034'))?.length ?? 0).toBe(1);
  const stored=(await saved(page,'tabula_sortium_history_v034'))[0];
  expect(stored.placed).toEqual(original.placed);
  expect((await saved(page,WORKSPACE)).state.placed).toEqual(current.state.placed);
});

test('About opens from settings, credits and legal details navigate correctly',async ({page})=>{
  await expect(page.locator('.version')).toContainText('THE VIRTUAL DIVINATION TABLE');
  await page.locator('#openAbout').click();
  const about=page.locator('.about-panel');
  await expect(about).toBeVisible();
  await expect(about.locator('h2')).toHaveText('TABULA SORTIUM');
  await expect(about.locator('.about-subtitle')).toHaveText('THE VIRTUAL DIVINATION TABLE');
  await expect(about.locator('.about-credits')).toContainText('Created by Majyutsudo');
  await expect(about.locator('.about-meta').first()).toHaveText('Version '+(await page.title()).match(/TABULA SORTIUM v([0-9.]+)/)[1]);
  await expect(about.locator('.about-icon')).toHaveJSProperty('complete',true);
  await page.locator('#aboutLegal').click();
  await expect(page.locator('.about-legal')).toContainText('License & Disclaimer');
  await page.locator('#aboutBack').click();
  await expect(about).toBeVisible();
  await page.locator('#modalClose').click();
  await expect(page.locator('#modalBg')).not.toHaveClass(/open/);
});

test('all cards open at once without changing identities or reversals', async ({page})=>{
  await page.locator('#quickDeal').click();
  await expect.poll(async()=> (await saved(page,WORKSPACE)).state.placed.length).toBe(10);
  const original=await saved(page,WORKSPACE);
  await page.locator('#quickFaceDown').click();
  await expect.poll(async()=> (await saved(page,WORKSPACE)).state.placed.every(p=>!p.faceUp)).toBe(true);
  await page.locator('#quickRevealAll').click();
  const opened=await saved(page,WORKSPACE);
  expect(opened.state.placed).toHaveLength(10);
  expect(opened.state.placed.every(p=>p.faceUp)).toBe(true);
  expect(opened.state.placed.map(p=>[p.id,p.reversed])).toEqual(original.state.placed.map(p=>[p.id,p.reversed]));
  await expect(page.locator('#status')).toContainText('10枚を一度に開きました。');
});

test('spread-edit preview never persists duplicate virtual cards to a real reading',async ({page})=>{
 const spread={
  id:'custom_preview_safe',name:'プレビュー保存検証',cardSize:1.45,
  slots:[{x:27,y:40,angle:0,name:'左'},{x:55,y:40,angle:0,name:'中央'},{x:77,y:60,angle:0,name:'右'}]
 };
 await page.goto('/');
 await page.evaluate(({key,fixture})=>localStorage.setItem(key,JSON.stringify([fixture])),{key:SPREADS,fixture:spread});
 await page.reload();
 const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('tabula_sortium_v01')).state);
 await page.locator('#spreadNotebook').click();
 await page.locator('#archiveItems').getByRole('button',{name:'編集'}).click();
 await expect(page.locator('#spreadWorkbench')).toBeVisible();
 // Editing preview displays stand-in cards, but the serialized physical session stays intact.
 const during=await page.evaluate(()=>JSON.parse(localStorage.getItem('tabula_sortium_v01')).state);
 expect(during.deck).toEqual(before.deck);
 expect(during.placed).toEqual(before.placed);
 await page.reload();
 const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('tabula_sortium_v01')).state);
 expect(after.deck).toEqual(before.deck);
 expect(after.placed).toEqual(before.placed);
 expect(new Set([...after.deck,...after.placed,...after.removed].map(c=>c.id)).size).toBe(78);
});

test('current spread opens reference page without changing the current reading',async({page})=>{
 const before=await saved(page,WORKSPACE);
 await page.locator('#spreadInfoButton').click();
 await expect(page.locator('.spread-guide h2')).toContainText('ケルト十字');
 await expect(page.locator('#spreadGuideDiagram .spread-diagram-slot')).toHaveCount(10);
 await expect(page.locator('.spread-guide-position')).toHaveCount(10);
 await page.locator('.spread-diagram-slot[data-spread-slot="8"]').click();
 await expect(page.locator('#spreadGuidePositionDetail')).toContainText('希望と恐れ');
 await expect(page.locator('#spreadGuideAtlas')).toBeVisible();
 expect((await saved(page,WORKSPACE)).state).toEqual(before.state);
 await page.locator('#spreadGuideAtlas').click();
 await expect.poll(async () => page.locator('.spread-atlas-item').count()).toBeGreaterThanOrEqual(4);
 await page.locator('#spreadAtlasSearch').fill('スリーカード');
 await expect(page.locator('.spread-atlas-item')).toHaveCount(1);
 await page.locator('.spread-atlas-item').click();
 await expect(page.locator('.spread-guide h2')).toContainText('スリーカード');
 expect((await saved(page,WORKSPACE)).settings.spread).toBe('celtic');
 await page.locator('#spreadGuideUse').click();
 await expect(page.locator('#spread')).toHaveValue('three');
 await expect(page.locator('#spreadQuickSelect')).toHaveValue('three');
});
test('custom spread author/source/explanation are saved, searchable and rendered with diagram',async({page})=>{
 const original={id:'custom_atlas_fixture',name:'七星の配置',slots:[
  {x:23,y:30,angle:0,name:'星の入口',detail:'最初の兆し'},
  {x:50,y:50,angle:90,name:'交点',detail:'中心となる影響'},
  {x:78,y:70,angle:0,name:'出口',detail:''}
 ],cardSize:1.2};
 await page.evaluate(({key,value})=>localStorage.setItem(key,JSON.stringify([value])),{key:SPREADS,value:original});
 await page.reload();
 await page.locator('#spreadAtlasMenu').click();
 await page.locator('#spreadAtlasSearch').fill('七星');
 await expect(page.locator('.spread-atlas-item')).toHaveCount(1);
 await page.locator('.spread-atlas-item').click();
 await expect(page.locator('.spread-guide h2')).toHaveText('七星の配置');
 await expect(page.locator('.spread-guide-prose')).toHaveCount(0);
 await expect(page.locator('#spreadGuideDiagram .spread-diagram-slot')).toHaveCount(3);
 await page.locator('#spreadGuideEdit').click();
 await page.locator('[data-spread-guide-field="author"]').fill('試作者');
 await page.locator('[data-spread-guide-field="source"]').fill('個人の手稿');
 await page.locator('[data-spread-guide-field="overview"]').fill('星々を結ぶ三枚の展開。');
 await page.locator('[data-spread-guide-field="method"]').fill('左から順に読む。');
 await page.locator('#spreadGuideEditSave').click();
 await expect(page.locator('.spread-guide-prose').first()).toContainText('星々を結ぶ三枚の展開。');
 expect((await saved(page,SPREADS))[0]).toMatchObject({author:'試作者',source:'個人の手稿',overview:'星々を結ぶ三枚の展開。',method:'左から順に読む。'});
 await page.reload();
 await page.locator('#spreadAtlasMenu').click();
 await page.locator('#spreadAtlasSearch').fill('手稿');
 await expect(page.locator('.spread-atlas-item')).toHaveCount(1);
 await page.locator('.spread-atlas-item').click();
 await expect(page.locator('.spread-guide')).toContainText('個人の手稿');
 await page.locator('.spread-guide-position[data-spread-position="1"]').click();
 await expect(page.locator('#spreadGuidePositionDetail')).toContainText('中心となる影響');
});
test('reference lookup does not alter active dealt cards and using a new spread asks first',async({page})=>{
 await page.locator('#quickDeal').click();
 await expect.poll(async()=>(await saved(page,WORKSPACE)).state.placed.length).toBe(10);
 const before=await saved(page,WORKSPACE);
 await page.locator('#spreadInfoButton').click();
 await page.locator('#spreadGuideAtlas').click();
 await page.locator('.spread-atlas-item').filter({hasText:'スリーカード'}).click();
 const cancel=page.waitForEvent('dialog').then(d=>d.dismiss());
 await page.locator('#spreadGuideUse').click();await cancel;
 expect((await saved(page,WORKSPACE)).state).toEqual(before.state);
 await expect(page.locator('.spread-guide h2')).toContainText('スリーカード');
 const accept=page.waitForEvent('dialog').then(d=>d.accept());
 await page.locator('#spreadGuideUse').click();await accept;
 await expect(page.locator('#spread')).toHaveValue('three');
});

test('free spread encyclopedia tile uses a bounded graphic without overlapping prose',async({page})=>{
 await page.locator('#spreadAtlasMenu').click();
 const free=page.locator('.spread-atlas-item').filter({hasText:'フリースプレッド'});
 await expect(free).toBeVisible();
 await expect(free.locator('.spread-diagram-unassigned')).toHaveCount(1);
 await expect(free.locator('.spread-diagram-empty')).toHaveCount(0);
 const geometry=await free.evaluate(el=>{
  const thumb=el.querySelector('.spread-atlas-thumb').getBoundingClientRect();
  const label=el.querySelector('.spread-atlas-item-text').getBoundingClientRect();
  return {thumbRight:thumb.right,labelLeft:label.left,thumbWidth:thumb.width}
 });
 expect(geometry.thumbRight).toBeLessThanOrEqual(geometry.labelLeft+1);
 expect(geometry.thumbWidth).toBeLessThanOrEqual(110);
 await free.click();
 await expect(page.locator('.spread-guide h2')).toHaveText('フリースプレッド');
 await expect(page.locator('#spreadGuideDiagram .spread-diagram-unassigned')).toHaveCount(1);
});
