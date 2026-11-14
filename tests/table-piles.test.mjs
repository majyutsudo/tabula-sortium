import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const ctx={};
for(const file of ['physical-identity.js','table-piles.js'])runInNewContext(readFileSync(new URL('../js/'+file,import.meta.url),'utf8'),ctx);
const P=ctx.TabulaTablePiles,I=ctx.TabulaPhysicalIdentity;
const fresh=()=>I.ensureSingle({deck:[{id:'c'}],placed:[{id:'a',slot:0,x:20,y:30,faceUp:true},{id:'b',slot:1,x:50,y:30,faceUp:false}],removed:[],tablePiles:[]});
const ids=s=>[...s.deck,...s.placed,...s.removed,...s.tablePiles.flatMap(p=>p.cards)].map(c=>c.instanceId);
test('piles retain top-first physical order and leave spread slots empty',()=>{
 const s=fresh(),pile=P.create(s,78,62);
 assert.equal(pile.cards.length,0);
 P.deposit(s,0,pile.id);P.deposit(s,0,pile.id);
 assert.deepEqual(Array.from(pile.cards,c=>c.id),['b','a']);
 assert.equal(s.placed.length,0);
 assert.deepEqual(ids(s).sort(),['A:a','A:b','A:c']);
 assert.equal(I.ensureSingle(s),s);
 const card=P.withdraw(s,pile.id,{x:20,y:30,slot:0});
 assert.equal(card.id,'b');assert.equal(card.slot,0);
 assert.equal(card.faceUp,false);
 assert.deepEqual(Array.from(pile.cards,c=>c.id),['a']);
 assert.equal(I.ensureSingle(JSON.parse(JSON.stringify(s))).placed[0].instanceId,'A:b');
});
test('new reading conserves identities while stacks are still present',()=>{
 const s=fresh(),pile=P.create(s,72,44);
 P.deposit(s,0,pile.id);
 const next=I.nextReading(s,[{id:'a'},{id:'b'},{id:'c'}]);
 assert.deepEqual(Array.from(next,c=>c.instanceId),['A:a','A:b','A:c']);
 const recovered=P.collect(s);
 assert.deepEqual(Array.from(recovered,c=>c.id),['a']);
 assert.equal(s.tablePiles.length,0);
 assert.deepEqual(ids(s).sort(),['A:b','A:c']);
});
test('withdraw cannot overwrite occupied slots or take from empty pile',()=>{
 const s=fresh(),pile=P.create(s,80,50);
 P.deposit(s,0,pile.id);
 assert.throws(()=>P.withdraw(s,pile.id,{x:50,y:30,slot:1}));
 assert.equal(pile.cards.length,1);
 const card=P.withdraw(s,pile.id,{x:72,y:70});
 assert.equal(card.slot,null);
 assert.throws(()=>P.withdraw(s,pile.id,{x:72,y:70}));
 assert.throws(()=>P.removeEmpty(s,'not-here'));
 P.removeEmpty(s,pile.id);
 assert.equal(s.tablePiles.length,0);
});
test('card identity validation checks cards inside piles',()=>{
 const s=fresh(),pile=P.create(s,83,42);P.deposit(s,0,pile.id);
 s.deck.push({...pile.cards[0]});
 assert.throws(()=>I.ensureSingle(s));
});
test('pile moves, serialization and collection preserve physical order',()=>{
 const s=fresh(),p=P.create(s,70,70);P.deposit(s,0,p.id);P.deposit(s,0,p.id);
 P.relocate(s,p.id,91,10);
 const saved=JSON.parse(JSON.stringify(s));
 const p2=P.find(saved,p.id);
 assert.equal(p2.x,91);assert.equal(p2.y,10);
 assert.deepEqual(Array.from(p2.cards,c=>c.id),['b','a']);
 const returned=P.collect(saved);
 assert.deepEqual(Array.from(returned,c=>c.instanceId),['A:b','A:a']);
 assert.equal(I.ensureSingle({...saved,deck:[...returned,...saved.deck],placed:[],removed:[]}).deck.length,3);
});

