import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source=readFileSync(new URL('../js/spread-store.js',import.meta.url),'utf8');
const storageSource=readFileSync(new URL('../js/storage-format.js',import.meta.url),'utf8');
const context={};
runInNewContext(storageSource,context);
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
  const rows=Array.from({length:520},(_,i)=>({id:'custom_'+i,slots:[]}));
  storage.setItem('spread_key',JSON.stringify(rows));
  assert.equal(store.read(storage,'spread_key').length,500);
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

test('portable identity, revisions, local groups and pack round trip',()=>{
 const identitySource=readFileSync(new URL('../js/content-identity.js',import.meta.url),'utf8');
 let n=0;const ctx={crypto:{randomUUID:()=>`00000000-0000-4000-8000-${(++n).toString(16).padStart(12,'0')}`}};
 runInNewContext(identitySource,ctx);runInNewContext(storageSource,ctx);runInNewContext(source,ctx);
 const I=ctx.TabulaContentIdentity,S=ctx.TabulaSpreadStore,storage=memoryStorage(),creator=I.load(storage);
 assert.equal(I.load(storage).id,creator.id);
 const first=S.prepareLibrary([{id:'custom_a',name:'A',slots:[{x:10,y:20,angle:0,name:'Past'}]}],[],creator)[0];
 const changed=S.prepareLibrary([{...first,name:'B'}],[first],creator)[0];
 assert.equal(changed.identity.id,first.identity.id);
 assert.equal(changed.identity.revision,2);
 assert.notEqual(changed.identity.revisionId,first.identity.revisionId);
 const grouped=S.prepareLibrary([{...changed,groups:[{id:I.uuid(),name:'Research'}]}],[changed],creator)[0];
 assert.equal(grouped.identity.revisionId,changed.identity.revisionId);
 const other={...creator,id:I.uuid()};
 const fork=S.prepareLibrary([{...changed,name:'Fork'}],[changed],other)[0];
 assert.notEqual(fork.identity.id,changed.identity.id);
 assert.equal(fork.identity.derivedFrom.id,changed.identity.id);
 assert.equal(fork.identity.creator.id,other.id);
 const pack=S.exportPack({id:creator.libraryPackId,name:'Pack',creator},[grouped]);
 const loaded=S.importBundle(JSON.parse(JSON.stringify(pack)))[0];
 assert.equal(loaded.spread.identity.id,grouped.identity.id);
 assert.equal(loaded.pack.id,creator.libraryPackId);
 assert.equal(S.importPortable(S.exportPortable(grouped)).identity.id,grouped.identity.id);
 assert.equal(S.validLibrary([first,{...first,id:'custom_b'}]),false);
 assert.equal(S.validLibrary([first,{...fork,id:'custom_d'}]),true);
 assert.throws(()=>S.importBundle({...pack,spreads:[pack.spreads[0],pack.spreads[0]]}));
});

test('pack redistribution preserves identity and content independently of local edits',()=>{
 const identitySource=readFileSync(new URL('../js/content-identity.js',import.meta.url),'utf8');
 let n=0;const ctx={crypto:{randomUUID:()=>`00000000-0000-4000-8000-${(++n).toString(16).padStart(12,'0')}`}};
 runInNewContext(identitySource,ctx);runInNewContext(storageSource,ctx);runInNewContext(source,ctx);
 const I=ctx.TabulaContentIdentity,S=ctx.TabulaSpreadStore,storage=memoryStorage(),creator=I.load(storage);
 const first=S.prepareLibrary([{id:'custom_a',name:'A',slots:[{x:10,y:20,angle:0,name:'Past'}]}],[],creator)[0];
 const pack=S.newPack('Pack',creator,[first]);
 const duplicateTitle=S.newPack('Pack',creator,[first]);
 assert.notEqual(pack.pack.id,duplicateTitle.pack.id);
 const import1=S.stagePacks([], [pack]);
 assert.equal(import1.added,1);
 const import2=S.stagePacks(import1.packs,[JSON.parse(JSON.stringify(pack))]);
 assert.equal(import2.added,0);
 assert.equal(import2.unchanged,1);
 assert.equal(import2.packs.length,1);
 const edited=S.prepareLibrary([{...first,name:'Edited'}],[first],creator)[0];
 const altered=S.exportPack(pack.pack,[edited]);
 const conflict=S.stagePacks(import2.packs,[altered]);
 assert.equal(conflict.conflicts,1);
 assert.equal(conflict.accepted.length,0);
 assert.equal(conflict.packs[0].spreads[0].name,'A');
 assert.equal(conflict.packs[0].pack.id,pack.pack.id);
 assert.equal(S.stagePacks(conflict.packs,[duplicateTitle]).packs.length,2);
 storage.setItem(S.PACK_LIBRARY_KEY,JSON.stringify(conflict.packs));
 assert.equal(S.readPacks(storage)[0].pack.id,pack.pack.id);
 assert.throws(()=>S.normalizePackLibrary([pack,pack]));
});

test('table geometry uses the same bounds for readings and portable spreads',()=>{
 const spread={id:'custom_bounds',name:'Altar',slots:[{x:95.649,y:-3.879,angle:0,name:'Top'},{x:96.592,y:103.711,angle:360,name:'Bottom'}]};
 assert.equal(store.validSpread(spread),true);
 const restored=store.importPortable(store.exportPortable(spread));
 assert.deepEqual(JSON.parse(JSON.stringify(restored.slots)),spread.slots);
 for(const x of [-200,300]){
  const v={...spread,slots:[{x,y:x,angle:0,name:'Boundary'}]};
  assert.equal(store.validSpread(v),true);
  assert.equal(context.TabulaStorage.validateReading({placed:[{id:'a',x,y:x,angle:0}]}),true);
  assert.doesNotThrow(()=>store.exportPortable(v));
 }
 for(const x of [-200.01,300.01,NaN,Infinity,'10']){
  const v={...spread,slots:[{x,y:10,angle:0,name:'Invalid'}]};
  assert.equal(store.validSpread(v),false);
  assert.equal(context.TabulaStorage.validateReading({placed:[{id:'a',x,y:10,angle:0}]}),false);
  assert.throws(()=>store.exportPortable(v));
 }
 assert.throws(()=>store.importPortable({format:'tabula-sortium',kind:'reading',version:1}),/占例ファイル/);
});
