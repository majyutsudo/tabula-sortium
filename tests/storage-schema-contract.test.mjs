// TABULA SORTIUM — current static contracts, independent of asset cache versions.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const html=read('index.html');
const code=read('js/tabula.js');
const css=read('css/tabula.css');
const storage=read('js/storage-format.js');
const identity=read('js/physical-identity.js');
const modules=[
 'storage-format','physical-identity','multi-workspace','catalog',
 'spread-store','spread-geometry','spread-encyclopedia','deck-store',
 'deck-blueprint','card-rules','shuffle','reading-history','ui-format',
 'deal-workflow','mathers-first-method','deal-workbench','card-snap','tabula'
];
test('CSS and ordered JS dependencies resolve with cache-versioned paths',()=>{
 assert.match(html,/href="css\/tabula\.css(?:\?v=\d+)?"/);
 let last=-1;
 for(const name of modules){
  const path='js/'+name+'.js';
  const at=html.indexOf('src="'+path);
  assert.ok(at>last,'missing or out-of-order module: '+path);
  last=at;
  assert.doesNotThrow(()=>new Script(read(path)),path);
 }
});
test('workspace storage schema remains declared and included in saves',()=>{
 assert.match(storage,/const schemaVersion=1/);
 assert.match(code,/const STORAGE_SCHEMA_VERSION=TabulaStorage\.schemaVersion/);
 assert.match(code,/schemaVersion:STORAGE_SCHEMA_VERSION/);
 assert.match(code,/localStorage\.setItem\(KEY,JSON\.stringify/);
 assert.match(code,/TabulaStorage\.supportsSchema\(data\.schemaVersion\)/);
});
test('single-table physical identity survives save, reload, collection and new readings',()=>{
 assert.match(identity,/function ensureSingle\(/);
 assert.match(identity,/function nextReading\(/);
 assert.match(identity,/function preserveCard\(/);
 assert.match(code,/TabulaPhysicalIdentity\.ensureSingle\(persistedState\)/);
 assert.match(code,/state=TabulaPhysicalIdentity\.ensureSingle\(/);
 assert.match(code,/TabulaPhysicalIdentity\.nextReading\(state,selectedCards\(\)/);
 assert.match(code,/state\.placed\.map\(TabulaPhysicalIdentity\.preserveCard\)/);
});
test('backup, history, spreads and auxiliary state use established storage keys',()=>{
 for(const key of ['tabula_sortium_v01','tabula_sortium_history_v034',
  'tabula_sortium_spread_library_v1','tabula_card_size_v2']){
  assert.ok(code.includes(key),'missing storage key '+key);
 }
 assert.match(code,/const EXPORT_FORMAT='tabula-sortium'/);
 assert.match(code,/kind:'reading'/);
 assert.match(code,/kind:'backup'/);
 assert.match(code,/backupMultiWorkspace\(/);
 assert.match(code,/TabulaReadingHistory\.createSnapshot\(/);
});
test('separate helper modules are still delegated to from the main app',()=>{
 for(const expression of [
  /TabulaCardRules\.selectCards\(/,/TabulaCardRules\.getDealOrder\(/,
  /TabulaSpreadStore\.read\(/,/TabulaSpreadGeometry\.placeOnCircle\(/,
  /TabulaShuffle\.restack\(/,/TabulaUiFormat\.spreadThumb/,
  /TabulaDeckBlueprint\./,/TabulaMultiWorkspace\.validate\(/]){
  assert.match(code,expression);
 }
});
test('table control and responsive CSS selectors remain present',()=>{
 for(const selector of ['.mobile-cockpit-actions','#desktopTableViews','#spreadNotebook','.table-action-settings'])assert.ok(css.includes(selector));
 for(const id of ['quickWash','quickShuffle','quickCut','quickDeal','quickOpen','openAbout'])assert.ok(html.includes('id="'+id+'"'));
 assert.match(html,/TABULA SORTIUM v0\.\d+/);
});
