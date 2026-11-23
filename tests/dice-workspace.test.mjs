import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const file=(name)=>readFileSync(new URL('../'+name,import.meta.url),'utf8');

test('TABULA retains card table while adding independent dice workspace',()=>{
 const page=file('table.html'),style=file('css/dice-workspace.css');
 assert.match(page,/id="stage"/);
 assert.match(page,/id="deck"/);
 assert.match(page,/id="spread"/);
 assert.match(page,/id="instrumentItem"/);
 assert.match(page,/value="dice:normal"/);
 assert.match(page,/value="dice:astro"/);
 assert.match(page,/value="dice:iching"/);
 assert.match(page,/id="diceWorkspaceFrame"/);
 assert.match(style,/\.main>:not\(#diceWorkspace\)/);
 assert.match(style,/\.main>#diceWorkspace/);
});
test('dice workspace adapter switches modes without disposing card objects',()=>{
 const js=file('js/dice-workspace.js');
 assert.match(js,/workspace\.hidden=false/);
 assert.match(js,/workspace\.hidden=true/);
 assert.match(js,/section\.classList\.remove/);
 assert.match(js,/dice-unified-lab\.html\?embedded=1&v=0722/);
 assert.match(js,/tabula:dice:mode/);
 assert.match(js,/tabula:dice:height/);
 assert.doesNotMatch(js,/innerHTML|removeChild|replaceChildren/);
});
test('embedded dice display handles parent mode messages and adapts height',()=>{
 const page=file('dice-unified-lab.html'),js=file('js/dice-engine.js');
 assert.match(page,/dice-embedded/);
 assert.match(page,/tabula:dice:height/);
 assert.match(js,/tabula:dice:mode/);
 assert.match(js,/pendingParentMode/);
 assert.match(js,/setIChingColors/);
 assert.match(js,/function renderAstroColors/);
 assert.match(js,/function renderSettings/);
});

test('returning to the same dice mode preserves its scene instead of recreating it',()=>{
 const engine=file('js/dice-engine.js');
 assert.match(engine,/current\.id!==id\)\{document\.getElementById\('preset'\)/);
});
test('tool groups separate cards and dice in one selector',()=>{
 const html=file('table.html'),control=file('js/dice-workspace.js');
 assert.match(html,/<optgroup label="カード">/);
 assert.match(html,/<optgroup label="ダイス">/);
 assert.match(control,/MutationObserver\(syncAvailableCards\)/);
 assert.match(control,/source\.dispatchEvent\(new Event\('change'/);
});
