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
 s.resize?.disconnect();s.observer?.disconnect();s.saveBox?.remove();s.node.remove();if(s.url)URL.revokeObjectURL(s.url);
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
 if(active){active.resize?.disconnect();active.observer?.disconnect();active.saveBox?.remove();if(active.url)URL.revokeObjectURL(active.url);active.url='';active.paper.remove()}
 else {
 const app=document.getElementById('app'),token='document-'+(++sequence);
 const node=document.createElement('section');node.className='document-preview';node.setAttribute('role','dialog');node.setAttribute('aria-modal','true');node.setAttribute('aria-label','نمایش سند');
 node.innerHTML='<header><button type="button" data-close>× بستن و برگشت</button><strong></strong></header><nav aria-label="عملیات سند"><button type="button" data-save></button><button type="button" data-share></button><button type="button" data-print>چاپ</button></nav><div class="document-preview-zoom" aria-label="بزرگ‌نمایی"><button type="button" data-minus aria-label="کوچک‌نمایی">−</button><output data-scale></output><button type="button" data-plus aria-label="بزرگ‌نمایی">＋</button><button type="button" data-fit>جا شدن در عرض</button></div><p role="status" aria-live="polite"></p><div class="document-preview-stage"></div>';
 active={node,app,token,overflow:document.body.style.overflow,inert:app?.hasAttribute('inert'),aria:app?.getAttribute('aria-hidden')??null,focus:document.activeElement};
 active.status=node.querySelector('[role="status"]');
 document.body.append(node);document.body.style.overflow='hidden';app?.setAttribute('inert','');app?.setAttribute('aria-hidden','true');
 node.querySelector('[data-close]').onclick=close;
 try{history.pushState({...history.state,peymanyarDocument:token},'')}catch{}
 }
 const s=active;s.node.querySelector('strong').textContent=title||'پیش‌نمایش سند';s.status.textContent='';
 const frame=document.createElement('iframe');frame.title=title||'پیش‌نمایش سند';frame.setAttribute('sandbox','allow-same-origin allow-modals');
 const stage=s.node.querySelector('.document-preview-stage'),paper=document.createElement('div');paper.className='document-preview-paper';stage.append(paper);paper.append(frame);s.frame=frame;s.paper=paper;s.stage=stage;s.width=1123;s.height=1588;s.zoom=1;s.fit=true;s.pdf=null;
 s.node.querySelector('[data-minus]').onclick=()=>zoom(s,s.zoom/1.2);
 s.node.querySelector('[data-plus]').onclick=()=>zoom(s,s.zoom*1.2);
 s.node.querySelector('[data-fit]').onclick=()=>{s.fit=true;layout(s)};
 if(typeof ResizeObserver!=='undefined'){s.resize=new ResizeObserver(()=>layout(s));s.resize.observe(stage)}
 layout(s);
 s.node.querySelector('[data-close]').focus();
 return s;
}
function layout(s){
 if(active!==s)return;
 if(s.fit)s.zoom=Math.min(1,Math.max(0.1,((s.stage.clientWidth||360)-16)/s.width));
 s.frame.style.width=s.width+'px';s.frame.style.height=s.height+'px';
 s.frame.style.transform='scale('+s.zoom+')';s.frame.style.transformOrigin='top left';
 s.paper.style.width=Math.ceil(s.width*s.zoom)+'px';s.paper.style.height=Math.ceil(s.height*s.zoom)+'px';
 s.node.querySelector('[data-scale]').textContent=Math.round(s.zoom*100)+'٪';
}
function zoom(s,value){s.fit=false;s.zoom=Math.max(0.1,Math.min(3,value));layout(s)}
function reportDimensions(s){
 if(active!==s)return;
 const d=s.frame.contentDocument||s.frame.contentWindow.document;
 s.width=Math.max(s.landscape?1123:794,d.body.scrollWidth||0);
 s.height=Math.max(400,d.body.scrollHeight||0);
 layout(s);
}
function saveDialog(s,blob,name,intent='save'){
 if(active!==s)return;
 s.saveBox?.remove();
 const box=document.createElement('div');box.className='document-save-dialog';box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');box.setAttribute('aria-label','ذخیره و ارسال فایل');
 box.innerHTML='<div><h2>فایل آماده است</h2><p data-name></p><p>در آیفون، «انتخاب محل ذخیره» را بزن؛ سپس Save to Files را انتخاب کن و پوشه و نام فایل را تعیین کن.</p><button type="button" data-folder>انتخاب محل ذخیره / Files</button><button type="button" data-send>ارسال فایل</button><button type="button" data-download>دانلود فایل</button><button type="button" data-dismiss>بازگشت به سند</button><p role="status" aria-live="polite" data-result></p></div>';
 s.node.append(box);s.saveBox=box;box.querySelector('[data-name]').textContent=name;
 const result=t=>box.querySelector('[data-result]').textContent=t;
 box.querySelector('[data-dismiss]').onclick=()=>{box.remove();s.saveBox=null;s.node.querySelector('[data-save]').focus()};
 box.querySelector('[data-download]').onclick=()=>download(blob,name);
 box.querySelector('[data-send]').onclick=()=>share(blob,name,name);
 box.querySelector('[data-folder]').onclick=async()=>{
 try{
 if(window.showSaveFilePicker){
 const options={suggestedName:name};
 if(/\.pdf$/i.test(name))options.types=[{description:'PDF',accept:{'application/pdf':['.pdf']}}];
 const handle=await window.showSaveFilePicker(options);
 const stream=await handle.createWritable();try{await stream.write(blob);await stream.close()}catch(e){try{await stream.abort()}catch{}throw e}
 result('فایل در محل انتخاب‌شده ذخیره شد.');return;
 }
 const file=new File([blob],name,{type:blob.type||'application/pdf'});
 if(navigator.canShare?.({files:[file]})&&navigator.share){result('در پنجرهٔ سیستم، Save to Files را بزن و پوشه را انتخاب کن.');await navigator.share({files:[file],title:name});return}
 result('انتخاب پوشه در این مرورگر پشتیبانی نمی‌شود. «دانلود فایل» را بزن؛ محل دانلود را مرورگر تعیین می‌کند.');
 }catch(e){if(e.name!=='AbortError')result('ذخیره انجام نشد؛ دوباره تلاش کن یا دانلود فایل را بزن.')}
 };
 box.querySelector(intent==='share'?'[data-send]':'[data-folder]').focus();
}
async function preparePdf(s,intent){
 if(s.busy||active!==s)return;
 s.busy=true;const button=s.node.querySelector('[data-save]');button.disabled=true;
 note('در حال آماده‌سازی فایل PDF…');
 try{
 const d=s.frame.contentWindow.document;
 const blob=s.pdf||(await window.PeymanyarPdfExport(d,s.landscape));
 if(active!==s)return;
 s.pdf=blob;note('PDF آماده است؛ محل ذخیره یا روش ارسال را انتخاب کن.');
 saveDialog(s,blob,named(d.title||'گزارش','.pdf'),intent);
 }catch(e){if(active===s)note(e.message||'ساخت PDF انجام نشد؛ از چاپ استفاده کن.')}
 finally{s.busy=false;button.disabled=false}
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
 s.frame.src=s.url+'#view=FitH';s.width=1123;s.height=1588;layout(s);
 s.node.querySelector('[data-save]').textContent='ذخیره فایل';
 s.node.querySelector('[data-save]').onclick=()=>saveDialog(s,blob,name||'سند.pdf');
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
 s.node.querySelector('[data-save]').textContent='ذخیره PDF';
 s.node.querySelector('[data-save]').onclick=()=>preparePdf(s,'save');
 s.node.querySelector('[data-share]').textContent='ارسال PDF';
 s.node.querySelector('[data-share]').onclick=()=>preparePdf(s,'share');
 // Disable in-document scripts and legacy print buttons; only outer controls are interactive.
 const originalClose=w.document.close.bind(w.document);
 w.document.close=function(){
 originalClose();
 const style=w.document.createElement('style');style.textContent='button,.print-help{display:none!important}html{overflow:hidden!important;-webkit-text-size-adjust:100%;text-size-adjust:100%}body{max-width:none!important;box-sizing:border-box;width:100%!important;margin:0!important;padding:20px!important}table{max-width:100%}td,th{overflow-wrap:anywhere}';
 w.document.head.append(style);
 s.landscape=/@page\s*\{[^}]*landscape/i.test([...w.document.querySelectorAll('style')].map(x=>x.textContent).join('\n'))||!!w.document.querySelector('table');
 const meta=w.document.createElement('meta');meta.name='viewport';meta.content='width=device-width,initial-scale=1';w.document.head.append(meta);
 s.width=s.landscape?1123:794;s.frame.style.width=s.width+'px';
 reportDimensions(s);
 if(typeof MutationObserver!=='undefined'){s.observer=new MutationObserver(()=>{s.pdf=null;reportDimensions(s)});s.observer.observe(w.document.body,{subtree:true,childList:true,characterData:true,attributes:true})}
 w.document.fonts?.ready?.then(()=>reportDimensions(s));
 w.document.querySelectorAll('img').forEach(img=>img.addEventListener('load',()=>reportDimensions(s)));
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