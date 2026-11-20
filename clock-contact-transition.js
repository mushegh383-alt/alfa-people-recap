import { ease } from './november-layout.js';
import { fitScale } from './layout-fit.js';
const mix=(a,b,p)=>a+(b-a)*p;
const degrees=-2.96494;
const radians=degrees*Math.PI/180;
export const contactPhoto={x:608+344*Math.cos(radians)-344*Math.sin(radians),y:358.586+344*Math.sin(radians)+344*Math.cos(radians),angle:degrees};
export function contactComposition(width,height){const scale=fitScale(width,height,1920,1647,'contact',24,24);return {scale,x:(width-1920*scale)/2,y:(height-1647*scale)/2};}
export function clockContactFrame(u,reduced=false){
 const p=reduced?(u<16.15?0:1):ease(15.65,16.95,u);
 return {p,photo:ease(.03,.62,p),face:1-ease(.28,.78,p),information:1-ease(0,.28,p),hands:1-ease(0,.4,p),erase:ease(.22,.88,p),frame:1-ease(.76,1,p),turn:p*540};
}
export function clockContactGeometry(width,height,u,reduced=false){
 const {p}=clockContactFrame(u,reduced),clockScale=fitScale(width,height,1920,2287,'planet',24,24),contact=contactComposition(width,height);
 const origin={x:(width-1920*clockScale)/2,y:(height-2287*clockScale)/2};
 const x=mix(origin.x+960.5*clockScale,contact.x+contactPhoto.x*contact.scale,p),y=mix(origin.y+845.5*clockScale,contact.y+contactPhoto.y*contact.scale,p);
 const half=mix(652.5*clockScale,344*contact.scale,p);
 return {x,y,half,corner:half*(1-(1-106/344)*p),angle:degrees*p,stroke:mix(64,8,p)*clockScale,clockScale,clockOrigin:origin,contact,p};
}
// The same four cubic corners describe a circle at p=0 and the authored rounded
// portrait at p=1. No mask wipe or flattened screenshot replaces the geometry.
export function clockContactPath(g){
 const origin=g.clockOrigin,s=g.clockScale,x=(g.x-origin.x)/s,y=(g.y-origin.y)/s,h=(g.half+g.stroke/2)/s,r=(g.corner+g.stroke/2)/s,k=.5522847498,a=g.angle*Math.PI/180;
 const point=(dx,dy)=>`${(x+dx*Math.cos(a)-dy*Math.sin(a)).toFixed(3)} ${(y+dx*Math.sin(a)+dy*Math.cos(a)).toFixed(3)}`;
 return `M${point(h,-h+r)} L${point(h,h-r)} C${point(h,h-r+k*r)} ${point(h-r+k*r,h)} ${point(h-r,h)} L${point(-h+r,h)} C${point(-h+r-k*r,h)} ${point(-h,h-r+k*r)} ${point(-h,h-r)} L${point(-h,-h+r)} C${point(-h,-h+r-k*r)} ${point(-h+r-k*r,-h)} ${point(-h+r,-h)} L${point(h-r,-h)} C${point(h-r+k*r,-h)} ${point(h,-h+r-k*r)} ${point(h,-h+r)} Z`;
}