test('transfer preserves the order of the selected top block and target cards',()=>{
 const s=fresh(),one=P.create(s,25,40),two=P.create(s,75,40);
 P.deposit(s,0,one.id);P.deposit(s,0,one.id);
 const stock=s.deck.shift();two.cards.push(stock);
 const originals=Array.from(one.cards,c=>c.instanceId);
 const result=P.transfer(s,one.id,two.id,2);
 assert.deepEqual(Array.from(result,c=>c.instanceId),originals);
 assert.deepEqual(Array.from(two.cards,c=>c.instanceId),[...originals,stock.instanceId]);
 assert.equal(one.cards.length,0);
 assert.equal(I.ensureSingle(s),s);
});
test('split lifts a top sequence without reversing it or recreating identities',()=>{
 const s=fresh(),pile=P.create(s,25,40);
 P.deposit(s,0,pile.id);P.deposit(s,0,pile.id);
 const top=pile.cards[0].instanceId;
 const child=P.split(s,pile.id,1,70,60);
 assert.equal(child.cards.length,1);
 assert.equal(child.cards[0].instanceId,top);
 assert.equal(pile.cards.length,1);
 assert.notEqual(child.id,pile.id);
 assert.equal(I.ensureSingle(s),s);
 const persisted=JSON.parse(JSON.stringify(s));
 const returned=P.collect(persisted);
 assert.deepEqual(Array.from(returned,c=>c.instanceId),[pile.cards[0].instanceId,top]);
});
test('invalid transfer and split leave both source and destination unchanged',()=>{
 const s=fresh(),a=P.create(s,30,40),b=P.create(s,70,40);
 P.deposit(s,0,a.id);P.deposit(s,0,a.id);
 const before=JSON.stringify(s);
 assert.throws(()=>P.transfer(s,a.id,a.id,1));
 assert.throws(()=>P.transfer(s,a.id,b.id,3));
 assert.throws(()=>P.transfer(s,a.id,'missing',1));
 assert.throws(()=>P.transfer(s,a.id,b.id,0));
 assert.throws(()=>P.split(s,a.id,3,20,20));
 assert.throws(()=>P.split(s,a.id,1,Number.NaN,20));
 assert.equal(JSON.stringify(s),before);
});
test('whole-pile merge preserves block order and empty source may be removed',()=>{
 const s=fresh(),one=P.create(s,30,35),two=P.create(s,70,45);
 P.deposit(s,0,one.id);P.deposit(s,0,one.id);
 const last=s.deck.shift();two.cards.push(last);
 const before=one.cards.map(c=>c.instanceId);
 P.transfer(s,one.id,two.id,one.cards.length);
 P.removeEmpty(s,one.id);
 assert.deepEqual(Array.from(two.cards,c=>c.instanceId),[...before,last.instanceId]);
 assert.equal(s.tablePiles.length,1);
 assert.deepEqual(ids(s).sort(),['A:a','A:b','A:c']);
});

test('stock can be dealt directly onto a pile preserving identity and order',()=>{
 const s=fresh(),pile=P.create(s,40,45);
 s.deck.push(...s.placed.splice(0));
 const first=s.deck[0],second=s.deck[1];
 P.drawFromDeck(s,pile.id,false);
 P.drawFromDeck(s,pile.id,true);
 assert.deepEqual(Array.from(pile.cards,c=>c.instanceId),[second.instanceId,first.instanceId]);
 assert.equal(pile.cards[0].faceUp,true);
 assert.equal(pile.cards[1].faceUp,false);
 assert.equal(s.deck.length,1);
 assert.equal(I.ensureSingle(s),s);
});
test('stock-to-pile deal rejects an empty stock without changing a pile',()=>{
 const s=fresh(),pile=P.create(s,40,45);
 s.deck=[];
 assert.throws(()=>P.drawFromDeck(s,pile.id));
 assert.deepEqual(pile.cards,[]);
});

