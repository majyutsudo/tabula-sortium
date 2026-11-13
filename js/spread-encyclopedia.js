/* TABULA SORTIUM — shared spread encyclopedia definitions and vector diagrams. */
(function(root){'use strict';
const BUILTIN={
 fourSeasons:{
  name:'フォー・シーズンズ（四季）',
  alternate:'The Four Seasons',
  overview:'52枚のプレイングカードを使うソリティア型の占法。中央の十字形に並ぶ5つの中間スペースと、少しずれた四隅の4つのファウンデーション、山札から使えなかった札を置くタロンを使う。カードの移動・積み上げを通じて4スートそれぞれの一巡を目指す。',
  method:'最初のディールでは①左上のファウンデーションに基礎カードを配り、続いて②〜⑥の中間スペースへ各1枚ずつ配る。①のランクと同位で別スートのカードが出たら、残る3つのファウンデーションへ置く。ファウンデーションには同一スートで基礎ランクから昇順に積み、Kの次はAに循環する。中間スペースにはカードを降順に重ねる。スートを揃えるのが望ましいが、異なるスートのマリアージュも認める。束の上札、タロンの上札だけが使える。場札が埋まった後は山札の次の1枚を開き、適切な束かタロンへ手動で移す。配り直しは行わない。',
  notes:'図の①〜⑥は初期配札の順序を示す。四隅のファウンデーションのうち残り3枠とタロンは自動配札の対象外。すべての束には複数枚を重ねられ、空になった中間スペースも再使用できる。各ファウンデーションに同一スートの13枚が循環昇順に揃うと個別の完成演出が発動し、4つが完成すると四季の全体演出が発動する。'
 },
 grandTableau8:{
  name:'グラン・タブロー（8×4＋4）',
  alternate:'Grand Tableau — 8×4 + 4',
  overview:'ルノルマンカード36枚すべてを使用する大展開。8枚ずつ4行に並べ、最後の4枚を最下段中央に置く。人物札を中心に、位置関係やカードの組み合わせから全体像を読む。',
  method:'36枚をシャッフルし、左上から右へ8枚ずつ4行に配る。最後の4枚（33〜36）を5行目の中央に並べる。相談者を表す人物札、近隣の札、行や列、離れた札との関係を読み合わせる。',
  notes:'グラン・タブローには複数の配列と解釈法がある。最下段4枚の扱いも流派によって異なる。TABULAでは配置のみを提供し、解釈規則は固定しない。'
 },
 grandTableau9:{
  name:'グラン・タブロー（9×4）',
  alternate:'Grand Tableau — 9×4',
  overview:'ルノルマンカード36枚すべてを9列×4行の長方形に並べるグラン・タブロー。36枚の位置関係と組み合わせを総合して読む。',
  method:'36枚をシャッフルし、左上から右へ9枚ずつ4行に配る。相談者を表す人物札を起点に、周囲の札、縦横や斜めの関係、全体の配置を読み合わせる。',
  notes:'8×4＋4とは異なる配列であり、解釈法にも複数の流儀がある。TABULAでは配置のみを提供し、解釈規則は固定しない。'
 },
 monteCarlo:{name:'モンテカルロ（5×5）',alternate:'Monte Carlo Solitaire',overview:'52枚のプレイングカードを用いる、25枚を5行5列に並べる一般的なモンテカルロ・ソリティアの盤面。カードの組を取り除き、残りを詰め直して補充する。TABULAは操作の正否を自動判定しない。',method:'最初に25枚を左上から右へ、上から下へ5×5に並べる。縦・横・斜めに隣接する同じランクの2枚を取り除く。残ったカードを左上から行方向の順序を保って詰め、空き位置に山札から補充する。取り除ける組がなくなるまで繰り返す。山札が尽きたら補充せず続ける。盤面をすべて取り除けば成功。変種により細部は異なる。'},
 free:{name:'フリースプレッド',alternate:'Free spread',overview:'カードを卓上へ自由に配置する方式。配置の意味や形は使用者が決めます。'},
 one:{name:'ワンカード',alternate:'One-card spread',overview:'一つの問いに一枚のカードで応じる、簡潔な展開法。'},
 three:{name:'スリーカード',alternate:'Three-card spread',overview:'過去・現在・未来の三つの位置を用いて、状況の推移を読む展開法。'},
 fiveCross:{name:'ファイブカード・クロス（5枚）',alternate:'Five-card Cross',overview:'過去・未来・意識・根底の四つの要因と、中央の核心を読む五枚十字。五枚のカードを十字形に配置する占法には、配札順や各位置に与える意味が異なる多くの流儀がある。TABULAでは上・下・左・右・中央の順に配る。これは十字を切る動作に着想を得た配札順であり、カードの意味は一般的な五枚十字の解釈に従う。'},
 pentagram:{name:'ペンタグラム（5枚）',alternate:'Pentagram Spread',overview:'地の召喚五芒星の描画方向に沿って、左下の地から水・風・火を経由し、頂点の霊で結ぶ五枚の展開法。霊の頂点を最後の札とすることで、四元素の働きを統合して読む構成としている。'},
 horseshoe:{name:'ホースシュー（7枚）',alternate:'Horseshoe spread',overview:'七枚を馬蹄形に配し、過去から現状、隠れた影響、障害、周囲、助言、結末へと読む展開法。各位置に与える意味や配札順には、複数の流儀がある。'},
 celtic:{name:'ケルト十字（10枚）',alternate:'Celtic Cross',overview:'現在の問題、影響、過去、未来、周囲の状況などを十枚のカードで多角的に読む展開法。各位置に与える意味には、複数の流儀がある。'},
 treeOfLife:{name:'生命の樹（10枚）',alternate:'Tree of Life Spread',overview:'西洋秘教的カバラの生命の樹に従い、ケテルからマルクトまで十のセフィロトに一枚ずつ配札する展開法。伝統的な番号順（稲妻の閃光）で根源から現実化までの諸力を読み解く。各セフィラに現れたカードを相互に関連づけ、上位の原理から下位の現実へ至る展開や、左右の柱に表れる力の均衡を読み解く。'},
 horoscope:{name:'ホロスコープ（13枚）',alternate:'Horoscope spread',overview:'十二の占星術的ハウスに一枚ずつを配し、中央の第13札を総合として読む展開法。カードは左側の第1ハウスから反時計回りに第12ハウスまで順に並べ、中央の第13札で全体を総合する。'},
};
function text(v,max=3000){return typeof v==='string'?v.slice(0,max):''}
function details(v){return {alternate:text(v?.alternate,120),author:text(v?.author,120),source:text(v?.source,500),overview:text(v?.overview,4000),method:text(v?.method,4000),notes:text(v?.notes,4000)}}
function entry(id,presets,library){
 const custom=(library||[]).find(p=>p.id===id);
 if(custom)return {...details(custom),id,name:text(custom.name,100)||id,slots:custom.slots||[],builtin:false};
 if(!Object.hasOwn(BUILTIN,id))return null;
 const b=BUILTIN[id];
 return {...details(b),id,name:b.name,slots:presets[id]||[],builtin:true};
}
function entries(presets,library){return [...Object.keys(BUILTIN).map(id=>entry(id,presets,library)),...(library||[]).filter(v=>!Object.hasOwn(BUILTIN,v.id)).map(v=>entry(v.id,presets,library))].filter(Boolean)}
function diagram(slots,{interactive=false}={}){
 if(!Array.isArray(slots)||!slots.length)return '<svg class="spread-diagram spread-diagram-unassigned" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 340" role="img" aria-label="自由配置・固定された配置図なし"><rect width="440" height="340" rx="12" fill="#192523"/><rect x="12" y="12" width="416" height="316" fill="none" stroke="#6c6855" stroke-width="1"/><rect x="171" y="105" width="98" height="130" rx="6" stroke="#9d906b" stroke-dasharray="8 8" stroke-width="2" fill="none" opacity=".65"/><path d="M220 153v34 M203 170h34" stroke="#baa275" stroke-width="2" opacity=".75"/></svg>';
 const w=440,h=340,centerX=220,centerY=170;
 const cards=slots.map((p,i)=>{
  const x=30+Math.max(0,Math.min(100,Number(p.x)||0))*3.8;
  const y=25+Math.max(0,Math.min(100,Number(p.y)||0))*2.9;
  const angle=Number.isFinite(Number(p.angle))?Number(p.angle):0;
  return '<g class="spread-diagram-slot"'+(interactive?' role="button" tabindex="0" aria-label="位置'+(i+1)+'"':'')+' data-spread-slot="'+i+'" transform="translate('+x.toFixed(2)+' '+y.toFixed(2)+') rotate('+angle+')"><rect x="-14" y="-22" width="28" height="44" rx="2.3" fill="#31423c" stroke="#d0b47d" stroke-width="1.5"/><rect x="-11" y="-19" width="22" height="38" rx="1" fill="none" stroke="#8d7958" stroke-width=".75"/><g transform="rotate('+(-angle)+')"><text x="0" y="5" text-anchor="middle" font-family="Georgia,serif" font-size="13" fill="#f0d9a9">'+(i+1)+'</text></g></g>';
 }).join('');
 return '<svg class="spread-diagram" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+w+' '+h+'" role="img" aria-label="スプレッド配置図"><rect width="'+w+'" height="'+h+'" rx="12" fill="#192523"/><rect x="12" y="12" width="'+(w-24)+'" height="'+(h-24)+'" fill="none" stroke="#6c6855" stroke-width="1"/>'+cards+'</svg>';
}
root.TabulaSpreadEncyclopedia=Object.freeze({BUILTIN,details,entry,entries,diagram});
})(globalThis);
