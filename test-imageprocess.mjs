// Tests for the edge-based segmentation + Moore tracing pipeline.
// Simulates what processImage does, minus the canvas (which needs a browser).

const G5 = [1/256,4/256,6/256,4/256,1/256,4/256,16/256,24/256,16/256,4/256,6/256,24/256,36/256,24/256,6/256,4/256,16/256,24/256,16/256,4/256,1/256,4/256,6/256,4/256,1/256]
const D8 = [[0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]]
const dirIdx = [[7,0,1],[6,0,2],[5,4,3]]

function gray(data, w, h) {
  const g = new Float32Array(w*h)
  for (let i = 0; i < w*h; i++) g[i] = 0.299*data[i*4] + 0.587*data[i*4+1] + 0.114*data[i*4+2]
  return g
}
function gaussBlur(g, w, h) {
  const o = new Float32Array(w*h)
  for (let y=2;y<h-2;y++) for (let x=2;x<w-2;x++) {
    let s=0; for (let ky=-2;ky<=2;ky++) for (let kx=-2;kx<=2;kx++) s+=g[(y+ky)*w+(x+kx)]*G5[(ky+2)*5+(kx+2)]; o[y*w+x]=s
  }
  return o
}
function sobel(g, w, h, t) {
  const e=new Uint8Array(w*h)
  for (let y=1;y<h-1;y++) for (let x=1;x<w-1;x++) {
    const gx=-g[(y-1)*w+(x-1)]-2*g[y*w+(x-1)]-g[(y+1)*w+(x-1)]+g[(y-1)*w+(x+1)]+2*g[y*w+(x+1)]+g[(y+1)*w+(x+1)]
    const gy=-g[(y-1)*w+(x-1)]-2*g[(y-1)*w+x]-g[(y-1)*w+(x+1)]+g[(y+1)*w+(x-1)]+2*g[(y+1)*w+x]+g[(y+1)*w+(x+1)]
    if (Math.sqrt(gx*gx+gy*gy)>t) e[y*w+x]=1
  }
  return e
}
function clearBorder(e, w, h, r = 4) {
  for (let x=0;x<w;x++) for (let y=0;y<r;y++){e[y*w+x]=0;e[(h-1-y)*w+x]=0}
  for (let y=0;y<h;y++) for (let x=0;x<r;x++){e[y*w+x]=0;e[y*w+(w-1-x)]=0}
  return e
}
function dilate(e, w, h) {
  const o=new Uint8Array(w*h)
  for (let y=1;y<h-1;y++) for (let x=1;x<w-1;x++)
    if (e[y*w+x]||e[(y-1)*w+x]||e[(y+1)*w+x]||e[y*w+x-1]||e[y*w+x+1]) o[y*w+x]=1
  return o
}
function interiorMask(edges, w, h) {
  const visited=new Uint8Array(w*h); const queue=[]; let qi=0
  function seed(x,y) { if (visited[y*w+x]||edges[y*w+x]) return; visited[y*w+x]=1; queue.push(x,y) }
  for (let x=0;x<w;x++){seed(x,0);seed(x,h-1)}
  for (let y=1;y<h-1;y++){seed(0,y);seed(w-1,y)}
  const D4=[[-1,0],[1,0],[0,-1],[0,1]]
  while (qi<queue.length) {
    const x=queue[qi++],y=queue[qi++]
    for (const [dx,dy] of D4) { const nx=x+dx,ny=y+dy; if (nx<0||nx>=w||ny<0||ny>=h||visited[ny*w+nx]||edges[ny*w+nx]) continue; visited[ny*w+nx]=1; queue.push(nx,ny) }
  }
  const fg=new Uint8Array(w*h); for (let i=0;i<w*h;i++) if (!visited[i]) fg[i]=1; return fg
}
function keepLargestComponent(fg, w, h) {
  const label=new Int32Array(w*h).fill(-1); let maxSize=0,maxLabel=0,nextLabel=0
  const D4=[[-1,0],[1,0],[0,-1],[0,1]]
  for (let y=0;y<h;y++) for (let x=0;x<w;x++) {
    if (!fg[y*w+x]||label[y*w+x]>=0) continue
    const comp=nextLabel++; const queue=[x,y]; let qi=0,size=0; label[y*w+x]=comp
    while (qi<queue.length) { const cx=queue[qi++],cy=queue[qi++]; size++; for (const [dx,dy] of D4) { const nx=cx+dx,ny=cy+dy; if (nx<0||nx>=w||ny<0||ny>=h||!fg[ny*w+nx]||label[ny*w+nx]>=0) continue; label[ny*w+nx]=comp; queue.push(nx,ny) } }
    if (size>maxSize){maxSize=size;maxLabel=comp}
  }
  const out=new Uint8Array(w*h); for (let i=0;i<w*h;i++) if (label[i]===maxLabel) out[i]=1; return out
}
function traceBoundary(fg, w, h) {
  let sx=-1,sy=-1
  outer: for (let y=0;y<h;y++) for (let x=0;x<w;x++) { if (fg[y*w+x]){sx=x;sy=y;break outer} }
  if (sx===-1) return []
  const contour=[[sx,sy]]; let bx=sx-1,by=sy,cx=sx,cy=sy
  for (let iter=0;iter<w*h;iter++) {
    const ddx=Math.max(-1,Math.min(1,bx-cx)),ddy=Math.max(-1,Math.min(1,by-cy))
    const sd=dirIdx[ddy+1][ddx+1]; let moved=false
    for (let i=1;i<=8;i++) { const dir=(sd+i)%8,nx=cx+D8[dir][0],ny=cy+D8[dir][1]; if (nx>=0&&nx<w&&ny>=0&&ny<h&&fg[ny*w+nx]){const prev=(sd+i-1)%8;bx=cx+D8[prev][0];by=cy+D8[prev][1];cx=nx;cy=ny;moved=true;break} }
    if (!moved) break; if (cx===sx&&cy===sy) break; contour.push([cx,cy])
  }
  return contour
}
function douglasPeucker(pts, eps) {
  if (pts.length<=2) return pts
  const [ax,ay]=pts[0],[bx,by]=pts[pts.length-1],dx=bx-ax,dy=by-ay,len=Math.sqrt(dx*dx+dy*dy)
  let maxD=0,maxI=0
  for (let i=1;i<pts.length-1;i++) { const d=len?Math.abs(dy*pts[i][0]-dx*pts[i][1]+bx*ay-by*ax)/len:Math.hypot(pts[i][0]-ax,pts[i][1]-ay); if (d>maxD){maxD=d;maxI=i} }
  if (maxD>eps) { const l=douglasPeucker(pts.slice(0,maxI+1),eps),r=douglasPeucker(pts.slice(maxI),eps); return [...l.slice(0,-1),...r] }
  return [pts[0],pts[pts.length-1]]
}

