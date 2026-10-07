// Correct the account of an existing cheque; never create a payment or person.
(function(){
 'use strict';
 const eq=(a,b)=>a!=null&&b!=null&&String(a)===String(b);
 let reviewed=null;
 const cheques=()=>db.transactions.filter(t=>t.kind==='expense'&&t.paymentMethod==='cheque');
 const options=(rows,id,empty)=>`<option value="">${empty}</option>`+rows.map(r=>`<option value="${esc(String(r.id))}" ${eq(r.id,id)?'selected':''}>${esc(r.name)}</option>`).join('');
 function projectFor(row){
  const linked=db.projects.find(p=>eq(p.id,row?.projectId));if(linked)return linked;
  const key=s=>PeymanyarCommand.clean(s).replace(/آ/g,'ا');
  const matches=db.projects.filter(p=>[p.name,...(p.aliases||[])].some(name=>key(name)===key(row?.project||'')));
  return matches.length===1?matches[0]:null;
 }
 window.openChequeAccountRepair=function(id='',personId='',project=''){
  document.getElementById('chequeAccountRepair')?.remove();reviewed=null;
  const rows=cheques(),row=rows.find(t=>eq(t.id,id));
  const person=db.people.find(p=>eq(p.id,personId))||db.people.find(p=>eq(p.id,row?.personId??row?.contractorId));
  const selectedProject=projectFor(project?{project}:row);
  document.body.insertAdjacentHTML('beforeend',`<div class="modal" id="chequeAccountRepair"><div class="dialog statement-dialog" role="dialog" aria-modal="true" aria-label="اتصال چک قبلی به حساب"><div class="dialog-head"><h2>اتصال چک قبلی به حساب</h2><button class="close" onclick="document.getElementById('chequeAccountRepair').remove()">×</button></div><p>چک ثبت‌شده را انتخاب کن. فقط ارتباط آن اصلاح می‌شود؛ مبلغ و وضعیت چک حفظ می‌شود.</p><div class="form-grid">${field('چک ثبت‌شده',`<select id="crCheque" onchange="reviewChequeAccountRepair()"><option value="">چک را انتخاب کن</option>${rows.map(t=>`<option value="${esc(String(t.id))}" ${eq(t.id,id)?'selected':''}>${esc([t.chequeNumber||'بدون شماره',t.chequeBank,t.party,t.project,t.date,money(t.chequeFaceAmount??t.amount)].filter(Boolean).join(' — '))}</option>`).join('')}</select>`)}${field('حساب پیمانکار موجود',`<select id="crPerson">${options(db.people,person?.id,'حساب را انتخاب کن')}</select>`)}${field('پروژه موجود',`<select id="crProject">${options(db.projects,selectedProject?.id,'پروژه را انتخاب کن')}</select>`)}</div><div id="crDetails"></div><button class="btn primary" onclick="saveChequeAccountRepair()">اتصال همین چک به حساب</button></div></div>`);
  reviewChequeAccountRepair();
 };
 window.reviewChequeAccountRepair=function(){
  const row=cheques().find(t=>eq(t.id,v('crCheque')));reviewed=row?JSON.stringify(row):null;
  const box=document.getElementById('crDetails');if(box)box.textContent=row?`چک ${row.chequeNumber||''}؛ طرف حساب فعلی: ${row.party||'نامشخص'}؛ پروژه فعلی: ${row.project||'نامشخص'}؛ وضعیت: ${{delivered:'تحویل‌شده',cleared:'وصول‌شده',cancelled:'لغوشده'}[row.chequeStatus]||'ثبت‌شده'}`:'هنوز چکی انتخاب نشده است.';
 };
 window.saveChequeAccountRepair=function(){
  const row=cheques().find(t=>eq(t.id,v('crCheque'))),person=db.people.find(p=>eq(p.id,v('crPerson'))),project=db.projects.find(p=>eq(p.id,v('crProject')));
  if(!row||!person||!project)return toast('چک، حساب پیمانکار و پروژه موجود را انتخاب کن');
  if(JSON.stringify(row)!==reviewed){reviewChequeAccountRepair();return toast('اطلاعات چک تغییر کرده است؛ دوباره بررسی کن')}
  if(!confirm(`همین چک ${row.chequeNumber||''} به حساب ${person.name} در پروژه ${project.name} وصل شود؟ مبلغ و وضعیت چک تغییر نمی‌کند.`))return;
  // Re-check after confirmation: sync may have updated an entity or the cheque.
  if(!db.transactions.includes(row)||!db.people.includes(person)||!db.projects.includes(project)||JSON.stringify(row)!==reviewed)return toast('اطلاعات تغییر کرده است؛ پنجره را دوباره باز کن');
  const before=db,draft=JSON.parse(JSON.stringify(db)),target=draft.transactions.find(t=>eq(t.id,row.id));
  Object.assign(target,{personId:person.id,contractorId:person.id,party:person.name,projectId:project.id,project:project.name});
  try{db=draft;save()}catch{db=before;return toast('اتصال ذخیره نشد؛ چک قبلی حفظ شد')}
  document.getElementById('chequeAccountRepair').remove();reviewed=null;render();toast('همان چک به حساب پیمانکار وصل شد؛ مبلغ دوباره ثبت نشد');
 };
 const baseTable=transactionReportTable;transactionReportTable=function(rows){
  const holder=document.createElement('div');holder.innerHTML=baseTable(rows);
  holder.querySelectorAll('tbody tr').forEach((tr,i)=>{const row=rows[i];if(row?.kind==='expense'&&row.paymentMethod==='cheque')tr.querySelector('.ledger-row-menu div')?.insertAdjacentHTML('beforeend',`<button onclick="openChequeAccountRepair(${esc(JSON.stringify(row.id))})">اصلاح حساب این چک</button>`)});return holder.innerHTML;
 };
 const basePerson=personDetail;personDetail=function(){
  const html=basePerson(),person=db.people.find(p=>eq(p.id,selectedPersonId));if(!person)return html;
  const holder=document.createElement('div');holder.innerHTML=html;
  holder.querySelector('.statement-actions')?.insertAdjacentHTML('beforeend',`<button class="btn" onclick="openChequeAccountRepair('',${esc(JSON.stringify(person.id))})">اتصال چک قبلی به این حساب</button>`);return holder.innerHTML;
 };
 const baseFinance=finance;finance=function(){const holder=document.createElement('div');holder.innerHTML=baseFinance();holder.querySelector('.ledger-heading')?.insertAdjacentHTML('beforeend','<button class="btn" onclick="openChequeAccountRepair()">اصلاح حساب چک قبلی</button>');return holder.innerHTML};
})();
