import { optimizedAssetUrl } from './resources.js';
const art='./assets/november/';
function scene(id,label,width,height){const section=document.createElement('section');section.id=id;section.className=`november-scene ${id}`;section.setAttribute('aria-label',label);section.dataset.width=width;section.dataset.height=height;section.innerHTML='<div class="november-stage"><div class="november-composition"></div></div>';return section;}
function image(parent,name,cls,x,y,w,h){const node=document.createElement('img');node.src=optimizedAssetUrl(art+name);node.alt='';node.setAttribute('aria-hidden','true');node.className=cls;Object.assign(node.style,{left:`${x}px`,top:`${y}px`,width:`${w}px`,height:`${h}px`});parent.append(node);return node;}
function copy(parent,tag,cls,text,x,y,w){const node=document.createElement(tag);node.className=cls;node.textContent=text;Object.assign(node.style,{left:`${x}px`,top:`${y}px`,width:`${w}px`});parent.append(node);return node;}
function count(parent,value,x,y,w,size){const node=copy(parent,'p','november-number',value,x,y,w);node.dataset.value=String(value);node.setAttribute('aria-hidden','true');const accessible=document.createElement('span');accessible.className='sr-only';accessible.textContent=String(value);parent.append(accessible);node.style.fontSize=`${Math.min(size,size*4/Math.max(1,String(value).length))}px`;return node;}
export function createNovemberCoins(data){
 const section=scene('coins','Полученные коины',1920,1740),c=section.querySelector('.november-composition');
 if(data.achievements)section.classList.add('follows-achievements');
 // Наполнение сцены: сияние, орбита, мини-коины на разной глубине и искры.
 const deco=document.createElement('div');deco.className='coins-deco';deco.setAttribute('aria-hidden','true');
 deco.innerHTML='<div class="coins-glow"></div><div class="coins-pink-orbit"></div>';
 const minis=document.createElement('div');minis.className='coins-blue-orbit';minis.setAttribute('aria-hidden','true');
 [[230,560,300,0,-1],[1640,500,230,0,1],[1690,1200,330,0,1],[200,1290,250,1,-1],[1470,1560,170,1,1],[290,200,150,1,-1],[1740,180,130,1,1]].forEach(([x,y,w,far,dir],i)=>{
  const m=document.createElement('div');m.className=`coins-mini${far?' is-far':''}`;Object.assign(m.style,{left:`${x-w/2}px`,top:`${y-w*.34}px`,width:`${w}px`,height:`${w*.68}px`,animationDelay:`${-i*.9}s`});
  m.dataset.dir=dir;m.innerHTML=`<img src="${optimizedAssetUrl(art+'../learning/coin-top.webp')}" alt="">`;minis.append(m);});
 [[360,880],[1530,820],[700,300],[1320,1380],[560,1500],[1780,700],[120,860],[1180,260]].forEach(([x,y],i)=>{const sp=document.createElement('i');sp.className='coins-sparkle';Object.assign(sp.style,{left:`${x}px`,top:`${y}px`,animationDelay:`${-i*.45}s`});minis.append(sp);});
 c.append(deco);
 copy(c,'h2','november-heading coins-heading',data.coins.title,0,154,1920);
 image(c,'../learning/coin-bottom.webp','november-coin coin-bottom',446,926,977,656);
 image(c,'../learning/coin-middle.webp','november-coin coin-middle',427,595,1007,675);
 count(c,data.coins.earned,523,536,822,550);
 image(c,'../learning/coin-top.webp','november-coin coin-top',457,267,977,656);
 copy(c,'p','november-copy coins-copy',data.coins.label,451,1516,1018);c.append(minis);return section;
}
export function createNovemberPark(data){
 const section=scene('parksharing','Паркшеринг',2068,1950),c=section.querySelector('.november-composition');
 image(c,'snow.svg','november-snow',-7.24,1101.8,2082.48,1520.02);
 copy(c,'h2','november-heading november-park-heading',data.parksharing.title,0,158,2088);
 const canvas=document.createElement('img');canvas.className='car-sequence';canvas.alt='';canvas.decoding='sync';canvas.draggable=false;canvas.setAttribute('aria-hidden','true');const car=document.createElement('div');car.className='car-motion';const blend=document.createElement('div');blend.className='car-ground-blend';blend.setAttribute('aria-hidden','true');car.append(canvas,blend);c.append(car);
 count(c,data.parksharing.trips,670,874,656,500);
 copy(c,'p','november-park-label','Раза вы бронировали\nпаркшеринг',670,1488,656);
 copy(c,'p','november-copy november-park-note',data.parksharing.note,548,1582,1014.732);return section;
}
