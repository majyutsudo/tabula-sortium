import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source=readFileSync(new URL('../js/card-rules.js',import.meta.url),'utf8');
const ctx={};runInNewContext(source,ctx);
const rules=ctx.TabulaCardRules;

const cards=[
  {id:'major_00',group:'major',suit:null},
  {id:'wands_01',group:'minor',suit:'wands'},
  {id:'cups_01',group:'minor',suit:'cups'},
  {id:'swords_11',group:'court',suit:'swords'}
];
const presets={one:[{},],three:[{},{},{}],free:[]};

test('card pools preserve suit, major, minor, court and custom semantics',()=>{
  const ids=(pool,custom=[])=>Array.from(rules.selectCards(cards,pool,custom),c=>c.id);
  assert.deepEqual(ids('all'),cards.map(c=>c.id));
  assert.deepEqual(ids('major'),['major_00']);
  assert.deepEqual(ids('minor'),['wands_01','cups_01','swords_11']);
  assert.deepEqual(ids('court'),['swords_11']);
  assert.deepEqual(ids('cups'),['cups_01']);
  assert.deepEqual(ids('custom',['cups_01','major_00']),['major_00','cups_01']);
});

test('dealing order accepts valid reorder and falls back on invalid saved data',()=>{
  const plain=(v)=>Array.from(v);
  assert.deepEqual(plain(rules.defaultDealOrder(presets,'three')),[0,1,2]);
  assert.deepEqual(plain(rules.getDealOrder(presets,'three',{three:[2,0,1]})),[2,0,1]);
  assert.deepEqual(plain(rules.getDealOrder(presets,'three',{three:[0,0,1]})),[0,1,2]);
  assert.deepEqual(plain(rules.getDealOrder(presets,'three',{three:[0,1]})),[0,1,2]);
  assert.deepEqual(plain(rules.parseDealOrderInput('3, 1, 2',presets,'three')),[2,0,1]);
  assert.deepEqual(plain(rules.parseDealOrderInput('3，1、2',presets,'three')),[2,0,1]);
  assert.deepEqual(plain(rules.parseDealOrderInput(' ',presets,'three')),[0,1,2]);
  assert.throws(()=>rules.parseDealOrderInput('1, 1, 3',presets,'three'),/重複/);
  assert.throws(()=>rules.parseDealOrderInput('1, 2',presets,'three'),/位置番号/);
});

test('card rotations preserve wraparound and reset',()=>{
  assert.equal(rules.rotateAngle(0,-90),270);
  assert.equal(rules.rotateAngle(345,30),15);
  assert.equal(rules.rotateAngle(270,90),0);
  assert.equal(rules.rotateAngle(25,0,true),0);
});
