// Monotone cubic interpolation keeps the movie moving through internal cues.
// Endpoint velocity is zero so the existing ornament handoff stays stationary.
export function filmTime(keys,u) {
 if(u<=keys[0][0])return keys[0][1];
 if(u>=keys.at(-1)[0])return keys.at(-1)[1];
 const slopes=keys.slice(1).map((b,i)=>(b[1]-keys[i][1])/(b[0]-keys[i][0]));
 const tangent=i=>{
  if(i===0||i===keys.length-1)return 0;
  const a=slopes[i-1],b=slopes[i];if(a*b<=0)return 0;
  const h0=keys[i][0]-keys[i-1][0],h1=keys[i+1][0]-keys[i][0],w0=2*h1+h0,w1=h1+2*h0;
  return (w0+w1)/(w0/a+w1/b);
 };
 const i=keys.findIndex((k,j)=>j<keys.length-1&&u>=k[0]&&u<keys[j+1][0]);
 const [a,x]=keys[i],[b,y]=keys[i+1],h=b-a,t=(u-a)/h,t2=t*t,t3=t2*t;
 return (2*t3-3*t2+1)*x+(t3-2*t2+t)*h*tangent(i)+(-2*t3+3*t2)*y+(t3-t2)*h*tangent(i+1);
}
