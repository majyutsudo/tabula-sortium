/* S. L. MacGregor Mathers, The Tarot (1888), First Method.
   Cards are represented top-first. Each dealt card is placed atop its target heap.
   The first target sequence is B,A,B,B,A,...; subsequently D,C,D,D,C,...
   The method reads A (26), C (17), E (11), and sets F (24) aside.
*/
(function(root){'use strict';
function deal(source,first,second){
 const heaps={[first]:[],[second]:[]};
 source.forEach((card,i)=>{const target=i===0?first:((i-1)%3===0?second:first);heaps[target].unshift(card)});
 return heaps;
}
function run(deck){
 if(!Array.isArray(deck)||deck.length!==78)throw Error('マザーズ第一法は78枚のデッキが必要です。');
 const a=deal(deck,'B','A');
 const b=deal(a.B,'D','C');
 const c=deal(b.D,'F','E');
 const piles={A:a.A,C:b.C,E:c.E,F:c.F};
 if([26,17,11,24].some((n,i)=>piles[['A','C','E','F'][i]].length!==n))throw Error('Mathers pile size mismatch');
 return {piles,readingOrder:['A','C','E'],excluded:'F',pairs:Object.fromEntries(['A','C','E'].map(key=>[key,Array.from({length:Math.floor(piles[key].length/2)},(_,i)=>[i,piles[key].length-1-i])]))};
}
root.TabulaMathersFirst=Object.freeze({run});
})(globalThis);
