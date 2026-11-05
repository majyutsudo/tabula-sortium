/* TABULA SORTIUM — presentational formatting helpers.
   Pure functions; no live DOM or application-state dependency. */
(function(root){'use strict';
function snapshotSummary(v){return `${v.placed.length}枚 ／ ${v.spread==='celtic'?'ケルト十字':v.spread==='three'?'3枚引き':v.spread==='one'?'1枚引き':'自由配置'}`}

function snapshotFace(p,cards){const c=cards.find(v=>v.id===p.id);if(!c)return '不明';const rank=c.number<=10?String(c.number):['P','N','Q','K'][c.number-11];return c.group==='major'?`${c.number} ${c.name}`:`${c.suit==='wands'?'杖':c.suit==='cups'?'杯':c.suit==='swords'?'剣':'金貨'} ${rank}`}

function spreadThumb(slots){const items=slots.map(p=>{const x=8+(Number(p.x)||50)*.74,y=8+(Number(p.y)||50)*.48;return `<rect x="${(x-4).toFixed(1)}" y="${(y-7).toFixed(1)}" width="8" height="14" rx="1" transform="rotate(${Number(p.angle)||0} ${x.toFixed(1)} ${y.toFixed(1)})" fill="#31453f" stroke="#cdb585" stroke-width=".9"/>`}).join('');return `<svg viewBox="0 0 90 67" aria-hidden="true"><rect width="90" height="67" rx="3" fill="#202b2a"/>${items}</svg>`}

function cardDisplayRotation(item,spread){return (spread==='celtic'&&item.slot===1&&item.faceUp?80:item.angle)+(item.reversed&&item.faceUp?180:0)}
root.TabulaUiFormat=Object.freeze({snapshotSummary,snapshotFace,spreadThumb,cardDisplayRotation});
})(globalThis);
