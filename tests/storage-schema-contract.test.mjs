// Run with: node --test tests/storage-schema-contract.test.mjs
// Static regression checks; not a substitute for browser-level round-trip tests.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const match = html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(match, 'inline application script exists');
const code = match[1];

test('application script remains syntactically valid', () => {
  assert.doesNotThrow(() => new Script(code));
});

test('workspace has a declared v1 schema and both storage write paths include it', () => {
  assert.match(code, /const STORAGE_SCHEMA_VERSION=1/);
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
