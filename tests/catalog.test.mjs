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
  assert.equal(presets.fiveCross.length,5);
  assert.equal(presets.pentagram.length,5);
  assert.deepEqual(Array.from(presets.fiveCross,p=>p.name),['意識','根底','過去','未来','核心']);
  assert.deepEqual(Array.from(presets.pentagram,p=>p.name),['地・物質','水・感情','風・思考','火・行動','霊・統合']);
  assert.equal(presets.treeOfLife.length,10);
  assert.deepEqual(Array.from(presets.treeOfLife,p=>p.name.split('（')[0]),['ケテル','コクマー','ビナー','ケセド','ゲブラー','ティファレト','ネツァク','ホド','イエソド','マルクト']);
  assert.equal(presets.treeOfLife[0].x,50);
  assert.ok(presets.treeOfLife[0].y<presets.treeOfLife[9].y);
  for(const id of ['fiveCross','pentagram','treeOfLife'])assert.ok(presets[id].every(p=>p.x>=0&&p.x<=100&&p.y>=0&&p.y<=100));
  assert.ok(presets.treeOfLife[3].y-presets.treeOfLife[1].y>=18);
  assert.ok(presets.treeOfLife[6].y-presets.treeOfLife[3].y>=18);
  assert.equal(presets.treeOfLife[0].y,5);
  assert.equal(presets.treeOfLife[8].y,72);
  assert.equal(presets.treeOfLife[9].y,94);
  assert.ok(presets.treeOfLife[9].y-presets.treeOfLife[8].y>=22);
  assert.ok(presets.treeOfLife[0].y<presets.treeOfLife[1].y);
  assert.equal(builtinSpreadCardSizes.fiveCross.mobile,1.5);
  assert.equal(builtinSpreadCardSizes.pentagram.mobile,1.5);
  assert.equal(builtinSpreadCardSizes.horseshoe.mobile,1.45);
  for(const id of ['fiveCross','pentagram','horseshoe']){
    assert.ok(builtinSpreadCardSizes[id].desktop>=builtinSpreadCardSizes.celtic.desktop);
    assert.ok(builtinSpreadCardSizes[id].mobile>=builtinSpreadCardSizes.celtic.mobile);
  }
  assert.equal(presets.horoscope.length,13);
  assert.equal(presets.horseshoe.length,7);
  assert.deepEqual(Array.from(presets.horseshoe,p=>p.y),[14,46,78,87,78,46,14]);
  assert.ok(presets.horseshoe[1].y-presets.horseshoe[0].y>=30);
  assert.ok(presets.horseshoe[2].y-presets.horseshoe[1].y>=30);
  assert.equal(builtinSpreadCardSizes.horseshoe.mobile,1.45);
  assert.equal(presets.horoscope[12].name,'総合');
  assert.equal(presets.horoscope[0].x,10);
  assert.equal(presets.horoscope[3].y,90);
  assert.equal(presets.horoscope[6].x,90);
  assert.equal(presets.horoscope[9].y,10);
  const zodiac=presets.horoscope.slice(0,12);
  for(let i=0;i<zodiac.length;i++){
    const p=zodiac[i],q=zodiac[(i+1)%zodiac.length];
    assert.ok(Math.abs(p.x-q.x)>=10||Math.abs(p.y-q.y)>=18,'zodiac cards must retain space at neighbors');
  }
  assert.ok(presets.horoscope.every(p=>p.x>=0&&p.x<=100&&p.y>=0&&p.y<=100));
  assert.ok(presets.horseshoe.every(p=>p.x>=0&&p.x<=100&&p.y>=0&&p.y<=100));
  assert.equal(presets.free.length,0);
  assert.equal(presets.celtic[1].angle,90);
  assert.ok(presets.celtic.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.angle)));
  assert.equal(presets.three[0].name,'過去');
  assert.equal(presets.three[2].name,'未来');
});

test('card sizes are defined for desktop and mobile for every built-in spread',()=>{
  for(const id of ['one','three','celtic','horoscope','horseshoe','fiveCross','pentagram','treeOfLife','free']){
    const size=builtinSpreadCardSizes[id];
    assert.ok(size);
    assert.ok(size.desktop>=.8&&size.desktop<=2.3);
    assert.ok(size.mobile>=.8&&size.mobile<=2.3);
  }
  assert.equal(colors.length,18);
});
