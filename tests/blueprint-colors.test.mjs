import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const ctx={localStorage:{getItem:()=>null}};ctx.globalThis=ctx;
runInNewContext(readFileSync(new URL('../js/deck-blueprint.js',import.meta.url),'utf8'),ctx);
const api=ctx.TabulaDeckBlueprint;
test('designer palette offers sixteen distinct readable colors',()=>{
 assert.equal(api.COLORS.length,16);
 assert.equal(new Set(Array.from(api.COLORS,c=>c[2])).size,16);
 assert.equal(api.inkColor('black'),'#25211e');
 assert.equal(api.inkColor('red'),'#a5232c');
 assert.equal(api.inkColor('turquoise'),'#16858b');
 assert.equal(api.inkColor('unknown'),'#25211e');
});
