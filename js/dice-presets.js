// TABULA DICE v0.715: data, independent of physics and rendering
const astroFaces=[
 [{glyph:'☉',name:'太陽'},{glyph:'☽',name:'月'},{glyph:'☿',name:'水星'},{glyph:'♀',name:'金星'},{glyph:'♂',name:'火星'},{glyph:'♃',name:'木星'},{glyph:'♄',name:'土星'},{glyph:'♅',name:'天王星'},{glyph:'♆',name:'海王星'},{glyph:'♇',name:'冥王星'},{glyph:'☊',name:'ドラゴンヘッド'},{glyph:'☋',name:'ドラゴンテイル'}],
 [{glyph:'♈',name:'牡羊座'},{glyph:'♉',name:'牡牛座'},{glyph:'♊',name:'双子座'},{glyph:'♋',name:'蟹座'},{glyph:'♌',name:'獅子座'},{glyph:'♍',name:'乙女座'},{glyph:'♎',name:'天秤座'},{glyph:'♏',name:'蠍座'},{glyph:'♐',name:'射手座'},{glyph:'♑',name:'山羊座'},{glyph:'♒',name:'水瓶座'},{glyph:'♓',name:'魚座'}],
 Array.from({length:12},(_,i)=>({glyph:String(i+1),name:'第'+(i+1)+'ハウス'}))
];

export const ICHING_INKS=Object.freeze({black:'#29242a',red:'#a0252b'});
export const ICHING_COLOR_SCHEMES=Object.freeze({blackUpper:{upper:'black',lower:'red'},redUpper:{upper:'red',lower:'black'}});
export function setIChingColors(dice,scheme='blackUpper'){
 const choice=ICHING_COLOR_SCHEMES[scheme];if(!choice)throw Error('Unknown I Ching color scheme');
 if(!Array.isArray(dice)||dice.length!==3)throw Error('I Ching dice require two trigrams and one moving line');
 dice[0].ink=ICHING_INKS[choice.upper];dice[1].ink=ICHING_INKS[choice.lower];
 return dice;
}
export const TRIGRAMS=["乾","兌","離","震","巽","坎","艮","坤"];
const facesFor=(count,label)=>Array.from({length:count},(_,i)=>{
 const face=label(i+1);
 if(typeof face==='object')return face;
 const glyph=String(face);
 return {glyph,name:glyph};
});
export const PRESETS={
 normal:{title:'DICE LAB',subtitle:'PHYSICS OF FORTUNE',result:'sum',description:'通常ダイス。種類・使用数・色を自由に設定できます。',dice:Array.from({length:3},()=>({sides:6,color:'#c7b48d',surface:'ring',markings:'number',label:'D6'}))},
 astro:{title:'ASTRO DICE',subtitle:'PLANETS · ZODIAC · HOUSES',result:'symbols',description:'3個の12面体。対向面の値は合計13。',dice:['天体','十二宮','ハウス'].map((label,i)=>({sides:12,color:['#c5a269','#6b81a1','#658c78'][i],surface:'ivory',markings:'astro',label,faces:astroFaces[i],opposites:'sum13'}))},
 calendar:{title:'CALENDAR DICE',subtitle:'THE CALENDAR · THE CLOCK',result:'calendar',
  description:'月日と時刻を占うTABULAオリジナルのダイスです。',dice:[
   [12,'月','#e2d7af','ivory',n=>n,'1〜12をそのまま月に。'],
   [8,'日・十の位','#d9ba95','ivory',n=>Math.floor((n-1)/2),'通常のD8の1・2＝0、3・4＝1、5・6＝2、7・8＝3。'],
   [10,'日・一の位','#ba9475','ivory',n=>n%10,'0〜9をそのまま一の位に。10表記なら10＝0。'],
   [6,'午前／午後','#666f98','standard',n=>({glyph:String(n),name:n%2?'奇数 → 午前':'偶数 → 午後'}),'奇数（1・3・5）は午前、偶数（2・4・6）は午後。'],
   [12,'時','#ebbe67','gold',n=>n,'1〜12をそのまま時に。'],
   [12,'分','#9dbea9','standard',n=>String(n%12*5).padStart(2,'0'),'通常のD12の目を5倍。12だけは00分。']
  ].map(([sides,label,color,surface,face,rule])=>({
   sides,label,color,surface,rule,markings:'calendar',
   faces:facesFor(sides,face)
  }))},
 iching:{title:'I CHING DICE',subtitle:'THE EIGHT TRIGRAMS · SIXTY-FOUR HEXAGRAMS',result:'hexagram',description:'八卦2個と動爻1個。上卦・下卦の色は切替可能。象牙風の漢字刻印。',dice:[
  {sides:8,color:'#e2d7af',surface:'ivory',markings:'engraved',label:'上卦（外卦）',ink:ICHING_INKS.black,faces:TRIGRAMS.map(glyph=>({glyph,name:glyph}))},
  {sides:8,color:'#e2d7af',surface:'ivory',markings:'engraved',label:'下卦（内卦）',ink:ICHING_INKS.red,faces:TRIGRAMS.map(glyph=>({glyph,name:glyph}))},
  {sides:6,color:'#e2d7af',surface:'ivory',markings:'engraved',label:'動爻',ink:'#29242a',faces:['初','二','三','四','五','上'].map((glyph,i)=>({glyph,name:i===0?'初爻':i===5?'上爻':'第'+(i+1)+'爻',ink:i===0?'#a0252b':'#29242a'}))}
 ]}
};
export function preset(id){if(!PRESETS[id])throw Error('Unknown dice preset');return {...PRESETS[id],id,dice:PRESETS[id].dice.map(d=>({...d,faces:d.faces?.map(f=>({...f}))}))};}
