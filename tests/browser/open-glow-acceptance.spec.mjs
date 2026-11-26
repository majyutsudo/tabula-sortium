import { test, expect } from '@playwright/test';

for(const preset of ['ritual','mystic','psychic']){
 test('ordinary open finale fades out for '+preset,async ({page})=>{
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto('/table.html');
  await page.locator('#effectPreset').selectOption(preset,{force:true});
  await page.reload();
  await page.locator('#spreadQuickSelect').selectOption('one');
  const deal=page.locator('#quickDeal');
  const stage=page.locator('#stage');
  const card=page.locator('#zone > .card');
  await deal.click();
  await expect(deal).toContainText('ディール');
  await card.click();
  await expect(card).toHaveClass(/faceup/);
  await expect(stage).not.toHaveClass(/normal-spread-open|effect-finale/);
  await expect(stage).toHaveClass(/effect-finale/);
  await expect.poll(()=>stage.evaluate(el=>getComputedStyle(el,'::after').animationName)).not.toBe('none');
  await expect(card).toHaveCSS('animation-name','openEdgeFade');
  await expect(stage).not.toHaveClass(/effect-finale/);
  await expect(stage).toHaveCSS('filter','none');
  await expect(card).toHaveCSS('filter',/drop-shadow\(rgba\([^)]*0\.13\) 0px 0px 3px\)/);
  await expect(card).not.toHaveCSS('animation-name','psychic-glow');

  await page.reload();
  await expect(stage).toHaveClass(/normal-spread-open/);
  await expect(stage).not.toHaveClass(/effect-finale/);
  await expect(stage).toHaveCSS('filter','none');
  await expect(card).not.toHaveCSS('animation-name','psychic-glow');
 });
}


for(const mode of ['normal','quick']){
 test('the third card lights before the tableau in '+mode+' opening',async ({page})=>{
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto('/table.html');
  await expect(page.locator('body')).toHaveAttribute('data-effect-preset','ritual');
  await page.locator('#spreadQuickSelect').selectOption('three');
  await page.locator('#tableOpenMode').selectOption(mode);
  await page.locator('#quickDeal').click();
  await expect(page.locator('#quickDeal')).toContainText('ディール');
  const stage=page.locator('#stage');
  await page.evaluate(()=>{
   const stage=document.getElementById('stage');
   window.openStages=[];
   const zone=document.getElementById('zone');
   const record=()=>{
    const cards=[...zone.querySelectorAll('.card.faceup')];
    if(!cards.length)return;
    const last=cards.at(-1);
    window.openStages.push({
     count:cards.length,finale:stage.classList.contains('effect-finale'),
     resting:stage.classList.contains('normal-spread-open'),
     filter:getComputedStyle(last).filter
    });
   };
   new MutationObserver(record).observe(zone,{childList:true});
   new MutationObserver(record).observe(stage,{attributes:true,attributeFilter:['class']});
  });
  await page.locator('#quickOpen').click();
  await expect(stage).toHaveClass(/effect-finale/);
  const frames=await page.evaluate(()=>window.openStages);
  const first=frames.find(frame=>frame.count===1);
  const lastIndex=frames.findIndex(frame=>frame.count===3&&!frame.finale);
  expect(lastIndex).toBeGreaterThanOrEqual(0);
  expect(frames[lastIndex]).toMatchObject({resting:false,filter:first.filter});
  expect(frames.findIndex(frame=>frame.finale)).toBeGreaterThan(lastIndex);
 });
}

test('Monte Carlo dims the filled grid and keeps its separate success finale',async ({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.goto('/table.html');
 await page.locator('#spreadQuickSelect').selectOption('monteCarlo');
 const key='tabula_sortium_v01';
 await page.evaluate(key=>{
  const saved=JSON.parse(localStorage.getItem(key));
  saved.settings.effectPreset='psychic';
  const slots=TabulaCatalog.presets.monteCarlo;
  saved.state.placed=saved.state.deck.splice(0,slots.length).map((card,slot)=>({
   ...card,slot,x:slots[slot].x,y:slots[slot].y,angle:0,faceUp:slot!==12
  }));
  localStorage.setItem(key,JSON.stringify(saved));
 },key);
 await page.reload();
 const stage=page.locator('#stage');
 const cards=page.locator('#zone > .card');
 await expect(cards.first()).toHaveCSS('animation-name','psychic-glow');
 await cards.nth(12).click();
 await expect(stage).toHaveClass(/normal-spread-open/);
 await expect(stage).not.toHaveClass(/effect-finale/);
 await expect(cards.first()).not.toHaveCSS('animation-name','psychic-glow');

 // Model a removed pair and then the final remaining occupied position.
 await page.evaluate(key=>{
  const saved=JSON.parse(localStorage.getItem(key));
  saved.state.placed.slice(0,2).forEach(card=>{card.slot=null;card.manualMoved=true});
  localStorage.setItem(key,JSON.stringify(saved));
 },key);
 await page.reload();
 await expect(stage).toHaveClass(/normal-spread-open/);

 await page.evaluate(key=>{
  const saved=JSON.parse(localStorage.getItem(key));
  saved.state.placed=saved.state.placed.map((card,i)=>i===12?card:{...card,slot:null,x:8,y:5,manualMoved:true});
  saved.state.removed.push(...saved.state.deck.splice(0));
  localStorage.setItem(key,JSON.stringify(saved));
 },key);
 await page.reload();
 await expect(stage).not.toHaveClass(/effect-finale/);
 const last=cards.nth(12),box=await last.boundingBox();
 const grid=await page.locator('#zone').boundingBox();
 await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
 await page.mouse.down();
 await page.mouse.move(grid.x+grid.width*.94,grid.y+grid.height*.82,{steps:12});
 await page.mouse.up();
 await expect(stage).toHaveClass(/effect-finale/);
 await expect(stage).not.toHaveClass(/effect-finale/);
 await expect(cards.nth(12)).not.toHaveCSS('animation-name','psychic-glow');
});
