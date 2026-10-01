(function () {
 'use strict';
 const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
 let session = null, serial = 0;
 window.peymanyarFrozenVoice = Object.freeze({assistantPanel, startVoice});
 assistantPanel = () => `<section class="card voice-entry"><button class="btn primary" onclick="openQuick();startVoice()">🎙 ضبط فرمان فارسی</button><button class="btn" onclick="openQuick()">نوشتن فرمان</button></section>`;
 function fields() {
  document.querySelectorAll('[data-ld-original-id]').forEach(el => {el.id=el.dataset.ldOriginalId;delete el.dataset.ldOriginalId});
  for(const id of ['quickText','voiceBtn','voiceStatus','parsedResult']) {
   const all=[...document.querySelectorAll(`[id="${id}"]`)];
   for(const el of all.slice(0,-1)){el.dataset.ldOriginalId=id;el.id=`voice-hidden-${++serial}-${id}`}
  }
 }
 const active=s=>session===s&&s.input.isConnected;
 function status(s,text){if(active(s))s.overlay.querySelector('.voice-caption').textContent=text}
 function display(s){if(!active(s))return;s.text=(s.mode==='server'?[...s.parts].sort((a,b)=>a[0]-b[0]).map(x=>x[1]).join(' '):[s.committed,...s.results.values()].filter(Boolean).join(' ')).trim();s.overlay.querySelector('.voice-live-text').textContent=s.text||'صحبت کن؛ متن گفتارت اینجا نمایش داده می‌شود.'}
 function release(s){if(s.released)return;s.released=true;clearInterval(s.clock);clearInterval(s.flushTimer);clearTimeout(s.limit);clearTimeout(s.startTimer);if(s.processor)s.processor.onaudioprocess=null;try{s.source?.disconnect();s.processor?.disconnect()}catch{}s.stream?.getTracks().forEach(t=>t.stop());if(s.context?.state!=='closed')s.context?.close().catch(()=>{})}
 function dismiss(s){release(s);clearTimeout(s.endTimer);try{s.recognition?.abort()}catch{}s.input.readOnly=false;s.overlay.remove();document.body.style.overflow=s.oldOverflow;if(session===s)session=null;if(s.previousFocus?.isConnected)s.previousFocus.focus()}
 function settled(s){
  if(!active(s)||s.recording||s.pending||s.recognitionPending)return;
  s.overlay.querySelector('.voice-retry').hidden=!s.failed.length;
  if(s.failed.length){status(s,'ضبط متوقف شد؛ بخشی از صدا تبدیل نشد. صدا حفظ شده؛ دوباره تلاش کن.');return}
  display(s);if(!s.text){if(!s.error)status(s,'متنی دریافت نشد؛ صفحه را ببند و دوباره ضبط کن.');return}
  s.input.value=[s.base,s.text].filter(Boolean).join(' ');dismiss(s);setVoiceState('ضبط پایان یافت؛ متن را بررسی کن و «تحلیل و ادامه» را بزن.');s.input.focus();
  // No input event or automatic analysis: the user reviews first.
 }
 function queue(s,blob,part=++s.part){s.pending++;s.queue=s.queue.then(async()=>{try{if(!active(s))return;const text=await transcribeBulkPart(blob);if(!String(text||'').trim())throw new Error('متنی در این بخش تشخیص داده نشد');if(active(s)){s.parts.set(part,text);display(s)}}catch(error){if(active(s)){s.failed.push({blob,part});status(s,`تبدیل این بخش انجام نشد؛ صدا حفظ شده است. ${voiceServiceError(error)}`)}}finally{s.pending--;settled(s)}})}
 function flush(s){if(!s.chunks.length)return;const samples=mergePcmChunks(s.chunks);s.chunks=[];if(samples.length<s.rate*.25)return;let peak=0;for(let i=0;i<samples.length;i+=80)peak=Math.max(peak,Math.abs(samples[i]));if(peak<.00015)return;queue(s,pcmToWav(downsamplePcm(samples,s.rate),16000))}
 function useServer(s){if(!active(s)||s.mode==='server')return;clearTimeout(s.startTimer);if(!s.stream){s.error=true;status(s,'تشخیص گفتار در دسترس نیست؛ صفحه را مستقیم در Safari باز کن.');stop(s);return}s.mode='server';s.results.clear();s.committed='';s.recognitionPending=false;try{s.recognition?.abort()}catch{}status(s,s.recording?'در حال ضبط؛ متن هر چند ثانیه زیر دکمه آماده می‌شود.':'میکروفن خاموش شد؛ در حال تبدیل صدا…');flush(s);if(s.recording)s.flushTimer=setInterval(()=>flush(s),5000);else settled(s)}
 function recognize(s){
  const r=new Recognition();s.recognition=r;r.lang='fa-IR';r.continuous=true;r.interimResults=true;
  r.onstart=()=>{clearTimeout(s.startTimer);if(active(s)&&s.recording)status(s,'در حال ضبط؛ صحبت کن. برای پایان دکمه بزرگ را بزن.')};
  r.onresult=e=>{if(!active(s)||s.mode!=='browser')return;for(const i of s.results.keys())if(i>=e.results.length)s.results.delete(i);for(let i=e.resultIndex;i<e.results.length;i++)s.results.set(i,String(e.results[i][0]?.transcript||'').replace(/[يى]/g,'ی').replace(/ك/g,'ک'));display(s)};
  r.onerror=e=>{if(!active(s)||s.mode!=='browser'||e.error==='aborted')return;if(e.error==='not-allowed'&&!s.stream){s.error=true;status(s,'اجازهٔ میکروفن داده نشد؛ دسترسی میکروفن را فعال کن.');stop(s)}else useServer(s)};
  r.onend=()=>{if(!active(s)||s.mode!=='browser')return;s.recognitionPending=false;if(s.recording){s.committed=[s.committed,...s.results.values()].filter(Boolean).join(' ');s.results.clear();try{r.start()}catch{useServer(s)}}else if(!s.text&&s.stream&&!s.error)useServer(s);else settled(s)};
  s.startTimer=setTimeout(()=>useServer(s),12000);try{r.start()}catch{useServer(s)}
 }
 function stop(s=session){
  if(!s||!active(s)||!s.recording)return;s.recording=false;s.overlay.dataset.state='stopped';const b=s.overlay.querySelector('.voice-main-button');b.disabled=true;b.textContent='■';b.setAttribute('aria-label','ضبط متوقف شد');s.overlay.querySelector('.voice-heading').textContent='ضبط متوقف شد';if(!s.error)status(s,'میکروفن خاموش شد؛ در حال آماده‌کردن متن…');
  if(s.mode==='server')flush(s);release(s);
  if(s.mode==='browser'&&s.recognition){s.recognitionPending=true;try{s.recognition.stop()}catch{s.recognitionPending=false}s.endTimer=setTimeout(()=>{if(!active(s))return;s.recognitionPending=false;try{s.recognition.abort()}catch{}if(!s.text&&s.stream&&!s.error)useServer(s);else settled(s)},2200)}else settled(s)
 }
 startVoice=async function(){
  fields();if(session){stop();return}if(aiVoiceSending||pcmVoiceRecording||dailyVoiceSession?.recording||bulkVoiceSession?.recording)return toast('ابتدا ضبط یا تبدیل قبلی را تمام کن');
  const input=document.getElementById('quickText');if(!input)return;clearTimeout(window.commandAnalysisTimer);
  const overlay=document.createElement('div');overlay.className='voice-fullscreen';overlay.dataset.state='starting';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','ضبط فرمان فارسی');
  overlay.innerHTML=`<div class="voice-stage"><button type="button" class="voice-close" aria-label="بستن ضبط">×</button><h2 class="voice-heading">در حال بازکردن میکروفن…</h2><p class="voice-caption" role="status">اجازهٔ میکروفن را بده و صحبت کن.</p><button type="button" class="voice-main-button" aria-label="توقف ضبط">🎙</button><span class="voice-clock">۰۰:۰۰</span><p class="voice-stop-hint">برای پایان، همین دکمه بزرگ را بزن</p><div class="voice-live-text" aria-live="polite" aria-atomic="true">صحبت کن؛ متن گفتارت اینجا نمایش داده می‌شود.</div><button type="button" class="btn voice-retry" hidden>تلاش دوباره برای تبدیل صدا</button></div>`;
  const s={input,overlay,base:input.value.trim(),text:'',mode:Recognition?'browser':'server',recording:true,committed:'',results:new Map(),chunks:[],parts:new Map(),part:0,pending:0,failed:[],queue:Promise.resolve(),oldOverflow:document.body.style.overflow,previousFocus:document.activeElement};session=s;input.readOnly=true;document.body.append(overlay);document.body.style.overflow='hidden';
  overlay.querySelector('.voice-main-button').onclick=()=>stop(s);
  overlay.querySelector('.voice-close').onclick=()=>{if(s.recording){stop(s);return}if((s.pending||s.failed.length||s.text)&&!confirm('بدون انتقال متن، صفحهٔ ضبط بسته شود؟'))return;dismiss(s)};
  overlay.querySelector('.voice-retry').onclick=()=>{if(s.pending)return;const failed=s.failed.splice(0);overlay.querySelector('.voice-retry').hidden=true;status(s,'در حال تبدیل دوبارهٔ صدای حفظ‌شده…');failed.forEach(x=>queue(s,x.blob,x.part))};
  overlay.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();overlay.querySelector('.voice-close').click()}if(e.key==='Tab'){const buttons=[...overlay.querySelectorAll('button:not([disabled]):not([hidden])')],i=buttons.indexOf(document.activeElement);e.preventDefault();buttons[(i+(e.shiftKey?buttons.length-1:1))%buttons.length]?.focus()}};
  overlay.querySelector('.voice-main-button').focus();
  try{
   const Engine=window.AudioContext||window.webkitAudioContext;
   if(Engine&&navigator.mediaDevices?.getUserMedia){const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});if(!active(s)||!s.recording){stream.getTracks().forEach(t=>t.stop());return}s.stream=stream;s.context=new Engine();if(s.context.state==='suspended')await s.context.resume();if(!active(s)||!s.recording){release(s);return}s.rate=s.context.sampleRate;s.source=s.context.createMediaStreamSource(stream);s.processor=s.context.createScriptProcessor(4096,1,1);s.processor.onaudioprocess=e=>{e.outputBuffer.getChannelData(0).fill(0);if(s.recording)s.chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)))};s.source.connect(s.processor);s.processor.connect(s.context.destination)}else if(!Recognition)throw new Error('microphone_unavailable');
   if(!active(s)||!s.recording)return;overlay.dataset.state='recording';overlay.querySelector('.voice-heading').textContent='در حال ضبط صدا';const started=Date.now();s.clock=setInterval(()=>{const seconds=Math.floor((Date.now()-started)/1000);overlay.querySelector('.voice-clock').textContent=fa(`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`)},1000);s.limit=setTimeout(()=>stop(s),90000);
   if(Recognition)recognize(s);else{status(s,'در حال ضبط؛ متن هر چند ثانیه زیر دکمه آماده می‌شود.');s.flushTimer=setInterval(()=>flush(s),5000)}
  }catch(error){if(active(s)){s.error=true;status(s,error?.name==='NotAllowedError'?'اجازهٔ میکروفن داده نشد؛ دسترسی میکروفن را فعال کن.':'میکروفن باز نشد؛ این صفحه را مستقیم در Safari باز کن.');stop(s)}}
 };
 const parseBase=parseQuick;parseQuick=function(...args){if(session)return status(session,'ابتدا ضبط را متوقف کن و متن را بررسی کن.');return parseBase(...args)};
 const confirmBase=confirmSmartPlan;confirmSmartPlan=function(...args){if(session)return toast('ابتدا ضبط را تمام کن و متن را بررسی کن');return confirmBase(...args)};
 new MutationObserver(()=>{fields();if(session&&!session.input.isConnected)dismiss(session)}).observe(document.getElementById('app'),{childList:true,subtree:true});
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&session?.recording)stop()});window.addEventListener('pagehide',()=>{if(session)dismiss(session)});
 fields();render();
})();
