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

test('free tabletop frames compact ordered stacks then refill vacancies from stock',async ({page})=>{
 await page.locator('#spreadQuickSelect').selectOption('free');
 await page.evaluate(key=>{
  const data=JSON.parse(localStorage.getItem(key));
  const a=data.state.deck.shift(),b=data.state.deck.shift(),c=data.state.deck.shift();
  data.state.placed=[];
  data.state.tablePiles=[
   {id:'pile-1',x:15,y:40,role:'tableau',cards:[]},
   {id:'pile-2',x:45,y:40,role:'tableau',cards:[a,b]},
   {id:'pile-3',x:75,y:40,role:'tableau',cards:[c]}
  ];
  localStorage.setItem(key,JSON.stringify(data));
 },WORKSPACE);
 await page.reload();
 await page.locator('#placementTools > button[aria-label="配置設定を開く"]').click();
 await expect(page.locator('#placementToolsContent #arrangementCompact')).toBeVisible();
 await page.locator('#arrangementCompact').click();
 let state=(await saved(page,WORKSPACE)).state;
 expect(state.tablePiles.map(p=>p.cards.length)).toEqual([2,1,0]);
 const initialIds=state.tablePiles[0].cards.map(c=>c.instanceId);
 await page.locator('#arrangementRefill').click();
 state=(await saved(page,WORKSPACE)).state;
 expect(state.tablePiles.map(p=>p.cards.length)).toEqual([2,1,1]);
 expect(state.tablePiles[0].cards.map(c=>c.instanceId)).toEqual(initialIds);
 await page.reload();
 state=(await saved(page,WORKSPACE)).state;
 expect(state.tablePiles.map(p=>p.cards.length)).toEqual([2,1,1]);
 await expect(page.locator('.table-shortcuts > button')).toHaveCount(5);
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
test('an emptied registered pile can be refilled in place without losing its identity',async ({page})=>{
 await page.locator('#spreadQuickSelect').selectOption('three');
 await page.locator('#quickDeal').click();
 await expect.poll(async ()=>((await saved(page,WORKSPACE)).state.placed.length)).toBe(3);
 await page.evaluate(key=>{
  const data=JSON.parse(localStorage.getItem(key));
  const previous=data.state.placed.find(card=>card.slot===1);
  data.state.placed=data.state.placed.filter(card=>card.slot!==1);
  data.state.deck.unshift(previous);
  data.state.tablePiles.push({id:'pile-1',slot:1,x:50,y:48,role:'tableau',fan:{dx:.23,dy:-.18},cards:[]});
  localStorage.setItem(key,JSON.stringify(data));
 },WORKSPACE);
 await page.reload();
 const empty=page.locator('#zone .table-pile-empty.refill-ready');
 await expect(empty).toBeVisible();
 await expect(page.locator('#zone .slot')).toHaveCount(0);
 const before=(await saved(page,WORKSPACE)).state;
 await empty.click();
 const after=(await saved(page,WORKSPACE)).state;
 expect(after.tablePiles).toHaveLength(1);
 expect(after.tablePiles[0].id).toBe('pile-1');
 expect(after.tablePiles[0].slot).toBe(1);
 expect(after.tablePiles[0].cards).toHaveLength(1);
 expect(after.tablePiles[0].fan).toEqual({dx:.23,dy:-.18});
 expect(after.placed).toHaveLength(2);
 expect(after.deck.length).toBe(before.deck.length-1);
 await page.reload();
 expect((await saved(page,WORKSPACE)).state.tablePiles[0].cards).toHaveLength(1);
});
test('stacking cards at a registered position keeps that slot assigned',async ({page})=>{
 await page.locator('#spreadQuickSelect').selectOption('three');
 await page.locator('#quickDeal').click();
 await expect.poll(async ()=>((await saved(page,WORKSPACE)).state.placed.length)).toBe(3);
 const cards=page.locator('#zone .card');
 const source=await cards.nth(0).boundingBox();
 const target=await cards.nth(1).boundingBox();
 await page.mouse.move(source.x+source.width/2,source.y+source.height/2);
 await page.mouse.down();
 await page.mouse.move(target.x+target.width/2,target.y+target.height/2,{steps:12});
 await page.waitForTimeout(800);
 await page.mouse.up();
 const state=(await saved(page,WORKSPACE)).state;
 expect(state.tablePiles).toHaveLength(1);
 expect(state.tablePiles[0].slot).toBe(1);
 expect(state.tablePiles[0].cards).toHaveLength(2);
 expect(state.placed).toHaveLength(1);
 // The new pile owns position 2, so the vacant-slot marker must not reappear.
 await expect(page.locator('#zone .slot')).toHaveCount(1);
 await page.reload();
 expect((await saved(page,WORKSPACE)).state.tablePiles[0].slot).toBe(1);
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

test('Open reveals only the top card in each pile, including expanded piles',async ({page})=>{
 await page.locator('#spreadQuickSelect').selectOption('free');
 await page.locator('#placementTools > button[aria-label="配置設定を開く"]').click();
 await page.locator('#placementToolsContent #addTablePile').click();
 await page.locator('#zone').click({position:{x:270,y:230}});
 const pile=page.locator('#zone .table-pile').first();
 for(let i=0;i<3;i++){
  const deck=await page.locator('#deck').boundingBox();
  const target=await pile.boundingBox();
  await page.mouse.move(deck.x+deck.width/2,deck.y+deck.height/2);
  await page.mouse.down();
  await page.mouse.move(target.x+target.width/2,target.y+target.height/2,{steps:12});
  await page.mouse.up();
 }
 await page.evaluate(key=>{
  const saved=JSON.parse(localStorage.getItem(key));
  saved.state.tablePiles[0].fan={dx:.25,dy:.15};
  saved.state.tablePiles[0].cards.forEach(c=>c.faceUp=false);
  localStorage.setItem(key,JSON.stringify(saved));
 },WORKSPACE);
 await page.reload();
 await expect(pile.locator('.table-pile-top')).toHaveCount(3);
 await page.locator('#quickOpen').click();
 await expect.poll(async ()=>((await saved(page,WORKSPACE)).state.tablePiles[0].cards[0].faceUp)).toBe(true);
 const cards=(await saved(page,WORKSPACE)).state.tablePiles[0].cards;
 expect(cards.map(c=>c.faceUp)).toEqual([true,false,false]);
 await expect(pile.locator('.table-pile-top.is-face-up')).toHaveCount(1);
});
test('dragging stock onto a single card makes a two-card pile rather than a loose draw',async ({page})=>{
 await page.locator('#spreadQuickSelect').selectOption('free');
 await page.locator('#quickDeal').click();
 await expect.poll(async ()=>((await saved(page,WORKSPACE)).state.placed.length)).toBe(1);
 const before=(await saved(page,WORKSPACE)).state;
 const target=await page.locator('#zone .card').first().boundingBox();
 const stock=await page.locator('#deck').boundingBox();
 await page.mouse.move(stock.x+stock.width/2,stock.y+stock.height/2);
 await page.mouse.down();
 await page.mouse.move(target.x+target.width/2,target.y+target.height/2,{steps:14});
 await page.mouse.up();
 const after=(await saved(page,WORKSPACE)).state;
 expect(after.placed).toHaveLength(0);
 expect(after.tablePiles).toHaveLength(1);
 expect(after.tablePiles[0].cards).toHaveLength(2);
 expect(after.tablePiles[0].cards[1].instanceId).toBe(before.placed[0].instanceId);
 expect(after.tablePiles[0].cards[0].instanceId).toBe(before.deck[0].instanceId);
 expect(after.deck.length).toBe(before.deck.length-1);
 await page.reload();
 expect((await saved(page,WORKSPACE)).state.tablePiles[0].cards).toHaveLength(2);
});
test('dragging a pile top onto a single card creates a new pile after dwell',async ({page})=>{
 await page.locator('#spreadQuickSelect').selectOption('free');
 await page.evaluate(key=>{
  const workspace=JSON.parse(localStorage.getItem(key));
  const top=workspace.state.deck.shift(),bottom=workspace.state.deck.shift();
  workspace.state.placed=[{...bottom,slot:null,x:70,y:45,angle:0,faceUp:true}];
  workspace.state.tablePiles=[{id:'pile-1',x:20,y:45,role:'tableau',
    cards:[{...top,slot:null,faceUp:false}]}];
  localStorage.setItem(key,JSON.stringify(workspace));
 },WORKSPACE);
 await page.reload();
 const pile=page.locator('#zone .table-pile').first();
 const source=await pile.locator('.table-pile-top').boundingBox();
 const target=await page.locator('#zone .card').first().boundingBox();
 const before=(await saved(page,WORKSPACE)).state;
 const sourceId=before.tablePiles[0].cards[0].instanceId;
 const targetId=before.placed[0].instanceId;
 await page.mouse.move(source.x+source.width/2,source.y+source.height/2);
 await page.mouse.down();
 await page.mouse.move(target.x+target.width/2,target.y+target.height/2,{steps:14});
 await page.waitForTimeout(800);
 await expect(page.locator('#zone .card').first()).toHaveClass(/stack-hover-target/);
 await page.mouse.up();
 const after=(await saved(page,WORKSPACE)).state;
 expect(after.tablePiles).toHaveLength(2);
 expect(after.tablePiles[0].id).toBe('pile-1');
 expect(after.tablePiles[0].cards).toHaveLength(0);
 expect(after.tablePiles[1].cards.map(c=>c.instanceId)).toEqual([sourceId,targetId]);
 expect(after.placed).toHaveLength(0);
 await page.reload();
 expect((await saved(page,WORKSPACE)).state.tablePiles[1].cards).toHaveLength(2);
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

test('pile-only reading saves and restores its physical cards after reload',async({page})=>{
 await page.locator('#spreadQuickSelect').selectOption('free');
 await page.evaluate(key=>{
  const w=JSON.parse(localStorage.getItem(key));
  const first=w.state.deck.shift(),second=w.state.deck.shift();
  w.state.placed=[];
  w.state.tablePiles=[{id:'pile-1',x:50,y:45,role:'tableau',
   fan:{dx:0,dy:0},cards:[first,second]}];
  localStorage.setItem(key,JSON.stringify(w));
 },WORKSPACE);
 await page.reload();
 await expect(page.locator('#zone .table-pile')).toHaveCount(1);
 await page.locator('#snapshotSave').evaluate(button=>button.click());
 await expect(page.locator('#snapConfirm')).toBeVisible();
 await page.locator('#snapshotName').fill('束だけの占例');
 await page.locator('#snapConfirm').click();
 const history=await saved(page,'tabula_sortium_history_v034');
 expect(history[0].tablePiles[0].cards).toHaveLength(2);
 const identities=history[0].tablePiles[0].cards.map(c=>c.instanceId);
 await page.reload();
 await page.locator('#snapshotList').evaluate(button=>button.click());
 await expect(page.locator('#snapViewA .snapshot-card')).toHaveCount(1);
 await expect(page.locator('#snapViewA .snapshot-row')).toHaveCount(2);
 page.once('dialog',dialog=>dialog.accept());
 await page.locator('#restoreA').click();
 const restored=(await saved(page,WORKSPACE)).state;
 expect(restored.tablePiles[0].cards.map(c=>c.instanceId)).toEqual(identities);
 expect(restored.placed).toHaveLength(0);
 expect(restored.deck).toHaveLength(76);
});
test('desktop status moves below controls only when toolbar width is constrained',async({page})=>{
 await page.setViewportSize({width:1920,height:900});
 await expect(page.locator('.toolbar')).not.toHaveClass(/status-on-second-row/);
 await page.setViewportSize({width:1100,height:850});
 await expect(page.locator('.toolbar')).toHaveClass(/status-on-second-row/);
 const status=await page.locator('#status').boundingBox();
 const controls=await page.locator('#newSessionStandalone').boundingBox();
 expect(status).toBeTruthy();
 expect(controls).toBeTruthy();
 expect(status.y).toBeGreaterThan(controls.y);
 await page.setViewportSize({width:1920,height:900});
 await expect(page.locator('.toolbar')).not.toHaveClass(/status-on-second-row/);
});

test('rotation mode drags the physical card without relocating or flipping it',async({page})=>{
 await page.setViewportSize({width:1440,height:900});
 await page.locator('#spreadQuickSelect').selectOption('free');
 await page.locator('#quickDeal').click();
 await expect(page.locator('#zone .card')).toHaveCount(1);
 const node=page.locator('#zone .card').first();
 const box=await node.boundingBox();
 await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
 await expect(page.locator('#rotateDragMode')).toBeVisible();
 await page.locator('#rotateDragMode').click();
 const start=(await saved(page,WORKSPACE)).state.placed[0];
 const rect=await node.boundingBox();
 await page.mouse.move(rect.x+rect.width*.85,rect.y+rect.height*.35);
 await page.mouse.down();
 await page.mouse.move(rect.x+rect.width*.65,rect.y+rect.height*.85,{steps:12});
 await page.mouse.up();
 const result=(await saved(page,WORKSPACE)).state.placed[0];
 expect(result.x).toBeCloseTo(start.x,4);
 expect(result.y).toBeCloseTo(start.y,4);
 expect(result.angle).not.toBe(start.angle);
 expect(result.faceUp).toBe(start.faceUp);
 await page.reload();
 expect((await saved(page,WORKSPACE)).state.placed[0].angle).toBeCloseTo(result.angle,1);
});

test('editing a registered spread removes chosen positions without moving others',async({page})=>{
 const fixture={
  id:'custom_remove_positions',name:'削除検証',cardSize:1.35,
  slots:[
   {x:22,y:32,angle:0,name:'入口',detail:'始まり'},
   {x:51,y:42,angle:23,name:'中央',detail:'転機'},
   {x:78,y:64,angle:45,name:'出口',detail:'結末'},
   {x:15,y:76,angle:270,name:'補助',detail:'補足'}
  ]
 };
 await page.evaluate(({key,item})=>localStorage.setItem(key,JSON.stringify([item])),{key:SPREADS,item:fixture});
 await page.reload();
 const before=await saved(page,WORKSPACE);
 await page.locator('#spreadNotebook').click();
 await page.locator('#archiveItems').getByRole('button',{name:'編集'}).click();
 await expect(page.locator('#spreadWorkbenchFields .spread-position-remove')).toHaveCount(4);
 await page.locator('#spreadWorkbenchFields .spread-position-remove').nth(1).click();
 await expect(page.locator('#spreadWorkbenchFields .spread-position-remove')).toHaveCount(3);
 // Restoring positions must not reintroduce the deleted card.
 await page.locator('#spreadRestoreLayout').click();
 await expect(page.locator('#zone .card')).toHaveCount(3);
 await page.locator('#spreadWorkbenchFields .spread-position-remove').nth(2).click();
 await expect(page.locator('#zone .card')).toHaveCount(2);
 await page.locator('#spreadSave').click();
 const savedSpread=(await saved(page,SPREADS)).find(p=>p.id===fixture.id);
 expect(savedSpread.slots).toMatchObject([fixture.slots[0],fixture.slots[2]]);
 expect(savedSpread.cardSize).toBeCloseTo(fixture.cardSize,2);
 const after=await saved(page,WORKSPACE);
 expect(after.state.deck).toEqual(before.state.deck);
 expect(after.state.placed).toEqual(before.state.placed);
 await page.reload();
 expect((await saved(page,SPREADS)).find(p=>p.id===fixture.id).slots).toHaveLength(2);
});
test('a newly captured spread allows removing unnumbered cards and cancel restores original session',async({page})=>{
 await page.locator('#spreadQuickSelect').selectOption('free');
 for(let i=0;i<3;i++)await page.locator('#quickDeal').click();
 await expect.poll(async()=>(await saved(page,WORKSPACE)).state.placed.length).toBe(3);
 const before=await saved(page,WORKSPACE);
 await page.locator('#spreadNotebook').click();
 await page.locator('#archiveCapture').click();
 await expect(page.locator('#spreadWorkbenchFields .spread-position-remove')).toHaveCount(3);
 await expect(page.locator('#spreadWorkbenchFields')).toContainText('未採番');
 await page.locator('#spreadWorkbenchFields .spread-position-remove').first().click();
 await expect(page.locator('#zone .card')).toHaveCount(2);
 await page.locator('#spreadCancel').click();
 const after=await saved(page,WORKSPACE);
 expect(after.state.placed).toEqual(before.state.placed);
 expect(after.state.deck).toEqual(before.state.deck);
});

test('whole-spread arrows translate every saved slot together and keep circular offset after rotation',async({page})=>{
 const fixture={
  id:'custom_move_all',name:'全体移動検証',cardSize:1.25,
  slots:[
   {x:30,y:35,angle:10,name:'左'},
   {x:50,y:60,angle:80,name:'中央'},
   {x:70,y:35,angle:170,name:'右'}
  ]
 };
 await page.evaluate(({key,item})=>localStorage.setItem(key,JSON.stringify([item])),{key:SPREADS,item:fixture});
 await page.reload();
 const before=await saved(page,WORKSPACE);
 await page.locator('#spreadNotebook').click();
 await page.locator('#archiveItems').getByRole('button',{name:'編集'}).click();
 const snapshot=()=>page.locator('#zone .card').evaluateAll(nodes=>nodes.map(n=>({
  x:parseFloat(n.style.left),y:parseFloat(n.style.top),angle:parseFloat(n.style.getPropertyValue('--rotation'))
 })));
 const original=await snapshot();
 await page.locator('#spreadTranslateStep').selectOption('2');
 await page.locator('#spreadTranslateRight').click();
 await page.locator('#spreadTranslateDown').click();
 const moved=await snapshot();
 for(let i=0;i<moved.length;i++){
  expect(moved[i].x).toBeGreaterThan(original[i].x);
  expect(moved[i].y).toBeGreaterThan(original[i].y);
  expect(moved[i].angle).toBeCloseTo(original[i].angle);
  expect(moved[i].x-moved[0].x).toBeCloseTo(original[i].x-original[0].x);
  expect(moved[i].y-moved[0].y).toBeCloseTo(original[i].y-original[0].y);
 }
 await page.locator('#spreadSave').click();
 const savedSpread=(await saved(page,SPREADS)).find(x=>x.id===fixture.id);
 for(let i=0;i<savedSpread.slots.length;i++){
  expect(savedSpread.slots[i].x).toBeGreaterThan(fixture.slots[i].x);
  expect(savedSpread.slots[i].y).toBeGreaterThan(fixture.slots[i].y);
 }
 const after=await saved(page,WORKSPACE);
 expect(after.state.deck).toEqual(before.state.deck);
 expect(after.state.placed).toEqual(before.state.placed);
});

test('imported reading can register its own spread with slot names, order and details',async({page})=>{
 const fixture={
  id:'custom_export_source',name:'元の祭壇',cardSize:1.45,
  slots:[{x:31,y:22,angle:15,name:'第一・三角',detail:'入口'},
   {x:52,y:49,angle:90,name:'第二・十字',detail:'中心'},
   {x:68,y:75,angle:270,name:'第三・円環',detail:'終幕'}]
 };
 await page.evaluate(({key,record})=>{
  const previous=JSON.parse(localStorage.getItem('tabula_sortium_v01'));
  localStorage.setItem('tabula_sortium_history_v034',JSON.stringify([{
   id:'reading_imported',name:'共有された占例',time:new Date().toISOString(),
   placed:[{...previous.state.deck[0],x:31,y:22,angle:15,slot:0}],
   deck:previous.state.deck.slice(1),removed:[],tablePiles:[],slots:record.slots,
   settings:{...previous.settings,spread:record.id,cardSize:record.cardSize},
   spread:record.id,cardNames:['愚者']
  }]));
 },{key:WORKSPACE,record:fixture});
 await page.reload();
 const before=await saved(page,WORKSPACE);
 await page.locator('#quickSnapshotList').click();
 await expect(page.locator('#registerSpreadA')).toBeVisible();
 page.once('dialog',dialog=>dialog.accept('祭壇の再登録'));
 await page.locator('#registerSpreadA').click();
 const items=await saved(page,SPREADS);
 expect(items).toHaveLength(1);
 expect(items[0].name).toBe('祭壇の再登録');
 expect(items[0].cardSize).toBeCloseTo(fixture.cardSize);
 expect(items[0].slots).toEqual(fixture.slots);
 const after=await saved(page,WORKSPACE);
 expect(after.state).toEqual(before.state);
 await page.reload();
 await expect(page.locator('#spreadQuickSelect option').filter({hasText:'祭壇の再登録'})).toHaveCount(1);
});


// Regression: a flight to a rotated frame must retain the original card's
// dimensions; getBoundingClientRect() is an axis-aligned ROTATED bounding box.
test('rotated card flight preserves physical aspect ratio and animates its angle',async ({page})=>{
 await page.setViewportSize({width:1280,height:850});
 await page.locator('#spreadQuickSelect').selectOption('celtic');
 await page.evaluate(()=>{
  window.__flightGeometry=[];
  const nativeAnimate=Element.prototype.animate;
  Element.prototype.animate=function(frames,options){
   if(this.matches('body > .card')){
    const dest=document.querySelector('#zone .card[data-index="'+this.dataset.index+'"]');
    const angle=Number.parseFloat(getComputedStyle(dest).getPropertyValue('--rotation'))||0;
    window.__flightGeometry.push({
     angle,ghostWidth:Number.parseFloat(this.style.width),ghostHeight:Number.parseFloat(this.style.height),
     actualWidth:dest.offsetWidth,actualHeight:dest.offsetHeight,
     frames:frames.map(frame=>frame.transform)
    });
   }
   return nativeAnimate.call(this,frames,options);
  };
 });
 await page.locator('#quickDeal').click();
 await expect.poll(()=>page.evaluate(()=>window.__flightGeometry.some(f=>Math.abs(f.angle)>20)),{timeout:12000}).toBe(true);
 const flights=await page.evaluate(()=>window.__flightGeometry.filter(f=>Math.abs(f.angle)>20));
 for(const flight of flights){
  // The ghost retains explicit unrotated dimensions even when visually rotated.
  expect(flight.ghostWidth).toBeGreaterThan(0);
  expect(flight.ghostHeight).toBeGreaterThan(0);
  expect(flight.ghostWidth/flight.ghostHeight).toBeCloseTo(flight.actualWidth/flight.actualHeight,1);
  expect(flight.frames[0]).toContain('rotate(0deg)');
  expect(flight.frames.at(-1)).toContain('rotate(');
 }
});


test('selectable deal animation uses spin and petal trajectories without spread mapping',async ({page})=>{
 await page.locator('#spreadQuickSelect').selectOption('one');
 for(const [mode,duration] of [['spin',680],['serpentQuick',320],['serpent',3900],['petalSoft',4300]]){
  await page.locator('#dealAnimation').selectOption(mode);
  await expect.poll(async()=> (await saved(page,WORKSPACE)).settings.dealAnimation).toBe(mode);
  await page.reload();
  await expect(page.locator('#dealAnimation')).toHaveValue(mode);
  await page.evaluate(()=>{
   window.__testFlight=null;
   const animate=Element.prototype.animate;
   Element.prototype.animate=function(frames,options){
    if(this.matches('body > .card'))window.__testFlight={
     duration:options.duration,
     dimensions:[Number.parseFloat(this.style.width),Number.parseFloat(this.style.height)],
     end:frames.at(-1).transform,
     count:frames.length
    };
    return animate.call(this,frames,options);
   };
  });
  await page.locator('#quickDeal').click();
  await expect.poll(()=>page.evaluate(()=>window.__testFlight?.duration),{timeout:8000}).toBe(duration);
  const flight=await page.evaluate(()=>window.__testFlight);
  expect(flight.dimensions.every(Number.isFinite)).toBe(true);
  expect(flight.dimensions[0]).toBeGreaterThan(0);
  expect(flight.dimensions[1]).toBeGreaterThan(0);
  expect(flight.end).toContain('calc(-50% + 0px)');
  expect(flight.count).toBe(mode==='spin'?4:(mode==='serpent'||mode==='serpentQuick')?161:101);
  await page.waitForTimeout(duration+100);
  await expect(page.locator('#zone > .card')).toHaveCount(1);
  // Clearing the table, not switching spreads, prepares a fresh animation.
  await page.evaluate(key=>{
   const data=JSON.parse(localStorage.getItem(key));
   data.state.deck.unshift(...data.state.placed);
   data.state.placed=[];
   localStorage.setItem(key,JSON.stringify(data));
  },WORKSPACE);
  await page.reload();
 }
});

test('deal hides spread frame visuals while preserving slot geometry and supports restoring them',async ({page})=>{
 await page.locator('#spreadQuickSelect').selectOption('three');
 const slotsBefore=await page.locator('#zone > .slot').evaluateAll(nodes=>nodes.map(node=>({
  left:node.style.left,top:node.style.top,angle:node.style.getPropertyValue('--angle')
 })));
 expect(slotsBefore.length).toBeGreaterThan(0);
 await expect(page.locator('#quickFrames')).toHaveAttribute('aria-pressed','true');
 await page.locator('#dealAnimation').selectOption('serpent');
 // A long flight must begin with frames hidden, not only after arrival.
 await page.locator('#quickDeal').click();
 await expect(page.locator('#zone')).toHaveClass(/frames-hidden/);
 await expect(page.locator('#quickFrames')).toHaveAttribute('aria-pressed','false');
 await expect.poll(async()=> (await saved(page,WORKSPACE)).settings.framesVisible).toBe(false);
 const slotsAfter=await page.locator('#zone > .slot').evaluateAll(nodes=>nodes.map(node=>({
  left:node.style.left,top:node.style.top,angle:node.style.getPropertyValue('--angle')
 })));
 expect(slotsAfter.length).toBeLessThan(slotsBefore.length);
 for(const item of slotsAfter)expect(slotsBefore).toContainEqual(item);
 await expect(page.locator('#zone > .slot').first()).toHaveCSS('opacity','0');
 // The user can reveal remaining frames without disturbing their destinations.
 await page.locator('#quickFrames').click();
 await expect(page.locator('#zone')).not.toHaveClass(/frames-hidden/);
 await expect(page.locator('#quickFrames')).toHaveAttribute('aria-pressed','true');
 await page.reload();
 await expect(page.locator('#quickFrames')).toHaveAttribute('aria-pressed','true');
});
test('a new reading restores hidden frame outlines',async ({page})=>{
 await page.locator('#spreadQuickSelect').selectOption('three');
 await page.locator('#quickDeal').click();
 await expect(page.locator('#zone')).toHaveClass(/frames-hidden/);
 // End the current animation before starting a new reading.
 await page.waitForTimeout(500);
 page.once('dialog',dialog=>dialog.accept());
 await page.locator('#newSessionStandalone').click();
 await expect(page.locator('#zone')).not.toHaveClass(/frames-hidden/);
 await expect(page.locator('#quickFrames')).toHaveAttribute('aria-pressed','true');
});

test('table deal mode and open mode controls persist without changing animation choices',async ({page})=>{
 const deal=page.locator('.table-action-settings #dealAnimation');
 const open=page.locator('.table-action-settings #tableOpenMode');
 await expect(deal).toBeVisible();
 await expect(open).toBeVisible();
 await expect(page.locator('#tableDealChoiceSlot #quickDealChoice')).toBeVisible();
 await deal.selectOption('serpent');
 await open.selectOption('quick');
 let workspace=await saved(page,WORKSPACE);
 expect(workspace.settings.dealAnimation).toBe('serpent');
 expect(workspace.settings.openMode).toBe('quick');
 await page.reload();
 await expect(deal).toHaveValue('serpent');
 await expect(open).toHaveValue('quick');
 await expect(page.locator('#quickRevealAll')).toBeVisible();
});

test('quick opens sequentially, and simultaneous open lifts and flips all cards together',async ({page})=>{
 await page.locator('#spreadQuickSelect').selectOption('three');
 await page.locator('#quickDeal').click();
 await expect.poll(async()=> (await saved(page,WORKSPACE)).state.placed.length).toBe(3);
 await page.waitForTimeout(1300);
 const mode=page.locator('#tableOpenMode');
 await mode.selectOption('quick');
 await page.locator('#quickOpen').click();
 await expect.poll(async()=> (await saved(page,WORKSPACE)).state.placed.filter(c=>c.faceUp).length,{timeout:4000}).toBe(3);
 await page.locator('#quickFaceDown').click();
 await mode.selectOption('all');
 await page.evaluate(()=>{
  window.__floatingBegins=0;
  const animate=Element.prototype.animate;
  Element.prototype.animate=function(frames,options){
   if(this.classList.contains('card-inner')&&frames.some(f=>String(f.transform).includes('rotateY(105deg)')))
    window.__floatingBegins++;
   return animate.call(this,frames,options);
  };
 });
 await page.locator('#quickOpen').click();
 await expect.poll(()=>page.evaluate(()=>window.__floatingBegins)).toBe(3);
 await expect.poll(async()=> (await saved(page,WORKSPACE)).state.placed.filter(c=>c.faceUp).length,{timeout:3000}).toBe(3);
 await expect(page.locator('#zone > .card.faceup')).toHaveCount(3);
 await page.reload();
 await expect(mode).toHaveValue('all');
});
