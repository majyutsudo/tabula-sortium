import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source=readFileSync(new URL('../js/shuffle.js',import.meta.url),'utf8');
const sandbox={};
runInNewContext(source,sandbox);
const shuffle=sandbox.TabulaShuffle;
const makeDeck=n=>Array.from({length:n},(_,i)=>({id:'card_'+i,reversed:i%2===0}));
function assertPermutation(before,after){
  assert.equal(after.length,before.length,'card count changed');
  assert.equal(new Set(after.map(c=>c.id)).size,before.length,'duplicate or lost cards');
  assert.deepEqual(Array.from(after,c=>c.id).sort(),Array.from(before,c=>c.id).sort(),'card identities changed');
  for(const c of after){
    const original=before.find(x=>x.id===c.id);
    assert.equal(c,original,'card object changed');
    assert.equal(c.reversed,original.reversed,'reversal flag changed');
  }
}

test('all shuffles retain every card and its reversal state',()=>{
  const variations=[
    ['wash random',deck=>shuffle.washSequence(deck,'random')],
    ['wash clockwise',deck=>shuffle.washSequence(deck,'cw')],
    ['wash counter-clockwise',deck=>shuffle.washSequence(deck,'ccw')],
    ['wash alternate',deck=>shuffle.washSequence(deck,'alternate',1)],
    ['riffle',deck=>shuffle.riffleSequence(deck)],
    ['riffle manual',deck=>shuffle.riffleSequence(deck,true)],
    ['overhand',deck=>shuffle.overhandSequence(deck)],
    ['overhand manual',deck=>shuffle.overhandSequence(deck,true,7)],
    ['pile',deck=>shuffle.pileSequence(deck,4)],
    ['pile 12',deck=>shuffle.pileSequence(deck,12)],
    ['randomize',deck=>shuffle.randomize(deck.slice())]
  ];
  for(const [name,operation] of variations){
    for(const count of [0,1,2,7,22,52,78]){
      const before=makeDeck(count);
      const after=operation(before);
      try{assertPermutation(before,after)}catch(e){e.message=name+' / '+count+': '+e.message;throw e}
    }
  }
});

test('registered shuffle steps conserve identities',()=>{
  const methods=['wash','hindu','overhand','riffle','pile'];
  for(const method of methods)for(const manual of [false,true]){
    const deck=makeDeck(78);
    const step={method,groups:4,washDirection:'cw'};
    assertPermutation(deck,shuffle.applyShuffleMethod(deck,step,manual,0));
  }
});

test('cut creates nonempty piles and restacks in chosen order',()=>{
  for(const n of [2,3,22,52,78])for(const count of [2,3,4,8].filter(v=>v<=n)){
    const deck=makeDeck(n);
    const sizes=shuffle.cutLengths(n,count);
    assert.equal(sizes.length,count);
    assert.equal(sizes.reduce((a,b)=>a+b,0),n);
    assert.ok(sizes.every(x=>x>=1));
    const reversed=Array.from({length:count},(_,i)=>count-1-i);
    const restacked=shuffle.restack(deck,sizes,reversed);
    assertPermutation(deck,restacked);
    const piles=[];let offset=0;
    for(const size of sizes){piles.push(deck.slice(offset,offset+size));offset+=size}
    assert.deepEqual(restacked.map(x=>x.id),reversed.flatMap(i=>piles[i].map(x=>x.id)));
  }
});

test('shuffle recipe normalization retains existing limits',()=>{
  const methods={wash:'ウォッシュ',hindu:'ヒンズー',overhand:'オーバーハンド',riffle:'リフル',pile:'パイル'};
  const a=shuffle.normStep({method:'pile',reps:200,groups:20},methods);
  assert.equal(a.reps,100);assert.equal(a.groups,12);
  const b=shuffle.normStep({method:'unknown',groups:-3,washDirection:'unknown'},methods);
  assert.equal(b.method,'hindu');assert.equal(b.washDirection,'random');
});
