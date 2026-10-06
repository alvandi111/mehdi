// Editable financial preview shared by typed and transcribed commands.
(function(){
 const parseBase=parseQuick;
 parseQuick=function(...args){
  if(document.getElementById('bulkCashModal'))return parseBase(...args);
  const input=document.getElementById('quickText'),box=document.getElementById('parsedResult');
  if(!input||!box)return parseBase(...args);
  const command=PeymanyarCommand.parse(input.value.trim(),db,todayFa());
  if(command.intent!=='transaction_create')return parseBase(...args);
  const plan={...v21SmartPlan(input.value.trim()),...command,quickPayment:true};window.v21Plan=plan;window.parsedCommand=command;
  box.innerHTML=`<div class="parsed smart-plan"><div class="command-title"><strong>پیش‌نویس پرداخت / دریافت</strong></div><div class="smart-plan-grid">${field('پروژه',`<input id="spProject" value="${esc(plan.project)}" list="spProjects"><datalist id="spProjects">${v21PlanOptions(db.projects.map(x=>x.name),plan.project)}</datalist>`)}${field('طرف حساب',`<input id="spParty" value="${esc(plan.party)}" list="spPeople"><datalist id="spPeople">${v21PlanOptions(db.people.map(x=>x.name),plan.party)}</datalist>`)}${field('نوع ثبت',`<select id="spKind"><option value="expense" ${plan.kind==='expense'?'selected':''}>پرداخت</option><option value="income" ${plan.kind==='income'?'selected':''}>دریافت</option></select>`)}${field('مبلغ (تومان)',`<input id="spAmount" value="${esc(fa(plan.amount))}" inputmode="decimal" oninput="formatStatementPrice(this)">`)}${field('بابت',`<input id="spCategory" value="${esc(plan.category)}">`)}${field('تاریخ',`<input id="spDate" value="${esc(plan.date)}" data-persian-calendar="1">`)}${field('روش پرداخت',`<select id="spMethod" onchange="document.getElementById('spCheque').hidden=this.value!=='cheque'"><option value="bank" ${plan.paymentMethod==='bank'?'selected':''}>واریز بانکی</option><option value="cash" ${plan.paymentMethod==='cash'?'selected':''}>نقد</option><option value="cheque" ${plan.paymentMethod==='cheque'?'selected':''}>چک تحویلی</option></select>`)}</div><div id="spCheque" ${plan.paymentMethod==='cheque'?'':'hidden'}><p>شماره و سررسید چک را تکمیل کن؛ مبلغ فقط یک بار در حساب منظور می‌شود.</p><div class="smart-plan-grid">${field('شماره / شناسه چک','<input id="spChequeNumber">')}${field('بانک','<input id="spChequeBank">')}${field('سررسید شمسی','<input id="spChequeDue" data-persian-calendar="1">')}</div></div><p>${plan.dateSource==='default'?'تاریخی گفته نشد؛ امروز انتخاب شده است. ':''}اطلاعات را بررسی کن؛ موارد جدید پس از تأیید ساخته می‌شوند.</p><button class="btn primary full-action" onclick="confirmSmartPlan()">تأیید و ثبت مالی</button></div>`;
 };
 const confirmBase=confirmSmartPlan;
 confirmSmartPlan=function(...args){
  const p=window.v21Plan;if(!p?.quickPayment)return confirmBase(...args);
  p.paymentMethod=v('spMethod');
  if(p.paymentMethod==='cheque'){
   if(v('spKind')!=='expense')return toast('این فرم برای چک تحویلی است؛ نوع ثبت را پرداخت انتخاب کن');
   const number=String(v('spChequeNumber')).replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/\s/g,''),due=PeymanyarStatements.date(v('spChequeDue')),bank=v('spChequeBank');
   if(!v('spProject')||!v('spParty')||!(n('spAmount')>0)||!PeymanyarStatements.date(v('spDate'))||!number||!due)return toast('طرف حساب، پروژه، مبلغ، تاریخ، شماره و سررسید چک را تکمیل کن');
   if(db.transactions.some(t=>t.paymentMethod==='cheque'&&String(t.chequeNumber)===number&&t.chequeBank===bank&&t.chequeStatus!=='cancelled'))return toast('این چک قبلاً ثبت شده است؛ همان چک را ویرایش کن');
   const project=v('spProject'),party=v('spParty'),amount=n('spAmount'),date=v('spDate'),note=p.note;
   let person=knownPerson(party);
   if(!person||!db.projects.some(x=>x.name===project)){
    // Reuse the existing entity registration; do not create a financial row here.
    p.intent='person_create';p.name=party;confirmBase();person=knownPerson(party);
   }
   if(!person)return toast('طرف حساب را بررسی کن');
   closeUniversalQuick();openContractorPayment(person.id,project);
   for(const [id,value] of Object.entries({cpAmount:amount,cpDate:date,cpMethod:'cheque',cpNumber:number,cpBank:bank,cpDue:due,cpNote:note}))document.getElementById(id).value=value;
   const count=db.transactions.length;saveContractorPayment();
   if(db.transactions.length===count+1)finishQuickRegistration('پرداخت با چک ثبت شد؛ در گزارش مالی و حساب پیمانکار منظور شد');
   return;
  }
  return confirmBase(...args);
 };
})();
