/* TABULA LENORMAND 36-card native catalogue (Petit Lenormand).
   Image assets: images/decks/tabula-lenormand/L01.webp ... L36.webp
   Artwork is stored separately so the later 52-card edition can reuse it. */
(function(root){'use strict';
const rows=[["騎士","Rider","9H"],["クローバー","Clover","6D"],["船","Ship","10S"],["家","House","KH"],["木","Tree","7H"],["雲","Clouds","KC"],["蛇","Snake","QC"],["棺","Coffin","9D"],["花束","Bouquet","QS"],["鎌","Scythe","JD"],["鞭","Whip","JC"],["鳥","Birds","7D"],["子ども","Child","JS"],["狐","Fox","9C"],["熊","Bear","10C"],["星","Stars","6H"],["コウノトリ","Stork","QH"],["犬","Dog","10H"],["塔","Tower","6S"],["庭園","Garden","8S"],["山","Mountain","8C"],["道","Paths","QD"],["ネズミ","Mice","7C"],["ハート","Heart","JH"],["指輪","Ring","AC"],["本","Book","10D"],["手紙","Letter","7S"],["紳士","Gentleman","AH"],["淑女","Lady","AS"],["百合","Lilies","KS"],["太陽","Sun","AD"],["月","Moon","8H"],["鍵","Key","8D"],["魚","Fish","KD"],["錨","Anchor","9S"],["十字架","Cross","6C"]];
const suits={H:'♥',D:'♦',S:'♠',C:'♣'};
const cards=rows.map(([name,en,pip],i)=>({
 id:'lenormand-'+String(i+1).padStart(2,'0'),
 name, names:{en}, number:String(i+1), kind:'oracle',
 suitId:null,rankId:null,
 lenormandNumber:i+1,playingRank:pip.slice(0,-1),playingSuit:suits[pip.slice(-1)],
 image:'images/decks/tabula-lenormand/L'+String(i+1).padStart(2,'0')+'.webp'
}));
const blueprint=Object.freeze({
 id:'lenormand-36',name:'TABULA LENORMAND（36枚）',
 suits:[],ranks:[],cards,nameSets:[{id:'primary',label:'日本語'},{id:'en',label:'English'}],
 version:1
});
function faceMarkup(card){
 const number=Number(card.lenormandNumber||String(card.id).split('-').pop());
 if(!Number.isInteger(number)||number<1||number>36)return '';
 const src='images/decks/tabula-lenormand/L'+String(number).padStart(2,'0')+'.webp';
 return '<img class="lenormand-face-art" src="'+src+'" alt="" draggable="false" loading="lazy">';
}
root.TabulaLenormand=Object.freeze({blueprint,faceMarkup,cards});
})(globalThis);
