import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const file=(name)=>readFileSync(new URL('../'+name,import.meta.url),'utf8');

test('native dice render surface belongs to the TABULA table and shares altar',()=>{
 const page=file('table.html'),style=file('css/dice-workspace.css');
 assert.match(page,/id="surface"/);
 assert.match(page,/id="cloth"[^>]*><\/div><div id="dice-felt"/);
 assert.match(page,/id="altar"/);
 assert.match(page,/id="diceWorkspace"/);
 assert.doesNotMatch(page,/id="diceWorkspaceFrame"/);
 assert.match(style,/#dice-felt\{display:none;position:absolute/);
 assert.match(style,/body\.tabula-dice-mode #dice-felt\{display:block/);
 assert.match(style,/#surface>\.altar/);
});
test('independent card state stays mounted during dice mode',()=>{
 const page=file('table.html'),adapter=file('js/dice-workspace.js');
 assert.match(page,/id="deck"/);
 assert.match(page,/id="spread"/);
 assert.match(page,/id="instrumentItem"/);
 assert.match(adapter,/workspace\.hidden=false/);
 assert.match(adapter,/workspace\.hidden=true/);
 assert.match(adapter,/classList\.remove\('tabula-dice-mode'\)/);
 assert.doesNotMatch(adapter,/innerHTML|removeChild|replaceChildren/);
});
test('native physics module is imported once and shares the selector',()=>{
 const adapter=file('js/dice-workspace.js');
 const engine=file('js/dice-table-engine.js');
 assert.match(adapter,/import\('\.\/dice-table-engine\.js\?v=0724'\)/);
 assert.match(adapter,/window\.TabulaDiceTable\?\.setMode\(id\)/);
 assert.match(engine,/window\.TabulaDiceTable=/);
 assert.match(engine,/new THREE\.WebGLRenderer/);
 assert.match(engine,/RAPIER\.World/);
 assert.match(engine,/diceDOM\.getElementById\('felt'\)/);
 assert.match(engine,/setIChingColors/);
 assert.match(engine,/function renderAstroColors/);
 assert.match(engine,/function renderSettings/);
});
test('dice DOM IDs do not collide with card DOM IDs',()=>{
 const html=file('table.html');
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);
 assert.equal(new Set(ids).size,ids.length);
 for(const id of ['felt','roll','collect','mix','status','preset','title','subtitle','description'])
  assert.ok(ids.includes('dice-'+id));
});
test('card-dice picker has a card/dice divider and no separate mode selector',()=>{
 const html=file('table.html');
 assert.match(html,/<optgroup label="カード">/);
 assert.match(html,/<optgroup label="ダイス">/);
 assert.match(html,/value="dice:normal">ダイス/);
 assert.match(html,/value="dice:astro"/);
 assert.match(html,/value="dice:iching"/);
 assert.doesNotMatch(html,/id="instrumentMode"/);
});
