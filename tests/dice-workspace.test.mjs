import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import '../js/multi-workspace.js';
const file=(name)=>readFileSync(new URL('../'+name,import.meta.url),'utf8');

test('native dice render surface belongs to the TABULA table and shares altar',()=>{
 const page=file('table.html'),style=file('css/dice-workspace.css');
 assert.match(page,/id="surface"/);
 assert.match(page,/id="cloth"[^>]*><\/div><div id="dice-felt"/);
 assert.match(page,/<div class="altar" id="altar" hidden><\/div>/);
 assert.doesNotMatch(file('css/tabula.css'),/\.candle(?:[.:]|\{)/);
 assert.match(file('js/tabula.js'),/function renderCandles\(\)\{const host=\$\('altar'\);host\.replaceChildren\(\)/);
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
 assert.match(adapter,/import\('\.\/dice-table-engine\.js\?v=0784'\)/);
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
test('one dice entry opens a set chooser with both fixed-role sets',()=>{
 const html=file('table.html'),adapter=file('js/dice-workspace.js');
 const picker=html.match(/<select id="instrumentItem"[^>]*>(.*?)<\/select>/)[1];
 assert.deepEqual([...picker.matchAll(/value="([^"]+)"/g)].map(match=>match[1]),['card','dice']);
 assert.match(html,/<dialog id="diceSetDialog"/);
 assert.match(html,/<dialog id="diceSettingsDialog"/);
 for(const preset of ['アルケミーダイス','アストロダイス','易占ダイス'])assert.ok(adapter.includes(preset));
 assert.match(adapter,/setDialog\.showModal\(\)/);
 assert.match(adapter,/settingsDialog\.showModal\(\)/);
 assert.match(file('css/dice-workspace.css'),/body\.tabula-dice-mode #placementTools\{display:none!important\}/);
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
test('dice results and force use TABULA slots and settings use a modal',()=>{
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
 assert.match(engine,/function restoreDice\(saved,id,sizePercent\)/);
 assert.match(engine,/body\.setTranslation\(\{x,y:p\.y\*diceScale\/savedScale,z\}/);
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
 assert.match(html,/id="independentCustomPoolEdit"/);
 assert.match(model,/independentDeckPoolField'\)\.hidden=dice/);
 assert.match(model,/independentCustomPoolEdit'\)\.hidden=dice\|\|/);
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

test('dice reading data validates normal, astrological and I Ching snapshots',()=>{
 const source=file('js/storage-format.js'),mod={};
 new Function('globalThis',source)(mod);
 const validate=mod.TabulaStorage.validateReading;
 const settings=n=>({sides:n,color:'#c7b48d',surface:'ring',label:'D'+n});
 const pose=()=>({p:{x:0,y:1,z:0},q:{x:0,y:0,z:0,w:1},visible:true});
 const make=(mode,sides,results)=>({kind:'dice',id:'s_1',name:'テスト',time:'2026-11-24T13:00:00+09:00',
  dice:{schema:1,mode,settings:sides.map(settings),poses:sides.map(pose),results,held:false},
  placed:[],deck:[],removed:[],tablePiles:[]});
 assert.equal(validate(make('normal',[6,12],[2,11])),true);
 assert.equal(validate(make('astro',[12,12,12],[1,7,10])),true);
 assert.equal(validate(make('iching',[8,8,6],[3,6,1])),true);
 const invalid=make('normal',[6],[7]);assert.equal(validate(invalid),false);
 const missing=make('astro',[12,12,12],[1,7,10]);delete missing.dice.poses;assert.equal(validate(missing),false);
 assert.equal(validate({placed:[],deck:[]}),true);
});
test('history still supports both card and dice snapshot types',()=>{
 const format={},history={};
 new Function('globalThis',file('js/ui-format.js'))(format);
 new Function('globalThis',file('js/reading-history.js'))(history);
 const dice={kind:'dice',placed:[],dice:{mode:'astro',results:[1,5,10]}};
 const card={placed:[{id:'major_00'}],spread:'one'};
 assert.match(format.TabulaUiFormat.snapshotSummary(dice),/アストロダイス/);
 assert.match(format.TabulaUiFormat.snapshotSummary(card),/1枚/);
 const store={value:null,getItem(){return this.value},setItem(_,val){this.value=val}};
 history.TabulaReadingHistory.write(store,'test',[dice,card]);
 assert.equal(history.TabulaReadingHistory.read(store,'test').length,2);
});
test('dice history actions are active while card-only placement printing stays hidden',()=>{
 const js=file('js/dice-workspace.js'),css=file('css/dice-workspace.css'),tab=file('js/tabula.js');
 assert.doesNotMatch(js,/quickRevealAll','presetSnapToggle','quickSnapshotSave'/);
 assert.match(css,/body\.tabula-dice-mode \.main>\.table-record-actions\{/);
 assert.match(css,/body\.tabula-dice-mode #quickSnapshotSave,/);
 assert.match(css,/body\.tabula-dice-mode #printPlacement\{display:inline-flex!important/);
 assert.match(tab,/function diceReadingSnapshot\(/);
 assert.match(tab,/function diceSnapshotPanel\(/);
 assert.match(tab,/if\(v.kind==='dice'\)return diceSnapshotPanel\(v\)/);
 assert.match(tab,/if\(v.kind==='dice'\)\{/);
 assert.match(tab,/registerSpreadA'\)\.hidden=a\?\.kind==='dice'/);
});

test('I Ching history preserves the original engine King Wen result',()=>{
 const engine=file('js/dice-table-engine.js'),model=file('js/tabula.js');
 assert.match(engine,/hexagram:current\.id==='iching'&&recordedResults\?hexagramSummary/);
 assert.match(model,/本卦 → 之卦/);
 assert.match(model,/String\.fromCodePoint\(0x4dc0\+h\.primary-1\)/);
});

test('save-and-new dice clears the previous outcome before the next reading',()=>{
 const tab=file('js/tabula.js'),engine=file('js/dice-table-engine.js');
 assert.match(tab,/if\(isDiceTool\(activeToolId\(\)\)\)\{window\.TabulaDiceTable\?\.reset\?\./);
 assert.match(engine,/restoreDice\(\{\.\.\.saved,poses:null,results:null,held:false\},id\)/);
});

test('2D dice placement uses original card placement editor and export paths',()=>{
 const printer=file('js/placement-print.js'),adapter=file('js/dice-workspace.js'),style=file('css/dice-workspace.css');
 assert.match(printer,/function dicePrintable\(/);
 assert.match(printer,/return dicePrintable\(\)/);
 assert.match(printer,/data-instrument':'dice'/);
 assert.match(printer,/svg\.getAttribute\('data-instrument'\)==='dice'/);
 assert.match(printer,/const diceDiagram=svg\.getAttribute\('data-instrument'\)==='dice'/);
 assert.match(printer,/function createPlacementPdf\(/);
 assert.match(printer,/SVG保存/);assert.match(printer,/PNG保存/);
 assert.doesNotMatch(adapter,/'presetSnapToggle','printPlacement'/);
 assert.match(style,/body\.tabula-dice-mode #printPlacement\{display:inline-flex!important/);
});
test('custom die labels are editable and retained in results, snapshots, and 2D diagram',()=>{
 const engine=file('js/dice-table-engine.js'),printer=file('js/placement-print.js'),model=file('js/tabula.js');
 assert.match(engine,/name\.className='dice-custom-label'/);
 assert.match(engine,/maxLength=36/);
 assert.match(engine,/userLabel:typeof d\.userLabel==='string'/);
 assert.match(engine,/function refreshFloatingLabels\(/);
 assert.match(engine,/function positionFloatingLabels\(/);
 assert.match(engine,/positionFloatingLabels\(\);/);
 assert.match(engine,/d\.userLabel\+' · D'/);
 assert.match(printer,/TabulaDiceLabels\.labelFor\(saved,i,prefs\.mode\)/);
 assert.match(model,/d\.settings\[i\]\?\.userLabel/);
});

test('dice tabletop labels are driven by TABULA existing label mode and placement',()=>{
 const engine=file('js/dice-table-engine.js'),model=file('js/tabula.js');
 assert.match(engine,/TabulaDiceLabels\.preferences\(document\)/);
 assert.match(engine,/TabulaDiceLabels\.labelFor/);
 assert.match(file('js/dice-labels.js'),/getElementById\('labelPlacement'\)/);
 assert.match(file('js/dice-labels.js'),/mode==='off'/);
 assert.match(file('js/dice-labels.js'),/mode==='positionPlain'/);
 assert.match(file('js/dice-labels.js'),/mode==='number'/);
 assert.match(model,/isDiceTool\(activeToolId\(\)\)&&labelMode==='card'\?'ダイス名'/);
});

test('mixing is momentary hold-to-mix on both physical and quick action buttons',()=>{
 const engine=file('js/dice-table-engine.js'),adapter=file('js/dice-workspace.js');
 assert.match(engine,/function startMix\(/);
 assert.match(engine,/function stopMix\(/);
 assert.match(engine,/pointerdown/);
 assert.match(engine,/pointerup/);
 assert.match(engine,/pointercancel/);
 assert.match(engine,/lostpointercapture/);
 assert.match(engine,/visibilitychange/);
 assert.match(engine,/bindMixHold\(mixButton\)/);
 assert.match(engine,/bindMixHold\(document\.getElementById\('diceQuickMix'\)\)/);
 assert.doesNotMatch(engine,/mixButton\.addEventListener\('click',mixDice\)/);
 assert.match(adapter,/if\(i!==1\)button\.addEventListener/);
});
test('dice placement names match the existing toolbar label mode and placement',()=>{
 const labels={},code=file('js/dice-labels.js');
 new Function('globalThis',code)(labels);
 const dice={mode:'normal',settings:[{userLabel:'過去'},{userLabel:'現在'}]};
 assert.equal(labels.TabulaDiceLabels.labelFor(dice,0,'off'),'');
 assert.equal(labels.TabulaDiceLabels.labelFor(dice,0,'card'),'過去');
 assert.equal(labels.TabulaDiceLabels.labelFor(dice,0,'position'),'1 · 過去');
 assert.equal(labels.TabulaDiceLabels.labelFor(dice,1,'number'),'2');
 assert.equal(labels.TabulaDiceLabels.labelFor({mode:'astro',settings:[]},1,'card'),'十二宮');
 assert.match(file('js/placement-print.js'),/TabulaDiceLabels\.preferences\(document\)/);
 assert.match(file('js/placement-print.js'),/TabulaDiceLabels\.labelFor\(saved,i,prefs\.mode\)/);
 assert.match(file('table.html'),/js\/dice-labels\.js\?v=0732/);
});

test('normal dice edits preserve the other outcomes and keep cosmetic edits in place',()=>{
 const engine=file('js/dice-table-engine.js');
 const render=engine.slice(engine.indexOf('function renderSettings()'),engine.indexOf('function renderNormalEditor('));
 const run=new Function(`
  let ready=true,rolling=false,mixing=false,current={id:'normal'};
  const host={};
  let recordedResults=[4,5],diceSettings=[{sides:6},{sides:6}],objects=[{},{}];
  let edit, replacement;
  const diceDOM={getElementById:()=>host};
  const refreshFloatingLabels=()=>{},syncMeshes=()=>{},emitDice=()=>{},destroyDie=()=>{};
  const addNormalObject=()=>({});
  const renderNormalEditor=(host,settings,change)=>{edit=change};
  const showResults=results=>{recordedResults=results};
  const replaceDieAppearance=(i,keepPose)=>{replacement=[i,keepPose]};
  ${render}
  renderSettings();
  edit(()=>{},'appearance',0);
  const appearance={results:recordedResults.slice(),replacement};
  edit(()=>{diceSettings[1].sides=12},'shape',1);
  const shape={results:recordedResults.slice(),replacement};
  edit(()=>diceSettings.push({sides:6}),'add',2);
  const added=recordedResults.slice();
  edit(()=>diceSettings.splice(1,1),'remove',1);
  return {appearance,shape,added,removed:recordedResults,objects:objects.length};
 `);
 assert.deepEqual(run(),{
  appearance:{results:[4,5],replacement:[0,true]},
  shape:{results:[4,null],replacement:[1,false]},
  added:[4,null,null],removed:[4,null],objects:2
 });
});
test('ring grooves and highlights share the selected ground color',()=>{
 const engine=file('js/dice-table-engine.js');
 const helper=engine.slice(engine.indexOf('function ringInk('),engine.indexOf('function drawCarvedNumeral('));
 const ink=new Function(helper+'return ringInk')();
 assert.equal(ink('#476f83',-.69),'rgba(22,34,41,1)');
 assert.equal(ink('#476f83',.34),'rgba(134,160,173,1)');
 assert.notEqual(ink('#476f83',-.69),ink('#914c4c',-.69));
});

test('D6 numerals route through the chosen finish and keep the point defaults',()=>{
 const engine=file('js/dice-table-engine.js');
 const source=engine.slice(engine.indexOf('function cubeFaceTexture('),engine.indexOf('function makeDie('));
 const styles=engine.slice(engine.indexOf('function normalFaceStyle('),engine.indexOf('function renderNormalEditor('));
 const texture=new Function(`
  const numberTexture=(...args)=>['number',...args];
  const faceTexture=(...args)=>['points',...args];
  const ringNumberTexture=(...args)=>['ring number',...args];
  const finishTexture=(...args)=>['finish',...args];
  const ichingTexture=(...args)=>['I Ching',...args];
  ${styles}
  ${source}
  return cubeFaceTexture;
 `)();
 const color='#c7b48d';
 assert.deepEqual(texture(4,{color,surface:'standard'},0),['points',4,color]);
 assert.deepEqual(texture(4,{color,surface:'standard',faceStyle:'numerals'},0),['number',4,color,6]);
 assert.deepEqual(texture(4,{color,surface:'ring'},0),['finish',4,color,'ring',0,false,'ring']);
 assert.deepEqual(texture(4,{color,surface:'ring',faceStyle:'numerals'},0),['ring number',4,color,6,142,3,'ring']);
 assert.deepEqual(texture(4,{color,surface:'ivory',faceStyle:'numerals'},0),['finish',4,color,'ivory',0,true]);
 assert.deepEqual(texture(1,{markings:'engraved',faces:['初'],ink:'#000000'},0),['I Ching','初',0,'#000000']);
 assert.match(engine,/faceStyle:normalFaceStyle\(d\)/);
 assert.deepEqual(texture(4,{color,surface:'ivory',faceStyle:'ring-numerals'},0),['ring number',4,color,6,142,3,'ivory']);
});

test('tabletop clicks inspect the frontmost die or leave the table unchanged in inspection mode',()=>{
 const source=file('js/dice-table-engine.js');
 const start=source.indexOf('felt.addEventListener(\'click\',event=>{');
 const end=source.indexOf('felt.addEventListener(\'keydown\'',start);
 assert.ok(start>=0&&end>start);
 const calls=[];
 function click({inspecting,hit=0,held=false,results=[4,2],suppressed=false}){
  const felt={addEventListener(_event,callback){callback({})}};
  const window={TabulaTableTools:{openDiceDetail(detail,origin){
   assert.equal(origin,felt);calls.push(detail);
  }}};
  Function('felt','window','inspectingDice','recordedResults','pickTableDie','dieDetail',
   'held','collectDice','releaseDice','suppressClick',source.slice(start,end))(
    felt,window,inspecting,results,()=>hit,i=>'die '+results[i],
    held,()=>calls.push('collect'),()=>calls.push('roll'),suppressed);
 }
 click({inspecting:true,hit:1});
 click({inspecting:true,hit:-1});
 click({inspecting:true,results:[null]});
 click({inspecting:true,held:true,hit:-1});
 click({inspecting:true,suppressed:true});
 click({inspecting:false});
 click({inspecting:false,held:true});
 assert.deepEqual(calls,['die 2','collect','roll']);
});

test('dice messages share the under-table status position',()=>{
 const page=file('table.html'),adapter=file('js/dice-workspace.js');
 assert.match(page,/class="status table-status" id="dice-status" role="status"/);
 assert.match(adapter,/getElementById\('status'\)\.after\(document\.getElementById\('dice-status'\)\)/);
});

test('dice size changes retain the current snapshot and respect limits and lock state',()=>{
 const engine=file('js/dice-table-engine.js');
 const source=engine.slice(engine.indexOf('function changeDiceSize('),engine.indexOf('function emitDice('));
 const saved={settings:[{sides:6}],results:[4],held:false};
 const calls=[];
 const build=Function('ready','rolling','mixing','inspectingDice','diceSizePercent','captureDice','restoreDice','emitDice','current','status','MIN_DICE_SIZE','MAX_DICE_SIZE','DEFAULT_DICE_SIZE',source+'return changeDiceSize');
 const change=(size,delta,reset=false,rolling=false)=>build(true,rolling,false,false,()=>size,()=>saved,(snapshot,id,next)=>{
  assert.equal(snapshot,saved);
  calls.push([id,next]);
 },()=>{}, {id:'normal'},{},100,200,160)(delta,reset);
 change(200,-20);
 change(110,-20);
 change(100,-20);
 change(120,0,true);
 change(160,-20,false,true);
 assert.deepEqual(calls,[['normal',180],['normal',100],['normal',160]]);
});
