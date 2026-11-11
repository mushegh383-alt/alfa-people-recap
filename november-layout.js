export const clamp = p => Math.max(0, Math.min(1, p));
export const ease = (a,b,p) => { const t=clamp((p-a)/(b-a)); return t*t*(3-2*t); };
export const sectionProgress = (top,height,viewport) => clamp((viewport*.18-top)/Math.max(1,height-viewport+viewport*.18));
export function envelopeFrame(progress, reduced=false) {
 const p=clamp(progress);
 return { video:reduced?1:clamp(p/.53), received:ease(.47,.60,p)*(1-ease(.70,.78,p)), sent:ease(.77,.88,p), receivedDigits:ease(.48,.61,p), sentDigits:ease(.76,.90,p), phase:p<.47?'opening':p<.76?'received':'sent' };
}
export function reel(value, progress) {
 const digits=String(value);
 return [...digits].map((digit,i)=>progress >= .75+.25*(i+1)/digits.length ? digit : String((Number(digit)+i+4+Math.floor(clamp(progress)*25))%10)).join('');
}
