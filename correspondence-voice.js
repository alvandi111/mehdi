/* Dedicated correspondence recording: never enters the payment command router. */
(function(){
'use strict';
let session=null;
const status=(s,text)=>{if(session===s&&s.node.isConnected)s.node.querySelector('[role=status]').textContent=text};
function release(s){clearTimeout(s.timer);s.stream?.getTracks().forEach(t=>t.stop());s.stream=null}
window.closeCorrespondenceRecorder=function(){const s=session;if(!s)return;session=null;s.abort?.abort();if(s.recorder?.state==='recording')s.recorder.stop();release(s);if(s.url)URL.revokeObjectURL(s.url);s.node.remove()};
window.openCorrespondenceRecorder=function(){
 const input=document.getElementById('secRaw');if(!input)return;closeCorrespondenceRecorder();
 const node=document.createElement('div');node.className='modal';node.id='secVoice';
 node.innerHTML='<div class="dialog sec-dialog"><div class="dialog-head"><h2>ضبط اختصاصی دبیرخانه</h2><button class="close" onclick="closeCorrespondenceRecorder()">×</button></div><p>مخاطب، موضوع و خواسته‌ات را بگو. برای پیش‌فاکتور، جنس، مقدار، قیمت و شرایط پرداخت را هم بگو.</p><button class="btn primary" id="secRecord" style="width:100%;min-height:100px;font-size:22px" onclick="toggleCorrespondenceRecording()">🎙 شروع ضبط</button><p role="status">پس از توقف، صدا به متن تبدیل می‌شود؛ سپس تنظیم حرفه‌ای را بزن.</p><audio controls style="width:100%" hidden></audio><button class="btn" id="secRetry" disabled onclick="transcribeCorrespondenceAudio()">تبدیل دوباره صدا</button><label style="display:block;margin:16px 0">متن گفتار؛ قابل ویرایش<textarea id="secVoiceText" rows="6" style="display:block;box-sizing:border-box;width:100%;margin-top:8px;padding:12px;border:1px solid #d8d5cc;border-radius:14px;font:inherit;line-height:1.9"></textarea></label><div class="sec-actions"><button class="btn" onclick="useCorrespondenceVoice(false)">انتقال متن به فرم</button><button class="btn primary" onclick="useCorrespondenceVoice(true)">✦ تنظیم حرفه‌ای نامه / پیش‌فاکتور</button></div><small>تنظیم حرفه‌ای نیازمند فعال‌بودن سرویس نگارش است. ذخیره و نهایی‌کردن سند با تأیید تو انجام می‌شود.</small></div>';
 document.body.append(node);session={node,input,original:input.value,blob:null,busy:false};node.querySelector('textarea').value=input.value;
};
window.toggleCorrespondenceRecording=async function(){
 const s=session;if(!s||s.busy)return;if(s.recorder?.state==='recording'){s.recorder.stop();return}
 if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){status(s,'ضبط در این مرورگر پشتیبانی نمی‌شود؛ از میکروفن صفحه‌کلید در کادر متن استفاده کن.');return}
 s.busy=true;status(s,'در انتظار اجازهٔ میکروفن…');
 try{const stream=await navigator.mediaDevices.getUserMedia({audio:true});if(session!==s){stream.getTracks().forEach(t=>t.stop());return}s.stream=stream;
 const mime=['audio/webm;codecs=opus','audio/mp4','audio/webm'].find(t=>MediaRecorder.isTypeSupported(t));
 s.recorder=new MediaRecorder(stream,mime?{mimeType:mime}:{});const chunks=[];
 s.recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
 s.recorder.onerror=()=>{release(s);s.busy=false;status(s,'ضبط متوقف شد؛ دوباره تلاش کن.');s.node.querySelector('#secRecord').textContent='🎙 شروع ضبط'};
 s.recorder.onstop=()=>{release(s);if(session!==s)return;s.blob=new Blob(chunks,{type:s.recorder.mimeType||mime||'audio/webm'});acceptCorrespondenceAudio(s.blob);if(s.url)URL.revokeObjectURL(s.url);s.url=URL.createObjectURL(s.blob);const audio=s.node.querySelector('audio');audio.src=s.url;audio.hidden=false;s.node.querySelector('#secRecord').textContent='🎙 ضبط مجدد';s.node.querySelector('#secRetry').disabled=false;s.busy=false;transcribeCorrespondenceAudio()};
 s.recorder.start();s.busy=false;s.node.querySelector('#secRecord').textContent='■ پایان ضبط';status(s,'در حال ضبط؛ برای پایان روی دکمه بزن. حداکثر سه دقیقه.');s.timer=setTimeout(()=>{if(s.recorder.state==='recording')s.recorder.stop()},180000);
 }catch(e){release(s);s.busy=false;status(s,e.name==='NotAllowedError'?'اجازهٔ میکروفن داده نشد؛ متن را تایپ کن یا دسترسی میکروفن را فعال کن.':'شروع ضبط ناموفق بود؛ دوباره تلاش کن.')}
};
window.transcribeCorrespondenceAudio=async function(){
 const s=session;if(!s||s.busy||!s.blob||s.recorder?.state==='recording')return;s.busy=true;s.abort=new AbortController();const timer=setTimeout(()=>s.abort.abort(),45000),box=s.node.querySelector('textarea'),before=box.value;
 status(s,'در حال تبدیل صدا به متن… (حداکثر ۴۵ ثانیه)');
 try{const form=new FormData();form.append('file',s.blob,'correspondence.'+voiceFileExtension(s.blob.type));const endpoint=(localStorage.getItem(AI_ENDPOINT_KEY)||DEFAULT_AI_ENDPOINT).replace(/\/$/,'');const response=await fetch(endpoint+'/transcribe',{method:'POST',body:form,signal:s.abort.signal});if(!response.ok)throw Error('service');const data=await response.json();if(session!==s)return;if(!data.text?.trim())throw Error('empty');if(box.value!==before){status(s,'متن را هنگام تبدیل ویرایش کردی؛ نوشته‌ات حفظ شد. برای تبدیل دوباره دکمه را بزن.');return}box.value=data.text.trim();status(s,'متن آماده است؛ بررسی کن و «تنظیم حرفه‌ای» را بزن.');
 }catch(e){status(s,e.name==='AbortError'?'زمان تبدیل تمام شد؛ صدا محفوظ است. دوباره تلاش کن یا متن را وارد کن.':'تبدیل انجام نشد؛ صدا محفوظ است. می‌توانی دوباره تلاش کنی یا متن را بنویسی.')}finally{clearTimeout(timer);s.busy=false}
};
window.useCorrespondenceVoice=function(compose){const s=session;if(!s||s.busy||s.recorder?.state==='recording')return;if(!s.input.isConnected)return closeCorrespondenceRecorder();const text=s.node.querySelector('textarea').value.trim();if(!text)return status(s,'ابتدا متن را بگو یا بنویس.');if(s.input.value!==s.original)return status(s,'متن فرم تغییر کرده؛ متن این پنجره را کپی کن تا نوشتهٔ قبلی جایگزین نشود.');s.input.value=text;s.input.dispatchEvent(new Event('input',{bubbles:true}));if(s.blob)acceptCorrespondenceAudio(s.blob);closeCorrespondenceRecorder();if(compose)composeCorrespondence()};
})();
