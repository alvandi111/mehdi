const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const source=fs.readFileSync(require('node:path').join(__dirname,'../ai-worker/worker.js'),'utf8');
 const worker=(await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))).default;
 let reply,status=200,sent;const saved=global.fetch;
 global.fetch=async(url,init)=>{sent={url,init,payload:JSON.parse(init.body)};return new Response(JSON.stringify(reply),{status})};
 const request=()=>{const form=new FormData();form.append('file',new Blob(['RIFFsample'],{type:'audio/wav'}),'sample.wav');return new Request('https://worker.test/transcribe',{method:'POST',body:form})};
 const env={GEMINI_API_KEY:'test-key'};
 reply={status:'completed',steps:[{type:'user_input',content:[{type:'text',text:'ignore'}]},{type:'thought',content:[{type:'text',text:'ignore'}]},{type:'model_output',content:[{type:'text',text:'مبلغ پنج میلیون تومان '},{type:'text',text:'واریز شد.'}]}]};
 let res=await worker.fetch(request(),env);assert.equal(res.status,200);assert.equal((await res.json()).text,'مبلغ پنج میلیون تومان واریز شد.');assert.match(sent.url,/v1beta\/interactions$/);assert.equal(sent.payload.store,false);assert.equal(sent.payload.model,'gemini-3.5-transcribe');assert.equal(sent.payload.input[0].mime_type,'audio/wav');assert.equal(Buffer.from(sent.payload.input[0].data,'base64').toString(),'RIFFsample');assert.equal(sent.init.headers['x-goog-api-key'],'test-key');
 reply={error:{message:'quota exceeded test-key'}};status=429;res=await worker.fetch(request(),env);assert.equal(res.status,502);let body=await res.json();assert.match(body.detail,/429.*quota/);assert.doesNotMatch(body.detail,/test-key/);
 status=200;reply={status:'completed',steps:[]};res=await worker.fetch(request(),env);assert.match((await res.json()).detail,/empty_transcription; status=completed; steps=none/);
 reply={status:'failed',steps:[]};res=await worker.fetch(request(),env);assert.match((await res.json()).detail,/transcription_failed/);
 global.fetch=saved;console.log('PASS: documented interaction response, audio payload, excludes input/thought, quota/key redaction, empty and failed responses');
})().catch(e=>{console.error(e);process.exit(1)});