test('free-angle fan geometry persists through serialization without changing card order',()=>{
 const s=fresh(),pile=P.create(s,40,45);
 P.deposit(s,0,pile.id);P.deposit(s,0,pile.id);
 const original=Array.from(pile.cards,c=>c.instanceId);
 const fan=P.setFan(s,pile.id,.27,-.43);
 assert.equal(fan.dx,.27);assert.equal(fan.dy,-.43);
 const restored=JSON.parse(JSON.stringify(s));
 assert.deepEqual(P.fanOf(restored.tablePiles[0]),{dx:.27,dy:-.43});
 assert.deepEqual(Array.from(restored.tablePiles[0].cards,c=>c.instanceId),original);
 const separated=P.split(restored,pile.id,1,72,60);
 assert.deepEqual(P.fanOf(separated),{dx:.27,dy:-.43});
 assert.equal(I.ensureSingle(restored),restored);
});
test('fan accepts diagonal vectors and clamps excessive offsets',()=>{
 const s=fresh(),pile=P.create(s,45,45);
 P.setFan(s,pile.id,1.7,-1.5);
 assert.deepEqual(P.fanOf(pile),{dx:.85,dy:-.85});
 P.setFan(s,pile.id,0,0);
 assert.deepEqual(P.fanOf(pile),{dx:0,dy:0});
 assert.throws(()=>P.setFan(s,pile.id,Number.NaN,0));
});

test('semantic tabletop roles stay with their pile and survive card transfers',()=>{
 const state=fresh(),talon=P.create(state,30,40,'waste'),discard=P.create(state,70,40,'discard');
 P.deposit(state,0,talon.id);P.deposit(state,0,talon.id);
 const before=Array.from(talon.cards,c=>c.instanceId);
 assert.equal(P.roleOf(talon),'waste');
 P.transfer(state,talon.id,discard.id,1);
 assert.equal(P.roleOf(talon),'waste');
 assert.equal(P.roleOf(discard),'discard');
 assert.deepEqual(Array.from(discard.cards,c=>c.instanceId),before.slice(0,1));
 const offshoot=P.split(state,talon.id,1,50,60);
 assert.equal(P.roleOf(offshoot),'pile');
 P.setRole(state,offshoot.id,'foundation');
 assert.equal(P.roleOf(JSON.parse(JSON.stringify(offshoot))),'foundation');
 assert.equal(I.ensureSingle(state),state);
});
test('pile role validation rejects unrecognized role without changing card state',()=>{
 const state=fresh(),p=P.create(state,40,50);
 const before=JSON.stringify(state);
 assert.throws(()=>P.setRole(state,p.id,'invalid-role'));
 assert.throws(()=>P.create(state,80,50,'invalid-role'));
 assert.equal(JSON.stringify(state),before);
});

test('intentional two-card stack uses dropped card as top without absorbing neighbors',()=>{
 const state=fresh();
 state.placed.push({id:'d',instanceId:'A:d',slot:null,x:40,y:45,faceUp:true});
 const original=ids(state).sort();
 const stack=P.stackPlaced(state,0,1);
 assert.deepEqual(Array.from(stack.cards,c=>c.id),['a','b']);
 assert.equal(stack.x,50);assert.equal(stack.y,30);
 assert.equal(P.roleOf(stack),'pile');
 assert.deepEqual(Array.from(state.placed,c=>c.id),['d']);
 assert.deepEqual(ids(state).sort(),original);
 assert.equal(I.ensureSingle(state),state);
});
test('invalid two-card stack request is atomic',()=>{
 const state=fresh(),before=JSON.stringify(state);
 assert.throws(()=>P.stackPlaced(state,0,0));
 assert.throws(()=>P.stackPlaced(state,0,999));
 assert.equal(JSON.stringify(state),before);
});

