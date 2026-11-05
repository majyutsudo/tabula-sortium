import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source=readFileSync(new URL('../js/ui-format.js',import.meta.url),'utf8');
const context={};
runInNewContext(source,context);
const ui=context.TabulaUiFormat;
const cards=[
  {id:'major_00',number:0,name:'愚者',group:'major'},
  {id:'cups_11',number:11,name:'杯のペイジ',group:'court',suit:'cups'},
  {id:'swords_03',number:3,name:'剣の3',group:'minor',suit:'swords'}
];

test('saved reading summaries retain conventional spread labels',()=>{
  assert.equal(ui.snapshotSummary({placed:[{},{}],spread:'three'}),'2枚 ／ 3枚引き');
  assert.equal(ui.snapshotSummary({placed:[{}],spread:'one'}),'1枚 ／ 1枚引き');
  assert.equal(ui.snapshotSummary({placed:Array(10).fill({}),spread:'celtic'}),'10枚 ／ ケルト十字');
  assert.equal(ui.snapshotSummary({placed:[],spread:'custom_sample'}),'0枚 ／ 自由配置');
});

test('card display names retain ranks, suits and unknown-card fallback',()=>{
  assert.equal(ui.snapshotFace({id:'major_00'},cards),'0 愚者');
  assert.equal(ui.snapshotFace({id:'cups_11'},cards),'杯 P');
  assert.equal(ui.snapshotFace({id:'swords_03'},cards),'剣 3');
  assert.equal(ui.snapshotFace({id:'unknown'},cards),'不明');
});

test('spread thumbnail preserves SVG presentation for slot geometry',()=>{
  const svg=ui.spreadThumb([{x:50,y:50,angle:45},{x:10,y:20,angle:0}]);
  assert.match(svg,/<svg viewBox="0 0 90 67"/);
  assert.equal((svg.match(/<rect /g)||[]).length,3);
  assert.match(svg,/rotate\(45 /);
});

test('card face orientation handles reversed and crossing cards',()=>{
  assert.equal(ui.cardDisplayRotation({slot:0,angle:20,reversed:false,faceUp:true},'three'),20);
  assert.equal(ui.cardDisplayRotation({slot:0,angle:20,reversed:true,faceUp:true},'three'),200);
  assert.equal(ui.cardDisplayRotation({slot:1,angle:90,reversed:false,faceUp:true},'celtic'),80);
  assert.equal(ui.cardDisplayRotation({slot:1,angle:90,reversed:true,faceUp:true},'celtic'),260);
  assert.equal(ui.cardDisplayRotation({slot:1,angle:90,reversed:true,faceUp:false},'celtic'),90);
});
