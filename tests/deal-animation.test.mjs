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

test('PETAL has separate release, drift, and arrival stages without geometry distortion',()=>{
 const a=animation.create('petal',{dx:360,dy:180,arrivalAngle:-35,wind:-.7});
 const b=animation.create('petal',{dx:360,dy:180,arrivalAngle:-35,wind:.7});
 assert.equal(a.duration,3400);
 assert.equal(a.frames.length,6);
 assert.deepEqual(Array.from(a.frames.map(frame=>frame.offset)),[0,.16,.43,.7,.89,1]);
 assert.notEqual(a.frames[2].transform,b.frames[2].transform);
 assert.equal(a.frames.at(-1).transform,b.frames.at(-1).transform);
 for(const frame of a.frames)assert.match(frame.transform,/scale\((?:0\.96|0\.99|1\.015|1\.02|1\.005|1)\)/);
 assert.match(a.frames.at(-1).transform,/rotate\(-35deg\)/);
});

test('all flight modes end at exactly the same center and destination rotation',()=>{
 const finalTransforms=['standard','spin','petal'].map(mode=>
  animation.create(mode,{dx:-295,dy:410,arrivalAngle:72,wind:.3}).frames.at(-1).transform);
 const suffix='translate(calc(-50% + 0px),calc(-50% + 0px))';
 finalTransforms.forEach(transform=>assert.ok(transform.startsWith(suffix)));
 assert.equal(finalTransforms[0],finalTransforms[2]);
 assert.match(finalTransforms[1],/rotate\(792deg\)/);
});
