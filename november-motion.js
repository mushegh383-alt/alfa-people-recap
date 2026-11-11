import { requestRenderFrame as requestAnimationFrame, cancelRenderFrame as cancelAnimationFrame } from './performance.js';
import { setHeadingScale } from './typography.js';
import { ease, sectionProgress, reel } from './november-layout.js';
import { fitScale } from './layout-fit.js';
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
export function mountNovemberScenes(root,signal){root.querySelectorAll('.november-scene').forEach(section=>mount(section,signal));}
function mount(section,signal){
 const stage=section.querySelector('.november-stage'),composition=section.querySelector('.november-composition'),number=section.querySelector('.november-number'),heading=section.querySelector('.november-heading'),copy=section.querySelector('.november-copy');
 const layers=[...section.querySelectorAll('.november-coin')];
 let active=false,raf=0,p,last=0;
 function fit(){const scale=fitScale(stage.clientWidth,stage.clientHeight,Number(section.dataset.width),Number(section.dataset.height),section.id);composition.style.transform=`translate(-50%,-50%) scale(${scale})`;setHeadingScale(composition,scale,stage.clientWidth,stage.clientHeight);if(section.id==='parksharing'){const snow=section.querySelector('.november-snow'),w=Math.max(2082.48,stage.clientWidth/scale+24);snow.style.width=`${w}px`;snow.style.height=`${w*1520.02/2082.48}px`;snow.style.left=`${Number(section.dataset.width)/2-w/2}px`;}schedule();}
 function update(now){raf=0;if(!active||document.hidden||signal.aborted)return;const b=section.getBoundingClientRect(),target=reduced.matches?1:sectionProgress(b.top,b.height,innerHeight),dt=last?Math.min(64,now-last):16;last=now;p=p===undefined||reduced.matches?target:p+(target-p)*(1-Math.exp(-dt/75));if(Math.abs(target-p)<.0002)p=target;
  section.dataset.progress=p.toFixed(4);
  const reveal=ease(.28,.64,p);number.style.opacity=reveal;number.style.transform=`translateY(${(1-reveal)*50}px)`;number.textContent=reduced.matches?number.dataset.value:reel(number.dataset.value,ease(.30,.78,p));
  if(heading){heading.style.opacity=ease(0,.20,p);heading.style.transform=`translateY(${(1-ease(0,.2,p))*40}px)`;}
  if(copy)copy.style.opacity=ease(.65,.88,p);
  if(section.id==='coins'){
   const open=ease(.04,.70,p);layers.forEach(layer=>{const y=layer.classList.contains('coin-top')?340:layer.classList.contains('coin-bottom')?-320:0;layer.style.transform=`translateY(${y*(1-open)}px) rotate(${(1-open)*(y/160)}deg)`;});
   const decoration=ease(.18,.66,p);for(const node of section.querySelectorAll('.coins-blue-orbit,.coins-pink-orbit')){node.style.opacity=decoration;node.style.transform=`${node.classList.contains('coins-pink-orbit')?'translate(-50%,-50%) rotate(-12deg) ':''}scale(${.7+.3*decoration}) rotate(${(1-decoration)*-18}deg)`;}
   // Мини-коины разлетаются из-за стопки по своим местам, дальние — с параллаксом.
   section.querySelectorAll('.coins-mini').forEach((m,i)=>{const fly=ease(.12+i*.035,.6+i*.035,p),dir=Number(m.dataset.dir)||1,drift=(p-.5)*(m.classList.contains('is-far')?-120:-220);m.style.translate=`${(1-fly)*dir*-340}px ${(1-fly)*260+drift}px`;m.style.scale=String(.4+.6*fly);});
   const glow=section.querySelector('.coins-glow');if(glow){glow.style.opacity=ease(.1,.6,p);glow.style.transform=`translate(-50%,-50%) scale(${.6+.4*ease(.1,.7,p)})`;}
  }
  if(section.id==='parksharing'){
   const car=section.querySelector('.car-motion'),arrival=ease(0,.48,p);car.style.transform=`translate(${(1-arrival)*-180}px,${(1-arrival)*25}px) scale(${.86+.14*arrival})`;
   section.querySelector('.november-park-label').style.opacity=ease(.5,.73,p);
   section.dispatchEvent(new CustomEvent('recap:car-progress',{detail:{progress:p}}));
  }
  if(Math.abs(target-p)>.0002)schedule();
 }
 function schedule(){if(!raf&&active&&!signal.aborted&&!document.hidden)raf=requestAnimationFrame(update);}
 const observer=new IntersectionObserver(([e])=>{active=e.isIntersecting;section.classList.toggle('is-on-screen',active);if(active)schedule();else{cancelAnimationFrame(raf);raf=0;last=0;}},{rootMargin:'150px'});observer.observe(section);
 const resize=new ResizeObserver(fit);resize.observe(stage);fit();window.addEventListener('scroll',schedule,{passive:true,signal});document.addEventListener('visibilitychange',schedule,{signal});reduced.addEventListener('change',schedule,{signal});
 signal.addEventListener('abort',()=>{observer.disconnect();resize.disconnect();cancelAnimationFrame(raf);},{once:true});
}
