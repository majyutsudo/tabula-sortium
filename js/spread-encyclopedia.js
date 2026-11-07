/* TABULA SORTIUM — shared spread encyclopedia definitions and vector diagrams. */
(function(root){'use strict';
const BUILTIN={
 one:{name:'1枚引き',alternate:'One-card spread',overview:'一つの問いに一枚のカードで応じる、簡潔な展開法。'},
 three:{name:'3枚引き',alternate:'Three-card spread',overview:'過去・現在・未来の三つの位置を用いて、状況の推移を読む展開法。'},
 celtic:{name:'ケルト十字',alternate:'Celtic Cross',overview:'現在の問題、影響、過去、未来、周囲の状況などを十枚のカードで多角的に読む展開法。位置の意味には異なる伝承・流儀があります。'},
 fiveCross:{name:'五枚十字（5枚）',alternate:'Five-card Cross',overview:'過去・未来・意識・根底の四つの要因と、中央の核心を読む五枚十字。配札は上・下・左・右・中央の順に行うが、これは十字を切る動作に着想を得たTABULAの標準順序であり、占断上の意味とは独立している。'},
 pentagram:{name:'ペンタグラム（5枚）',alternate:'Pentagram Spread',overview:'地の召喚五芒星の描画方向に沿って、左下の地から水・風・火を経由し、頂点の霊で結ぶ五枚の展開法。描線の起点である霊を最後の札として配るのはTABULA独自の占法。'},
 treeOfLife:{name:'生命の樹（10枚）',alternate:'Tree of Life Spread',overview:'西洋秘教的カバラの生命の樹に従い、ケテルからマルクトまで十のセフィロトに一枚ずつ配札する展開法。伝統的な番号順（稲妻の閃光）で根源から現実化までの諸力を読み解く。セフィロトへのタロット配札と各札の占断上の意味は後世の応用である。'},
 horoscope:{name:'ホロスコープ（13枚）',alternate:'Horoscope spread',overview:'十二の占星術的ハウスに一枚ずつを配し、中央の第13札を総合として読む展開法。第1ハウスは左、第10ハウスは上に配置します。'},
 horseshoe:{name:'ホースシュー（7枚）',alternate:'Horseshoe spread',overview:'七枚を馬蹄形に配し、過去から現状、隠れた影響、障害、周囲、助言、結末へと読む展開法。位置の意味には異なる流儀があります。'},
 free:{name:'フリースプレッド',alternate:'Free spread',overview:'カードを卓上へ自由に配置する方式。配置の意味や形は使用者が決めます。'}
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
