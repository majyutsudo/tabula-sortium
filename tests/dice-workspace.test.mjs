import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import '../js/multi-workspace.js';
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
 assert.match(adapter,/workspace\.hidden=true/);
 assert.match(adapter,/setCardControlsInactive\(true\)/);
 assert.match(adapter,/setCardControlsInactive\(false\)/);
 assert.match(adapter,/classList\.remove\('tabula-dice-mode'\)/);
 assert.doesNotMatch(adapter,/workspace\.(?:innerHTML|replaceChildren|removeChild)/);
});
test('native physics module is imported once and shares the selector',()=>{
 const adapter=file('js/dice-workspace.js');
 const engine=file('js/dice-table-engine.js');
 assert.match(adapter,/import\('\.\/dice-table-engine\.js\?v=0727'\)/);
 assert.match(adapter,/window\.TabulaDiceTable\?\.restore\(snapshot,id\)/);
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

test('the renderer skips zero-size resize while cards are active',()=>{
 const js=file('js/dice-table-engine.js');
 assert.match(js,/if\(w<80\|\|h<80\)return/);
 assert.match(js,/if\(!document\.body\.classList\.contains\('tabula-dice-mode'\)\)return/);
});

test('same TABULA toolbar and layout are kept, only five shortcut buttons swap',()=>{
 const html=file('table.html'),style=file('css/dice-workspace.css');
 for(const id of ['quickWash','quickShuffle','quickCut','quickDeal','quickOpen'])assert.match(html,new RegExp('id="'+id+'"'));
 for(const id of ['diceQuickCollect','diceQuickMix','diceQuickRoll','diceQuickResults','diceQuickSettings'])assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/<nav class="table-shortcuts dice-quick-actions"/);
 assert.match(style,/body\.tabula-dice-mode \.table-shortcuts:not\(\.dice-quick-actions\)/);
 assert.doesNotMatch(style,/body\.tabula-dice-mode \.main>\.toolbar,[^\n]*display:none/);
 assert.match(html,/id="tableActionSettings"/);
 assert.match(html,/id="liveResults"/);
});
test('dice results/settings and force move into existing TABULA slots',()=>{
 const adapter=file('js/dice-workspace.js');
 assert.match(adapter,/resultsHolder\.append\(workspace\.querySelector\('\.iching-outcome'\)\)/);
 assert.match(adapter,/strengthHolder\.append\(workspace\.querySelector\('\.force-control'\)\)/);
 assert.match(adapter,/settingsHolder\.append\(element\)/);
 assert.match(adapter,/sourceButtons\[i\]\.click\(\)/);
 assert.match(adapter,/MutationObserver\(syncActionStates\)/);
});

test('card-only controls are inert in dice mode without altering TABULA layout',()=>{
 const adapter=file('js/dice-workspace.js');
 assert.match(adapter,/cardOnlyControls/);
 assert.match(adapter,/element\.inert=inactive/);
 assert.match(adapter,/setCardControlsInactive\(true\)/);
 assert.match(adapter,/setCardControlsInactive\(false\)/);
});

test('unavailable card buttons use muted inverted appearance only in dice mode',()=>{
 const adapter=file('js/dice-workspace.js'),style=file('css/dice-workspace.css');
 assert.match(adapter,/classList\.toggle\('dice-unavailable',inactive\)/);
 assert.match(adapter,/element\.inert=inactive/);
 assert.match(adapter,/element\.setAttribute\('aria-disabled','true'\)/);
 assert.match(adapter,/delete element\.dataset\.dicePreviousAriaDisabled/);
 assert.match(style,/body\.tabula-dice-mode \.dice-unavailable/);
 assert.match(style,/filter:grayscale\(1\)!important/);
 assert.match(style,/cursor:not-allowed!important/);
});

test('table tool transitions share the deck replacement and preserve independent tables',()=>{
 const js=file('js/tabula.js');
 assert.match(js,/window.TabulaTableTools=/);
 assert.match(js,/const DICE_TOOL_IDS=/);
 assert.match(js,/function replaceIndependentTool/);
 assert.match(js,/TabulaMultiWorkspace\.validate\(candidate\)/);
 assert.match(js,/function notifyTool\(/);
 assert.match(js,/notifyTool\(\);setStatus\(/);
 assert.match(js,/toolId:isDice\?selectedTool/);
 assert.match(js,/diceSnapshot:activeDiceSnapshot\(\)/);
 assert.match(js,/mainToolState=\{id:dualSession\.tables\.table1\.toolId/);
});
test('dice state is serialized with actual physics poses and restored',()=>{
 const engine=file('js/dice-table-engine.js');
 assert.match(engine,/function captureDice\(/);
 assert.match(engine,/poses:objects\.map/);
 assert.match(engine,/function restoreDice\(saved,id\)/);
 assert.match(engine,/body\.setTranslation\(p,true\)/);
 assert.match(engine,/body\.setRotation\(q,true\)/);
 assert.match(engine,/status\.textContent='THE DICE HAVE FALLEN';emitDice\(\)/);
});
test('asynchronous dice initialization cannot overwrite a newer selected table',()=>{
 const adapter=file('js/dice-workspace.js');
 assert.match(adapter,/activationToken/);
 assert.match(adapter,/token!==activationToken/);
 assert.match(adapter,/TabulaTableTools\?\.context/);
 assert.match(adapter,/tabula:tool-context/);
});

test('dice-only independent table preserves the physical cards in the main table',()=>{
 const M=globalThis.TabulaMultiWorkspace;
 const w=M.table(M.create(['first','second'],[]),'table2','追加卓Ⅰ');
 w.workspaceKind='independent';
 w.tables.table1.toolId='card:builtin';
 w.tables.table2.toolId='dice:astro';
 w.tables.table2.diceSnapshot={schema:1,mode:'astro',results:[1,4,7]};
 assert.equal(M.validate(w),true);
 const next=M.selectTable(w,'table2');
 assert.equal(next.activeTable,'table2');
 assert.equal(next.piles.A.length,2);
 assert.equal(next.piles.B.length,0);
 assert.deepEqual(next.tables.table2.diceSnapshot.results,[1,4,7]);
});
test('full backup includes main tool identity and saved dice snapshots',()=>{
 const js=file('js/tabula.js');
 assert.match(js,/mainToolState,activeMultiWorkspace/);
 assert.match(js,/TOOL_STORAGE_KEY\]/);
 assert.match(js,/JSON\.stringify\(data\.mainToolState/);
 assert.match(js,/localStorage\.removeItem\(TOOL_STORAGE_KEY\)/);
});

test('main and additional table selectors identify each table tool explicitly',()=>{
 const code=file('js/tabula.js');
 assert.match(code,/function toolLabelForTable\(/);
 assert.match(code,/メイン卓 · /);
 assert.match(code,/追加卓Ⅰ'\)\+' · '\+toolLabelForTable/);
 assert.match(code,/tableMenuCurrent'\)\.textContent=currentName\+' · '/);
});

test('table changes are blocked during active dice physics and palette state is isolated',()=>{
 const model=file('js/tabula.js'),engine=file('js/dice-table-engine.js');
 assert.match(model,/ダイスの投擲・混合が終わってから卓を切り替えてください/);
 assert.match(model,/追加卓を片付けてください/);
 assert.match(model,/window\.TabulaDiceTable\?\.busy\?\.\(\)/);
 assert.match(engine,/astroDiceColors=valid&&id==='astro'/);
 assert.match(engine,/ichingColorScheme=valid&&id==='iching'/);
});
test('common TABULA toolbar identifies the active instrument',()=>{
 const code=file('js/dice-workspace.js');
 assert.match(code,/function updateToolbarTool\(id\)/);
 assert.match(code,/toolbarToolName\.textContent=label/);
 assert.match(code,/updateToolbarTool\('dice:'\+id\)/);
});

test('dice extra table creation omits card composition and uses dice wording',()=>{
 const html=file('table.html'),model=file('js/tabula.js'),style=file('css/dice-workspace.css');
 assert.match(html,/id="independentDeckPoolField"/);
 assert.match(html,/id="independentDeckHelp"/);
 assert.match(model,/independentDeckPoolField'\)\.hidden=dice/);
 assert.match(model,/independentDeckHelp'\)\.hidden=dice/);
 assert.match(model,/ダイス用の卓を追加/);
 assert.match(style,/#independentDeckPoolField\[hidden\]/);
});
test('active dice table omits irrelevant card deck appearance/back settings',()=>{
 const model=file('js/tabula.js'),style=file('css/dice-workspace.css');
 assert.match(model,/const activeDice=isDiceTool\(activeToolId\(\)\)/);
 assert.match(model,/dualDeckFieldsA'\)\.hidden=activeDice\|\|diceA/);
 assert.match(model,/dualDeckFieldsB'\)\.hidden=shared\|\|activeDice\|\|diceB/);
 assert.match(model,/dualDeckSettings'\)\.hidden=activeDice/);
 assert.match(model,/dualSummary'\)\.textContent=activeDice/);
 assert.match(style,/#dualDeckSettings\[hidden\]/);
});

test('when an additional table uses dice, its card-only deck B settings stay hidden even if the main table has cards',()=>{
 const model=file('js/tabula.js'),adapter=file('js/dice-workspace.js');
 assert.match(model,/const diceB=isDiceTool\(dualSession\?\.tables\?\.table2\?\.toolId\)/);
 assert.match(model,/dualDeckFieldsB'\)\.hidden=shared\|\|activeDice\|\|diceB/);
 assert.match(model,/backBLabel\.hidden=activeDice\|\|diceB/);
 assert.match(adapter,/presetSnapToggle/);
});

test('dice shows results by default and hides the card-only auxiliary panels',()=>{
 const adapter=file('js/dice-workspace.js');
 const style=file('css/dice-workspace.css');
 assert.match(adapter,/setDiceResultsOpen\(true\)/);
 assert.match(adapter,/function toggleDiceResults\(\)\{setDiceResultsOpen\(cardResults.hidden\)\}/);
 assert.match(adapter,/cardResults.hidden=!cardResultsOpen/);
 for(const klass of ['table-utility-actions','table-record-actions','results-toggle-bar','info'])
  assert.match(style,new RegExp('body\\.tabula-dice-mode \\.main>\\.'+klass));
 assert.match(style,/body\.tabula-dice-mode \.main>\.live-results:not\(\[hidden\]\)/);
});
test('dice strength control is a single slider row without verbal intensity labels',()=>{
 const html=file('table.html');
 assert.match(html,/id="dice-force" type="range"/);
 assert.match(html,/id="dice-forceValue"/);
 assert.doesNotMatch(html,/class="force-range"/);
 assert.doesNotMatch(html,/そっと<\/span>/);
 assert.doesNotMatch(html,/激しく<\/span>/);
});
