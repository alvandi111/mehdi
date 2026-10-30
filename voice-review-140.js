/* Revision 140: two-stage voice interpretation. No data is saved by this module. */
(function(){
'use strict';
let original=null,approved=false;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function install(){
 if(typeof window.parseQuick!=='function'||!window.PeymanyarCommand?.parse)return false;
 if(window.parseQuick.__review140)return true;
 original=window.parseQuick;
 function analyze(){
  if(approved){approved=false;return original.apply(this,arguments)}
  const input=document.getElementById('quickText'),box=document.getElementById('parsedResult');
  if(!input||!box)return;
  const raw=input.value.trim();if(!raw)return;
  const plan=window.PeymanyarCommand.parse(raw,window.db||db,typeof todayFa==='function'?todayFa():undefined);
  const source=window.db||db,projects=source.projects||[],people=source.people||[];
  const resolver=window.PeymanyarEntityResolver;
  const projectQuery=plan.project||((raw.match(/پروژه\s+([^،.\n]+)/)||[])[1]||'').split(/\s+(?:در|بابت|پرداخت|واریز|کردم)/)[0].trim();
  const personQuery=plan.party||plan.person||'';
  function candidates(query,rows,kind){
   if(!query)return[];
   const r=resolver?.resolve(query,rows,kind);
   return r?.candidates||[];
  }
  const proj=candidates(projectQuery,projects,'project'),persons=candidates(personQuery,people,'person');
  const money=Number(plan.amount)||0;
  const date=plan.date||'';
  box.innerHTML='<section class="parsed" id="voiceReview140" style="border:2px solid #bdcdbb;border-radius:18px;padding:16px;line-height:2">'+
   '<h3>مرحله اول: برداشت از صحبت شما</h3><p>هنوز هیچ اطلاعاتی ثبت نشده است. متن و گزینه‌ها را بررسی و اصلاح کنید.</p>'+
   '<p><strong>نوع درخواست:</strong> '+esc(plan.label||plan.intent||'نامشخص')+'</p>'+
   '<p><strong>مبلغ:</strong> '+esc(money?money.toLocaleString('fa-IR')+' تومان':'نامشخص؛ نیازمند اصلاح')+'</p>'+
   '<p><strong>تاریخ شمسی:</strong> '+esc(date||'نامشخص')+'</p>'+
   '<label style="display:block">پروژه<select id="vr140Project" style="width:100%;padding:12px">'+
   '<option value="">انتخاب پروژه</option>'+projects.map(p=>'<option value="'+esc(p.name)+'" '+(p.name===projectQuery||proj.length===1&&proj[0].name===p.name?'selected':'')+'>'+esc(p.name)+'</option>').join('')+'</select></label>'+
   '<label style="display:block">طرف حساب<select id="vr140Party" style="width:100%;padding:12px"><option value="">نامشخص / شخص جدید</option>'+
   people.map(p=>'<option value="'+esc(p.name)+'" '+(p.name===personQuery?'selected':'')+'>'+esc(p.name)+'</option>').join('')+'</select></label>'+
   '<label style="display:block">متن اصلاح‌شده<textarea id="vr140Text" style="width:100%;min-height:100px">'+esc(raw)+'</textarea></label>'+
   '<p style="font-size:13px">در صورت تشخیص اشتباه اسم، شخص درست را از فهرست انتخاب کنید. انتخاب نام جدید در مرحله بعد بررسی می‌شود.</p>'+
   '<button class="btn primary" id="vr140Accept" type="button">تأیید برداشت و انتقال به فیلدها</button>'+
   '<button class="btn" id="vr140Retry" type="button">تحلیل دوباره متن اصلاح‌شده</button></section>';
  document.getElementById('vr140Retry').onclick=()=>{input.value=document.getElementById('vr140Text').value;analyze()};
  document.getElementById('vr140Accept').onclick=()=>{
   const corrected=document.getElementById('vr140Text').value.trim();
   const p=document.getElementById('vr140Project').value,person=document.getElementById('vr140Party').value;
   if(plan.intent==='transaction_create'&&!money){alert('مبلغ معتبر تشخیص داده نشده؛ ابتدا متن مبلغ را اصلاح و دوباره تحلیل کنید.');return}
   if(plan.intent==='transaction_create'&&!p){alert('پروژه را از فهرست انتخاب کنید.');return}
   let next=corrected;
   if(p&&!next.includes(p))next+=' در پروژه '+p;
   if(person&&!next.includes(person))next+=' به '+person;
   input.value=next;
   approved=true;
   try{analyze()}finally{approved=false}
  };
 }
 analyze.__review140=true;window.parseQuick=analyze;return true;
}
if(!install())document.addEventListener('DOMContentLoaded',install,{once:true});
})();
