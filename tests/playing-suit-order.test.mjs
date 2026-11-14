import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const context={localStorage:{getItem:()=>null}};
context.globalThis=context;
runInNewContext(readFileSync(new URL('../js/deck-blueprint.js',import.meta.url),'utf8'),context);
const blueprint=context.TabulaDeckBlueprint;
test('playing suit sequence follows tarot: clubs hearts spades diamonds',()=>{
 assert.deepEqual(Array.from(blueprint.builtInPlaying.suits,s=>s.id),['clubs','hearts','spades','diamonds']);
 const cards=blueprint.generate(blueprint.builtInPlaying);
 assert.deepEqual(Array.from(cards.filter(c=>c.rankId==='r1'),c=>c.suitId),['clubs','hearts','spades','diamonds']);
 assert.equal(cards[0].id,'c_clubs_r1');
 assert.equal(cards[51].id,'c_diamonds_r13');
 assert.equal(cards[52].id,'playing-joker-1');
});
