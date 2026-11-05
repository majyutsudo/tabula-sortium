// Run with: node --test tests/storage-schema-contract.test.mjs
// Static regression checks; not a substitute for browser-level round-trip tests.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
assert.match(html, /<link rel="stylesheet" href="css\/tabula\.css">/);
assert.match(html, /<script src="js\/storage-format\.js"><\/script><script src="js\/catalog\.js"><\/script><script src="js\/spread-store\.js"><\/script><script src="js\/spread-geometry\.js"><\/script><script src="js\/card-rules\.js"><\/script><script src="js\/shuffle\.js"><\/script><script src="js\/reading-history\.js"><\/script><script src="js\/ui-format\.js"><\/script><script src="js\/tabula\.js"><\/script>/);
const css = readFileSync(new URL('../css/tabula.css', import.meta.url), 'utf8');
const code = readFileSync(new URL('../js/tabula.js', import.meta.url), 'utf8');
const storageCode = readFileSync(new URL('../js/storage-format.js', import.meta.url), 'utf8');
const catalogCode = readFileSync(new URL('../js/catalog.js', import.meta.url), 'utf8');
const spreadCode = readFileSync(new URL('../js/spread-store.js', import.meta.url), 'utf8');
const geometryCode = readFileSync(new URL('../js/spread-geometry.js', import.meta.url), 'utf8');
const cardRulesCode = readFileSync(new URL('../js/card-rules.js', import.meta.url), 'utf8');
const shuffleCode = readFileSync(new URL('../js/shuffle.js', import.meta.url), 'utf8');
const historyCode = readFileSync(new URL('../js/reading-history.js', import.meta.url), 'utf8');
const uiFormatCode = readFileSync(new URL('../js/ui-format.js', import.meta.url), 'utf8');

test('application script remains syntactically valid', () => {
  assert.doesNotThrow(() => new Script(code));
  assert.doesNotThrow(() => new Script(storageCode));
  assert.doesNotThrow(() => new Script(catalogCode));
  assert.doesNotThrow(() => new Script(spreadCode));
  assert.doesNotThrow(() => new Script(geometryCode));
  assert.doesNotThrow(() => new Script(cardRulesCode));
  assert.doesNotThrow(() => new Script(shuffleCode));
  assert.doesNotThrow(() => new Script(historyCode));
  assert.doesNotThrow(() => new Script(uiFormatCode));
});

test('workspace has a declared v1 schema and both storage write paths include it', () => {
  assert.match(storageCode, /const schemaVersion=1/);
  assert.match(code, /const STORAGE_SCHEMA_VERSION=TabulaStorage\.schemaVersion/);
  const writes = [...code.matchAll(/localStorage\.setItem\(KEY,JSON\.stringify\(\{([^}]+)\}\)\)/g)];
  assert.equal(writes.length, 2);
  for (const write of writes) assert.match(write[1], /schemaVersion:STORAGE_SCHEMA_VERSION/);
});

