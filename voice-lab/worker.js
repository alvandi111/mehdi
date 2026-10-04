let transcriber;
self.onmessage=async({data})=>{
 try{
  if(data.type==='load'){
   const {pipeline,env}=await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2');
   env.allowLocalModels=false;env.backends.onnx.wasm.numThreads=1;
   transcriber=await pipeline('automatic-speech-recognition',data.model,{quantized:true,progress_callback:p=>self.postMessage({type:'progress',file:p.file,status:p.status,progress:p.progress})});
   self.postMessage({type:'ready'});
  }else if(data.type==='transcribe'){
   if(!transcriber)throw new Error('مدل آماده نیست');
   const started=performance.now();const result=await transcriber(data.audio,{language:'persian',task:'transcribe',return_timestamps:false});
   self.postMessage({type:'result',text:result.text,seconds:(performance.now()-started)/1000});
  }
 }catch(e){self.postMessage({type:'error',message:String(e.message||e)})}
};
