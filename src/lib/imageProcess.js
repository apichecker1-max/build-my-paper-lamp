const G5=[1/256,4/256,6/256,4/256,1/256,4/256,16/256,24/256,16/256,4/256,6/256,24/256,36/256,24/256,6/256,4/256,16/256,24/256,16/256,4/256,1/256,4/256,6/256,4/256,1/256]
function gray(data,w,h){const g=new Float32Array(w*h);for(let i=0;i<w*h;i++)g[i]=0.299*data[i*4]+0.587*data[i*4+1]+0.114*data[i*4+2];return g}
function blur(g,w,h){const o=new Float32Array(w*h);for(let y=2;y<h-2;y++)for(let x=2;x<w-2;x++){let s=0;for(let ky=-2;ky<=2;ky++)for(let kx=-2;kx<=2;kx++)s+=g[(y+ky)*w+(x+kx)]*G5[(ky+2)*5+(kx+2)];o[y*w+x]=s}return o}
function sobel(g,w,h,t=22){const e=new Uint8Array(w*h);for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const gx=-g[(y-1)*w+(x-1)]-2*g[y*w+(x-1)]-g[(y+1)*w+(x-1)]+g[(y-1)*w+(x+1)]+2*g[y*w+(x+1)]+g[(y+1)*w+(x+1)];const gy=-g[(y-1)*w+(x-1)]-2*g[(y-1)*w+x]-g[(y-1)*w+(x+1)]+g[(y+1)*w+(x-1)]+2*g[(y+1)*w+x]+g[(y+1)*w+(x+1)];e[y*w+x]=Math.sqrt(gx*gx+gy*gy)>t?1:0}return e}
function dilate(e,w,h){const o=new Uint8Array(w*h);for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++)if(e[y*w+x]||e[(y-1)*w+x]||e[(y+1)*w+x]||e[y*w+x-1]||e[y*w+x+1])o[y*w+x]=1;return o}
function silhouette(e,w,h){let top=h,bot=0;for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(e[y*w+x]){top=Math.min(top,y);bot=Math.max(bot,y);break}if(top>=bot)return[];const L=[],R=[];for(let y=top;y<=bot;y++){let l=-1,r=-1;for(let x=0;x<w;x++)if(e[y*w+x]){l=x;break}for(let x=w-1;x>=0;x--)if(e[y*w+x]){r=x;break}if(l!==-1)L.push([l,y]);if(r!==-1)R.push([r,y])}return[...L,...R.reverse()]}
function pdist(p,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.sqrt(dx*dx+dy*dy);if(!len)return Math.hypot(p[0]-a[0],p[1]-a[1]);return Math.abs(dy*p[0]-dx*p[1]+b[0]*a[1]-b[1]*a[0])/len}
function dp(pts,eps){if(pts.length<=2)return pts;let md=0,mi=0;for(let i=1;i<pts.length-1;i++){const d=pdist(pts[i],pts[0],pts[pts.length-1]);if(d>md){md=d;mi=i}}if(md>eps){const l=dp(pts.slice(0,mi+1),eps),r=dp(pts.slice(mi),eps);return[...l.slice(0,-1),...r]}return[pts[0],pts[pts.length-1]]}
export function processImage(img){
  const MAX=480,scale=Math.min(MAX/img.naturalWidth,MAX/img.naturalHeight,1)
  const w=Math.round(img.naturalWidth*scale),h=Math.round(img.naturalHeight*scale)
  const c=document.createElement("canvas");c.width=w;c.height=h
  const ctx=c.getContext("2d");ctx.drawImage(img,0,0,w,h)
  const {data}=ctx.getImageData(0,0,w,h)
  const edges=dilate(sobel(blur(gray(data,w,h),w,h),w,h),w,h)
  const poly=silhouette(edges,w,h)
  if(poly.length<6)return[]
  const s=dp(poly,4)
  if(s.length<4)return[]
  return[s.map(([x,y])=>[(x/w)*2-1,-((y/h)*2-1)])]
}
