export function buildWireframe(contours, depth=1.3, backScale=0.6, ribCount=18) {
  const lines = []
  for (const contour of contours) {
    const n = contour.length
    if (n < 3) continue
    const front = contour.map(([x,y]) => [x,y,-depth/2])
    const back  = contour.map(([x,y]) => [x*backScale,y*backScale,depth/2])
    for (let i=0;i<n;i++) { const a=front[i],b=front[(i+1)%n]; lines.push([a[0],a[1],a[2],b[0],b[1],b[2]]) }
    for (let i=0;i<n;i++) { const a=back[i], b=back[(i+1)%n];  lines.push([a[0],a[1],a[2],b[0],b[1],b[2]]) }
    const step=Math.max(1,Math.floor(n/ribCount))
    for (let i=0;i<n;i+=step) { const a=front[i],b=back[i]; lines.push([a[0],a[1],a[2],b[0],b[1],b[2]]) }
  }
  return lines
}
