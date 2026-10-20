/* A contained preview keeps PWA navigation and unfinished forms intact. */
(function(){
'use strict';
let active=null,sequence=0,loadSequence=0;
function say(s){if(typeof toast==='function')toast(s)}
function named(name,ext){return String(name||'سند').replace(/[\\/:*?"<>|]/g,'-').replace(/\.(html|pdf)$/i,'').slice(0,120)+ext}
function note(s){if(active)active.status.textContent=s}
function cleanup(){
 if(!active)return;
 const s=active;active=null;loadSequence++;
 s.node.remove();if(s.url)URL.revokeObjectURL(s.url);
 document.body.style.overflow=s.overflow;
 if(!s.inert)s.app?.removeAttribute('inert');
 if(s.aria===null)s.app?.removeAttribute('aria-hidden');else s.app?.setAttribute('aria-hidden',s.aria);
 s.focus?.focus?.();
}
function close(){
 if(!active)return;
 const token=active.token;
 cleanup();
 if(history.state?.peymanyarDocument===token)history.back();
}
window.addEventListener('popstate',()=>{if(active&&history.state?.peymanyarDocument!==active.token)cleanup()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&active){e.preventDefault();close()}});
function shell(title){
 if(active){if(active.url)URL.revokeObjectURL(active.url);active.url='';active.frame.remove()}
 else {
 const app=document.getElementById('app'),token='document-'+(++sequence);
 const node=document.createElement('section');node.className='document-preview';node.setAttribute('role','dialog');node.setAttribute('aria-modal','true');node.setAttribute('aria-label','نمایش سند');
 node.innerHTML='<header><button type="button" data-close>× بستن و برگشت</button><strong></strong></header><nav aria-label="عملیات سند"><button type="button" data-save></button><button type="button" data-share></button><button type="button" data-print>چاپ</button></nav><p role="status" aria-live="polite"></p><div class="document-preview-stage"></div>';
 active={node,app,token,overflow:document.body.style.overflow,inert:app?.hasAttribute('inert'),aria:app?.getAttribute('aria-hidden')??null,focus:document.activeElement};
 active.status=node.querySelector('[role="status"]');
 document.body.append(node);document.body.style.overflow='hidden';app?.setAttribute('inert','');app?.setAttribute('aria-hidden','true');
 node.querySelector('[data-close]').onclick=close;
 try{history.pushState({...history.state,peymanyarDocument:token},'')}catch{}
 }
 const s=active;s.node.querySelector('strong').textContent=title||'پیش‌نمایش سند';s.status.textContent='';
 const frame=document.createElement('iframe');frame.title=title||'پیش‌نمایش سند';frame.setAttribute('sandbox','allow-same-origin allow-modals');
 s.node.querySelector('.document-preview-stage').append(frame);s.frame=frame;
 s.node.querySelector('[data-close]').focus();
 return s;
}
function download(blob,name){
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.target='_blank';a.rel='noopener';document.body.append(a);a.click();a.remove();
 // A separate URL remains available while the system saves/shares it.
 setTimeout(()=>URL.revokeObjectURL(url),60000);
 note('ذخیره آغاز شد. در آیفون، «Save to Files / ذخیره در فایل‌ها» را انتخاب کن.');
}
async function share(blob,name,title){
 try{
 const file=new File([blob],name,{type:blob.type||'application/octet-stream'});
 if(navigator.canShare?.({files:[file]})&&navigator.share){await navigator.share({files:[file],title});return}
 download(blob,name);note('اشتراک مستقیم فایل در این مرورگر پشتیبانی نمی‌شود؛ فایل را ذخیره کن و از بخش فایل‌ها ارسال کن.');
 }catch(e){if(e.name!=='AbortError')note('ارسال انجام نشد؛ از دکمهٔ ذخیره استفاده کن.')}
}
function openBlob(blob,name){
 const s=shell(name),pdf=blob.type==='application/pdf'||/\.pdf$/i.test(name||'');s.url=URL.createObjectURL(blob);
 s.frame.src=s.url;
 s.node.querySelector('[data-save]').textContent='ذخیره فایل';
 s.node.querySelector('[data-save]').onclick=()=>download(blob,name||'سند.pdf');
 s.node.querySelector('[data-share]').textContent='اشتراک‌گذاری فایل';
 s.node.querySelector('[data-share]').onclick=()=>share(blob,name||'سند.pdf',name);
 s.node.querySelector('[data-print]').onclick=()=>{try{s.frame.contentWindow.print()}catch{note('برای چاپ، فایل را ذخیره کن و از برنامهٔ فایل‌ها باز کن.')}};
 if(pdf)note('PDF در همین قاب باز می‌شود. برای خروج «بستن و برگشت» را بزن؛ ذخیره و ارسال از نوار بالا در دسترس است.');
}
window.openPrintPreview=function(){
 const s=shell('پیش‌نمایش چاپ و PDF'),w=s.frame.contentWindow;
 const nativePrint=w.print.bind(w);
 // Old reports request automatic printing; the user now controls it from the fixed toolbar.
 w.print=function(){};
 s.node.querySelector('[data-print]').onclick=()=>{try{nativePrint()}catch{note('چاپ در این مرورگر در دسترس نیست.')}};
 s.node.querySelector('[data-save]').textContent='ذخیره PDF / چاپ';
 s.node.querySelector('[data-save]').onclick=()=>{note('در پنجرهٔ چاپ، اشتراک‌گذاری و سپس «ذخیره در فایل‌ها / Save to Files» را انتخاب کن.');try{nativePrint()}catch{note('چاپ در این مرورگر در دسترس نیست.')}};
 s.node.querySelector('[data-share]').textContent='اشتراک متن گزارش';
 s.node.querySelector('[data-share]').onclick=async()=>{
 const text=w.document.body?.innerText||w.document.body?.textContent||'',title=w.document.title||'گزارش';
 try{if(navigator.share){await navigator.share({title,text});return}download(new Blob([text],{type:'text/plain;charset=utf-8'}),named(title,'.txt'));note('متن گزارش ذخیره شد؛ برای PDF از «ذخیره PDF / چاپ» استفاده کن.')}catch(e){if(e.name!=='AbortError')note('ارسال متن انجام نشد؛ برای PDF از ذخیره PDF / چاپ استفاده کن.')}
 };
 // Disable in-document scripts and legacy print buttons; only outer controls are interactive.
 const originalClose=w.document.close.bind(w.document);
 w.document.close=function(){
 originalClose();
 const style=w.document.createElement('style');style.textContent='button,.print-help{display:none!important}html{overflow:auto}body{max-width:none;box-sizing:border-box}';
 w.document.head.append(style);
 s.node.querySelector('strong').textContent=w.document.title||'پیش‌نمایش سند';
 };
 return w;
};
const baseView=window.viewDocument;
window.viewDocument=async function(id){
 const gen=++loadSequence,owner=typeof db!=='undefined'?db:null;
 let f=typeof memoryFiles!=='undefined'?(memoryFiles.get(Number(id))||memoryFiles.get(id)):null;
 if(!f)try{f=await readFile(Number(id))}catch{}
 if(gen!==loadSequence||(typeof db!=='undefined'&&db!==owner))return;
 if(!f?.blob)return baseView(id);
 if(f.type==='application/pdf'||f.blob.type==='application/pdf'||/\.pdf$/i.test(f.name||'')){if(typeof closeViewer==='function')closeViewer();openBlob(f.blob,f.name);return}
 return baseView(id);
};
window.openCorrespondenceAttachment=async function(id){
 const gen=++loadSequence,owner=db;
 let f;try{f=await readFile(id)}catch{}
 if(gen!==loadSequence||db!==owner)return;
 if(!f?.blob)return say('فایل در این مرورگر موجود نیست؛ پشتیبان کامل را بازگردانی کن');
 openBlob(f.blob,f.name||'پیوست');
};
window.PeymanyarDocuments={close,openBlob};
})();