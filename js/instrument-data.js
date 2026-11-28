/* TABULA — common symbolic information, independent of physical form.
   Optional fields are never inferred from meanings or from orientation.
   Legacy body/source records remain readable. No runtime state is stored here. */
(function(root){'use strict';
const fields=Object.freeze([
 ['number','番号'],['name','名称'],['group','分類'],['symbol','記号'],['value','数値'],['image','画像'],
 ['fortune','吉凶'],['body','本文'],['keywords','キーワード'],['upright','正位置の解説'],['reversed','逆位置の解説'],['note','注記'],['source','出典']
].map(([id,label])=>Object.freeze({id,label})));
const textKeys=['fortune','body','keywords','upright','reversed','note','source'];
const profiles=Object.freeze({
 card:Object.freeze({fields:Object.freeze(['number','name','group','symbol','image','body','source']),operations:Object.freeze(['mix','draw','select','place','turn','rotate','collect','inspect'])}),
 dice:Object.freeze({fields:Object.freeze(['number','name','group','symbol','value','body','keywords','source']),operations:Object.freeze(['mix','cast','collect','inspect'])}),
 rune:Object.freeze({fields:Object.freeze(['number','name','symbol','image','body','keywords','upright','reversed','source']),operations:Object.freeze(['mix','draw','select','place','cast','turn','rotate','collect','inspect'])}),
 lot:Object.freeze({fields:Object.freeze(['number','fortune','body','source']),operations:Object.freeze(['mix','draw','collect','inspect'])})
});
function textRecord(input){
 const r=typeof input==='string'?{body:input}:input||{};
 const out={body:typeof r.body==='string'?r.body:'',source:typeof r.source==='string'?r.source:''};
 for(const k of textKeys)if(k!=='body'&&k!=='source'&&typeof r[k]==='string'&&r[k].trim())out[k]=r[k];
 return out;
}
function information(input={},extra={}){
 const out={...textRecord(extra)};
 for(const k of ['number','name','group','symbol','value','image']){
  const v=input[k];if(typeof v==='string'||typeof v==='number'&&Number.isFinite(v))out[k]=v;
 }
 return out;
}
function cardInfo(card,record){return information(card,record)}
function dieFaceInfo(die,value){const face=die.faces?.[value-1]||{};return information({number:value,value,name:face.name??String(value),symbol:face.glyph??String(value),group:die.label},face)}
function visibleFields(type,record={},enabled=[]){
 const ids=new Set([...(profiles[type]?.fields||[]),...enabled]);
 return fields.filter(f=>ids.has(f.id)||Object.hasOwn(record,f.id)&&record[f.id]!==''&&record[f.id]!=null);
}
function draw(pool,count=1,random=Math.random){
 if(!Array.isArray(pool)||!Number.isInteger(count)||count<0||count>pool.length)throw Error('Invalid draw count');
 const rest=pool.slice(),selected=[];
 for(let i=0;i<count;i++){const u=random();if(!Number.isFinite(u)||u<0||u>=1)throw Error('Invalid random value');selected.push(rest.splice(Math.floor(u*rest.length),1)[0]);}
 return {selected,remaining:rest};
}
root.TabulaInstrumentData=Object.freeze({fields,profiles,textRecord,information,cardInfo,dieFaceInfo,visibleFields,draw});
})(globalThis);
