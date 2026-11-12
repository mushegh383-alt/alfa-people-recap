import { setHeadingScale } from './typography.js';
import { createScrollVideo } from './performance.js';
import { optimizedAssetUrl } from './resources.js';
import { requestRenderFrame as requestAnimationFrame, cancelRenderFrame as cancelAnimationFrame } from './performance.js';
import { envelopeFrame, sectionProgress, reel } from './november-layout.js';
import { fitScale, placeComposition } from './layout-fit.js';
import { createPostcardGarland } from './scene-fill.js';
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
export const HEADROOM={envelope:420};
export function createEnvelope(data) {
 const section=document.createElement('section'); section.className='postcards envelope-section';section.id='postcards';section.setAttribute('aria-label','Полученные и отправленные открытки');
 section.innerHTML=`<div class="envelope-stage"><div class="envelope-composition"><div class="envelope-media" aria-hidden="true"><video muted playsinline preload="none" tabindex="-1" disablepictureinpicture></video><img class="envelope-still" width="1200" height="675" alt="" /></div><div class="envelope-data envelope-received"><p class="envelope-number" aria-hidden="true"></p><h2 class="envelope-caption"></h2></div><div class="envelope-data envelope-sent"><p class="envelope-number" aria-hidden="true"></p><h2 class="envelope-caption"></h2></div><p class="sr-only envelope-summary"></p></div></div>`;
 const film=section.querySelector('video');film.src=data.postcards.video;film.muted=film.defaultMuted=true;
 section.querySelector('.envelope-still').src=optimizedAssetUrl(data.postcards.poster);
 for(const kind of ['received','sent']) {
  const item=section.querySelector(`.envelope-${kind}`);item.dataset.value=String(data.postcards[kind]);
  item.querySelector('.envelope-number').textContent=data.postcards[kind];
  item.querySelector('.envelope-number').style.fontSize=`${Math.min(700,1550/String(data.postcards[kind]).length)}px`;
  item.querySelector('.envelope-caption').textContent=data.postcards[`${kind}Label`].replace(/\s+вы\s+/iu,'\nвы ');
 }
 // Заголовок блока над конвертом (место под него — запас сверху в fit()).
 const title=document.createElement('h2');title.className='november-heading block-heading envelope-heading';title.setAttribute('aria-hidden','true');title.textContent=data.postcards.title||'открытки';section.querySelector('.envelope-composition').append(title);
 section.querySelector('.envelope-summary').textContent=`${data.postcards.receivedLabel}: ${data.postcards.received}. ${data.postcards.sentLabel}: ${data.postcards.sent}.`;
 return section;
}
export function mountEnvelope(root,signal,external=false) {
 const section=root.querySelector('.envelope-section');if(!section)return;
 const stage=section.querySelector('.envelope-stage'),composition=section.querySelector('.envelope-composition'),film=section.querySelector('video');
 const entries=['received','sent'].map(kind=>section.querySelector(`.envelope-${kind}`));
 let raf=0,active=false,p,latest=0,displayed=0,lastTime=0,externalProgress=0;
 const garland=createPostcardGarland(section);
 function fit(){const scale=fitScale(stage.clientWidth,stage.clientHeight,1920,2059+HEADROOM.envelope,'envelope');placeComposition(composition, scale, ` translateY(${HEADROOM.envelope/2}px)`);setHeadingScale(composition,scale,stage.clientWidth,stage.clientHeight);garland?.resize(scale,HEADROOM.envelope/2);p===undefined||garland?.draw(p);schedule();}
 const transport=createScrollVideo(film,signal,()=>{displayed=film.currentTime/Math.max(.01,film.duration-.045);schedule();});
 function seek(){transport.seek(latest,active);}
 film.addEventListener('loadeddata',schedule,{signal});
 function update(now){raf=0;if(!active||document.hidden||signal.aborted)return;
  const box=section.getBoundingClientRect(),target=external?externalProgress:sectionProgress(box.top,box.height,innerHeight),dt=lastTime?Math.min(64,now-lastTime):16;lastTime=now;
  p=p===undefined||reduced.matches||external?target:p+(target-p)*(1-Math.exp(-dt/75));if(Math.abs(target-p)<.0002)p=target;
  const f=envelopeFrame(p,reduced.matches);section.dataset.progress=p.toFixed(4);{const h=section.querySelector('.envelope-heading'),t=reduced.matches?1:Math.min(1,Math.max(0,p/.18));h.style.opacity=t;h.style.transform=`translateY(${(1-t)*40}px)`;}garland?.draw(reduced.matches?.76:p);section.dataset.phase=f.phase;section.classList.toggle('is-envelope-reduced',reduced.matches);
  latest=f.video*Math.max(0,film.duration-.045);if(!reduced.matches)seek();
  const ready=reduced.matches||displayed>.84;
  entries.forEach((entry,i)=>{const reveal=(i?f.sent:f.received)*(ready?1:0);entry.style.opacity=reveal;entry.style.visibility=reveal>.001?'visible':'hidden';entry.style.transform=`translateY(${(1-reveal)*45}px) rotate(3.5deg)`;entry.querySelector('.envelope-number').textContent=reduced.matches?entry.dataset.value:reel(entry.dataset.value,i?f.sentDigits:f.receivedDigits);});
  if(Math.abs(target-p)>.0002)schedule();
 }
 function schedule(){if(!raf&&active&&!document.hidden&&!signal.aborted)raf=requestAnimationFrame(update);}
 const observer=new IntersectionObserver(([entry])=>{active=entry.isIntersecting; if(active)schedule();else{transport.pause();cancelAnimationFrame(raf);raf=0;lastTime=0;}},{rootMargin:'150px'});if(!external)observer.observe(section);
 const resize=new ResizeObserver(fit);resize.observe(stage);fit();
 window.addEventListener('scroll',schedule,{passive:true,signal});document.addEventListener('visibilitychange',schedule,{signal});reduced.addEventListener('change',schedule,{signal});
 signal.addEventListener('abort',()=>{observer.disconnect();resize.disconnect();cancelAnimationFrame(raf);film.pause();film.removeAttribute('src');film.load();},{once:true});
 return { fit, draw(progress,visible){externalProgress=progress;active=visible;if(active)schedule();else{transport.pause();cancelAnimationFrame(raf);raf=0;lastTime=0;}} };
}
