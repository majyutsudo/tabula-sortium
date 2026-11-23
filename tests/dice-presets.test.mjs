import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PRESETS,preset,TRIGRAMS} from '../js/dice-presets.js';

test('all unified dice presets have complete symbolic face definitions',()=>{
 for(const [id,setting] of Object.entries(PRESETS)){
  assert.equal(setting.dice.length,id==='normal'?5:3);
  for(const die of setting.dice){
   assert.ok([6,8,10,12,20].includes(die.sides));
   if(die.markings==='number')continue;
   assert.equal(die.faces.length,die.sides);
   assert.equal(new Set(die.faces.map(f=>f.glyph)).size,die.sides);
  }
 }
});
test('astronomical dodecahedra carry complementary opposite-value policy',()=>{
 assert.deepEqual(PRESETS.astro.dice.map(d=>d.sides),[12,12,12]);
 assert.ok(PRESETS.astro.dice.every(d=>d.opposites==='sum13'));
});
test('I Ching preset uses ivory with independent trigram inks and vermilion first line',()=>{
 assert.deepEqual(PRESETS.iching.dice.map(d=>d.sides),[8,8,6]);
 assert.ok(PRESETS.iching.dice.every(d=>d.surface==='ivory'));
 assert.equal(PRESETS.iching.dice[0].ink,'#a0252b');
 assert.equal(PRESETS.iching.dice[1].ink,'#29242a');
 assert.deepEqual(PRESETS.iching.dice[0].faces.map(f=>f.glyph),TRIGRAMS);
 assert.deepEqual(PRESETS.iching.dice[2].faces.filter(f=>f.ink==='#a0252b').map(f=>f.glyph),['初']);
});
test('presets are independent instances ready for user customization',()=>{
 const a=preset('normal'),b=preset('normal');a.dice[0].sides=20;
 assert.equal(b.dice[0].sides,6);
 const c=preset('astro'),d=preset('astro');c.dice[0].faces[0].glyph='TEST';
 assert.equal(d.dice[0].faces[0].glyph,'☉');
});
test('unified page has one physics engine and all preset selectors',()=>{
 const html=readFileSync(new URL('../dice-unified-lab.html',import.meta.url),'utf8');
 const engine=readFileSync(new URL('../js/dice-engine.js',import.meta.url),'utf8');
 assert.match(html,/id="preset"/);
 assert.match(html,/value="normal"/);
 assert.match(html,/value="astro"/);
 assert.match(html,/value="iching"/);
 assert.match(html,/js\/dice-engine\.js\?v=0716/);
 assert.match(engine,/from '\.\/dice-presets\.js\?v=0716'/);
 assert.match(engine,/complementaryFaceValues\(faceNormals\)/);
 assert.match(engine,/function hexagramSummary\(/);
});

test('normal dice count, palette and text-presentation zodiac marks are supported',()=>{
 const engine=readFileSync(new URL('../js/dice-engine.js',import.meta.url),'utf8');
 const html=readFileSync(new URL('../dice-unified-lab.html',import.meta.url),'utf8');
 assert.match(engine,/NORMAL_DICE_MAX=8/);
 assert.match(engine,/diceSettings\.push\(/);
 assert.match(engine,/diceSettings\.splice\(i,1\)/);
 assert.match(engine,/objects\.length>1\?/);
 assert.doesNotMatch(engine,/\['wood','古木'\]/);
 assert.doesNotMatch(engine,/\['archaic','古代風'\]/);
 assert.match(engine,/\\uFE0E/);
 assert.match(html,/UNIFIED DICE LAB v0\.716/);
});
