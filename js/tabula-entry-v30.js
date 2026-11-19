const scene=document.getElementById('scene'),deck=document.getElementById('deck'),card=document.getElementById('card'),enter=document.getElementById('enter'),status=document.getElementById('status');let phase=0,raf=0,timer=0,expandTimer=0,fadeTimer=0,skyTimer=0,ghostTimers=[];const DURATION=12000,FADE_DELAY=1300,AWAKEN_DELAY=1500;

const spectres=document.getElementById('spectres');
const tarotRoot='images/decks/tabula-tarot/base/';
const majorNames=['THE FOOL','THE MAGICIAN','THE HIGH PRIESTESS','THE EMPRESS','THE EMPEROR','THE HIEROPHANT','THE LOVERS','THE CHARIOT','STRENGTH','THE HERMIT','WHEEL OF FORTUNE','JUSTICE','THE HANGED MAN','DEATH','TEMPERANCE','THE DEVIL','THE TOWER','THE STAR','THE MOON','THE SUN','JUDGEMENT','THE WORLD'];
const majorUrl=n=>`${tarotRoot}major_${String(n).padStart(2,'0')}.webp`;
let selectedMajor=null;
function shuffledMajors(){const a=Array.from({length:22},(_,i)=>i);for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function summonSpectres(others){
 spectres.replaceChildren();ghostTimers.forEach(clearTimeout);ghostTimers=[];
 // The remaining 21 majors are dealt towards a 7x3 (or 3x7) invisible spread.
 // Each follows a generous curved, looping approach rather than skimming straight lines.
 const w=innerWidth,h=innerHeight,mobile=w<=650;
 const cols=mobile?3:7, rows=mobile?7:3;
 const spots=Array.from({length:21},(_,i)=>{
   const col=i%cols,row=Math.floor(i/cols);
   const usableW=mobile?w*.68:w*.72,usableH=mobile?h*.48:h*.45;
   return {x:(col-(cols-1)/2)*(usableW/Math.max(1,cols-1)),y:(row-(rows-1)/2)*(usableH/Math.max(1,rows-1))};
 });
 const order=Array.from({length:21},(_,i)=>i).sort((a,b)=>((a*8)%21)-((b*8)%21));
 others.forEach((n,i)=>{
   const dest=spots[order[i]],el=document.createElement('div');
   el.className='spectre spread-card';
   el.innerHTML='<span class="ghost-inner"><span class="ghost-front"></span><span class="ghost-back"></span></span>';
   el.querySelector('.ghost-front').style.backgroundImage=`url("${majorUrl(n)}")`;
   const side=i%4, rnd=()=>Math.random()-.5;
   const start=side===0?{x:-w*.65,y:h*rnd()*.85}:side===1?{x:w*.65,y:h*rnd()*.85}:side===2?{x:w*rnd()*.85,y:-h*.68}:{x:w*rnd()*.85,y:h*.68};
   // A winding two-arc path: wide first loop, then a graceful turn into its slot.
   const sign=i%2?1:-1;
   const spread=Math.min(w,h)*(mobile?.37:.48);
   const mid={x:(start.x+dest.x)*.38+sign*spread*.6,y:(start.y+dest.y)*.36-sign*spread*.7};
   const c1={x:start.x*.65+sign*spread,y:start.y*.65-sign*spread*.65};
   const c2={x:mid.x-sign*spread*.85,y:mid.y-sign*spread*.65};
   const c3={x:mid.x+sign*spread*.85,y:mid.y+sign*spread*.8};
   const c4={x:dest.x+sign*spread*.7,y:dest.y-sign*spread*.55};
   const f=v=>v.toFixed(1);
   el.style.offsetPath=`path('M ${f(start.x)} ${f(start.y)} C ${f(c1.x)} ${f(c1.y)}, ${f(c2.x)} ${f(c2.y)}, ${f(mid.x)} ${f(mid.y)} C ${f(c3.x)} ${f(c3.y)}, ${f(c4.x)} ${f(c4.y)}, ${f(dest.x)} ${f(dest.y)}')`;
   const delay=AWAKEN_DELAY/1000+.13+i*.19;
   const life=5.1+(i%4)*.3;
   const props={'--delay':delay+'s','--life':life+'s','--r0':(rnd()*28)+'deg','--r1':(rnd()*12)+'deg','--depth':mobile?.66:.78,'--spin':(i%2?'-':'')+(360+(i%3)*180)+'deg'};
   Object.entries(props).forEach(([k,v])=>el.style.setProperty(k,v));
   spectres.append(el);requestAnimationFrame(()=>el.classList.add('active'));
 });
}
function drawMajor(){
 const order=shuffledMajors(),n=order[0];
 selectedMajor=n;
 // Do not render the face or its title during the flight.
 return order.slice(1);
}
function centerOf(el){const r=el.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}}
function deal(){if(phase!==0)return;phase=1;scene.classList.remove('arrived','sky-awake','revealing');scene.classList.add('ritual');summonSpectres(drawMajor());skyTimer=setTimeout(()=>{if(phase===1)scene.classList.add('sky-awake')},AWAKEN_DELAY);const a=centerOf(deck),s=scene.getBoundingClientRect(),cx=s.left+s.width*.5,cy=s.top+s.height*(innerWidth<=650?.52:.56);const dx=a.x-cx,dy=a.y-cy,angle0=Math.atan2(dy,dx),r0=Math.hypot(dx,dy),outer=Math.max(r0,Math.min(innerWidth*.35,innerHeight*.39));const started=performance.now();card.className='deal-card dealing';deck.style.pointerEvents='none';fadeTimer=setTimeout(()=>{if(phase===1)deck.classList.add('vanishing')},FADE_DELAY);status.textContent='カードがゆっくりと螺旋を描いています…';function frame(now){if(phase!==1)return;const t=Math.min(1,(now-started)/DURATION),r=t<.15?r0+(outer-r0)*t/.15:outer*(1-(t-.15)/.85),theta=angle0+Math.PI*2*(.75*t+.25*t*t*t*t);card.style.left=(cx+r*Math.cos(theta))+'px';card.style.top=(cy+r*Math.sin(theta))+'px';card.style.transform='translate(-50%,-50%)';
// Keep the divination face concealed throughout the entire flight.
// The back banks gently with the trajectory, but never exposes the front.
const bank=Math.sin(t*Math.PI*2)*16*(1-.45*t);
const pitch=Math.sin(t*Math.PI*3)*9*(1-t);
card.style.setProperty('--flight-y','0deg');
card.style.setProperty('--flight-z',bank+'deg');
card.style.setProperty('--flight-x',pitch+'deg');
if(t<1)raf=requestAnimationFrame(frame);else{card.className='deal-card placed';card.style.left='';card.style.top='';card.style.transform='';card.style.removeProperty('--flight-y');card.style.removeProperty('--flight-z');card.style.removeProperty('--flight-x');phase=2;scene.classList.add('arrived');status.textContent='選ばれた大アルカナを裏返して、運命の一枚をご覧ください。'}}raf=requestAnimationFrame(frame)}
function flip(){if(phase!==2||selectedMajor===null)return;phase=3;
 document.getElementById('drawnFace').innerHTML=TabulaEntryFace.face(selectedMajor,'en');
 document.getElementById('drawnTitle').textContent=TabulaEntryFace.title(selectedMajor,'en');
 document.getElementById('drawnLanguage').textContent=TabulaEntryFace.title(selectedMajor,'ja');
 scene.classList.add('revealing');card.classList.add('flipped');const flash=document.getElementById('revelationFlash');flash.classList.remove('burst');void flash.offsetWidth;flash.classList.add('burst');
 // The flash hides the physical enlargement: retain the small card until
 // its first bright wave has arrived, then expand beneath the light.
 expandTimer=setTimeout(()=>{if(phase===3||phase===4)card.classList.add('expanded')},420);
 status.textContent='';timer=setTimeout(()=>{enter.classList.add('show');const banner=document.getElementById('enterBanner');banner.classList.add('show','revealed');phase=4},1850)}function reset(){clearTimeout(timer);clearTimeout(expandTimer);clearTimeout(fadeTimer);clearTimeout(skyTimer);cancelAnimationFrame(raf);phase=0;scene.classList.remove('ritual','arrived','sky-awake','revealing');document.getElementById('revelationFlash').classList.remove('burst');spectres.replaceChildren();ghostTimers.forEach(clearTimeout);ghostTimers=[];card.style.left='';card.style.top='';card.style.transform='';card.style.removeProperty('--flight-y');card.style.removeProperty('--flight-z');card.style.removeProperty('--flight-x');card.className='deal-card';enter.classList.remove('show');document.getElementById('enterBanner').classList.remove('show','revealed');deck.classList.remove('vanishing');deck.style.pointerEvents='';document.getElementById('drawnFace').replaceChildren();selectedMajor=null;document.getElementById('drawnTitle').textContent='';document.getElementById('drawnLanguage').textContent='';status.textContent='山札をクリックして、一枚のカードを引いてください。'}deck.addEventListener('click',deal);card.addEventListener('click',()=>{if(phase===2)flip();else if(phase===4)return});card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();card.click()}});document.getElementById('reset').addEventListener('click',reset);
