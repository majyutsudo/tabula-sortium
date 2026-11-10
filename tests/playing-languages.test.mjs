import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const context={localStorage:{getItem:()=>null}};
context.globalThis=context;
runInNewContext(readFileSync(new URL('../js/deck-blueprint.js',import.meta.url),'utf8'),context);
const blueprint=context.TabulaDeckBlueprint,deck=blueprint.builtInPlaying;
const catalogue=blueprint.generate(deck);
const lookup=(suit,rank)=>catalogue.find(c=>c.suitId===suit&&c.rankId==='r'+rank);
test('playing-card language choices keep primary Japanese and five translations',()=>{
 assert.deepEqual(Array.from(blueprint.nameSets(deck),v=>v.id),['primary','en','fr','es','de','it']);
 assert.equal(blueprint.playingName(lookup('hearts',12),'primary'),'ハートのクイーン');
});
test('French-suited picture cards use localized rank and suit names',()=>{
 assert.equal(blueprint.playingName(lookup('spades',1),'en'),'Ace of Spades');
 assert.equal(blueprint.playingName(lookup('hearts',12),'fr'),'Dame de cœur');
 assert.equal(blueprint.playingName(lookup('clubs',11),'es'),'Jota de tréboles');
 assert.equal(blueprint.playingName(lookup('diamonds',13),'de'),'Karo-König');
 assert.equal(blueprint.playingName(lookup('hearts',13),'it'),'Re di cuori');
});
test('two jokers retain their identities across languages',()=>{
 const jokers=catalogue.filter(c=>c.kind==='joker');
 assert.equal(jokers.length,2);
 assert.equal(blueprint.playingName(jokers[0],'fr'),'Joker Ⅰ');
 assert.equal(blueprint.playingName(jokers[1],'en'),'Joker Ⅱ');
});
test('unknown translation leaves a card unchanged and does not alter its id',()=>{
 const ace=lookup('spades',1),id=ace.id;
 assert.equal(blueprint.playingName(ace,'bogus'),ace.name);
 assert.equal(ace.id,id);
});
