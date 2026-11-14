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
function romanNumeral(number){
 let value=number,out='';
 for(const [digit,glyph] of [[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']]){
  while(value>=digit){out+=glyph;value-=digit}
 }
 return out;
}
function faceMarkup(card,numberStyle='arabic'){
 const number=Number(card.lenormandNumber||String(card.id||'').split('-').pop());
 if(!Number.isInteger(number)||number<1||number>36)return '';
 const shownNumber=numberStyle==='roman'?romanNumeral(number):String(number);
 // Fit the numeral to the inner ellipse (rx=19), never the outer border.
 // Roman numerals keep a legible height; only wider inscriptions are
 // condensed horizontally to a maximum width of 33 SVG units.
 const numberFontSize=numberStyle!=='roman'?19:shownNumber.length>=6?13:shownNumber.length>=4?15:17;
 const expectedNumberWidth=Array.from(shownNumber).reduce((width,char)=>width+
  (char==='I'?0.36:['V','X','L','C','D','M'].includes(char)?0.73:0.64)*numberFontSize,0);
 const numberFit=expectedNumberWidth>33?' textLength="33" lengthAdjust="spacingAndGlyphs"':'';
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
 +'<g transform="translate(150 34)"><ellipse rx="22" ry="18" fill="#f6e2b4" stroke="#966a30" stroke-width="2"/><ellipse rx="19" ry="15" fill="none" stroke="#d6af64"/><text text-anchor="middle" y="6" font-family="Georgia,serif" font-size="'+numberFontSize+'"'+numberFit+' fill="#513922">'+shownNumber+'</text></g>'
 +'<g transform="translate(253 346)"><path d="M0 -24L23 0L0 24L-23 0Z" fill="#fbecd0" stroke="#956b32" stroke-width="2"/><path d="M0 -19L18 0L0 19L-18 0Z" fill="none" stroke="#d8af69"/><text text-anchor="middle" y="-2" fill="'+ink+'" font-family="Georgia,serif" font-size="'+(rank.length>1?'12':'16')+'" font-weight="bold">'+rank+'</text><text text-anchor="middle" y="13" font-size="15" fill="'+ink+'">'+suit+'</text></g>'
 +'<path d="M52 401Q65 392 79 396H221Q236 392 248 401L242 425Q230 433 219 433H81Q69 433 58 425Z" fill="#f9eac6" stroke="#92682e" stroke-width="2"/>'
 +'<path d="M65 404H235M70 428H230" stroke="#cda767" stroke-width="1"/>'
 +'<text text-anchor="middle" x="150" y="418" font-family="Georgia, Yu Mincho, serif" font-size="'+(name.length>7?'12':'16')+'" fill="#533a21">'+name+'</text>'
 +'<text text-anchor="middle" x="150" y="428" font-family="Georgia,serif" font-size="7" fill="#896234">'+english+'</text>'
 +'</svg>';
}
/* Concise Petit Lenormand reading notes: general modern conventions, not
   a translation of one historical source. Read combinations in context. */
const meanings=[["知らせ、来訪、急な動き","人物や情報がこちらへ近づいてくる札。連絡の到着、訪問、状況の進展を示す。"],["小さな幸運、好機、偶然","思いがけない助けや一時的な幸運。機会は短く、素早く生かすことが大切。"],["旅、遠方、交易、移動","遠くとのつながり、長い道のり、移動や商取引。距離や時間を伴う変化を表す。"],["家庭、住居、私的な基盤","家や家族、身近な環境。慣れ親しんだ場所、生活の安定や帰属を示す。"],["成長、健康、根づく時間","ゆっくり根を張る成長、生命力、健康。長い年月をかけて続くものを表す。"],["混乱、不安、曖昧さ","視界が遮られ、確かな判断が難しい状態。混乱は固定的ではなく、雲が晴れる余地もある。"],["複雑さ、誘惑、曲折","入り組んだ事情、嫉妬や策略、回り道。人物としては知恵や警戒心も示しうる。"],["終結、停滞、喪失","ある段階の終わりや中断。失われたものを示す一方、終わることで区切りがつく。"],["贈り物、喜び、賞賛","好意、祝福、嬉しい申し出。人間関係を和らげる贈与や感謝を表す。"],["突然の決断、切断、危険","急な別れや刈り取り。ためらいなく切り離す必要と、不意の危険の双方を示す。"],["口論、反復、緊張","対立や叱責、同じ問題の繰り返し。訓練、議論、激しいやりとりにもつながる。"],["会話、噂、神経の高ぶり","連絡や会話が活発になる札。さえずりのような雑談、噂、不安なざわめきを示す。"],["新しさ、幼さ、始まり","子どもや初心者、小さな出来事。経験の浅さと、新鮮な可能性を表す。"],["警戒、機転、利害","慎重に立ち回る必要。仕事上の判断、抜け目なさ、疑わしい意図などを示す。"],["力、保護、財力","強い影響力を持つ人物や組織。財産や権限、守る力と支配力の両面を表す。"],["希望、導き、見通し","先を見通す目印や理想。進路が明らかになること、遠くに見える目標を示す。"],["移転、変化、改善","住まいや環境の移り変わり。更新、転換、より良い状態への移行を表す。"],["友人、忠実さ、助力","信頼できる仲間や協力者。変わらぬ友情、誠実な支援を示す。"],["制度、隔たり、孤立","公的機関、権威ある建物、独立した立場。周囲からの距離や孤独も表す。"],["社交、集会、公共の場","人の集まる場所、交流や催し。私的な問題が社会へ開かれる場面を示す。"],["障害、遅延、困難","前進を妨げる大きな障害。時間がかかること、距離や隔たりを表す。"],["選択、分岐、別の道","複数の選択肢と進路の分かれ目。どの方向へ進むか決める必要を示す。"],["損失、消耗、不安","少しずつ失われる資源や安心。摩耗、盗難、気がかりな問題を表す。"],["愛情、親密さ、好意","恋愛や心からの喜び。好きなものへの情熱、あたたかな結びつきを示す。"],["約束、契約、繰り返す縁","婚姻や契約、継続的な約束。人や物事を結びつける関係を示す。"],["秘密、知識、未公開の情報","まだ開かれていない情報や研究。学習、記録、隠された事柄を表す。"],["文書、通知、記録","手紙、メール、書面で伝えられる知らせ。正式な連絡や記録を示す。"],["男性人物、相談の中心人物","男性の相談者、または問いに関わる重要な男性。意味は周囲の札で具体化する。"],["女性人物、相談の中心人物","女性の相談者、または問いに関わる重要な女性。意味は周囲の札で具体化する。"],["成熟、平穏、長い時間","落ち着き、経験、品位。年長者、穏やかな関係、長く続くものを示す。"],["成功、活力、明確さ","物事が明るみに出ること。強い生命力、成果、成功を表す。"],["名声、承認、感情の評価","評判、名誉、他者からの評価。創作や仕事の承認、心の満足を示す。"],["解決、確実さ、重要な手掛かり","開かれる扉と答え。問題を解く鍵、重要で確かな機会を示す。"],["金銭、商売、流通","財産、収入、商取引。ものや資金が流れて増減する状況を表す。"],["安定、定着、仕事の継続","根を下ろすこと、継続と確かさ。仕事や生活の長期的な基盤を示す。"],["重荷、試練、宿命的な課題","避けがたい負担や苦難。背負う責任、試練、信仰上の十字架を示す。"]];
const defaultTexts=Object.freeze(Object.fromEntries(meanings.map(([keywords,explanation],i)=>[
 'lenormand-'+String(i+1).padStart(2,'0'),
 Object.freeze({body:'一般的な意味\n'+explanation+'\n\nキーワード\n'+keywords,source:''})
])));
root.TabulaLenormand=Object.freeze({blueprint,faceMarkup,cards,defaultTexts});
})(globalThis);
