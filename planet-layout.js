import { ease } from './november-layout.js';
import { incomePlanetHandoff } from './income-glass-layout.js';
import { clockContactGeometry } from './clock-contact-transition.js?local=21';
import { fitScale } from './layout-fit.js';

// Calibrated against the decoded 1920 × 1082 video, not its letterbox.
export const planetStart = { x: 943.63, y: 508.87, radius: 320.1 };
export const clockFace = { x: 960.5, y: 845.5, radius: 652.5 };
const clockTrack = [[7.3,950.68,517.32,384.73],[7.5,949.55,524.29,396.8],
 [7.7,947.73,528.27,407.54],[8,941.56,534.70,426.19],
 [8.3,938.41,543.98,432.82],[8.6,935.94,543.62,443.03],[8.99,934.48,543.91,452.75]];
const mix = (a,b,p) => a+(b-a)*p;
export function clockSource(time) {
 let a=clockTrack[0],b=a;
 for(let i=1;i<clockTrack.length;i++){b=clockTrack[i];if(time<=b[0])break;a=b;}
 const p=Math.max(0,Math.min(1,(time-a[0])/Math.max(.001,b[0]-a[0])));
 return {x:mix(a[1],b[1],p),y:mix(a[2],b[2],p),radius:mix(a[3],b[3],p)};
}
export function planetComposition(width,height) {
 const scale=fitScale(width,height,1920,2287,'planet',24,24);
 return {scale,x:(width-1920*scale)/2,y:(height-2287*scale)/2};
}
function mapCircle(source,target){const scale=target.radius/source.radius;return {x:target.x-source.x*scale,y:target.y-source.y*scale,scale};}
export function planetAISource(time) {
 const keys=[[3,986.68,473.30],[3.2,991.84,471.79],[3.4,996.8,468.34],[3.7,995.27,476.66],[4,996.99,480.05],[4.2,995.84,481.71]];
 let a=keys[0],b=a;
 for(let i=1;i<keys.length;i++){b=keys[i];if(time<=b[0])break;a=b;}
 const p=Math.max(0,Math.min(1,(time-a[0])/Math.max(.001,b[0]-a[0])));
 return {x:mix(a[1],b[1],p),y:mix(a[2],b[2],p)};
}
export function planetAgentSource(time) {
 const keys=[[5,991.09,479.12],[5.3,984.75,473.48],[5.6,979.49,469.03],[5.9,979.89,467.27],[6.2,993.71,503.34]];
 let a=keys[0],b=a;for(let i=1;i<keys.length;i++){b=keys[i];if(time<=b[0])break;a=b;}
 const p=Math.max(0,Math.min(1,(time-a[0])/Math.max(.001,b[0]-a[0])));
 return {x:mix(a[1],b[1],p),y:mix(a[2],b[2],p)};
}
export function planetMediaPose(width,height,u,time=0,aiFocus=null,agentFocus=null,reduced=false) {
 const start=mapCircle(planetStart,incomePlanetHandoff(width,height,u));
 const push=ease(12.05,13.2,u),orbitScale=Math.max(width/1920,height/1082)*(1.35+.13*push);
 const orbit={scale:orbitScale,x:width*(.5+.025*push)-950*orbitScale,y:height*(.6+.025*push)-535*orbitScale};
 const pull=ease(10.85,11.55,u),compose=planetComposition(width,height);
 const open={x:mix(start.x,orbit.x,pull),y:mix(start.y,orbit.y,pull),scale:mix(start.scale,orbit.scale,pull)};
 // Adjust only the AI reading phase, after the existing ornament handoff.
 // The camera follows the visible numeral's ink center, not a viewport %.
 if(aiFocus){
  const weight=ease(11.1,11.55,u)*(1-ease(12.05,12.45,u)),source=planetAISource(time);
  open.x=mix(open.x,aiFocus.x-source.x*open.scale,weight);
  open.y=mix(open.y,aiFocus.y-source.y*open.scale,weight);
 }
 if(agentFocus){
  const weight=ease(12.4,12.85,u)*(1-ease(13.55,14,u)),source=planetAgentSource(time);
  open.x=mix(open.x,agentFocus.x-source.x*open.scale,weight);
  open.y=mix(open.y,agentFocus.y-source.y*open.scale,weight);
 }
 const target={x:compose.x+clockFace.x*compose.scale,y:compose.y+clockFace.y*compose.scale,radius:clockFace.radius*compose.scale};
 const clock=mapCircle(clockSource(time),target),settle=ease(13.8,14.65,u);
 if(u>15.65){const g=clockContactGeometry(width,height,u,reduced);return mapCircle(clockSource(time),{x:g.x,y:g.y,radius:g.half});}
 return {x:mix(open.x,clock.x,settle),y:mix(open.y,clock.y,settle),scale:mix(open.scale,clock.scale,settle)};
}
export function clockLayerFrame(name,u,reduced=false) {
 const starts={rim:14.32,bezel:14.18,outer:14.53,arc:14.72,hands:14.6};
 const p=ease(starts[name]??14.4,(starts[name]??14.4)+.75,u);
 if(reduced)return {progress:u>=14.2?1:0,scale:1,tilt:1,rotate:0,y:0};
 const turn={rim:-85,bezel:65,outer:-45,arc:22,hands:0}[name]??0;
 const faceRing=name==='rim'||name==='bezel';
 return {progress:p,scale:faceRing?1:name==='outer'?.62+.38*p:.28+.72*p,tilt:faceRing?1:.3+.7*p,rotate:turn*(1-p),y:(name==='arc'?220:0)*(1-p)};
}