test('JSON export version and type guard are preserved', () => {
  assert.match(code, /const EXPORT_FORMAT='tabula-sortium'/);
  assert.match(code, /kind:'reading'/);
  assert.match(code, /kind:'backup'/);
  assert.match(code, /data\.version!==1/);
  assert.match(code, /workspace:\{schemaVersion:STORAGE_SCHEMA_VERSION/);
});

test('retired configuration migrations do not return', () => {
  for (const retired of ['migrateClothSettings', 'oldPaletteMap', 'paletteVersion',
    'tabula_card_size_v1', "settings.cardDesign==='tabula'",
    "r.id!=='seven3'", "r.id!=='washover'"]) {
    assert.ok(!code.includes(retired), `obsolete conversion still present: ${retired}`);
  }
});

test('active local storage keys remain stable', () => {
  for (const key of ['tabula_sortium_v01','tabula_sortium_history_v034',
    'tabula_sortium_spread_library_v1','tabula_card_size_v2']) {
    assert.ok(code.includes(key), `active key was renamed: ${key}`);
  }
});

test('separate stylesheet preserves mobile cockpit selectors', () => {
  assert.match(css, /\.mobile-cockpit-actions/);
  assert.match(css, /#desktopTableViews/);
  assert.match(css, /#spreadNotebook/);
});

test('storage rules are loaded before the main script', () => {
  const helper = html.indexOf('src="js/storage-format.js"');
  const app = html.indexOf('src="js/tabula.js"');
  assert.ok(helper >= 0 && app > helper);
  assert.match(code, /const validateReading=v=>TabulaStorage\.validateReading\(v,cards\)/);
  assert.match(code, /const fileNamePart=TabulaStorage\.fileNamePart/);
  assert.match(code, /const validCardSize=TabulaStorage\.validCardSize/);
});

test('card and spread catalogue is loaded before app', () => {
  const catalogueIndex=html.indexOf('src="js/catalog.js"');
  const appIndex=html.indexOf('src="js/tabula.js"');
  assert.ok(catalogueIndex>=0&&appIndex>catalogueIndex);
  assert.match(code, /const \{majors,suitDefs,ranks,cards\}=TabulaCatalog/);
  assert.match(code, /const \{presets,colors\}=TabulaCatalog/);
  assert.match(code, /const \{builtinSpreadCardSizes\}=TabulaCatalog/);
});

test('custom spread storage reads and writes through extracted helper', () => {
  assert.match(code, /TabulaSpreadStore\.read\(localStorage,SPREAD_LIBRARY_KEY\)/);
  assert.match(code, /TabulaSpreadStore\.write\(localStorage,SPREAD_LIBRARY_KEY,spreadLibrary\)/);
});

test('spread editor delegates geometry calculations', () => {
  assert.match(code, /TabulaSpreadGeometry\.placeOnCircle\(/);
  assert.match(code, /TabulaSpreadGeometry\.alignPositions\(/);
});

test('card operations call dedicated rule helpers', () => {
  assert.match(code, /TabulaCardRules\.selectCards\(/);
  assert.match(code, /TabulaCardRules\.getDealOrder\(/);
  assert.match(code, /TabulaCardRules\.parseDealOrderInput\(/);
  assert.match(code, /TabulaCardRules\.rotateAngle\(/);
});

test('shuffle calculations are delegated to independent module', () => {
  assert.match(code, /TabulaShuffle\.washSequence/);
  assert.match(code, /TabulaShuffle\.riffleSequence/);
  assert.match(code, /TabulaShuffle\.cutLengths\(/);
  assert.match(code, /TabulaShuffle\.restack\(/);
});

test('reading history is serialized by dedicated module', () => {
  assert.match(code, /TabulaReadingHistory\.read\(localStorage,HISTORY_KEY\)/);
  assert.match(code, /TabulaReadingHistory\.write\(localStorage,HISTORY_KEY,snapshots\)/);
  assert.match(code, /TabulaReadingHistory\.createSnapshot\(/);
});

test('presentation formatting delegates to the UI helper', () => {
  assert.match(code, /TabulaUiFormat\.spreadThumb/);
  assert.match(code, /TabulaUiFormat\.snapshotSummary/);
  assert.match(code, /TabulaUiFormat\.snapshotFace\(p,cards\)/);
  assert.match(code, /TabulaUiFormat\.cardDisplayRotation\(item,settings\.spread\)/);
});

test('in-app help matches the published version and distinguishes reading import from backup', () => {
  const version = html.match(/<title>TABULA SORTIUM (v[0-9.]+)/)?.[1];
  assert.ok(version, 'page title contains version');
  assert.ok(code.includes('TABULA SORTIUM ' + version + ' —'), 'help version differs from page title');
  assert.match(code, /単独の占例JSONは記録一覧に追加され/);
  assert.match(code, /全データのバックアップJSONは/);
});
