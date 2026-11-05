import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source=readFileSync(new URL('../js/storage-format.js', import.meta.url),'utf8');
const context={};runInNewContext(source,context);
const storage=context.TabulaStorage;

test('storage helper exposes current schema rules',()=>{
  assert.equal(storage.schemaVersion,1);
  assert.equal(storage.supportsSchema(1),true);
  assert.equal(storage.supportsSchema(undefined),true);
  assert.equal(storage.supportsSchema(2),false);
});
test('size validation has exact accepted bounds',()=>{
  for(const size of [.8,1,1.75,2.3])assert.equal(storage.validCardSize(size),true);
  for(const size of [.79,2.31,'1.3',null,NaN,Infinity])assert.equal(storage.validCardSize(size),false);
});
test('reading validation retains card IDs, slots, and coordinate rules',()=>{
  const cards=[{id:'major_00'},{id:'major_01'}];
  const good={placed:[{id:'major_00',x:20,y:30,slot:0,angle:0}],deck:[{id:'major_01',reversed:false}]};
  assert.equal(storage.validateReading(good,cards),true);
  assert.equal(storage.validateReading({...good,placed:[{...good.placed[0],id:'unknown'}]},cards),false);
  assert.equal(storage.validateReading({...good,placed:[{...good.placed[0],x:400}]},cards),false);
  assert.equal(storage.validateReading({...good,deck:[{id:'unknown'}]},cards),false);
  assert.equal(storage.validateReading({...good,placed:'invalid'},cards),false);
});
test('JSON filenames are sanitized without losing Unicode',()=>{
  assert.equal(storage.fileNamePart('星 / 月: 占い'),'星___月__占い');
  assert.equal(storage.fileNamePart(''), 'reading');
});
