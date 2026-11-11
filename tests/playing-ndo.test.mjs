import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const source=readFileSync(new URL('../js/tabula.js',import.meta.url),'utf8');
const fn=source.match(/function orderedCardIds\(mode,deckId=settings\.deckId\)\{[\s\S]*?\n\}\nfunction sortPhysicalCards/);
assert.ok(fn,'orderedCardIds remains a named function');
const ctx={settings:{deckId:'playing-cards'},BUILTIN_PLAYING:{id:'playing-cards'},
 blueprintFor:()=>({id:'playing-cards'}),isPlayingBlueprint:()=>true};
runInNewContext(fn[0].replace(/\nfunction sortPhysicalCards$/,''),ctx);
const expected=['playing-joker-1','playing-joker-2'];
for(const [suit,desc] of [['spades',false],['diamonds',false],['clubs',true],['hearts',true]]){
 const ranks=Array.from({length:13},(_,i)=>i+1);
 if(desc)ranks.reverse();
 expected.push(...ranks.map(rank=>'c_'+suit+'_r'+rank));
}
test('NDO order follows jokers, spades ascending, diamonds ascending, clubs descending, hearts descending',()=>{
 assert.deepEqual(Array.from(ctx.orderedCardIds('ordered')),expected);
 assert.equal(expected.length,54);
});
