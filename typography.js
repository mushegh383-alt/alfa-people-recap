import { screenRect } from './layout-fit.js';
// A shared on-screen size, independent of each scene's fitted design canvas.
export function recapHeadingPixels(width,height) {
 // На вертикальном экране акцентные заголовки крупнее: 15% ширины вместо 10.5%.
 if(width/Math.max(1,height)<.8)return Math.max(44,Math.min(120,width*.15,height*.09));
 return Math.max(40,Math.min(180,width*.105,height*.15));
}
const titleBoxes=new WeakMap();
export function setHeadingScale(element,scale,width,height) {
 const pixels=recapHeadingPixels(width,height);
 element.style.setProperty('--recap-heading-logical',`${pixels/Math.max(.01,scale)}px`);
 element.dataset.headingPixels=pixels.toFixed(2);
 for(const heading of element.querySelectorAll('.hero-title,.person-name,.thanks-title,.income-glass-title,.november-heading')){
  let box=titleBoxes.get(heading);
  if(!box){const style=getComputedStyle(heading);box={center:parseFloat(style.left)+parseFloat(style.width)/2,width:parseFloat(style.width)};titleBoxes.set(heading,box);}
  const span=Math.max(box.width,(width-32)/scale);heading.style.width=`${span}px`;heading.style.left=`${box.center-span/2}px`;
 }
 fitHeadingsToWidth(element,scale,width,height);
 setTextScale(element,scale,width,height);
}

