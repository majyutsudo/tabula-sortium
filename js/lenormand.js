/* TABULA LENORMAND 36-card native catalogue (Petit Lenormand).
   Original artwork: images/decks/tabula-lenormand/artwork/L01.png ... L36.png.
   Ornament, title, number and playing-card inset are composed in SVG. */
(function(root){'use strict';
const rows=[["騎士","Rider","9H"],["クローバー","Clover","6D"],["船","Ship","10S"],["家","House","KH"],["木","Tree","7H"],["雲","Clouds","KC"],["蛇","Snake","QC"],["棺","Coffin","9D"],["花束","Bouquet","QS"],["鎌","Scythe","JD"],["鞭","Whip","JC"],["鳥","Birds","7D"],["子ども","Child","JS"],["狐","Fox","9C"],["熊","Bear","10C"],["星","Stars","6H"],["コウノトリ","Stork","QH"],["犬","Dog","10H"],["塔","Tower","6S"],["庭園","Garden","8S"],["山","Mountain","8C"],["道","Paths","QD"],["ネズミ","Mice","7C"],["ハート","Heart","JH"],["指輪","Ring","AC"],["本","Book","10D"],["手紙","Letter","7S"],["紳士","Gentleman","AH"],["淑女","Lady","AS"],["百合","Lilies","KS"],["太陽","Sun","AD"],["月","Moon","8H"],["鍵","Key","8D"],["魚","Fish","KD"],["錨","Anchor","9S"],["十字架","Cross","6C"]];
const suits={H:'♥',D:'♦',S:'♠',C:'♣'};
const cards=rows.map(([name,en,pip],i)=>({
 id:'lenormand-'+String(i+1).padStart(2,'0'),
 name, names:{en}, number:String(i+1), kind:'oracle',
 suitId:null,rankId:null,
 lenormandNumber:i+1,playingRank:pip.slice(0,-1),playingSuit:suits[pip.slice(-1)],
 image:'images/decks/tabula-lenormand/artwork/L'+String(i+1).padStart(2,'0')+'.png'
}));
const blueprint=Object.freeze({
 id:'lenormand-36',name:'TABULA LENORMAND（36枚）',
 suits:[],ranks:[],cards,nameSets:[{id:'primary',label:'日本語'},{id:'en',label:'English'}],
 version:1
});
function escapeXml(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));}
function faceMarkup(card){
 const number=Number(card.lenormandNumber||String(card.id||'').split('-').pop());
 if(!Number.isInteger(number)||number<1||number>36)return '';
 const art='images/decks/tabula-lenormand/artwork/L'+String(number).padStart(2,'0')+'.png';
 const name=escapeXml(card.name||''),english=escapeXml(card.names?.en||'');
 const rank=escapeXml(card.playingRank||''),suit=escapeXml(card.playingSuit||'');
 const ink=suit==='♥'||suit==='♦'?'#a44432':'#343a3a';
 const ornaments='<g stroke="#ae7c32" stroke-width="1.7" fill="none"><path d="M20 73Q20 20 73 20M227 20Q280 20 280 73M20 377Q20 430 73 430M227 430Q280 430 280 377"/><path d="M22 75Q42 41 64 37Q39 28 45 22Q56 16 65 28M278 75Q258 41 236 37Q261 28 255 22Q244 16 235 28M22 375Q42 409 64 413Q39 422 45 428Q56 434 65 422M278 375Q258 409 236 413Q261 422 255 428Q244 434 235 422"/></g>';
 return '<svg class="lenormand-face-svg" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 300 450" role="img" aria-label="'+name+'" focusable="false">'
 +'<rect x="1.5" y="1.5" width="297" height="447" rx="5" fill="#f7e8c5" stroke="#76542d" stroke-width="3"/>'
 +'<rect x="7" y="7" width="286" height="436" rx="3" fill="#f8e7c4" stroke="#d3b477" stroke-width="2"/>'
 +'<rect x="12" y="12" width="276" height="426" rx="2" fill="#f6e1b5" stroke="#86602f" stroke-width="1.5"/>'
 +'<svg x="19" y="19" width="262" height="412" viewBox="0 0 262 412" overflow="hidden"><image href="'+art+'" width="262" height="412" preserveAspectRatio="xMidYMid slice"/></svg>'
 +'<rect x="19" y="19" width="262" height="412" fill="none" stroke="#b1833b" stroke-width="2"/>'
 +ornaments
 +'<g transform="translate(150 34)"><ellipse rx="22" ry="18" fill="#f6e2b4" stroke="#966a30" stroke-width="2"/><ellipse rx="19" ry="15" fill="none" stroke="#d6af64"/><text text-anchor="middle" y="6" font-family="Georgia,serif" font-size="19" fill="#513922">'+number+'</text></g>'
 +'<g transform="translate(253 346)"><path d="M0 -24L23 0L0 24L-23 0Z" fill="#fbecd0" stroke="#956b32" stroke-width="2"/><path d="M0 -19L18 0L0 19L-18 0Z" fill="none" stroke="#d8af69"/><text text-anchor="middle" y="-2" fill="'+ink+'" font-family="Georgia,serif" font-size="'+(rank.length>1?'12':'16')+'" font-weight="bold">'+rank+'</text><text text-anchor="middle" y="13" font-size="15" fill="'+ink+'">'+suit+'</text></g>'
 +'<path d="M52 401Q65 392 79 396H221Q236 392 248 401L242 425Q230 433 219 433H81Q69 433 58 425Z" fill="#f9eac6" stroke="#92682e" stroke-width="2"/>'
 +'<path d="M65 404H235M70 428H230" stroke="#cda767" stroke-width="1"/>'
 +'<text text-anchor="middle" x="150" y="418" font-family="Georgia, Yu Mincho, serif" font-size="'+(name.length>7?'12':'16')+'" fill="#533a21">'+name+'</text>'
 +'<text text-anchor="middle" x="150" y="428" font-family="Georgia,serif" font-size="7" fill="#896234">'+english+'</text>'
 +'</svg>';
}
root.TabulaLenormand=Object.freeze({blueprint,faceMarkup,cards});
})(globalThis);
