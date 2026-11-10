import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const context={};
runInNewContext(readFileSync(new URL('../js/deck-blueprint.js',import.meta.url),'utf8'),context);
const deck=context.TabulaDeckBlueprint;
const faces=deck.playingCards();
const suits=new Map(faces.suits.map(s=>[s.id,s]));
const draw=card=>deck.playingFaceMarkup(card,suits.get(card.suitId)?.symbol,suits.get(card.suitId)?.color);

test('the existing 52-card template has 40 pip faces with the correct count and two indices',()=>{
  let pipFaces=0;
  const cards=deck.generate(faces);
  assert.equal(cards.length,52);
  for(const card of cards){
    const count=Number(card.rankId.slice(1));
    const face=draw(card);
    if(count>10){
      assert.match(face,/class="playing-card-court"/);
      assert.doesNotMatch(face,/class="playing-card-pip"/);
      continue;
    }
    pipFaces++;
    assert.equal(card.id,'c_'+card.suitId+'_r'+count);
    assert.equal([...face.matchAll(/class="playing-card-pip"/g)].length,count);
    assert.equal([...face.matchAll(/class="playing-card-index"/g)].length,2);
    assert.match(face,/class="playing-card-index" transform="rotate\(180 60 90\)"/);
    assert.match(face,suits.get(card.suitId).color==='red'?/#a5232c/:/#25211e/);
  }
  assert.equal(pipFaces,40);
});

test('the seven through ten use the conventional centre positions and flipped lower pips',()=>{
  const cards=deck.generate(faces);
  const center=rank=>Array.from(draw(cards.find(c=>c.id==='c_spades_r'+rank))
    .matchAll(/class="playing-card-pip" transform="translate\(60 ([\d.]+)\)([^"]*)"/g),
    ([,y,transform])=>[Number(y),transform.trim()]);
  assert.deepEqual(center(7),[[61,'']]);
  assert.deepEqual(center(8),[[61,''],[119,'rotate(180)']]);
  assert.deepEqual(center(9),[[90,'']]);
  assert.deepEqual(center(10),[[51.5,''],[128.5,'rotate(180)']]);
});

test('the face uses the stable rank and suit IDs while labels and symbols stay editable',()=>{
  const card={id:'c_spades_r2',suitId:'spades',rankId:'r2',number:'II',name:'吊り橋'};
  const face=deck.playingFaceMarkup(card,'<星>','black');
  assert.equal([...face.matchAll(/class="playing-card-pip"/g)].length,2);
  assert.match(face,/>II<\/text>/);
  assert.match(face,/&lt;星&gt;/);
  assert.doesNotMatch(face,/吊り橋|<星>/);
  assert.equal(deck.playingFaceMarkup({...card,suitId:'custom'},'✦','black'),'');
  assert.equal(deck.playingFaceMarkup({...card,rankId:'custom'},'♠','black'),'');
});

test('the built-in deck preserves all 52 template IDs and ships twelve symmetric court faces',()=>{
  const builtin=deck.builtInPlaying;
  assert.equal(builtin.id,'playing-cards');
  assert.equal(builtin.name,'TABULA PLAYING CARDS');
  const cards=deck.generate(builtin);
  assert.deepEqual(cards.map(c=>c.id),deck.generate(faces).map(c=>c.id));
  const courts=cards.filter(deck.isPlayingCourt);
  assert.equal(courts.length,12);
  const clips=new Set();
  for(const card of courts){
    const face=draw(card);
    const images=Array.from(face.matchAll(/<image href="([^"]+)"/g),m=>m[1]);
    assert.equal(images.length,2);
    assert.equal(images[0],images[1]);
    assert.match(images[0],new RegExp(card.suitId+'-'+card.number.toLowerCase()+'\\.webp$'));
    assert.match(face,/rotate\(180 60 90\)/);
    assert.equal(readFileSync(new URL('../'+images[0],import.meta.url)).toString('ascii',8,12),'WEBP');
    const clip=face.match(/<clipPath id="([^"]+)"/)[1];
    assert.ok(!clips.has(clip));
    clips.add(clip);
  }
});
