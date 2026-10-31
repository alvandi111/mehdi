/* Contextual interpretation before financial fields. No writes, no transcription replacement. */
(function(){
'use strict';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const original=window.parseQuick,change=window.changeCommandIntent;
let sequence=0,controller=null,pending=null;
const source=()=>typeof db!=='undefined'?db:window.db;
const id=x=>String(x);
const norm=s=>PeymanyarCommand.clean(s).replace(/آ/g,'ا');
function words(n){
 if(!Number.isSafeInteger(n)||n<0)return '';
 if(!n)return 'صفر';
 const small=['','یک','دو','سه','چهار','پنج','شش','هفت','هشت','نه','ده','یازده','دوازده','سیزده','چهارده','پانزده','شانزده','هفده','هجده','نوزده'];
 const tens=['','','بیست','سی','چهل','پنجاه','شصت','هفتاد','هشتاد','نود'],hundreds=['','صد','دویست','سیصد','چهارصد','پانصد','ششصد','هفتصد','هشتصد','نهصد'];
 const chunk=n=>[hundreds[Math.floor(n/100)],n%100<20?small[n%100]:[tens[Math.floor(n%100/10)],small[n%10]].filter(Boolean).join(' و ')].filter(Boolean).join(' و ');
 const units=['','هزار','میلیون','میلیارد','تریلیون','کوادریلیون'],parts=[];let i=0;
 while(n){const v=n%1000;if(v)parts.unshift(chunk(v)+(units[i]?' '+units[i]:''));n=Math.floor(n/1000);i++}return parts.join(' و ');
}
function context(data){
 const projects=(data.projects||[]).map(p=>({id:id(p.id),name:p.name,aliases:p.aliases||[]}));
 const people=(data.people||[]).map(p=>({id:id(p.id),name:p.name,aliases:p.aliases||[],role:p.role||'',projects:[...new Set([p.project,...(p.projects||[]),(data.projects||[]).find(x=>id(x.id)===id(p.projectId))?.name,...(data.transactions||[]).filter(t=>id(t.personId??t.contractorId)===id(p.id)).map(t=>t.project)].filter(Boolean))]}));
 return {projects,people}; // No balances, transactions, phone numbers or email addresses leave the client.
}
function approved(input){const a=window.PeymanyarApprovedInterpretation;return a&&a.input===input&&a.raw===input.value?a.plan:null}
window.PeymanyarVoiceInterpretation={words,context,approved};
window.parseQuick=async function(forced){
 const input=document.getElementById('quickText'),box=document.getElementById('parsedResult');
 if(!input||!box||document.getElementById('bulkCashModal')||document.querySelector('.voice-fullscreen'))return original();
 const raw=input.value.trim();if(!raw)return;
 const local=PeymanyarCommand.parse(raw,source(),typeof todayFa==='function'?todayFa():undefined,{intent:forced});
 if(local.intent!=='transaction_create'&&forced!=='transaction_create')return original();
 if(pending?.input===input&&pending.raw===raw)return;
 controller?.abort();controller=new AbortController();const requestController=controller,ticket=++sequence;pending={input,raw,ticket};
 window.PeymanyarApprovedInterpretation=null;window.v21Plan=null;window.parsedCommand=null;
 let catalog;
 box.innerHTML='<section class="parsed" aria-live="polite"><h3>برداشت از صحبت شما</h3><p role="status">در حال تحلیل مبلغ و تطبیق نام‌ها با پروژه‌ها و افراد شما…</p></section>';
 const fresh=()=>ticket===sequence&&input.isConnected&&input.value.trim()===raw&&document.getElementById('parsedResult')===box;
 let timer;
 const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>{requestController.abort();const error=new Error('analysis_timeout');error.name='AbortError';reject(error)},50000)});
 try{
  catalog=context(source());
  const endpoint=(localStorage.getItem(AI_ENDPOINT_KEY)||DEFAULT_AI_ENDPOINT).replace(/\/$/,'');
  const {response,result}=await Promise.race([timeout,(async()=>{const response=await fetch(endpoint+'/interpret',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:raw,...catalog}),signal:requestController.signal});const result=await response.json().catch(()=>({error:'invalid_server_response'}));return {response,result}})()]);if(!fresh())return;
  if(!response.ok){const code=String(result.error||'request_failed').replace(/[^a-zA-Z0-9_]/g,'').slice(0,80);throw Error((result.detail||'سرویس تحلیل پاسخ موفق نداد؛ متن شما محفوظ است.')+' ['+response.status+' / '+code+(result.upstream_status?' / '+result.upstream_status:'')+']')}
  if(!result||typeof result!=='object')throw Error('پاسخ تحلیل معتبر نیست.');
  if(result.intent!=='transaction_create')throw Error('از این متن پرداخت یا دریافت مشخصی تشخیص داده نشد؛ متن را کامل‌تر کن.');
  const entity=(r,rows)=>{if(!r||typeof r!=='object')throw Error('پاسخ تحلیل کامل نیست.');const selected=rows.find(x=>id(x.id)===id(r.id));if(r.id!=null&&!selected)throw Error('نام پیشنهادی در اطلاعات این حساب پیدا نشد.');return {...r,selected,candidates:(r.candidates||[]).map(i=>rows.find(x=>id(x.id)===id(i))).filter(Boolean),newAccepted:false}};
  const p=entity(result.project,catalog.projects),person=entity(result.person,catalog.people);
  const questions=(Array.isArray(result.questions)?result.questions:[]).filter(x=>typeof x==='string');
  let amount=Number.isSafeInteger(result.amount_toman)&&result.amount_toman>0?result.amount_toman:null;
  // The cited amount must exist verbatim; independent arithmetic must agree when it can parse it.
  if(!result.amount_quote||!norm(raw).includes(norm(result.amount_quote)))amount=null;
  const quoteAmount=PeymanyarCommand.amountOf(result.amount_quote||'');
  if(amount&&quoteAmount&&amount!==quoteAmount){questions.push('برداشت مبلغ با محاسبهٔ عبارت گفته‌شده متفاوت است؛ مبلغ را دقیق‌تر بنویس.');amount=null}
  if(amount&&local.amount&&local.amount!==amount){questions.push('در متن بیش از یک برداشت از مبلغ وجود دارد؛ مبلغ دقیق را مشخص کن.');amount=null}
  function render(){
   if(!fresh())return;
   const chosen=x=>x.selected?.name||(x.newAccepted?x.new_name:'');
   const line=amount?`${amount.toLocaleString('fa-IR')} تومان، معادل ${words(amount)} تومان`:'مبلغ هنوز مشخص نیست';
   const direction=result.kind==='expense'?'پرداخت به':result.kind==='income'?'دریافت از':'جهت پرداخت یا دریافت نامشخص است؛ طرف حساب';
   function choice(x,key,label){if(x.selected)return `<p>${esc(x.reason||'')}</p>`;return `<div><p>${label} ${x.candidates.length?'کدام است؟':'در اطلاعات موجود مشخص نشد.'}</p>`+x.candidates.map(r=>`<button type="button" class="btn" data-choice="${key}" data-id="${esc(r.id)}">${esc(r.name)}${r.role?' — '+esc(r.role):''}</button>`).join('')+(x.new_name?`<button type="button" class="btn" data-new="${key}">${x.newAccepted?'✓ ':''}معرفی ${esc(x.new_name)} به‌عنوان مورد جدید در مرحله بعد</button>`:'')+'</div>'}
   const ok=amount&&['expense','income'].includes(result.kind)&&chosen(p)&&chosen(person)&&!questions.length;
   box.innerHTML=`<section class="parsed" id="voiceInterpretationReview" style="line-height:2"><h3>برداشت من از صحبت شما</h3><p style="font-size:1.15em"><strong>${esc(line)}</strong>؛ ${esc(direction)} ${esc(chosen(person)||'شخص نامشخص')} بابت ${esc(result.category||'شرح نامشخص')} در پروژهٔ ${esc(chosen(p)||'نامشخص')}.</p><p>${local.dateSource==='default'?'تاریخ گفته نشده؛ امروز در نظر گرفته شده: ':'تاریخ: '}${esc(local.date)}</p>${choice(p,'project','پروژه')}${choice(person,'person','طرف حساب')}${questions.map(q=>`<p role="alert">${esc(q)}</p>`).join('')}${!amount?'<p>مبلغ را در متن با واحد تومان یا ریال کامل کن.</p>':''}<details><summary>متن اصلی و اصلاح برداشت</summary><textarea id="voiceInterpretationText" style="width:100%;min-height:120px">${esc(raw)}</textarea><button class="btn" id="voiceInterpretationRetry">تحلیل متن اصلاح‌شده</button></details><p>هنوز هیچ اطلاعاتی ثبت نشده است.</p><button type="button" class="btn primary" id="voiceInterpretationAccept" ${ok?'':'disabled'}>درست است؛ انتقال به فرم</button></section>`;
   box.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>{const target=b.dataset.choice==='project'?p:person;target.selected=target.candidates.find(x=>id(x.id)===b.dataset.id);render()});
   box.querySelectorAll('[data-new]').forEach(b=>b.onclick=()=>{(b.dataset.new==='project'?p:person).newAccepted=true;render()});
   document.getElementById('voiceInterpretationText').oninput=()=>{document.getElementById('voiceInterpretationAccept').disabled=true};
   document.getElementById('voiceInterpretationRetry').onclick=()=>{input._originalVoiceText??=raw;input.value=document.getElementById('voiceInterpretationText').value;window.parseQuick(forced)};
   document.getElementById('voiceInterpretationAccept').onclick=()=>{
    if(!fresh()||!ok||document.getElementById('voiceInterpretationText').value!==raw)return;
    const now=source();for(const [x,rows] of [[p,now.projects],[person,now.people]])if(x.selected&&!rows.some(r=>id(r.id)===id(x.selected.id)&&r.name===x.selected.name)){++sequence;box.textContent='اطلاعات در این فاصله تغییر کرده؛ دوباره تحلیل کن.';return}
    const plan={...local,intent:'transaction_create',amount,project:chosen(p),party:chosen(person),kind:result.kind,category:result.category||local.category,note:raw};
    window.PeymanyarApprovedInterpretation={input,raw:input.value,plan};
    if(change)change('transaction_create');else original();
    const current=window.v21Plan;if(current?.quickPayment){Object.assign(current,{pickProjectId:p.selected?.id??null,pickPersonId:person.selected?.id??null,pickManual:true,roleOnly:false});for(const [field,value]of Object.entries({spProject:plan.project,spParty:plan.party,spAmount:amount,spKind:plan.kind,spCategory:plan.category}))if(document.getElementById(field))document.getElementById(field).value=value}
   };
  }
  render();
  if(typeof setVoiceState==='function')setVoiceState('تحلیل آماده است؛ برداشت را پایین بررسی کن.');
  box.scrollIntoView?.({block:'nearest',behavior:'smooth'});
 }catch(error){if(!fresh())return;if(typeof setVoiceState==='function')setVoiceState('تحلیل انجام نشد؛ دلیل خطا و گزینه تلاش دوباره پایین نمایش داده شده است.');box.innerHTML=`<section class="parsed"><p role="alert">${esc(error.name==='AbortError'?'پاسخ تحلیل دیر رسید؛ متن و صوت محفوظ است.':error.message)}</p><button type="button" class="btn" id="interpretRetry">تلاش دوباره</button><button type="button" class="btn" id="interpretManual">تکمیل دستی فرم</button></section>`;document.getElementById('interpretRetry').onclick=()=>window.parseQuick(forced);document.getElementById('interpretManual').onclick=()=>{if(fresh())original()}}
 finally{clearTimeout(timer);if(pending?.ticket===ticket)pending=null}
};
document.addEventListener('input',e=>{if(e.target.id==='quickText'){++sequence;controller?.abort();window.PeymanyarApprovedInterpretation=null;const box=document.getElementById('parsedResult');if(box)box.textContent='متن تغییر کرد؛ تحلیل و ادامه را بزن.'}});
window.changeCommandIntent=function(kind){if(kind==='transaction_create')return window.parseQuick(kind);window.PeymanyarApprovedInterpretation=null;return change?.(kind)};
})();
