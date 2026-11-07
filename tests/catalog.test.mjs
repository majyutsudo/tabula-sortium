import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source=readFileSync(new URL('../js/catalog.js', import.meta.url),'utf8');
const ctx={};
runInNewContext(source,ctx);
const { cards, majors, ranks, suitDefs, presets, colors, builtinSpreadCardSizes }=ctx.TabulaCatalog;

test('all 78 canonical tarot cards retain unique stable identifiers',()=>{
  assert.equal(cards.length,78);
  assert.equal(new Set(Array.from(cards,c=>c.id)).size,78);
  assert.equal(majors.length,22);
  assert.equal(ranks.length,14);
  assert.equal(suitDefs.length,4);
  assert.equal(cards.filter(c=>c.group==='major').length,22);
  assert.equal(cards.filter(c=>c.group==='court').length,16);
  assert.equal(cards.filter(c=>c.group==='minor').length,40);
  assert.equal(cards[0].id,'major_00');
  assert.equal(cards[21].id,'major_21');
});

test('built-in spread definitions preserve their positions and names',()=>{
  assert.equal(presets.one.length,1);
  assert.equal(presets.three.length,3);
  assert.equal(presets.celtic.length,10);
  assert.equal(presets.horoscope.length,13);
  assert.equal(presets.horseshoe.length,7);
  assert.equal(presets.horoscope[12].name,'総合');
  assert.ok(presets.horoscope.every(p=>p.x>=0&&p.x<=100&&p.y>=0&&p.y<=100));
  assert.ok(presets.horseshoe.every(p=>p.x>=0&&p.x<=100&&p.y>=0&&p.y<=100));
  assert.equal(presets.free.length,0);
  assert.equal(presets.celtic[1].angle,90);
  assert.ok(presets.celtic.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.angle)));
  assert.equal(presets.three[0].name,'過去');
  assert.equal(presets.three[2].name,'未来');
});

test('card sizes are defined for desktop and mobile for every built-in spread',()=>{
  for(const id of ['one','three','celtic','horoscope','horseshoe','free']){
    const size=builtinSpreadCardSizes[id];
    assert.ok(size);
    assert.ok(size.desktop>=.8&&size.desktop<=2.3);
    assert.ok(size.mobile>=.8&&size.mobile<=2.3);
  }
  assert.equal(colors.length,18);
});