test('tapping a card in a pile flips only that card and preserves physical order',()=>{
 const state=fresh(),pile=P.create(state,48,51);
 P.deposit(state,0,pile.id);P.deposit(state,0,pile.id);
 const identities=Array.from(pile.cards,c=>c.instanceId);
 const first=!!pile.cards[0].faceUp,second=!!pile.cards[1].faceUp;
 P.flipCard(state,pile.id,0);
 assert.equal(pile.cards[0].faceUp,!first);
 assert.equal(!!pile.cards[1].faceUp,second);
 P.flipCard(state,pile.id,1);
 assert.equal(pile.cards[1].faceUp,!second);
 assert.deepEqual(Array.from(pile.cards,c=>c.instanceId),identities);
 assert.equal(I.ensureSingle(state),state);
 const restored=JSON.parse(JSON.stringify(state));
 assert.equal(restored.tablePiles[0].cards[0].faceUp,!first);
});
test('invalid flip indices do not modify ordered pile contents',()=>{
 const state=fresh(),p=P.create(state,35,40);
 P.deposit(state,0,p.id);
 const before=JSON.stringify(state);
 assert.throws(()=>P.flipCard(state,p.id,4));
 assert.throws(()=>P.flipCard(state,p.id,-1));
 assert.throws(()=>P.flipCard(state,p.id,1.5));
 assert.equal(JSON.stringify(state),before);
});

test('Open candidate list contains top cards of piles only, independent of fan direction or role',()=>{
 const state=fresh();
 const p=P.create(state,35,40,'tableau'),w=P.create(state,65,40,'waste');
 P.deposit(state,0,p.id);P.deposit(state,0,p.id);
 P.deposit(state,0,w.id);P.deposit(state,0,w.id);
 P.setFan(state,p.id,.31,-.42);
 p.cards[0].faceUp=false;p.cards[1].faceUp=false;
 w.cards[0].faceUp=true;w.cards[1].faceUp=false;
 const before=JSON.stringify(state),closed=P.closedTopCards(state);
 assert.equal(closed.length,1);
 assert.equal(closed[0],p.cards[0]);
 assert.equal(JSON.stringify(state),before);
 closed.forEach(card=>card.faceUp=true);
 assert.equal(p.cards[0].faceUp,true);
 assert.equal(p.cards[1].faceUp,false);
 assert.equal(w.cards[1].faceUp,false);
 assert.equal(P.closedTopCards(state).length,0);
 const restored=JSON.parse(JSON.stringify(state));
 assert.equal(restored.tablePiles[0].cards[1].faceUp,false);
});

test('creating a pile on a registered spread card preserves its position',()=>{
 const state=fresh();
 const pile=P.stackPlaced(state,0,1);
 assert.equal(pile.slot,1);
 assert.equal(pile.cards.length,2);
 assert.deepEqual(Array.from(pile.cards,c=>c.instanceId),['A:a','A:b']);
 assert.equal(state.placed.length,0);
 const restored=JSON.parse(JSON.stringify(state));
 assert.equal(restored.tablePiles[0].slot,1);
 assert.equal(I.ensureSingle(restored),restored);
 // A card cannot be withdrawn into a position already owned by a pile.
 const other=P.create(state,80,70);
 P.drawFromDeck(state,other.id,false);
 assert.throws(()=>P.withdraw(state,other.id,{x:50,y:30,slot:1}));
 assert.equal(other.cards.length,1);
 const split=P.split(state,pile.id,1,65,60);
 assert.equal(split.slot,undefined);
 assert.equal(pile.slot,1);
 assert.equal(P.roleOf(split),'pile');
});

test('refilling an empty registered pile preserves identity, role, slot and fan',()=>{
 const state=fresh();
 const pile=P.stackPlaced(state,0,1);
 P.setRole(state,pile.id,'tableau');
 P.setFan(state,pile.id,.22,-.35);
 const other=P.create(state,85,70,'discard');
 P.transfer(state,pile.id,other.id,2);
 assert.equal(pile.cards.length,0);
 const before=ids(state).sort(),originalId=pile.id,originalSlot=pile.slot;
 const stockTop=state.deck[0].instanceId;
 const dealt=P.drawFromDeck(state,pile.id,false);
 assert.equal(dealt.instanceId,stockTop);
 assert.equal(pile.id,originalId);
 assert.equal(pile.slot,originalSlot);
 assert.equal(P.roleOf(pile),'tableau');
 assert.deepEqual(JSON.parse(JSON.stringify(P.fanOf(pile))),{dx:.22,dy:-.35});
 assert.deepEqual(ids(state).sort(),before);
 const persisted=JSON.parse(JSON.stringify(state));
 assert.equal(P.find(persisted,pile.id).cards.length,1);
 assert.equal(I.ensureSingle(persisted),persisted);
});

