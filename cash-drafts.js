/* Durable local cash drafts. No financial posting until the user confirms. */
(function(){
'use strict';
const prefix=STORAGE+':cash-draft:v1:',resumeKey=STORAGE+':cash-draft-resume';
let active=null,suspended=false,skipRestore=false,afterCommit=false,allowUnload=false,lastError='',lastSaved='';
const api=()=>window.PeymanyarBulkEntry,modal=()=>document.getElementById('bulkCashModal');
const owner=()=>{try{return localStorage.getItem(STORAGE+':cloud-owner')||'local'}catch{return 'unavailable'}};
const id=()=>crypto.randomUUID?.()||Date.now()+'-'+Math.random().toString(36).slice(2);
const keyFor=(who,value)=>prefix+encodeURIComponent(who)+':'+value;
function pending(draft){const done=new Set(db.transactions.map(t=>t.entryDraftRowId).filter(Boolean));return{...draft,rows:(draft.rows||[]).filter(r=>!r._draftRowId||!done.has(r._draftRowId))}}
function candidates(){const found=[],who=owner();try{for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(!key?.startsWith(prefix+encodeURIComponent(who)+':'))continue;try{const d=JSON.parse(localStorage.getItem(key));if(d?.version!==1||d.owner!==who||typeof d.id!=='string'||!Array.isArray(d.rows)||typeof d.text!=='string')continue;const filtered=pending(d);if(api().meaningful(filtered))found.push({...filtered,key})}catch{}}}catch{}return found.sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0))}
function choose(){const list=candidates();let preferred='';try{preferred=sessionStorage.getItem(resumeKey)||''}catch{}return list.find(d=>d.key===preferred)||list[0]||null}
function remember(){try{sessionStorage.setItem(resumeKey,active.key)}catch{}}
function stateText(text,error=false){const box=document.getElementById('cashDraftState');if(box){box.textContent=text;box.setAttribute('role',error?'alert':'status');box.classList.toggle('cash-draft-error',error)}}
function bar(){const m=modal();if(!m)return;if(!document.getElementById('cashDraftBar')){const element=document.createElement('section');element.id='cashDraftBar';element.className='cash-draft-bar';element.innerHTML='<strong id="cashDraftState" role="status" aria-live="polite"></strong><div><button type="button" class="btn" onclick="exportCashDraft()">نسخهٔ پیش‌نویس</button><label class="btn">بازگردانی نسخه<input type="file" accept="application/json,.json" hidden onchange="importCashDraft(this)"></label><button type="button" class="btn" onclick="newCashDraft()">پیش‌نویس جدید</button><button type="button" class="btn" onclick="discardCashDraft()">حذف پیش‌نویس</button></div>';m.querySelector('.dialog-head')?.after(element)}}
function archiveOldOwner(){try{const data=api().snapshot();if(api().meaningful(data))localStorage.setItem(active.key,JSON.stringify({...data,version:1,id:active.id,owner:active.owner,mode:modal().classList.contains('bulk-manual-mode')?'manual':'voice',updatedAt:Date.now()}));return true}catch{stateText('پیش‌نویس ذخیره نشد؛ قبل از خروج نسخهٔ پیش‌نویس را بگیر.',true);return false}}
function flush(){
 if(suspended||!modal()||!active||!api())return true;
 bar();if(owner()!==active.owner){if(!archiveOldOwner())return false;lastError='حساب داده‌ها تغییر کرده است؛ برای جلوگیری از ثبت در حساب اشتباه، فرم را دوباره باز کن. پیش‌نویس قبلی محفوظ است.';stateText(lastError,true);return false}
 const snapshot=api().snapshot();
 if(!api().meaningful(snapshot)){try{localStorage.removeItem(active.key);lastSaved='';lastError='';stateText('هنوز ردیفی وارد نشده است؛ ذخیرهٔ خودکار آماده است.');return true}catch{lastError='دسترسی به ذخیرهٔ پیش‌نویس ممکن نیست.';stateText(lastError,true);return false}}
 const data={...snapshot,version:1,id:active.id,owner:active.owner,mode:modal().classList.contains('bulk-manual-mode')?'manual':'voice',updatedAt:Date.now()};
 const signature=JSON.stringify({...data,updatedAt:0});
 if(signature===lastSaved&&!lastError)return true;
 try{localStorage.setItem(active.key,JSON.stringify(data));remember();lastSaved=signature;lastError='';stateText('✓ پیش‌نویس در این دستگاه ذخیره شد • '+new Date().toLocaleTimeString('fa-IR'));return true}
 catch{lastError='پیش‌نویس ذخیره نشد؛ فضای دستگاه یا دسترسی ذخیره را بررسی کن. قبل از خروج «نسخهٔ پیش‌نویس» را بگیر.';stateText(lastError,true);return false}
}
function mode(value){const m=modal();if(!m)return;const manual=value!=='voice';m.classList.toggle('bulk-manual-mode',manual);m.querySelector('.dialog-head h2').textContent=manual?'ادامهٔ تنخواه دستی':'ادامهٔ تنخواه صوتی';const voice=m.querySelector('.bulk-dictation'),text=m.querySelector('#quickText');if(voice)voice.hidden=manual;if(text){text.hidden=manual;const actions=text.nextElementSibling;if(actions?.classList.contains('dialog-actions'))actions.hidden=manual}}
const openBase=openBulkCash;openBulkCash=function(...args){if(modal()&&active&&owner()!==active.owner){if(closeBulkCash()===false)return false}if(modal()&&!flush())return false;const saved=skipRestore?null:choose();skipRestore=false;suspended=true;try{openBase(...args);active=saved?{id:saved.id,key:saved.key,owner:saved.owner}:{id:id(),owner:owner()};active.key=active.key||keyFor(active.owner,active.id);lastSaved='';lastError='';allowUnload=false;afterCommit=false;remember();if(saved){api().restore(saved);active.restoredMode=saved.text.trim()?'voice':saved.mode;mode(active.restoredMode)}}finally{suspended=false}bar();flush();if(saved)stateText('✓ پیش‌نویس قبلی با '+fa(saved.rows.length)+' ردیف بازیابی شد؛ هنوز ثبت مالی نشده است.');return true};
if(typeof openCashMode==='function'){const baseMode=openCashMode;window.openCashMode=function(...args){const result=baseMode(...args);if(active?.restoredMode){mode(active.restoredMode);delete active.restoredMode}flush();return result}}
const closeBase=closeBulkCash;closeBulkCash=function(...args){if(!modal())return closeBase(...args);if(bulkVoiceSession?.recording||bulkVoiceSession?.pending)return closeBase(...args);if(afterCommit){afterCommit=false;return closeBase(...args)}if(active&&owner()!==active.owner){if(!archiveOldOwner())return false;if(!confirm('حساب تغییر کرده؛ پیش‌نویس در حساب قبلی محفوظ می‌ماند. فرم بسته شود؟'))return false;return closeBase(...args)}const has=api()?.meaningful(api().snapshot());if(!flush())return false;if(has&&!confirm('پیش‌نویس در این دستگاه ذخیره شده است. فرم بسته شود؟ برای ادامه، دوباره وارد تنخواه شو.'))return false;return closeBase(...args)};
window.exportCashDraft=function(){if(!api()||!modal())return;const data={format:'peymanyar-cash-draft',version:1,...api().snapshot(),createdAt:new Date().toISOString()};download('peymanyar-cash-draft-'+Date.now()+'.json',JSON.stringify(data,null,2),'application/json')};
window.importCashDraft=async function(input){const file=input.files?.[0];if(!file)return;try{if(file.size>5*1024*1024)throw Error('فایل پیش‌نویس بزرگ است');const data=JSON.parse(await file.text());if(data.format!=='peymanyar-cash-draft'||data.version!==1||!Array.isArray(data.rows)||typeof data.text!=='string'||data.rows.some(r=>!r||typeof r!=='object'||['party','project','date','category','note'].some(k=>typeof r[k]!=='string')||!['expense','income'].includes(r.kind)))throw Error('فایل پیش‌نویس معتبر نیست');if(!flush())return;if(!confirm('این فایل به عنوان پیش‌نویس باز شود؟ هنوز هیچ ثبت مالی انجام نمی‌شود.'))return;skipRestore=true;openBulkCash(data.project||'');suspended=true;try{api().restore(data)}finally{suspended=false}mode(data.text.trim()?'voice':'manual');lastSaved='';flush()}catch(e){toast(e.message||'بازگردانی پیش‌نویس انجام نشد')}finally{input.value=''}};
window.newCashDraft=function(){if(!flush())return false;skipRestore=true;const p=api().snapshot().project;openBulkCash(p);mode('manual')};
window.discardCashDraft=function(){if(!active||!modal()||!confirm('فقط این پیش‌نویسِ ثبت‌نشده حذف شود؟ اطلاعات مالی ثبت‌شده باقی می‌ماند.'))return;try{localStorage.removeItem(active.key)}catch{stateText('حذف پیش‌نویس انجام نشد.',true);return}suspended=true;try{api().restore({rows:[],text:'',project:'',date:''});active={id:id(),owner:owner()};active.key=keyFor(active.owner,active.id);lastSaved='';lastError='';remember()}finally{suspended=false}flush()};
window.PeymanyarCashDraft={
 changed:flush,flush,
 canCommit(){if(!active||owner()!==active.owner){stateText('حساب داده‌ها تغییر کرده؛ ابتدا فرم را دوباره باز کن.',true);return false}return flush()},
 committed(){afterCommit=true;lastSaved='';flush()},
 beforeRefresh(){if(modal()&&active&&owner()!==active.owner){if(!archiveOldOwner())return false}else if(!flush())return false;allowUnload=true;return true},
 list:()=>candidates().map(d=>({id:d.id,rows:d.rows.length,project:d.project,updatedAt:d.updatedAt})),
 stop(){clearInterval(timer)}
};
// Capture even the last character, without waiting for blur/change or a timer.
function inputChanged(e){if(!e.target.closest?.('#bulkCashModal'))return;flush()}
document.addEventListener('input',inputChanged);document.addEventListener('change',inputChanged);
window.addEventListener('pagehide',flush);document.addEventListener('visibilitychange',flush);
window.addEventListener('beforeunload',e=>{const dirty=modal()&&api()?.meaningful(api().snapshot());const saved=flush();if(dirty&&(!allowUnload||!saved)){e.preventDefault();e.returnValue=''}});
// Voice conversion writes its result directly into the textarea.
const voiceStatusBase=typeof bulkVoiceStatus==='function'?bulkVoiceStatus:null;if(voiceStatusBase)bulkVoiceStatus=function(...args){const result=voiceStatusBase(...args);flush();return result};
const timer=setInterval(flush,1000);
function resumeCard(html){const list=candidates();if(!list.length)return html;const holder=document.createElement('div');holder.innerHTML=html;holder.querySelector('main')?.insertAdjacentHTML('afterbegin',`<section class="card cash-draft-resume"><strong>پیش‌نویس تنخواهِ ثبت‌نشده داری</strong><p>${fa(list[0].rows.length)} ردیف${list[0].text.trim()?' و متنِ واردشده':''} در این دستگاه محفوظ است.</p><button class="btn primary" onclick="openBulkCash()">ادامهٔ پیش‌نویس تنخواه</button></section>`);return holder.innerHTML}
const dashBase=dashboard;dashboard=function(){return resumeCard(dashBase())};const financeBase=finance;finance=function(){return resumeCard(financeBase())};
const style=document.createElement('style');style.textContent='.cash-draft-bar{display:flex;gap:8px;align-items:center;justify-content:space-between;flex-wrap:wrap;padding:9px 12px;border:1px solid #b4cbb8;border-radius:12px;background:#eef6ed;margin:7px 0;flex-shrink:0}.cash-draft-bar strong{font-size:13px;line-height:1.7;color:#245739}.cash-draft-bar>div{display:flex;gap:5px;flex-wrap:wrap}.cash-draft-bar .btn{font-size:11px;min-height:34px;padding:5px 8px}.cash-draft-bar .cash-draft-error{color:#a22920}.cash-draft-resume strong{color:#245739}#bulkCashModal.bulk-grid-expanded .dialog>.cash-draft-bar{display:flex!important}@media(max-width:650px){.cash-draft-bar{padding:6px;gap:4px}.cash-draft-bar strong{font-size:12px}.cash-draft-bar .btn{min-height:30px;font-size:10px}}';document.head.append(style);
})();
