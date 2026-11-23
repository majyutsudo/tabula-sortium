// TABULA DICE v0.715: data, independent of physics and rendering
const astroFaces=[
 [{glyph:'☉',name:'太陽'},{glyph:'☽',name:'月'},{glyph:'☿',name:'水星'},{glyph:'♀',name:'金星'},{glyph:'♂',name:'火星'},{glyph:'♃',name:'木星'},{glyph:'♄',name:'土星'},{glyph:'♅',name:'天王星'},{glyph:'♆',name:'海王星'},{glyph:'♇',name:'冥王星'},{glyph:'☊',name:'ドラゴンヘッド'},{glyph:'☋',name:'ドラゴンテイル'}],
 [{glyph:'♈',name:'牡羊座'},{glyph:'♉',name:'牡牛座'},{glyph:'♊',name:'双子座'},{glyph:'♋',name:'蟹座'},{glyph:'♌',name:'獅子座'},{glyph:'♍',name:'乙女座'},{glyph:'♎',name:'天秤座'},{glyph:'♏',name:'蠍座'},{glyph:'♐',name:'射手座'},{glyph:'♑',name:'山羊座'},{glyph:'♒',name:'水瓶座'},{glyph:'♓',name:'魚座'}],
 Array.from({length:12},(_,i)=>({glyph:String(i+1),name:'第'+(i+1)+'ハウス'}))
];

export const TRIGRAMS=["乾","兌","離","震","巽","坎","艮","坤"];
export const PRESETS={
 normal:{title:'DICE LAB',subtitle:'PHYSICS OF FORTUNE',result:'sum',description:'通常ダイス。種類・使用数・色を自由に設定できます。',dice:[6,8,10,12,20].map((sides,i)=>({sides,color:['#c7b48d','#b8a17a','#c7b48d','#d2bc98','#c7b48d'][i],surface:'ring',markings:'number',label:'D'+sides}))},
 astro:{title:'ASTRO DICE',subtitle:'PLANETS · ZODIAC · HOUSES',result:'symbols',description:'3個の12面体。対向面の値は合計13。',dice:['天体','十二宮','ハウス'].map((label,i)=>({sides:12,color:['#c5a269','#6b81a1','#658c78'][i],surface:'ivory',markings:'astro',label,faces:astroFaces[i],opposites:'sum13'}))},
 iching:{title:'I CHING DICE',subtitle:'THE EIGHT TRIGRAMS · SIXTY-FOUR HEXAGRAMS',result:'hexagram',description:'八卦2個と動爻1個。象牙風の漢字刻印。動爻が必ず1本出る簡便法。',dice:[
  {sides:8,color:'#e2d7af',surface:'ivory',markings:'engraved',label:'上卦',ink:'#a0252b',faces:TRIGRAMS.map(glyph=>({glyph,name:glyph}))},
  {sides:8,color:'#e2d7af',surface:'ivory',markings:'engraved',label:'下卦',ink:'#29242a',faces:TRIGRAMS.map(glyph=>({glyph,name:glyph}))},
  {sides:6,color:'#e2d7af',surface:'ivory',markings:'engraved',label:'動爻',ink:'#29242a',faces:['初','二','三','四','五','上'].map((glyph,i)=>({glyph,name:i===0?'初爻':i===5?'上爻':'第'+(i+1)+'爻',ink:i===0?'#a0252b':'#29242a'}))}
 ]}
};
export function preset(id){if(!PRESETS[id])throw Error('Unknown dice preset');return {...PRESETS[id],id,dice:PRESETS[id].dice.map(d=>({...d,faces:d.faces?.map(f=>({...f}))}))};}
