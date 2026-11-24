import {numberNotes, astroPrompts} from './dice-reading-notes.js?v=0766';
import {numbers, astro, trigrams, hexagramGuides} from './dice-meanings.js?v=0764';
import {lineGuides} from './zhouyi-line-guides.js?v=0764';
import {statementGuides} from './zhouyi-statement-guides.js?v=0764';
import {hexagrams} from './zhouyi-text.js?v=0764';

const numberReferences = {
 8:['『周易』 · 維基文庫','https://zh.wikisource.org/wiki/周易'],
 17:['プルタルコス『イシスとオシリスについて』42節','https://en.wikisource.org/wiki/Plutarch%27s_Moralia_(Loeb)/Isis_and_Osiris#42'],
 20:['スミソニアン国立アメリカ・インディアン博物館 · マヤ暦','https://maya.nmai.si.edu/calendar/calendar-system']
};

function element(tag, text, className) {
 const node=document.createElement(tag);
 if(text)node.textContent=text;
 if(className)node.className=className;
 return node;
}

export function faceFigure(object, value) {
 const index=object.faceNumbers.indexOf(value);
 const {geometry,material}=object.mesh;
 const image=material[index]?.map?.image;
 if(!image)return null;
 const canvas=element('canvas',null,'dice-detail-face');
 canvas.width=canvas.height=420;
 canvas.setAttribute('aria-hidden','true');
 const ctx=canvas.getContext('2d');
 ctx.beginPath();
 if(object.sides===6){
  ctx.roundRect(10,10,400,400,33);
  ctx.clip();
  ctx.drawImage(image,10,10,400,400);
 }else{
  const group=geometry.groups[index],uv=geometry.getAttribute('uv');
  const points=Array.from({length:group.count},(_,i)=>{
   const j=group.start+i;
   return [uv.getX(j),1-uv.getY(j)];
  });
  const scale=390/Math.max(...points.flatMap(([x,y])=>[Math.abs(x-.5)*2,Math.abs(y-.5)*2]));
  for(let i=0;i<points.length;i+=3){
   for(let j=0;j<3;j++){
    const [x,y]=points[i+j];
    ctx[j?'lineTo':'moveTo'](210+(x-.5)*scale,210+(y-.5)*scale);
   }
   ctx.closePath();
  }
  ctx.clip();
  ctx.drawImage(image,210-scale/2,210-scale/2,scale,scale);
 }
 return canvas;
}

function detail(category, title, figure) {
 const node=element('article',null,'dice-detail');
 if(figure)node.append(figure);
 node.append(element('p',category,'dice-detail-category'),element('h2',title));
 return node;
}

function section(node, title, text, lang) {
 const p=element('p',text);
 if(lang)p.lang=lang;
 node.append(element('h3',title),p);
}

function reference(node, title, url) {
 const link=element('a',title);
 link.href=url;
 link.target='_blank';
 link.rel='noopener noreferrer';
 node.append(link);
}

function linesFigure(lines, changing) {
 const figure=element('div',null,'dice-detail-hexagram');
 figure.setAttribute('role','img');
 figure.setAttribute('aria-label',[...lines].reverse().map((yang,i)=>
  (6-i)+'爻 '+(yang?'陽':'陰')+(6-i===changing?'（動爻）':'')
 ).join('、'));
 for(let i=lines.length-1;i>=0;i--){
  figure.append(element('span',null,(lines[i]?'yang':'yin')+(i+1===changing?' moving':'')));
 }
 return figure;
}

export function hexagramDetail(number, role, lines, changing, context) {
 const entry=hexagrams[number-1];
 const node=detail(role,'第'+number+'卦 '+entry.name,linesFigure(lines,changing));
 node.append(element('p',context,'dice-detail-context'));
 section(node,'卦辞 · 原文',entry.statement,'zh-Hant');
 section(node,'現代語での大意',statementGuides[number-1]);
 section(node,'TABULAの解説',hexagramGuides[number-1]);
 reference(node,'原文参照 · 維基文庫『周易』',entry.source);
 return node;
}

export function faceDetail(mode, index, value, die, figure, primary, changed, lines) {
 const face=die.faces?.[value-1];
 if(mode==='normal'){
  const label=die.userLabel?die.userLabel+' · D'+die.sides:'D'+die.sides;
  const node=detail(label,String(value),figure);
  const [history,symbolism]=numbers[value-1];
  section(node,'歴史・文化の用例',history);
  section(node,'象徴・思想との関わり',symbolism);
  const [symbols,light,shadow]=numberNotes[value-1];
  section(node,'数の象徴',symbols);
  section(node,'占いのキーワード','光 · '+light);
  node.append(element('p','闇 · '+shadow));
  const citation=numberReferences[value];
  if(citation)reference(node,...citation);
  return node;
 }
 if(mode==='astro'){
  const node=detail('アストロダイス · '+die.label,face.name,figure);
  section(node,'基本の意味（現代西洋占星術）',astro[index][value-1]);
  const roles=['何が働くか','どのように表れるか','どの領域に表れるか'];
  section(node,'読みの手がかり · '+roles[index],astroPrompts[index][value-1]);
  return node;
 }
 if(index<2){
  const [image,meaning]=trigrams[value-1];
  const node=detail('易占ダイス · '+die.label,String.fromCodePoint(0x2630+value-1)+' '+face.name,figure);
  section(node,'基本の象',image+'。'+meaning);
  return node;
 }
 const entry=hexagrams[primary-1], destination=hexagrams[changed-1];
 const node=detail('易占ダイス · 動爻',entry.name+'の'+face.name,figure);
 node.append(linesFigure(lines,value));
 section(node,'爻辞 · 原文',entry.lines[value-1],'zh-Hant');
 section(node,'現代語での大意',lineGuides[primary-1][value-1]);
 section(node,'爻の変化','下から'+value+'段目の'+(lines[value-1]?'陽爻が陰爻':'陰爻が陽爻')+'に変わり、第'+changed+'卦 '+destination.name+'になります。');
 reference(node,'原文参照 · 維基文庫『周易』',entry.source);
 return node;
}
