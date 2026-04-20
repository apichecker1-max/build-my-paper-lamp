import{useState}from"react"
import DropZone from"./components/DropZone"
import ProcessingView from"./components/ProcessingView"
import Viewer3D from"./components/Viewer3D"
import{processImage}from"./lib/imageProcess"
import{buildWireframe}from"./lib/wireframe"
export default function App(){
  const[state,setState]=useState("idle")
  const[lines,setLines]=useState(null)
  const[preview,setPreview]=useState(null)
  const[error,setError]=useState(null)
  function handleFile(file){
    setError(null);setState("processing")
    const url=URL.createObjectURL(file);setPreview(url)
    const img=new Image()
    img.onload=()=>{
      try{
        const c=processImage(img)
        if(!c.length){setError("No clear outline found — try a photo with a plain background.");setState("idle");return}
        setLines(buildWireframe(c));setState("result")
      }catch(e){setError("Could not process image. Try another photo.");setState("idle")}
    }
    img.onerror=()=>{setError("Could not load image.");setState("idle")}
    img.src=url
  }
  function reset(){setState("idle");setLines(null);if(preview)URL.revokeObjectURL(preview);setPreview(null);setError(null)}
  return(
    <div className="h-full flex flex-col">
      {error&&state==="idle"&&<div className="mx-auto mt-4 w-full max-w-md px-4"><div className="flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3"><p className="text-xs text-red-400">{error}</p></div></div>}
      <div className="flex-1">
        {state==="idle"&&<DropZone onFile={handleFile}/>}
        {state==="processing"&&<ProcessingView/>}
        {state==="result"&&<Viewer3D lines={lines} onReset={reset} preview={preview}/>}
      </div>
    </div>
  )
}