// Build a synthetic RGBA pixel array from a grayscale shape function
function makeImage(w, h, shapeFn) {
  const data = new Uint8Array(w * h * 4)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const v = shapeFn(x, y)
    const i = (y * w + x) * 4
    data[i] = data[i+1] = data[i+2] = v; data[i+3] = 255
  }
  return data
}

function runTest(name, data, w, h, threshold = 30) {
  const sobelT = Math.max(5, 40 - threshold * 0.35)
  const edges = clearBorder(dilate(sobel(gaussBlur(gray(data, w, h), w, h), w, h, sobelT), w, h), w, h)
  const fgRaw = interiorMask(edges, w, h)
  const fg = keepLargestComponent(fgRaw, w, h)
  const raw = traceBoundary(fg, w, h)
  const simplified = raw.length >= 2 ? douglasPeucker(raw, 3) : raw
  const pass = raw.length >= 6 && simplified.length >= 4
  const fgCount = fg.reduce((a, v) => a + v, 0)
  console.log(`[${pass ? 'PASS' : 'FAIL'}] ${name}`)
  console.log(`  fg pixels: ${fgCount}, raw boundary: ${raw.length}, simplified: ${simplified.length}`)
  if (!pass) console.log(`  *** WOULD RETURN "No clear outline found" ***`)
}

// Test 1: Dark circle on light background (classic subject)
runTest('Dark circle on white bg (100x100)',
  makeImage(100, 100, (x,y) => Math.hypot(x-50,y-50) < 25 ? 80 : 240), 100, 100)

// Test 2: Dog-like shape — body + legs + head (all dark on light bg)
{
  const w=160, h=120
  const data = makeImage(w, h, (x, y) => {
    const body = x>20&&x<120&&y>30&&y<75
    const head = x>100&&x<145&&y>15&&y<60
    const leg1 = x>25&&x<40&&y>70&&y<105
    const leg2 = x>50&&x<65&&y>70&&y<105
    const leg3 = x>75&&x<90&&y>70&&y<105
    const leg4 = x>95&&x<110&&y>70&&y<105
    const ear  = x>120&&x<138&&y>5&&y<22
    const tail = x>10&&x<24&&y>25&&y<45
    return (body||head||leg1||leg2||leg3||leg4||ear||tail) ? 60 : 230
  })
  runTest('Dog silhouette on light bg (160x120)', data, w, h)
}

// Test 3: Low contrast — subject only slightly darker than background
runTest('Low contrast circle (100x100)',
  makeImage(100, 100, (x,y) => Math.hypot(x-50,y-50) < 25 ? 160 : 200), 100, 100)

// Test 4: Busy background — texture pixels everywhere + clear subject
{
  const w=120, h=120
  const data = makeImage(w, h, (x, y) => {
    if (Math.hypot(x-60, y-60) < 30) return 50  // dark subject
    return ((x+y)%6 < 3) ? 200 : 230            // striped background
  })
  runTest('Subject on striped bg (120x120)', data, w, h)
}

// Test 5: All background — should fail gracefully
runTest('All white (should fail)',
  makeImage(80, 80, () => 255), 80, 80)
