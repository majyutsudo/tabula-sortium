import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source=readFileSync(new URL('../js/spread-store.js',import.meta.url),'utf8');
const context={};
runInNewContext(source,context);
const store=context.TabulaSpreadStore;

function memoryStorage(){
  const map=new Map();
  return {
    getItem:key=>map.get(key)??null,
    setItem:(key,value)=>{map.set(key,value)}
  };
}
test('valid custom spread preserves name, geometry, and card size',()=>{
  const spread={id:'custom_test',name:'My Spread',cardSize:1.3,slots:[{x:10,y:20,angle:0,name:'Past'}]};
  assert.equal(store.validSpread(spread),true);
  const storage=memoryStorage();
  store.write(storage,'spread_key',[spread]);
  const restored=store.read(storage,'spread_key');
  assert.equal(restored.length,1);
  assert.deepEqual(JSON.parse(JSON.stringify(restored[0])),spread);
});
test('corrupt and invalid persisted spreads are ignored',()=>{
  const storage=memoryStorage();
  storage.setItem('spread_key','{bad');
  assert.equal(store.read(storage,'spread_key').length,0);
  const invalid={id:'custom_bad',slots:[{x:NaN,y:20,angle:0}]};
  assert.equal(store.validSpread(invalid),false);
  storage.setItem('spread_key',JSON.stringify([{id:'bad',slots:[{x:20,y:20}]}, {id:'valid',slots:[]}]));
  assert.deepEqual(Array.from(store.read(storage,'spread_key'),v=>v.id),['valid']);
});
test('custom library limit is retained',()=>{
  const storage=memoryStorage();
  const rows=Array.from({length:120},(_,i)=>({id:'custom_'+i,slots:[]}));
  storage.setItem('spread_key',JSON.stringify(rows));
  assert.equal(store.read(storage,'spread_key').length,100);
});

test('reading slots become a reusable spread with original order, names and details',()=>{
 const input={settings:{cardSize:1.45},placed:[{id:'major_00',x:90,y:90}],
  slots:[{x:30,y:20,angle:15,name:'第一・火',detail:'原因'},
   {x:70,y:40,angle:270,name:'第二・水',detail:'結末',frameRole:'tableau'}]};
 const spread=store.fromReading(input,'custom_shared','儀式のスプレッド');
 assert.equal(spread.id,'custom_shared');
 assert.equal(spread.name,'儀式のスプレッド');
 assert.equal(spread.cardSize,1.45);
 assert.deepEqual(JSON.parse(JSON.stringify(spread.slots)),input.slots);
 assert.equal(store.validSpread(spread),true);
 assert.equal(input.slots[0].name,'第一・火');
});
test('legacy free reading without slots can still register physical positions',()=>{
 const reading={placed:[{id:'major_01',x:21,y:34,angle:90,slot:1},
  {id:'major_00',x:72,y:54,angle:0,slot:0}],tablePiles:[],settings:{}};
 const spread=store.fromReading(reading,'custom_legacy','旧占例');
 assert.deepEqual(Array.from(spread.slots,p=>[p.x,p.y,p.name]),[[72,54,'位置1'],[21,34,'位置2']]);
 assert.equal('cardSize' in spread,false);
 assert.throws(()=>store.fromReading({placed:[],slots:[]},'custom_x','bad'));
});