test('top card of an existing pile can form a new pile on a single placed card',()=>{
 const state=fresh();
 const source=P.create(state,20,45,'tableau');
 P.deposit(state,0,source.id); // slot 0 card a moved to source
 const sourceId=source.cards[0].instanceId;
 const targetId=state.placed[0].instanceId;
 const originals=ids(state).sort();
 const result=P.stackFromPile(state,source.id,0);
 assert.equal(result.slot,1);
 assert.deepEqual(Array.from(result.cards,c=>c.instanceId),[sourceId,targetId]);
 assert.equal(source.cards.length,0);
 assert.equal(P.find(state,source.id).id,source.id);
 assert.equal(P.roleOf(source),'tableau');
 assert.deepEqual(ids(state).sort(),originals);
 assert.equal(I.ensureSingle(state),state);
 const persisted=JSON.parse(JSON.stringify(state));
 assert.equal(persisted.tablePiles[0].cards.length,0);
 assert.equal(persisted.tablePiles[1].slot,1);
});
test('selected top block stays top-first when stacked onto a single card',()=>{
 const state=fresh();
 const source=P.create(state,20,45);
 P.deposit(state,0,source.id);
 const extra=state.deck.shift();
 source.cards.unshift(extra);
 const order=Array.from(source.cards,c=>c.instanceId);
 const bottom=state.placed[0].instanceId;
 const result=P.stackFromPile(state,source.id,0,2);
 assert.deepEqual(Array.from(result.cards,c=>c.instanceId),[...order,bottom]);
 assert.equal(source.cards.length,0);
 assert.equal(I.ensureSingle(state),state);
});
test('invalid pile-to-single-card stack is atomic',()=>{
 const state=fresh();
 const p=P.create(state,30,40);
 P.deposit(state,0,p.id);
 const before=JSON.stringify(state);
 assert.throws(()=>P.stackFromPile(state,p.id,99));
 assert.throws(()=>P.stackFromPile(state,p.id,0,3));
 assert.throws(()=>P.stackFromPile(state,p.id,0,0));
 assert.equal(JSON.stringify(state),before);
});

test('stock dragged onto a registered single card forms a two-card pile',()=>{
 const state=fresh(),before=ids(state).sort();
 const pile=P.stackFromDeck(state,1,false);
 assert.equal(pile.slot,1);
 assert.deepEqual(Array.from(pile.cards,c=>c.instanceId),['A:c','A:b']);
 assert.deepEqual(Array.from(pile.cards,c=>c.faceUp),[false,false]);
 assert.equal(state.placed.length,1);
 assert.equal(state.deck.length,0);
 assert.deepEqual(ids(state).sort(),before);
 assert.equal(I.ensureSingle(state),state);
});
test('stock on loose single preserves its face state and leaves no extra placed card',()=>{
 const state=fresh();state.placed[0].slot=null;
 const original=state.placed[0].instanceId;
 const pile=P.stackFromDeck(state,0,true);
 assert.equal(pile.slot,undefined);
 assert.deepEqual(Array.from(pile.cards,c=>c.instanceId),['A:c',original]);
 assert.equal(pile.cards[0].faceUp,true);
 assert.equal(pile.cards[1].faceUp,true);
 assert.equal(state.placed.length,1);
 const before=JSON.stringify(state);
 assert.throws(()=>P.stackFromDeck(state,99));
 assert.equal(JSON.stringify(state),before);
});
