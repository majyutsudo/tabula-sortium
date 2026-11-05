/* TABULA SORTIUM — card permutations and cuts.
   Exact existing shuffle algorithms, separate from visual animation. */
(function(root){'use strict';
const rnd=n=>Math.floor(Math.random()*n);function randomize(a){for(let i=a.length-1;i>0;i--){const j=rnd(i+1);[a[i],a[j]]=[a[j],a[i]]}return a}
function washSequence(arr,direction='random',round=0){const a=arr.slice();if(direction==='random')return randomize(a);const clockwise=direction==='cw'||direction==='alternate'&&round%2===0;const n=a.length;if(n<2)return a;/* Rotational wash: sweep cards around a circular path, interleaving nearby positions before the final random exchange. */const offset=clockwise?Math.max(1,Math.floor(n*.21)):n-Math.max(1,Math.floor(n*.21));const turned=a.slice(offset).concat(a.slice(0,offset));for(let i=turned.length-1;i>0;i--){const distance=1+rnd(Math.max(1,Math.min(i,Math.ceil(n*.24))));const j=clockwise?Math.max(0,i-distance):rnd(i+1);[turned[i],turned[j]]=[turned[j],turned[i]]}return turned}

function riffleSequence(arr,manual=false){let split=manual?Math.max(1,Math.min(arr.length-1,Math.round(arr.length*(.4+Math.random()*.2)))):Math.floor(arr.length/2);let left=arr.slice(0,split),right=arr.slice(split),out=[];while(left.length||right.length){let chooseLeft=!right.length||(left.length&&Math.random()<(manual?.57:.5));let part=chooseLeft?left:right;let take=manual?1:Math.min(part.length,1+rnd(3));out.push(...part.splice(0,take))}return out}
function overhandSequence(arr,manual=false,packets=7){const remaining=arr.slice(),out=[];const count=Math.min(remaining.length,Math.max(1,packets));for(let i=0;i<count&&remaining.length;i++){const left=count-i;const n=i===count-1?remaining.length:Math.max(1,Math.min(remaining.length-left+1,Math.round(remaining.length/left*(.5+Math.random()))));out.unshift(...remaining.splice(0,n))}return out}
function pileSequence(arr,count=4){count=Math.max(2,Math.min(12,count));let piles=Array.from({length:count},()=>[]);arr.forEach((card,i)=>piles[i%count].push(card));randomize(piles);return piles.flat()}

function normStep(st,methods){const method=methods[st.method]?st.method:'hindu';const groups=Number(st.groups)||1;return {method,reps:Math.max(1,Math.min(100,Number(st.reps)||1)),groups:method==='pile'?Math.max(2,Math.min(12,groups===1?4:groups)):method==='hindu'||method==='overhand'?Math.max(1,Math.min(30,groups===1?7:groups)):1,washDirection:['random','cw','ccw','alternate'].includes(st.washDirection)?st.washDirection:'random'}}

function applyShuffleMethod(a,st,manual,round=0){
  if(st.method==='wash')return washSequence(a,st.washDirection,round);
  if(st.method==='overhand'||st.method==='hindu')return overhandSequence(a,manual,st.groups);
  if(st.method==='riffle')return riffleSequence(a,manual);
  return pileSequence(a,st.groups);
}
function cutLengths(total,count){const lengths=Array(count).fill(1);let rest=total-count;while(rest--)lengths[rnd(count)]++;return lengths}
function restack(deck,lengths,sequence){const piles=[];let start=0;for(const len of lengths){piles.push(deck.slice(start,start+len));start+=len}return sequence.flatMap(i=>piles[i])}
root.TabulaShuffle=Object.freeze({rnd,randomize,washSequence,overhandSequence,riffleSequence,pileSequence,normStep,applyShuffleMethod,cutLengths,restack});
})(globalThis);
