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
