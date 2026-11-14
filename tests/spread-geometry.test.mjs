import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source=readFileSync(new URL('../js/spread-geometry.js',import.meta.url),'utf8');
const context={};
runInNewContext(source,context);
const g=context.TabulaSpreadGeometry;

test('angle normalization and circle facing preserve original conventions',()=>{
  assert.equal(g.normalizeAngle(-15),345);
  assert.equal(g.normalizeAngle(720),0);
  assert.equal(g.circleFacingAngle(0,'radial',17),0);
  assert.equal(g.circleFacingAngle(0,'inward',17),180);
  assert.equal(g.circleFacingAngle(0,'tangent',17),90);
  assert.equal(g.circleFacingAngle(0,'keep',-15),345);
});
test('alignment and spacing change only selected coordinates',()=>{
  const points=[{x:10,y:20},{x:40,y:60},{x:90,y:100}];
  g.alignPositions([points[0],points[2]],'x');
  assert.equal(points[0].x,50);
  assert.equal(points[2].x,50);
  assert.equal(points[1].x,40);
  g.alignPositions(points,'spaceY');
  assert.equal(points[0].y,20);
  assert.equal(points[1].y,60);
  assert.equal(points[2].y,100);
});
test('circle positions maintain orientation and use stage dimensions',()=>{
  const points=Array.from({length:4},()=>({x:0,y:0,angle:30}));
  g.placeOnCircle(points,[0,1,2,3],100,0,'radial',400,200);
  assert.ok(Math.abs(points[0].x-50)<1e-8);
  assert.ok(Math.abs(points[0].y-0)<1e-8);
  assert.ok(Math.abs(points[1].x-75)<1e-8);
  assert.ok(Math.abs(points[1].y-50)<1e-8);
  assert.equal(points[2].angle,180);
  const untouched=[{x:0,y:0,angle:-15}];
  g.placeOnCircle(untouched,[0],10,0,'keep',100,100);
  assert.equal(untouched[0].angle,-15);
});

test('standard cards expand a dense 9x4 grid while pocket cards keep existing slots',()=>{
 const grid=Array.from({length:4},(_,r)=>Array.from({length:9},(_,c)=>({x:14+9*c,y:15+19*r}))).flat();
 const original=JSON.stringify(grid);
 const standard=g.fitGridColumns(grid,720,76),pocket=g.fitGridColumns(grid,720,76*.82);
 const delta=(standard[1].x-standard[0].x)*720/100;
 assert.ok(delta>76);
 assert.ok(standard[0].x<14);
 assert.equal(pocket[0].x,14);
 assert.equal(JSON.stringify(grid),original);
 assert.ok(standard[0].x*7.2>76/2);
});
test('8x4+4 grids expand with full-size cards, but a 5x5 already fits',()=>{
 const eight=Array.from({length:4},(_,r)=>Array.from({length:8},(_,c)=>({x:18.5+9*c,y:13+19*r}))).flat();
 eight.push(...Array.from({length:4},(_,c)=>({x:36.5+9*c,y:89})));
 const result=g.fitGridColumns(eight,720,77);
 assert.equal(result.length,36);
 assert.ok(result[1].x-result[0].x>9);
 assert.ok(result[32].x<result[35].x);
 const five=Array.from({length:5},(_,r)=>Array.from({length:5},(_,c)=>({x:26+12*c,y:13+18.5*r}))).flat();
 assert.equal(g.fitGridColumns(five,720,75)[0].x,26);
});
test('irregular custom layouts remain unchanged',()=>{
 const irregular=[{x:10,y:20},{x:25,y:22},{x:45,y:90},{x:70,y:40}];
 assert.equal(JSON.stringify(g.fitGridColumns(irregular,720,100)),JSON.stringify(irregular));
});

test('whole spread translation preserves relative distances, angles and card identities',()=>{
 const cards=[
  {id:'a',x:20,y:30,angle:15,slot:0},
  {id:'b',x:50,y:60,angle:90,slot:1},
  {id:'c',x:80,y:70,angle:270,slot:2}
 ];
 const delta=g.translatePositions(cards,8,-5);
 assert.equal(delta.x,8);assert.equal(delta.y,-5);
 assert.deepEqual(cards.map(c=>[c.x,c.y,c.angle,c.slot,c.id]),[
  [28,25,15,0,'a'],[58,55,90,1,'b'],[88,65,270,2,'c']
 ]);
 assert.equal(cards[1].x-cards[0].x,30);
 const bounded=g.translatePositions(cards,20,0);
 assert.equal(bounded.x,12);
 assert.equal(cards[2].x,100);
});
