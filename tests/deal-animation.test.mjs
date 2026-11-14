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

test('three PETAL spirals have distinct timings, complete paths and exact arrivals',()=>{
 const modes=[['petalSoft',4300],['petal',3300],['petalVortex',2750]];
 for(const [mode,duration] of modes){
  const flight=animation.create(mode,{dx:360,dy:180,arrivalAngle:-35,wind:.7});
  assert.equal(flight.duration,duration);
  assert.equal(flight.easing,'linear');
  assert.equal(flight.frames.length,101);
  assert.equal(flight.frames[0].offset,0);
  assert.equal(flight.frames.at(-1).offset,1);
  assert.match(flight.frames[0].transform,/360px/);
  assert.match(flight.frames.at(-1).transform,/rotate\\(-35deg\\)/);
  for(let i=1;i<flight.frames.length;i++)assert.ok(flight.frames[i].offset>flight.frames[i-1].offset);
 }
 const clockwise=animation.create('petal',{dx:360,dy:180,wind:.8});
 const counterclockwise=animation.create('petal',{dx:360,dy:180,wind:-.8});
 assert.notEqual(clockwise.frames[35].transform,counterclockwise.frames[35].transform);
 assert.equal(clockwise.frames.at(-1).transform,counterclockwise.frames.at(-1).transform);
});

test('PETAL keeps each winding inside provided viewport-safe bounds',()=>{
 const bounds={minX:-200,maxX:145,minY:-260,maxY:170};
 for(const mode of ['petalSoft','petal','petalVortex']){
  const f=animation.create(mode,{dx:120,dy:-160,wind:.4,arrivalAngle:70,bounds});
  for(const frame of f.frames){
   const match=frame.transform.match(/calc\\(-50% \\+ (-?[\\d.]+)px\\),calc\\(-50% \\+ (-?[\\d.]+)px\\)/);
   assert.ok(match,'position is a viewport translation');
   const px=Number(match[1]),py=Number(match[2]);
   assert.ok(px>=bounds.minX-.02&&px<=bounds.maxX+.02,mode+' x='+px);
   assert.ok(py>=bounds.minY-.02&&py<=bounds.maxY+.02,mode+' y='+py);
  }
 }
});

test('all flight modes end at exactly the same center and destination rotation',()=>{
 const finalTransforms=['standard','spin','petalSoft','petal','petalVortex'].map(mode=>
  animation.create(mode,{dx:-295,dy:410,arrivalAngle:72,wind:.3}).frames.at(-1).transform);
 const suffix='translate(calc(-50% + 0px),calc(-50% + 0px))';
 finalTransforms.forEach(transform=>assert.ok(transform.startsWith(suffix)));
 for(const transform of finalTransforms.slice(2))assert.equal(finalTransforms[0],transform);
 assert.match(finalTransforms[1],/rotate\(792deg\)/);
});
