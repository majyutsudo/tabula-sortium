import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const ctx={};
runInNewContext(readFileSync(new URL('../js/card-snap.js',import.meta.url),'utf8'),ctx);
const {snap}=ctx.TabulaCardSnap;
const dim={w:70,h:105};
const base=[{x:200,y:200}];
function equal(a,b){assert.equal(a.x,b.x);assert.equal(a.y,b.y)}
test('edge contact on either axis uses actual card dimensions',()=>{
 equal(snap({x:268,y:202},base,dim),{x:270,y:200});
 equal(snap({x:202,y:303},base,dim),{x:200,y:305});
 equal(snap({x:132,y:198},base,dim),{x:130,y:200});
});
test('half-card stagger snaps only in a neighboring pyramid row',()=>{
 equal(snap({x:234,y:304},base,dim),{x:235,y:305});
 equal(snap({x:234,y:201},base,dim),{x:234,y:201});
});
test('occupied neighbors are not overlaid when snapping',()=>{
 const crowded=[...base,{x:270,y:200}];
 equal(snap({x:269,y:199},crowded,dim),{x:269,y:199});
});
test('a 5 by 5 contact grid remains aligned and non-overlapping',()=>{
 const placed=[];
 for(let row=0;row<5;row++)for(let col=0;col<5;col++){
  const dest={x:100+col*dim.w,y:100+row*dim.h};
  const chosen=placed.length?snap({x:dest.x+3,y:dest.y+2},placed,dim):dest;
  equal(chosen,dest);
  placed.push(chosen);
 }
 assert.equal(placed.length,25);
});
test('unrelated points and empty sets do not move',()=>{
 equal(snap({x:501,y:413},base,dim),{x:501,y:413});
 equal(snap({x:100,y:100},[],dim),{x:100,y:100});
});

test('two-axis edge contact takes priority over a closer partial alignment',()=>{
 equal(snap({x:267,y:203},base,dim),{x:270,y:200});
 equal(snap({x:236,y:303},base,dim),{x:235,y:305});
});
