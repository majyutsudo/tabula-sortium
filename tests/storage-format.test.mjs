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

test('portable readings retain independent IDs and saved card names without a catalogue',()=>{
  const reading={placed:[{id:'c_spades_r2',x:20,y:30}],deck:[{id:'c_hearts_r1'}],
    removed:[{id:'c_clubs_r1'}],cardNames:['吊り橋']};
  assert.equal(storage.validateReading(reading),true);
  assert.equal(storage.validateReading({...reading,cardNames:[]}),false);
  assert.equal(storage.validateReading({...reading,removed:[{}]}),false);
  assert.equal(storage.validateReading({...reading,dealCheckpoint:[{}]}),false);
});

test('restore requires the same full inventory with no duplicate cards',()=>{
  const reading={placed:[{id:'c_spades_r2',x:20,y:30}],deck:[{id:'c_hearts_r1'}],
    removed:[{id:'c_clubs_r1'}],dealCheckpoint:[{id:'c_clubs_r1'},{id:'c_hearts_r1'}]};
  const substitute=['c_hearts_r1','c_spades_r2','c_clubs_r1'].map(id=>({id,name:'別の表示名'}));
  assert.equal(storage.matchesDeck(reading,substitute),true);
  assert.equal(storage.matchesDeck(reading,[...substitute,{id:'joker'}]),false);
  assert.equal(storage.matchesDeck(reading,[...substitute.slice(0,2),{id:'joker'}]),false);
  assert.equal(storage.matchesDeck({...reading,deck:[{id:'c_spades_r2'}]},substitute),false);
  assert.equal(storage.matchesDeck({...reading,dealCheckpoint:[{id:'joker'}]},substitute),false);
  assert.equal(storage.matchesDeck({...reading,dealCheckpoint:[{id:'c_hearts_r1'},{id:'c_hearts_r1'}]},substitute),false);
});
