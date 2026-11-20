import { placeComposition } from './layout-fit.js';
import { markSoftGlows } from './performance.js';
import { optimizedAssetUrl } from './resources.js';
import { ease,reel } from './november-layout.js';
import { setHeadingScale } from './typography.js';
import { clockContactFrame,clockContactGeometry,contactComposition,contactPhoto } from './clock-contact-transition.js?local=21';
export function contactFrame(p,reduced=false){
 const phase=(a,b)=>reduced?1:ease(a,b,p);
 return {photo:phase(.02,.35),name:phase(.26,.58),props:phase(.22,.65),bubble:phase(.16,.63),number:phase(.58,.82),digits:phase(.58,.91),caption:phase(.78,.98)};
}
export function createTalkContact(data){
 const s=document.createElement('section');s.className='talk-contact';s.id='top-contact';s.setAttribute('aria-label','Ваш топ-собеседник в k-talk');
 s.dataset.hours=String(data.talkContact.hours);
 s.innerHTML=`<div class="talk-contact-composition"><div class="talk-contact-art" aria-hidden="true"></div><div class="talk-contact-heading"><p class="talk-contact-kicker"></p><h2 class="talk-contact-name"></h2></div><div class="talk-contact-data"><p class="talk-contact-number" aria-hidden="true"></p><h3 class="talk-contact-label"></h3><p class="talk-contact-note"></p><p class="sr-only"></p></div></div>`;
 s.querySelector('.talk-contact-name').textContent=data.talkContact.name;s.querySelector('.talk-contact-kicker').textContent=data.talkContact.heading;
 s.querySelector('.talk-contact-label').textContent=data.talkContact.label;s.querySelector('.talk-contact-note').textContent=data.talkContact.note;
 s.querySelector('.sr-only').textContent=`${data.talkContact.hours} — ${data.talkContact.label}`;
 s.querySelector('.talk-contact-number').style.fontSize=`${Math.min(550,1850/Math.max(1,s.dataset.hours.length))}px`;
 return s;
}
export async function prepareTalkContact(root,data,signal){
 const slot=root.querySelector('.talk-contact-art');if(!slot)return;
 const r=await fetch(optimizedAssetUrl('./assets/top-contact/layers.svg'),{signal});if(!r.ok)throw Error('Не удалось загрузить экран собеседника');
 const svg=markSoftGlows(new DOMParser().parseFromString(await r.text(),'image/svg+xml').documentElement);
 const ns='http://www.w3.org/2000/svg';
 const photo=svg.querySelector('[data-contact-part="photo"]'),clip=document.createElementNS(ns,'clipPath'),clipRect=document.createElementNS(ns,'rect');
 clip.id='contact-photo-opening';clip.setAttribute('clipPathUnits','userSpaceOnUse');
 for(const [key,value] of Object.entries({x:'608',y:'358.586',width:'688',height:'688',rx:'344'}))clipRect.setAttribute(key,value);
 clipRect.dataset.contactClip='';clip.append(clipRect);svg.querySelector('defs').append(clip);photo.setAttribute('clip-path','url(#contact-photo-opening)');
 if(data.talkContact.photo){
  const photo=svg.querySelector('[data-contact-part="photo"]'),pattern=document.createElementNS(ns,'pattern'),image=document.createElementNS(ns,'image');
  pattern.id='contact-live-photo';pattern.setAttribute('width','1');pattern.setAttribute('height','1');pattern.setAttribute('viewBox','0 0 688 688');
  image.setAttribute('width','688');image.setAttribute('height','688');image.setAttribute('preserveAspectRatio','xMidYMid slice');image.setAttribute('href',data.talkContact.photo);pattern.append(image);svg.querySelector('defs').append(pattern);photo.setAttribute('fill','url(#contact-live-photo)');
 }
 // Вместо значка к-толка (камеры) — 3D-конверт; та же позиция и анимация (prop-one).
 const camera=svg.querySelector('[data-contact-part="prop-one"]');
 if(camera){
  const env=document.createElementNS(ns,'image');
  // Центр там же, где была камера (1343, 546); конверт поменьше — ~320 px макета.
  for(const [key,value] of Object.entries({x:'1183',y:'417',width:'320',height:'259',href:'./assets/top-contact/envelope.png',preserveAspectRatio:'xMidYMid meet'}))env.setAttribute(key,value);
  env.dataset.contactPart='prop-one';camera.replaceWith(env);
 }
 // Новый стиль: фиолетовая звезда и снежинка — растровые картинки вместо вектора с тяжёлыми фильтрами.
 const swap=(part,attrs)=>{const el=svg.querySelector(`[data-contact-part="${part}"]`);if(!el)return;const img=document.createElementNS(ns,'image');for(const [k,v] of Object.entries(attrs))img.setAttribute(k,v);img.setAttribute('preserveAspectRatio','xMidYMid meet');img.dataset.contactPart=part;el.replaceWith(img);};
 swap('bubble',{x:'60',y:'560',width:'1100',height:'827',href:'./assets/restyle/contact-star.png'});
 swap('prop-two',{x:'1238',y:'942.881',width:'401',height:'401',transform:'rotate(-36.5634 1238 942.881)',href:'./assets/restyle/contact-snowflake.png'});
 svg.querySelector('[data-contact-part="prop-one"]')?.setAttribute('href','./assets/restyle/contact-envelope.png');
 for(const part of [...svg.querySelectorAll('[data-contact-part]')]){
  const g=document.createElementNS(ns,'g');g.dataset.contactMotion=part.dataset.contactPart;part.before(g);g.append(part);
 }
 slot.append(document.importNode(svg,true));
}
export function mountTalkContact(root,signal){
 const s=root.querySelector('.talk-contact');if(!s)return null;
 const composition=s.querySelector('.talk-contact-composition'),heading=s.querySelector('.talk-contact-heading'),number=s.querySelector('.talk-contact-number'),label=s.querySelector('.talk-contact-label'),note=s.querySelector('.talk-contact-note'),parts=[...s.querySelectorAll('[data-contact-motion]')],clip=s.querySelector('[data-contact-clip]');
 let last=null;
 function fit(){const {scale}=contactComposition(s.clientWidth,s.clientHeight);placeComposition(composition, scale);setHeadingScale(composition,scale,s.clientWidth,s.clientHeight);if(last)draw(...last);}
 function draw(progress,visible,reduced,u=15.85+progress*1.95){last=[progress,visible,reduced,u];if(!visible)return;
  const f=contactFrame(progress,reduced);s.dataset.progress=progress.toFixed(4);
  const handoff=clockContactFrame(u,reduced),g=clockContactGeometry(s.clientWidth,s.clientHeight,u,reduced),cs=g.contact.scale,cx=(g.x-g.contact.x)/cs,cy=(g.y-g.contact.y)/cs,photoScale=g.half/(344*cs);
  s.style.setProperty('--contact-sky', ease(.52, .98, handoff.p));
  composition.style.visibility=reduced&&u<16.15?'hidden':'visible';s.dataset.morph=handoff.p.toFixed(4);clip.setAttribute('rx',String(344+(106-344)*handoff.p));
  for(const g of parts){
   const kind=g.dataset.contactMotion,photo=kind==='photo'||kind==='glow',p=photo?f.photo:kind==='bubble'?f.bubble:f.props;
   if(photo){
    const opacity=kind==='photo'?handoff.photo:ease(.55,1,handoff.p);g.style.visibility=opacity>.0001?'visible':'hidden';g.style.opacity=opacity;
    g.setAttribute('transform',`translate(${cx} ${cy}) rotate(${-contactPhoto.angle*(1-handoff.p)}) scale(${photoScale}) translate(${-contactPhoto.x} ${-contactPhoto.y})`);continue;
   }
   g.style.visibility=p>.0001?'visible':'hidden';
   const x=kind==='bubble'?608:photo?952:kind==='prop-one'?1343:1438,y=kind==='bubble'?970:photo?685:kind==='prop-one'?547:904;
   const angle=reduced?0:(1-p)*(kind==='prop-one'?-2.2:2.2),dx=x-contactPhoto.x,dy=y-contactPhoto.y,r=1+.15*Math.sin(p*Math.PI);
   const px=kind==='bubble'?cx+(x-cx)*p:cx+r*(dx*Math.cos(angle)-dy*Math.sin(angle)),py=kind==='bubble'?cy+(y-cy)*p:cy+r*(dx*Math.sin(angle)+dy*Math.cos(angle));
   const rotation=reduced?0:(1-p)*(kind==='bubble'?-20:kind==='prop-one'?-75:75),scale=reduced?1:kind==='bubble'?.05+.95*p:.2+.8*p;
   g.setAttribute('transform',`translate(${px} ${py}) rotate(${rotation}) scale(${scale} ${kind==='bubble'?(.12+.88*p):scale}) translate(${-x} ${-y})`);
  }
  heading.style.opacity=f.name;heading.style.transform=`translateY(${(1-f.name)*90}px)`;
  number.style.opacity=f.number;number.style.transform=`translateY(${(1-f.number)*60}px)`;number.textContent=reel(s.dataset.hours,f.digits);
  label.style.opacity=f.caption;note.style.opacity=.6*f.caption;label.style.transform=`translateY(${(1-f.caption)*35}px)`;note.style.transform=label.style.transform;
 }
 const ro=new ResizeObserver(fit);ro.observe(s);fit();signal.addEventListener('abort',()=>ro.disconnect(),{once:true});return {draw,fit};
}
