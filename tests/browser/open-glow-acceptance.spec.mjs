import { test, expect } from '@playwright/test';

for(const preset of ['ritual','mystic','psychic']){
 test('ordinary open finale fades out for '+preset,async ({page})=>{
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto('/table.html');
  await page.locator('#effectPreset').selectOption(preset,{force:true});
  await page.locator('#spreadQuickSelect').selectOption('one');
  const deal=page.locator('#quickDeal');
  const stage=page.locator('#stage');
  const card=page.locator('#zone > .card');
  await deal.click();
  await expect(deal).toContainText('ディール');
  await card.click();
  await expect(card).toHaveClass(/faceup/);
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
