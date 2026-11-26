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
