import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const file=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const html=file('index.html'),app=file('js/tabula.js'),style=file('css/tabula.css');

test('editorial and functional fonts use explicit separate families',()=>{
 assert.match(style,/--tabula-ui-font:/);
 assert.match(style,/--tabula-editorial-font:/);
 assert.match(style,/\.main>\.toolbar :is\(button,select,output/);
 assert.match(style,/\.table-shortcuts button,/);
 assert.match(style,/\.table-record-actions button,/);
});
test('visible saved-reading vocabulary distinguishes result from archived reading',()=>{
 assert.match(html,/id="quickSnapshotSave">占例を保存/);
 assert.match(app,/id="snapConfirm" class="primary">占例を保存/);
 assert.match(app,/占例の記録一覧/);
 assert.match(html,/id="toggleResults"[^>]*>結果を表示/);
 assert.match(app,/結果を閉じる ▴/);
 assert.doesNotMatch(app,/class="primary">結果を保存/);
});
test('tooltips, units and labels describe all supported decks and physical pile cards',()=>{
 assert.match(html,/id="cardGalleryOpen" title="カード図鑑を開く"/);
 assert.doesNotMatch(html,/全78枚の図鑑を開く/);
 assert.match(html,/id="quickLabels"[^>]*>ポジション名：ON/);
 assert.match(app,/ポジション名：OFF/);
 assert.match(html,/＋ 束を置く/);
 assert.match(app,/state\.tablePiles\|\|\[\]\)\.reduce\(\(n,p\)=>n\+\(p\.cards\?\.length\|\|0\),0\)/);
 assert.doesNotMatch(app,/カードの大きさ/);
});
