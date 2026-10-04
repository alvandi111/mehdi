'use strict';
const el=id=>document.getElementById(id);
let worker,ready=false,stream,context,source,processor,chunks=[],recording=false,limit,clock,started=0;
const say=text=>el('state').textContent=text;
function network(){el('network').textContent=navigator.onLine?'مرورگر اتصال شبکه گزارش می‌کند؛ برای اثبات آفلاین‌بودن، حالت پرواز و Wi-Fi خاموش باشد.':'مرورگر بدون شبکه است.'}network();addEventListener('online',network);addEventListener('offline',network);
function reset(){el('load').disabled=false;el('model').disabled=false;el('record').disabled=!ready;el('stop').disabled=true}
el('load').onclick=()=>{
 worker?.terminate();ready=false;el('load').disabled=true;el('model').disabled=true;el('record').disabled=true;say('در حال دریافت مدل و موتور؛ لطفاً منتظر بمان…');
 worker=new Worker('worker.js');
 worker.onerror=()=>{ready=false;say('موتور اجرا نشد. اتصال دانلود یا پشتیبانی مرورگر را بررسی کن.');reset()};
 worker.onmessage=({data:d})=>{
  if(d.type==='progress'){if(Number.isFinite(d.progress))el('progress').value=d.progress;say(`در حال آماده‌سازی: ${d.file||d.status||''}\n${Number.isFinite(d.progress)?Math.round(d.progress)+'٪ از این فایل':''}`)}
  if(d.type==='ready'){ready=true;el('progress').value=100;say('مدل آماده است. اکنون می‌توانی در همین صفحه اینترنت را قطع و ضبط را آزمایش کنی.');reset()}
  if(d.type==='result'){el('result').value=d.text||'';el('metrics').textContent=`مدت صدا: ${audioSeconds.toFixed(1)} ثانیه؛ زمان تبدیل: ${d.seconds.toFixed(1)} ثانیه؛ مدل: ${el('model').value}`;say(d.text?.trim()?'تبدیل روی دستگاه پایان یافت؛ دقت اسم و مبلغ را بررسی کن.':'متن قابل تشخیص دریافت نشد.');reset()}
  if(d.type==='error'){say('آزمایش ناموفق: '+d.message);reset()}
 };worker.postMessage({type:'load',model:el('model').value});
};
let audioSeconds=0;
function release(){clearTimeout(limit);clearInterval(clock);if(processor)processor.onaudioprocess=null;try{source?.disconnect();processor?.disconnect()}catch{}stream?.getTracks().forEach(t=>t.stop());context?.close().catch(()=>{})}
function resample(samples,rate){if(rate===16000)return samples;const ratio=rate/16000;const out=new Float32Array(Math.floor(samples.length/ratio));for(let i=0;i<out.length;i++){const from=Math.floor(i*ratio),to=Math.min(samples.length,Math.floor((i+1)*ratio));let sum=0;for(let j=from;j<to;j++)sum+=samples[j];out[i]=sum/Math.max(1,to-from)}return out}
el('record').onclick=async()=>{
 if(!ready||recording)return;el('record').disabled=true;el('load').disabled=true;el('model').disabled=true;el('result').value='';chunks=[];
 try{context=new (window.AudioContext||window.webkitAudioContext)();await context.resume();stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});source=context.createMediaStreamSource(stream);processor=context.createScriptProcessor(4096,1,1);recording=true;processor.onaudioprocess=e=>{e.outputBuffer.getChannelData(0).fill(0);if(recording)chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)))};source.connect(processor);processor.connect(context.destination);el('stop').disabled=false;started=performance.now();say('در حال ضبط روی گوشی…');clock=setInterval(()=>say(`در حال ضبط: ${Math.floor((performance.now()-started)/1000)} ثانیه`),1000);limit=setTimeout(finish,15000)}catch(e){recording=false;release();say('میکروفن باز نشد: '+e.message);reset()}
};
function finish(){if(!recording)return;recording=false;const rate=context.sampleRate;release();el('stop').disabled=true;const length=chunks.reduce((n,c)=>n+c.length,0);if(length<rate*.3){say('صدای کافی دریافت نشد.');reset();return}const samples=new Float32Array(length);let offset=0;for(const c of chunks){samples.set(c,offset);offset+=c.length}audioSeconds=length/rate;chunks=[];say('در حال تبدیل روی گوشی؛ ممکن است کمی زمان ببرد…');network();const audio=resample(samples,rate);worker.postMessage({type:'transcribe',audio},[audio.buffer])}
el('stop').onclick=finish;document.addEventListener('visibilitychange',()=>{if(document.hidden&&recording)finish()});addEventListener('pagehide',()=>{recording=false;release();worker?.terminate()});
