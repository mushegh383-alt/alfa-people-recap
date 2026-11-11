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

// Единая шкала мелкого текста. Каждая сцена масштабирует свой макет целиком, и на
// телефоне подписи выходили по 9–11 px. Здесь у каждой роли — минимальный размер
// НА ЭКРАНЕ; текст растёт, только если в сцене он получился мельче.
const TEXT_ROLES={
 kicker:'.income-glass-rank,.talk-contact-kicker,.sky-kicker',
 caption:'.visit-caption,.thanks-caption,.envelope-caption,.moments-caption,.learning-label,.november-park-label,.coins-copy,.spending-caption,.talk-contact-label,.sky-label,.tower-label,.finale-seven-name,.planet-label,.achievement-caption',
 note:'.thanks-note,.spending-note,.talk-contact-note,.november-park-note,.sky-note,.finale-seven-caption,.planet-note',
};
export function textMinimum(width,height){
 const clamp=(a,v,b)=>Math.max(a,Math.min(b,v));
 if(width/Math.max(1,height)<.8)return{kicker:15,caption:17,note:14};
 return{kicker:clamp(16,width*.0135,26),caption:clamp(18,width*.019,32),note:clamp(15,width*.0145,24)};
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
  if(base&&grow>1.01){
   node.style.setProperty('font-size',`${target.toFixed(1)}px`,'important');
   if(node.dataset.baseWidth){
    const w=Number(node.dataset.baseWidth),l=Number(node.dataset.baseLeft),align=node.dataset.baseAlign;
    node.style.setProperty('width',`${(w*grow).toFixed(1)}px`,'important');
    if(!node.dataset.baseStatic){
     const shift=align==='center'?(grow-1)*w/2:align==='right'||align==='end'?(grow-1)*w:0;
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
 }
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
