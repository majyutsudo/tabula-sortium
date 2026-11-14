import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../js/deal-animation.js',import.meta.url),'utf8');
const context=vm.createContext({});
vm.runInContext(source,context);
const {TabulaDealAnimation:animation}=context;

test('the existing STANDARD deal remains the default',()=>{
 assert.equal(animation.normalize(undefined),'standard');
 assert.equal(animation.normalize('missing'),'standard');
 const flight=animation.create('standard',{dx:120,dy:64,arrivalAngle:45});
 assert.equal(flight.duration,320);
 assert.equal(flight.frames.length,3);
 assert.match(flight.frames[0].transform,/rotate\(0deg\)/);
 assert.match(flight.frames.at(-1).transform,/rotate\(45deg\)/);
});

test('SPIN performs two turns and finishes at an arbitrary target angle',()=>{
 for(const angle of [-155,0,45,90,170]){
  const flight=animation.create('spin',{dx:285,dy:-120,arrivalAngle:angle});
  assert.equal(flight.duration,680);
  assert.equal(flight.frames.length,4);
  assert.match(flight.frames.at(-1).transform,new RegExp('rotate\\('+(720+angle)+'deg\\)'));
  assert.match(flight.frames.at(-1).transform,/calc\(-50% \+ 0px\)/);
 }
});

test('SLOW SPIN preserves SPIN path and full turns over SERPENT length',()=>{
 for(const angle of [-155,0,45,90,170]){
  const fast=animation.create('spin',{dx:285,dy:-120,arrivalAngle:angle});
  const slow=animation.create('spinSlow',{dx:285,dy:-120,arrivalAngle:angle});
  assert.equal(fast.duration,680);
  assert.equal(slow.duration,7800);
  assert.equal(fast.easing,'cubic-bezier(.18,.64,.2,1)');
  assert.equal(slow.easing,'linear');
  assert.equal(slow.frames.length,fast.frames.length);
  assert.deepEqual(Array.from(slow.frames.map(f=>f.transform)),Array.from(fast.frames.map(f=>f.transform)));
  assert.equal(slow.frames[0].easing,fast.easing);
  assert.equal(slow.frames[1].easing,fast.easing);
  assert.equal(slow.frames[2].easing,'linear');
  assert.equal(fast.frames[2].easing,undefined);
  assert.ok(slow.frames.at(-1).transform.includes('rotate('+(720+angle)+'deg)'));
 }
});

test('PETAL I remains the chosen slow spiral and legacy variants resolve to it',()=>{
 assert.equal(animation.normalize('petal'),'petalSoft');
 assert.equal(animation.normalize('petalVortex'),'petalSoft');
 const a=animation.create('petalSoft',{dx:360,dy:180,arrivalAngle:-35,wind:.7});
 const b=animation.create('petalVortex',{dx:360,dy:180,arrivalAngle:-35,wind:.7});
 assert.equal(a.duration,4300);
 assert.equal(b.duration,a.duration);
 assert.equal(a.frames.length,101);
 assert.equal(a.frames[0].offset,0);
 assert.equal(a.frames.at(-1).offset,1);
 assert.equal(a.frames.at(-1).transform,b.frames.at(-1).transform);
});

test('SERPENT is slower than PETAL, snakes across its path, and never spins',()=>{
 const petal=animation.create('petalSoft',{dx:360,dy:180});
 const flight=animation.create('serpent',{dx:360,dy:180,arrivalAngle:40,wind:.8});
 assert.ok(flight.duration>petal.duration);
 assert.equal(flight.duration,7800);
 assert.equal(flight.frames.length,161);
 assert.equal(flight.easing,'linear');
 assert.equal(flight.frames[0].offset,0);
 assert.equal(flight.frames.at(-1).offset,1);
 assert.match(flight.frames.at(-1).transform,/rotate\\(40deg\\)/);
 const extract=frame=>{
  const match=frame.transform.match(/calc\\(-50% \\+ (-?[\\d.]+)px\\),calc\\(-50% \\+ (-?[\\d.]+)px\\)/);
  assert.ok(match);
  return {x:Number(match[1]),y:Number(match[2])};
 };
 // Perpendicular offsets should alternate across the stock-to-target line.
 const offsets=flight.frames.slice(1,-1).map(frame=>{
  const {x,y}=extract(frame);
  return 360*y-180*x;
 });
 assert.ok(offsets.some(value=>value>3000),'left of the direct line');
 assert.ok(offsets.some(value=>value< -3000),'right of the direct line');
 const reverse=animation.create('serpent',{dx:360,dy:180,arrivalAngle:40,wind:-.8});
 assert.notEqual(flight.frames[35].transform,reverse.frames[35].transform);
 assert.equal(flight.frames.at(-1).transform,reverse.frames.at(-1).transform);
 for(const frame of flight.frames){
  const angle=Number(frame.transform.match(/rotate\\((-?[\\d.]+)deg\\)/)[1]);
  assert.ok(angle>=-.01&&angle<=40.01,'no spin beyond destination angle');
 }
});

test('SERPENT and PETAL respect viewport bounds where a path can fit',()=>{
 const bounds={minX:-200,maxX:145,minY:-260,maxY:170};
 for(const mode of ['petalSoft','serpent']){
  const f=animation.create(mode,{dx:120,dy:-160,wind:.4,arrivalAngle:70,bounds});
  for(const frame of f.frames){
   const match=frame.transform.match(/calc\\(-50% \\+ (-?[\\d.]+)px\\),calc\\(-50% \\+ (-?[\\d.]+)px\\)/);
   assert.ok(match);
   const px=Number(match[1]),py=Number(match[2]);
   assert.ok(px>=bounds.minX-.02&&px<=bounds.maxX+.02,mode+' x='+px);
   assert.ok(py>=bounds.minY-.02&&py<=bounds.maxY+.02,mode+' y='+py);
  }
 }
});

test('all flight modes end at exactly the same center and destination rotation',()=>{
 const finalTransforms=['standard','spin','petalSoft','serpent'].map(mode=>
  animation.create(mode,{dx:-295,dy:410,arrivalAngle:72,wind:.3}).frames.at(-1).transform);
 const suffix='translate(calc(-50% + 0px),calc(-50% + 0px))';
 finalTransforms.forEach(transform=>assert.ok(transform.startsWith(suffix)));
 for(const transform of finalTransforms.slice(2))assert.equal(finalTransforms[0],transform);
 assert.match(finalTransforms[1],/rotate\(792deg\)/);
});