// Единая шкала текста (кроме заголовков и крупных цифр): у каждой роли — ОДИН размер
// на экране на всех слайдах. Сцены масштабируют свои макеты по-разному, поэтому размер
// задаётся в пикселях экрана и пересчитывается в единицы макета (target / scale).
//  label — подпись под цифрой («Раз смотрели ваш профиль», «Ачивки вы получили»…);
//  note  — пояснение, пожелание, поздравление и маленькие строки над заголовком.
const TEXT_ROLES={
 label:'.visit-caption,.thanks-caption,.moments-caption,.learning-label,.november-park-label,.coins-copy,.spending-caption,.talk-contact-label,.sky-label,.tower-label,.finale-seven-name,.planet-label,.achievement-caption,.envelope-caption',
 note:'.thanks-note,.spending-note,.talk-contact-note,.november-park-note,.sky-note,.planet-note,.scene-reading-note,.finale-seven-caption,.income-glass-rank,.talk-contact-kicker,.sky-kicker',
};
export function textMinimum(width,height){
 const clamp=(a,v,b)=>Math.max(a,Math.min(b,v));
 if(width/Math.max(1,height)<.8)return{label:clamp(16,width*.043,18),note:clamp(13.5,width*.036,15)};
 return{label:clamp(17,width*.0145,26),note:clamp(14,width*.0112,20)};
}
export function setTextScale(element,scale,width,height){
 const min=textMinimum(width,height);
 for(const [role,selector] of Object.entries(TEXT_ROLES))for(const node of element.querySelectorAll(selector)){
  if(!node.dataset.baseFont){
   node.style.removeProperty('font-size');const cs=getComputedStyle(node);
   node.dataset.baseFont=String(parseFloat(cs.fontSize)||0);
   // Рамку абсолютно позиционированной подписи растим вместе со шрифтом —
   // переносы строк остаются как в макете, текст просто крупнее.
   if(cs.position==='absolute'&&node.offsetWidth)Object.assign(node.dataset,{baseWidth:node.offsetWidth,baseLeft:node.offsetLeft,baseAlign:cs.textAlign,baseInlineLeft:node.style.left,baseInlineWidth:node.style.width});
   // Блок по центру через margin:auto — растёт ширина, центр сохраняется сам.
   else if(cs.position==='static'&&node.offsetWidth&&cs.marginLeft===cs.marginRight&&parseFloat(cs.marginLeft)>0)Object.assign(node.dataset,{baseWidth:node.offsetWidth,baseStatic:'1',baseInlineWidth:node.style.width});
  }
  const base=Number(node.dataset.baseFont),target=min[role]/Math.max(.01,scale),grow=base?target/base:1;
  if(base&&Math.abs(grow-1)>.01){
   node.style.setProperty('font-size',`${target.toFixed(1)}px`,'important');
   if(node.dataset.baseWidth){
    const naturalWidth=Number(node.dataset.baseWidth);
    const fittedWidth=width/height<.8?Math.min(naturalWidth*grow,(width-32)/scale):naturalWidth*grow;
    const w=naturalWidth,l=Number(node.dataset.baseLeft),align=node.dataset.baseAlign;
    node.style.setProperty('width',`${fittedWidth.toFixed(1)}px`,'important');
    if(!node.dataset.baseStatic){
     const shift=align==='center'?(fittedWidth-w)/2:align==='right'||align==='end'?(fittedWidth-w):0;
     node.style.setProperty('left',`${(l-shift).toFixed(1)}px`,'important');
    }
   }
  }else{
   node.style.removeProperty('font-size');
   if(node.dataset.baseWidth){node.style.removeProperty('width');node.style.removeProperty('left');if(node.dataset.baseInlineLeft)node.style.left=node.dataset.baseInlineLeft;if(node.dataset.baseInlineWidth)node.style.width=node.dataset.baseInlineWidth;}
  }
  node.dataset.textRole=role;
 }
 // Подпись выросла — примечание под ней сдвигается вниз, а не наезжает.
 for(const [upper,lower] of STACKS){
  const a=element.querySelector(upper),b=element.querySelector(lower);
  if(!a||!b||a.offsetParent!==b.offsetParent)continue;
  if(b.dataset.baseTop===undefined)b.dataset.baseTop=String(b.offsetTop);
  const need=a.offsetTop+a.offsetHeight+Math.round(14/Math.max(.01,scale));
  b.style.top=need>Number(b.dataset.baseTop)?`${need}px`:`${b.dataset.baseTop}px`;
 } applyGaps(element,width,height);
}
// ── Система отступов ─────────────────────────────────────────────────────────────
// Между цифрой и подписью — один отступ на всех слайдах (gap1), между подписью и
// пояснением — другой (gap2). Меряем по видимым краям букв (верх заглавных и базовая
// линия), а не по рамкам элементов — у них разный «воздух» в разных шрифтах. Нижний
// элемент сдвигаем свойством translate (не мешает анимациям на transform).
export function textGaps(width,height){
 const clamp=(a,v,b)=>Math.max(a,Math.min(b,v));
 return width/Math.max(1,height)<.8?{gap1:12,gap2:9}:{gap1:clamp(12,width*.0105,20),gap2:clamp(9,width*.0075,14)};
}
const GAP_PAIRS=[
 ['.visit-count','.visit-caption','gap1'],['.thanks-number','.thanks-caption','gap1'],['.envelope-number','.envelope-caption','gap1'],
 ['.moments-number','.moments-caption','gap1'],['.planet-number','.planet-label','gap1'],['.planet-label','.planet-note','gap2'],
 ['.talk-contact-number','.talk-contact-label','gap1'],['.talk-contact-label','.talk-contact-note','gap2'],
 ['.eyes-number','.eyes-label','gap1'],['.eyes-label','.eyes-note','gap2'],
 ['.achievement-number','.achievement-caption','gap1'],['.achievement-caption-line','.scene-reading-note','gap2'],
 ['.spending-number','.spending-caption','gap1'],['.spending-caption','.spending-note','gap2'],
 ['.learning-number','.learning-label','gap1'],['.finale-seven-name','.finale-seven-caption','gap2'],
];
const metricCtx=typeof document!=='undefined'?document.createElement('canvas').getContext('2d'):null;
const metricCache=new Map();
function fontMetrics(el){
 const cs=getComputedStyle(el),font=`${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
 let m=metricCache.get(font);
 if(!m&&metricCtx){metricCtx.font=font;const all=metricCtx.measureText('Нд8'),cap=metricCtx.measureText('Н8');m={a:all.fontBoundingBoxAscent,d:all.fontBoundingBoxDescent,cap:cap.actualBoundingBoxAscent};if(m.a)metricCache.set(font,m);}
 return m;
}
// Видимые края текста элемента на экране: верх заглавных первой строки и базовая линия последней.
export function inkBounds(el){
 const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT,{acceptNode:n=>n.textContent.trim()&&!n.parentElement.closest('.sr-only')?NodeFilter.FILTER_ACCEPT:NodeFilter.FILTER_REJECT});
 let top=Infinity,bottom=-Infinity,unit=0;
 for(let n=walker.nextNode();n;n=walker.nextNode()){
  const m=fontMetrics(n.parentElement);if(!m||!m.a)continue;
  const text=n.textContent,first=text.search(/\S/),last=text.length-1-[...text].reverse().findIndex(c=>c.trim());
  const r1=document.createRange();r1.setStart(n,first);r1.setEnd(n,first+1);const a=screenRect(r1);
  const r2=document.createRange();r2.setStart(n,last);r2.setEnd(n,last+1);const b=screenRect(r2);
  if(!a.height||!b.height)continue;
  const s=a.height/(m.a+m.d);unit=unit||s;
  top=Math.min(top,a.top+(m.a-m.cap)*s);bottom=Math.max(bottom,b.bottom-m.d*(b.height/(m.a+m.d)));
 }
 return Number.isFinite(top)?{top,bottom,unit}:null;
}
const gapRoots=new Map(),pendingGaps=new Set();
export function applyGaps(root,width,height){
 gapRoots.set(root,[width,height]);
 const gaps=textGaps(width,height);
 for(const [upSel,lowSel,kind] of GAP_PAIRS)for(const up of root.querySelectorAll(upSel)){
  let low=null;for(let scope=up.parentElement;scope&&!low;scope=scope===root?null:scope.parentElement)low=scope.querySelector(lowSel);
  if(!low||low===up||!up.textContent.trim()||!low.textContent.trim())continue;
  // На время замера снимаем анимационные transform (появление, покачивание) у элементов и их родителей.
  low.style.translate='';
  const realUnit=inkBounds(low)?.unit;   // экранных px на px макета — в реальном (немасштабированном замером) виде
  const saved=[],freeze=e=>{if(!saved.some(x=>x[0]===e)){saved.push([e,e.style.transform]);e.style.transform='none';}};
  for(const start of [up,low]){for(let e=start;e&&e!==root;e=e.parentElement)freeze(e);start.querySelectorAll('*').forEach(freeze);}
  low.style.translate='';
  const a=inkBounds(up),b=inkBounds(low);
  for(const [e,t] of saved)e.style.transform=t;
  if(!a||!b||!b.unit||!realUnit){pendingGaps.add(root);continue;}   // текст ещё не появился (счётчик) — измерим позже
  // Отступ — только если подпись действительно под цифрой (пересекаются по горизонтали);
  // в раскладках, где они стоят в разных местах (покупки на десктопе), ничего не двигаем.
  {const ra=screenRect(up),rb=screenRect(low),cx=(rb.left+rb.right)/2;if(cx<ra.left||cx>ra.right||rb.top<ra.top){continue;}}
  const shift=gaps[kind]/realUnit-(b.top-a.bottom)/b.unit;
  if(Math.abs(shift)>.5)low.style.translate=`0 ${shift.toFixed(1)}px`;
 }
}
function regap(){metricCache.clear();for(const [root,[w,h]] of gapRoots)if(root.isConnected)applyGaps(root,w,h);else gapRoots.delete(root);}
if(typeof document!=='undefined'){
 document.fonts?.ready.then(()=>requestAnimationFrame(regap));
 document.addEventListener('recap:ready',()=>setTimeout(regap,300));
 let gapFrame=0;
 const retry=()=>{gapFrame=0;const roots=[...pendingGaps];pendingGaps.clear();for(const r of roots){const wh=gapRoots.get(r);if(wh&&r.isConnected)applyGaps(r,wh[0],wh[1]);}};
 // Сцены на подлёте масштабируются и сдвигаются — точный замер только в покое:
 // после остановки прокрутки пересчитываем отступы у сцен, которые на экране.
 let restTimers=[];
 const regapVisible=()=>{for(const [root,[w,h]] of gapRoots){if(!root.isConnected){gapRoots.delete(root);continue;}const r=root.getBoundingClientRect();if(r.bottom>0&&r.top<innerHeight&&r.width)applyGaps(root,w,h);}};
 addEventListener('scroll',()=>{
  if(pendingGaps.size&&!gapFrame)gapFrame=requestAnimationFrame(retry);
  restTimers.forEach(clearTimeout);restTimers=[setTimeout(regapVisible,260),setTimeout(regapVisible,1100)];
 },{passive:true});
 // Счётчики заполняются уже после остановки прокрутки — добираем по таймеру, пока есть недомеренное.
 setInterval(()=>{if(pendingGaps.size&&!gapFrame&&!document.hidden)gapFrame=requestAnimationFrame(retry);},700);
}

const STACKS=[['.november-park-label','.november-park-note'],['.talk-contact-label','.talk-contact-note'],['.sky-label','.sky-note'],['.spending-caption','.spending-note'],['.finale-seven-name','.finale-seven-caption'],['.planet-label','.planet-note']];

// Телефон: акцентные заголовки этих экранов — максимально крупные, во всю ширину
// экрана с отступами по бокам. Размер считается по реальной ширине слова.
const MAX_FIT='.learning-heading,.november-park-heading,.planet-agent h2,.income-glass-title,.sky-heading';
const MARGIN=20;
let measure;
function fitHeadingsToWidth(element,scale,width,height){
 const nodes=element.querySelectorAll(MAX_FIT);
 if(!nodes.length)return;
 const portrait=width/Math.max(1,height)<.8;
 for(const heading of nodes){
  if(!portrait){heading.style.removeProperty('font-size');continue;}
  const text=heading.textContent.trim();if(!text)continue;
  heading.style.removeProperty('font-size');
  const style=getComputedStyle(heading),current=parseFloat(style.fontSize)||100;
  measure||=document.createElement('canvas').getContext('2d');
  measure.font=`${style.fontWeight} 100px ${style.fontFamily}`;
  const shown=style.textTransform==='lowercase'?text.toLowerCase():style.textTransform==='uppercase'?text.toUpperCase():text;
  const perPx=measure.measureText(shown).width/100;
  const spacing=(parseFloat(style.letterSpacing)||0)/current;
  const longest=Math.max(...shown.split('\n').map(line=>line.length));
  const avail=(width-MARGIN*2)/Math.max(.01,scale);
  let size=avail/Math.max(.01,perPx+spacing*Math.max(0,longest-1));
  size=Math.min(size,height*.2/Math.max(.01,scale));
  // «Мой доход» стоит над шаром: не крупнее прежнего размера, только уже по экрану.
  if(heading.classList.contains('income-glass-title'))size=Math.min(size,current);
  heading.style.setProperty('font-size',`${size.toFixed(1)}px`,'important');
 }
}
