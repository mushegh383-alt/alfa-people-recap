import { isPortrait, placeComposition } from './layout-fit.js';
import { optimizedAssetUrl } from './resources.js';
import { createScrollVideo, markSoftGlows, getQuality, requestRenderFrame as requestAnimationFrame, cancelRenderFrame as cancelAnimationFrame } from './performance.js';
import { ease, reel } from './november-layout.js';
import { planetMediaPose, planetComposition, clockLayerFrame, clockFace } from './planet-layout.js';
import { incomePlanetHandoff } from './income-glass-layout.js';
import { setHeadingScale } from './typography.js';
import { filmTime } from './scroll-film-timing.js';
import { clockContactFrame, clockContactGeometry, clockContactPath } from './clock-contact-transition.js';
export function planetFrame(u, reduced=false) {
 const keys=[[10.85,0],[11.3,2.7],[11.6,3.4],[12.15,4.1],[12.9,5.3],[13.5,6.2],[14.25,7.6],[14.8,8.4],[15.8,8.99]];
 const time=filmTime(keys,u);
 return {offset:240*ease(10.85,11.55,u)+100*ease(12.1,12.85,u)-340*ease(13.55,14.65,u),time:reduced?(u<10.85?0:u<12.4?3.4:u<14?5.3:8.99):time,
 handoff:ease(10.05,10.85,u),ai:ease(11.1,11.55,u)*(1-ease(12.05,12.45,u)),agent:ease(12.4,12.85,u)*(1-ease(13.55,14,u)),clock:ease(14.05,14.65,u),
 digitsAI:ease(11.1,11.6,u),digitsClock:ease(14.65,15.4,u),turn:reduced?0:(1-ease(14.6,15.5,u))*720};
}
export function createPlanetStory(data){
 const s=document.createElement('section');s.className='planet-story';s.id='alfa-ai';s.setAttribute('aria-label','Alfa AI, любимый агент и время общения');
 s.innerHTML=`<div class="planet-media"><video muted playsinline preload="none" disablepictureinpicture poster="./assets/planet/poster.jpg" src="./assets/planet/planet-smooth.mp4"></video></div><div class="planet-composition"><div class="planet-clock-art" aria-hidden="true"></div><div class="planet-ai planet-copy"><h2>alfa ai</h2><p class="planet-number"></p><p class="planet-label"></p></div><div class="planet-agent planet-copy" id="ai-agent"><h2></h2><p class="planet-label"></p></div><div class="planet-time planet-copy" id="talk-time"><p class="planet-number"></p><h2 class="planet-label"></h2><p class="planet-note"></p></div></div>`;
 // Статичный режим: хрустальный шар картинкой вместо видео планеты (легче для телефона).
 if(data.ai.still){
  s.classList.add('is-planet-still');s.querySelector('video').removeAttribute('src');s.querySelector('video').removeAttribute('poster');
  const ball=document.createElement('div');ball.className='planet-still';ball.setAttribute('aria-hidden','true');
  ball.style.setProperty('--still-desk',`url("${data.ai.still}")`);ball.style.setProperty('--still-phone',`url("${data.ai.stillMobile||data.ai.still}")`);
  s.prepend(ball);
  // Хрустальный шар — отдельно от фона, два состояния тумана: «запросы» и «агенты».
  for(const [kind,src] of [['a',data.ai.orb],['b',data.ai.orbAlt||data.ai.orb]]){if(!src)continue;const orb=document.createElement('img');orb.className=`planet-orb planet-orb-${kind}`;orb.src=src;orb.alt='';orb.setAttribute('aria-hidden','true');ball.after(orb);}
  // Подставка — за шаром (шар лежит на ней): вставляем сразу за фоном, до шаров.
  if(data.ai.stand){const stand=document.createElement('img');stand.className='planet-stand';stand.src=data.ai.stand;stand.alt='';stand.setAttribute('aria-hidden','true');ball.after(stand);}
  // Циферблат раньше был кадром видео — теперь отдельная картинка под стрелками.
  const dial=document.createElement('img');dial.className='planet-dial';dial.src='./assets/restyle/ai-dial.png';dial.alt='';dial.setAttribute('aria-hidden','true');
  s.querySelector('.planet-composition').prepend(dial);
 }
 s.querySelector('.planet-ai .planet-label').textContent='Запросов вы отправили\nв alfa ai';s.querySelector('.planet-ai').dataset.value=data.ai.requests;
 s.querySelector('.planet-agent h2').textContent=data.ai.agent;s.querySelector('.planet-agent .planet-label').textContent=data.ai.agents.length>1?'агенты, с которыми вы\nработали чаще всего':'агент с которым вы\nработали чаще всего';
 // Пьедестал топ-3: первое место — по центру и крупнее, 2-е и 3-е — по бокам ниже.
 if(data.ai.agents.length>1){
  const podium=document.createElement('div');podium.className='planet-podium';
  const order=[1,0,2].filter(i=>data.ai.agents[i]);
  for(const i of order){
   const a=data.ai.agents[i],item=document.createElement('div');item.className=`podium-item podium-${i+1}`;item.style.setProperty('--i',String(i));
   const avatar=document.createElement('div');avatar.className='podium-avatar';
   if(a.cover){const img=document.createElement('img');img.src=a.cover;img.alt='';avatar.append(img);}
   else{avatar.dataset.letter=a.name[0].toUpperCase();avatar.classList.add('is-placeholder');}
   const medal=document.createElement('span');medal.className='podium-medal';medal.textContent=String(i+1);avatar.append(medal);
   item.append(avatar);
   if(i>0){const name=document.createElement('p');name.className='podium-name';name.textContent=a.name;item.append(name);}
   podium.append(item);
  }
  s.querySelector('.planet-agent').append(podium);
 }
 s.querySelector('.planet-time').dataset.value=data.ai.hours;s.querySelector('.planet-time h2').textContent='Часов вы общались';s.querySelector('.planet-note').textContent='Вот столько часов вы потратили листая\nрилсы на работе';
 return s;
}
const ns='http://www.w3.org/2000/svg';
export async function preparePlanet(root,signal){
 const slot=root.querySelector('.planet-clock-art');if(!slot)return;
 const r=await fetch(optimizedAssetUrl('./assets/planet/clock.svg'),{signal});if(!r.ok)throw Error('Не удалось загрузить часы');
 const svg=markSoftGlows(new DOMParser().parseFromString(await r.text(),'image/svg+xml').documentElement);
 const bezel=svg.querySelector('[id="Ellipse 8993"]'),bridge=document.createElementNS(ns,'path');
 for(const attr of bezel.attributes)if(!['cx','cy','r'].includes(attr.name))bridge.setAttribute(attr.name,attr.value);
 bridge.dataset.contactFrame='';bridge.setAttribute('d',clockContactPath(clockContactGeometry(1920,2287,15.5)));bezel.replaceWith(bridge);
 // Keep the lower protractor flowing across the viewport, but stop its unseen
 // back half from extending several screens below the authored composition.
 const defs=svg.querySelector('defs'),gradient=document.createElementNS(ns,'linearGradient');
 gradient.id='clock-bottom-fade';gradient.setAttribute('gradientUnits','userSpaceOnUse');gradient.setAttribute('x1','0');gradient.setAttribute('x2','0');gradient.setAttribute('y1','2167');gradient.setAttribute('y2','2287');
 for(const [offset,color] of [['0','white'],['1','black']]){const stop=document.createElementNS(ns,'stop');stop.setAttribute('offset',offset);stop.setAttribute('stop-color',color);gradient.append(stop);}defs.append(gradient);
 const mask=document.createElementNS(ns,'mask');mask.id='clock-bottom-limit';mask.setAttribute('maskUnits','userSpaceOnUse');mask.setAttribute('x','-5000');mask.setAttribute('y','-5000');mask.setAttribute('width','12000');mask.setAttribute('height','7287');
 const rect=document.createElementNS(ns,'rect');for(const [k,v] of Object.entries({x:'-5000',y:'-5000',width:'12000',height:'7287',fill:'url(#clock-bottom-fade)'}))rect.setAttribute(k,v);mask.append(rect);defs.append(mask);svg.querySelector('g').setAttribute('mask','url(#clock-bottom-limit)');
 // Телефон: убираем «секунды» — шкалу из 147 делений и секундную стрелку — и
 // маску-затухание на весь SVG. Всё это пересчитывалось на каждом кадре.
 const phone=getQuality()==='lite'||isPortrait(innerWidth,innerHeight);
 if(phone){svg.querySelector('[id="small"]')?.remove();svg.querySelector('[id="Rectangle 240663119"]')?.remove();svg.querySelector('g[mask]')?.removeAttribute('mask');svg.querySelectorAll('[id$=" deg_2"]').forEach(g=>g.remove());}
 const layers={'Ellipse 8988':'rim','Ellipse 8992':'rim','Ellipse 8991':'bezel','Ellipse 8993':'bezel','Ellipse 8994':'outer','Ellipse 8995':'outer','Group 2131328756':'outer','Ellipse 8989':'arc','Ellipse 8996':'arc','small':'arc','Line 1':'hands','Line 3':'hands','Rectangle 240663119':'hands','Ellipse 8990':'hands'};
 for(const el of [...svg.querySelectorAll('[id]')]){
  const name=layers[el.id];if(!name)continue;
  const wrapper=document.createElementNS(ns,'g');wrapper.dataset.clockLayer=name;el.before(wrapper);wrapper.append(el);
  el.style.removeProperty('transform-origin');el.removeAttribute('data-clock-turn');
  if(name==='hands')el.dataset.clockHand=el.id==='Line 1'?'.0833333':el.id==='Line 3'?'1':el.id==='Rectangle 240663119'?'2':'0';
  if(['circle','path'].includes(el.localName)&&el.getAttribute('stroke')){el.setAttribute('pathLength','1');el.dataset.clockStroke='';}
  for(const circle of el.querySelectorAll('circle')){circle.setAttribute('pathLength','1');circle.dataset.clockStroke='';}
  for(const [i,tick] of [...el.querySelectorAll('rect')].entries()){
   const g=document.createElementNS(ns,'g');g.dataset.clockTick=String(i/Math.max(1,el.children.length));g.dataset.tickX=tick.getAttribute('x');g.dataset.tickY=tick.getAttribute('y');tick.before(g);g.append(tick);
  }
 }
 slot.append(document.importNode(svg,true));
}
export function mountPlanet(root,signal){
 const section=root.querySelector('.planet-story');if(!section)return null;
 const comp=section.querySelector('.planet-composition'),media=section.querySelector('.planet-media'),video=section.querySelector('video'),ai=section.querySelector('.planet-ai'),agent=section.querySelector('.planet-agent'),hours=section.querySelector('.planet-time');
 const clockArt=section.querySelector('.planet-clock-art'),still=section.querySelector('.planet-still'),dial=section.querySelector('.planet-dial');
 const orbA=section.querySelector('.planet-orb-a'),orbB=section.querySelector('.planet-orb-b'),stand=section.querySelector('.planet-stand');
 // Один круг на всю сцену: шар «Дохода» → хрустальный шар → (агенты) → циферблат часов.
 const ORB_R=505,DIAL_R=650,lerpC=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,radius:a.radius+(b.radius-a.radius)*t});
 const layers=[...section.querySelectorAll('[data-clock-layer]')],hands=[...section.querySelectorAll('[data-clock-hand]')],ticks=[...section.querySelectorAll('[data-clock-tick]')],bridge=section.querySelector('[data-contact-frame]');
 let target=0,visible=false,last=null,width=1,height=1,aiInkCenter=490,agentInkCenter=141,mediaK=1;
 const transforms=new WeakMap();const transform=(node,value)=>{if(transforms.get(node)!==value){transforms.set(node,value);node.setAttribute('transform',value);}};
 const strokes=new Map(layers.map(layer=>[layer,[...layer.querySelectorAll('[data-clock-stroke]')]]));
 // Пишем стили обводок только при реальном изменении: лишние записи заставляли
 // пересчитывать большой SVG на каждом кадре.
 const strokeState=new WeakMap();
 const measure=document.createElement('canvas').getContext('2d');
 const transport=createScrollVideo(video,signal,()=>{if(last)paint(...last);});
 function seek(){transport.seek(target,visible);}
 function fit(){width=section.clientWidth;height=section.clientHeight;
  // Слой видео — размером с экран, а не с макет 1920×1082: маску краёв Safari растеризует
  // в размер слоя ×3, на iPhone это сотни мегабайт. Масштаб докручиваем в transform.
  mediaK=Math.max(width/1920,height/1082);media.style.width=`${1920*mediaK}px`;media.style.height=`${1082*mediaK}px`;const {scale}=planetComposition(width,height);placeComposition(comp, scale);setHeadingScale(comp,scale,width,height);const agentWidth=Math.max(2050,(width-32)/scale);agent.style.width=`${agentWidth}px`;agent.style.left=`${960-agentWidth/2}px`;
  const number=ai.querySelector('.planet-number'),style=getComputedStyle(number);measure.font=`${style.fontSize} Agse`;
  const m=measure.measureText(ai.dataset.value),ascent=m.fontBoundingBoxAscent??parseFloat(style.fontSize)*.8,descent=m.fontBoundingBoxDescent??parseFloat(style.fontSize)*.2;
  aiInkCenter=(parseFloat(style.lineHeight)-ascent-descent)/2+ascent+(m.actualBoundingBoxDescent-m.actualBoundingBoxAscent)/2;
  const heading=agent.querySelector('h2'),hs=getComputedStyle(heading);measure.font=`700 ${hs.fontSize} Nauryz`;const hm=measure.measureText(heading.textContent),ha=hm.fontBoundingBoxAscent??parseFloat(hs.fontSize)*.8,hd=hm.fontBoundingBoxDescent??parseFloat(hs.fontSize)*.2;
  agentInkCenter=(parseFloat(hs.lineHeight)-ha-hd)/2+ha+(hm.actualBoundingBoxDescent-hm.actualBoundingBoxAscent)/2;
  if(last)paint(...last);}
 for(const [el,size] of [[ai,700],[hours,550]])el.querySelector('.planet-number').style.fontSize=`${Math.min(size,1950/Math.max(1,el.dataset.value.length))}px`;
 function paint(u,on,reduced){
  visible=on;if(!on)return;const f=planetFrame(u,reduced);target=f.time;
  const composition=planetComposition(width,height),focus={x:composition.x+960*composition.scale,y:composition.y+(443+f.offset+aiInkCenter)*composition.scale};
  const agentFocus={x:composition.x+960*composition.scale,y:composition.y+(655+f.offset+agentInkCenter)*composition.scale};
  const handoff=clockContactFrame(u,reduced),geometry=clockContactGeometry(width,height,u,reduced);
  const pose=planetMediaPose(width,height,u,video.currentTime,focus,agentFocus,reduced);
  media.style.visibility=u<=10.85&&video.currentTime>.018?'hidden':'visible';
  media.style.transform=`translate(${pose.x}px,${pose.y}px) scale(${pose.scale/mediaK})`;
  media.style.opacity=handoff.face;
  if(still){
   const enter=reduced?1:ease(10.3,10.95,u);
   still.style.opacity=(enter*(1-.65*ease(13.8,14.5,u))).toFixed(3);still.style.visibility=enter>.001?'visible':'hidden';
  }
  if(orbA){
   const comp=planetComposition(width,height);
   const H=incomePlanetHandoff(width,height,Math.min(u,10.85));
   // На широком экране шар чуть выше и меньше — чтобы под ним поместилась подставка.
   const wide=width>height,R={x:width/2,y:height*(wide?.46:.52),radius:wide?Math.min(width*.47,height*.355):Math.min(width*.47,height*.4)},R2={x:R.x,y:R.y,radius:R.radius*(wide?1.06:1.1)};
   const D={x:comp.x+clockFace.x*comp.scale,y:comp.y+clockFace.y*comp.scale,radius:DIAL_R*comp.scale};
   const t1=reduced?1:ease(10.85,11.5,u),t2=reduced?(u<12.4?0:1):ease(12.1,12.7,u),t3=reduced?(u<14?0:1):ease(13.6,14.45,u);
   const c=lerpC(lerpC(lerpC(H,R,t1),R2,t2),D,t3),rot=reduced?0:(25*t2+50*t3)*(1-.0)+8*Math.sin(Math.PI*t1);
   const transform=`translate(${c.x.toFixed(1)}px,${c.y.toFixed(1)}px) rotate(${rot.toFixed(2)}deg) scale(${(c.radius/ORB_R).toFixed(4)}) translate(-512px,-512px)`;
   const shown=(reduced?1:ease(10.2,10.75,u))*(1-ease(14.2,14.6,u));
   orbA.style.transform=transform;orbA.style.opacity=(shown*(1-t2)).toFixed(3);orbA.style.visibility=shown*(1-t2)>.001?'visible':'hidden';
   if(stand){
    // Подставка держит шар, пока он в центре: выезжает снизу и уходит вниз перед часами.
    const on=reduced?(u<14?1:0):ease(10.95,11.5,u)*(1-ease(13.45,13.9,u)),w=c.radius*1.5;
    stand.style.width=`${w.toFixed(1)}px`;
    stand.style.transform=`translate(${(c.x-w/2).toFixed(1)}px,${(c.y+c.radius*.74+(1-on)*c.radius*.6).toFixed(1)}px)`;
    stand.style.opacity=on.toFixed(3);stand.style.visibility=on>.001?'visible':'hidden';
   }
   if(orbB&&orbB!==orbA){orbB.style.transform=transform;orbB.style.opacity=(shown*t2).toFixed(3);orbB.style.visibility=shown*t2>.001?'visible':'hidden';}
  }
  if(dial){const d=ease(14.15,14.55,u)*(1-ease(15.45,15.85,u));dial.style.opacity=d;dial.style.transform='none';dial.style.visibility=d>.001?'visible':'hidden';}
  section.dataset.time=target.toFixed(3);section.dataset.phase=u<12.4?'ai':u<14?'agent':'clock';
  for(const [el,opacity] of [[ai,f.ai],[agent,f.agent],[hours,ease(14.95,15.4,u)*handoff.information]]){el.style.opacity=opacity;el.style.visibility=opacity>.001?'visible':'hidden';el.style.transform=`translateY(${f.offset+(reduced?0:(1-opacity)*45)}px)`;el.inert=opacity<.5;}
  for(const [node,text] of [[ai.querySelector('.planet-number'),reel(ai.dataset.value,f.digitsAI)],[hours.querySelector('.planet-number'),reel(hours.dataset.value,f.digitsClock)]])if(node.textContent!==text)node.textContent=text;
  const showClock=u>=14&&u<16.96;clockArt.style.visibility=showClock?'visible':'hidden';if(!showClock)return;
  for(const layer of layers){const p=clockLayerFrame(layer.dataset.clockLayer,u,reduced);layer.style.visibility=p.progress>.0001?'visible':'hidden';let matrix=`translate(960.5 ${845.5+p.y}) rotate(${p.rotate}) scale(${p.scale} ${p.scale*p.tilt}) translate(-960.5 -845.5)`;
   const isFrame=layer.contains(bridge),kind=layer.dataset.clockLayer;
   if(handoff.p>0){
    const cx=(geometry.x-geometry.clockOrigin.x)/geometry.clockScale,cy=(geometry.y-geometry.clockOrigin.y)/geometry.clockScale;
    const turn=kind==='arc'?120*handoff.p:kind==='outer'?180*handoff.p:-160*handoff.p;
    const scale=kind==='hands'?handoff.hands:1-handoff.p*(kind==='outer'?.58:kind==='arc'?.55:.28),tilt=kind==='hands'?1:1-.6*Math.sin(handoff.p*Math.PI);
    matrix=isFrame?'':`translate(${cx} ${cy}) rotate(${kind==='hands'?0:turn}) scale(${scale} ${scale*tilt}) translate(-960.5 -845.5)`;
    if(!isFrame&&handoff.erase>.9999)layer.style.visibility='hidden';
   }
   transform(layer,matrix);
   for(const stroke of strokes.get(layer)){const offset=(isFrame?1-p.progress:Math.min(1,1-p.progress+handoff.erase)).toFixed(4),width=isFrame?null:handoff.p>0?(Number(stroke.getAttribute('stroke-width')||1)*(1-handoff.erase)).toFixed(3):'';const key=offset+'|'+width;if(strokeState.get(stroke)===key)continue;strokeState.set(stroke,key);stroke.style.strokeDasharray='1';stroke.style.strokeDashoffset=offset;if(width!==null)stroke.style.strokeWidth=width;}
  }
  bridge.setAttribute('d',clockContactPath(geometry));bridge.style.strokeWidth=String(geometry.stroke/geometry.clockScale);bridge.style.opacity=handoff.frame;
  bridge.style.stroke=handoff.p>0?`rgb(${248-179*handoff.p},${154+61*handoff.p},${202+53*handoff.p})`:'';
  for(const hand of hands){const a=(f.turn+handoff.turn)*Number(hand.dataset.clockHand);hand.style.transformOrigin='960.5px 845.5px';hand.style.transform=`rotate(${a}deg)`;}
  for(const tick of ticks){const p=(reduced?1:ease(14.8+Number(tick.dataset.clockTick)*.3,15.15+Number(tick.dataset.clockTick)*.3,u))*(1-handoff.erase);const x=Number(tick.dataset.tickX),y=Number(tick.dataset.tickY);transform(tick,`translate(${x} ${y}) scale(${p}) translate(${-x} ${-y})`);}
 }
 function draw(u,on,reduced){last=[u,on,reduced];paint(u,on,reduced);seek();}
 video.addEventListener('loadeddata',()=>{if(last)paint(...last);seek();},{signal});
 const ro=new ResizeObserver(fit);ro.observe(section);fit();
 signal.addEventListener('abort',()=>{ro.disconnect();video.pause();video.removeAttribute('src');video.load();},{once:true});
 return {draw,fit};
}
