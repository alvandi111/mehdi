(function () {
 'use strict';
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
 function display(s){if(!active(s))return;s.text=(s.verified?s.finalText:s.mode==='server'?[...s.parts].sort((a,b)=>a[0]-b[0]).map(x=>x[1]).join(' '):[s.committed,...s.results.values()].filter(Boolean).join(' ')).trim();s.overlay.querySelector('.voice-live-text').textContent=s.text||'صحبت کن؛ متن گفتارت اینجا نمایش داده می‌شود.'}
 function release(s){if(s.released)return;s.released=true;clearInterval(s.clock);clearInterval(s.flushTimer);clearTimeout(s.limit);clearTimeout(s.startTimer);if(s.processor)s.processor.onaudioprocess=null;try{s.source?.disconnect();s.processor?.disconnect()}catch{}s.stream?.getTracks().forEach(t=>t.stop());if(s.context?.state!=='closed')s.context?.close().catch(()=>{})}
 function dismiss(s){release(s);clearTimeout(s.endTimer);try{s.recognition?.abort()}catch{}s.input.readOnly=false;s.overlay.remove();document.body.style.overflow=s.oldOverflow;if(session===s)session=null;if(s.previousFocus?.isConnected)s.previousFocus.focus()}
 function settled(s){
  if(!active(s)||s.recording||s.finalPending||!s.finalRequested)return;
  s.overlay.querySelector('.voice-retry').hidden=!s.failed.length;
  if(s.failed.length){status(s,'ضبط متوقف شد؛ بخشی از صدا تبدیل نشد. صدا حفظ شده؛ دوباره تلاش کن.');return}
  display(s);if(!s.text){if(!s.error)status(s,'متنی دریافت نشد؛ صفحه را ببند و دوباره ضبط کن.');return}
  s.input.value=[s.base,s.text].filter(Boolean).join(' ');dismiss(s);setVoiceState('ضبط پایان یافت؛ متن را بررسی کن و «تحلیل و ادامه» را بزن.');s.input.focus();window.PeymanyarVoiceNames?.review(s.input,typeof db==='undefined'?{}:db);
  // No input event or automatic analysis: the user reviews first.
 }
 function queue(s,blob,final=false){
  if(final){s.finalPending=true;s.finalRequested=true;s.failed=[]}else s.previewPending=true;
  s.pending++;
  Promise.resolve().then(async()=>{
   try{if(!active(s))return;const text=await transcribeBulkPart(blob);if(!String(text||'').trim())throw new Error('متنی در صدا تشخیص داده نشد');if(!active(s))return;
    if(final){s.finalText=text;s.verified=true;display(s)}else if(s.recording){s.parts.clear();s.parts.set(1,text);display(s)}
   }catch(error){if(active(s)){if(final){s.failed=[{blob}];status(s,`تبدیل صدای کامل انجام نشد؛ صدا حفظ شده است. ${voiceServiceError(error)}`)}else if(s.recording)status(s,'ضبط ادامه دارد؛ متن نهایی پس از پایان آماده می‌شود.')}
   }finally{s.pending--;if(final){s.finalPending=false;settled(s)}else s.previewPending=false}
  });
 }
 function wav(s){const samples=mergePcmChunks(s.chunks);if(!s.rate||samples.length<s.rate*.3)return null;let peak=0;for(let i=0;i<samples.length;i+=80)peak=Math.max(peak,Math.abs(samples[i]));if(peak<.00015)return null;return pcmToWav(downsamplePcm(samples,s.rate),16000)}
 function flush(s){if(!s.recording||s.previewPending)return;const blob=wav(s);if(blob)queue(s,blob)}
 function stop(s=session){
  if(!s||!active(s)||!s.recording)return;s.recording=false;s.overlay.dataset.state='stopped';const b=s.overlay.querySelector('.voice-main-button');b.disabled=true;b.textContent='■';b.setAttribute('aria-label','ضبط متوقف شد');s.overlay.querySelector('.voice-heading').textContent='ضبط متوقف شد';
  release(s);try{s.recognition?.abort()}catch{}
  if(s.error)return;
  const blob=wav(s);if(!blob){s.error=true;status(s,'صدای قابل تبدیل دریافت نشد؛ دوباره ضبط کن و دسترسی میکروفن را بررسی کن.');return}
  status(s,'میکروفن خاموش شد؛ در حال تبدیل کل جمله به متن فارسی…');queue(s,blob,true);
 }
 startVoice=async function(){
  fields();if(session){stop();return}if(aiVoiceSending||pcmVoiceRecording||dailyVoiceSession?.recording||bulkVoiceSession?.recording)return toast('ابتدا ضبط یا تبدیل قبلی را تمام کن');
  const input=document.getElementById('quickText');if(!input)return;clearTimeout(window.commandAnalysisTimer);
  const overlay=document.createElement('div');overlay.className='voice-fullscreen';overlay.dataset.state='starting';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','ضبط فرمان فارسی');
  overlay.innerHTML=`<div class="voice-stage"><button type="button" class="voice-close" aria-label="بستن ضبط">×</button><h2 class="voice-heading">در حال بازکردن میکروفن…</h2><p class="voice-caption" role="status">اجازهٔ میکروفن را بده و صحبت کن.</p><button type="button" class="voice-main-button" aria-label="توقف ضبط">🎙</button><span class="voice-clock">۰۰:۰۰</span><p class="voice-stop-hint">برای پایان، همین دکمه بزرگ را بزن</p><div class="voice-live-text" aria-live="polite" aria-atomic="true">صحبت کن؛ متن گفتارت اینجا نمایش داده می‌شود.</div><button type="button" class="btn voice-retry" hidden>تلاش دوباره برای تبدیل صدا</button></div>`;
  const s={input,overlay,base:input.value.trim(),text:'',mode:'server',recording:true,committed:'',results:new Map(),chunks:[],parts:new Map(),part:0,pending:0,failed:[],queue:Promise.resolve(),oldOverflow:document.body.style.overflow,previousFocus:document.activeElement};session=s;input.readOnly=true;document.body.append(overlay);document.body.style.overflow='hidden';
  overlay.querySelector('.voice-main-button').onclick=()=>stop(s);
  overlay.querySelector('.voice-close').onclick=()=>{if(s.recording){stop(s);return}if((s.pending||s.failed.length||s.text)&&!confirm('بدون انتقال متن، صفحهٔ ضبط بسته شود؟'))return;dismiss(s)};
  overlay.querySelector('.voice-retry').onclick=()=>{if(s.pending)return;const failed=s.failed.splice(0);overlay.querySelector('.voice-retry').hidden=true;status(s,'در حال تبدیل دوبارهٔ صدای حفظ‌شده…');failed.forEach(x=>queue(s,x.blob,true))};
  overlay.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();overlay.querySelector('.voice-close').click()}if(e.key==='Tab'){const buttons=[...overlay.querySelectorAll('button:not([disabled]):not([hidden])')],i=buttons.indexOf(document.activeElement);e.preventDefault();buttons[(i+(e.shiftKey?buttons.length-1:1))%buttons.length]?.focus()}};
  overlay.querySelector('.voice-main-button').focus();
  try{
   const Engine=window.AudioContext||window.webkitAudioContext;
   if(Engine&&navigator.mediaDevices?.getUserMedia){const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});if(!active(s)||!s.recording){stream.getTracks().forEach(t=>t.stop());return}s.stream=stream;s.context=new Engine();if(s.context.state==='suspended')await s.context.resume();if(!active(s)||!s.recording){release(s);return}s.rate=s.context.sampleRate;s.source=s.context.createMediaStreamSource(stream);s.processor=s.context.createScriptProcessor(4096,1,1);s.processor.onaudioprocess=e=>{e.outputBuffer.getChannelData(0).fill(0);if(s.recording)s.chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)))};s.source.connect(s.processor);s.processor.connect(s.context.destination)}else throw new Error('microphone_unavailable');
   if(!active(s)||!s.recording)return;overlay.dataset.state='recording';overlay.querySelector('.voice-heading').textContent='در حال ضبط صدا';const started=Date.now();s.clock=setInterval(()=>{const seconds=Math.floor((Date.now()-started)/1000);overlay.querySelector('.voice-clock').textContent=fa(`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`)},1000);s.limit=setTimeout(()=>stop(s),90000);
   {status(s,'در حال ضبط؛ متن اولیه زیر دکمه می‌آید؛ متن نهایی پس از پایان آماده می‌شود.');s.flushTimer=setInterval(()=>flush(s),8000)}
  }catch(error){if(active(s)){s.error=true;status(s,error?.name==='NotAllowedError'?'اجازهٔ میکروفن داده نشد؛ دسترسی میکروفن را فعال کن.':'میکروفن باز نشد؛ این صفحه را مستقیم در Safari باز کن.');stop(s)}}
 };
 const parseBase=parseQuick;parseQuick=function(...args){if(session)return status(session,'ابتدا ضبط را متوقف کن و متن را بررسی کن.');return parseBase(...args)};
 const confirmBase=confirmSmartPlan;confirmSmartPlan=function(...args){if(session)return toast('ابتدا ضبط را تمام کن و متن را بررسی کن');return confirmBase(...args)};
 new MutationObserver(()=>{fields();if(session&&!session.input.isConnected)dismiss(session)}).observe(document.getElementById('app'),{childList:true,subtree:true});
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&session?.recording)stop()});window.addEventListener('pagehide',()=>{if(session)dismiss(session)});
 fields();render();
})();
