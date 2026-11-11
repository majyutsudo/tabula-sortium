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

test('the built-in deck adds two distinct Jokers to the unchanged 52 standard cards',()=>{
  const builtin=deck.builtInPlaying;
  assert.equal(builtin.id,'playing-cards');
  assert.equal(builtin.name,'TABULA PLAYING CARDS');
  const cards=deck.generate(builtin);
  const standard=deck.generate(faces);
  assert.deepEqual(cards.slice(0,52).map(c=>c.id),standard.map(c=>c.id));
  assert.equal(cards.length,54);
  assert.deepEqual(Array.from(cards.slice(52),c=>c.id),['playing-joker-1','playing-joker-2']);
  assert.ok(cards.slice(52).every(c=>c.kind==='joker'&&c.rankId===null&&c.suitId===null));
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

test('orientation dots are opt-in and appear once on faces that are rotationally symmetric',()=>{
  const cards=deck.generate(faces);
  const marked=[];
  for(const card of cards){
    const suit=suits.get(card.suitId);
    assert.doesNotMatch(draw(card),/playing-card-orientation-mark/);
    const face=deck.playingFaceMarkup(card,suit.symbol,suit.color,card.number,true);
    const dots=[...face.matchAll(/class="playing-card-orientation-mark"/g)];
    if(dots.length){
      assert.equal(dots.length,1);
      assert.match(face,/<circle class="playing-card-orientation-mark" cx="107" cy="13"/);
      marked.push(card.id);
    }
  }
  const expected=faces.suits.flatMap(suit=>{
    const ranks=suit.id==='diamonds'?[1,2,3,4,5,6,8,9,10,11,12,13]:[2,4,6,8,10,11,12,13];
    return ranks.map(rank=>'c_'+suit.id+'_r'+rank);
  });
  assert.deepEqual(marked,Array.from(expected));
});


test('both built-in Jokers share one full-bleed SVG image without a second card border',()=>{
 const jokers=deck.generate(deck.builtInPlaying).filter(card=>card.kind==='joker');
 assert.equal(jokers.length,2);
 const faces=jokers.map(card=>deck.playingFaceMarkup(card));
 assert.equal(faces[0],faces[1]);
 for(const face of faces){
  assert.match(face,/class="playing-card-face-svg"/);
  assert.match(face,/viewBox="0 0 120 180"/);
  assert.match(face,/<image href="images\/decks\/tabula-playing-cards\/joker\.webp\?v=0371" x="0" y="0" width="120" height="180" preserveAspectRatio="none"\/>/);
  assert.doesNotMatch(face,/<rect|class="playing-card-index"/);
 }
});
